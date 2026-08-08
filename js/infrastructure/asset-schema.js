/* js/infrastructure/asset-schema.js
 * Browser-side mirror of data/infrastructure_asset_schema.py's shared
 * vocabulary -- the enums a rendering/filtering UI needs synchronously
 * (an evidence-tier badge, an asset-type filter) without an async fetch.
 *
 * data/infrastructure_asset_schema.py is the canonical source; this file's
 * constants are checked against it by
 * tests/test_infrastructure_asset_schema_sync.mjs (which shells out to
 * `python3 -m data.infrastructure_asset_schema --dump-enums` and diffs the
 * result), the same drift guard js/parcel/registry.js's connector-type enum
 * already gets from check_registry_integrity.mjs. If you change a value
 * here, change it there too, or that test will fail.
 */
window.INFRA_ASSET_SCHEMA = (function () {
  'use strict';

  const ASSET_TYPES = [
    'substation',
    'transmission_line',
    'power_plant',
    'fiber_segment',
    'water_facility',
    'wastewater_facility',
    'utility_territory',
  ];

  const EVIDENCE_TIERS = ['OBSERVED', 'MODELED', 'UNKNOWN'];

  const FIBER_EVIDENCE_TIERS = [
    'KNOWN_ROUTE',
    'APPROXIMATE_ROUTE',
    'SERVICE_AREA',
    'PROVIDER_PRESENCE',
    'BROADBAND_AVAILABILITY',
    'UNKNOWN',
  ];

  const GEOMETRY_TYPES = ['Point', 'LineString', 'Polygon', 'MultiPolygon'];

  const STATUS_VALUES = [
    'existing', 'planned', 'under_construction', 'retired', 'proposed', 'unknown',
  ];

  const EVIDENCE_TIER_LABELS = {
    OBSERVED: 'Observed (authoritative source)',
    MODELED: 'Modeled / derived estimate',
    UNKNOWN: 'Unknown',
    KNOWN_ROUTE: 'Known physical route',
    APPROXIMATE_ROUTE: 'Approximate route',
    SERVICE_AREA: 'Service area (not a route)',
    PROVIDER_PRESENCE: 'Provider present in area',
    BROADBAND_AVAILABILITY: 'Broadband availability (not physical fiber)',
  };

  function isAssetType(v) { return ASSET_TYPES.indexOf(v) !== -1; }
  function isEvidenceTier(v) { return EVIDENCE_TIERS.indexOf(v) !== -1; }
  function isFiberEvidenceTier(v) { return FIBER_EVIDENCE_TIERS.indexOf(v) !== -1; }

  function evidenceTierLabel(tier) {
    return EVIDENCE_TIER_LABELS[tier] || 'Unknown';
  }

  return {
    ASSET_TYPES,
    EVIDENCE_TIERS,
    FIBER_EVIDENCE_TIERS,
    GEOMETRY_TYPES,
    STATUS_VALUES,
    isAssetType,
    isEvidenceTier,
    isFiberEvidenceTier,
    evidenceTierLabel,
  };
})();
