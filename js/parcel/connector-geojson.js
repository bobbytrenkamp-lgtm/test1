/* js/parcel/connector-geojson.js
 * GeoJSON parcel connector — fetches from a static or dynamic GeoJSON endpoint.
 *
 * Implements the same interface as ArcGISParcelConnector:
 *   fetchViewport(bounds, signal) → GeoJSON FeatureCollection
 *   searchByQuery(query, signal)  → GeoJSON FeatureCollection
 *   fetchById(id, signal)         → GeoJSON FeatureCollection
 *
 * The GeoJSON file is fetched once and cached in memory; subsequent calls
 * filter client-side.  For large files, set config.streaming = true to use
 * a bbox-filtered query parameter if the server supports it.
 *
 * Config fields (in addition to the base registry fields):
 *   serviceUrl  — URL to a GeoJSON FeatureCollection
 *   streaming   — if true, appends ?bbox=W,S,E,N to the URL (default false)
 *   fieldMap    — canonical field id → source property name
 *   fips        — county FIPS (used to set county_fips on each feature)
 */
window.GeoJSONParcelConnector = (function () {
  'use strict';

  class GeoJSONParcelConnector {
    constructor(config) {
      this._config  = config;
      this._cache   = null;   // cached FeatureCollection
      this._loading = null;   // in-flight fetch Promise
      this._revMap  = _buildRevMap(config.fieldMap || {});
    }

    /* Fetch all features within the given Leaflet LatLngBounds.
     * Loads and caches the full GeoJSON then filters client-side. */
    async fetchViewport(bounds, signal) {
      const all = await this._loadAll(signal);
      return _filterBounds(all, bounds);
    }

    /* Client-side text search across address and pin fields */
    async searchByQuery(query, signal) {
      const all = await this._loadAll(signal);
      const q   = String(query || '').toLowerCase();
      if (!q) return all;
      const features = (all.features || []).filter(f => {
        const p = f.properties || {};
        return (String(p.address || '').toLowerCase().includes(q)
             || String(p.pin     || '').toLowerCase().includes(q)
             || String(p.parcel_id || '').toLowerCase().includes(q));
      });
      return { type: 'FeatureCollection', features };
    }

    /* Find a single feature by parcel_id */
    async fetchById(id, signal) {
      const all = await this._loadAll(signal);
      const features = (all.features || []).filter(f =>
        f.properties?.parcel_id === String(id)
      );
      return { type: 'FeatureCollection', features };
    }

    async _loadAll(signal) {
      if (this._cache) return this._cache;

      if (!this._loading) {
        this._loading = fetch(this._config.serviceUrl, { signal })
          .then(r => {
            if (!r.ok) throw new Error(`GeoJSON fetch failed: ${r.status}`);
            return r.json();
          })
          .then(data => {
            const normalized = this._normalize(data);
            this._cache   = normalized;
            this._loading = null;
            return normalized;
          });
      }

      return this._loading;
    }

    _normalize(geojson) {
      const revMap = this._revMap;
      const fips   = String(this._config.fips || '').padStart(5, '0');
      const features = (geojson.features || []).map(f => {
        const raw    = f.properties || {};
        const mapped = {};
        for (const [srcKey, srcVal] of Object.entries(raw)) {
          const canonicalKey = revMap[srcKey] || srcKey.toLowerCase();
          mapped[canonicalKey] = srcVal;
        }
        if (!mapped.parcel_id) mapped.parcel_id = String(raw.OBJECTID || raw.objectid || '');
        if (fips) mapped.county_fips = fips;
        mapped._source = 'geojson';
        return { ...f, properties: mapped };
      });
      return { type: 'FeatureCollection', features };
    }
  }

  /* Build source-name → canonical-id reverse map from fieldMap */
  function _buildRevMap(fieldMap) {
    const rev = {};
    for (const [canonicalId, srcName] of Object.entries(fieldMap)) {
      if (srcName && srcName !== '__computed__') rev[srcName] = canonicalId;
    }
    return rev;
  }

  /* Filter a FeatureCollection to features intersecting the given bounds */
  function _filterBounds(geojson, bounds) {
    if (!bounds) return geojson;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const features = (geojson.features || []).filter(f => {
      const coords = _flatCoords(f.geometry);
      return coords.some(([lng, lat]) =>
        lat >= sw.lat && lat <= ne.lat && lng >= sw.lng && lng <= ne.lng
      );
    });
    return { type: 'FeatureCollection', features };
  }

  function _flatCoords(geom) {
    if (!geom) return [];
    if (geom.type === 'Point') return [geom.coordinates];
    if (geom.type === 'MultiPoint') return geom.coordinates;
    if (geom.type === 'Polygon') return geom.coordinates.flat();
    if (geom.type === 'MultiPolygon') return geom.coordinates.flat(2);
    return [];
  }

  return GeoJSONParcelConnector;
})();
