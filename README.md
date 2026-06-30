# US Data Center & AI Restrictions Map

An interactive choropleth map tracking data center construction restrictions, AI regulations, and high-intensity computing moratoriums at the US county level.

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
index.html + js/map.js       ← D3.js choropleth map (static, no server needed)
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

## Tech Stack

- **D3.js v7** — SVG choropleth with Albers USA projection
- **TopoJSON client** — County boundary rendering from us-atlas
- **us-atlas@3** — US county/state boundary TopoJSON (CDN)
- **Python 3** — Data processing script (no external deps required)
- **GitHub Actions** — Daily data refresh + Pages deployment
- **GitHub Pages** — Static hosting
