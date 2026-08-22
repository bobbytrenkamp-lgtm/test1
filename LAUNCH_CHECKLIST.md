# Launch Checklist

Snapshot of what's done and what's left before this platform is ready for a
real public launch. Written after an extended audit/hardening pass — see
`BUG_TRACKER.md` for the full bug-by-bug history and `AI_CHANGELOG.md` for
the day-by-day change log.

---

## Done

**Core platform**
- Full data pipeline: policy tracking (1,500+ jurisdictions), parcel
  intelligence (59 jurisdictions with real fieldMaps and licensing
  diligence), zoning (3 pilot counties), economic data, grid/fiber/water
  infrastructure, data-center census, political risk, AI stocks/news.
- Automated discovery, ingestion, and validation pipelines for all of the
  above, running on GitHub Actions (free tier) with health monitoring and
  auto-managed GitHub Issues on failure.
- Zero paid dependencies anywhere — enforced by
  `tests/test_no_paid_dependencies.py`.

**Accessibility & correctness**
- Site-wide WCAG 2 AA pass: landmarks, form labels, heading order, and
  every color-contrast violation found by axe-core fixed, including the
  dark-mode `--accent-text`/`--accent-fill` split and a systematic
  opacity-compounding sweep across every CSS file.
- Two rounds of flaw-finding passes across the entire JS codebase (every
  file in `js/`, largest first) covering: unescaped HTML injection, CSV/
  formula injection in every export, race conditions in async renders,
  event-listener/memory leaks, and fabricated fallback values standing in
  for real data. All confirmed findings fixed and verified.
- Full local test suite (Python validators + JS unit tests + jsdom + E2E
  browser smoke) green with zero regressions after every change —
  `./tests/run_all.sh` (add `E2E=1` with a server on :8099 for the full
  run).

**Legal/compliance groundwork**
- Terms of Service and Privacy Policy pages drafted (`js/analytics.js`
  `renderAboutPage()`, routes `#terms`/`#privacy`).
- Licensing diligence completed on all 59 parcel-data sources — each
  `license` field in `js/parcel/registry.js` documents real, researched
  terms-of-use findings (not the generic placeholder). 4 sources remain
  honestly marked `[Unresearched]` where two independent research passes
  with live web search couldn't surface a jurisdiction-specific terms
  page: Dallas County TX, Wake County NC (partially — a terms URL was
  found but not fetchable), Tarrant County TX, Jefferson County AL.
- Opt-in, privacy-preserving client error logging (`js/error-logging.js`)
  — no user identity captured, rate-limited, inert until configured.

---

## Left to do — needs you, not more code

### 1. Configure Supabase (enables accounts)
Auth, cloud saved-items, cross-device preference sync, and error logging
are fully built and tested against a mock client, but **inert** on the
live site until real credentials are set. Follow `SUPABASE_SETUP.md`
top to bottom:
- Create a free Supabase project, run `data/supabase_schema.sql`.
- Put the project URL + anon key into `js/supabase-config.js`.
- Set the Site URL / Redirect URLs in Supabase's dashboard.
- Walk the verification checklist at the bottom of that doc.

Until this is done the site works fully without accounts — this is
additive, not blocking.

### 2. Legal review of Terms of Service / Privacy Policy
The drafted pages are honest, reasonable placeholder text, not a
substitute for an actual lawyer reviewing them against your business
entity, jurisdiction, and data-handling practices before real users sign
up. Have counsel review before treating account creation as production-
ready.

### 3. Decide what to do with the 4 unresearched licensing entries
Options, in order of effort: (a) leave them as-is — the app already
displays "verify terms before commercial redistribution" honestly and
doesn't block on it; (b) research them by hand (a human can fetch pages
this sandbox's network policy blocks); (c) drop those 4 jurisdictions
from the registry if their licensing risk is unacceptable for your use
case.

### 4. Pick a production hosting/deploy target
The app is currently wired for GitHub Pages
(`https://bobbytrenkamp-lgtm.github.io/test1/` — see `index.html`'s
canonical/og:url tags and `sitemap.xml`/`robots.txt`). If launch means a
different domain, update those static references (they're deliberately
hardcoded for SEO, unlike the dynamic-origin fixes applied elsewhere this
pass) and re-register the new URL in Supabase's redirect-URL settings.

---

## Explicitly out of scope (not gaps — deliberately deferred)

Recorded so they aren't rediscovered as "missing": a coverage/quality
dashboard and a multi-table ArcGIS join connector were originally planned
as separate future PRs, but both already exist in a more capable form
than planned (`analytics.js`'s `analytics-parcel-coverage-section` +
`data/parcel_coverage_metrics.json`; `js/parcel/enrichment-arcgis-table.js`
+ `enrichment.js`). Static-download parcel ingestion has one real,
live-verified source populated as a proof of concept, not a general
pipeline — expanding it further is a genuine future feature, not a bug.
