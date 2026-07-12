#!/usr/bin/env python3
"""
update_ai_news.py — Automated AI and Data Center News Aggregator

Fetches RSS/Atom feeds and Google News RSS queries, filters for relevance,
deduplicates, classifies, and merges into data/ai_news.json.

Usage:
    python data/update_ai_news.py [--validate-only] [--dry-run]

Exit codes:
    0  — Success (output written or no changes)
    1  — Fatal error (broken script, no data preserved, validation failure)
"""

import sys
import os
import json
import re
import time
import hashlib
import logging
import argparse
import unicodedata
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse, urljoin
from html import unescape

import requests
from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning
from dateutil import parser as dateutil_parser

import warnings
warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT    = os.path.dirname(SCRIPT_DIR)
SOURCES_FILE = os.path.join(SCRIPT_DIR, "news_sources.json")
OUTPUT_FILE  = os.path.join(SCRIPT_DIR, "ai_news.json")

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s  %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger(__name__)

# ── Controlled category list ───────────────────────────────────────────────
VALID_CATEGORIES = [
    "AI Industry",
    "AI Research",
    "AI Products",
    "AI Safety",
    "Federal Policy",
    "State/Local Policy",
    "International Policy",
    "Data Centers",
    "Energy & Environment",
    "Chips & Infrastructure",
    "Business & Investment",
    "Legal & Copyright",
    "Jobs & Society",
    "Other AI News",
]

# ── US state lookup tables ─────────────────────────────────────────────────
STATE_ABBR = {
    "AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California",
    "CO":"Colorado","CT":"Connecticut","DE":"Delaware","FL":"Florida","GA":"Georgia",
    "HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa",
    "KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland",
    "MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi",
    "MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire",
    "NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina",
    "ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania",
    "RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee",
    "TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington",
    "WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming","DC":"District of Columbia",
}
# Reverse: full name → abbr (lowercase keys for case-insensitive lookup)
STATE_NAME_TO_ABBR = {name.lower(): abbr for abbr, name in STATE_ABBR.items()}

# Abbreviations that are ambiguous in other contexts — never infer just from "IN" etc.
AMBIGUOUS_ABBRS = {"IN", "OR", "ME", "OK", "OH"}

# ── Relevance keywords ─────────────────────────────────────────────────────
# (pattern, score). Title matches count double.
RELEVANCE_KEYWORDS = [
    # High-signal (score 4)
    (r'\bartificial intelligence\b', 4),
    (r'\bgenerative [aA][iI]\b', 4),
    (r'\blarge language model\b', 4),
    (r'\b[aA][iI] regulation\b', 4),
    (r'\b[aA][iI] legislation\b', 4),
    (r'\b[aA][iI] moratorium\b', 4),
    (r'\bdata center ban\b', 4),
    (r'\bdata center moratorium\b', 4),
    (r'\bdata center zoning\b', 4),
    (r'\bnew data center\b', 4),
    (r'\bdata center announced\b', 4),
    (r'\bdata center planned\b', 4),
    (r'\bdata center campus\b', 4),
    (r'\bAI campus\b', 4),
    (r'\bStargate\b', 4),
    # High (score 3)
    (r'\b[aA][iI] safety\b', 3),
    (r'\b[aA][iI] policy\b', 3),
    (r'\b[aA][iI] governance\b', 3),
    (r'\b[aA][iI] infrastructure\b', 3),
    (r'\bhyperscale\b', 3),
    (r'\bOpenAI\b', 3),
    (r'\bAnthropic\b', 3),
    (r'\bDeepMind\b', 3),
    (r'\bNVIDIA\b', 3),
    (r'\bChatGPT\b', 3),
    (r'\bGPT-\d', 3),
    (r'\bgemini\b', 3, re.IGNORECASE),
    (r'\b[aA][iI] act\b', 3),
    (r'\b[aA][iI] bill\b', 3),
    (r'\balgoritm(?:ic)?\b', 3),
    (r'\b[aA][iI] copyright\b', 3),
    (r'\bdata center construction\b', 3),
    (r'\bdata center investment\b', 3),
    (r'\bCoreWeave\b', 3),
    (r'\bxAI\b', 3),
    (r'\bEquinix\b', 3),
    (r'\bDigital Realty\b', 3),
    (r'\bcolocation\b', 3),
    (r'\bsiting decision\b', 3),
    # Medium (score 2)
    (r'\b[aA][iI]\b', 2),         # standalone AI — must be lowercase or uppercase
    (r'\bmachine learning\b', 2),
    (r'\b[lL][lL][mM]\b', 2),
    (r'\bdata center\b', 2),
    (r'\bdata centre\b', 2),
    (r'\bsemiconductor\b', 2),
    (r'\bGPU\b', 2),
    (r'\bfoundation model\b', 2),
    (r'\bneural network\b', 2),
    (r'\bcloud computing\b', 2),
    (r'\bAWS\b', 2),
    (r'\bMicrosoft Azure\b', 2),
    (r'\bGoogle Cloud\b', 2),
    (r'\bmegawatt\b', 2),
    (r'\b\d+\s*MW\b', 2),
    (r'\bserver farm\b', 2),
    (r'\bQTS\b', 2),
    (r'\bSwitch\b', 2),
    (r'\bIron Mountain\b', 2),
    (r'\bEdgeCore\b', 2),
    (r'\bVantage\b', 2),
    # Low (score 1)
    (r'\bchip\b', 1),
    (r'\benergy demand\b', 1),
    (r'\belectricity grid\b', 1),
    (r'\bpower grid\b', 1),
    (r'\bwater usage\b', 1),
    (r'\bwater use\b', 1),
    (r'\btax incentive\b', 1),
    (r'\btax exemption\b', 1),
]

# Precompile patterns (each entry: compiled pattern, score)
# All patterns use IGNORECASE so they work against pre-lowercased haystacks.
_COMPILED_KW = []
for entry in RELEVANCE_KEYWORDS:
    pat, score = entry[0], entry[1]
    flags = (entry[2] if len(entry) > 2 else 0) | re.IGNORECASE
    _COMPILED_KW.append((re.compile(pat, flags), score))

# ── Category classification rules ─────────────────────────────────────────
# Ordered: first matching rule wins
CATEGORY_RULES = [
    ("Federal Policy", [
        r'\bfederal\b', r'\bcongress\b', r'\bsenate\b', r'\bhouse of representatives\b',
        r'\bwhite house\b', r'\bexecutive order\b', r'\bftc\b', r'\bfcc\b',
        r'\bnist\b', r'\bdepartment of commerce\b', r'\bdepartment of energy\b',
        r'\bfederal trade commission\b', r'\bfederal register\b',
        r'\bnational [aA][iI]\b', r'\bpresident\b', r'\badministration\b',
        r'\bsection \d+\b',
    ]),
    ("State/Local Policy", [
        r'\bstate law\b', r'\bstate legislation\b', r'\bstate bill\b',
        r'\bcounty\b', r'\bmunicipality\b', r'\bzoning\b', r'\bmoratorium\b',
        r'\bordinance\b', r'\bgovernor\b', r'\bstate senate\b',
        r'\bstate assembly\b', r'\bcity council\b', r'\blocal government\b',
        r'\bpublic utility district\b', r'\bPUD\b',
    ]),
    ("International Policy", [
        r'\bEuropean Union\b', r'\bEU [aA][iI]\b', r'\bUK [aA][iI]\b',
        r'\binternational\b', r'\bglobal regulation\b', r'\bChina\b',
        r'\bUnited Nations\b', r'\bOECD\b', r'\bG7\b', r'\bG20\b',
    ]),
    ("AI Safety", [
        r'\b[aA][iI] safety\b', r'\b[aA][iI] risk\b', r'\balignment\b',
        r'\bsuperintelligence\b', r'\b[aA][iI] ethics\b', r'\bbias\b',
        r'\bfairness\b', r'\b[aA][iI] harm\b', r'\bsafeguard\b',
        r'\b[aA][iI] misuse\b', r'\b[aA][iI] threat\b',
    ]),
    ("AI Research", [
        r'\bresearch paper\b', r'\bresearchers\b', r'\b(?:published|release) a (?:study|paper|model)\b',
        r'\bbreakthrough\b', r'\bmodel architecture\b',
        r'\blarge language model\b', r'\b[lL][lL][mM]\b', r'\bneural network\b',
        r'\bdeep learning\b', r'\bmachine learning\b', r'\bbenchmark\b',
    ]),
    ("AI Products", [
        r'\bChatGPT\b', r'\bGPT-\d\b', r'\bClaude\b', r'\bGemini\b',
        r'\bCopilot\b', r'\blaunch(?:es|ed)?\b', r'\brelease[sd]?\b',
        r'\bannounce[sd]?\b', r'\bproduct\b', r'\bapp\b',
    ]),
    ("Data Centers", [
        r'\bdata center\b', r'\bdata centre\b', r'\bhyperscale\b',
        r'\bcolocation\b', r'\bserver farm\b', r'\bcloud campus\b',
    ]),
    ("Energy & Environment", [
        r'\bpower grid\b', r'\benergy demand\b', r'\belectricity\b',
        r'\bcarbon\b', r'\brenderable\b', r'\bnuclear\b', r'\bsolar\b',
        r'\bwater usage\b', r'\bwater use\b', r'\bwater consumption\b',
        r'\benvironmental\b', r'\bsustainab\b', r'\bERCOT\b',
    ]),
    ("Chips & Infrastructure", [
        r'\bsemiconductor\b', r'\bchip\b', r'\bGPU\b', r'\bTPU\b',
        r'\bNVIDIA\b', r'\bIntel\b', r'\bAMD\b', r'\bexport control\b',
        r'\bfoundry\b', r'\bfabrication\b', r'\bARMI\b',
    ]),
    ("Business & Investment", [
        r'\binvest\b', r'\bfunding\b', r'\bvaluation\b', r'\bIPO\b',
        r'\bstartup\b', r'\bventure\b', r'\bacquisition\b', r'\bmerger\b',
        r'\bpartnership\b', r'\bcontract\b', r'\bmarket\b', r'\brevenue\b',
    ]),
    ("Legal & Copyright", [
        r'\bcopyright\b', r'\bintellectual property\b', r'\blawsuit\b',
        r'\blitigation\b', r'\bcourt\b', r'\bjudge\b', r'\bverdict\b',
        r'\blegal\b', r'\bprivacy\b', r'\bGDPR\b', r'\bCCPA\b',
    ]),
    ("Jobs & Society", [
        r'\bjob[s\b]', r'\bemployment\b', r'\bworkforce\b', r'\blabor\b',
        r'\bworker\b', r'\bauditing\b', r'\bautomation\b', r'\bdisplacement\b',
        r'\beducation\b', r'\btraining\b',
    ]),
]

# Precompile category patterns
_COMPILED_CATS = []
for (cat, patterns) in CATEGORY_RULES:
    compiled = [re.compile(p, re.IGNORECASE) for p in patterns]
    _COMPILED_CATS.append((cat, compiled))

# ── Why-it-matters templates ───────────────────────────────────────────────
WHY_IT_MATTERS = {
    "Federal Policy":       "Federal AI and data center policies set the baseline rules that all states and companies must follow, directly shaping where and how AI infrastructure can be built and operated.",
    "State/Local Policy":   "State and local regulations determine where data centers can be built, their size limits, environmental requirements, and tax treatment — factors that drive billions of dollars in siting decisions.",
    "International Policy": "International AI governance frameworks influence U.S. companies operating globally and set standards that domestic regulators often consider when drafting their own rules.",
    "AI Safety":            "AI safety developments affect how models are deployed, regulated, and trusted by governments and the public, with implications for every organization building or using AI systems.",
    "AI Research":          "Research advances define the capabilities of future AI systems and often precede the products and infrastructure investments that follow.",
    "AI Products":          "New AI products drive demand for data center capacity, GPU supply, and energy infrastructure, and can prompt new regulatory attention.",
    "Data Centers":         "Data center siting, construction, and operation decisions determine where AI infrastructure is physically located, affecting energy grids, water supplies, local economies, and regulatory environments.",
    "Energy & Environment": "AI and data center energy demand is reshaping electricity grids and environmental commitments, making energy policy central to infrastructure planning.",
    "Chips & Infrastructure":"Semiconductor supply and export controls directly affect how quickly AI infrastructure can be built and who can access advanced computing capacity.",
    "Business & Investment":"Investment flows into AI and data center companies signal where infrastructure will be built and which jurisdictions will compete for economic development.",
    "Legal & Copyright":    "Legal decisions about AI copyright, privacy, and liability set the rules under which AI systems can be trained and deployed commercially.",
    "Jobs & Society":       "AI's effects on employment and society are central to the political debate that drives regulation and public acceptance of AI infrastructure.",
    "Other AI News":        "This story covers developments in the AI and data center space that are relevant to infrastructure planning and policy.",
}

# ── URL utilities ──────────────────────────────────────────────────────────
_TRACKING_PARAMS = {
    "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
    "gclid","fbclid","output","rss","ref","src","_r","ncid","cid",
    "mc_cid","mc_eid","WT.mc_id","si",
}

def canonicalize_url(url: str) -> str:
    """Remove tracking params, normalize scheme and host, strip fragments."""
    try:
        p = urlparse(url.strip())
        if p.scheme not in ("http", "https"):
            return url
        qs = {k: v for k, v in parse_qs(p.query, keep_blank_values=True).items()
              if k.lower() not in _TRACKING_PARAMS}
        new_query = urlencode(sorted(qs.items()), doseq=True)
        return urlunparse((p.scheme, p.netloc.lower(), p.path.rstrip("/") or "/",
                          p.params, new_query, ""))
    except Exception:
        return url


def is_safe_url(url: str) -> bool:
    """Allow only http/https URLs."""
    try:
        scheme = urlparse(url).scheme
        return scheme in ("http", "https")
    except Exception:
        return False


def make_article_id(url: str) -> str:
    """Stable SHA-256 fingerprint from canonical URL."""
    return hashlib.sha256(canonicalize_url(url).encode()).hexdigest()[:16]


# ── Text utilities ─────────────────────────────────────────────────────────
_HTML_TAG_RE  = re.compile(r"<[^>]+>")
_WS_RE        = re.compile(r"\s+")
_READMORE_RE  = re.compile(
    r"(?:read more|click here|continue reading|full story|more at|…).*$",
    re.IGNORECASE,
)


def strip_html(text: str) -> str:
    """Remove HTML tags and decode entities."""
    if not text:
        return ""
    # Use BeautifulSoup for entity decoding; fall back to regex for tag removal
    try:
        text = BeautifulSoup(text, "html.parser").get_text(separator=" ")
    except Exception:
        text = unescape(_HTML_TAG_RE.sub(" ", text))
    return _WS_RE.sub(" ", text).strip()


def clean_description(text: str, max_chars: int = 300) -> str:
    """Strip HTML, remove boilerplate, truncate cleanly at word boundary."""
    text = strip_html(text)
    text = _READMORE_RE.sub("", text).strip()
    if len(text) <= max_chars:
        return text
    # Truncate at a word boundary
    truncated = text[:max_chars]
    last_space = truncated.rfind(" ")
    if last_space > max_chars // 2:
        truncated = truncated[:last_space]
    return truncated.rstrip(".,;:") + "…"


def extract_sentences(text: str, max_sentences: int = 5) -> list:
    """Split text into sentences (simple heuristic)."""
    text = strip_html(text)
    # Split on sentence-ending punctuation followed by whitespace and capital
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z\"])", text)
    sentences = [s.strip() for s in parts if len(s.strip()) > 20]
    return sentences[:max_sentences]


def normalize_title(title: str) -> str:
    """Lowercase, strip punctuation/extra whitespace for comparison."""
    title = unicodedata.normalize("NFKD", title.lower())
    title = re.sub(r"[^\w\s]", " ", title)
    return _WS_RE.sub(" ", title).strip()


def fuzzy_title_similarity(a: str, b: str) -> float:
    """
    Simple word-overlap Jaccard similarity for deduplication.
    Returns 0.0–1.0 (1.0 = identical, ≥0.7 = likely same article).
    """
    wa = set(normalize_title(a).split())
    wb = set(normalize_title(b).split())
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / len(wa | wb)


# ── Relevance scoring ──────────────────────────────────────────────────────
def relevance_score(title: str, description: str) -> int:
    """
    Return weighted keyword score. Title matches count double.
    Threshold (from settings) determines inclusion.
    """
    total = 0
    haystack_title = (title or "").lower()
    haystack_desc  = (description or "").lower()

    for pattern, score in _COMPILED_KW:
        if pattern.search(haystack_title):
            total += score * 2  # title match is double weight
        if pattern.search(haystack_desc):
            total += score
    return total


def is_relevant(title: str, description: str, threshold: int = 3) -> bool:
    return relevance_score(title, description) >= threshold


# ── Category classification ────────────────────────────────────────────────
def classify_category(title: str, description: str, tags: list = None) -> str:
    """Return the first matching category from CATEGORY_RULES, else 'Other AI News'."""
    combined = f"{title} {description} {' '.join(tags or '')}".lower()
    for category, patterns in _COMPILED_CATS:
        for pat in patterns:
            if pat.search(combined):
                return category
    return "Other AI News"


# ── State detection ────────────────────────────────────────────────────────
# Ambiguous abbreviations that appear in many non-state contexts
_SKIP_ABBRS_CONTEXT = {
    "me": ["me", "myself"],   # pronouns
    "in": ["in", "into"],     # prepositions
    "or": ["or"],
    "ok": ["ok", "okay"],
}

def detect_state(text: str) -> str | None:
    """
    Detect a US state reference. Returns 2-letter abbreviation or None.
    Avoids false positives from common words.
    """
    text_lower = text.lower()

    # Check full state names first (highest confidence)
    for name_lower, abbr in sorted(STATE_NAME_TO_ABBR.items(), key=lambda x: -len(x[0])):
        if re.search(r'\b' + re.escape(name_lower) + r'\b', text_lower):
            return abbr

    # Check unambiguous abbreviations in a state-context phrase
    # Only trigger on patterns like "in Texas" or "Texas (TX)" or "TX law"
    for abbr_upper, name in STATE_ABBR.items():
        if abbr_upper in AMBIGUOUS_ABBRS:
            continue
        # Pattern: state abbreviation followed or preceded by policy keywords
        state_ctx = re.compile(
            r'(?:in|from|of|for|at)\s+' + re.escape(abbr_upper) + r'\b'
            r'|' + re.escape(abbr_upper) + r'\s+(?:law|bill|county|city|state|governor|legislature|PUD|grid)',
            re.IGNORECASE,
        )
        if state_ctx.search(text):
            return abbr_upper

    return None


# ── Summary generation (deterministic) ────────────────────────────────────
def generate_summary(title: str, description: str, category: str, tags: list) -> dict:
    """
    Build a structured summary from feed-provided metadata.
    Never invents factual claims beyond what's in the feed.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    desc_clean = strip_html(description or "")
    title_clean = strip_html(title or "")

    # Determine method and compose summary
    if desc_clean and len(desc_clean) > 60:
        summary_text = desc_clean
        method = "feed-description"
    elif title_clean:
        summary_text = title_clean
        method = "title-only"
    else:
        summary_text = ""
        method = "unavailable"

    # Key points: distinct sentences from description
    key_points = []
    if desc_clean and len(desc_clean) > 60:
        sentences = extract_sentences(desc_clean, max_sentences=4)
        # Take up to 3 non-title sentences as key points
        for s in sentences:
            if len(s) > 25 and normalize_title(s) != normalize_title(title_clean):
                key_points.append(s)
            if len(key_points) >= 3:
                break

    why_matters = WHY_IT_MATTERS.get(category, WHY_IT_MATTERS["Other AI News"])

    return {
        "summary":              summary_text[:800] if summary_text else "",
        "key_points":           key_points,
        "why_it_matters":       why_matters,
        "summary_method":       method,
        "summary_generated_at": now_iso,
    }


# ── Feed fetching ──────────────────────────────────────────────────────────
def fetch_with_retry(url: str, settings: dict, retries: int = 2) -> bytes | None:
    """
    Fetch a URL with timeout and size limit. Returns raw bytes or None on failure.
    Retries on transient errors with exponential backoff.
    """
    headers = {
        "User-Agent": settings.get("user_agent", "NewsAggregator/1.0"),
        "Accept": "application/rss+xml, application/atom+xml, text/xml, application/xml, */*",
    }
    timeout  = settings.get("request_timeout_seconds", 20)
    max_size = settings.get("max_response_bytes", 2097152)

    for attempt in range(retries + 1):
        try:
            session = requests.Session()
            session.max_redirects = 5
            resp = session.get(
                url, headers=headers, timeout=timeout, stream=True
            )
            resp.raise_for_status()
            content = b""
            for chunk in resp.iter_content(chunk_size=65536):
                content += chunk
                if len(content) > max_size:
                    log.warning("  Response too large, truncating: %s", url)
                    break
            return content
        except requests.exceptions.HTTPError as e:
            log.warning("  HTTP %s for %s", e.response.status_code, url)
            return None  # don't retry on 4xx/5xx
        except requests.exceptions.Timeout:
            log.warning("  Timeout (attempt %d) for %s", attempt + 1, url)
        except requests.exceptions.ConnectionError as e:
            log.warning("  Connection error (attempt %d) for %s: %s", attempt + 1, url, e)
        except Exception as e:
            log.warning("  Fetch error (attempt %d) for %s: %s", attempt + 1, url, e)

        if attempt < retries:
            time.sleep(2 ** attempt)

    return None


# ── XML RSS/Atom parser ────────────────────────────────────────────────────
_NS = {
    "atom":    "http://www.w3.org/2005/Atom",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc":      "http://purl.org/dc/elements/1.1/",
    "media":   "http://search.yahoo.com/mrss/",
    "gn":      "http://news.google.com/rss",
}


def _text(el, tag, ns_uri=None):
    """Get text of a child element, with optional namespace."""
    if ns_uri:
        child = el.find(f"{{{ns_uri}}}{tag}")
    else:
        child = el.find(tag)
    if child is not None and child.text:
        return child.text.strip()
    return None


def _attr(el, tag, attr, ns_uri=None):
    if ns_uri:
        child = el.find(f"{{{ns_uri}}}{tag}")
    else:
        child = el.find(tag)
    if child is not None:
        return child.get(attr, "")
    return ""


def parse_date(raw: str) -> str | None:
    """Parse any date string to ISO 8601 UTC. Returns None on failure."""
    if not raw:
        return None
    try:
        dt = dateutil_parser.parse(raw, fuzzy=True)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        return None


def _extract_image(item_el) -> str | None:
    """Try to extract a feed-provided image URL from media:content or enclosure."""
    # media:content
    media = item_el.find(f"{{{_NS['media']}}}content")
    if media is not None:
        url = media.get("url", "")
        if url.startswith("http") and any(
            url.lower().endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp")
        ):
            return url
    # enclosure
    enc = item_el.find("enclosure")
    if enc is not None:
        url  = enc.get("url", "")
        mime = enc.get("type", "")
        if url.startswith("http") and "image" in mime:
            return url
    return None


def parse_rss_feed(content: bytes, source_name: str, source_homepage: str) -> list:
    """Parse RSS 2.0 feed bytes, return list of raw article dicts."""
    try:
        root = __import__("xml.etree.ElementTree", fromlist=["ElementTree"]).fromstring(content)
    except Exception as e:
        log.warning("  XML parse error: %s", e)
        return []

    # Handle both <rss><channel> and bare <channel>/<feed>
    # NOTE: Do NOT use `root.find("channel") or root` — ElementTree Element objects
    # are falsy when they have no children, so the `or` would incorrectly fall through.
    channel = root.find("channel")
    if channel is None:
        channel = root
    items = channel.findall("item")
    if not items:
        items = root.findall("item")

    articles = []
    for item in items:
        title = _text(item, "title") or ""
        link  = _text(item, "link") or ""
        # Some feeds put the link in guid with isPermaLink="true"
        if not link:
            guid = item.find("guid")
            if guid is not None and guid.get("isPermaLink", "false").lower() != "false":
                link = (guid.text or "").strip()

        if not link or not is_safe_url(link):
            continue

        # Description: prefer content:encoded, then description
        desc = _text(item, "encoded", _NS["content"]) or _text(item, "description") or ""
        pub_date = _text(item, "pubDate") or _text(item, "date", _NS["dc"])
        image_url = _extract_image(item)

        # Google News source element gives us the original publisher
        gn_source_el = item.find("source")
        publisher = source_name
        if gn_source_el is not None and gn_source_el.text:
            publisher = gn_source_el.text.strip()

        articles.append({
            "title":       strip_html(title),
            "url":         link.strip(),
            "description": desc,
            "raw_date":    pub_date,
            "image_url":   image_url,
            "source":      publisher,
            "source_url":  source_homepage,
        })

    return articles


def parse_atom_feed(content: bytes, source_name: str, source_homepage: str) -> list:
    """Parse Atom feed bytes, return list of raw article dicts."""
    try:
        root = __import__("xml.etree.ElementTree", fromlist=["ElementTree"]).fromstring(content)
    except Exception as e:
        log.warning("  XML parse error: %s", e)
        return []

    ns = "http://www.w3.org/2005/Atom"
    entries = root.findall(f"{{{ns}}}entry")
    if not entries:
        entries = root.findall("entry")

    articles = []
    for entry in entries:
        # NOTE: Do NOT use `find(...) or find(...)` — Element objects are falsy
        # when childless, so text-only elements like <title> would fall through.
        title_el = entry.find(f"{{{ns}}}title")
        if title_el is None:
            title_el = entry.find("title")
        title = (title_el.text or "").strip() if title_el is not None else ""

        # Link: prefer type="text/html" alternate rel
        link = ""
        link_els = entry.findall(f"{{{ns}}}link")
        if not link_els:
            link_els = entry.findall("link")
        for link_el in link_els:
            rel  = link_el.get("rel", "alternate")
            mime = link_el.get("type", "text/html")
            href = link_el.get("href", "")
            if rel in ("alternate", "") and "html" in mime and href:
                link = href
                break
            if not link and href:
                link = href

        if not link or not is_safe_url(link):
            continue

        # Summary: prefer content, then summary
        def _atom_text(tag, _entry=entry, _ns=ns):
            el = _entry.find(f"{{{_ns}}}{tag}")
            if el is None:
                el = _entry.find(tag)
            if el is None:
                return ""
            return el.text or ""

        desc = _atom_text("content") or _atom_text("summary")
        published = (_text(entry, "published", ns) or _text(entry, "updated", ns)
                     or _text(entry, "published") or _text(entry, "updated"))
        image_url = _extract_image(entry)

        articles.append({
            "title":       strip_html(title),
            "url":         link.strip(),
            "description": desc,
            "raw_date":    published,
            "image_url":   image_url,
            "source":      source_name,
            "source_url":  source_homepage,
        })

    return articles


def parse_feed(content: bytes, source_name: str, source_homepage: str) -> list:
    """Auto-detect RSS vs Atom and parse accordingly."""
    if not content:
        return []
    head = content[:512].lower()
    if b"<feed" in head or b"xmlns=\"http://www.w3.org/2005/atom\"" in head:
        result = parse_atom_feed(content, source_name, source_homepage)
        if result:
            return result
    # Try RSS first, fall back to Atom if empty
    result = parse_rss_feed(content, source_name, source_homepage)
    if not result:
        result = parse_atom_feed(content, source_name, source_homepage)
    return result


# ── Google News RSS URL builder ────────────────────────────────────────────
def google_news_url(query: str) -> str:
    from urllib.parse import quote_plus
    return (
        f"https://news.google.com/rss/search"
        f"?q={quote_plus(query)}&hl=en-US&gl=US&ceid=US:en"
    )


# ── Build a full article from raw entry ───────────────────────────────────
def build_article(raw: dict, settings: dict, now_iso: str) -> dict | None:
    """
    Convert a raw feed entry to the full article schema.
    Returns None if the article should be excluded.
    """
    title       = raw.get("title", "").strip()
    url         = raw.get("url", "").strip()
    description = raw.get("description", "")
    source      = raw.get("source", "Unknown")
    source_url  = raw.get("source_url", "")
    image_url   = raw.get("image_url")

    if not title or not url or not is_safe_url(url):
        return None

    # Relevance gate
    threshold = settings.get("relevance_threshold", 3)
    desc_clean = clean_description(description, 500)
    if not is_relevant(title, desc_clean, threshold):
        return None

    # Date
    published_at = parse_date(raw.get("raw_date", ""))
    # Reject articles more than 45 days old (generous to avoid gaps on first run)
    if published_at:
        try:
            dt = dateutil_parser.parse(published_at)
            if dt < datetime.now(timezone.utc) - timedelta(days=45):
                return None
        except Exception:
            pass

    # Classification
    tags     = extract_tags(title, desc_clean)
    category = classify_category(title, desc_clean, tags)
    state    = detect_state(f"{title} {desc_clean}")

    canon_url = canonicalize_url(url)
    art_id    = make_article_id(canon_url)

    summary_data = generate_summary(title, desc_clean, category, tags)

    return {
        "id":           art_id,
        "title":        title,
        "description":  clean_description(description),
        "source":       source,
        "source_url":   source_url or "",
        "url":          canon_url,
        "published_at": published_at,
        "collected_at": now_iso,
        "category":     category,
        "location":     {
            "state":  state,
            "county": None,
        },
        "tags":         tags,
        "image_url":    image_url if image_url and is_safe_url(image_url) else None,
        **summary_data,
    }


def extract_tags(title: str, description: str) -> list:
    """Extract relevant topic tags from title and description."""
    combined = f"{title} {description}".lower()
    tag_map = {
        r"\bartificial intelligence\b":  "artificial intelligence",
        r"\bgenerative [aA][iI]\b":      "generative AI",
        r"\bmachine learning\b":         "machine learning",
        r"\blarge language model\b":     "large language models",
        r"\b[lL][lL][mM]s?\b":          "LLM",
        r"\bdata center\b":              "data centers",
        r"\bsemiconductor\b":            "semiconductors",
        r"\bGPU\b":                      "GPU",
        r"\b[aA][iI] regulation\b":      "AI regulation",
        r"\b[aA][iI] policy\b":          "AI policy",
        r"\b[aA][iI] safety\b":          "AI safety",
        r"\bmoratorium\b":               "moratorium",
        r"\bzoning\b":                   "zoning",
        r"\benergy\b":                   "energy",
        r"\bpower grid\b":               "power grid",
        r"\bwater\b":                    "water",
        r"\bOpenAI\b":                   "OpenAI",
        r"\bAnthropic\b":                "Anthropic",
        r"\bNVIDIA\b":                   "NVIDIA",
        r"\bGoogle\b":                   "Google",
        r"\bMicrosoft\b":                "Microsoft",
        r"\bMeta\b":                     "Meta",
        r"\bAmazon\b":                   "Amazon",
        r"\bApple\b":                    "Apple",
        r"\bcopyright\b":                "copyright",
        r"\bexport control\b":           "export controls",
        r"\bnuclear\b":                  "nuclear",
        r"\btax incentive\b":            "tax incentives",
    }
    found = []
    for pat, tag in tag_map.items():
        if re.search(pat, combined, re.IGNORECASE):
            if tag not in found:
                found.append(tag)
        if len(found) >= 6:
            break
    return found


# ── Deduplication ──────────────────────────────────────────────────────────
def deduplicate(articles: list, fuzzy_threshold: float = 0.70) -> list:
    """
    Remove duplicates by:
    1. Canonical URL (exact match)
    2. Normalized title (exact match)
    3. Fuzzy title similarity >= threshold
    Prefer direct-publisher articles over Google News aggregator copies.
    """
    seen_urls   = {}  # canonical_url → index in output
    seen_titles = {}  # normalized_title → index in output
    output      = []

    def _is_gnews(url):
        return "news.google.com" in url

    for art in articles:
        curl  = art.get("url", "")
        norm  = normalize_title(art.get("title", ""))

        # URL dedup
        if curl in seen_urls:
            i = seen_urls[curl]
            # Prefer direct publisher over google.com
            if _is_gnews(output[i]["url"]) and not _is_gnews(curl):
                output[i] = art
            continue

        # Exact title dedup
        if norm in seen_titles:
            i = seen_titles[norm]
            if _is_gnews(output[i]["url"]) and not _is_gnews(curl):
                seen_urls.pop(output[i]["url"], None)
                output[i] = art
                seen_urls[curl] = i
            continue

        # Fuzzy title dedup
        matched = False
        for title_seen, idx in seen_titles.items():
            if fuzzy_title_similarity(norm, title_seen) >= fuzzy_threshold:
                # Prefer direct publisher
                if _is_gnews(output[idx]["url"]) and not _is_gnews(curl):
                    seen_urls.pop(output[idx]["url"], None)
                    seen_titles.pop(title_seen, None)
                    output[idx] = art
                    seen_urls[curl] = idx
                    seen_titles[norm] = idx
                matched = True
                break

        if not matched:
            idx = len(output)
            output.append(art)
            seen_urls[curl] = idx
            seen_titles[norm] = idx

    return output


# ── Diversity cap ──────────────────────────────────────────────────────────
def apply_diversity_cap(articles: list, max_per_source: int = 25) -> list:
    """Ensure no single publisher overwhelms the feed."""
    counts = {}
    result = []
    for art in articles:
        src = art.get("source", "Unknown")
        if counts.get(src, 0) < max_per_source:
            result.append(art)
            counts[src] = counts.get(src, 0) + 1
    return result


# ── Validation ─────────────────────────────────────────────────────────────
def validate_article(art: dict) -> list:
    """Return list of validation error strings. Empty = valid."""
    errors = []
    if not art.get("title"):
        errors.append("missing title")
    url = art.get("url", "")
    if not url or not is_safe_url(url):
        errors.append(f"invalid url: {url!r}")
    if not art.get("source"):
        errors.append("missing source")
    if art.get("category") not in VALID_CATEGORIES:
        errors.append(f"invalid category: {art.get('category')!r}")
    state = (art.get("location") or {}).get("state")
    if state and state not in STATE_ABBR:
        errors.append(f"invalid state: {state!r}")
    # Reject sample placeholder data
    if url == "#" or url.endswith("/#"):
        errors.append("sample placeholder URL")
    return errors


def validate_output(articles: list) -> bool:
    """Validate full output. Returns True if OK, False on fatal issues."""
    ok = True
    seen_ids  = set()
    seen_urls = set()

    for i, art in enumerate(articles):
        errors = validate_article(art)
        if errors:
            log.warning("Article %d validation errors: %s — %r", i, errors, art.get("title",""))
            ok = False

        art_id = art.get("id", "")
        if art_id in seen_ids:
            log.warning("Duplicate ID at index %d: %s", i, art_id)
            ok = False
        seen_ids.add(art_id)

        curl = art.get("url", "")
        if curl in seen_urls:
            log.warning("Duplicate URL at index %d: %s", i, curl)
        seen_urls.add(curl)

    # Ensure sorted newest-first
    dated = [a for a in articles if a.get("published_at")]
    for j in range(1, len(dated)):
        if dated[j - 1]["published_at"] < dated[j]["published_at"]:
            log.warning("Articles not sorted newest-first at index %d", j)
            ok = False
            break

    return ok


# ── Merge + save ───────────────────────────────────────────────────────────
def load_existing(path: str) -> list:
    """Load existing ai_news.json articles, filtering out sample/invalid ones."""
    if not os.path.exists(path):
        return []
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        articles = data.get("articles", [])
        # Filter out sample placeholder articles (url == "#")
        clean = [a for a in articles if is_safe_url(a.get("url", ""))]
        if len(clean) < len(articles):
            log.info("Removed %d sample/invalid articles from existing data", len(articles) - len(clean))
        return clean
    except Exception as e:
        log.warning("Could not load existing %s: %s", path, e)
        return []


def sort_articles(articles: list) -> list:
    """Sort newest-first. Articles with no date go last."""
    def sort_key(a):
        d = a.get("published_at") or ""
        return d if d else "0000"
    return sorted(articles, key=sort_key, reverse=True)


def save_output(path: str, articles: list, stats: dict) -> None:
    """Write output atomically (write to .tmp, then rename)."""
    now_iso   = datetime.now(timezone.utc).isoformat()
    out = {
        "generated_at":      now_iso,
        "article_count":     len(articles),
        "sources_checked":   stats.get("sources_checked", 0),
        "sources_succeeded": stats.get("sources_succeeded", 0),
        "sources_failed":    stats.get("sources_failed", 0),
        "articles":          articles,
    }
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)
    log.info("Saved %d articles to %s", len(articles), path)


# ── Per-source processing ──────────────────────────────────────────────────
def process_source(url: str, source_name: str, source_homepage: str,
                   settings: dict) -> tuple:
    """
    Fetch and parse one source URL.
    Returns (raw_list, success_bool).
    """
    log.info("Checking source: %s  <%s>", source_name, url)
    content = fetch_with_retry(url, settings)
    if content is None:
        log.warning("  FAILED: %s", source_name)
        return [], False

    raw = parse_feed(content, source_name, source_homepage)
    log.info("  Fetched %d entries from %s", len(raw), source_name)
    return raw, True


# ── Main ───────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Update AI news feed")
    parser.add_argument("--validate-only", action="store_true",
                        help="Validate existing output without fetching")
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch and process but do not write output")
    args = parser.parse_args()

    # Load source config
    with open(SOURCES_FILE, encoding="utf-8") as f:
        config = json.load(f)

    settings = config.get("settings", {})

    if args.validate_only:
        existing = load_existing(OUTPUT_FILE)
        ok = validate_output(existing)
        sys.exit(0 if ok else 1)

    now_iso       = datetime.now(timezone.utc).isoformat()
    retention_days = settings.get("retention_days", 30)
    cutoff        = datetime.now(timezone.utc) - timedelta(days=retention_days)

    stats = {"sources_checked": 0, "sources_succeeded": 0, "sources_failed": 0}
    all_raw = []

    # ── Direct feeds ──
    for src in config.get("direct_feeds", []):
        if not src.get("enabled") or not src.get("url"):
            continue
        stats["sources_checked"] += 1
        raw, ok = process_source(
            src["url"], src["name"], src.get("homepage", ""), settings
        )
        if ok:
            stats["sources_succeeded"] += 1
            all_raw.extend(raw)
        else:
            stats["sources_failed"] += 1
        time.sleep(0.5)  # polite delay

    # ── Google News queries ──
    for gn in config.get("google_news_queries", []):
        if not gn.get("enabled"):
            continue
        stats["sources_checked"] += 1
        url = google_news_url(gn["query"])
        raw, ok = process_source(url, f"Google News: {gn['query']}", "https://news.google.com", settings)
        if ok:
            stats["sources_succeeded"] += 1
            all_raw.extend(raw)
        else:
            stats["sources_failed"] += 1
        time.sleep(0.3)

    log.info(
        "Sources: %d checked, %d succeeded, %d failed",
        stats["sources_checked"], stats["sources_succeeded"], stats["sources_failed"]
    )
    log.info("Total raw entries collected: %d", len(all_raw))

    # ── Build articles ──
    threshold = settings.get("relevance_threshold", 3)
    new_articles = []
    skipped_irrelevant = 0
    skipped_invalid = 0

    for raw in all_raw:
        art = build_article(raw, settings, now_iso)
        if art is None:
            desc_check = clean_description(raw.get("description",""), 500)
            if raw.get("title") and not is_relevant(raw["title"], desc_check, threshold):
                skipped_irrelevant += 1
            else:
                skipped_invalid += 1
            continue
        new_articles.append(art)

    log.info(
        "New articles: %d relevant, %d skipped (irrelevant), %d skipped (invalid/old)",
        len(new_articles), skipped_irrelevant, skipped_invalid
    )

    # ── Merge with existing ──
    existing = load_existing(OUTPUT_FILE)
    log.info("Existing valid articles: %d", len(existing))

    merged = new_articles + existing

    # ── Deduplicate ──
    before_dedup = len(merged)
    merged = deduplicate(merged)
    log.info("After dedup: %d (removed %d duplicates)", len(merged), before_dedup - len(merged))

    # ── Remove old articles ──
    def is_recent(art):
        d = art.get("published_at")
        if not d:
            return True  # keep undated
        try:
            return dateutil_parser.parse(d) >= cutoff
        except Exception:
            return True

    merged = [a for a in merged if is_recent(a)]
    log.info("After retention filter (%d days): %d articles", retention_days, len(merged))

    # ── Sort newest-first ──
    merged = sort_articles(merged)

    # ── Apply diversity cap ──
    max_per_source = settings.get("max_articles_per_source", 25)
    max_total      = settings.get("max_articles_total", 250)
    merged = apply_diversity_cap(merged, max_per_source)
    merged = merged[:max_total]
    log.info("Final article count: %d", len(merged))

    # ── Validate ──
    validate_output(merged)

    if not merged and not existing:
        log.error("No articles to save and no existing data — aborting")
        sys.exit(1)

    # ── Fallback: preserve existing if no new data at all ──
    if not merged:
        log.warning("No articles after filtering; preserving existing data unchanged")
        sys.exit(0)

    if args.dry_run:
        log.info("Dry run: would write %d articles", len(merged))
        return

    save_output(OUTPUT_FILE, merged, stats)
    log.info("Done.")


if __name__ == "__main__":
    main()
