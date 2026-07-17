/* Zoning Intelligence — details panel renderer
 *
 * Renders all content inside #zoning-panel:
 *   Overview  → DC eligibility banner + district summary
 *   Standards → Dimensional standards table
 *   Uses      → Permitted uses list with search
 *   Overlays  → Applicable overlay districts
 *   Sources   → Official source links
 *
 * Depends on: zoning.js (window.ZONING)
 */

(function () {

  /* ── Tab state ── */
  let _activeTab = "overview";

  const TABS = [
    { id: "overview",   label: "Overview"  },
    { id: "standards",  label: "Standards" },
    { id: "uses",       label: "Uses"      },
    { id: "overlays",   label: "Overlays"  },
    { id: "sources",    label: "Sources"   },
  ];

  /* ── XSS-safe helper ── */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  /* ── Confidence badge ── */
  function confidenceBadge(level) {
    if (!level) return "";
    const map = {
      verified:    "verified",
      high:        "high",
      moderate:    "moderate",
      low:         "low",
      unverified:  "unverified",
      unavailable: "unavailable",
    };
    const cls = map[level] || "unavailable";
    return `<span class="z-confidence z-confidence-${cls}">${esc(level)}</span>`;
  }

  /* ── DC Banner ── */
  function renderDcBanner(dcAnalysis) {
    if (!dcAnalysis) return "";
    const { overall_assessment, base_zoning_status, approval_type, conditions, confidence_level } = dcAnalysis;
    const style = window.ZONING.assessmentStyle(overall_assessment);

    let detail = esc(base_zoning_status?.replace(/_/g, " ") || "Status unknown");
    if (approval_type) detail += ` — ${esc(approval_type.replace(/_/g, " "))}`;
    if (conditions?.length) detail += `<br>${esc(conditions[0])}${conditions.length > 1 ? ` +${conditions.length - 1} more` : ""}`;

    return `<div class="z-dc-banner ${style.cls}">
      <div class="z-dc-banner-icon">${style.icon}</div>
      <div class="z-dc-banner-content">
        <div class="z-dc-banner-status">Data Center: ${esc(style.label)}</div>
        <div class="z-dc-banner-detail">${detail}</div>
        <div style="margin-top:5px;">${confidenceBadge(confidence_level)}</div>
      </div>
    </div>`;
  }

  /* ── Overview tab ── */
  function renderOverview(data, districtCode) {
    const jur = data.jurisdiction || {};
    const disclaimer = `<div class="z-disclaimer">${esc(data.disclaimer || "")}</div>`;

    if (!districtCode) {
      /* District browser */
      const districts = data.districts || {};
      const items = Object.entries(districts).map(([code, d]) => {
        const dc = d.dc_analysis;
        const style = dc ? window.ZONING.assessmentStyle(dc.overall_assessment) : null;
        const dcDot = style
          ? `<span class="z-dc-dot z-dc-dot-${dc.overall_assessment}" style="
              display:inline-block;width:7px;height:7px;border-radius:50%;flex-shrink:0;
              background:${dc.overall_assessment==='potentially_eligible'?'#22c55e':dc.overall_assessment==='not_eligible'?'#dc2626':'#8b8fa8'}
            "></span>`
          : "";
        return `<li class="z-district-item" data-code="${esc(code)}" tabindex="0" role="button"
                    aria-label="View ${esc(d.district_name||code)} zoning details">
          <span class="z-district-item-code">${esc(code)}</span>
          <span class="z-district-item-info">
            <div class="z-district-item-name">${esc(d.district_name || code)}</div>
            <div class="z-district-item-category">${esc((d.district_category||"").replace(/_/g," "))}</div>
          </span>
          ${dcDot}
        </li>`;
      }).join("");
      return disclaimer + `
        <div class="z-tab-content active" id="z-content-overview">
          <div class="z-section">
            <div class="z-section-label">Zoning Districts — ${esc(jur.jurisdiction_name||"")}</div>
            <ul class="z-district-list">${items}</ul>
          </div>
          <div class="z-manual-review-notice">
            <strong>Select a district</strong> above or click a polygon on the map to view standards and permitted uses.
          </div>
        </div>`;
    }

    /* Single district overview */
    const district = data.districts?.[districtCode];
    if (!district) return disclaimer + `<div class="z-empty"><p>District not found: ${esc(districtCode)}</p></div>`;

    const dc = district.dc_analysis;
    const overlays = dc?.applicable_overlays || [];
    const overlayNote = overlays.length
      ? `<div class="z-section"><div class="z-section-label">Applicable Overlays</div>${
          overlays.map(o => `<div class="z-overlay-item">
            <div class="z-overlay-name">${esc(o.overlay_name||o.overlay_code)}</div>
            <div class="z-overlay-affects" style="font-size:10px;color:var(--text-muted);">${esc(o.note||"")}</div>
          </div>`).join("")
        }</div>`
      : "";

    const eligSummary = district.dc_eligibility_summary
      ? `<div class="z-section"><div class="z-section-label">Summary</div>
           <div style="font-size:12px;line-height:1.55;color:var(--text-muted);">${esc(district.dc_eligibility_summary)}</div>
         </div>`
      : "";

    return disclaimer + `
      <div class="z-tab-content active" id="z-content-overview">
        ${renderDcBanner(dc)}
        ${eligSummary}
        <div class="z-section">
          <div class="z-section-label">District Information</div>
          <table class="z-standards-table">
            <tr><td class="z-std-name">Category</td>
                <td class="z-std-value">${esc((district.district_category||"—").replace(/_/g," "))}</td></tr>
            <tr><td class="z-std-name">Type</td>
                <td class="z-std-value">${esc(district.base_or_overlay||"—")}</td></tr>
            <tr><td class="z-std-name">Confidence</td>
                <td class="z-std-value">${confidenceBadge(district.confidence_level)}</td></tr>
          </table>
        </div>
        ${overlayNote}
      </div>`;
  }

  /* ── Standards tab ── */
  function renderStandards(data, districtCode) {
    if (!districtCode) {
      return `<div class="z-tab-content" id="z-content-standards">
        <div class="z-empty"><p>Select a district to view dimensional standards.</p></div>
      </div>`;
    }

    const district = data.districts?.[districtCode];
    const standards = district?.standards || {};
    const condRules = district?.conditional_rules || [];
    const keys = Object.keys(standards);

    if (!keys.length && !condRules.length) {
      return `<div class="z-tab-content" id="z-content-standards">
        <div class="z-empty"><p>No dimensional standards on file for ${esc(districtCode)}.</p></div>
      </div>`;
    }

    const rows = keys.map(k => {
      const v = standards[k];
      const { text, unit, unverified } = window.ZONING.formatValue(v);
      const conds = v?.conditions?.length
        ? `<div class="z-std-conditions">${esc(v.conditions.join("; "))}</div>`
        : "";
      const unverNote = unverified
        ? `<div class="z-std-unverified">⚠ Unverified — confirm with jurisdiction</div>` : "";
      const label = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      return `<tr>
        <td class="z-std-name">${esc(label)}</td>
        <td><span class="z-std-value">${esc(text)}</span><span class="z-std-unit">${esc(unit)}</span>
            ${conds}${unverNote}
        </td>
      </tr>`;
    }).join("");

    const condSection = condRules.length
      ? `<div class="z-section" style="margin-top:14px;">
          <div class="z-section-label">Conditional Rules</div>
          ${condRules.map(r => `<div class="z-overlay-item">
            <div class="z-overlay-name" style="font-size:11px;">${esc(r.original_text||r.rule_type||"")}</div>
            ${r.manual_review_required ? `<div class="z-std-unverified" style="margin-top:4px;">⚠ Manual review required</div>` : ""}
          </div>`).join("")}
        </div>`
      : "";

    const stdConf = district?.standards_confidence;
    return `<div class="z-tab-content" id="z-content-standards">
      <div class="z-section">
        <div class="z-section-label" style="display:flex;align-items:center;gap:8px;">
          Standards ${confidenceBadge(stdConf)}
        </div>
        <div class="z-manual-review-notice" style="margin-bottom:10px;">
          ⚠ All values require verification with the official zoning ordinance before use.
        </div>
        <table class="z-standards-table">
          <thead><tr>
            <th>Standard</th><th>Value</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${condSection}
    </div>`;
  }

  /* ── Uses tab ── */
  function renderUses(data, districtCode) {
    const allDistricts = data.districts || {};
    let uses;

    if (districtCode) {
      uses = allDistricts[districtCode]?.uses || [];
    } else {
      /* Aggregate all uses, sorted so data_center comes first */
      uses = Object.values(allDistricts).flatMap(d => d.uses || []);
      uses.sort((a, b) => {
        if (a.standardized_use_id === "data_center") return -1;
        if (b.standardized_use_id === "data_center") return 1;
        return 0;
      });
    }

    const searchId = "z-use-search";

    function itemHtml(u) {
      const pill = window.ZONING.permissionPill(u.permission_status);
      const distLabel = !districtCode
        ? `<span style="font-family:monospace;font-size:10px;color:var(--accent);margin-right:4px;">${esc(u.district_code)}</span>` : "";
      const official = u.official_use_name
        ? `<div class="z-use-official">${esc(u.official_use_name)}</div>` : "";
      const conf = confidenceBadge(u.confidence_level);
      return `<li class="z-use-item">
        <span class="z-use-status-pill ${pill.cls}">${pill.label}</span>
        <span class="z-use-name">${distLabel}${esc((u.standardized_use_id||"").replace(/_/g," "))}${official}</span>
        ${conf}
      </li>`;
    }

    const list = uses.length
      ? `<ul class="z-use-list">${uses.map(itemHtml).join("")}</ul>`
      : `<div class="z-empty"><p>No permitted use data on file.</p></div>`;

    return `<div class="z-tab-content" id="z-content-uses">
      <div class="z-use-search-wrap">
        <svg class="z-use-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input class="z-use-search" id="${searchId}" type="text" placeholder="Filter uses…" autocomplete="off" aria-label="Filter uses" />
      </div>
      <div id="z-use-list-wrap">${list}</div>
    </div>`;
  }

  /* ── Overlays tab ── */
  function renderOverlays(data) {
    const overlays = data.overlays || {};
    const keys = Object.keys(overlays);
    if (!keys.length) {
      return `<div class="z-tab-content" id="z-content-overlays">
        <div class="z-empty"><p>No overlay districts on file for this jurisdiction.</p></div>
      </div>`;
    }

    const items = keys.map(code => {
      const o = overlays[code];
      const affects = o.what_it_affects?.length
        ? `<ul class="z-overlay-affects">${o.what_it_affects.map(a => `<li>${esc(a)}</li>`).join("")}</ul>`
        : "";
      return `<div class="z-overlay-item">
        <div class="z-overlay-name">${esc(o.overlay_name||code)}</div>
        <div style="margin:4px 0;">${confidenceBadge(o.confidence_level)}</div>
        ${affects}
        ${o.note ? `<div class="z-overlay-affects" style="margin-top:4px;">${esc(o.note)}</div>` : ""}
      </div>`;
    }).join("");

    return `<div class="z-tab-content" id="z-content-overlays">
      <div class="z-section">
        <div class="z-section-label">Overlay Districts</div>
        <div class="z-manual-review-notice">
          Overlay boundaries require GIS verification — overlays may or may not apply to a specific parcel.
        </div>
        ${items}
      </div>
    </div>`;
  }

  /* ── Sources tab ── */
  function renderSources(data) {
    const jur = data.jurisdiction || {};
    const vs = data.validation_summary || {};

    function row(label, url, note) {
      if (!url) return "";
      return `<div class="z-source-row">
        <div class="z-section-label" style="margin:0 0 2px;">${esc(label)}</div>
        <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="z-source-link">${esc(url)}</a>
        ${note ? `<div class="z-source-note">${esc(note)}</div>` : ""}
      </div>`;
    }

    const exportedAt = data.exported_at
      ? `<div class="z-source-row"><div class="z-section-label" style="margin:0 0 2px;">Data Last Updated</div>
         <div style="font-size:12px;color:var(--text-muted);">${esc(data.exported_at.slice(0,10))}</div></div>`
      : "";

    const warnings = vs.warnings?.length
      ? `<div class="z-section"><div class="z-section-label">Validation Warnings</div>
          ${vs.warnings.map(w => `<div class="z-std-unverified" style="margin:4px 0;">⚠ ${esc(w.message||w)}</div>`).join("")}
        </div>`
      : "";

    const required = vs.required_actions?.length
      ? `<div class="z-section"><div class="z-section-label">Required Actions</div>
          ${vs.required_actions.map(a => `<div style="font-size:11px;color:var(--text-muted);margin:3px 0;">• ${esc(a)}</div>`).join("")}
        </div>`
      : "";

    return `<div class="z-tab-content" id="z-content-sources">
      <div class="z-section">
        <div class="z-section-label">Official Sources</div>
        ${row("Official Zoning Page", jur.official_zoning_page_url)}
        ${row("GIS Services", jur.gis_service_url)}
        ${row("Open Data Portal", jur.open_data_portal_url)}
        ${row("Planning Department", jur.planning_department_url)}
        ${exportedAt}
      </div>
      ${warnings}
      ${required}
      <div class="z-section">
        <div style="font-size:11px;color:var(--text-muted);line-height:1.5;">
          <strong>Geometry:</strong> ${data.geometry_available ? "GeoJSON polygon data available" : "No polygon geometry on file — district browser shown instead."}
        </div>
      </div>
    </div>`;
  }

  /* ── Render all tabs ── */
  function renderPanel(data, districtCode) {
    const panel = document.getElementById("zoning-panel");
    if (!panel) return;

    const jur = data.jurisdiction || {};
    const district = districtCode ? data.districts?.[districtCode] : null;

    /* Header */
    const headerHtml = `
      <div class="z-header">
        <button class="z-header-close" aria-label="Close zoning panel" title="Close">&times;</button>
        <div class="z-header-title">
          <div class="z-jurisdiction">${esc(jur.jurisdiction_name||"Zoning Intelligence")}</div>
          ${district
            ? `<div class="z-district-name">${esc(district.district_name||districtCode)}</div>`
            : `<div class="z-district-name">District Browser</div>`}
        </div>
        ${districtCode ? `<span class="z-district-code">${esc(districtCode)}</span>` : ""}
      </div>`;

    /* Tabs row */
    const tabsHtml = `<div class="z-tabs" role="tablist">
      ${TABS.map(t => `<button class="z-tab${_activeTab===t.id?" active":""}" data-tab="${t.id}"
        role="tab" aria-selected="${_activeTab===t.id}" aria-controls="z-content-${t.id}">${t.label}</button>`).join("")}
    </div>`;

    /* Tab bodies */
    const bodies = {
      overview:  renderOverview(data, districtCode),
      standards: renderStandards(data, districtCode),
      uses:      renderUses(data, districtCode),
      overlays:  renderOverlays(data),
      sources:   renderSources(data),
    };

    /* Mark active tab visible */
    const bodyHtml = `<div class="z-body">${
      TABS.map(t => {
        const raw = bodies[t.id] || "";
        if (_activeTab === t.id) {
          return raw.replace('class="z-tab-content"', 'class="z-tab-content active"');
        }
        return raw;
      }).join("")
    }</div>`;

    panel.innerHTML = headerHtml + tabsHtml + bodyHtml;
    _bindPanelEvents(panel, data, districtCode);
  }

  function renderLoading() {
    const panel = document.getElementById("zoning-panel");
    if (!panel) return;
    panel.innerHTML = `
      <div class="z-header">
        <button class="z-header-close" aria-label="Close" title="Close">&times;</button>
        <div class="z-header-title"><div class="z-district-name">Zoning Intelligence</div></div>
      </div>
      <div class="z-body">
        <div class="z-loading" aria-live="polite">
          <div class="z-spinner"></div>
          <span>Loading zoning data…</span>
        </div>
      </div>`;
  }

  function renderError(msg) {
    const panel = document.getElementById("zoning-panel");
    if (!panel) return;
    panel.innerHTML = `
      <div class="z-header">
        <button class="z-header-close" aria-label="Close" title="Close">&times;</button>
        <div class="z-header-title"><div class="z-district-name">Zoning Intelligence</div></div>
      </div>
      <div class="z-body"><div class="z-empty"><p>${esc(msg)}</p></div></div>`;
  }

  function renderNoCoverage() {
    const panel = document.getElementById("zoning-panel");
    if (!panel) return;
    panel.innerHTML = `
      <div class="z-header">
        <button class="z-header-close" aria-label="Close" title="Close">&times;</button>
        <div class="z-header-title"><div class="z-district-name">Zoning Intelligence</div></div>
      </div>
      <div class="z-body">
        <div class="z-no-geometry-notice">
          <p><strong>No zoning data available</strong> for this county yet.</p>
          <p>Pilot coverage: Loudoun County, VA (FIPS 51107).<br>
             Additional jurisdictions will be added over time.</p>
        </div>
      </div>`;
  }

  /* ── Event binding ── */

  function _bindPanelEvents(panel, data, currentDistrictCode) {
    /* Tab switching */
    panel.querySelectorAll(".z-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        _activeTab = btn.dataset.tab;
        renderPanel(data, currentDistrictCode);
      });
    });

    /* Use search */
    const searchInput = panel.querySelector(".z-use-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase().trim();
        const items = panel.querySelectorAll("#z-use-list-wrap .z-use-item");
        items.forEach(li => {
          const text = li.textContent.toLowerCase();
          li.style.display = (!q || text.includes(q)) ? "" : "none";
        });
      });
    }

    /* District browser keyboard navigation */
    panel.querySelectorAll(".z-district-item[data-code]").forEach(item => {
      item.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.ZONING?.selectDistrict(item.dataset.code);
        }
      });
    });
  }

  /* ── Event listeners ── */

  document.addEventListener("zoning:loading", () => {
    renderLoading();
  });

  document.addEventListener("zoning:jurisdiction-loaded", e => {
    const { data } = e.detail;
    _activeTab = "overview";
    renderPanel(data, null);
  });

  document.addEventListener("zoning:district-selected", e => {
    const { data, districtCode } = e.detail;
    renderPanel(data, districtCode);
  });

  document.addEventListener("zoning:load-error", e => {
    renderError("Failed to load zoning data. " + (e.detail.error || ""));
  });

  document.addEventListener("zoning:no-coverage", () => {
    renderNoCoverage();
  });

  document.addEventListener("zoning:cleared", () => {
    const panel = document.getElementById("zoning-panel");
    if (panel) panel.classList.remove("open");
  });

})();
