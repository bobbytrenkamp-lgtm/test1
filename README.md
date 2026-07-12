# US Data Center & AI Restrictions Map

An interactive three-tab web application tracking US data center and AI policy, AI news, and AI stock market data.

**Tabs:**
- **Map** — Choropleth map of data center construction restrictions, AI regulations, and computing moratoriums at the US county level
- **AI News** — Curated AI industry news feed updated hourly
- **AI Stocks** — Interactive AI company stock tracker with TradingView charts, 50+ companies, favorites, and market heatmap

## Documentation Status

Some sections of this README preserve earlier project setup notes and may reference the original D3 implementation. The current AI-maintained source of truth is `PROJECT_CONTEXT.md`, with detailed technical history in `AI_CONTEXT.md`. When this README conflicts with those files, treat the README wording as historical until it is intentionally refreshed.

## Live Site

Hosted on GitHub Pages — enable Pages on the `main` branch to activate.  
Go to **Settings → Pages → Source → GitHub Actions**.

## How It Works

```
data/restrictions_raw.json   ← manually curated source of truth
        │
        ▼
data/process_data.py         ← runs daily via GitHub Actions
        │
        ▼
data/map_data.json           ← consumed by the frontend
        │
        ▼
index.html + js/map.js       ← Leaflet.js choropleth map (static, no server needed)
```

The GitHub Actions workflow runs `process_data.py` every day at 06:00 UTC.  
If `map_data.json` changes it commits the update and triggers a Pages redeploy.

## Restriction Levels

| Level | Meaning |
|-------|---------|
| 0 | No known specific restrictions |
| 1 | Light regulations (environmental review, AI ordinances, minor requirements) |
| 2 | Moderate restrictions (pending legislation, proposed moratoriums, significant permitting) |
| 3 | Significant active restrictions (density limits, zone bans, active moratoriums) |
| 4 | Ban or moratorium in effect |

## Restriction Types

- **data_center** — Physical data center construction or operation restrictions
- **ai** — Artificial intelligence deployment or use regulations
- **crypto** — Cryptocurrency mining / high-intensity computing restrictions
- **energy** — Energy use or grid impact restrictions
- **water** — Water use restrictions affecting data centers

## Adding or Updating Data

Edit `data/restrictions_raw.json` directly. Each entry follows this schema:

```json
{
  "fips": "51107",
  "name": "Loudoun County",
  "state": "Virginia",
  "level": 3,
  "types": ["data_center"],
  "title": "Short title for the restriction",
  "description": "Longer description shown in the detail panel.",
  "effective_date": "2023-03-15",
  "status": "active",
  "notes": "Optional extra notes.",
  "sources": ["Source name or citation"]
}
```

After editing, either:
- Commit to `main` and the daily workflow will regenerate `map_data.json`, or
- Run locally: `python data/process_data.py`

## Local Development

```bash
# Generate the data file
python data/process_data.py

# Serve locally (any static server works)
python -m http.server 8000
# Open http://localhost:8000
```

## AI News Feed

The **AI News** tab shows automatically aggregated articles about AI regulations, data center policy, and related topics from public RSS/Atom feeds.

### How the news feed works

```
data/news_sources.json     ← configurable feed registry (direct feeds + Google News queries)
        │
        ▼
data/update_ai_news.py     ← runs hourly via GitHub Actions (update_ai_news.yml)
        │
        ▼
data/ai_news.json          ← consumed by the frontend (merged, deduplicated)
        │
        ▼
js/map.js  (initNewsView / renderNews)
```

The workflow runs at `:17` past every hour (`17 * * * *`). If `ai_news.json` changes it commits automatically with `[skip ci]` to avoid triggering a redundant Pages deploy.

### What is stored per article

Only feed-provided metadata is stored — no full article text is copied:

| Field | Source |
|-------|--------|
| `title` | RSS/Atom `<title>` |
| `url` | Canonical `<link>` (tracking params stripped) |
| `source` | Feed publisher name |
| `published_at` | `<pubDate>` / `<published>` (ISO 8601 UTC) |
| `category` | Classified by `update_ai_news.py` from 14 controlled categories |
| `description` | Short feed-provided excerpt (not full article) |
| `summary` | Deterministic summary from headline + description |
| `key_points` | Extracted from description sentences |
| `why_it_matters` | Generated from relevance keywords present in feed text |
| `tags` | Extracted keywords |
| `location` | Detected US state / county |

### Copyright policy

- **No full articles are copied.** Only headline, short description/excerpt, publication name, URL, date, and derived metadata.
- **No paywalled, robots.txt-blocked, or authentication-required content is fetched.**
- Images are never hotlinked from scraped pages — only image URLs legitimately present in RSS/Atom feed metadata.
- All RSS content is treated as untrusted; only `textContent` assignment is used in the frontend (no `innerHTML` from feed data).

### Adding or disabling sources

Edit `data/news_sources.json`:

```json
{
  "direct_feeds": [
    {
      "name": "Example Publication",
      "url": "https://example.com/feed.xml",
      "enabled": true
    }
  ],
  "google_news_queries": [
    {
      "name": "AI regulation",
      "query": "AI regulation",
      "enabled": true
    }
  ]
}
```

Set `"enabled": false` to disable a source without deleting it. The `_disabled_reason` field is available for notes on why a source is off (e.g. deprecated free feed).

### Running the news aggregator locally

```bash
pip install -r data/requirements.txt
python data/update_ai_news.py          # updates data/ai_news.json
python data/update_ai_news.py --dry-run        # prints articles, does not write
python data/update_ai_news.py --validate-only  # validates existing ai_news.json only
```

**Note:** Some sources may be blocked by corporate proxies. The script will log failures and continue with whichever feeds succeed. The GitHub Actions runner has unrestricted internet access.

### Running the unit tests

```bash
pip install pytest
python -m pytest tests/ -v
```

All tests run without live internet access using inline sample RSS/Atom bytes.

### Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| `ai_news.json` has 0 articles | First run after reset, or all feeds failed. Check Actions logs. |
| "No recent AI news" in the UI | `generated_at` is null — feed hasn't run yet. Trigger workflow manually via Actions → Update AI News Feed → Run workflow. |
| Articles disappearing | `retention_days` setting (default 30) prunes old articles on each run. |
| Relevance threshold too high | Lower `relevance_threshold` in `data/news_sources.json` `settings` block (default: 3). |
| `feedparser` import error | This project intentionally does not use feedparser — it requires `sgmllib` which was removed in Python 3.11. The custom XML parser in `update_ai_news.py` handles RSS 2.0 and Atom 1.0. |

## Tech Stack

- **Leaflet.js v1.9.4** — Interactive map with native pan, zoom, touch
- **TopoJSON client** — County boundary rendering from us-atlas
- **Python 3.11** — Data processing and news aggregation scripts
- **GitHub Actions** — Daily map data refresh + hourly news feed + Pages deployment
- **GitHub Pages** — Static hosting

> **Note:** The README's earlier tech stack reference to D3.js is historical. The application was migrated to Leaflet; see `AI_CONTEXT.md` for the migration history.
