/* js/parcel/index.js
 * window.PARCEL — public coordinator for the parcel intelligence system.
 *
 * Wires together PARCEL_RENDERER, PARCEL_PANEL, PARCEL_SELECTION, and
 * PARCEL_REGISTRY into a single entry point consumed by map.js.
 *
 * Call order from map.js:
 *   1. window.PARCEL.init(leafletMap)           — after Leaflet map is ready
 *   2. window.PARCEL.onLayerToggle(id, v, fips) — from setLayerVisible('parcels', ...)
 *   3. window.PARCEL.onCountyChanged(fips)      — from handleCountyClick
 *   4. window.PARCEL.search(query)              — from search bar (optional)
 */
window.PARCEL = (function () {
  'use strict';

  let _initialized  = false;
  let _layerActive  = false;
  let _currentFips  = null;

  /* Initialize renderer with the Leaflet map instance.
   * Safe to call multiple times — subsequent calls are no-ops. */
  function init(map) {
    if (_initialized) return;
    _initialized = true;
    window.PARCEL_RENDERER?.init(map);
  }

  /* Called by map.js setLayerVisible when the 'parcels' layer is toggled on/off.
   * fips is the currently-selected county (may be null if no county is selected). */
  function onLayerToggle(layerId, visible, fips) {
    _layerActive = visible;
    _currentFips = fips || null;

    const hasData = visible && fips && window.PARCEL_REGISTRY?.has(fips);

    window.PARCEL_RENDERER?.setActive(fips, hasData);
    window.PARCEL_SEARCH?.setContext(visible, fips);

    if (!visible) {
      window.PARCEL_SELECTION?.deselect();
      window.PARCEL_PANEL?.close();
    } else if (visible && fips && !window.PARCEL_REGISTRY?.has(fips)) {
      _noDataToast(fips);
    }
  }

  /* Called by map.js handleCountyClick when the user selects a county.
   * If the parcels layer is active, switches the connector to the new jurisdiction. */
  function onCountyChanged(fips) {
    _currentFips = fips;

    if (!_layerActive) return;

    const hasData = fips && window.PARCEL_REGISTRY?.has(fips);
    window.PARCEL_RENDERER?.setActive(fips, hasData);
    window.PARCEL_SEARCH?.setContext(_layerActive, fips);

    // Clear existing parcel selection when county changes
    window.PARCEL_SELECTION?.deselect();
    window.PARCEL_PANEL?.close();

    if (!hasData && fips) {
      _noDataToast(fips);
    }
  }

  /* Search for a parcel by address or PIN in the active jurisdiction.
   * Returns a GeoJSON FeatureCollection or null if no active jurisdiction. */
  async function search(query) {
    if (!_currentFips || !query) return null;

    const config = window.PARCEL_REGISTRY?.get(_currentFips);
    if (!config) return null;

    const conn = new window.ArcGISParcelConnector(config);
    const addrField = config.fieldMap.address || 'SITE_ADDR';
    const pinField  = config.fieldMap.pin      || 'PIN';

    const safe = query.replace(/'/g, "''");
    const where = `UPPER(${addrField}) LIKE UPPER('%${safe}%') OR UPPER(${pinField}) LIKE UPPER('%${safe}%')`;

    return conn.searchByQuery(where, null);
  }

  /* Zoom the map to a parcel's bounds and select it.
   * Useful after a search result is clicked. */
  function focusParcel(feature) {
    window.PARCEL_SELECTION?.select(feature, _currentFips ? window.PARCEL_REGISTRY?.get(_currentFips)?.id : null);
    // Pan map to feature centroid / bounds (requires leafletMap global)
    try {
      if (window.leafletMap && feature.geometry) {
        const bounds = L.geoJSON(feature).getBounds();
        if (bounds.isValid()) window.leafletMap.fitBounds(bounds, { maxZoom: 17, padding: [40, 40] });
      }
    } catch (_) {}
  }

  function _noDataToast(fips) {
    const el = document.getElementById('parcel-layer-status');
    if (el) {
      el.hidden    = false;
      el.className = 'parcel-layer-status parcel-status-hint';
      el.textContent = `No parcel data available for FIPS ${fips}`;
    }
  }

  /* When zoning data finishes loading, refresh the panel so the feasibility
   * section can render (it requires cached zoning data). */
  document.addEventListener('zoning:jurisdiction-loaded', () => {
    window.PARCEL_PANEL?.refresh();
  });

  return { init, onLayerToggle, onCountyChanged, search, focusParcel };
})();
