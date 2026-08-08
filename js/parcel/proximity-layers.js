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
   * Electric and transportation layers come from federal open data (HIFLD /
   * BTS / USGS). Their service endpoints are NOT hardcoded here yet: this
   * session could not reach external hosts to verify a single one, and an
   * unverified URL that silently returns nothing looks identical to a site
   * with no infrastructure nearby — the worst possible failure for a layer
   * whose entire job is answering "is there power near here".
   *
   * They are declared as configuration below with `provider: null` and are
   * skipped by the engine until an endpoint is verified and attached, the
   * same discipline the parcel registry already applies to county services.
   */
  const PENDING_VERIFICATION = [
    {
      id: 'substations', category: 'power', label: 'Electric substations',
      measures: 'Straight-line distance to mapped substation locations. Says nothing about available capacity.',
      candidateSource: 'HIFLD Electric Substations (public federal open data)',
    },
    {
      id: 'transmission-lines', category: 'power', label: 'Transmission lines',
      measures: 'Straight-line distance to the nearest mapped transmission line. Says nothing about headroom or interconnect feasibility.',
      candidateSource: 'HIFLD Electric Power Transmission Lines (public federal open data)',
    },
    {
      id: 'interstates', category: 'transportation', label: 'Interstate highways',
      measures: 'Straight-line distance to the interstate route, not drive time or the nearest interchange.',
      candidateSource: 'BTS National Highway Planning Network (public federal open data)',
    },
  ];

  P.PENDING_VERIFICATION = PENDING_VERIFICATION;

  // Exported for tests.
  window.PARCEL_PROXIMITY_LAYERS = { loadFacilities, PENDING_VERIFICATION, _resetCache() { _facilitiesPromise = null; } };
})();
