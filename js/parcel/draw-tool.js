/* js/parcel/draw-tool.js
 * Polygon draw tool — lets users draw a custom area on the map, then
 * queries all parcels within that polygon and shows aggregate stats.
 *
 * window.PARCEL_DRAW_TOOL.activate() — enter polygon-drawing mode
 * window.PARCEL_DRAW_TOOL.deactivate() — exit drawing mode, clear shape
 * window.PARCEL_DRAW_TOOL.isActive() → boolean
 *
 * Drawing flow:
 *   1. activate() — cursor changes, click to add polygon vertices
 *   2. Each click appends a vertex and draws a preview polyline
 *   3. Double-click or pressing Enter closes the polygon
 *   4. The closed polygon queries parcels within its bounds from the active layer
 *   5. Matched parcels are highlighted and summary stats shown in an overlay card
 *   6. Pressing Escape or clicking the close button deactivates
 *
 * Depends on: Leaflet (L), PARCEL_RENDERER.getFeatures(), PARCEL_SELECTION
 */
window.PARCEL_DRAW_TOOL = (function () {
  'use strict';

  let _map         = null;
  let _active      = false;
  let _vertices    = [];     // LatLng array
  let _previewLine = null;   // L.Polyline — live preview as user clicks
  let _polygon     = null;   // L.Polygon — closed shape after double-click
  let _resultLayer = null;   // L.GeoJSON of highlighted matches
  let _statsCard   = null;   // DOM element — stats overlay

  /* ── Point-in-polygon using ray-casting ── */
  function _pointInPolygon(lat, lng, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].lng, yi = vertices[i].lat;
      const xj = vertices[j].lng, yj = vertices[j].lat;
      const intersect = ((yi > lat) !== (yj > lat))
                     && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /* ── Grid spatial index for fast candidate pre-filtering ──
   * Divides the lat/lng space into GRID_SIZE × GRID_SIZE cells.
   * Only features whose centroid cell overlaps the polygon bbox
   * are tested with the full ray-casting check.
   */
  const GRID_SIZE = 20;

  function _buildIndex(features, bbox) {
    // bbox: { minLat, maxLat, minLng, maxLng }
    const latRange = bbox.maxLat - bbox.minLat || 0.001;
    const lngRange = bbox.maxLng - bbox.minLng || 0.001;
    const cells    = {};

    features.forEach((f, idx) => {
      const c = _featureCentroid(f);
      if (!c) return;
      // Only index features within or near the bbox
      if (c[0] < bbox.minLat - latRange * 0.1 || c[0] > bbox.maxLat + latRange * 0.1) return;
      if (c[1] < bbox.minLng - lngRange * 0.1 || c[1] > bbox.maxLng + lngRange * 0.1) return;
      const row = Math.floor(((c[0] - bbox.minLat) / latRange) * GRID_SIZE);
      const col = Math.floor(((c[1] - bbox.minLng) / lngRange) * GRID_SIZE);
      const key = `${Math.max(0, Math.min(row, GRID_SIZE - 1))}_${Math.max(0, Math.min(col, GRID_SIZE - 1))}`;
      if (!cells[key]) cells[key] = [];
      cells[key].push({ f, c });
    });
    return { cells, latRange, lngRange, minLat: bbox.minLat, minLng: bbox.minLng };
  }

  function _candidatesFromIndex(index) {
    return Object.values(index.cells).flat();
  }

  /* ── Query parcels within the drawn polygon ── */
  function _queryWithin(vertices) {
    const features = window.PARCEL_RENDERER?.getFeatures() || [];
    if (!features.length) return [];

    // Compute polygon bounding box for spatial-index pre-filter
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    vertices.forEach(v => {
      if (v.lat < minLat) minLat = v.lat;
      if (v.lat > maxLat) maxLat = v.lat;
      if (v.lng < minLng) minLng = v.lng;
      if (v.lng > maxLng) maxLng = v.lng;
    });

    const index      = _buildIndex(features, { minLat, maxLat, minLng, maxLng });
    const candidates = _candidatesFromIndex(index);

    return candidates
      .filter(({ c }) => _pointInPolygon(c[0], c[1], vertices))
      .map(({ f }) => f);
  }

  function _featureCentroid(feature) {
    try {
      const bounds = L.geoJSON(feature).getBounds();
      if (!bounds.isValid()) return null;
      const c = bounds.getCenter();
      return [c.lat, c.lng];
    } catch (_) {
      return null;
    }
  }

  /* ── Aggregate stats for matched parcels ── */
  function _computeStats(features) {
    let totalAcres    = 0;
    let totalValue    = 0;
    let zoningCounts  = {};
    let luCounts      = {};
    let countWithArea = 0;
    let countWithVal  = 0;

    for (const f of features) {
      const p = f.properties || {};
      const acres = Number(p.area_acres) || 0;
      const val   = Number(p.assessed_value) || 0;
      if (acres > 0) { totalAcres += acres; countWithArea++; }
      if (val   > 0) { totalValue += val;   countWithVal++; }
      if (p.zoning_code)  zoningCounts[p.zoning_code]  = (zoningCounts[p.zoning_code]  || 0) + 1;
      if (p.land_use_code) luCounts[p.land_use_code]   = (luCounts[p.land_use_code]    || 0) + 1;
    }

    const topZoning = Object.entries(zoningCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return { count: features.length, totalAcres, totalValue, topZoning, countWithArea, countWithVal };
  }

  /* ── Render stats overlay card ── */
  function _showStats(features) {
    _removeStats();

    const stats = _computeStats(features);
    const card  = document.createElement('div');
    card.className = 'pd-stats-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Draw selection results');

    const zoningHtml = stats.topZoning.map(([z, n]) =>
      `<span class="pd-zoning-chip">${_esc(z)} ×${n}</span>`
    ).join('');

    card.innerHTML = `
      <button class="pd-stats-close" onclick="window.PARCEL_DRAW_TOOL.deactivate()" aria-label="Close">✕</button>
      <div class="pd-stats-title">Selected Area</div>
      <div class="pd-stats-grid">
        <div class="pd-stat">
          <div class="pd-stat-val">${stats.count}</div>
          <div class="pd-stat-lbl">Parcels</div>
        </div>
        ${stats.totalAcres > 0 ? `<div class="pd-stat">
          <div class="pd-stat-val">${stats.totalAcres.toFixed(1)}</div>
          <div class="pd-stat-lbl">Total Acres</div>
        </div>` : ''}
        ${stats.totalValue > 0 ? `<div class="pd-stat">
          <div class="pd-stat-val">$${(stats.totalValue / 1e6).toFixed(1)}M</div>
          <div class="pd-stat-lbl">Total Value</div>
        </div>` : ''}
      </div>
      ${zoningHtml ? `<div class="pd-zoning-row">${zoningHtml}</div>` : ''}
      <div class="pd-stats-actions">
        <button class="pd-action-add" onclick="window.PARCEL_DRAW_TOOL._addAllToCompare()">Add All to Compare</button>
        <button class="pd-action-csv"  onclick="window.PARCEL_DRAW_TOOL._exportSelection()">⬇ Export CSV</button>
      </div>
    `;

    document.body.appendChild(card);
    _statsCard = card;
    _statsCard._features = features;
  }

  function _removeStats() {
    if (_statsCard) { _statsCard.remove(); _statsCard = null; }
  }

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Highlight matched parcels on the map ── */
  function _highlightMatches(features) {
    if (_resultLayer) { _map.removeLayer(_resultLayer); _resultLayer = null; }
    if (!features.length) return;

    _resultLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
      pane: 'parcelPane',
      style: () => ({
        pane:        'parcelPane',
        color:       '#06b6d4',
        weight:      2.5,
        fillColor:   '#06b6d4',
        fillOpacity: 0.25,
        opacity:     1,
      }),
    }).addTo(_map);
  }

  /* ── Drawing machinery ── */

  function _onMapClick(e) {
    if (!_active) return;
    _vertices.push(e.latlng);
    _updatePreview();
  }

  function _onMapDblClick(e) {
    if (!_active || _vertices.length < 3) return;
    L.DomEvent.stop(e);
    _closePolygon();
  }

  function _updatePreview() {
    if (_previewLine) { _map.removeLayer(_previewLine); _previewLine = null; }
    if (_vertices.length < 2) return;
    _previewLine = L.polyline(_vertices, {
      color:       '#06b6d4',
      weight:      2,
      dashArray:   '5 5',
      opacity:     0.85,
    }).addTo(_map);
  }

  function _closePolygon() {
    if (_polygon) { _map.removeLayer(_polygon); _polygon = null; }
    if (_previewLine) { _map.removeLayer(_previewLine); _previewLine = null; }

    _polygon = L.polygon(_vertices, {
      color:       '#06b6d4',
      weight:      2.5,
      fillColor:   '#06b6d4',
      fillOpacity: 0.10,
      dashArray:   null,
    }).addTo(_map);

    const matched = _queryWithin(_vertices);
    _highlightMatches(matched);
    _showStats(matched);

    // Stop drawing after closing
    _map.off('click', _onMapClick);
    _map.off('dblclick', _onMapDblClick);
    _map.getContainer().classList.remove('pd-drawing');
  }

  function _keyHandler(e) {
    if (!_active) return;
    if (e.key === 'Escape') { deactivate(); return; }
    if (e.key === 'Enter' && _vertices.length >= 3) _closePolygon();
  }

  /* ── Public API ── */

  function init(map) {
    _map = map;
  }

  function activate() {
    if (!_map) return;
    if (_active) { deactivate(); return; } // toggle off if already active

    deactivate(); // clean any previous state first
    _active   = true;
    _vertices = [];

    _map.on('click', _onMapClick);
    _map.on('dblclick', _onMapDblClick);
    document.addEventListener('keydown', _keyHandler);
    _map.getContainer().classList.add('pd-drawing');

    // Show hint toast
    _showHint('Click to draw a polygon. Double-click or press Enter to close. Esc to cancel.');
  }

  function deactivate() {
    _active   = false;
    _vertices = [];

    if (_map) {
      _map.off('click', _onMapClick);
      _map.off('dblclick', _onMapDblClick);
      _map.getContainer().classList.remove('pd-drawing');
    }
    document.removeEventListener('keydown', _keyHandler);

    if (_previewLine) { _map.removeLayer(_previewLine); _previewLine = null; }
    if (_polygon)     { _map.removeLayer(_polygon);     _polygon     = null; }
    if (_resultLayer) { _map.removeLayer(_resultLayer); _resultLayer = null; }
    _removeStats();
    _removeHint();
  }

  function isActive() { return _active; }

  function _addAllToCompare() {
    const features = _statsCard?._features || [];
    const max = window.PARCEL_SELECTION?.MAX_COMPARE ?? 4;
    let added = 0;
    for (const f of features) {
      if (window.PARCEL_SELECTION?.getCompared().length >= max) break;
      window.PARCEL_SELECTION?.addToCompare(f);
      added++;
    }
    window.PARCEL_RENDERER?.onCompareChanged();
    if (added) window.PARCEL_PANEL?.refresh();
  }

  function _exportSelection() {
    const features = _statsCard?._features || [];
    if (!features.length) return;

    const fields = ['parcel_id', 'pin', 'address', 'owner', 'zoning_code',
                    'area_acres', 'assessed_value', 'land_value', 'county_fips'];
    const schema = window.PARCEL_SCHEMA;
    const header = fields.map(fid => schema?.FIELD_MAP[fid]?.label || fid);

    const rows = features.map(f => {
      const p = f.properties || {};
      return fields.map(fid => {
        const v = p[fid];
        if (v == null || v === '') return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',');
    });

    const csv  = [header.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `parcel-selection-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  /* ── Hint toast ── */
  let _hintEl = null;

  function _showHint(msg) {
    _removeHint();
    _hintEl = document.createElement('div');
    _hintEl.className = 'pd-draw-hint';
    _hintEl.textContent = msg;
    document.body.appendChild(_hintEl);
  }

  function _removeHint() {
    if (_hintEl) { _hintEl.remove(); _hintEl = null; }
  }

  return { init, activate, deactivate, isActive, _addAllToCompare, _exportSelection };
})();
