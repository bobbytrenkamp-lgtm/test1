/* js/parcel/panel.js
 * Parcel info panel — renders into #parcel-panel when a parcel is selected.
 * Four tabs: Details · Zoning · Valuation · Compare
 *
 * Depends on: PARCEL_SCHEMA, PARCEL_REGISTRY, PARCEL_SELECTION, ZONING (optional)
 */
window.PARCEL_PANEL = (function () {
  'use strict';

  let _activeTab = 'details';
  let _lastFeature = null;
  let _lastJurisId = null;

  /* ── XSS-safe helper ── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmt(fieldId, value) {
    return esc(window.PARCEL_SCHEMA?.format(fieldId, value) ?? (value == null ? '—' : String(value)));
  }

  /* ── Field row ── */
  function _fieldRow(label, value) {
    const v = (value == null || value === '' || value === '—') ? null : value;
    if (!v) return '';
    return `<div class="pp-field">
      <span class="pp-field-label">${esc(label)}</span>
      <span class="pp-field-value">${esc(String(v))}</span>
    </div>`;
  }

  function _fmtFieldRow(fieldId, rawValue) {
    const field = window.PARCEL_SCHEMA?.FIELD_MAP[fieldId];
    if (!field) return '';
    const displayed = window.PARCEL_SCHEMA.format(fieldId, rawValue);
    if (!displayed || displayed === '—') return '';
    return `<div class="pp-field">
      <span class="pp-field-label">${esc(field.label)}</span>
      <span class="pp-field-value">${esc(displayed)}</span>
    </div>`;
  }

  /* ── Tab: Details ── */
  function _tabDetails(props) {
    const schema = window.PARCEL_SCHEMA;
    if (!schema) return '<p class="pp-empty">Schema unavailable.</p>';

    let html = '';
    for (const grp of schema.GROUPS) {
      const fields = schema.FIELDS.filter(f => f.group === grp.id);
      const rows   = fields.map(f => _fmtFieldRow(f.id, props[f.id])).filter(Boolean).join('');
      if (!rows) continue;
      html += `<div class="pp-group">
        <div class="pp-group-label">${esc(grp.label)}</div>
        ${rows}
      </div>`;
    }
    return html || '<p class="pp-empty">No detailed data for this parcel.</p>';
  }

  /* ── Tab: Zoning ── */
  function _tabZoning(props) {
    const code = props.zoning_code;
    const desc = props.zoning_desc;
    const fips = props.county_fips;

    let html = '';

    // DC Feasibility section (shown first when data is available)
    const feasibility = window.PARCEL_FEASIBILITY?.assess(props, fips);
    if (feasibility?.available) {
      html += _renderFeasibility(feasibility, fips, code);
    }

    // Zoning fields
    let zoningFields = '';
    if (code) {
      zoningFields += `<div class="pp-zoning-badge">${esc(code)}${desc ? ` — ${esc(desc)}` : ''}</div>`;
    }
    zoningFields += _fmtFieldRow('land_use_code', props.land_use_code);
    zoningFields += _fmtFieldRow('land_use_desc', props.land_use_desc);
    zoningFields += _fieldRow('Overlay Districts', props.overlay_districts);

    if (zoningFields) {
      html += `<div class="pp-group">${zoningFields}</div>`;
    }

    // Zoning intelligence link / status
    if (fips && window.ZONING?.hasCoverage(fips) && code) {
      html += `<div class="pp-zoning-link-row">
        <button class="pp-zoning-btn" onclick="window.PARCEL_PANEL._openZoning(${JSON.stringify(fips)}, ${JSON.stringify(code)})">
          View Full Zoning Intelligence →
        </button>
      </div>`;
    } else if (fips && !feasibility?.available && window.ZONING?.hasCoverage(fips) && !window.ZONING?.getCachedByFips?.(fips)) {
      html += `<div class="pp-zoning-link-row">
        <button class="pp-zoning-btn" onclick="window.PARCEL_PANEL._loadAndRefresh(${JSON.stringify(fips)}, ${JSON.stringify(code)})">
          Load Zoning Data for Feasibility →
        </button>
      </div>`;
    } else if (fips && !window.ZONING?.hasCoverage(fips)) {
      html += `<p class="pp-empty pp-muted">Zoning intelligence not available for this jurisdiction.</p>`;
    }

    if (!html) return '<p class="pp-empty">Zoning data not available for this parcel.</p>';
    return html;
  }

  /* ── Feasibility section renderer ── */
  function _renderFeasibility(f, fips, zoningCode) {
    const sm = f.statusMeta;

    // Score band label
    const scoreBand = f.score >= 75 ? 'High' : f.score >= 50 ? 'Moderate' : f.score >= 25 ? 'Low' : 'Very Low';
    const scoreCls  = f.score >= 75 ? 'pf-score-high' : f.score >= 50 ? 'pf-score-mod' : 'pf-score-low';

    // Eligibility badge
    let out = `<div class="pp-group pp-feasibility">
      <div class="pp-group-label">DC Development Feasibility</div>
      <div class="pf-eligibility ${esc(sm.cls)}">
        <span class="pf-eligibility-icon">${esc(sm.icon)}</span>
        <span class="pf-eligibility-label">${esc(sm.label)}</span>
        ${f.confidence === 'moderate' ? '<span class="pf-conf pf-conf-mod">Moderate confidence</span>'
          : '<span class="pf-conf pf-conf-low">Low confidence — verify</span>'}
      </div>`;

    // Score gauge
    out += `<div class="pf-score-row">
      <div class="pf-score-label">Development Potential</div>
      <div class="pf-score-bar-wrap">
        <div class="pf-score-bar ${esc(scoreCls)}" style="width:${f.score}%"></div>
      </div>
      <div class="pf-score-value ${esc(scoreCls)}">${f.score}<span class="pf-score-band"> — ${esc(scoreBand)}</span></div>
    </div>`;

    // Score factors breakdown
    out += `<div class="pf-factors">`;
    for (const factor of f.factors) {
      const fw = Math.round(factor.score * factor.weight);
      const fcls = factor.score >= 70 ? 'pf-factor-hi' : factor.score >= 40 ? 'pf-factor-mid' : 'pf-factor-lo';
      out += `<div class="pf-factor">
        <span class="pf-factor-label">${esc(factor.label)}</span>
        <span class="pf-factor-score ${esc(fcls)}">${factor.score}</span>
      </div>`;
    }
    out += `</div>`;

    // Buildable envelope
    if (f.envelope) {
      const e = f.envelope;
      out += `<div class="pf-envelope">
        <div class="pf-envelope-title">Buildable Envelope (est.)</div>
        <div class="pf-envelope-grid">`;

      if (e.footprintSqft != null) {
        out += `<div class="pf-env-stat">
          <div class="pf-env-val">${Number(e.footprintAcres).toFixed(2)} ac</div>
          <div class="pf-env-lbl">Max Footprint</div>
        </div>`;
      }
      if (e.maxCoverage_pct != null) {
        out += `<div class="pf-env-stat">
          <div class="pf-env-val">${e.maxCoverage_pct}%</div>
          <div class="pf-env-lbl">Lot Coverage</div>
        </div>`;
      }
      if (e.maxHeight_ft != null) {
        out += `<div class="pf-env-stat">
          <div class="pf-env-val">${e.maxHeight_ft} ft</div>
          <div class="pf-env-lbl">Max Height</div>
        </div>`;
      }
      if (e.estimatedGFA_sqft != null) {
        out += `<div class="pf-env-stat">
          <div class="pf-env-val">${(e.estimatedGFA_sqft / 1000).toFixed(0)}k sqft</div>
          <div class="pf-env-lbl">Est. GFA</div>
        </div>`;
      }
      out += `</div>`;

      // Setbacks summary line
      const sb = e.setbacks;
      if (sb.front != null || sb.side != null || sb.rear != null) {
        const parts = [];
        if (sb.front != null) parts.push(`Front: ${sb.front} ft`);
        if (sb.side  != null) parts.push(`Side: ${sb.side} ft`);
        if (sb.rear  != null) parts.push(`Rear: ${sb.rear} ft`);
        out += `<div class="pf-setbacks">Setbacks: ${esc(parts.join(' · '))}</div>`;
      }
      out += `</div>`;
    }

    // Approval requirements
    if (f.approvalType) {
      out += `<div class="pf-approval"><strong>Approval:</strong> ${esc(f.approvalType)}</div>`;
    }

    // Conditions (collapsible if more than 1)
    if (f.conditions?.length) {
      out += `<details class="pf-conditions">
        <summary>Requirements (${f.conditions.length})</summary>
        <ul class="pf-conditions-list">
          ${f.conditions.map(c => `<li>${esc(c)}</li>`).join('')}
        </ul>
      </details>`;
    }

    // District DC summary
    if (f.dcSummary) {
      out += `<p class="pf-dc-summary">${esc(f.dcSummary)}</p>`;
    }

    // Manual review notice
    if (f.manualReviewRequired) {
      out += `<p class="pf-disclaimer">⚠ Low confidence estimates. Verify all zoning requirements with ${esc(f.jurisdictionName || 'the jurisdiction')} before relying on this data.</p>`;
    }

    out += `</div>`;
    return out;
  }

  /* ── Tab: Valuation ── */
  function _tabValuation(props) {
    const rows = [
      _fmtFieldRow('assessed_value',    props.assessed_value),
      _fmtFieldRow('land_value',        props.land_value),
      _fmtFieldRow('improvement_value', props.improvement_value),
      _fmtFieldRow('tax_year',          props.tax_year),
      _fmtFieldRow('tax_amount',        props.tax_amount),
      _fmtFieldRow('last_sale_date',    props.last_sale_date),
      _fmtFieldRow('last_sale_price',   props.last_sale_price),
      _fmtFieldRow('deed_book',         props.deed_book),
      _fmtFieldRow('deed_page',         props.deed_page),
    ].filter(Boolean).join('');

    if (!rows) return '<p class="pp-empty">Valuation data not available for this parcel.</p>';
    return `<div class="pp-group">${rows}</div>`;
  }

  /* ── Tab: Compare ── */
  function _tabCompare() {
    const compared = window.PARCEL_SELECTION?.getCompared() || [];

    // Suggest comparables when tray is empty but a parcel is selected
    if (!compared.length) {
      const sel = window.PARCEL_SELECTION?.getSelected();
      if (sel) {
        const suggestions = window.PARCEL_COMPARABLES?.find(sel.feature, { maxResults: 4 }) || [];
        if (suggestions.length) {
          return _renderCompareSuggestions(sel.feature, suggestions);
        }
      }
      return `<div class="pp-compare-empty">
        <p>No parcels in the compare tray.</p>
        <p class="pp-muted">Click "+ Compare" to add the current parcel, then select others to add them too.</p>
      </div>`;
    }

    const compareFields = [
      'address', 'zoning_code', 'area_acres', 'land_use_desc', 'assessed_value', 'last_sale_price',
    ];
    const schema = window.PARCEL_SCHEMA;

    const headers = compared.map(c =>
      esc(c.feature.properties.address || c.feature.properties.pin || 'Parcel')
    );

    let rows = '';
    for (const fid of compareFields) {
      const field = schema?.FIELD_MAP[fid];
      if (!field) continue;
      const cells = compared.map(c =>
        `<td>${fmt(fid, c.feature.properties[fid])}</td>`
      ).join('');
      rows += `<tr><th>${esc(field.label)}</th>${cells}</tr>`;
    }

    // Remove buttons per parcel
    const removeBtns = compared.map(c =>
      `<td><button class="pp-compare-remove" onclick="window.PARCEL_SELECTION.removeFromCompare(${JSON.stringify(c.feature.properties.parcel_id)});window.PARCEL_PANEL.refresh();" aria-label="Remove">✕</button></td>`
    ).join('');

    return `<div class="pp-compare-wrap">
      <div class="pp-compare-table-scroll">
        <table class="pp-compare-table">
          <thead><tr><th></th>${headers.map(h => `<th class="pp-compare-th">${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows}
            <tr><th>Remove</th>${removeBtns}</tr>
          </tbody>
        </table>
      </div>
      <div class="pp-compare-actions">
        <button class="pp-compare-export" onclick="window.PARCEL_PANEL._exportCSV()">⬇ Export CSV</button>
        <button class="pp-compare-clear" onclick="window.PARCEL_SELECTION.clearCompare();window.PARCEL_PANEL.refresh();">Clear all</button>
      </div>
    </div>`;
  }

  function _renderCompareSuggestions(subject, suggestions) {
    const sp = subject.properties || {};
    const subLabel = esc(sp.address || sp.pin || 'Selected Parcel');

    let html = `<div class="pp-compare-empty">
      <p>No parcels in the compare tray.</p>
      <p class="pp-muted">Similar parcels found nearby:</p>
    </div>
    <div class="pp-suggest-list">`;

    for (const { feature, score } of suggestions) {
      const p = feature.properties || {};
      const label = p.address || p.pin || 'Parcel';
      const sub = [
        p.zoning_code || null,
        p.area_acres ? `${Number(p.area_acres).toFixed(2)} ac` : null,
        p.assessed_value ? ('$' + Number(p.assessed_value).toLocaleString()) : null,
      ].filter(Boolean).join(' · ');

      const scoreCls = score >= 70 ? 'pf-factor-hi' : score >= 45 ? 'pf-factor-mid' : 'pf-factor-lo';

      html += `<div class="pp-suggest-item" onclick="window.PARCEL?.focusParcel(${JSON.stringify(feature)})">
        <div class="pp-suggest-main">
          <span class="pp-suggest-label">${esc(label)}</span>
          <span class="pp-suggest-score ${esc(scoreCls)}">${score}% match</span>
        </div>
        ${sub ? `<div class="pp-suggest-sub">${esc(sub)}</div>` : ''}
        <button class="pp-suggest-add" onclick="event.stopPropagation();window.PARCEL_SELECTION?.addToCompare(${JSON.stringify(feature)});window.PARCEL_PANEL.refresh();">+ Compare</button>
      </div>`;
    }

    html += `</div>`;
    return html;
  }

  /* ── Attribution footer ── */
  function _attribution(jurisId) {
    const config = window.PARCEL_REGISTRY?.all().find(j => j.id === jurisId);
    if (!config?.attribution) return '';
    const a = config.attribution;
    return `<div class="pp-attribution">
      Source: <a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a>
      ${a.license ? `<span class="pp-attr-license"> · ${esc(a.license)}</span>` : ''}
    </div>`;
  }

  /* ── Panel open/close ── */
  function _getPanel() {
    return document.getElementById('parcel-panel');
  }

  function _open() {
    const p = _getPanel();
    if (!p) return;
    p.classList.add('open');
    p.setAttribute('aria-hidden', 'false');
  }

  function _close() {
    const p = _getPanel();
    if (!p) return;
    p.classList.remove('open');
    p.setAttribute('aria-hidden', 'true');
  }

  /* ── Main render ── */
  function show(feature, jurisdictionId) {
    _lastFeature = feature;
    _lastJurisId = jurisdictionId;

    const panel = _getPanel();
    if (!panel) return;

    _open();

    const props   = feature.properties || {};
    const address = props.address || props.pin || props.parcel_id || 'Parcel';
    const owner   = props.owner || '';
    const compared = window.PARCEL_SELECTION?.getCompared() || [];

    const tabs = [
      { id: 'details',   label: 'Details'   },
      { id: 'zoning',    label: 'Zoning'    },
      { id: 'valuation', label: 'Valuation' },
      { id: 'compare',   label: `Compare${compared.length ? ` (${compared.length})` : ''}` },
    ];

    const tabContent = (() => {
      switch (_activeTab) {
        case 'zoning':    return _tabZoning(props);
        case 'valuation': return _tabValuation(props);
        case 'compare':   return _tabCompare();
        default:          return _tabDetails(props);
      }
    })();

    panel.innerHTML = `
      <div class="pp-header">
        <button class="pp-close" onclick="window.PARCEL_PANEL.close()" aria-label="Close parcel panel">✕</button>
        <div class="pp-address">${esc(address)}</div>
        ${owner ? `<div class="pp-owner">${esc(owner)}</div>` : ''}
        ${props.pin ? `<div class="pp-pin">PIN: ${esc(props.pin)}</div>` : ''}
      </div>

      <div class="pp-tab-row" role="tablist">
        ${tabs.map(t => `
          <button class="pp-tab${_activeTab === t.id ? ' active' : ''}"
            role="tab" aria-selected="${_activeTab === t.id}"
            data-ptab="${esc(t.id)}">${esc(t.label)}</button>
        `).join('')}
      </div>

      <div class="pp-body" id="pp-body-content">
        ${tabContent}
      </div>

      ${_attribution(jurisdictionId)}

      <div class="pp-actions">
        <button class="pp-action-primary" onclick="window.PARCEL_PANEL._addToCompare()">+ Compare</button>
        <button class="pp-action-draw" onclick="window.PARCEL_DRAW_TOOL?.activate()" title="Draw polygon to select multiple parcels">◻ Draw</button>
        <button class="pp-action-report" onclick="window.PARCEL_PANEL._openReport()" title="Open printable parcel report">⎙ Report</button>
        <button class="pp-action-secondary" onclick="window.PARCEL_PANEL.close()">Close</button>
      </div>
    `;

    // Wire tab buttons (no inline onclick to avoid CSP issues with nonces)
    panel.querySelectorAll('[data-ptab]').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeTab = btn.dataset.ptab;
        show(feature, jurisdictionId);
      });
    });
  }

  function refresh() {
    if (_lastFeature) show(_lastFeature, _lastJurisId);
  }

  function close() {
    _close();
    _lastFeature = null;
    _lastJurisId = null;
    window.PARCEL_SELECTION?.deselect();
    window.PARCEL_RENDERER?.clearHighlight();
  }

  /* ── Actions ── */

  function _addToCompare() {
    const sel = window.PARCEL_SELECTION?.getSelected();
    if (!sel) return;
    const added = window.PARCEL_SELECTION.addToCompare(sel.feature, sel.jurisdictionId);
    if (!added) {
      const max = window.PARCEL_SELECTION.MAX_COMPARE;
      typeof window.showMapToast === 'function'
        ? window.showMapToast(`Compare tray is full (max ${max} parcels)`)
        : alert(`Compare tray is full (max ${max} parcels)`);
    } else {
      window.PARCEL_RENDERER?.onCompareChanged();
      refresh();
    }
  }

  function _openZoning(fips, zoningCode) {
    if (fips && window.ZONING?.handleCountySelect) {
      window.ZONING.handleCountySelect(fips);
      if (zoningCode) {
        setTimeout(() => window.ZONING?.selectDistrict?.(zoningCode), 600);
      }
    }
  }

  function _openReport() {
    if (_lastFeature) {
      window.PARCEL_REPORT?.open(_lastFeature, _lastJurisId);
    }
  }

  function _exportCSV() {
    const compared = window.PARCEL_SELECTION?.getCompared() || [];
    if (!compared.length) return;

    const fields = [
      'parcel_id', 'pin', 'address', 'owner',
      'zoning_code', 'land_use_code', 'land_use_desc',
      'area_sqft', 'area_acres',
      'assessed_value', 'land_value', 'improvement_value',
      'tax_year', 'last_sale_date', 'last_sale_price',
      'county_fips',
    ];

    const schema = window.PARCEL_SCHEMA;
    const header = fields.map(fid => {
      const field = schema?.FIELD_MAP[fid];
      return field ? field.label : fid;
    });

    const rows = compared.map(c => {
      const p = c.feature.properties || {};
      return fields.map(fid => {
        const v = p[fid];
        if (v == null || v === '') return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',');
    });

    const csv  = [header.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `parcel-compare-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  async function _loadAndRefresh(fips, zoningCode) {
    if (!fips) return;
    try {
      await window.ZONING?.loadByFips(fips);
    } catch (_) {}
    refresh();
  }

  /* ── Event listeners ── */

  document.addEventListener('parcel:selected', e => {
    if (e.detail?.feature) {
      show(e.detail.feature, e.detail.jurisdictionId);
    } else {
      _close();
    }
  });

  document.addEventListener('parcel:deselected', () => {
    _close();
  });

  document.addEventListener('parcel:compare-updated', () => {
    window.PARCEL_RENDERER?.onCompareChanged();
    if (_lastFeature && _activeTab === 'compare') refresh();
    // Update the compare tab label badge
    const compareTab = document.querySelector('[data-ptab="compare"]');
    if (compareTab) {
      const count = window.PARCEL_SELECTION?.getCompared().length || 0;
      compareTab.textContent = count > 0 ? `Compare (${count})` : 'Compare';
      if (_activeTab === 'compare') compareTab.classList.add('active');
    }
  });

  return { show, refresh, close, _addToCompare, _openZoning, _loadAndRefresh, _exportCSV, _openReport };
})();
