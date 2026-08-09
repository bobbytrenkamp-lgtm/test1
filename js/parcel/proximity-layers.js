/* js/parcel/proximity-layers.js
 * Registers the concrete infrastructure layers with window.PARCEL_PROXIMITY.
 *
 * Split from proximity.js so the engine stays generic and this file stays a
 * declaration of what data we actually have — including, explicitly, what we
 * do not.
 *
 * FREE SOURCES ONLY. Every layer here is either repository data built from
 * public sources or a public government service. Nothing here can bill anyone.
 *
 * Depends on: window.PARCEL_PROXIMITY (required).
 */
(function () {
  'use strict';

  const P = window.PARCEL_PROXIMITY;
  if (!P) {
    console.warn('[parcel] proximity-layers.js loaded before proximity.js — no layers registered');
    return;
  }

  /* ── Data centers (repository data) ──────────────────────────────────────
   *
   * The one layer that is fully available today and cannot fail: it is built
   * from data/facilities_index.json, already loaded for the map's facility
   * layer. Nearby data centers are the single most predictive contextual
   * signal for a data center site — they indicate that power, fiber, and a
   * permitting path already exist in that corridor, which is why operators
   * cluster. */
  P.registerLayer({
    id: 'data-centers',
    category: 'market',
    label: 'Existing data centers',
    measures: 'Straight-line distance to known data center facilities.',
    source: 'data/facilities_index.json (compiled from public sources)',
    provider: async () => {
      const facilities = await loadFacilities();
      return facilities.map(f => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [f.longitude, f.latitude] },
        properties: {
          name: f.name,
          operator: f.operator,
          status: f.operational_status,
          facilityType: f.facility_type,
        },
      }));
    },
  });

  /* Cached because a parcel click should not re-parse a 4,000-entry index,
     and because several layers may want it. Deliberately module-scoped
     rather than global: nothing outside this file should depend on it. */
  let _facilitiesPromise = null;
  function loadFacilities() {
    if (_facilitiesPromise) return _facilitiesPromise;
    _facilitiesPromise = (async () => {
      // Reuse whatever the map already loaded rather than fetching twice.
      if (window.FACILITIES && Array.isArray(window.FACILITIES.all)) return window.FACILITIES.all;
      if (Array.isArray(window.__FACILITIES_INDEX)) return window.__FACILITIES_INDEX;

      const res = await fetch('data/facilities_index.json');
      if (!res.ok) throw new Error(`facilities index HTTP ${res.status}`);
      const json = await res.json();
      return Array.isArray(json) ? json : (json.facilities || []);
    })().then(list => list.filter(f =>
      Number.isFinite(f.latitude) && Number.isFinite(f.longitude)));

    // A failed load must not poison the cache forever — the next parcel click
    // should be allowed to retry.
    _facilitiesPromise.catch(() => { _facilitiesPromise = null; });
    return _facilitiesPromise;
  }

  /* ── Electric substations + transmission lines (repository data) ─────────
   *
   * Both are already fetched weekly from HIFLD by data/fetch_infrastructure.py
   * and rendered on the map (js/map.js reads the same file for its power/
   * transmission layers) — they were simply never connected to the parcel
   * proximity engine before. This is the "engine exists, data exists, but
   * nothing wires them together" gap the data catalog audit surfaced; there
   * is no new data source here, only a new consumer of one that already runs.
   *
   * SUBSTATION COVERAGE CAVEAT — READ BEFORE CHANGING THIS.
   * The configured HIFLD substations endpoint is not the original national
   * layer; it is a third-party mirror the original service's retirement
   * forced a switch to, and it returns roughly 25 US substations after the
   * >=69kV filter — not the tens of thousands the real HIFLD dataset has
   * (see fetch_infrastructure.py's header comment and
   * data/catalog/dataset_registry.json's "substations" entry for the full
   * history). That is real, correctly-fetched data, not fabricated — but
   * "no substation within 10 miles" from this layer is not strong evidence
   * of anything, because most of the country simply has no record loaded.
   * The label says so explicitly rather than reading like a confident
   * distance measurement with normal national coverage. */
  P.registerLayer({
    id: 'substations',
    category: 'power',
    label: 'Electric substations',
    measures: 'Straight-line distance to mapped substation locations, from a nationally ' +
              'INCOMPLETE dataset (~25 US records after the voltage filter, not the full ' +
              'HIFLD layer). Absence of a nearby result is not evidence there is no substation ' +
              'nearby. Says nothing about available capacity.',
    source: 'HIFLD Electric Substations via a third-party mirror (see fetch_infrastructure.py)',
    provider: async () => {
      const layers = await loadInfrastructureLayers();
      return (layers.power_infrastructure || []).map(s => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: { name: s.name, voltageKv: s.voltage_kv, assetType: s.type, county_fips: s.county_fips },
      }));
    },
  });

  P.registerLayer({
    id: 'transmission-lines',
    category: 'power',
    label: 'Transmission lines',
    measures: 'Straight-line distance to the nearest mapped transmission line. Says nothing ' +
              'about headroom, available capacity, or interconnect feasibility.',
    source: 'HIFLD Electric Power Transmission Lines',
    provider: async () => {
      const layers = await loadInfrastructureLayers();
      return (layers.transmission_lines || [])
        .filter(t => Array.isArray(t.path) && t.path.length >= 2)
        .map(t => ({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: t.path },
          properties: { name: t.name, voltageKv: t.voltage_kv, owner: t.owner },
        }));
    },
  });

  let _infrastructurePromise = null;
  function loadInfrastructureLayers() {
    if (_infrastructurePromise) return _infrastructurePromise;
    _infrastructurePromise = (async () => {
      const res = await fetch('data/sample_layers.json');
      if (!res.ok) throw new Error(`infrastructure layers HTTP ${res.status}`);
      return res.json();
    })();
    _infrastructurePromise.catch(() => { _infrastructurePromise = null; });
    return _infrastructurePromise;
  }

  /* ── Deliberately unavailable ────────────────────────────────────────────
   *
   * These are recorded rather than omitted. A missing fiber row invites the
   * reader to assume there is no fiber nearby; an explicit "we cannot tell
   * you this, here is why" does not. */

  P.registerUnavailable('fiber', 'telecom',
    'No free, reliable nationwide dataset of actual fiber routes exists. The FCC ' +
    'broadband data describes marketed residential availability, not lit fiber a ' +
    'facility could take service from, and presenting it as fiber proximity would ' +
    'be misleading. Confirm fiber with the carriers serving the market.');

  P.registerUnavailable('utility-capacity', 'power',
    'Available capacity at a substation or on a line is not published in any free ' +
    'public dataset, and cannot be inferred from proximity. Only the serving ' +
    'utility can answer it, through an interconnection study.');

  /* ── Interstate highways (Census TIGERweb, live query) ───────────────────
   *
   * Verified live 2026-08-09 via a real GitHub Actions dispatch
   * (probe_national_source.yml): layer 2 ("Primary Roads") of the Census
   * Bureau's own TIGERweb Transportation MapServer returned real LineString
   * features with a confirmed RTTYP field ('I' = Interstate, matching the
   * MAF/TIGER route-type code) plus BASENAME/NAME/MTFCC. Filtered
   * server-side to RTTYP='I' so this layer only ever returns interstates,
   * not every primary/state road the layer also carries.
   *
   * The proximity engine's own MAX_SEARCH_MILES (50) is used to size the
   * query bounding box around the parcel -- querying the whole country and
   * filtering client-side would be enormously wasteful for a road network
   * this dense. */
  const TIGERWEB_PRIMARY_ROADS_URL =
    'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Transportation/MapServer/2/query';
  const INTERSTATE_SEARCH_MILES = 50;

  /* Degrees-per-mile is not constant (longitude degrees shrink toward the
     poles), so the buffer is computed from the parcel's own latitude rather
     than a single hardcoded constant. Deliberately generous (padded via
     Math.ceil-free simple division, not a tight bound) -- a buffer slightly
     larger than the true search radius only means a few extra features get
     fetched and then correctly discarded by the engine's own maxKm filter;
     a buffer too small would silently miss the actual nearest interstate. */
  function milesToDegreeBuffer(miles, latDeg) {
    const latBuffer = miles / 69;
    const lonBuffer = miles / (69 * Math.max(0.15, Math.cos(latDeg * Math.PI / 180)));
    return { latBuffer, lonBuffer };
  }

  P.registerLayer({
    id: 'interstates',
    category: 'transportation',
    label: 'Interstate highways',
    measures: 'Straight-line distance to the interstate route, not drive time or the nearest interchange.',
    source: 'US Census Bureau TIGERweb (Primary Roads, filtered to RTTYP=Interstate)',
    provider: async ({ parcelGeometry }) => {
      const geo = window.PARCEL_GEO;
      const box = geo && geo.bounds(parcelGeometry);
      if (!box) return [];
      const [minLon, minLat, maxLon, maxLat] = box;
      const centerLat = (minLat + maxLat) / 2;
      const { latBuffer, lonBuffer } = milesToDegreeBuffer(INTERSTATE_SEARCH_MILES, centerLat);
      const params = new URLSearchParams({
        where: "RTTYP='I'",
        geometry: [minLon - lonBuffer, minLat - latBuffer, maxLon + lonBuffer, maxLat + latBuffer].join(','),
        geometryType: 'esriGeometryEnvelope',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'BASENAME,NAME,RTTYP',
        outSR: '4326',
        f: 'geojson',
        resultRecordCount: '500',
      });
      const res = await fetch(`${TIGERWEB_PRIMARY_ROADS_URL}?${params.toString()}`);
      if (!res.ok) throw new Error(`interstates query HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.error) {
        throw new Error(`interstates query error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      return (data.features || []).map(f => ({
        ...f,
        properties: { ...f.properties, name: f.properties && (f.properties.NAME || f.properties.BASENAME) },
      }));
    },
  });

  /* ── California middle-mile broadband corridor (SCAG/CPUC, live query) ───
   *
   * Verified live 2026-08-09 via a real GitHub Actions dispatch
   * (probe_national_source.yml): SCAG's Broadband MapServer layer 2
   * ("CPUCAnchorBuilds") returned real polyline features with ROUTE/
   * ROUTE_ID/ALIGNMENT/STATUS/MILES_GIS/BB4ALL_ID fields. This is CPUC's
   * own shapefile of proposed/selected middle-mile corridor alignments
   * along the State Highway Network for California's Federal Funding
   * Account broadband initiative, republished by SCAG (Southern
   * California Association of Governments) for its member counties.
   *
   * TWO CAVEATS THAT MATTER MORE THAN THE DATA ITSELF:
   * 1. REGIONAL ONLY. This service only carries SCAG's six-county area
   *    (Los Angeles, Orange, Riverside, San Bernardino, Ventura,
   *    Imperial). Everywhere else in the country this layer will
   *    correctly return zero features -- that means "not covered by
   *    this regional dataset", not "no middle-mile buildout planned
   *    there". The label says so explicitly.
   * 2. NOT LIT FIBER. The STATUS/YEAR fields describe a planning-stage
   *    corridor alignment CPUC has selected to build along, not
   *    as-built, in-service fiber a facility could take service from
   *    today. That is a materially different (weaker) claim than the
   *    nationwide `fiber` layer above stays unavailable for -- no free
   *    as-built dataset exists anywhere, and conflating "planned
   *    corridor" with "lit fiber" would be exactly the kind of overclaim
   *    this project avoids.
   *
   * A same-tier Maryland candidate (OMBN, the state's own as-built
   * inter-county fiber network) was dispatched twice against
   * geodata.md.gov/appdata and returned HTTP 503 both times -- it is
   * documented in data/catalog/dataset_registry.json but not wired in
   * until it is confirmed reachable. */
  const SCAG_MIDDLE_MILE_URL =
    'https://maps.scag.ca.gov/scaggis/rest/services/Broadband/Broadband/MapServer/2/query';

  P.registerLayer({
    id: 'ca-middle-mile-corridor',
    category: 'telecom',
    label: 'CA middle-mile broadband corridor (SCAG region only)',
    measures: 'Straight-line distance to the nearest CPUC-selected middle-mile broadband ' +
              'corridor alignment. REGIONAL COVERAGE ONLY: Los Angeles, Orange, Riverside, ' +
              'San Bernardino, Ventura, and Imperial counties (the SCAG region). A zero-result ' +
              'answer elsewhere means "outside this regional dataset\'s coverage", not "no ' +
              'corridor exists". This is a PLANNED/SELECTED corridor alignment, not confirmed ' +
              'as-built lit fiber -- confirm with CPUC or the carrier before relying on it.',
    source: 'California Public Utilities Commission middle-mile corridor shapefile, via SCAG',
    provider: async ({ parcelGeometry }) => {
      const geo = window.PARCEL_GEO;
      const box = geo && geo.bounds(parcelGeometry);
      if (!box) return [];
      const [minLon, minLat, maxLon, maxLat] = box;
      const centerLat = (minLat + maxLat) / 2;
      const { latBuffer, lonBuffer } = milesToDegreeBuffer(P.MAX_SEARCH_MILES, centerLat);
      const params = new URLSearchParams({
        where: '1=1',
        geometry: [minLon - lonBuffer, minLat - latBuffer, maxLon + lonBuffer, maxLat + latBuffer].join(','),
        geometryType: 'esriGeometryEnvelope',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'ROUTE,ROUTE_ID,ALIGNMENT,STATUS,MILES_GIS,BB4ALL_ID,YEAR',
        outSR: '4326',
        f: 'geojson',
        resultRecordCount: '500',
      });
      const res = await fetch(`${SCAG_MIDDLE_MILE_URL}?${params.toString()}`);
      if (!res.ok) throw new Error(`middle-mile corridor query HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.error) {
        throw new Error(`middle-mile corridor query error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      return (data.features || []).map(f => ({
        ...f,
        properties: { ...f.properties, name: f.properties && (f.properties.ROUTE || f.properties.ROUTE_ID) },
      }));
    },
  });

  // Exported for tests.
  window.PARCEL_PROXIMITY_LAYERS = {
    loadFacilities, loadInfrastructureLayers,
    _resetCache() { _facilitiesPromise = null; _infrastructurePromise = null; },
  };
})();
