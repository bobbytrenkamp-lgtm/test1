"""HTTP fetching with robots.txt compliance and retry logic."""
from __future__ import annotations
import time
import urllib.request
import urllib.error
import urllib.robotparser
from typing import Optional
from urllib.parse import urlparse

USER_AGENT = (
    "Mozilla/5.0 (compatible; DataCenterRestrictionsMap/1.0; "
    "+https://github.com/bobbytrenkamp-lgtm/test1)"
)
TIMEOUT = 15
MAX_RETRIES = 3
RETRY_BACKOFF = [2, 4, 8]   # seconds between retries


class FetchError(Exception):
    def __init__(self, url: str, status: Optional[int], message: str):
        super().__init__(message)
        self.url = url
        self.status = status


def _robots_allowed(url: str) -> bool:
    """Return True if robots.txt permits our user agent to fetch url.

    Treats missing or unreadable robots.txt as permissive (True).
    """
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    rp = urllib.robotparser.RobotFileParser()
    rp.set_url(robots_url)
    try:
        rp.read()
        return rp.can_fetch(USER_AGENT, url)
    except Exception:
        return True  # If we can't read robots.txt, assume allowed


def _add_standard_headers(req: urllib.request.Request) -> None:
    """Headers a real browser always sends and many government WAFs use as a
    bot-vs-browser signal. check_source_links.py already sends an Accept
    header for the same reason (see its 52% unreachable rate vs this
    pipeline's 54% before this fix) — this brings fetch.py in line with it
    rather than leaving two different request shapes in the same codebase."""
    req.add_header("User-Agent", USER_AGENT)
    req.add_header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
    req.add_header("Accept-Language", "en-US,en;q=0.9")


def fetch_url(url: str, *, check_robots: bool = True, timeout: int = TIMEOUT) -> tuple[int, str]:
    """Fetch url and return (http_status, body_text).

    Raises FetchError on non-2xx or network failure after retries.
    Raises FetchError with status=None if robots.txt disallows.
    """
    if check_robots and not _robots_allowed(url):
        raise FetchError(url, None, f"robots.txt disallows fetching {url}")

    last_err: Exception | None = None
    for attempt, delay in enumerate([0] + RETRY_BACKOFF, 0):
        if delay:
            time.sleep(delay)
        try:
            req = urllib.request.Request(url)
            _add_standard_headers(req)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8", errors="replace")
                return resp.status, body
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < MAX_RETRIES - 1:
                last_err = e
                continue
            raise FetchError(url, e.code, str(e)) from e
        except urllib.error.URLError as e:
            last_err = e
            if attempt < MAX_RETRIES - 1:
                continue
            raise FetchError(url, None, str(e)) from e
        except Exception as e:
            last_err = e
            if attempt < MAX_RETRIES - 1:
                continue
            raise FetchError(url, None, str(e)) from e

    raise FetchError(url, None, f"Max retries exceeded: {last_err}")


_BODY_SNIPPET_CAP = 4000  # bytes; enough to catch a WAF/challenge-page marker


def _read_body_snippet(err_or_resp) -> Optional[str]:
    """Best-effort read of a small response/error body for down_reason
    classification (a 403 with a Cloudflare/Akamai challenge-page marker in
    the body is ACCESS_BLOCKED; a bare 403 with no readable body is not
    enough evidence to say that -- see lib/endpoint_diagnostics.py's
    is_access_blocked, which only flags a body match, never a bare status).
    Never raises -- a body read failing is not itself an error worth
    reporting, it just means classification falls back to "not enough
    evidence." """
    try:
        return err_or_resp.read(_BODY_SNIPPET_CAP).decode("utf-8", "replace")
    except Exception:  # noqa: BLE001
        return None


def check_url_reachable(url: str, timeout: int = TIMEOUT) -> tuple[bool, Optional[int], Optional[str], int, Optional[str]]:
    """Check if a URL is reachable. Returns
    (reachable, status, error, response_ms, body_snippet). body_snippet is
    only populated on a non-2xx response with a body worth reading -- most
    callers ignore it, but it's what lets down_reason classification tell
    "genuinely gone" apart from "blocked by a WAF/bot-wall" after the fact."""
    start = time.monotonic()
    req = urllib.request.Request(url, method="HEAD")
    _add_standard_headers(req)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            ms = int((time.monotonic() - start) * 1000)
            return True, resp.status, None, ms, None
    except urllib.error.HTTPError as e:
        body_snippet = _read_body_snippet(e)
        if e.code in (405, 403):
            # Retry with GET
            req2 = urllib.request.Request(url, method="GET")
            _add_standard_headers(req2)
            try:
                with urllib.request.urlopen(req2, timeout=timeout) as resp2:
                    ms = int((time.monotonic() - start) * 1000)
                    return True, resp2.status, None, ms, None
            except urllib.error.HTTPError as e2:
                ms = int((time.monotonic() - start) * 1000)
                return False, e2.code, str(e2), ms, _read_body_snippet(e2)
            except Exception as e2:
                ms = int((time.monotonic() - start) * 1000)
                return False, None, str(e2), ms, body_snippet
        ms = int((time.monotonic() - start) * 1000)
        ok = 200 <= e.code < 400
        return ok, e.code, (None if ok else str(e)), ms, (None if ok else body_snippet)
    except Exception as e:
        ms = int((time.monotonic() - start) * 1000)
        return False, None, str(e), ms, None
