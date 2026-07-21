/* js/parcel/connector-wfs.js
 * OGC Web Feature Service (WFS) parcel connector.
 *
 * Supports WFS 2.0.0 and 1.1.0 with GeoJSON output.
 * Implements the same interface as ArcGISParcelConnector and GeoJSONParcelConnector:
 *   fetchViewport(bounds, signal) → GeoJSON FeatureCollection
 *   searchByQuery(cql, signal)    → GeoJSON FeatureCollection  (CQL_FILTER parameter)
 *   fetchById(id, signal)         → GeoJSON FeatureCollection
 *
 * Config fields (in addition to base registry fields):
 *   serviceUrl  — WFS endpoint base URL (e.g. https://host/geoserver/ows)
 *   layerName   — WFS TYPENAMES value (e.g. "parcel_data:parcels")
 *   wfsVersion  — '2.0.0' (default) or '1.1.0'
 *   idField     — source property used as parcel_id (default: objectid)
 *   crsCode     — CRS for bbox parameter (default: EPSG:4326)
 *   fieldMap    — canonical field id → source property name
 *   fips        — county FIPS
 */
window.WFSParcelConnector = (function () {
  'use strict';

  class WFSParcelConnector {
    constructor(config) {
      this._config  = config;
      this._version = config.wfsVersion || '2.0.0';
      this._layer   = config.layerName  || '';
      this._crs     = config.crsCode    || 'EPSG:4326';
      this._idField = config.idField    || 'objectid';
      this._revMap  = _buildRevMap(config.fieldMap || {});
    }

    async fetchViewport(bounds, signal) {
      const sw  = bounds.getSouthWest();
      const ne  = bounds.getNorthEast();
      // WFS 2.0.0 BBOX order: minLat,minLng,maxLat,maxLng,CRS
      // WFS 1.1.0 BBOX order: minLng,minLat,maxLng,maxLat,CRS
      const bbox = this._version === '2.0.0'
        ? `${sw.lat},${sw.lng},${ne.lat},${ne.lng},${this._crs}`
        : `${sw.lng},${sw.lat},${ne.lng},${ne.lat},${this._crs}`;

      const url = this._buildUrl({
        REQUEST: 'GetFeature',
        BBOX:    bbox,
        COUNT:   String(this._config.maxFeatures || 500),
      });

      return this._fetch(url, signal);
    }

    /* cql is a CQL_FILTER string, e.g. "strToUpperCase(SITE_ADDR) LIKE '%MAIN%'" */
    async searchByQuery(cql, signal) {
      const url = this._buildUrl({
        REQUEST:    'GetFeature',
        CQL_FILTER: cql,
        COUNT:      '200',
      });
      return this._fetch(url, signal);
    }

    async fetchById(id, signal) {
      const src = this._config.fieldMap?.[this._idField] || this._idField;
      return this.searchByQuery(`${src} = ${id}`, signal);
    }

    _buildUrl(extra) {
      const base = this._config.serviceUrl.replace(/\?.*$/, '');
      const params = new URLSearchParams({
        SERVICE:     'WFS',
        VERSION:     this._version,
        TYPENAMES:   this._layer,
        outputFormat:'application/json',
        srsName:     this._crs,
        ...extra,
      });
      return `${base}?${params.toString()}`;
    }

    async _fetch(url, signal) {
      const res = await fetch(url, signal ? { signal } : {});
      if (!res.ok) throw new Error(`WFS request failed: ${res.status} ${res.statusText}`);
      const data = await res.json();
      return this._normalize(data);
    }

    _normalize(geojson) {
      const revMap = this._revMap;
      const fips   = String(this._config.fips || '').padStart(5, '0');
      const features = (geojson.features || []).map(f => {
        const raw    = f.properties || {};
        const mapped = {};
        for (const [srcKey, srcVal] of Object.entries(raw)) {
          const canonKey = revMap[srcKey] || revMap[srcKey.toLowerCase()] || srcKey.toLowerCase();
          mapped[canonKey] = srcVal;
        }
        if (!mapped.parcel_id) {
          mapped.parcel_id = String(raw[this._idField] || raw[this._idField?.toLowerCase()] || f.id || '');
        }
        if (fips) mapped.county_fips = fips;
        mapped._source = 'wfs';
        return { ...f, properties: mapped };
      });
      return { type: 'FeatureCollection', features };
    }
  }

  function _buildRevMap(fieldMap) {
    const rev = {};
    for (const [canonId, srcName] of Object.entries(fieldMap)) {
      if (srcName && srcName !== '__computed__') {
        rev[srcName]               = canonId;
        rev[srcName.toLowerCase()] = canonId;
      }
    }
    return rev;
  }

  return WFSParcelConnector;
})();
