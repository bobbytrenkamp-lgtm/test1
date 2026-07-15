"""Hyperscale and AI campus press release adapter.

Monitors official newsrooms for new data center campus announcements.
All results are candidates — requires human review before promotion to
facilities_master.json.

Tier: 4 (press_candidate) — press releases confirm intent but not exact
location; coordinates are estimated from city/county and must be verified.

Covered newsrooms:
  - Microsoft News (news.microsoft.com)
  - Meta Newsroom (about.fb.com/news)
  - Google Blog (blog.google)
  - Amazon News (www.aboutamazon.com)
  - OpenAI News (openai.com/news)
  - xAI News (x.ai/news)

Rate limit: 1 request per 5 seconds (polite crawl). No auth required.
"""
from __future__ import annotations

import re
import time
import logging
from datetime import datetime, timezone
from typing import Iterator

from ..models import FacilityRecord, FacilitySource
from ..normalize import normalize_record_fields
from . import BaseAdapter

logger = logging.getLogger(__name__)

_REQUEST_DELAY = 5.0

# Keywords that indicate a data center announcement
_DC_KEYWORDS = [
    "data center", "datacenter", "AI campus", "hyperscale",
    "gpu cluster", "training cluster", "cloud infrastructure",
    "compute campus", "server farm", "colossus", "stargate",
]

# Keywords in title/URL that indicate relevance
_TITLE_KEYWORDS = [
    "data center", "infrastructure", "ai campus", "cloud", "compute",
    "invest", "build", "construction", "campus",
]

# Known newsroom RSS feeds
_NEWSROOM_FEEDS: list[dict] = [
    {
        "id": "microsoft_news",
        "name": "Microsoft News Center",
        "feed_url": "https://news.microsoft.com/feed/",
        "operator": "Microsoft",
        "confidence": 0.50,
    },
    {
        "id": "meta_newsroom",
        "name": "Meta Newsroom",
        "feed_url": "https://about.fb.com/news/feed/",
        "operator": "Meta Platforms",
        "confidence": 0.50,
    },
    {
        "id": "amazon_news",
        "name": "Amazon News / About Amazon",
        "feed_url": "https://www.aboutamazon.com/news/feed",
        "operator": "Amazon Web Services",
        "confidence": 0.50,
    },
    {
        "id": "google_blog",
        "name": "Google Blog",
        "feed_url": "https://blog.google/rss/",
        "operator": "Google",
        "confidence": 0.50,
    },
]

# US state abbreviation → name mapping for text parsing
_STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut",
    "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana",
    "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana",
    "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts",
    "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota",
    "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania",
    "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota",
    "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
    "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming",
}


def _is_dc_related(title: str, summary: str) -> bool:
    """Return True if the article is likely about a data center announcement."""
    text = (title + " " + summary).lower()
    return any(kw in text for kw in _DC_KEYWORDS)


def _extract_state(text: str) -> str:
    """Attempt to extract a US state name from article text."""
    text_lower = text.lower()
    for abbr, name in _STATE_NAMES.items():
        if name.lower() in text_lower:
            return name
        # Two-letter abbreviation with word boundary (e.g. ", TX" or "in TX")
        if re.search(rf'\b{abbr}\b', text):
            return name
    return ""


class HyperscalePressAdapter(BaseAdapter):
    """Fetch data center-related press releases from hyperscale operator newsrooms."""

    def __init__(self, source: FacilitySource):
        super().__init__(source)
        try:
            import requests
            from xml.etree import ElementTree
            self._requests = requests
            self._ET = ElementTree
        except ImportError as exc:
            raise ImportError("requests is required: pip install requests") from exc

    def fetch(self, since: str | None = None) -> Iterator[FacilityRecord]:
        """Yield candidate FacilityRecord objects from hyperscale newsrooms."""
        since_dt: datetime | None = None
        if since:
            try:
                since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            except ValueError:
                logger.warning("Invalid 'since' timestamp: %s", since)

        for feed_cfg in _NEWSROOM_FEEDS:
            yield from self._fetch_feed(feed_cfg, since_dt)
            time.sleep(_REQUEST_DELAY)

    def _fetch_feed(
        self, feed_cfg: dict, since_dt: datetime | None
    ) -> Iterator[FacilityRecord]:
        url = feed_cfg["feed_url"]
        operator = feed_cfg["operator"]
        confidence = feed_cfg["confidence"]

        try:
            resp = self._requests.get(
                url,
                timeout=20,
                headers={"User-Agent": "USAIInfraMap/1.0 (public research; contact: data@example.org)"},
            )
            resp.raise_for_status()
        except Exception as exc:
            logger.warning("Failed to fetch %s: %s", url, exc)
            return

        try:
            root = self._ET.fromstring(resp.content)
        except Exception as exc:
            logger.warning("Failed to parse feed %s: %s", url, exc)
            return

        ns = {"atom": "http://www.w3.org/2005/Atom"}

        # Support both RSS <item> and Atom <entry>
        items = root.findall(".//item") or root.findall(".//atom:entry", ns)

        for item in items:
            title = (
                _text(item, "title")
                or _text(item, "atom:title", ns)
                or ""
            )
            link = (
                _text(item, "link")
                or _attr(item, "atom:link", "href", ns)
                or ""
            )
            summary = (
                _text(item, "description")
                or _text(item, "atom:summary", ns)
                or _text(item, "atom:content", ns)
                or ""
            )
            pub_date_str = (
                _text(item, "pubDate")
                or _text(item, "atom:published", ns)
                or _text(item, "atom:updated", ns)
                or ""
            )

            # Skip if not data center related
            if not _is_dc_related(title, summary):
                continue

            # Skip if older than `since`
            if since_dt and pub_date_str:
                try:
                    pub_dt = _parse_date(pub_date_str)
                    if pub_dt and pub_dt < since_dt:
                        continue
                except Exception:
                    pass

            # Extract location hints from title + summary
            state_name = _extract_state(title + " " + summary)

            rec = FacilityRecord(
                name=f"{operator} — {title[:80]}",
                operator=operator,
                state=state_name,
                facility_type="hyperscale",
                operational_status="announced",
                primary_source=self.source_id,
                source_urls=[link] if link else [],
                confidence_score=confidence,
                confidence_tier=self.source.tier,
                notes=f"Press release candidate. Title: {title}. Verify location, coordinates, and status before promotion.",
                is_candidate=True,
            )
            yield self._stamp(rec)

    def _stamp(self, record: FacilityRecord) -> FacilityRecord:
        record.primary_source = self.source_id
        record.confidence_score = self.source.confidence
        record.confidence_tier = self.source.tier
        return record


def _text(element, tag: str, ns: dict | None = None) -> str:
    """Return stripped text of first matching child element, or ''."""
    child = element.find(tag, ns) if ns else element.find(tag)
    if child is not None and child.text:
        return child.text.strip()
    return ""


def _attr(element, tag: str, attr: str, ns: dict | None = None) -> str:
    """Return attribute value of first matching child element, or ''."""
    child = element.find(tag, ns) if ns else element.find(tag)
    if child is not None:
        return child.get(attr, "")
    return ""


def _parse_date(date_str: str) -> datetime | None:
    """Parse RSS pubDate or Atom published to datetime (UTC)."""
    # Try ISO 8601 first
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except ValueError:
        pass
    # Try RFC 2822 (RSS)
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(date_str)
    except Exception:
        return None
