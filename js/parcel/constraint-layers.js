/* js/parcel/constraint-layers.js
 * Declares the concrete constraint layers for window.PARCEL_CONSTRAINTS.
 *
 * Split from constraints.js so the engine stays generic and this file stays
 * a declaration of what we check, what each dataset actually means, and
 * what we deliberately do not check.
 *
 * FREE SOURCES ONLY. FEMA, USFWS, USGS, and PAD-US all publish open ArcGIS
 * services at no cost with no key. Nothing here can bill anyone.
 *
 * Depends on: window.PARCEL_CONSTRAINTS (required).
 */
(function () {
  'use strict';

  const C = window.PARCEL_CONSTRAINTS;
  if (!C) {
    console.warn('[parcel] constraint-layers.js loaded before constraints.js — no layers registered');
    return;
  }

  /* Live ArcGIS REST query against a parcel's bounding box. Shared by every
     verified polygon-constraint layer below so each one only has to state
     its own service URL and output fields, not reimplement the query. Real
     intersection is computed downstream by constraints.js's own clipper —
     this only needs to fetch candidate features near the parcel, using the
     envelope (not the exact parcel shape) as the spatial filter, same as
     ArcGIS REST's own recommended pattern for a client too small to run a
     full geometry-based query. */
  async function queryArcGISPolygons(serviceUrl, parcelGeometry, outFields, extraWhere) {
    const geo = window.PARCEL_GEO;
    const box = geo && geo.bounds(parcelGeometry);
    if (!box) return [];
    const params = new URLSearchParams({
      geometry: box.join(','),
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: outFields,
      outSR: '4326',
      f: 'geojson',
      where: extraWhere || '1=1',
    });
    const res = await fetch(`${serviceUrl}?${params.toString()}`);
    if (!res.ok) throw new Error(`constraint query HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.error) {
      throw new Error(`constraint query error: ${(data.error.message) || JSON.stringify(data.error)}`);
    }
    return data.features || [];
  }

  /* FEMA National Flood Hazard Layer -- verified live 2026-08-08 via a real
     GitHub Actions dispatch (this sandbox has no outbound network to
     third-party/government hosts, so this was confirmed by an actual query,
     not assumed). Real confirmed fields: FLD_ZONE, ZONE_SUBTY, SFHA_TF
     (Special Flood Hazard Area true/false), STATIC_BFE (base flood
     elevation), SOURCE_CIT. Layer 28 is the "Flood Hazard Zones" polygon
     layer on FEMA's own hazards.fema.gov MapServer. */
  const FEMA_NFHL_URL = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query';

  C.registerLayer({
    id: 'fema-flood',
    constraintClass: 'flood',
    label: 'FEMA mapped floodplain',
    source: 'FEMA National Flood Hazard Layer (NFHL)',
    sourceUpdatedAt: null,  // FEMA panels are updated per-county on their own schedule; no single vintage applies
    caveat:
      'FEMA flood maps are regulatory products of varying age — many effective ' +
      'panels are a decade or more old, and unmapped areas are not the same as ' +
      'areas without flood risk. A mapped floodplain affects insurance and ' +
      'permitting; its absence does not certify a site as dry.',
    provider: async ({ parcelGeometry }) =>
      queryArcGISPolygons(FEMA_NFHL_URL, parcelGeometry, 'FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,SOURCE_CIT'),
  });

  /* Each entry below states what the dataset IS, because the caveat is as
     important as the number. A user who sees "4% wetland" and thinks that
     is a delineation will be wrong in a way that costs money.

     `url` is deliberately null on every remaining entry. Live-verifying an
     ArcGIS service from a sandbox with no outbound network requires a real
     GitHub Actions dispatch per candidate (the same process that verified
     fema-flood above) -- NWI and PAD-US candidate URLs were dispatched but
     returned errors (HTTP 400/502/timeout) rather than confirmed data, so
     they remain unavailable rather than guessed-working. An unverified
     constraint endpoint is worse than none: a service that silently returns
     an empty FeatureCollection renders as "0% wetland — no wetlands mapped
     here", which is the single most dangerous wrong answer this product
     could give. Layers without a verified, working response are registered
     as unavailable, so the panel says "not checked" rather than "clear". */
  const PENDING = [
    {
      id: 'nwi-wetlands',
      constraintClass: 'wetland',
      label: 'Mapped wetlands',
      source: 'USFWS National Wetlands Inventory (NWI)',
      candidateService: 'USFWS NWI public MapServer',
      caveat:
        'The National Wetlands Inventory is a mapping product, explicitly NOT a ' +
        'jurisdictional determination. Only a delineation accepted by the Corps ' +
        'establishes regulated wetland boundaries. NWI both misses small wetlands ' +
        'and maps areas that are not jurisdictional.',
    },
    {
      id: 'protected-lands',
      constraintClass: 'protected',
      label: 'Protected / conservation lands',
      source: 'USGS Protected Areas Database of the United States (PAD-US)',
      candidateService: 'USGS PAD-US public MapServer',
      caveat:
        'PAD-US records public and conservation land holdings and easements it ' +
        'knows about. Private conservation easements are frequently absent, so ' +
        'no intersection here does not mean a parcel is unencumbered.',
    },
  ];

  for (const layer of PENDING) {
    C.registerUnavailable(layer.id, layer.constraintClass,
      `${layer.label}: endpoint not yet verified, so this layer is not checked. ` +
      `Candidate source: ${layer.source}. Reporting an unverified service as "0% ` +
      `constrained" would be indistinguishable from a genuinely clear parcel, ` +
      `which is why this reports "not checked" instead.`);
  }

  /* Explicitly out of scope rather than merely missing. */
  C.registerUnavailable('steep-slope', 'slope',
    'Slope is derivable from public elevation data (USGS 3DEP) but is not a ' +
    'published constraint polygon layer. Deriving it per parcel needs a raster ' +
    'pipeline that does not exist yet; a placeholder would imply we had checked.');

  C.registerUnavailable('easements', 'other',
    'Utility and access easements are recorded at the county deed level and are ' +
    'not published as a queryable spatial layer in any free nationwide dataset. ' +
    'They must be found in a title search.');

  window.PARCEL_CONSTRAINT_LAYERS = { PENDING };
})();
