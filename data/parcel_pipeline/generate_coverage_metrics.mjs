#!/usr/bin/env node
/* data/parcel_pipeline/generate_coverage_metrics.mjs
 *
 *   node data/parcel_pipeline/generate_coverage_metrics.mjs
 *   node data/parcel_pipeline/generate_coverage_metrics.mjs --check
 *
 * Generates data/parcel_coverage_metrics.json and docs/PARCEL_COVERAGE.md
 * entirely from repository data: js/parcel/registry.js,
 * data/parcel_source_catalog.json, and data/facilities_index.json.
 *
 * NOTHING HERE IS HAND-MAINTAINED. That is the point. Counts written by hand
 * into a README drift the moment a jurisdiction is added, and a stale
 * coverage number is worse than none: it gets quoted. Everything below is
 * derived, and `--check` fails CI when the committed artifact no longer
 * matches what the current repository data produces.
 *
 * FACILITY-WEIGHTED COVERAGE is the number worth watching. Plain jurisdiction
 * coverage ("58 of 400 counties") understates the product badly, because the
 * counties that matter are wildly unequal: Loudoun County VA alone holds more
 * data centers than most states. Weighting by facility count answers the
 * question a user actually has — "will this work where I'm looking?" — rather
 * than a question about county arithmetic.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRegistry } from './lib/load_registry.mjs';
import {
  FIELD_CATEGORIES, QUALITY_WEIGHTS, MAX_QUALITY_SCORE, TIERS, TIER_DESCRIPTIONS,
  categoriesPresent, qualityScore, classify, rankOpportunities,
} from './coverage_rules.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const METRICS_PATH = join(ROOT, 'data', 'parcel_coverage_metrics.json');
const REPORT_PATH  = join(ROOT, 'docs', 'PARCEL_COVERAGE.md');

function readJson(relPath, fallback) {
  try { return JSON.parse(readFileSync(join(ROOT, relPath), 'utf8')); }
  catch { return fallback; }
}

export function facilityCountsByFips(facilities) {
  const counts = {};
  for (const f of (facilities || [])) {
    const raw = f.county_fips || f.fips;
    if (!raw) continue;
    const fips = String(raw).padStart(5, '0');
    counts[fips] = (counts[fips] || 0) + 1;
  }
  return counts;
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function buildMetrics({ registry, catalog, facilities }) {
  const facilityCounts = facilityCountsByFips(facilities);
  const entries = registry.all();
  const coveredFips = new Set(entries.map(e => e.fips));

  // ── Jurisdiction-level detail ───────────────────────────────────────────
  const jurisdictions = entries.map(entry => {
    const present = categoriesPresent(entry);
    const score = qualityScore(entry);
    return {
      fips: entry.fips,
      id: entry.id,
      name: entry.name,
      state: entry.state,
      connector: entry.connector,
      facilities: facilityCounts[entry.fips] || 0,
      tier: classify(entry),
      categories: present,
      qualityScore: score.total,
      qualityComponents: score.components,
      enrichmentSources: ((entry.enrichment || {}).sources || []).map(s => ({
        id: s.id, type: s.type, confidence: s.confidence || null,
      })),
      declaredGaps: Array.isArray(entry.notProvidedBySource) ? entry.notProvidedBySource.length : 0,
    };
  }).sort((a, b) => b.facilities - a.facilities || a.fips.localeCompare(b.fips));

  // ── Facility-weighted coverage ──────────────────────────────────────────
  const totalFacilities = (facilities || []).length;
  // Facilities whose county has no FIPS at all cannot be attributed to a
  // covered or uncovered jurisdiction, and are reported separately rather
  // than being silently counted as uncovered — an unknown is not a miss.
  let facilitiesInCovered = 0, facilitiesUnattributed = 0;
  for (const f of (facilities || [])) {
    const raw = f.county_fips || f.fips;
    if (!raw) { facilitiesUnattributed++; continue; }
    if (coveredFips.has(String(raw).padStart(5, '0'))) facilitiesInCovered++;
  }
  const attributable = totalFacilities - facilitiesUnattributed;

  const facilityBearingFips = new Set(Object.keys(facilityCounts));

  // ── Category depth across covered jurisdictions ─────────────────────────
  const depth = {};
  for (const category of Object.keys(FIELD_CATEGORIES)) {
    const withCategory = jurisdictions.filter(j => j.categories[category]).length;
    // Weighted by facilities as well: knowing that 60% of jurisdictions have
    // ownership matters less than knowing whether the busy ones do.
    const facilitiesWith = jurisdictions
      .filter(j => j.categories[category])
      .reduce((sum, j) => sum + j.facilities, 0);
    const facilitiesCovered = jurisdictions.reduce((sum, j) => sum + j.facilities, 0);
    depth[category] = {
      jurisdictions: withCategory,
      jurisdictionPct: pct(withCategory, jurisdictions.length),
      facilityWeightedPct: pct(facilitiesWith, facilitiesCovered),
    };
  }

  // ── Tier distribution ───────────────────────────────────────────────────
  const tierDistribution = {};
  for (const tier of Object.values(TIERS)) tierDistribution[tier] = 0;
  for (const j of jurisdictions) tierDistribution[j.tier] = (tierDistribution[j.tier] || 0) + 1;

  const opportunities = rankOpportunities(catalog.jurisdictions || {}, facilityCounts, coveredFips);

  const scores = jurisdictions.map(j => j.qualityScore);
  const meanScore = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;

  return {
    meta: {
      generatedBy: 'data/parcel_pipeline/generate_coverage_metrics.mjs',
      generatedFrom: [
        'js/parcel/registry.js',
        'data/parcel_source_catalog.json',
        'data/facilities_index.json',
      ],
      // Deliberately no generatedAt timestamp: it would make the artifact
      // differ on every run and turn --check into permanent CI noise. The git
      // history already records when this changed.
      qualityWeights: QUALITY_WEIGHTS,
      maxQualityScore: MAX_QUALITY_SCORE,
      tierDescriptions: TIER_DESCRIPTIONS,
      caveat:
        'These figures measure how many canonical fields each jurisdiction\'s configured ' +
        'sources are wired up to populate. They are an engineering signal, not a measure ' +
        'of data accuracy, freshness, or fitness for any real estate decision. A county ' +
        'can score 100 here while publishing values that are years stale.',
    },

    coverage: {
      productionJurisdictions: jurisdictions.length,
      facilityBearingJurisdictions: facilityBearingFips.size,
      jurisdictionCoveragePct: pct(
        [...coveredFips].filter(f => facilityBearingFips.has(f)).length,
        facilityBearingFips.size),
      cataloguedJurisdictions: Object.keys(catalog.jurisdictions || {}).length,

      totalFacilities,
      facilitiesInCoveredJurisdictions: facilitiesInCovered,
      facilitiesUnattributed,
      facilityWeightedCoveragePct: pct(facilitiesInCovered, attributable),
    },

    depth,
    tierDistribution,
    qualityScore: {
      mean: meanScore,
      max: MAX_QUALITY_SCORE,
      best: jurisdictions.length ? Math.max(...scores) : 0,
      worst: jurisdictions.length ? Math.min(...scores) : 0,
    },

    jurisdictions,
    opportunities: opportunities.slice(0, 25),
  };
}

export function renderReport(m) {
  const L = [];
  const c = m.coverage;

  L.push('# Parcel Coverage & Data Quality');
  L.push('');
  L.push('**Generated file — do not edit by hand.**');
  L.push('Run `node data/parcel_pipeline/generate_coverage_metrics.mjs` to regenerate.');
  L.push('');
  L.push(`> ${m.meta.caveat}`);
  L.push('');

  L.push('## Coverage');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push(`| Production jurisdictions | ${c.productionJurisdictions} |`);
  L.push(`| Facility-bearing jurisdictions | ${c.facilityBearingJurisdictions} |`);
  L.push(`| Jurisdiction coverage | ${c.jurisdictionCoveragePct}% |`);
  L.push(`| **Facility-weighted coverage** | **${c.facilityWeightedCoveragePct}%** |`);
  L.push(`| Known facilities | ${c.totalFacilities} |`);
  L.push(`| Facilities in covered jurisdictions | ${c.facilitiesInCoveredJurisdictions} |`);
  if (c.facilitiesUnattributed) {
    L.push(`| Facilities with no county FIPS (unattributable) | ${c.facilitiesUnattributed} |`);
  }
  L.push('');
  L.push('Facility-weighted coverage is the number worth watching. Plain jurisdiction');
  L.push('coverage understates the product badly, because the counties that matter are');
  L.push('wildly unequal — Loudoun County VA alone holds more data centers than most states.');
  L.push('');

  L.push('## Data depth');
  L.push('');
  L.push('Share of covered jurisdictions with at least one field wired up in each category.');
  L.push('The facility-weighted column answers the more useful question: do the *busy*');
  L.push('counties have it?');
  L.push('');
  L.push('| Category | Jurisdictions | Facility-weighted |');
  L.push('|---|---|---|');
  for (const [category, d] of Object.entries(m.depth)) {
    L.push(`| ${category} | ${d.jurisdictions} (${d.jurisdictionPct}%) | ${d.facilityWeightedPct}% |`);
  }
  L.push('');

  L.push('## Quality distribution');
  L.push('');
  L.push('| Tier | Count | Meaning |');
  L.push('|---|---|---|');
  for (const [tier, count] of Object.entries(m.tierDistribution)) {
    if (!count) continue;
    L.push(`| ${tier} | ${count} | ${m.meta.tierDescriptions[tier] || ''} |`);
  }
  L.push('');
  L.push(`Quality score: mean **${m.qualityScore.mean}** / ${m.qualityScore.max} ` +
    `(best ${m.qualityScore.best}, worst ${m.qualityScore.worst}).`);
  L.push('');
  L.push('The score is a plain weighted sum with every weight visible in');
  L.push('`data/parcel_pipeline/coverage_rules.mjs`, and each component is reported');
  L.push('individually in the JSON. **The per-category coverage above is the more honest');
  L.push('number** — the score exists to make jurisdictions sortable, not to be quoted.');
  L.push('');
  L.push('Weights: ' + Object.entries(m.meta.qualityWeights)
    .map(([k, v]) => `${k} ${v}`).join(', ') + '.');
  L.push('Polygon geometry is not scored: it is a precondition, not an achievement — a');
  L.push('parcel source without it is not a parcel source. The `area` category scores the');
  L.push('publisher\'s area *attribute*, which genuinely varies.');
  L.push('');

  L.push('## Top next opportunities');
  L.push('');
  L.push('Facility-bearing jurisdictions not yet in production, ranked by facility count.');
  L.push('');
  L.push('| FIPS | Jurisdiction | Facilities | Status | Effort | Fields seen | Shared service |');
  L.push('|---|---|---|---|---|---|---|');
  for (const o of m.opportunities.slice(0, 20)) {
    L.push(`| ${o.fips} | ${o.name} | ${o.facilities} | ${o.previousInvestigation} | ` +
      `${o.effort} | ${o.fieldsAvailable ?? '—'} | ${o.sharedService ? 'yes' : 'no'} |`);
  }
  L.push('');

  L.push('## Covered jurisdictions');
  L.push('');
  L.push('| FIPS | Jurisdiction | Facilities | Tier | Score |');
  L.push('|---|---|---|---|---|');
  for (const j of m.jurisdictions) {
    L.push(`| ${j.fips} | ${j.name} | ${j.facilities} | ${j.tier} | ${j.qualityScore} |`);
  }
  L.push('');

  return L.join('\n');
}

function main() {
  const check = process.argv.includes('--check');

  const registry = loadRegistry();
  const catalog = readJson('data/parcel_source_catalog.json', { jurisdictions: {} });
  const facilities = readJson('data/facilities_index.json', []);

  const metrics = buildMetrics({
    registry,
    catalog,
    facilities: Array.isArray(facilities) ? facilities : (facilities.facilities || []),
  });

  const json = JSON.stringify(metrics, null, 2) + '\n';
  const report = renderReport(metrics) ;

  if (check) {
    let stale = [];
    try {
      if (readFileSync(METRICS_PATH, 'utf8') !== json) stale.push('data/parcel_coverage_metrics.json');
    } catch { stale.push('data/parcel_coverage_metrics.json (missing)'); }
    try {
      if (readFileSync(REPORT_PATH, 'utf8') !== report) stale.push('docs/PARCEL_COVERAGE.md');
    } catch { stale.push('docs/PARCEL_COVERAGE.md (missing)'); }

    if (stale.length) {
      console.error('Coverage artifacts are stale:\n' + stale.map(s => `  - ${s}`).join('\n'));
      console.error('\nRun: node data/parcel_pipeline/generate_coverage_metrics.mjs');
      process.exit(1);
    }
    console.log('OK — coverage artifacts match current repository data.');
    return;
  }

  writeFileSync(METRICS_PATH, json);
  writeFileSync(REPORT_PATH, report);

  const c = metrics.coverage;
  console.log(`Wrote data/parcel_coverage_metrics.json and docs/PARCEL_COVERAGE.md`);
  console.log(`  ${c.productionJurisdictions} production jurisdictions`);
  console.log(`  ${c.facilityWeightedCoveragePct}% facility-weighted coverage ` +
    `(${c.facilitiesInCoveredJurisdictions} of ${c.totalFacilities - c.facilitiesUnattributed} attributable facilities)`);
  console.log(`  mean quality score ${metrics.qualityScore.mean}/${metrics.qualityScore.max}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
