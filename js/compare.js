/* js/compare.js — county/facility comparison panel.

   Extracted verbatim from js/map.js as part of breaking up an 8,347-line file.
   The code is unchanged; only its location is.

   Classic scripts share one global scope, so addToCompare(),
   addFacilityToCompare(), toggleComparePanel(), and initBookmarks() stay
   callable by bare name from map.js. The comparison state itself
   (compareList, compareFacilities) is still declared in map.js and read here
   the same way it always was.
*/

/* ── Compare panel ── */
function _cmpRadarSvg(s) {
  const cx = 50, cy = 32, R = 22;
  const gradeColors = { A: "#22c55e", B: "#22d3ee", C: "#eab308", D: "#f97316", F: "#ef4444" };
  const col = gradeColors[s.grade] || "#4874e8";
  const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
  const ox = (a, r) => (cx + r * Math.cos(a)).toFixed(1);
  const oy = (a, r) => (cy + r * Math.sin(a)).toFixed(1);
  const poly = r => angles.map(a => `${ox(a, r)},${oy(a, r)}`).join(" ");
  const grids = `<polygon points="${poly(R)}" fill="none" stroke="var(--radar-grid)" stroke-width="0.6"/>` +
    `<polygon points="${poly(R * 0.5)}" fill="none" stroke="var(--radar-grid)" stroke-width="0.5" stroke-dasharray="2 2"/>`;
  const axes = angles.map(a =>
    `<line x1="${cx}" y1="${cy}" x2="${ox(a, R)}" y2="${oy(a, R)}" stroke="var(--radar-grid)" stroke-width="0.5"/>`
  ).join("");
  const dataPoly = s.factors.map((f, i) => {
    const r = Math.max(1.5, (f.pts / f.max) * R);
    return `${ox(angles[i], r)},${oy(angles[i], r)}`;
  }).join(" ");
  const dots = s.factors.map((f, i) => {
    const r = Math.max(1.5, (f.pts / f.max) * R);
    return `<circle cx="${ox(angles[i], r)}" cy="${oy(angles[i], r)}" r="1.8" fill="${col}"/>`;
  }).join("");
  return `<svg viewBox="0 0 100 58" aria-hidden="true" style="width:100%;height:auto;display:block;">
    ${grids}${axes}
    <polygon points="${dataPoly}" fill="${col}" fill-opacity="0.18" stroke="${col}" stroke-width="1.3" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
}

function renderComparePanel() {
  const body = document.getElementById("compare-body");
  if (!body) return;
  body.innerHTML = "";

  if (!compareCounties.length && !compareFacilities.length) {
    const wrap = document.createElement("div");
    wrap.className = "cmp-empty-wrap";
    const hint = document.createElement("p");
    hint.className = "cmp-empty-hint";
    hint.textContent = "Click counties on the map, or use “Add to Compare” on any facility, to compare up to 6 items side-by-side.";
    wrap.appendChild(hint);
    const slots = document.createElement("div");
    slots.className = "cmp-empty-slots";
    for (let i = 0; i < 2; i++) slots.appendChild(_makeCmpAddSlot());
    wrap.appendChild(slots);
    body.appendChild(wrap);
    return;
  }

  // Pre-compute scores for diff highlighting (only meaningful with 2+ counties)
  const _suits = {};
  compareCounties.forEach(f => { const c = mapData[f]; if (c) _suits[f] = computeSuitabilityScore(f, c).score; });
  const _scores = Object.values(_suits);
  const _maxScore = _scores.length > 1 ? Math.max(..._scores) : -1;
  const _minScore = _scores.length > 1 ? Math.min(..._scores) : -1;
  const _multicount = compareCounties.filter(f => mapData[f]).length > 1;

  // Severity rank for diff highlighting (lower = better for DC siting)
  const SEV_RANK = { pro: 0, none: 1, proposed: 2, moderate: 3, high: 4, ban: 5 };
  const _sevRanks = {};
  compareCounties.forEach(f => { const c = mapData[f]; if (c) _sevRanks[f] = SEV_RANK[getSeverityKey(c)] ?? 3; });
  const _rankVals = Object.values(_sevRanks);
  const _bestRank = _rankVals.length > 1 ? Math.min(..._rankVals) : -1;
  const _worstRank = _rankVals.length > 1 ? Math.max(..._rankVals) : -1;

  compareCounties.forEach(fips => {
    const county = mapData[fips];
    if (!county) return;
    const sevKey   = getSeverityKey(county);
    const sevColor = SEVERITY[sevKey].color;
    const sevLabel = SEVERITY[sevKey].label;
    const types    = (county.types || []).map(t => TYPE_LABELS[t] || t).join(", ") || "—";
    const date     = county.effective_date || county.date || "—";
    const suit     = computeSuitabilityScore(fips, county);

    const isBestScore  = _multicount && _suits[fips] === _maxScore && _maxScore !== _minScore;
    const isWorstScore = _multicount && _suits[fips] === _minScore && _maxScore !== _minScore;
    const isBestSev    = _multicount && _sevRanks[fips] === _bestRank && _bestRank !== _worstRank;
    const isWorstSev   = _multicount && _sevRanks[fips] === _worstRank && _bestRank !== _worstRank;

    const col = document.createElement("div");
    col.className = "cmp-col";
    col.setAttribute("role", "group");
    col.setAttribute("aria-label", `${county.name}, ${county.state}`);
    col.style.setProperty("--cmp-sev-color", sevColor);
    if (isBestScore)  col.classList.add("cmp-col-best");
    if (isWorstScore) col.classList.add("cmp-col-worst");

    // Header
    const hdr = document.createElement("div");
    hdr.className = "cmp-col-header";
    hdr.style.borderTopColor = sevColor;
    const nameWrap = document.createElement("div");
    const nameEl   = document.createElement("div");
    nameEl.className = "cmp-col-name";
    nameEl.textContent = county.name;
    const stateEl  = document.createElement("div");
    stateEl.className = "cmp-col-state";
    stateEl.textContent = county.state;
    nameWrap.appendChild(nameEl);
    nameWrap.appendChild(stateEl);
    const removeBtn = document.createElement("button");
    removeBtn.className  = "cmp-col-remove";
    removeBtn.type       = "button";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", `Remove ${county.name}`);
    removeBtn.addEventListener("click", () => removeFromCompare(fips));

    // Best/worst badge
    if (isBestScore) {
      const badge = document.createElement("span");
      badge.className = "cmp-diff-badge cmp-diff-best";
      badge.textContent = "Best";
      hdr.appendChild(badge);
    } else if (isWorstScore) {
      const badge = document.createElement("span");
      badge.className = "cmp-diff-badge cmp-diff-worst";
      badge.textContent = "Highest Risk";
      hdr.appendChild(badge);
    }

    hdr.appendChild(nameWrap);
    hdr.appendChild(removeBtn);

    // Body rows
    const colBody = document.createElement("div");
    colBody.className = "cmp-col-body";

    // Mini radar for quick visual comparison
    const radarWrap = document.createElement("div");
    radarWrap.className = "cmp-mini-radar";
    radarWrap.innerHTML = _cmpRadarSvg(suit); // SVG uses only computed numbers — no user data
    colBody.appendChild(radarWrap);

    function addField(label, valueHtml, highlight) {
      const f = document.createElement("div");
      f.className = "cmp-field";
      if (highlight) f.classList.add("cmp-field-" + highlight);
      const lEl = document.createElement("div");
      lEl.className = "cmp-field-label";
      lEl.textContent = label;
      const vEl = document.createElement("div");
      vEl.className = "cmp-field-value";
      vEl.innerHTML = valueHtml; // safe: only static strings + escHtml()
      f.appendChild(lEl);
      f.appendChild(vEl);
      colBody.appendChild(f);
    }

    addField("Suitability",
      `<span class="cmp-suit-grade cmp-suit-${suit.grade}">${suit.grade}</span>${escHtml(suit.score + " / 100")} <span style="color:var(--text-muted);font-size:10px;">— ${escHtml(suit.label)}</span>`,
      isBestScore ? "best" : isWorstScore ? "worst" : null
    );
    addField("Severity",
      `<span class="cmp-field-value cmp-sev-badge"><span class="cmp-sev-dot" style="background:${sevColor}"></span>${escHtml(sevLabel)}</span>`,
      isBestSev ? "best" : isWorstSev ? "worst" : null
    );
    addField("Status", escHtml((county.status || "active").charAt(0).toUpperCase() + (county.status || "active").slice(1)));
    addField("Policy Types", escHtml(types));
    addField("Enacted", escHtml(date));
    if (county.title) {
      addField("Title", escHtml(county.title));
    }
    if (county.description) {
      const descF = document.createElement("div");
      descF.className = "cmp-field";
      const lEl = document.createElement("div");
      lEl.className = "cmp-field-label";
      lEl.textContent = "Description";
      const vEl = document.createElement("div");
      vEl.className = "cmp-desc";
      vEl.textContent = county.description;
      descF.appendChild(lEl);
      descF.appendChild(vEl);
      colBody.appendChild(descF);
    }

    col.appendChild(hdr);
    col.appendChild(colBody);
    body.appendChild(col);
  });

  // Render facility columns
  compareFacilities.forEach(facility => {
    const facilityId = facility.facility_id || facility.id || facility.name;
    const col = document.createElement("div");
    col.className = "cmp-col cmp-col-facility";
    col.setAttribute("role", "group");
    col.setAttribute("aria-label", facility.name);
    col.style.setProperty("--cmp-sev-color", "#4874e8");

    const hdr = document.createElement("div");
    hdr.className = "cmp-col-header";
    hdr.style.borderTopColor = "#4874e8";
    hdr.innerHTML = `<div class="cmp-facility-type-badge">Facility</div>`;
    const nameWrap = document.createElement("div");
    const nameEl   = document.createElement("div");
    nameEl.className = "cmp-col-name";
    nameEl.textContent = facility.name || "Unknown";
    const stateEl  = document.createElement("div");
    stateEl.className = "cmp-col-state";
    stateEl.textContent = [facility.city, facility.state_abbr].filter(Boolean).join(", ");
    nameWrap.appendChild(nameEl);
    nameWrap.appendChild(stateEl);
    const removeBtn = document.createElement("button");
    removeBtn.className  = "cmp-col-remove";
    removeBtn.type       = "button";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", `Remove ${facility.name}`);
    removeBtn.addEventListener("click", () => removeFacilityFromCompare(facilityId));
    hdr.appendChild(nameWrap);
    hdr.appendChild(removeBtn);

    const colBody = document.createElement("div");
    colBody.className = "cmp-col-body";

    function addFacilityField(label, text) {
      const f = document.createElement("div");
      f.className = "cmp-field";
      const lEl = document.createElement("div");
      lEl.className = "cmp-field-label";
      lEl.textContent = label;
      const vEl = document.createElement("div");
      vEl.className = "cmp-field-value";
      vEl.textContent = text;
      f.appendChild(lEl);
      f.appendChild(vEl);
      colBody.appendChild(f);
    }

    const statusColors = { operational: "#22c55e", construction: "#f59e0b", planned: "#60a5fa", decommissioned: "#9ca3af" };
    const statusCol = statusColors[facility.operational_status] || "#6b7280";
    const statusBadge = document.createElement("div");
    statusBadge.className = "cmp-field";
    statusBadge.innerHTML = `<div class="cmp-field-label">Status</div><div class="cmp-field-value"><span class="cmp-sev-dot" style="background:${statusCol}"></span>${escHtml(facility.operational_status || "unknown")}</div>`;
    colBody.appendChild(statusBadge);

    if (facility.capacity_mw_known) {
      const mw = facility.capacity_mw_known;
      addFacilityField("Known Capacity", mw >= 1000 ? (mw/1000).toFixed(1) + " GW" : Math.round(mw) + " MW");
    }
    if (facility.capacity_mw_planned) {
      const mw = facility.capacity_mw_planned;
      addFacilityField("Planned Capacity", mw >= 1000 ? (mw/1000).toFixed(1) + " GW" : Math.round(mw) + " MW");
    }
    if (facility.facility_type) addFacilityField("Facility Type", facility.facility_type);
    if (facility.operator)      addFacilityField("Operator", facility.operator);
    if (facility.county)        addFacilityField("County", facility.county);

    // Show county suitability if FIPS available
    if (facility.county_fips) {
      const cty = mapData[facility.county_fips];
      if (cty) {
        const suit = computeSuitabilityScore(facility.county_fips, cty);
        const f2 = document.createElement("div");
        f2.className = "cmp-field";
        f2.innerHTML = `<div class="cmp-field-label">County Suitability</div><div class="cmp-field-value"><span class="cmp-suit-grade cmp-suit-${suit.grade}">${suit.grade}</span>${suit.score}/100 — ${escHtml(suit.label)}</div>`;
        colBody.appendChild(f2);
      }
    }

    col.appendChild(hdr);
    col.appendChild(colBody);
    body.appendChild(col);
  });

  // Always show one "+" slot at the end to invite more additions (up to max)
  if (_cmpTotal() < CMP_MAX) body.appendChild(_makeCmpAddSlot());
}


function _makeCmpAddSlot() {
  const col = document.createElement("div");
  col.className = "cmp-add-col";
  col.title = "Click a county on the map to add it";
  col.innerHTML =
    `<div class="cmp-slot-card">` +
      `<span class="cmp-slot-icon">+</span>` +
      `<span class="cmp-slot-label">Add county</span>` +
    `</div>`;
  return col;
}

const CMP_MAX = 6;

function _cmpTotal() { return compareCounties.length + compareFacilities.length; }

function addToCompare(fips) {
  if (!fips || compareCounties.includes(fips)) return;
  if (_cmpTotal() >= CMP_MAX) { showMapToast(`Compare is full (max ${CMP_MAX} items)`); return; }
  compareCounties.push(fips);
  renderComparePanel();
  const county = mapData[fips];
  if (county) showMapToast(`Added: ${county.name}`);
}

/* Entry point for pages other than the Map tab (Economy profile panel,
   Jurisdiction hero actions): switch to Map, wait for it to finish
   initializing, open the compare panel if it is not already open, then add.
   Centralized here so every "Add to compare" button off the Map tab shares
   one implementation instead of re-deriving the same wait/open/add sequence. */
function navigateAndAddToCompare(fips) {
  if (window.Router) window.Router.navigate("map", { fips });
  else if (typeof switchTab === "function") switchTab("map");
  const addNow = () => {
    if (!compareMode) toggleComparePanel();
    addToCompare(fips);
  };
  if (mapInitPromise) mapInitPromise.then(addNow);
  else setTimeout(addNow, 350);
}

function addFacilityToCompare(facility) {
  if (!facility) return;
  const id = facility.facility_id || facility.id || facility.name;
  if (compareFacilities.find(f => (f.facility_id || f.id || f.name) === id)) {
    showMapToast("Already in compare");
    return;
  }
  if (_cmpTotal() >= CMP_MAX) { showMapToast(`Compare is full (max ${CMP_MAX} items)`); return; }
  compareFacilities.push(facility);
  if (!compareMode) toggleComparePanel();
  renderComparePanel();
  showMapToast(`Added: ${facility.name || "Facility"}`);
}

function removeFacilityFromCompare(id) {
  const idx = compareFacilities.findIndex(f => (f.facility_id || f.id || f.name) === id);
  if (idx >= 0) compareFacilities.splice(idx, 1);
  renderComparePanel();
}

function removeFromCompare(fips) {
  const idx = compareCounties.indexOf(fips);
  if (idx >= 0) compareCounties.splice(idx, 1);
  renderComparePanel();
}

function clearCompare() {
  compareCounties.length = 0;
  compareFacilities.length = 0;
  renderComparePanel();
}

function exportCompareCsv() {
  if (!compareCounties.length) {
    showMapToast("Add counties to compare before exporting");
    return;
  }
  const padded = fips => String(fips).padStart(5, "0");
  const fields = [
    ["County FIPS",       c => padded(c.fips)],
    ["County",            c => c.county.name || ""],
    ["State",             c => c.county.state || ""],
    ["Restriction Level", c => c.county.level ?? ""],
    ["Severity",          c => c.sev ? c.sev.label : ""],
    ["Suitability Score", c => c.suit ? c.suit.score : ""],
    ["Suitability Grade", c => c.suit ? c.suit.grade : ""],
    ["Policy Types",      c => c.types],
    ["Political Risk",    c => c.polRisk],
    ["Effective Date",    c => c.county.effective_date || c.county.date || ""],
    ["Status",            c => c.county.status || ""],
    ["Notes",             c => c.county.description || ""],
  ];
  const cols = compareCounties.map(fips => {
    const county = mapData[fips] || {};
    const sevKey = getSeverityKey(county);
    const sev    = SEVERITY[sevKey];
    const suit   = computeSuitabilityScore(fips, county);
    const types  = (county.types || []).map(t => TYPE_LABELS[t] || t).join("; ") || "—";
    const polRec = politicalRiskData ? politicalRiskData[fips] : null;
    const polRisk = polRec ? (polRec.score_label || `Risk ${polRec.risk_score}/4`) : "No data";
    return { fips, county, sevKey, sev, suit, types, polRisk };
  });
  const csvCell = v => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const header = fields.map(([h]) => csvCell(h)).join(",");
  const rows   = cols.map(c => fields.map(([, fn]) => csvCell(fn(c))).join(","));
  const csv    = [header, ...rows].join("\r\n");
  const blob   = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href       = url;
  a.download   = `county-comparison-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function generateCompareReport() {
  if (!compareCounties.length) {
    showMapToast("Add counties to compare before creating a report");
    return;
  }

  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // Collect data for each county
  const cols = compareCounties.map(fips => {
    const county  = mapData[fips] || {};
    const sevKey  = getSeverityKey(county);
    const sev     = SEVERITY[sevKey];
    const suit    = computeSuitabilityScore(fips, county);
    const types   = (county.types || []).map(t => TYPE_LABELS[t] || t).join(", ") || "—";
    const polRec  = politicalRiskData ? politicalRiskData[fips] : null;
    const polRisk = polRec ? (polRec.score_label || `Risk ${polRec.risk_score}/5`) : "No data";
    return { fips, county, sevKey, sev, suit, types, polRisk };
  });

  const gradeColor = { A: "#16a34a", B: "#4ade80", C: "#f59e0b", D: "#ef4444", F: "#7f1d1d" };
  const gradeLabel = { A: "Highly Suitable", B: "Suitable", C: "Caution", D: "High Risk", F: "Not Suitable" };

  function esc(s) {
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  // Table header row
  const thCells = cols.map(c =>
    `<th>
      <div class="rpt-th-name">${esc(c.county.name || c.fips)}</div>
      <div class="rpt-th-state">${esc(c.county.state || "")}</div>
      <div class="rpt-sev-badge" style="background:${c.sev.color}22;border:1px solid ${c.sev.color};color:${c.sev.color}">
        ${esc(c.sev.label)}
      </div>
    </th>`
  ).join("");

  // Row builder
  function row(label, cells) {
    return `<tr><td class="rpt-row-label">${esc(label)}</td>${cells}</tr>`;
  }

  const suitRow = row("Suitability Score", cols.map(c =>
    `<td>
      <span class="rpt-grade" style="background:${gradeColor[c.suit.grade]}22;color:${gradeColor[c.suit.grade]};border:1px solid ${gradeColor[c.suit.grade]}">${c.suit.grade}</span>
      <strong>${c.suit.score}/100</strong>
      <div class="rpt-sub">${esc(gradeLabel[c.suit.grade])}</div>
    </td>`
  ).join(""));

  const sevRow = row("Restriction Severity", cols.map(c =>
    `<td><span class="rpt-dot" style="background:${c.sev.color}"></span>${esc(c.sev.label)}</td>`
  ).join(""));

  const statusRow = row("Status", cols.map(c => {
    const s = c.county.status || "active";
    return `<td>${esc(s.charAt(0).toUpperCase() + s.slice(1))}</td>`;
  }).join(""));

  const typesRow = row("Policy Types", cols.map(c => `<td>${esc(c.types)}</td>`).join(""));

  const dateRow = row("Enacted", cols.map(c =>
    `<td>${esc(c.county.effective_date || c.county.date || "—")}</td>`
  ).join(""));

  const polRow = row("Political Risk", cols.map(c => `<td>${esc(c.polRisk)}</td>`).join(""));

  const titleRow = cols.some(c => c.county.title)
    ? row("Policy Title", cols.map(c => `<td>${esc(c.county.title || "—")}</td>`).join(""))
    : "";

  const descRow = cols.some(c => c.county.description)
    ? row("Description", cols.map(c => `<td class="rpt-desc">${esc(c.county.description || "—")}</td>`).join(""))
    : "";

  // Factor breakdown rows
  const factorRows = ["Regulatory Environment", "Political Climate", "Restriction Scope"].map((fname, fi) =>
    row(fname, cols.map(c => {
      const f = c.suit.factors[fi];
      return f ? `<td><strong>${f.pts}/${f.max}</strong><div class="rpt-sub">${esc(f.note)}</div></td>` : "<td>—</td>";
    }).join(""))
  ).join("");

  const colWidth = Math.max(160, Math.floor(720 / cols.length));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>County Comparison Report — ${esc(date)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 13px;
    color: #1a1a2e;
    background: #f8f9fc;
    padding: 32px 24px 64px;
  }
  .rpt-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
    gap: 16px;
  }
  .rpt-brand { font-size: 11px; font-weight: 600; color: #4874e8; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; }
  .rpt-title { font-size: 22px; font-weight: 700; color: #111; line-height: 1.2; }
  .rpt-date  { font-size: 12px; color: #666; margin-top: 4px; }
  .rpt-print-btn {
    flex-shrink: 0;
    padding: 8px 18px;
    background: #4874e8;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }
  .rpt-print-btn:hover { background: #3660c8; }
  .rpt-summary {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  .rpt-kpi {
    background: #fff;
    border: 1px solid #e2e4ea;
    border-radius: 8px;
    padding: 10px 16px;
    min-width: 120px;
  }
  .rpt-kpi-val { font-size: 20px; font-weight: 700; color: #4874e8; }
  .rpt-kpi-lbl { font-size: 11px; color: #666; margin-top: 2px; }
  .rpt-table-wrap { overflow-x: auto; }
  table {
    border-collapse: collapse;
    width: 100%;
    background: #fff;
    border: 1px solid #e2e4ea;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 1px 6px rgba(0,0,0,0.06);
  }
  th, td {
    padding: 10px 14px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid #e2e4ea;
    min-width: ${colWidth}px;
  }
  thead th { background: #f2f4fb; border-bottom: 2px solid #d0d4e8; }
  thead th:first-child { background: #fff; }
  tr:last-child td, tr:last-child th { border-bottom: none; }
  td:first-child { background: #fafbfe; }
  tr:hover td:not(:first-child) { background: #f5f7ff; }
  .rpt-row-label {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #777;
    white-space: nowrap;
    min-width: 130px;
    max-width: 130px;
    width: 130px;
  }
  .rpt-th-name  { font-size: 13px; font-weight: 700; color: #111; }
  .rpt-th-state { font-size: 11px; color: #666; margin-top: 1px; margin-bottom: 6px; }
  .rpt-sev-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 10px;
  }
  .rpt-grade {
    display: inline-block;
    width: 24px;
    height: 24px;
    border-radius: 5px;
    font-size: 13px;
    font-weight: 800;
    text-align: center;
    line-height: 22px;
    margin-right: 6px;
    vertical-align: middle;
  }
  .rpt-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }
  .rpt-sub { font-size: 10.5px; color: #777; margin-top: 3px; }
  .rpt-desc { font-size: 12px; line-height: 1.6; color: #444; max-width: 320px; }
  .rpt-section-sep td, .rpt-section-sep th {
    background: #f2f4fb !important;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #4874e8;
    padding: 6px 14px;
    border-top: 1px solid #d0d4e8;
  }
  .rpt-footer {
    margin-top: 32px;
    font-size: 11px;
    color: #aaa;
    text-align: center;
    border-top: 1px solid #e2e4ea;
    padding-top: 16px;
  }
  @media print {
    body { background: #fff; padding: 16px; }
    .rpt-print-btn { display: none !important; }
    table { box-shadow: none; }
    tr:hover td:not(:first-child) { background: none; }
  }
</style>
</head>
<body>
<div class="rpt-header">
  <div>
    <div class="rpt-brand">US DC &amp; AI Policy Tracker</div>
    <h1 class="rpt-title">County Comparison Report</h1>
    <div class="rpt-date">Generated ${esc(date)} · ${cols.length} counti${cols.length === 1 ? "y" : "es"}</div>
  </div>
  <button class="rpt-print-btn" onclick="window.print()">Print / Save PDF</button>
</div>

<div class="rpt-summary">
  <div class="rpt-kpi"><div class="rpt-kpi-val">${cols.length}</div><div class="rpt-kpi-lbl">Counties</div></div>
  <div class="rpt-kpi"><div class="rpt-kpi-val">${cols.filter(c => c.sevKey === "ban").length}</div><div class="rpt-kpi-lbl">With Bans</div></div>
  <div class="rpt-kpi"><div class="rpt-kpi-val">${cols.filter(c => c.sevKey === "pro" || c.sevKey === "none").length}</div><div class="rpt-kpi-lbl">Unrestricted</div></div>
  <div class="rpt-kpi"><div class="rpt-kpi-val">${Math.round(cols.reduce((s,c) => s + c.suit.score, 0) / cols.length)}</div><div class="rpt-kpi-lbl">Avg. Suitability</div></div>
  <div class="rpt-kpi"><div class="rpt-kpi-val">${cols.sort((a,b)=>b.suit.score-a.suit.score)[0].county.name || "—"}</div><div class="rpt-kpi-lbl">Top Rated County</div></div>
</div>

<div class="rpt-table-wrap">
<table>
  <thead>
    <tr>
      <th style="min-width:130px;width:130px"></th>
      ${thCells}
    </tr>
  </thead>
  <tbody>
    <tr class="rpt-section-sep"><td colspan="${cols.length + 1}">Site Suitability</td></tr>
    ${suitRow}
    ${factorRows}
    <tr class="rpt-section-sep"><td colspan="${cols.length + 1}">Policy &amp; Restrictions</td></tr>
    ${sevRow}
    ${statusRow}
    ${typesRow}
    ${dateRow}
    ${titleRow}
    ${descRow}
    <tr class="rpt-section-sep"><td colspan="${cols.length + 1}">Political Environment</td></tr>
    ${polRow}
  </tbody>
</table>
</div>

<div class="rpt-footer">
  US DC &amp; AI Policy Tracker · bobbytrenkamp-lgtm.github.io/test1 · Data as of ${esc(date)}
</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    showMapToast("Allow popups to open the report");
  }
}

function toggleComparePanel() {
  compareMode = !compareMode;
  const panel = document.getElementById("compare-panel");
  const btn   = document.getElementById("gis-compare");
  const main  = document.getElementById("main");
  if (panel) panel.hidden = !compareMode;
  if (btn)   { btn.classList.toggle("active", compareMode); btn.setAttribute("aria-pressed", String(compareMode)); }
  if (main)  main.classList.toggle("compare-active", compareMode);
  if (compareMode) renderComparePanel();
}

function initBookmarks() {
  document.getElementById("gis-bookmarks")    ?.addEventListener("click", toggleBookmarks);
  document.getElementById("bookmarks-close")  ?.addEventListener("click", toggleBookmarks);
  document.getElementById("bookmark-save-btn")?.addEventListener("click", saveCurrentViewAsBookmark);
  _updateBookmarksBadge();
}
