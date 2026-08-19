/* data/parcel_pipeline/classify_licensing.mjs
 *
 *   node data/parcel_pipeline/classify_licensing.mjs [--check]
 *
 * Structured licensing model for js/parcel/registry.js. Every production
 * entry already has a free-text `attribution.license` field with real,
 * researched findings (see AI_TEAM_STATUS.md / this session's licensing
 * diligence passes) -- but it's prose, not queryable. This adds a small
 * structured classification alongside it (never replacing the free text,
 * which stays as the evidence record):
 *
 *   license_status         OPEN | PUBLIC_DOMAIN | ATTRIBUTION_REQUIRED |
 *                          RESTRICTED | NONCOMMERCIAL | UNKNOWN | TERMS_UNCLEAR
 *   commercial_use_status  'permitted' | 'restricted' | 'unknown'
 *   redistribution_status  'permitted' | 'restricted' | 'unknown'
 *   attribution_required   true | false | null (null = not stated either way)
 *   confidence_level       'high' | 'medium' | 'none'
 *
 * CLASSIFICATION IS CONSERVATIVE ON PURPOSE. This walks the same license
 * text a human already wrote after real research, looking for a small set
 * of unambiguous textual signals (an explicit "public domain" statement, a
 * named CC BY license, an explicit resale prohibition, an explicit "no
 * restriction found" conclusion). Anything that doesn't match one of those
 * clear patterns stays TERMS_UNCLEAR or UNKNOWN -- exactly the majority of
 * this registry's entries, since most of the research found only a generic
 * "as is, no warranty" disclaimer with no explicit statement either way,
 * and every one of those already ends with "verify before commercial use"
 * in its own text. A classifier that turned that honest uncertainty into a
 * confident OPEN or RESTRICTED label would be worse than not classifying
 * it at all -- see this whole project's standing rule against guessing.
 *
 * Never silently "upgrades" ambiguous text to a specific status: every rule
 * below requires a genuinely unambiguous phrase, not a vibe.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { REGISTRY_PATH, loadRegistry } from './lib/load_registry.mjs';

export const LICENSE_STATUSES = [
  'OPEN', 'PUBLIC_DOMAIN', 'ATTRIBUTION_REQUIRED', 'RESTRICTED',
  'NONCOMMERCIAL', 'UNKNOWN', 'TERMS_UNCLEAR',
];

const UNRESEARCHED_SIGNALS = [
  '[unresearched', 'not verified.]',
];

const RESTRICTED_SIGNALS = [
  'may not sell', 'nobody may sell', 'not to be used/distributed for commercial gain',
  'nobody may resell', 'resale is not', 'not intended for the bulk transfer',
  'commercial use likely requires review', 'is a violation subject to',
  'not to be used for commercial gain',
];

const NONCOMMERCIAL_SIGNALS = [
  'noncommercial use only', 'non-commercial use only', 'for noncommercial purposes only',
];

const PUBLIC_DOMAIN_SIGNALS = ['public domain'];

const ATTRIBUTION_SIGNALS = [
  'creative commons attribution', 'cc by', 'must acknowledge', 'must be credited',
  'acknowledge the state of', 'credit the state of', 'attribution is expected',
  'metadata entry is not modified', 'require any data derived', 'require derived',
  'citing county of', 'source must be cited', 'is a real attribution condition',
];

// Deliberately narrow: only phrases that are themselves an explicit,
// unhedged conclusion. "freely usable" and similar softer phrasing were
// tried and rejected during development -- a real case in this registry
// (Fulton County GA) uses "described elsewhere as freely usable with
// credit, but ... found via web search. Treat commercial-use terms as
// unverified" -- the researcher's own explicit conclusion is uncertainty,
// even though a permissive-sounding phrase appears earlier in the same
// sentence. Only the strong, conclusory phrases below are trusted.
const OPEN_SIGNALS = [
  'no license required', 'without registration, license, or usage restriction',
  'no commercial-use restriction identified',
];

function containsAny(haystack, needles) {
  return needles.some((n) => haystack.includes(n));
}

/** Pure function: given one entry's free-text license string, return the
 * structured classification. Exported so it's independently testable
 * against fixture strings without touching the real registry. */
export function classifyLicenseText(text) {
  const t = (text || '').toLowerCase();

  if (!t.trim() || containsAny(t, UNRESEARCHED_SIGNALS)) {
    return {
      license_status: 'UNKNOWN', commercial_use_status: 'unknown',
      redistribution_status: 'unknown', attribution_required: null, confidence_level: 'none',
    };
  }

  if (containsAny(t, RESTRICTED_SIGNALS)) {
    return {
      license_status: 'RESTRICTED', commercial_use_status: 'restricted',
      redistribution_status: 'restricted', attribution_required: null, confidence_level: 'high',
    };
  }

  if (containsAny(t, NONCOMMERCIAL_SIGNALS)) {
    return {
      license_status: 'NONCOMMERCIAL', commercial_use_status: 'restricted',
      redistribution_status: 'unknown', attribution_required: null, confidence_level: 'high',
    };
  }

  // Attribution checked before public-domain/open: a CC-BY-style license is
  // simultaneously "very permissive" and "has one real condition" -- the
  // condition is the more actionable fact, so it takes precedence as the
  // primary status rather than being flattened into a generic OPEN.
  if (containsAny(t, ATTRIBUTION_SIGNALS)) {
    return {
      license_status: 'ATTRIBUTION_REQUIRED', commercial_use_status: 'permitted',
      redistribution_status: 'permitted', attribution_required: true, confidence_level: 'high',
    };
  }

  if (containsAny(t, PUBLIC_DOMAIN_SIGNALS)) {
    return {
      license_status: 'PUBLIC_DOMAIN', commercial_use_status: 'permitted',
      redistribution_status: 'permitted', attribution_required: false, confidence_level: 'high',
    };
  }

  if (containsAny(t, OPEN_SIGNALS)) {
    return {
      license_status: 'OPEN', commercial_use_status: 'permitted',
      redistribution_status: 'permitted', attribution_required: false, confidence_level: 'medium',
    };
  }

  // The majority case: a real disclaimer was found and read (no warranty,
  // "as is," etc.) but it made no explicit statement about commercial use
  // or redistribution either way -- almost every one of these texts says
  // so itself ("verify before commercial use"). Honest uncertainty, not a
  // guess in either direction.
  return {
    license_status: 'TERMS_UNCLEAR', commercial_use_status: 'unknown',
    redistribution_status: 'unknown', attribution_required: null, confidence_level: 'none',
  };
}

function formatField(key, value, indent) {
  if (value === null) return `${indent}${key}: null,`;
  if (typeof value === 'boolean') return `${indent}${key}: ${value},`;
  return `${indent}${key}: '${value}',`;
}

function main() {
  const check = process.argv.includes('--check');
  const registry = loadRegistry();
  const source = readFileSync(REGISTRY_PATH, 'utf8');

  const results = [];
  for (const entry of registry.all()) {
    const attribution = entry.attribution || {};
    if (attribution.license_status !== undefined) continue; // already classified
    const cls = classifyLicenseText(attribution.license);
    results.push({ fips: entry.fips, id: entry.id, ...cls });
  }

  if (check) {
    if (results.length) {
      console.log(`FAIL: ${results.length} entries have no license_status yet -- `
        + `run without --check to see the classification (structured fields must be added by hand, `
        + `same as every other registry.js field, this script only computes what they should be).`);
      for (const r of results) console.log(`  ${r.fips} (${r.id}): ${r.license_status} / confidence=${r.confidence_level}`);
      process.exit(1);
    }
    console.log('OK: every production entry has a license_status.');
    return;
  }

  console.log(`${results.length} / ${registry.all().length} entries not yet structurally classified.\n`);
  const byStatus = {};
  for (const r of results) {
    byStatus[r.license_status] = (byStatus[r.license_status] || 0) + 1;
    console.log(`${r.fips}  ${r.license_status.padEnd(20)} confidence=${r.confidence_level}  (${r.id})`);
  }
  console.log('\nSummary:', JSON.stringify(byStatus, null, 2));
  console.log('\nThis script only reports the classification -- it does not write to registry.js. '
    + 'Structured fields are added to each entry\'s attribution object by hand (same convention as '
    + 'every other field in this file), using this output as the starting point for review.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
