/* js/jurisdiction.js — Jurisdiction Intelligence Pages (Phase 3)

   WHY: before this, a county's policy record lived on the Map tab, its
   facilities on the Pipeline tab, its news on the News tab, and its zoning on
   the Zoning layer — with no way to see them together. This module joins all
   of those sources on county FIPS and renders one page per jurisdiction.

   Route: #jurisdiction?fips=51107   (see js/router.js)

   Data joins, all keyed on 5-digit county FIPS:
     mapData[fips]                          policy record
     facilities_index.json .county_fips     data center facilities
     source_link_health.json .urls          citation reachability + archive
     ai_news.json .location                 related news (name/state match)
     ZONING.hasCoverage(fips)               zoning pilot coverage
     computeSuitabilityScore(fips, county)  suitability grade

   Every value rendered through innerHTML is passed through escHtml() — county
   names, source labels, and facility operators all originate from external
   data files and must never be trusted as markup.

   Exports: window.JURISDICTION = { render, init }
*/
window.JURISDICTION = (function () {
  'use strict';

  let _facilities = null;      // lazily fetched facilities_index.json
  let _facLoading = null;      // in-flight promise, so we fetch at most once
  let _currentFips = null;

  /* ── Utilities ──────────────────────────────────────────────────────────── */

  const esc = (s) => (typeof escHtml === "function"
    ? escHtml(s == null ? "" : s)
    : String(s == null ? "" : s).replace(/[&<>"]/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));

  function fmtDate(d) {
    if (!d) return "";
    const dt = String(d).includes("T") ? new Date(d) : new Date(d + "T12:00:00Z");
    if (isNaN(dt)) return String(d);
    return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function fmtMW(mw) {
    if (mw == null || isNaN(mw)) return null;
    const n = Number(mw);
    return n >= 1000 ? `${(n / 1000).toFixed(1)} GW` : `${Math.round(n)} MW`;
  }

  /* ── Data loading ───────────────────────────────────────────────────────── */

  /* Citation link health, produced by data/check_source_links.py in CI. Optional:
     if the file is absent (never run yet) every link simply renders unannotated,
     exactly as before. */
  let _linkHealth = null;
  let _linkHealthLoading = null;

  function loadLinkHealth() {
    if (_linkHealth) return Promise.resolve(_linkHealth);
    if (_linkHealthLoading) return _linkHealthLoading;
    _linkHealthLoading = fetch("data/source_link_health.json")
      .then(r => (r.ok ? r.json() : null))
      .then(j => { _linkHealth = (j && j.urls) ? j : { urls: {} }; return _linkHealth; })
      .catch(() => { _linkHealth = { urls: {} }; return _linkHealth; });
    return _linkHealthLoading;
  }

  function linkStatus(url) {
    const rec = _linkHealth && _linkHealth.urls ? _linkHealth.urls[url] : null;
    if (!rec) return null;                 // never checked — say nothing
    return rec;
  }

  function loadFacilities() {
    if (_facilities) return Promise.resolve(_facilities);
    if (_facLoading) return _facLoading;
    _facLoading = fetch("data/facilities_index.json")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(j => { _facilities = Array.isArray(j) ? j : []; return _facilities; })
      .catch(err => {
        console.warn("[Jurisdiction] facilities unavailable:", err.message);
        _facilities = [];
        return _facilities;
      });
    return _facLoading;
  }

  /* News articles whose location mentions this county or its state. County
     match is strong; state-only match is a weaker fallback shown separately. */
  function relatedNews(county) {
    const arts = (typeof newsArticles !== "undefined" && Array.isArray(newsArticles))
      ? newsArticles : [];
    if (!arts.length || !county) return { county: [], state: [] };

    const cName = String(county.name || "").replace(/\s+County$/i, "").toLowerCase();
    const sName = String(county.state || "").toLowerCase();
    const out = { county: [], state: [] };

    for (const a of arts) {
      const hay = `${a.location || ""} ${a.title || ""}`.toLowerCase();
      if (cName && hay.includes(cName)) out.county.push(a);
      else if (sName && hay.includes(sName)) out.state.push(a);
    }
    out.county = out.county.slice(0, 6);
    out.state  = out.state.slice(0, 4);
    return out;
  }

  /* ── Section renderers ──────────────────────────────────────────────────── */

  function renderHeader(fips, county) {
    const sevKey = typeof getSeverityKey === "function" ? getSeverityKey(county) : "none";
    const sevLbl = window.SEVERITY_LABELS[sevKey] || "";
    const sevCol = window.SEVERITY_COLORS[sevKey] || "var(--text-muted)";

    const watched = !!(window.WATCHLIST && window.WATCHLIST.has(fips));

    return `
      <div class="juris-hero">
        <div class="juris-hero-main">
          <a class="juris-back" href="#map" title="Back to map">&larr; Map</a>
          <h1 class="juris-title">${esc(county.name)}</h1>
          <div class="juris-sub">${esc(county.state)} &middot; FIPS ${esc(fips)}</div>
          <div class="juris-badges">
            <span class="juris-sev" style="background:${sevCol}1a;color:${sevCol};border-color:${sevCol}55;">
              ${esc(sevLbl)}
            </span>
            ${county.lifecycle_stage
              ? `<span class="juris-chip">${esc(county.lifecycle_stage)}</span>` : ""}
            ${county.pipeline_verified
              ? `<span class="juris-chip juris-chip-ok">&#10003; Pipeline verified</span>` : ""}
          </div>
        </div>
        <div class="juris-hero-actions">
          <button class="juris-btn juris-btn-watch${watched ? " is-on" : ""}"
                  data-juris-watch="${esc(fips)}" type="button">
            ${watched ? "&#9733; Watching" : "&#9734; Watch"}
          </button>
          <a class="juris-btn" href="#${esc(fips)}">View on map</a>
        </div>
      </div>`;
  }

  function renderPolicy(county) {
    const lvlLabel = window.LEVEL_LABELS[String(county.level)] || "";
    const types = Array.isArray(county.types) ? county.types : [];
    const sources = Array.isArray(county.sources) ? county.sources : [];

    return `
      <section class="juris-card">
        <h2 class="juris-h2">Policy Record</h2>
        ${county.title ? `<div class="juris-policy-title">${esc(county.title)}</div>` : ""}
        <dl class="juris-dl">
          <div><dt>Restriction level</dt><dd>${esc(lvlLabel)}</dd></div>
          <div><dt>Status</dt><dd>${esc(county.status || "unknown")}</dd></div>
          <div><dt>Effective date</dt><dd>${county.effective_date ? esc(fmtDate(county.effective_date)) : "Not recorded"}</dd></div>
          <div><dt>Policy types</dt><dd>${types.length ? types.map(t => `<span class="juris-chip">${esc(t)}</span>`).join(" ") : "&mdash;"}</dd></div>
          <div><dt>Last reviewed</dt><dd>${county.last_reviewed ? esc(fmtDate(county.last_reviewed)) : "Not recorded"}</dd></div>
        </dl>
        ${county.description
          ? `<p class="juris-desc">${esc(county.description)}</p>` : ""}
        ${county.notes
          ? `<p class="juris-notes"><strong>Notes:</strong> ${esc(county.notes)}</p>` : ""}
        ${sources.length ? `
          <div class="juris-sources">
            <div class="juris-sources-h">Sources</div>
            <ul>
              ${sources.map(s => {
                const h = linkStatus(s.url);
                const dead = h && h.ok === false;
                const archive = dead && h.archive && h.archive.url ? h.archive.url : null;
                return `
                <li class="${dead ? "juris-src-dead" : ""}">
                  <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"
                     ${dead ? `title="This link did not respond when last checked${h.status ? ` (HTTP ${esc(String(h.status))})` : ""}"` : ""}>
                    ${esc(s.label || s.url)}
                  </a>
                  ${dead ? `<span class="juris-src-flag" title="Checked ${esc((h.checked_at || "").slice(0, 10))}">link not responding</span>` : ""}
                  ${archive ? ` <a class="juris-src-archive" href="${esc(archive)}" target="_blank" rel="noopener noreferrer">archived copy</a>` : ""}
                </li>`;
              }).join("")}
            </ul>
            <p class="juris-source-note">
              Source links point to third-party government sites and may move or expire.
              Verify against the primary record before relying on this data.
            </p>
          </div>` : `
          <p class="juris-empty-inline">No source links recorded for this jurisdiction.</p>`}
      </section>`;
  }

  function renderFacilities(fips, county) {
    const all = (_facilities || []).filter(f => f.county_fips === fips);

    if (!all.length) {
      return `
        <section class="juris-card">
          <h2 class="juris-h2">Data Center Facilities</h2>
          <div class="juris-empty">
            <p>No facilities recorded in this county.</p>
            <p class="juris-empty-sub">
              Facility data is aggregated from public sources and is incomplete.
              Absence of a record does not mean no facilities exist here.
            </p>
          </div>
        </section>`;
    }

    const op      = all.filter(f => f.operational_status === "operational");
    const planned = all.filter(f => f.operational_status === "planned");
    const totalMW = all.reduce((s, f) => s + (Number(f.capacity_mw_known) || 0), 0);
    const sorted  = all.slice().sort((a, b) =>
      (Number(b.capacity_mw_known) || 0) - (Number(a.capacity_mw_known) || 0)).slice(0, 12);

    return `
      <section class="juris-card">
        <h2 class="juris-h2">Data Center Facilities</h2>
        <div class="juris-stat-row">
          <div class="juris-stat"><span class="juris-stat-n">${all.length}</span><span class="juris-stat-l">Total</span></div>
          <div class="juris-stat"><span class="juris-stat-n">${op.length}</span><span class="juris-stat-l">Operational</span></div>
          <div class="juris-stat"><span class="juris-stat-n">${planned.length}</span><span class="juris-stat-l">Planned</span></div>
          ${totalMW > 0 ? `<div class="juris-stat"><span class="juris-stat-n">${esc(fmtMW(totalMW))}</span><span class="juris-stat-l">Known capacity</span></div>` : ""}
        </div>
        <table class="juris-table">
          <thead><tr><th>Facility</th><th>Operator</th><th>Status</th><th>Capacity</th></tr></thead>
          <tbody>
            ${sorted.map(f => `
              <tr>
                <td>${esc(f.name || "Unnamed")}</td>
                <td>${esc(f.operator || f.parent_company || "—")}</td>
                <td><span class="juris-status juris-status-${esc(f.operational_status || "unknown")}">${esc(f.operational_status || "unknown")}</span></td>
                <td>${f.capacity_mw_known ? esc(fmtMW(f.capacity_mw_known)) : "—"}</td>
              </tr>`).join("")}
          </tbody>
        </table>
        ${all.length > sorted.length
          ? `<p class="juris-more">Showing top ${sorted.length} of ${all.length} by capacity.
             <a href="#pipeline">Open Pipeline</a> to see all.</p>` : ""}
        <p class="juris-source-note">
          Aggregated from public sources via automated pipeline. Not independently verified.
        </p>
      </section>`;
  }

  function renderNewsSection(county) {
    const { county: cNews, state: sNews } = relatedNews(county);
    if (!cNews.length && !sNews.length) {
      return `
        <section class="juris-card">
          <h2 class="juris-h2">Related News</h2>
          <div class="juris-empty"><p>No recent articles mention this jurisdiction.</p></div>
        </section>`;
    }

    const item = (a) => `
      <li class="juris-news-item">
        <a href="${esc(a.url || a.source_url || "#")}" target="_blank" rel="noopener noreferrer">
          ${esc(a.title || "Untitled")}
        </a>
        <div class="juris-news-meta">
          ${esc(a.source || "")}${a.published_at ? " &middot; " + esc(fmtDate(a.published_at)) : ""}
        </div>
      </li>`;

    return `
      <section class="juris-card">
        <h2 class="juris-h2">Related News</h2>
        ${cNews.length ? `<ul class="juris-news">${cNews.map(item).join("")}</ul>` : ""}
        ${sNews.length ? `
          <div class="juris-news-sub">Statewide coverage</div>
          <ul class="juris-news">${sNews.map(item).join("")}</ul>` : ""}
        <p class="juris-more"><a href="#news">Open the full news feed</a></p>
      </section>`;
  }

  /* Private notes for a watched county. Only shown once the county is on the
     watchlist, since the note is stored on the watchlist entry. */
  function renderNotes(fips) {
    if (!window.WATCHLIST || !window.WATCHLIST.has(fips)) return "";
    const entry = window.WATCHLIST.get(fips) || {};
    return `
      <section class="juris-card">
        <h2 class="juris-h2">Your Notes</h2>
        <textarea class="juris-notes-input" data-juris-notes="${esc(fips)}" rows="4"
          placeholder="Track board votes, contacts, or why this county matters to you."
          aria-label="Private notes for this county">${esc(entry.notes || "")}</textarea>
        <div class="juris-notes-foot">
          <span class="juris-notes-status" data-juris-notes-status></span>
          <span class="juris-source-note">Stored in this browser${
            window.AUTH && window.AUTH.configured
              ? ", and synced to your account when signed in" : ""}.</span>
        </div>
      </section>`;
  }

  function renderContext(fips, county) {
    /* Suitability score, zoning coverage, and cross-links. */
    let scoreBlock = "";
    if (typeof computeSuitabilityScore === "function") {
      try {
        const s = computeSuitabilityScore(fips, county);
        if (s && s.score != null) {
          scoreBlock = `
            <div class="juris-score">
              <div class="juris-score-grade">${esc(s.grade || "")}</div>
              <div>
                <div class="juris-score-n">${esc(Math.round(s.score))}<span>/100</span></div>
                <div class="juris-score-l">Suitability score</div>
              </div>
            </div>
            <p class="juris-source-note">
              Algorithmically estimated from regulatory and infrastructure signals.
              Not a professional site assessment.
            </p>`;
        }
      } catch (_) { /* scoring is best-effort context, never blocks the page */ }
    }

    // js/zoning.js exports hasCoverage() — not hasJurisdiction(). Calling the
    // wrong name silently reported every county as uncovered, including the
    // one pilot county that does have zoning data.
    const hasZoning = !!(window.ZONING && typeof window.ZONING.hasCoverage === "function"
      && window.ZONING.hasCoverage(fips));

    return `
      <section class="juris-card">
        <h2 class="juris-h2">Site Context</h2>
        ${scoreBlock || `<p class="juris-empty-inline">Suitability scoring unavailable for this county.</p>`}
        <div class="juris-links">
          <a class="juris-link" href="#${esc(fips)}">Open on map</a>
          <a class="juris-link" href="#pipeline">Facilities pipeline</a>
          <a class="juris-link" href="#analytics">State analytics</a>
          ${hasZoning
            ? `<a class="juris-link" href="#${esc(fips)}">Zoning districts (pilot)</a>`
            : `<span class="juris-link is-off" title="Zoning data not available for this county">Zoning &mdash; not covered</span>`}
        </div>
      </section>`;
  }

  function renderNotResearched(fips) {
    return `
      <div class="juris-wrap">
        <div class="juris-hero">
          <div class="juris-hero-main">
            <a class="juris-back" href="#map" title="Back to map">&larr; Map</a>
            <h1 class="juris-title">County ${esc(fips)}</h1>
            <div class="juris-badges">
              <span class="juris-sev juris-sev-unknown">Not yet researched</span>
            </div>
          </div>
        </div>
        <section class="juris-card">
          <div class="juris-empty">
            <p><strong>This county has not been individually researched.</strong></p>
            <p class="juris-empty-sub">
              No policy record exists for FIPS ${esc(fips)}. This is not the same as
              &ldquo;no restrictions&rdquo; &mdash; restrictions may exist but have not
              been reviewed. ${esc(String(window.platformStat("coverage.counties_in_database", 1465)))}
              of ${esc(String(window.TOTAL_US_COUNTIES))} US counties are currently in the database.
            </p>
            <p class="juris-empty-sub">
              Verify directly with the county government before relying on this.
            </p>
          </div>
          <div class="juris-links">
            <a class="juris-link" href="#map">Back to map</a>
            <a class="juris-link" href="#methodology">How counties are researched</a>
          </div>
        </section>
      </div>`;
  }

  /* ── Main render ────────────────────────────────────────────────────────── */

  function render(fips) {
    const view = document.getElementById("jurisdiction-view");
    if (!view) return;

    fips = String(fips || "").padStart(5, "0");
    _currentFips = fips;

    if (!/^\d{5}$/.test(fips)) {
      view.innerHTML = `<div class="juris-wrap"><section class="juris-card">
        <div class="juris-empty"><p>Invalid county identifier.</p>
        <div class="juris-links"><a class="juris-link" href="#map">Back to map</a></div>
        </div></section></div>`;
      return;
    }

    const county = (typeof mapData !== "undefined" && mapData) ? mapData[fips] : null;

    if (!county) {
      view.innerHTML = renderNotResearched(fips);
      _wire(view);
      return;
    }

    /* Paint immediately with everything we have; facilities fill in after
       their fetch resolves so the page is never blocked on a 2 MB file. */
    const paint = () => {
      if (_currentFips !== fips) return;   // user navigated away mid-fetch
      view.innerHTML = `
        <div class="juris-wrap">
          ${renderHeader(fips, county)}
          <div class="juris-grid">
            <div class="juris-col">
              ${renderPolicy(county)}
              ${renderFacilities(fips, county)}
            </div>
            <div class="juris-col juris-col-side">
              ${renderContext(fips, county)}
              ${renderNotes(fips)}
              ${renderNewsSection(county)}
            </div>
          </div>
        </div>`;
      _wire(view);
    };

    paint();
    if (!_facilities) loadFacilities().then(paint);
    if (!_linkHealth) loadLinkHealth().then(paint);
  }

  /* ── Event wiring ───────────────────────────────────────────────────────── */

  function _wire(view) {
    view.querySelectorAll("[data-juris-watch]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!window.WATCHLIST) return;
        const fips = btn.dataset.jurisWatch;
        window.WATCHLIST.toggle(fips);
        // Re-render so the notes card appears/disappears with watch state.
        render(fips);
      });
    });

    /* Notes autosave — debounced so we are not writing on every keystroke. */
    view.querySelectorAll("[data-juris-notes]").forEach(area => {
      const status = view.querySelector("[data-juris-notes-status]");
      let timer = null;
      area.addEventListener("input", () => {
        if (!window.WATCHLIST) return;
        if (status) status.textContent = "Saving…";
        clearTimeout(timer);
        timer = setTimeout(() => {
          window.WATCHLIST.setNotes(area.dataset.jurisNotes, area.value);
          if (status) {
            status.textContent = "Saved";
            setTimeout(() => { if (status.textContent === "Saved") status.textContent = ""; }, 2000);
          }
        }, 500);
      });
      /* On blur, commit whenever the field differs from what is stored —
         not just when a debounce is pending. This also catches value changes
         that arrive without an input event (autofill, some paste paths). */
      area.addEventListener("blur", () => {
        if (!window.WATCHLIST) return;
        clearTimeout(timer); timer = null;
        const fips = area.dataset.jurisNotes;
        const stored = (window.WATCHLIST.get(fips) || {}).notes || "";
        if (area.value === stored) return;
        window.WATCHLIST.setNotes(fips, area.value);
        if (status) status.textContent = "Saved";
      });
    });
  }

  /* Called by the router when the #jurisdiction route becomes active. */
  function init(params) {
    render(params && params.fips);
  }

  return { render, init, loadFacilities };
})();
