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

  /* Each entry states what the dataset IS, because the caveat is as
     important as the number. A user who sees "22% floodplain" and does not
     know FEMA maps are often decades old will mis-weigh it, and a user who
     sees "4% wetland" and thinks that is a delineation will be wrong in a
     way that costs money.

     `url` is deliberately null on every entry. This session's network policy
     refused CONNECT to every external host, so not one of these endpoints
     could be verified. An unverified constraint endpoint is worse than none:
     a service that silently returns an empty FeatureCollection renders as
     "0% floodplain — no flood risk mapped here", which is the single most
     dangerous wrong answer this product could give. Layers without a
     verified url are registered as unavailable, so the panel says "not
     checked" rather than "clear".

     Verifying them is the same one-command job the parcel registry already
     uses: probe the endpoint, confirm it returns a real layer definition and
     polygons, then attach the url and a provider here. */
  const PENDING = [
    {
      id: 'fema-flood',
      constraintClass: 'flood',
      label: 'FEMA mapped floodplain',
      source: 'FEMA National Flood Hazard Layer (NFHL)',
      candidateService: 'FEMA NFHL public MapServer (hazard.fema.gov)',
      caveat:
        'FEMA flood maps are regulatory products of varying age — many effective ' +
        'panels are a decade or more old, and unmapped areas are not the same as ' +
        'areas without flood risk. A mapped floodplain affects insurance and ' +
        'permitting; its absence does not certify a site as dry.',
    },
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
