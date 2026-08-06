/* data/parcel_pipeline/discovery/mapping_confidence.mjs — non-invasive
 * confidence tagging on top of field_mapper.mjs's mapFields() output.
 *
 * ZERO changes to field_mapper.mjs. That file's ground-truth regression
 * (57 real jurisdictions, 0 confident wrong guesses) is the highest-value
 * safety net in this whole pipeline and stays completely frozen — this
 * module only ever ADDS a label to what mapFields() already concluded, it
 * never re-decides or promotes an ambiguous match to resolved. Every
 * requiresReview entry mapFields() produced passes through here verbatim
 * as 'manual-review-required', reason preserved exactly.
 *
 * Tier (1 = exact verified synonym, 2 = normalized-name heuristic) is
 * re-derived here rather than exposed by field_mapper.mjs itself: a field
 * is tier-1 iff it's an exact, case-insensitive member of that canonical
 * id's known-synonym set in parcel_field_synonyms.json — the exact same
 * check field_mapper.mjs's own tier 1 already performs (see its
 * buildSynonymIndex()). Anything mapFields() resolved that ISN'T a tier-1
 * hit is tier-2 by elimination, since mapFields() only has two resolving
 * tiers. This ~5-line duplication is deliberate: re-deriving one already-
 * simple check from outside is a smaller risk than adding a new return key
 * to the frozen file.
 */

export const CONFIDENCE = Object.freeze({
  VERIFIED_PRECEDENT: 'verified-precedent',
  EXACT_ALIAS: 'exact-alias',
  NORMALIZED_MATCH: 'normalized-match',
  SAMPLE_VALUE_SUPPORTED: 'sample-value-supported',
  MANUAL_REVIEW_REQUIRED: 'manual-review-required',
});

// A small, deliberately conservative set of type-plausibility checks per
// canonical field id — only fields where a wrong-vs-right value is easy to
// tell apart programmatically. Anything not listed here never gets
// upgraded past normalized-match by sample values (no plausibility check
// exists for it), which is the safe default, not a gap.
const PLAUSIBILITY_CHECKS = {
  assessed_value: v => isFiniteNumber(v) && v >= 0,
  land_value: v => isFiniteNumber(v) && v >= 0,
  improvement_value: v => isFiniteNumber(v) && v >= 0,
  tax_amount: v => isFiniteNumber(v) && v >= 0,
  last_sale_price: v => isFiniteNumber(v) && v >= 0,
  area_acres: v => isFiniteNumber(v) && v >= 0 && v < 100000,
  area_sqft: v => isFiniteNumber(v) && v >= 0,
  year_built: v => isFiniteNumber(v) && v >= 1600 && v <= new Date().getFullYear() + 1,
  building_count: v => isFiniteNumber(v) && v >= 0 && Number.isInteger(v),
  census_tract: v => v != null && String(v).trim() !== '',
};

function isFiniteNumber(v) {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n);
}

/* Pure — mirrors field_mapper.mjs's buildSynonymIndex() exactly. */
function buildSynonymIndex(synonyms) {
  const index = new Map();
  for (const [canonicalId, entries] of Object.entries(synonyms || {})) {
    index.set(canonicalId, new Set((entries || []).map(e => String(e.name).toUpperCase())));
  }
  return index;
}

/* Pure. canonicalId: string. value: whatever the sample record's raw
   attribute value was. Returns false (never throws) if no plausibility
   check exists for this canonical field, or if the value fails it. */
export function sampleValueIsPlausible(canonicalId, value, schemaFieldTypeById = null) {
  const check = PLAUSIBILITY_CHECKS[canonicalId];
  if (!check) return false;
  if (value == null || value === '') return false;
  try {
    return !!check(value);
  } catch {
    return false;
  }
}

/**
 * Pure. mapperResult: the exact {fieldMap, notProvidedBySource, requiresReview}
 * shape mapFields() returns. options:
 *   - synonyms: the parcel_field_synonyms.json `synonyms` object, needed to
 *     re-derive tier 1 vs tier 2 (required for any confidence tagging beyond
 *     'manual-review-required' passthrough — if omitted, every resolved
 *     field is conservatively tagged 'normalized-match').
 *   - sampleRecord: one fetched sample record (or null), used only to
 *     upgrade normalized-match -> sample-value-supported for the specific
 *     canonical fields with a real plausibility check; never used to
 *     resolve a requiresReview entry.
 *   - sharedServiceCanonicalIds: Set<string> of canonical ids whose fieldMap
 *     entry came verbatim from a shared_services canonical_mapping_template
 *     — the highest-confidence case, since it's precedent already verified
 *     by a human against a live sample elsewhere.
 *
 * Returns an array of { canonicalId, confidence, sourceField?, reason? } —
 * one entry per fieldMap key (excluding county_fips, which is always
 * computed and not meaningfully "confident" one way or another) plus one
 * entry per requiresReview item, verbatim.
 */
export function tagMappingConfidence(mapperResult, options = {}) {
  const { synonyms = null, sampleRecord = null, sharedServiceCanonicalIds = new Set() } = options;
  const synonymIndex = synonyms ? buildSynonymIndex(synonyms) : null;
  const tags = [];

  for (const [canonicalId, sourceField] of Object.entries(mapperResult.fieldMap || {})) {
    if (canonicalId === 'county_fips') continue;

    if (sharedServiceCanonicalIds.has(canonicalId)) {
      tags.push({ canonicalId, confidence: CONFIDENCE.VERIFIED_PRECEDENT, sourceField });
      continue;
    }

    const isTier1 = synonymIndex
      ? (synonymIndex.get(canonicalId) || new Set()).has(String(sourceField).toUpperCase())
      : false;

    if (isTier1) {
      tags.push({ canonicalId, confidence: CONFIDENCE.EXACT_ALIAS, sourceField });
      continue;
    }

    if (sampleRecord && sampleValueIsPlausible(canonicalId, sampleRecord[sourceField])) {
      tags.push({ canonicalId, confidence: CONFIDENCE.SAMPLE_VALUE_SUPPORTED, sourceField });
    } else {
      tags.push({ canonicalId, confidence: CONFIDENCE.NORMALIZED_MATCH, sourceField });
    }
  }

  for (const item of mapperResult.requiresReview || []) {
    tags.push({
      canonicalId: item.canonicalId || null,
      sourceField: item.sourceField || null,
      confidence: CONFIDENCE.MANUAL_REVIEW_REQUIRED,
      reason: item.reason,
      candidates: item.candidates || null,
      note: item.note || null,
    });
  }

  return tags;
}
