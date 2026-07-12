"""RSS/Atom feed adapter — parse a government agency or legislature feed."""
from __future__ import annotations
import re
import xml.etree.ElementTree as ET
from ..fetch import fetch_url, FetchError
from ..normalize import normalize_rss_entries
from ..models import PolicyCandidate, PolicySource

# Atom namespace
ATOM_NS = "http://www.w3.org/2005/Atom"


def _parse_rss2(root: ET.Element) -> list[dict]:
    entries = []
    channel = root.find("channel")
    if channel is None:
        return entries
    for item in channel.findall("item"):
        entries.append({
            "title":       (item.findtext("title") or "").strip(),
            "link":        (item.findtext("link") or "").strip(),
            "description": (item.findtext("description") or "").strip(),
            "pubDate":     (item.findtext("pubDate") or "").strip(),
        })
    return entries


def _parse_atom(root: ET.Element) -> list[dict]:
    entries = []
    for entry in root.findall(f"{{{ATOM_NS}}}entry"):
        link_el = entry.find(f"{{{ATOM_NS}}}link")
        link = link_el.get("href", "") if link_el is not None else ""
        summary_el = entry.find(f"{{{ATOM_NS}}}summary")
        content_el = entry.find(f"{{{ATOM_NS}}}content")
        summary = ""
        if content_el is not None:
            summary = "".join(content_el.itertext())
        elif summary_el is not None:
            summary = "".join(summary_el.itertext())
        entries.append({
            "title":   "".join((entry.find(f"{{{ATOM_NS}}}title") or ET.Element("x")).itertext()).strip(),
            "link":    link,
            "summary": summary.strip(),
        })
    return entries


def _parse_feed(xml_text: str) -> list[dict]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []
    tag = root.tag.lower()
    if "rss" in tag or root.tag == "rss":
        return _parse_rss2(root)
    if "feed" in tag or ATOM_NS in root.tag:
        return _parse_atom(root)
    return []


def run(source: PolicySource) -> tuple[list[PolicyCandidate], str | None]:
    """Fetch RSS/Atom feed from source.url and return (candidates, error)."""
    if not source.url:
        return [], "No URL configured for this source"

    try:
        _status, xml_text = fetch_url(source.url)
    except FetchError as e:
        return [], str(e)

    entries = _parse_feed(xml_text)
    if not entries:
        return [], None  # Feed OK but no entries (or unrecognized format)

    candidates = normalize_rss_entries(
        entries=entries,
        source_id=source.id,
        jurisdiction_name=source.jurisdiction_name,
        state=source.state,
        state_abbr=source.state_abbr,
        fips=source.fips,
        source_policy_types=source.policy_types,
    )
    return candidates, None
