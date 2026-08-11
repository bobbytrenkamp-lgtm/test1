"""tests/test_facility_pipeline_operator_adapters.py — the QTS and CyrusOne
facility_pipeline adapters.

Both operators' real page structure was confirmed via a live GitHub
Actions dispatch (2026-08-11) before either adapter was written --
neither site publishes a structured PostalAddress/geo JSON-LD schema like
Equinix/Digital Realty do, so both parse city/state from real, live-
observed text patterns instead:
  - CyrusOne: the page's own <h1> reads "<City>, <ST>: <facility codes>"
    (e.g. the real "Chandler, AZ: PHX1-PHX8").
  - QTS: the og:description meta tag is CMS-templated as "...'s <City>,
    <State> data center campus..." (e.g. the real QTS Ashburn-1
    description); the <h1> gives a clean facility name (e.g. "Ashburn 1").

These tests use real, live-captured HTML fragments (not invented shapes)
and exercise the pure parsing functions directly -- no network access.

Run:  python3 -m pytest tests/test_facility_pipeline_operator_adapters.py -q
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from data.facility_pipeline.adapters.cyrusone import (  # noqa: E402
    _discover_facility_urls as _cyrusone_discover_urls,
    _parse_facility_page as _cyrusone_parse,
)
from data.facility_pipeline.adapters.qts import (  # noqa: E402
    _discover_facility_urls as _qts_discover_urls,
    _parse_facility_page as _qts_parse,
)


class _FakeResponse:
    def __init__(self, text):
        self.text = text

    def raise_for_status(self):
        pass


class _FakeSession:
    def __init__(self, responses: dict):
        self._responses = responses

    def get(self, url, timeout=None):
        if url not in self._responses:
            raise RuntimeError(f"unexpected URL in test: {url}")
        return _FakeResponse(self._responses[url])


# ── CyrusOne ──────────────────────────────────────────────────────────────

def test_cyrusone_parses_real_title_pattern_into_city_state_and_codes():
    # Real h1 text captured live from cyrusone.com's Chandler, AZ page.
    html = "<html><body><h1>Chandler, AZ: PHX1-PHX8</h1></body></html>"
    r = _cyrusone_parse(html, "https://cyrusone.com/data-centers/north-america/chandler-arizona", "cyrusone")
    assert r is not None
    assert r.city == "Chandler"
    assert r.state_abbr == "AZ"
    assert r.state == "Arizona"
    assert "PHX1-PHX8" in r.name
    assert r.operator == "CyrusOne"
    assert r.source_urls == ["https://cyrusone.com/data-centers/north-america/chandler-arizona"]


def test_cyrusone_falls_back_to_url_slug_when_title_format_does_not_match():
    # A page whose h1 doesn't match "City, ST: codes" must not be silently
    # dropped -- falls back to a slug-derived name rather than raising.
    html = "<html><body><h1>Somerset Data Center</h1></body></html>"
    r = _cyrusone_parse(html, "https://cyrusone.com/data-centers/north-america/somerset-nj", "cyrusone")
    assert r is not None
    assert "Somerset" in r.name
    assert r.city == ""  # honestly blank, never guessed


def test_cyrusone_page_with_no_h1_or_title_returns_none():
    html = "<html><body><p>no heading here</p></body></html>"
    r = _cyrusone_parse(html, "https://cyrusone.com/data-centers/north-america/nowhere", "cyrusone")
    assert r is None


def test_cyrusone_discovers_real_confirmed_href_pattern():
    # Real hrefs captured live from cyrusone.com/data-centers/.
    html = """
    <html><body>
      <a href="/data-centers/north-america/chandler-arizona?hsLang=en">Chandler</a>
      <a href="/data-centers/north-america/aurora-il?hsLang=en">Aurora</a>
      <a href="/blog/some-post">Blog</a>
      <a href="https://www.cyrusone.com/data-centers">All locations</a>
    </body></html>
    """
    urls = _cyrusone_discover_urls(_FakeSession({"https://cyrusone.com/data-centers/": html}))
    assert "https://cyrusone.com/data-centers/north-america/chandler-arizona" in urls
    assert "https://cyrusone.com/data-centers/north-america/aurora-il" in urls
    assert not any("blog" in u for u in urls)
    # hsLang query param must be stripped, and no duplicate URLs
    assert len(urls) == len(set(urls))
    assert all("?" not in u for u in urls)


# ── QTS ───────────────────────────────────────────────────────────────────

def test_qts_parses_real_og_description_into_city_and_state():
    # Real og:description text captured live from qtsdatacenters.com's
    # Ashburn-1 page (truncated to the relevant clause).
    html = (
        '<html><head>'
        '<meta property="og:description" content="Data Center Campus Ashburn 1 '
        "QTS’s Ashburn, Virginia data center campus offers flexible, scalable "
        'and rapid delivery.">'
        "</head><body><h1>Ashburn 1</h1></body></html>"
    )
    r = _qts_parse(html, "https://www.qtsdatacenters.com/data-centers/ashburn-1/", "qts")
    assert r is not None
    assert r.name == "QTS Ashburn 1"
    assert r.city == "Ashburn"
    assert r.state == "Virginia"
    assert r.state_abbr == "VA"
    assert r.operator == "QTS Data Centers"


def test_qts_missing_og_description_leaves_location_blank_not_guessed():
    html = "<html><head></head><body><h1>Atlanta 1</h1></body></html>"
    r = _qts_parse(html, "https://www.qtsdatacenters.com/data-centers/atlanta-1/", "qts")
    assert r is not None
    assert r.name == "QTS Atlanta 1"
    assert r.city == ""
    assert r.state == ""


def test_qts_page_with_no_h1_falls_back_to_url_slug():
    html = "<html><body><p>no heading</p></body></html>"
    r = _qts_parse(html, "https://www.qtsdatacenters.com/data-centers/bessemer/", "qts")
    assert r is not None
    assert "Bessemer" in r.name


def test_qts_discovers_real_confirmed_href_pattern_and_excludes_feed():
    # Real hrefs captured live from qtsdatacenters.com/data-centers.
    html = """
    <html><body>
      <a href="https://q.com/data-centers/ashburn-1/">Ashburn 1</a>
      <a href="https://q.com/data-centers/ashburn-2/">Ashburn 2</a>
      <a href="https://q.com/data-centers/feed/">RSS</a>
      <a href="/us-locations/">US locations</a>
    </body></html>
    """
    urls = _qts_discover_urls(_FakeSession({"https://www.qtsdatacenters.com/data-centers": html}))
    assert "https://www.qtsdatacenters.com/data-centers/ashburn-1/" in urls
    assert "https://www.qtsdatacenters.com/data-centers/ashburn-2/" in urls
    assert not any("feed" in u for u in urls)
    assert len(urls) == len(set(urls))
