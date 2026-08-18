/* data/parcel_pipeline/seed_catalog_from_registry.mjs
 *
 *   node data/parcel_pipeline/seed_catalog_from_registry.mjs
 *
 * Regenerates the `status: "production"` records in
 * data/parcel_source_catalog.json from the live js/parcel/registry.js — the
 * single source of truth for what's actually shipped. Never hand-copies a
 * URL or field mapping; loads the real file the same way
 * data/check_parcel_services.mjs does (see lib/load_registry.mjs).
 *
 * IDEMPOTENT AND NON-DESTRUCTIVE: if data/parcel_source_catalog.json already
 * exists, every FIPS entry NOT present in the registry (hand-transcribed
 * candidate/blocked/rejected investigation history) is preserved untouched.
 * Only entries whose FIPS IS in the registry get their production record
 * regenerated. Re-run this any time the registry changes to keep the
 * catalog's production rows in sync; it will never erase investigation
 * history for a county that hasn't been added yet.
 *
 * Some fields (source_scope, geographic_extent, county_filter_field/value)
 * are inferred by heuristic, not independently verified — each inferred
 * record says so in `notes` rather than presenting a guess as a fact.
 * confidence_score and update_frequency are left null/"unknown" rather than
 * invented, since nothing in registry.js records either.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadRegistry } from './lib/load_registry.mjs';

const CATALOG_PATH = join(ROOT, 'data/parcel_source_catalog.json');
const FACILITIES_PATH = join(ROOT, 'data/facilities_index.json');

function loadFacilityCountsByFips() {
  const facilities = JSON.parse(readFileSync(FACILITIES_PATH, 'utf8'));
  const counts = new Map();
  for (const f of facilities) {
    if (!f.county_fips) continue;
    const fips = String(f.county_fips).padStart(5, '0');
    counts.set(fips, (counts.get(fips) || 0) + 1);
  }
  return counts;
}

function inferSourceType(connector, serviceUrl) {
  if (connector === 'geojson') return 'geojson';
  if (connector === 'wfs') return 'wfs';
  if (connector === 'arcgis') {
    if (/\/FeatureServer(\/\d+)?$/i.test(serviceUrl)) return 'arcgis_featureserver';
    if (/\/MapServer(\/\d+)?$/i.test(serviceUrl)) return 'arcgis_mapserver';
    return 'arcgis_other';
  }
  return 'other';
}

/* Heuristic only — records with a `where` clause share one service across
   multiple counties (already-proven pattern: NJ MOD-IV, NYC MAPPLUTO,
   Hennepin MN regional). City/independent-city entries are flagged via the
   `-city` id suffix or DC's state code. Everything else defaults to
   'county', which is correct for the large majority of entries. */
function inferScope(entry) {
  if (entry.state === 'DC' || /-city$/.test(entry.id)) return 'municipal';
  if (entry.where) return 'regional';
  return 'county';
}

function inferGeographicExtent(entry) {
  if (entry.state === 'DC' || /-city$/.test(entry.id)) return 'city';
  return 'county';
}

/* Parses the simple `FIELD = 'VALUE'` shape every existing `where` clause in
   the registry uses. Does not attempt to parse anything more complex —
   an unparsed where clause just leaves county_filter_field/value null
   rather than guessing. */
function parseWhereClause(where) {
  if (!where) return { field: null, value: null };
  const m = /^\s*([A-Za-z0-9_]+)\s*=\s*'([^']*)'\s*$/.exec(where);
  if (!m) return { field: null, value: null };
  return { field: m[1], value: m[2] };
}

function buildProductionRecord(entry, facilityCounts) {
  const { field: county_filter_field, value: county_filter_value } = parseWhereClause(entry.where);
  const availableFields = Object.entries(entry.fieldMap || {})
    .filter(([, v]) => v && v !== '__computed__')
    .map(([, v]) => v);
  const scope = inferScope(entry);
  const notesParts = [];
  if (entry.attribution && entry.attribution.note) notesParts.push(entry.attribution.note);
  notesParts.push(
    `source_scope ("${scope}") and geographic_extent are inferred heuristically ` +
    `from the entry's id/state/where-clause shape, not independently re-verified.`
  );

  return {
    id: entry.id,
    name: entry.name,
    state: entry.state,
    fips: entry.fips,
    facility_count: facilityCounts.get(entry.fips) ?? 0,
    priority_rank: null,
    source_scope: scope,
    source_type: inferSourceType(entry.connector, entry.serviceUrl),
    service_url: entry.serviceUrl,
    portal_url: (entry.attribution && entry.attribution.portal) || null,
    official_publisher: (entry.attribution && entry.attribution.name) || null,
    geometry_type: 'polygon',
    query_support: true,
    record_count: null,
    available_fields: availableFields,
    geographic_extent: inferGeographicExtent(entry),
    county_filter_field,
    county_filter_value,
    update_frequency: 'unknown',
    licensing_notes: (entry.attribution && entry.attribution.license) || null,
    confidence_score: null,
    field_coverage_score: availableFields.length,
    status: 'production',
    rejection_reason: null,
    last_verified: null,
    retry_eligible: false,
    retry_after_days: null,
    notes: notesParts.join(' '),
  };
}

function main() {
  const registry = loadRegistry();
  const facilityCounts = loadFacilityCountsByFips();

  let existing = { meta: {}, jurisdictions: {} };
  if (existsSync(CATALOG_PATH)) {
    existing = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
    if (!existing.jurisdictions) existing.jurisdictions = {};
  }

  const registryFips = new Set();
  for (const entry of registry.all()) {
    registryFips.add(entry.fips);
    existing.jurisdictions[entry.fips] = buildProductionRecord(entry, facilityCounts);
  }

  existing.meta = {
    description: 'Catalog of every parcel data source investigated for this project — production, ' +
      'candidate, and rejected/blocked. Complements js/parcel/registry.js (production-ready entries ' +
      'only) and AI_TEAM_STATUS.md (the narrative investigation log this file is seeded from). ' +
      'Production records are regenerated by data/parcel_pipeline/seed_catalog_from_registry.mjs; ' +
      'candidate/blocked/rejected records are hand-maintained.',
    last_updated: new Date().toISOString().slice(0, 10),
    schema_version: 1,
  };

  const orderedFips = Object.keys(existing.jurisdictions).sort();
  // Preserve every other top-level key (e.g. shared_services, added by a
  // later pass and unknown to this script when first written) instead of
  // reconstructing the file from only meta+jurisdictions -- that silently
  // deleted shared_services on the first re-run after it existed, exactly
  // the kind of destructive "regeneration" this script's own doc comment
  // claims not to be.
  const ordered = { ...existing, meta: existing.meta, jurisdictions: {} };
  for (const fips of orderedFips) ordered.jurisdictions[fips] = existing.jurisdictions[fips];

  writeFileSync(CATALOG_PATH, JSON.stringify(ordered, null, 2) + '\n');

  const blockedOrOther = orderedFips.filter(f => !registryFips.has(f));
  console.log(`Wrote ${orderedFips.length} catalog entries to ${CATALOG_PATH}`);
  console.log(`  ${registryFips.size} regenerated from registry.js (status: production)`);
  console.log(`  ${blockedOrOther.length} preserved untouched (not in registry): ${blockedOrOther.join(', ') || '(none)'}`);
}

main();
