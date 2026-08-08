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

  /* ── Registered but pending endpoint verification ────────────────────────
   *
   * Substations and transmission lines used to live in this list; they are
   * wired to real (if incomplete, in the substation case) data above and
   * removed from here. Roads/transit remain pending: no interstate/major-road
   * dataset exists anywhere in the repository yet (confirmed by the
   * data_catalog.json audit — "roads" has zero records), and an unverified
   * URL that silently returns nothing looks identical to a site with no
   * infrastructure nearby, the worst possible failure for a layer whose
   * entire job is answering "how far to the interstate".
   *
   * Declared as configuration with `provider: null` and skipped by the
   * engine until a real dataset is attached, the same discipline the parcel
   * registry already applies to county services.
   */
  const PENDING_VERIFICATION = [
    {
      id: 'interstates', category: 'transportation', label: 'Interstate highways',
      measures: 'Straight-line distance to the interstate route, not drive time or the nearest interchange.',
      candidateSource: 'BTS National Highway Planning Network (public federal open data)',
    },
  ];

  P.PENDING_VERIFICATION = PENDING_VERIFICATION;

  // Exported for tests.
  window.PARCEL_PROXIMITY_LAYERS = {
    loadFacilities, loadInfrastructureLayers, PENDING_VERIFICATION,
    _resetCache() { _facilitiesPromise = null; _infrastructurePromise = null; },
  };
})();
