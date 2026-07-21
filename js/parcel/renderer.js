/* js/parcel/renderer.js
 * Leaflet parcel layer — viewport-only fetch, zoom-gated, debounced, cancellable.
 *
 * Renders parcels as GeoJSON polygons on a dedicated Leaflet pane above county fills.
 * Fetches only the visible viewport; cancels in-flight requests on every pan/zoom.
 *
 * Depends on: ArcGISParcelConnector, PARCEL_REGISTRY, PARCEL_SELECTION
 */
window.PARCEL_RENDERER = (function () {
  'use strict';

  const DEBOUNCE_MS = 350;
  const PANE_NAME   = 'parcelPane';
  const PANE_Z      = 450; // above county fills (~400) but below tooltips (600)

  let _map           = null;
  let _layer         = null;    // current L.geoJSON layer
  let _connector     = null;    // ArcGISParcelConnector instance for active jurisdiction
  let _jurisId       = null;    // active jurisdiction id string
  let _fips          = null;    // active county FIPS
  let _active        = false;
  let _debounce      = null;
  let _abortCtrl     = null;
  let _hoveredLyr    = null;
  let _selectedLyr   = null;

  /* ── Parcel styles ── */

  function _defaultStyle(feature) {
    return {
      pane:        PANE_NAME,
      fillColor:   _fillByLandUse(feature?.properties?.land_use_code),
      fillOpacity: 0.15,
      color:       '#4874e8',
      weight:      0.8,
      opacity:     0.65,
    };
  }

  function _hoveredStyle() {
    return { weight: 2, color: '#f97316', fillOpacity: 0.28, opacity: 1 };
  }

  function _selectedStyle() {
    return { weight: 2.5, color: '#eab308', fillOpacity: 0.38, opacity: 1 };
  }

  function _compareStyle() {
    return { weight: 2, color: '#a78bfa', fillOpacity: 0.30, opacity: 1 };
  }

  function _fillByLandUse(code) {
    const c = String(code || '').toUpperCase();
    if (c.startsWith('I') || c.includes('INDUSTRIAL')) return '#5b8def';
    if (c.startsWith('C') || c.includes('COMMERCIAL')) return '#f97316';
    if (c.startsWith('R') || c.includes('RESIDENTIAL')) return '#4ade80';
    if (c.startsWith('O') || c.includes('OFFICE'))      return '#a78bfa';
    if (c.startsWith('A') || c.includes('AGRICULT'))    return '#fbbf24';
    if (c.includes('OPEN') || c.includes('PARK') || c.includes('REC')) return '#34d399';
    return '#7a88b8';
  }

  /* ── Layer management ── */

  function _buildLayer(geojson) {
    if (_layer) { _map.removeLayer(_layer); _layer = null; }

    _layer = L.geoJSON(geojson, {
      pane:  PANE_NAME,
      style: f => _defaultStyle(f),
      onEachFeature(feature, lyr) {
        lyr.on({
          mouseover: e => _onHover(e, lyr, feature, true),
          mouseout:  e => _onHover(e, lyr, feature, false),
          click:     e => _onClick(e, feature, lyr),
        });
      },
    }).addTo(_map);
  }

  function _onHover(e, lyr, feature, entering) {
    if (entering) {
      if (_hoveredLyr && _hoveredLyr !== lyr && _hoveredLyr !== _selectedLyr) {
        _hoveredLyr.setStyle(_styleFor(_hoveredLyr.feature));
      }
      _hoveredLyr = lyr;
      if (lyr !== _selectedLyr) lyr.setStyle(_hoveredStyle());

      // Tooltip
      const props = feature.properties || {};
      const label = props.address || props.pin || props.parcel_id || 'Parcel';
      lyr.bindTooltip(label, { sticky: true, className: 'parcel-tooltip' }).openTooltip(e.latlng);
    } else {
      lyr.closeTooltip();
      if (lyr !== _selectedLyr) lyr.setStyle(_styleFor(feature));
      if (_hoveredLyr === lyr) _hoveredLyr = null;
    }
  }

  function _onClick(e, feature, lyr) {
    L.DomEvent.stopPropagation(e);

    // Reset previously selected layer
    if (_selectedLyr && _selectedLyr !== lyr) {
      _selectedLyr.setStyle(_styleFor(_selectedLyr.feature));
    }
    _selectedLyr = lyr;

    const isCompared = window.PARCEL_SELECTION?.isInCompare(feature.properties?.parcel_id);
    lyr.setStyle(isCompared ? _compareStyle() : _selectedStyle());

    window.PARCEL_SELECTION?.select(feature, _jurisId);
  }

  function _styleFor(feature) {
    const pid = feature?.properties?.parcel_id;
    if (window.PARCEL_SELECTION?.isInCompare(pid)) return _compareStyle();
    return _defaultStyle(feature);
  }

  function _clearLayer() {
    if (_layer) { _map.removeLayer(_layer); _layer = null; }
    _hoveredLyr  = null;
    _selectedLyr = null;
  }

  /* ── Fetch pipeline ── */

  function _fetch() {
    if (!_map || !_active || !_connector) return;

    const zoom    = _map.getZoom();
    const config  = window.PARCEL_REGISTRY?.get(_fips);
    const minZoom = config?.minZoom ?? 14;

    if (zoom < minZoom) {
      _clearLayer();
      _setStatus(`Zoom to level ${minZoom}+ to view parcels`, 'hint');
      return;
    }

    if (_abortCtrl) { _abortCtrl.abort(); }
    _abortCtrl = new AbortController();

    _setStatus('Loading parcels…', 'loading');

    _connector.fetchViewport(_map.getBounds(), _abortCtrl.signal)
      .then(geojson => {
        if (!geojson.features?.length) {
          _clearLayer();
          _setStatus('No parcels in this area', 'hint');
          return;
        }
        _buildLayer(geojson);
        _setStatus(`${geojson.features.length} parcels loaded`, 'count');
        // Restore compare styles for any compared parcels now on screen
        _syncCompareStyles();
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.warn('[PARCEL_RENDERER] Fetch error:', err.message);
        _setStatus('Parcel data unavailable — service error', 'error');
        _clearLayer();
      });
  }

  function _scheduleFetch() {
    clearTimeout(_debounce);
    _debounce = setTimeout(_fetch, DEBOUNCE_MS);
  }

  /* Re-apply compare highlight styles after each new layer build. */
  function _syncCompareStyles() {
    if (!_layer) return;
    const compared = window.PARCEL_SELECTION?.getCompared() || [];
    if (!compared.length) return;
    const pids = new Set(compared.map(c => c.feature?.properties?.parcel_id));
    _layer.eachLayer(lyr => {
      if (pids.has(lyr.feature?.properties?.parcel_id)) {
        lyr.setStyle(_compareStyle());
        if (lyr === _selectedLyr) lyr.setStyle(_selectedStyle()); // selected wins
      }
    });
  }

  /* ── Status bar ── */

  function _setStatus(msg, type) {
    const el = document.getElementById('parcel-layer-status');
    if (!el) return;
    if (!msg || !_active) { el.hidden = true; return; }
    el.hidden    = false;
    el.className = `parcel-layer-status parcel-status-${type || 'hint'}`;
    el.textContent = msg;
  }

  /* ── Public API ── */

  function init(map) {
    _map = map;
    if (!_map.getPane(PANE_NAME)) {
      const pane = _map.createPane(PANE_NAME);
      pane.style.zIndex   = String(PANE_Z);
      pane.style.pointerEvents = 'auto';
    }
    _map.on('moveend zoomend', _scheduleFetch);
  }

  /* Enable/disable the parcel layer for the given county FIPS.
   * Setting active=false clears the layer and cancels requests. */
  function setActive(fips, active) {
    _fips   = fips  || null;
    _active = !!active;

    const config = fips ? window.PARCEL_REGISTRY?.get(fips) : null;

    if (_active && config) {
      _connector = new window.ArcGISParcelConnector(config);
      _jurisId   = config.id;
      _fetch();
    } else {
      _active    = false;
      _connector = null;
      _jurisId   = null;
      if (_abortCtrl) { _abortCtrl.abort(); _abortCtrl = null; }
      _clearLayer();
      _setStatus(null);
    }
  }

  /* Force a re-fetch (e.g. after user pans manually or jurisdiction changes). */
  function refresh() {
    if (_active) _scheduleFetch();
  }

  /* Reset selected-parcel highlight without touching data or selection state. */
  function clearHighlight() {
    if (_selectedLyr) {
      _selectedLyr.setStyle(_styleFor(_selectedLyr.feature));
      _selectedLyr = null;
    }
  }

  /* Called when compare tray changes — re-sync highlight styles on visible parcels. */
  function onCompareChanged() {
    _syncCompareStyles();
  }

  return { init, setActive, refresh, clearHighlight, onCompareChanged };
})();
