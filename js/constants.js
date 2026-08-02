/* js/constants.js — Single source of truth for platform-wide constants.
   Loaded FIRST, before all other app scripts.

   WHY THIS FILE EXISTS:
   Severity/level labels were previously duplicated across map.js, home.js, and
   analytics.js (6 separate copies). When labels were corrected in one place the
   others drifted, producing inconsistent terminology in the UI. All label maps
   now live here. Do not re-declare them elsewhere.

   See docs/TERMINOLOGY.md for the canonical definitions of every label.

   Exports (all on window):
     SEVERITY_LABELS  — severity key -> display label
     SEVERITY_COLORS  — severity key -> hex color
     LEVEL_LABELS     — numeric level (-1..4) -> display label
     LEVEL_SHORT      — numeric level -> compact label (for chips/tables)
     LEVEL_TO_SEVERITY— numeric level -> severity key
     PLATFORM_META    — platform_metadata.json contents (null until loaded)
     loadPlatformMeta() -> Promise<meta>
     platformStat(path, fallback) — safe dotted-path read of PLATFORM_META
*/
(function () {
  'use strict';

  /* ── Severity keys ────────────────────────────────────────────────────────
     Canonical order, least->most restrictive: pro, none, proposed, moderate,
     high, ban. These labels are user-facing; see docs/TERMINOLOGY.md. */
  const SEVERITY_LABELS = {
    pro:      "Pro-Development Hub",
    none:     "No Known Restrictions",
    proposed: "Proposed Restrictions",
    moderate: "Moderate Restrictions",
    high:     "Significant Restrictions",
    ban:      "Moratorium / Ban",
  };

  /* Compact variants for chips, table cells, and narrow columns. */
  const SEVERITY_SHORT = {
    pro:      "Pro-Dev",
    none:     "No Known",
    proposed: "Proposed",
    moderate: "Moderate",
    high:     "Significant",
    ban:      "Ban",
  };

  const SEVERITY_COLORS = {
    pro:      "#4ade80",
    none:     "#16a34a",
    proposed: "#eab308",
    moderate: "#f97316",
    high:     "#dc2626",
    ban:      "#7f1d1d",
  };

  /* ── Numeric levels ───────────────────────────────────────────────────────
     -1 = pro-development, 0 = researched/no restrictions found, 1..4 ascending. */
  const LEVEL_TO_SEVERITY = {
    "-1": "pro",
    "0":  "none",
    "1":  "proposed",
    "2":  "moderate",
    "3":  "high",
    "4":  "ban",
  };

  const LEVEL_LABELS = {
    "-1": "Pro-Development Hub",
    "0":  "No Known Restrictions",
    "1":  "Light Regulations",
    "2":  "Moderate Restrictions",
    "3":  "Significant Restrictions",
    "4":  "Ban / Moratorium",
  };

  const LEVEL_SHORT = {
    "-1": "Pro-Dev",
    "0":  "No Known",
    "1":  "Light",
    "2":  "Moderate",
    "3":  "Significant",
    "4":  "Ban",
  };

  /* ── Platform metadata ────────────────────────────────────────────────────
     data/platform_metadata.json is the central stats source (Phase 1). Never
     hardcode coverage numbers — read them through platformStat(). */
  let PLATFORM_META = null;
  let _metaPromise  = null;

  function loadPlatformMeta() {
    if (_metaPromise) return _metaPromise;
    _metaPromise = fetch("data/platform_metadata.json")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(j => { PLATFORM_META = j; window.PLATFORM_META = j; return j; })
      .catch(err => {
        console.warn("[constants] platform_metadata.json unavailable:", err.message);
        return null;
      });
    return _metaPromise;
  }

  /* Safe dotted-path read with fallback, e.g.
       platformStat("coverage.counties_in_database", 0) */
  function platformStat(path, fallback) {
    if (!PLATFORM_META) return fallback;
    let cur = PLATFORM_META;
    for (const key of String(path).split(".")) {
      if (cur == null || typeof cur !== "object" || !(key in cur)) return fallback;
      cur = cur[key];
    }
    return cur == null ? fallback : cur;
  }

  /* Total US counties — fixed constant, used for coverage math everywhere. */
  const TOTAL_US_COUNTIES = 3143;

  /* Coverage percentage of RESEARCHED counties, rounded to whole percent.

     Uses coverage.counties_researched, NOT counties_in_database. Those differ:
     597 records carry research_status="descriptive_only" — they hold a general
     description of the county but no policy research was ever done. Counting
     them as researched inflated this figure from 28% to 47%, so any
     user-facing "researched" claim must exclude them.
     Falls back to counties_in_database only for older metadata files that
     predate the distinction. */
  function coveragePct() {
    const researched = platformStat("coverage.counties_researched", null);
    const inDb = researched !== null && researched !== undefined
      ? researched
      : platformStat("coverage.counties_in_database", 0);
    const total = platformStat("coverage.total_us_counties", TOTAL_US_COUNTIES);
    if (!inDb || !total) return 0;
    return Math.round(inDb / total * 100);
  }

  /* Count of counties genuinely researched for policy. Prefer this over
     counties_in_database anywhere the word "researched" is shown to a user. */
  function researchedCount() {
    const r = platformStat("coverage.counties_researched", null);
    return (r === null || r === undefined)
      ? platformStat("coverage.counties_in_database", 0)
      : r;
  }

  /* Scheme-validate a URL before it goes into an href attribute. Many pages
     render href="${esc(url)}" straight from automated scraper/RSS-adapter
     output (news articles, policy sources, signal citations) — escHtml()
     encodes &<>" but does not stop a "javascript:" URI from executing on
     click. Use this everywhere a data-driven URL becomes an href; "#" is a
     safe no-op fallback for anything that isn't a plain http(s) link. */
  function safeHref(url) {
    const s = String(url || "").trim();
    return /^https?:\/\//i.test(s) ? s : "#";
  }

  /* ── Export ─────────────────────────────────────────────────────────────── */
  window.SEVERITY_LABELS    = SEVERITY_LABELS;
  window.SEVERITY_SHORT     = SEVERITY_SHORT;
  window.SEVERITY_COLORS    = SEVERITY_COLORS;
  window.LEVEL_LABELS       = LEVEL_LABELS;
  window.LEVEL_SHORT        = LEVEL_SHORT;
  window.LEVEL_TO_SEVERITY  = LEVEL_TO_SEVERITY;
  window.TOTAL_US_COUNTIES  = TOTAL_US_COUNTIES;
  window.safeHref           = safeHref;
  window.PLATFORM_META      = PLATFORM_META;
  window.loadPlatformMeta   = loadPlatformMeta;
  window.platformStat       = platformStat;
  window.coveragePct        = coveragePct;
  window.researchedCount    = researchedCount;

  /* Kick off the metadata fetch immediately so it is warm by first render. */
  loadPlatformMeta();
})();
