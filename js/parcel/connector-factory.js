/* js/parcel/connector-factory.js
 * window.PARCEL_CONNECTOR_FACTORY — single source of truth for turning a
 * registry.js jurisdiction config into the right connector instance.
 *
 * Previously this switch lived only inside renderer.js's private
 * _makeConnector(), and js/parcel/index.js's search() separately hardcoded
 * `new window.ArcGISParcelConnector(config)` regardless of the jurisdiction's
 * actual connector type. Every one of the 59 production jurisdictions is
 * 'arcgis' today, so that hardcode never misbehaved in practice, but it was
 * a real landmine: the moment a 'geojson' or 'wfs' jurisdiction is added,
 * clicking search on it would silently build the wrong connector and send
 * ArcGIS-shaped queries at a non-ArcGIS service. Factoring the switch out
 * here means both call sites can never drift apart again.
 *
 * Depends on: window.ArcGISParcelConnector, window.GeoJSONParcelConnector,
 * window.WFSParcelConnector (all optional -- falls back to whichever of the
 * three is actually loaded).
 */
window.PARCEL_CONNECTOR_FACTORY = (function () {
  'use strict';

  function make(config) {
    switch (config && config.connector) {
      case 'geojson': return new window.GeoJSONParcelConnector(config);
      case 'wfs':     return new window.WFSParcelConnector(config);
      case 'arcgis':
      default:        return new window.ArcGISParcelConnector(config);
    }
  }

  return { make };
})();
