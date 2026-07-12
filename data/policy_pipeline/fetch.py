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
            req.add_header("User-Agent", USER_AGENT)
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


def check_url_reachable(url: str, timeout: int = TIMEOUT) -> tuple[bool, Optional[int], Optional[str], int]:
    """Check if a URL is reachable. Returns (reachable, status, error, response_ms)."""
    start = time.monotonic()
    req = urllib.request.Request(url, method="HEAD")
    req.add_header("User-Agent", USER_AGENT)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            ms = int((time.monotonic() - start) * 1000)
            return True, resp.status, None, ms
    except urllib.error.HTTPError as e:
        if e.code in (405, 403):
            # Retry with GET
            req2 = urllib.request.Request(url, method="GET")
            req2.add_header("User-Agent", USER_AGENT)
            try:
                with urllib.request.urlopen(req2, timeout=timeout) as resp2:
                    ms = int((time.monotonic() - start) * 1000)
                    return True, resp2.status, None, ms
            except Exception as e2:
                ms = int((time.monotonic() - start) * 1000)
                return False, None, str(e2), ms
        ms = int((time.monotonic() - start) * 1000)
        ok = 200 <= e.code < 400
        return ok, e.code, (None if ok else str(e)), ms
    except Exception as e:
        ms = int((time.monotonic() - start) * 1000)
        return False, None, str(e), ms
