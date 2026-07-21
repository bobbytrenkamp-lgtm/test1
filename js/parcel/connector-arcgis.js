/* js/parcel/connector-arcgis.js
 * ArcGIS FeatureServer connector for parcel data.
 *
 * Fetches parcels from an ArcGIS REST FeatureServer using the /query endpoint,
 * which returns GeoJSON directly when f=geojson (ArcGIS Server 10.4+).
 *
 * Usage:
 *   const conn = new ArcGISParcelConnector(registry.get('51107'));
 *   const geojson = await conn.fetchViewport(leafletMap.getBounds(), abortSignal);
 */
window.ArcGISParcelConnector = (function () {
  'use strict';

  class ArcGISParcelConnector {
    constructor(config) {
      this._config = config;
    }

    /* Fetch all parcels intersecting the given Leaflet LatLngBounds.
     * Returns a normalized GeoJSON FeatureCollection with canonical field names.
     * Throws on network error or ArcGIS service error. */
    async fetchViewport(bounds, signal) {
      const url = this._buildQueryUrl({
        geometry: `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`,
        geometryType:  'esriGeometryEnvelope',
        spatialRel:    'esriSpatialRelIntersects',
        where:         '1=1',
        resultRecordCount: this._config.maxFeatures || 500,
        signal,
      });

      return this._execute(url, signal);
    }

    /* Search parcels by address or PIN using a WHERE clause.
     * Returns a normalized GeoJSON FeatureCollection. */
    async searchByQuery(whereClause, signal) {
      const url = this._buildQueryUrl({
        where:             whereClause,
        resultRecordCount: 10,
      });
      return this._execute(url, signal);
    }

    /* Fetch a single parcel by its source parcel ID field value. */
    async fetchById(id, signal) {
      const pinField = this._config.fieldMap.pin || 'PIN';
      const where    = `${pinField} = '${String(id).replace(/'/g, "''")}'`;
      return this.searchByQuery(where, signal);
    }

    _buildQueryUrl(opts) {
      const c   = this._config;
      const url = new URL(c.serviceUrl + '/query');
      const p   = url.searchParams;

      if (opts.where)        p.set('where', opts.where);
      if (opts.geometry)     p.set('geometry', opts.geometry);
      if (opts.geometryType) p.set('geometryType', opts.geometryType);
      if (opts.spatialRel)   p.set('spatialRel',   opts.spatialRel);

      p.set('inSR',             '4326');
      p.set('outSR',            '4326');
      p.set('outFields',        c.outFields ? c.outFields.join(',') : '*');
      p.set('returnGeometry',   'true');
      p.set('resultRecordCount', String(opts.resultRecordCount || 500));
      p.set('f',                'geojson');

      return url.toString();
    }

    async _execute(url, signal) {
      const res = await fetch(url, signal ? { signal } : {});

      if (!res.ok) {
        throw new Error(`Parcel service HTTP ${res.status}: ${res.statusText}`);
      }

      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error('Parcel service returned non-JSON response');
      }

      if (json.error) {
        const msg = json.error.message || JSON.stringify(json.error);
        throw new Error(`ArcGIS error: ${msg}`);
      }

      return this._normalize(json);
    }

    /* Remap source attribute names to canonical field names.
     * Unknown source fields are lowercased and passed through unchanged. */
    _normalize(geojson) {
      const { fieldMap, fips } = this._config;

      // Build reverse map: source attr name → canonical id
      const reverse = {};
      for (const [canonical, source] of Object.entries(fieldMap)) {
        if (source && source !== '__computed__') {
          reverse[source.toUpperCase()] = canonical;
        }
      }

      const features = (geojson.features || []).map(f => {
        const raw   = f.properties || {};
        const props = {};

        for (const [srcKey, value] of Object.entries(raw)) {
          const canonicalKey = reverse[srcKey.toUpperCase()] || srcKey.toLowerCase();
          props[canonicalKey] = value;
        }

        // Computed fields
        props.county_fips = fips;
        props._source     = 'arcgis';

        // Guarantee parcel_id is always set
        if (!props.parcel_id) {
          props.parcel_id = props.pin
            || props.objectid
            || String(f.id != null ? f.id : '');
        }

        return { ...f, properties: props };
      });

      return { type: 'FeatureCollection', features };
    }
  }

  return ArcGISParcelConnector;
})();
