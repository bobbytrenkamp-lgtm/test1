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
    window.PARCEL_DRAW_TOOL?.init(map);
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
    } else if (!fips) {
      _noDataToast(null);
    } else if (!window.PARCEL_REGISTRY?.has(fips)) {
      _noDataToast(fips);
    }
  }

  /* True once the parcels layer is on AND the selected county actually has
   * real parcel coverage — the signal map.js uses to stop washing that
   * county in the restrictions/suitability choropleth fill so satellite
   * imagery and parcel boundaries stay legible underneath. */
  function isActiveWithData() {
    return !!(_layerActive && _currentFips && window.PARCEL_REGISTRY?.has(_currentFips));
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

    /* Connector type is picked via the shared factory, not hardcoded to
       ArcGIS -- every one of the 59 production jurisdictions is 'arcgis'
       today so this was previously dormant, but a jurisdiction added with
       connector: 'geojson' or 'wfs' would otherwise have silently gotten an
       ArcGIS-shaped query built against a non-ArcGIS service the moment a
       user searched it. */
    const conn = window.PARCEL_CONNECTOR_FACTORY.make(config);

    /* connector-geojson.js's searchByQuery() does not take a WHERE/CQL
       clause at all -- it does its own client-side substring match against
       the parcel's already-normalized address/pin/parcel_id fields (see
       that file). Passing it a raw search term, not a constructed clause,
       is what it actually expects. */
    if (config.connector === 'geojson') {
      return conn.searchByQuery(query, null);
    }

    /* Build the WHERE/CQL from fields this service actually has. The
       previous version fell back to hardcoded 'SITE_ADDR'/'PIN' when a
       mapping was absent, which sends the server an unknown column and gets
       the whole query rejected — so a missing address field broke PIN
       search too, even though the PIN field was fine. Three of the five
       registry services are boundary layers with no address column at all,
       so that is the common case, not an edge case. */
    const safe   = query.replace(/'/g, "''");
    const fields = ['address', 'pin', 'parcel_id']
      .map(k => config.fieldMap[k])
      .filter(f => f && f !== '__computed__');

    if (!fields.length) return null;   // nothing searchable on this source
    const uniqueFields = [...new Set(fields)];

    if (config.connector === 'wfs') {
      /* WFS's CQL_FILTER dialect (see connector-wfs.js's own documented
         example: "strToUpperCase(SITE_ADDR) LIKE '%MAIN%'") -- a different
         function name and quoting convention than ArcGIS's WHERE clause. */
      const cqlClause = f => `strToUpperCase(${f}) LIKE '%${safe.toUpperCase()}%'`;
      return conn.searchByQuery(uniqueFields.map(cqlClause).join(' OR '), null);
    }

    /* ArcGIS (default): SQL-92-style WHERE clause. Quote the identifier
       because joined layers expose table-qualified names
       (GISPROD.VECTOR.Parcels.GPIN). */
    const arcgisClause = f => `UPPER("${f}") LIKE UPPER('%${safe}%')`;
    return conn.searchByQuery(uniqueFields.map(arcgisClause).join(' OR '), null);
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

  /* fips === null means "no county selected yet"; a real (uncovered) fips
   * means the selected county just isn't in the pilot. Both cases render
   * an identically-empty parcel layer, so both need an explanation —
   * silence here is exactly what reads as "the toggle doesn't work." */
  function _noDataToast(fips) {
    const coverage = (window.PARCEL_REGISTRY?.all() || []).map(j => j.name).join(', ');
    const msg = fips
      ? `No parcel data for this county. Parcel Layer currently covers: ${coverage || 'a small VA/MD pilot set'}.`
      : `Select a county first — Parcel Layer covers: ${coverage || 'a small VA/MD pilot set'}.`;
    if (window.showMapToast) {
      window.showMapToast(msg, 6000);
    }
    // Keep the low-key persistent pill too, for anyone who missed the toast.
    const el = document.getElementById('parcel-layer-status');
    if (el) {
      el.hidden    = false;
      el.className = 'parcel-layer-status parcel-status-hint';
      el.textContent = fips ? `No parcel data available for FIPS ${fips}` : 'Select a county with parcel coverage';
    }
  }

  /* When zoning data finishes loading, refresh the panel so the feasibility
   * section can render (it requires cached zoning data). */
  document.addEventListener('zoning:jurisdiction-loaded', () => {
    window.PARCEL_PANEL?.refresh();
  });

  return { init, onLayerToggle, onCountyChanged, search, focusParcel, isActiveWithData };
})();
