"""Granicus/Peak Agenda adapter — monitor government meeting agendas.

Granicus hosts meeting minutes and agendas for many counties and cities.
Public agenda feeds are typically available at /feeds/govdelivery or
via their RSS endpoint.
"""
from __future__ import annotations
from ..fetch import fetch_url, FetchError
from ..models import PolicyCandidate, PolicySource
from . import rss_atom


def _build_feed_url(source_url: str) -> str:
    """Try to derive a Granicus RSS feed URL from the configured source URL."""
    if "granicus.com" in source_url:
        return source_url  # Already a Granicus URL
    # Many Granicus deployments expose /rss/ or /ViewPublisher.php?view_id=... feeds
    # Fall back to the source URL as-is — the rss_atom adapter handles both RSS and HTML
    return source_url


def run(source: PolicySource) -> tuple[list[PolicyCandidate], str | None]:
    """Try RSS feed first; fall back to generic HTML if no valid feed."""
    if not source.url:
        return [], "No URL configured for this source"

    feed_url = _build_feed_url(source.url)
    candidates, error = rss_atom.run(source)

    if error or not candidates:
        # RSS failed or empty — try direct HTML scan
        from . import generic_html
        return generic_html.run(source)

    return candidates, error
