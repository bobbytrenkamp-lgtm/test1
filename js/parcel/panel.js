/* js/parcel/panel.js
 * Parcel info panel — renders into #parcel-panel when a parcel is selected.
 * Five tabs: Details · Zoning · Valuation · Intelligence · Compare
 *
 * Depends on: PARCEL_SCHEMA, PARCEL_REGISTRY, PARCEL_SELECTION, ZONING (optional),
 *   ZONING_GEOMETRY (optional -- parcel-to-zoning spatial join for
 *   jurisdictions whose parcel source publishes no native zoning_code),
 *   PARCEL_SUITABILITY, PARCEL_SALES, PARCEL_PROXIMITY, PARCEL_CONSTRAINTS,
 *   PARCEL_FEASIBILITY (all optional -- the Intelligence tab degrades per
 *   missing module the same way it degrades per missing data)
 */
window.PARCEL_PANEL = (function () {
  'use strict';

  let _activeTab = 'details';
  let _lastFeature = null;
  let _lastJurisId = null;

  /* Proximity/constraint analysis is a live network query per parcel, so it
     is fetched once per parcel_id and cached here rather than re-run on
     every tab click or panel refresh. A placeholder ({}) is stored the
     moment the fetch starts so a second call for the same parcel (e.g. the
     user flips tabs and back before the fetch resolves) does not fire a
     second, redundant round of queries. */
  const _intelCache = new Map();

  function _parcelKey(props) {
    return props.parcel_id || props.pin || null;
  }

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

  function _fmtFieldRow(fieldId, rawValue, fips) {
    const field = window.PARCEL_SCHEMA?.FIELD_MAP[fieldId];
    if (!field) return '';
    const displayed = window.PARCEL_SCHEMA.format(fieldId, rawValue);
    if (displayed && displayed !== '—') {
      return `<div class="pp-field">
        <span class="pp-field-label">${esc(field.label)}</span>
        <span class="pp-field-value">${esc(displayed)}</span>
      </div>`;
    }
    // Distinguish "this source never publishes this field" (registry.js's
    // notProvidedBySource — real, documented gap) from "this source has the
    // field but it's empty for this parcel" (silently omitted, as before).
    // Conflating the two reads as a rendering bug to anyone looking at the
    // panel; only the former gets an explicit row.
    const notProvided = fips && window.PARCEL_REGISTRY?.get(fips)?.notProvidedBySource;
    if (notProvided && notProvided.includes(fieldId)) {
      return `<div class="pp-field">
        <span class="pp-field-label">${esc(field.label)}</span>
        <span class="pp-field-value pp-field-na">Not published by this source</span>
      </div>`;
    }
    return '';
  }

  /* ── Tab: Details ── */
  function _tabDetails(props) {
    const schema = window.PARCEL_SCHEMA;
    if (!schema) return '<p class="pp-empty">Schema unavailable.</p>';

    let html = '';
    for (const grp of schema.GROUPS) {
      const fields = schema.FIELDS.filter(f => f.group === grp.id);
      const rows   = fields.map(f => _fmtFieldRow(f.id, props[f.id], props.county_fips)).filter(Boolean).join('');
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
    } else if (feasibility?.zoningCodeSource === 'parcel_boundary_spatial_join' && feasibility.zoningCode) {
      // Honest partial result: the county's own parcel service doesn't
      // publish zoning_code, but a real district was resolved via the
      // spatial (point-in-polygon) join against the county's zoning map --
      // it just hasn't been researched for data-center eligibility yet.
      // Never rendered as "not eligible" or left silent.
      html += `<div class="pp-group pp-feasibility">
        <div class="pp-group-label">DC Development Feasibility</div>
        <div class="pf-eligibility pf-unknown">
          <span class="pf-eligibility-icon">?</span>
          <span class="pf-eligibility-label">District Resolved — Classification Pending</span>
        </div>
        <p class="pp-muted">${esc(feasibility.reason)}</p>
      </div>`;
    }

    // Zoning fields
    let zoningFields = '';
    if (code) {
      zoningFields += `<div class="pp-zoning-badge">${esc(code)}${desc ? ` — ${esc(desc)}` : ''}</div>`;
    } else if (feasibility?.zoningCodeSource === 'parcel_boundary_spatial_join' && feasibility.zoningCode) {
      zoningFields += `<div class="pp-zoning-badge">${esc(feasibility.zoningCode)}${feasibility.zoningName ? ` — ${esc(feasibility.zoningName)}` : ''}
        <span class="pp-muted"> (resolved from county zoning map, not published by parcel source)</span></div>`;
    } else if (window.PARCEL_REGISTRY?.get(fips)?.notProvidedBySource?.includes('zoning_code')) {
      zoningFields += `<div class="pp-muted pp-field-na">Zoning code not published by this source</div>`;
    }
    zoningFields += _fmtFieldRow('land_use_code', props.land_use_code, fips);
    zoningFields += _fmtFieldRow('land_use_desc', props.land_use_desc, fips);
    zoningFields += _fieldRow('Overlay Districts', props.overlay_districts);

    if (zoningFields) {
      html += `<div class="pp-group">${zoningFields}</div>`;
    }

    // Zoning intelligence link / status
    const resolvedCode = code || (feasibility?.zoningCodeSource === 'parcel_boundary_spatial_join' ? feasibility.zoningCode : null);
    if (fips && window.ZONING?.hasCoverage(fips) && resolvedCode) {
      html += `<div class="pp-zoning-link-row">
        <button class="pp-zoning-btn" onclick="window.PARCEL_PANEL._openZoning(${JSON.stringify(fips)}, ${JSON.stringify(resolvedCode)})">
          View Full Zoning Intelligence →
        </button>
      </div>`;
    } else if (fips && !code && !resolvedCode && props._geometry &&
               window.ZONING_GEOMETRY?.hasCoverage(fips) && !window.ZONING_GEOMETRY?.isCached(fips)) {
      // Parcel source has no zoning_code, but county zoning-district
      // geometry exists and just hasn't been fetched into cache yet.
      html += `<div class="pp-zoning-link-row">
        <button class="pp-zoning-btn" onclick="window.PARCEL_PANEL._loadZoningGeometryAndRefresh(${JSON.stringify(fips)})">
          Resolve Zoning from County Map →
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

    // Score factors breakdown — transparent per-factor weights
    out += `<div class="pf-factors">`;
    for (const factor of f.factors) {
      const fcls    = factor.score >= 70 ? 'pf-factor-hi' : factor.score >= 40 ? 'pf-factor-mid' : 'pf-factor-lo';
      const wPct    = Math.round((factor.weight || 0) * 100);
      const barFill = factor.score;
      out += `<div class="pf-factor">
        <div class="pf-factor-header">
          <span class="pf-factor-label">${esc(factor.label)}</span>
          <span class="pf-factor-weight">${wPct}%</span>
          <span class="pf-factor-score ${esc(fcls)}">${factor.score}</span>
        </div>
        <div class="pf-factor-bar-bg"><div class="pf-factor-bar-fill ${esc(fcls)}" style="width:${barFill}%"></div></div>
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

      // 3-D massing diagram (rendered after DOM insertion via MutationObserver hook)
      out += `<div class="pf-massing" data-massing-envelope='${JSON.stringify({
        footprintSqft:  e.footprintSqft,
        footprintAcres: e.footprintAcres,
        maxHeight_ft:   e.maxHeight_ft,
        estimatedGFA_sqft: e.estimatedGFA_sqft,
        lotCoveragePct: e.maxCoverage_pct,
        setbacks:       e.setbacks,
      })}'></div>`;

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
    const fips = props.county_fips;
    const rows = [
      _fmtFieldRow('assessed_value',    props.assessed_value,    fips),
      _fmtFieldRow('land_value',        props.land_value,        fips),
      _fmtFieldRow('improvement_value', props.improvement_value, fips),
      _fmtFieldRow('tax_year',          props.tax_year,          fips),
      _fmtFieldRow('tax_amount',        props.tax_amount,        fips),
      _fmtFieldRow('last_sale_date',    props.last_sale_date,    fips),
      _fmtFieldRow('last_sale_price',   props.last_sale_price,   fips),
      _fmtFieldRow('deed_book',         props.deed_book,         fips),
      _fmtFieldRow('deed_page',         props.deed_page,         fips),
    ].filter(Boolean).join('');

    if (!rows) return '<p class="pp-empty">Valuation data not available for this parcel.</p>';
    return `<div class="pp-group">${rows}</div>`;
  }

  /* ── Tab: Intelligence (suitability score, proximity, constraints, sales) ──
   * Surfaces the analysis engines (proximity.js, constraints.js,
   * suitability.js, sales.js) that were already built and tested but had no
   * UI consumer before this tab existed -- each renders synchronously from
   * whatever is available and never invents a value for what it could not
   * measure, matching the honesty rules those engines already enforce. */
  function _tabIntelligence(props, feature) {
    const fips = props.county_fips;
    const key  = _parcelKey(props);
    const cached = key ? _intelCache.get(key) : null;

    const feasibility = window.PARCEL_FEASIBILITY?.assess(props, fips);
    const ctx = {
      properties: props,
      geometry: feature.geometry,
      acres: props.area_acres,
      fips,
      envelope: feasibility?.envelope || null,
      proximity: cached?.proximity?.results
        ? Object.fromEntries(cached.proximity.results.map(r => [r.layerId, r]))
        : undefined,
      constraintSummary: cached?.constraints?.summary,
    };
    const suit = window.PARCEL_SUITABILITY?.score(ctx);

    let html = '';
    html += _renderSiteStatus(props, feature, cached, suit, key);
    html += _renderSuitability(suit);
    html += _renderProximity(cached?.proximity);
    html += _renderConstraints(cached?.constraints);
    html += _renderSales(window.PARCEL_SALES?.buildHistory(props));

    if (key && !cached && feature.geometry) {
      _loadIntelligence(feature, key);
    }

    return html || '<p class="pp-empty">Site intelligence not available for this parcel.</p>';
  }

  const SITE_STATUS_META = {
    potentially_viable:   { cls: 'pf-eligible',    icon: '✓', label: 'Potentially Viable' },
    conditional:          { cls: 'pf-conditional', icon: '!', label: 'Conditional' },
    material_constraints: { cls: 'pf-prohibited',  icon: '✗', label: 'Material Constraints' },
    insufficient_data:    { cls: 'pf-unknown',     icon: '?', label: 'Insufficient Data' },
  };

  /* Renders the canonical, deterministic synthesis from
     window.PARCEL_SITE_INTELLIGENCE.build() -- the single normalized
     read of zoning feasibility + mapped constraints + infrastructure
     proximity for this parcel. Site status uses only the milestone's
     fixed vocabulary (never "approved"/"buildable"/"good site"), and
     every advantage/constraint/unknown traces to a named upstream field
     rather than being an LLM summary. Degrades to nothing when the
     module isn't loaded or proximity/constraints haven't resolved yet --
     those layers still render their own "loading…" state below. */
  function _renderSiteStatus(props, feature, cached, suit, key) {
    if (!window.PARCEL_SITE_INTELLIGENCE) return '';
    let si;
    try {
      si = window.PARCEL_SITE_INTELLIGENCE.build({
        site_id: key,
        parcels: [{ id: key, geometry: feature.geometry, properties: props }],
        proximity: cached?.proximity,
        constraints: cached?.constraints,
        score: suit,
      });
    } catch (_) {
      return '';
    }

    const meta = SITE_STATUS_META[si.site_status] || SITE_STATUS_META.insufficient_data;
    const f = si.findings;
    const list = items => `<ul class="pf-conditions-list">${items.map(x => `<li>${esc(x.statement)}</li>`).join('')}</ul>`;

    let html = `<div class="pp-group pp-site-status">
      <div class="pp-group-label">Site Status</div>
      <div class="pf-eligibility ${esc(meta.cls)}">
        <span class="pf-eligibility-icon">${esc(meta.icon)}</span>
        <span class="pf-eligibility-label">${esc(meta.label)}</span>
      </div>`;

    if (f.advantages.length) {
      html += `<p class="pp-muted"><strong>Advantages</strong></p>${list(f.advantages)}`;
    }
    if (f.constraints.length) {
      html += `<p class="pp-muted"><strong>Constraints</strong></p>${list(f.constraints)}`;
    }
    if (f.unknowns.length) {
      html += `<details class="pf-conditions"><summary>Unknowns (${f.unknowns.length})</summary>${list(f.unknowns)}</details>`;
    }
    html += `<p class="pf-disclaimer">Deterministic synthesis from mapped data only. Not a determination of developability or entitlement.</p>`;
    html += `</div>`;
    return html;
  }

  function _renderSuitability(suit) {
    if (!suit) return '';
    if (!suit.scorable) {
      return `<div class="pp-group pp-suitability">
        <div class="pp-group-label">Site Suitability Screening</div>
        <p class="pp-empty pp-muted">${esc(suit.why || 'Not enough data to score this parcel.')}</p>
      </div>`;
    }
    const cls = suit.overall >= 75 ? 'pf-score-high' : suit.overall >= 50 ? 'pf-score-mod' : 'pf-score-low';
    let html = `<div class="pp-group pp-suitability">
      <div class="pp-group-label">Site Suitability Screening</div>
      <div class="pf-score-row">
        <div class="pf-score-label">Screening Score</div>
        <div class="pf-score-bar-wrap"><div class="pf-score-bar ${esc(cls)}" style="width:${suit.overall}%"></div></div>
        <div class="pf-score-value ${esc(cls)}">${suit.overall}</div>
      </div>
      <p class="pp-muted">${esc(suit.basis)}</p>
      <details class="pf-conditions">
        <summary>Component breakdown (${suit.components.length} scored, ${suit.omitted.length} omitted)</summary>
        <ul class="pf-conditions-list">
          ${suit.components.map(c => `<li>${esc(c.label)}: ${c.score}/100 (weight ${c.weight}%) — ${esc(c.rule)}</li>`).join('')}
          ${suit.omitted.map(o => `<li class="pp-muted">${esc(o.label)}: not scored — ${esc(o.why)}</li>`).join('')}
        </ul>
      </details>
      <p class="pf-disclaimer">${esc(suit.disclaimer)}</p>
    </div>`;
    return html;
  }

  function _renderProximity(proximity) {
    let html = `<div class="pp-group pp-proximity"><div class="pp-group-label">Infrastructure Proximity</div>`;
    if (!window.PARCEL_PROXIMITY) return '';
    if (!proximity) {
      return html + '<p class="pp-empty pp-muted">Loading proximity data…</p></div>';
    }
    const found = (proximity.results || []).filter(r => r.nearest && !r.error);
    const errs  = (proximity.results || []).filter(r => r.error);
    let rows = found.map(r => {
      const dist = window.PARCEL_PROXIMITY.formatDistance(r.nearest.distanceMiles) || `${r.nearest.distanceMiles} mi`;
      return _fieldRow(r.label, `${dist}${r.nearest.name ? ` (${esc(r.nearest.name)})` : ''}`);
    }).join('');
    rows += errs.map(r => `<div class="pp-field"><span class="pp-field-label">${esc(r.label)}</span><span class="pp-field-value pp-field-na">Unavailable — ${esc(r.error)}</span></div>`).join('');
    rows += (proximity.unavailable || []).map(u => `<div class="pp-field"><span class="pp-field-label">${esc(u.layerId)}</span><span class="pp-field-value pp-field-na">${esc(u.reason)}</span></div>`).join('');
    html += rows || '<p class="pp-empty pp-muted">No infrastructure found within the search radius.</p>';
    html += `</div>`;
    return html;
  }

  function _renderConstraints(constraints) {
    let html = `<div class="pp-group pp-constraints"><div class="pp-group-label">Environmental &amp; Development Constraints</div>`;
    if (!window.PARCEL_CONSTRAINTS) return '';
    if (!constraints) {
      return html + '<p class="pp-empty pp-muted">Loading constraint data…</p></div>';
    }
    const s = constraints.summary;
    html += _fieldRow('Constrained area', `${s.constrainedAcres} ac (${s.constrainedPct}% of parcel)`);
    html += _fieldRow('Unconstrained by checked layers', `${s.unconstrainedByCheckedLayersAcres} ac`);
    const intersecting = (constraints.results || []).filter(r => r.intersects);
    if (intersecting.length) {
      html += `<ul class="pf-conditions-list">
        ${intersecting.map(r => `<li>${esc(r.label)}: ${r.pctOfParcel}% of parcel${r.caveat ? ` — ${esc(r.caveat)}` : ''}</li>`).join('')}
      </ul>`;
    }
    if (s.disclaimer) html += `<p class="pf-disclaimer">${esc(s.disclaimer)}</p>`;
    html += `</div>`;
    return html;
  }

  function _renderSales(sales) {
    if (!sales || !sales.count) return '';
    return `<div class="pp-group pp-sales">
      <div class="pp-group-label">Sales History (${sales.count})</div>
      ${sales.sales.slice(0, 5).map(s => _fieldRow(
        s.sale_date || 'Unknown date',
        `${s.sale_price != null ? '$' + s.sale_price.toLocaleString() : '—'}${s.classification !== 'market' ? ` (${esc(s.classification)})` : ''}`
      )).join('')}
    </div>`;
  }

  async function _loadIntelligence(feature, key) {
    if (_intelCache.has(key)) return;
    _intelCache.set(key, {});
    try {
      const [proximity, constraints] = await Promise.all([
        window.PARCEL_PROXIMITY ? window.PARCEL_PROXIMITY.analyze(feature.geometry) : null,
        window.PARCEL_CONSTRAINTS ? window.PARCEL_CONSTRAINTS.analyze(feature.geometry) : null,
      ]);
      _intelCache.set(key, { proximity, constraints });
    } catch (_) {
      _intelCache.delete(key);
    }
    // Only re-render if the user is still looking at this same parcel's
    // Intelligence tab -- a slow query resolving after the user has moved
    // on to a different parcel must not clobber what is now on screen.
    if (_lastFeature === feature && _activeTab === 'intelligence') refresh();
  }

  /* ── Tab: Compare ── */
  function _tabCompare() {
    return _renderSavedSites() + _tabCompareTray();
  }

  /* Pure: the user's persisted SAVED_SITES list, rendered above the
   * ephemeral compare tray. Each entry can be added to the tray (for a
   * side-by-side comparison) or removed from storage entirely -- these are
   * two different actions on two different stores (SAVED_SITES persists
   * across sessions; PARCEL_SELECTION's tray does not), and the UI keeps
   * them visibly distinct rather than collapsing "saved" and "compared"
   * into one concept. */
  function _renderSavedSites() {
    if (!window.SAVED_SITES) return '';
    const saved = window.SAVED_SITES.list();
    if (!saved.length) return '';

    const items = saved.map(e => {
      const p = e.properties || {};
      const label = p.address || p.pin || e.parcel_id || 'Parcel';
      const sub = [
        p.area_acres != null ? `${Number(p.area_acres).toFixed(1)} ac` : null,
        p.zoning_code || null,
      ].filter(Boolean).join(' · ');
      return `<div class="pp-suggest-item" data-saved-key="${esc(e.key)}">
        <div class="pp-suggest-main">
          <span class="pp-suggest-label">${esc(label)}</span>
        </div>
        ${sub ? `<div class="pp-suggest-sub">${esc(sub)}</div>` : ''}
        <div class="fs-result-more">
          <button class="pp-suggest-add" onclick="window.PARCEL_PANEL._compareSaved(${JSON.stringify(e.key)})">+ Compare</button>
          <button class="pp-compare-remove" onclick="window.PARCEL_PANEL._unsave(${JSON.stringify(e.key)})" aria-label="Remove from saved sites">✕</button>
        </div>
      </div>`;
    }).join('');

    return `<div class="pp-group pp-saved-sites">
      <div class="pp-group-label">Saved Sites (${saved.length})</div>
      <div class="pp-suggest-list">${items}</div>
      <button class="pp-compare-export" onclick="window.PARCEL_PANEL._exportSavedCSV()">⬇ Export Saved Sites CSV</button>
    </div>`;
  }

  function _exportSavedCSV() {
    const saved = window.SAVED_SITES?.list() || [];
    if (!saved.length) return;
    const csv  = window.SAVED_SITES.renderCSV(saved);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `saved-sites-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  function _compareSaved(key) {
    const entry = window.SAVED_SITES?.get(key);
    if (!entry) return;
    const feature = { type: 'Feature', properties: entry.properties, geometry: entry.geometry };
    const added = window.PARCEL_SELECTION?.addToCompare(feature, entry.county_fips);
    if (added) { window.PARCEL_RENDERER?.onCompareChanged(); refresh(); }
  }

  function _unsave(key) {
    window.SAVED_SITES?.remove(key);
    refresh();
  }

  function _tabCompareTray() {
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
    // Attached so PARCEL_FEASIBILITY.assess() can fall back to a spatial
    // (point-in-polygon) zoning-district resolution when the parcel source
    // itself doesn't publish a zoning_code -- true for all three NoVA
    // counties today. Also the same field js/parcel/envelope.js already
    // reads for the geometric buildable-envelope calculation.
    props._geometry = feature.geometry || null;
    const address = props.address || props.pin || props.parcel_id || 'Parcel';
    const owner   = props.owner || '';
    const compared = window.PARCEL_SELECTION?.getCompared() || [];

    const tabs = [
      { id: 'details',      label: 'Details'      },
      { id: 'zoning',       label: 'Zoning'       },
      { id: 'valuation',    label: 'Valuation'    },
      { id: 'intelligence', label: 'Intelligence' },
      { id: 'compare',      label: `Compare${compared.length ? ` (${compared.length})` : ''}` },
    ];

    const tabContent = (() => {
      switch (_activeTab) {
        case 'zoning':       return _tabZoning(props);
        case 'valuation':    return _tabValuation(props);
        case 'intelligence': return _tabIntelligence(props, feature);
        case 'compare':      return _tabCompare();
        default:             return _tabDetails(props);
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
        ${_saveButtonHtml(feature)}
        <button class="pp-action-draw" onclick="window.PARCEL_DRAW_TOOL?.activate()" title="Draw polygon to select multiple parcels">◻ Draw</button>
        <button class="pp-action-report" onclick="window.PARCEL_PANEL._openReport()" title="Open printable parcel report">⎙ Report</button>
        <button class="pp-action-secondary" onclick="window.PARCEL_PANEL.close()">Close</button>
      </div>
    `;

    // Render 3-D massing diagrams for any envelope containers now in DOM
    panel.querySelectorAll('.pf-massing[data-massing-envelope]').forEach(el => {
      try {
        const env = JSON.parse(el.dataset.massingEnvelope);
        window.PARCEL_MASSING?.render(el, env);
      } catch (_) { /* ignore parse errors */ }
    });

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

  /* Pure: given the currently-shown feature, returns the Save button's
   * HTML — filled star + "Saved" label when SAVED_SITES already has this
   * parcel (keyed by county_fips + parcel_id/pin, since parcel_id alone is
   * only unique within one jurisdiction), outline star + "Save" otherwise.
   * Returns '' when SAVED_SITES was never loaded on the page or the
   * feature has no stable key to save under, rather than a button that
   * silently does nothing when clicked. */
  function _saveButtonHtml(feature) {
    if (!window.SAVED_SITES) return '';
    const key = window.SAVED_SITES.keyFor(feature);
    if (!key) return '';
    const saved = window.SAVED_SITES.has(key);
    return `<button class="pp-action-save${saved ? ' pp-action-save-active' : ''}"
      onclick="window.PARCEL_PANEL._toggleSave()" aria-pressed="${saved}">
      ${saved ? '★ Saved' : '☆ Save'}
    </button>`;
  }

  function _toggleSave() {
    if (!_lastFeature || !window.SAVED_SITES) return;
    window.SAVED_SITES.toggle(_lastFeature);
    refresh();
  }

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
      // Optional Phase E addition: if the 3D view is active and has
      // objects, its getReportData() snapshot/metrics/objects get folded
      // into the report as a "Conceptual 3D Site Plan" section. Returns
      // null when 3D was never activated or is empty, in which case the
      // report renders exactly as it always has.
      const scene3d = window.SCENE3D?.getReportData?.() || null;
      window.PARCEL_REPORT?.open(_lastFeature, _lastJurisId, scene3d, _reportIntel(_lastFeature));
    }
  }

  /* Phase 14 (due-diligence export): folds the same Intelligence-tab data
   * into the exported/printed report. Suitability and sales are cheap and
   * synchronous, so they're always computed fresh. Proximity/constraints
   * are live network queries -- this deliberately does NOT trigger a new
   * fetch on Report click (that would add an unexplained delay to a button
   * that has never been async before); it reuses _intelCache if the user
   * already opened the Intelligence tab for this parcel, and simply omits
   * that part of the section otherwise, the same "absent = no change"
   * contract report.js's scene3d parameter already established. */
  function _reportIntel(feature) {
    const props = feature.properties || {};
    const fips = props.county_fips;
    const key = _parcelKey(props);
    const cached = key ? _intelCache.get(key) : null;
    const feasibility = window.PARCEL_FEASIBILITY?.assess(props, fips);
    const ctx = {
      properties: props, geometry: feature.geometry, acres: props.area_acres, fips,
      envelope: feasibility?.envelope || null,
      proximity: cached?.proximity?.results
        ? Object.fromEntries(cached.proximity.results.map(r => [r.layerId, r]))
        : undefined,
      constraintSummary: cached?.constraints?.summary,
    };
    return {
      suitability: window.PARCEL_SUITABILITY?.score(ctx) || null,
      proximity: cached?.proximity || null,
      constraints: cached?.constraints || null,
      sales: window.PARCEL_SALES?.buildHistory(props) || null,
    };
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

  /* Lazy-loads a jurisdiction's zoning DISTRICT GEOMETRY (not the
   * classification data _loadAndRefresh above loads) so
   * PARCEL_FEASIBILITY.assess()'s spatial fallback can resolve a district
   * for parcels whose source publishes no native zoning_code. */
  async function _loadZoningGeometryAndRefresh(fips) {
    if (!fips) return;
    try {
      await window.ZONING_GEOMETRY?.loadByFips(fips);
    } catch (_) {}
    // The resolved code's district classification also needs to be
    // in cache for the feasibility section to render fully.
    if (window.ZONING?.hasCoverage(fips) && !window.ZONING?.getCachedByFips(fips)) {
      try { await window.ZONING.loadByFips(fips); } catch (_) {}
    }
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

  /* ── Mobile swipe-to-dismiss ── */
  (function _initSwipe() {
    let startY = 0;
    let startX = 0;
    let dragging = false;
    const DISMISS_THRESHOLD = 90; // px downward to trigger close

    document.addEventListener('touchstart', e => {
      const panel = _getPanel();
      if (!panel?.classList.contains('open')) return;
      // Only initiate drag if touch begins inside the panel
      if (!panel.contains(e.target)) return;
      startY   = e.touches[0].clientY;
      startX   = e.touches[0].clientX;
      dragging = true;
      panel.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', e => {
      if (!dragging) return;
      const panel = _getPanel();
      if (!panel) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      // Only treat as vertical swipe if predominantly downward
      if (Math.abs(dy) < Math.abs(dx) || dy < 0) return;
      panel.style.transform = `translateY(${Math.min(dy, 220)}px)`;
    }, { passive: true });

    document.addEventListener('touchend', e => {
      if (!dragging) return;
      dragging = false;
      const panel = _getPanel();
      if (!panel) return;
      const dy = e.changedTouches[0].clientY - startY;
      panel.style.transition = '';
      panel.style.transform  = '';
      if (dy > DISMISS_THRESHOLD) {
        // Enough of a downward swipe — dismiss the panel
        window.PARCEL_PANEL.close();
      }
    }, { passive: true });
  })();

  return {
    show, refresh, close, _addToCompare, _openZoning, _loadAndRefresh, _loadZoningGeometryAndRefresh, _exportCSV, _openReport,
    _toggleSave, _compareSaved, _unsave, _exportSavedCSV, _reportIntel,
    // Exposed for unit testing (pure functions: data in, HTML string out --
    // no DOM APIs used inside them), matching the existing pattern of
    // exposing "_"-prefixed internals above.
    _tabIntelligence, _renderSuitability, _renderProximity, _renderConstraints, _renderSales, _renderSiteStatus,
    _saveButtonHtml, _renderSavedSites,
  };
})();
