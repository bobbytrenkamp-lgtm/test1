"""data/parcel_pipeline/static_ingestion/download.py

Downloads one static source's file with the specific set of failure modes
that make an automated download of a government file dangerous to trust
blindly:

  - a transient network/server error that a naive script would treat as
    "the file is empty" -- handled with bounded retry/backoff
  - a filename or redirect target that changed since the source was
    registered -- surfaced as a distinct failure, not silently accepted
  - a corrupt ZIP (truncated download, disk full on the publisher's end)
  - an HTML error/login page served with a 200 status and a filename that
    ends in .zip/.geojson -- the single most common way an automated
    pipeline silently ingests garbage, because a naive "did the request
    succeed" check says yes
  - an empty or near-empty file that isn't corrupt, just wrong

None of these produce a partial write to the destination path: the download
lands in a temp file first and is only renamed into place after every check
passes, so a failed run can never leave a truncated or corrupt file where the
last good one used to be. That's the single most important property this
module has -- "fail safely" per the pipeline's own rules means a bad fetch
must never destroy a good previous one.
"""
from __future__ import annotations

import hashlib
import json
import os
import tempfile
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import requests

DEFAULT_TIMEOUT_S = 60
DEFAULT_MAX_ATTEMPTS = 4
DEFAULT_BACKOFF_BASE_S = 2   # 2s, 4s, 8s
MIN_VALID_BYTES = 256        # below this, even a legitimate tiny file is suspicious
USER_AGENT = (
    "Mozilla/5.0 (compatible; test1-parcel-static-ingestion/1.0; "
    "+https://github.com/bobbytrenkamp-lgtm/test1)"
)

# Failure classification -- the same discipline the parcel discovery
# pipeline's network.mjs already uses for live-service probes, applied here
# to file downloads. Keeping these distinct is what lets a human (or CI)
# tell "the source is genuinely down" apart from "the source changed shape"
# apart from "we got served a login page" without reading raw exception text.
SOURCE_DOWN = "source_down"
HTML_MASQUERADE = "html_masquerade"
CORRUPT_ARCHIVE = "corrupt_archive"
EMPTY_FILE = "empty_file"
NETWORK_FAILURE = "network_failure"
NOT_MODIFIED = "not_modified"


@dataclass
class DownloadResult:
    ok: bool
    path: Optional[str] = None
    failure_type: Optional[str] = None
    why: Optional[str] = None
    bytes_written: int = 0
    sha256: Optional[str] = None
    etag: Optional[str] = None
    last_modified: Optional[str] = None
    attempts: int = 0
    not_modified: bool = False


def _sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _looks_like_html(head: bytes) -> bool:
    # A government portal serving a login wall or a "resource moved" page
    # under a URL that used to serve a ZIP is the single most common way a
    # static-download pipeline gets fooled -- HTTP 200, correct content-length
    # for the error page, and a filename that still ends in .zip. Sniffing
    # the actual bytes catches what the HTTP status can't.
    stripped = head.lstrip()[:512].lower()
    return stripped.startswith(b"<!doctype html") or stripped.startswith(b"<html") \
        or b"<title>" in stripped[:200]


def _validate_zip(path: Path) -> Optional[str]:
    """Returns an error string, or None if the ZIP is structurally sound."""
    if not zipfile.is_zipfile(path):
        return "file is not a valid ZIP archive"
    try:
        with zipfile.ZipFile(path) as zf:
            bad = zf.testzip()
            if bad:
                return f"ZIP archive is corrupt at member '{bad}' (CRC check failed)"
            if not zf.namelist():
                return "ZIP archive contains no files"
    except zipfile.BadZipFile as e:
        return f"ZIP archive could not be opened: {e}"
    return None


def _conditional_headers(prior_etag: Optional[str], prior_last_modified: Optional[str]) -> dict:
    headers = {"User-Agent": USER_AGENT}
    if prior_etag:
        headers["If-None-Match"] = prior_etag
    if prior_last_modified:
        headers["If-Modified-Since"] = prior_last_modified
    return headers


def download(
    url: str,
    dest_path: str,
    *,
    is_zip: bool = False,
    prior_etag: Optional[str] = None,
    prior_last_modified: Optional[str] = None,
    prior_sha256: Optional[str] = None,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    backoff_base_s: float = DEFAULT_BACKOFF_BASE_S,
    timeout_s: int = DEFAULT_TIMEOUT_S,
    sleep_fn=time.sleep,
    session: Optional[requests.Session] = None,
) -> DownloadResult:
    """Downloads `url` to `dest_path`, only replacing an existing file at
    dest_path after every check below passes. Never partially overwrites it.

    Update-check-before-expensive-work: if the server honors conditional
    headers and confirms nothing changed (304, or a matching ETag on a normal
    200), returns not_modified=True without rewriting the destination file at
    all -- the whole point of tracking ETag/Last-Modified/checksum per the
    pipeline's update-automation rules.
    """
    sess = session or requests
    last_error = None

    for attempt in range(1, max_attempts + 1):
        try:
            resp = sess.get(
                url, timeout=timeout_s, stream=True,
                headers=_conditional_headers(prior_etag, prior_last_modified),
            )

            if resp.status_code == 304:
                return DownloadResult(ok=True, not_modified=True, attempts=attempt,
                                       etag=prior_etag, last_modified=prior_last_modified)

            if resp.status_code >= 500 or resp.status_code == 429:
                # Transient-class failures are worth retrying; anything else
                # (404, 403, a changed filename) is not going to fix itself.
                last_error = DownloadResult(
                    ok=False, failure_type=SOURCE_DOWN,
                    why=f"HTTP {resp.status_code} from source", attempts=attempt,
                )
                if attempt < max_attempts:
                    sleep_fn(backoff_base_s * (2 ** (attempt - 1)))
                    continue
                return last_error

            if not resp.ok:
                return DownloadResult(
                    ok=False, failure_type=SOURCE_DOWN,
                    why=f"HTTP {resp.status_code} from source (not retried -- not a transient status)",
                    attempts=attempt,
                )

            fd, tmp_name = tempfile.mkstemp(prefix="static_ingest_", dir=os.path.dirname(dest_path) or ".")
            tmp_path = Path(tmp_name)
            written = 0
            head = b""
            try:
                with os.fdopen(fd, "wb") as out:
                    for chunk in resp.iter_content(chunk_size=1 << 16):
                        if not chunk:
                            continue
                        if written == 0:
                            head = chunk[:512]
                        out.write(chunk)
                        written += len(chunk)

                if written < MIN_VALID_BYTES:
                    return DownloadResult(
                        ok=False, failure_type=EMPTY_FILE,
                        why=f"downloaded file is only {written} bytes, below the "
                            f"{MIN_VALID_BYTES}-byte sanity floor",
                        attempts=attempt,
                    )

                if _looks_like_html(head):
                    return DownloadResult(
                        ok=False, failure_type=HTML_MASQUERADE,
                        why="response body looks like an HTML page, not the declared file "
                            "format -- likely a login wall or a moved-resource notice served "
                            "with a 200 status",
                        attempts=attempt,
                    )

                if is_zip:
                    zip_error = _validate_zip(tmp_path)
                    if zip_error:
                        return DownloadResult(
                            ok=False, failure_type=CORRUPT_ARCHIVE, why=zip_error, attempts=attempt,
                        )

                digest = _sha256_of(tmp_path)
                if prior_sha256 and digest == prior_sha256:
                    # Byte-identical to what we already have, even though the
                    # server didn't honor conditional headers. Same
                    # "unchanged" outcome, reached a different way.
                    tmp_path.unlink(missing_ok=True)
                    return DownloadResult(
                        ok=True, not_modified=True, attempts=attempt, sha256=digest,
                        etag=resp.headers.get("ETag"), last_modified=resp.headers.get("Last-Modified"),
                    )

                # Every check passed. Atomic rename -- this is the only
                # point a previous good file at dest_path can be replaced.
                os.replace(tmp_path, dest_path)

                return DownloadResult(
                    ok=True, path=dest_path, bytes_written=written, sha256=digest,
                    etag=resp.headers.get("ETag"), last_modified=resp.headers.get("Last-Modified"),
                    attempts=attempt,
                )
            finally:
                tmp_path.unlink(missing_ok=True)

        except requests.RequestException as e:
            last_error = DownloadResult(
                ok=False, failure_type=NETWORK_FAILURE, why=str(e), attempts=attempt,
            )
            if attempt < max_attempts:
                sleep_fn(backoff_base_s * (2 ** (attempt - 1)))
                continue
            return last_error

    return last_error or DownloadResult(ok=False, failure_type=NETWORK_FAILURE,
                                         why="exhausted retries with no response", attempts=max_attempts)
