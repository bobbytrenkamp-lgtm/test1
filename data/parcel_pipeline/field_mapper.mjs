/* data/parcel_pipeline/field_mapper.mjs
 *
 * Deterministic, network-free field mapper: given a source service's real
 * field name list and the 30 canonical field ids from js/parcel/schema.js,
 * proposes a fieldMap + notProvidedBySource split, and flags anything it
 * isn't confident about for human review rather than guessing.
 *
 * TIERED RESOLUTION
 *   Tier 1 (exact synonym match) — looks the source field up in
 *   data/parcel_field_synonyms.json, an exact-match dictionary of source
 *   field names ALREADY human-verified (against a real live service) to
 *   mean a given canonical field. This is the only tier allowed to resolve
 *   'address', 'owner_mailing', and 'legal_desc' — those three are only
 *   ever safe to claim when a human has already confirmed the source
 *   genuinely publishes one combined field (e.g. Manassas VA's
 *   PROPERTY_ADDRESS), never inferred from a new, unfamiliar field name.
 *   This tier is also the only one allowed to map a Shape_Area/Shape_Length
 *   pattern field to area_sqft/area_acres, since that mapping is only in
 *   the corpus at all because a human already checked the layer's
 *   coordinate system and confirmed the units are usable (Fairfax County's
 *   Shape__Area case) — a new, never-seen-before Shape_Area-pattern field
 *   has NOT had that check done and must not be auto-mapped (San
 *   Francisco's Shape__Area case: Web Mercator meters, not feet, unusable).
 *
 *   Tier 2 (normalized-name match) — strips punctuation, expands a small
 *   set of common GIS abbreviations, and looks for an UNAMBIGUOUS single
 *   match between a source field and a canonical field's own id. Ties (2+
 *   source fields matching the same canonical field, or vice versa) are
 *   never auto-resolved — both sides go to requiresReview. This tier never
 *   attempts 'address', 'owner_mailing', 'legal_desc' (see above), and
 *   never lets a Shape_Area/Shape_Length-pattern field claim area_sqft or
 *   area_acres.
 *
 *   Anything left over: a canonical field with zero candidates at either
 *   tier is a confident notProvidedBySource entry (the source's full field
 *   list was checked and it simply isn't there). A canonical field or
 *   source field caught in an ambiguous tie, or a Shape_Area-pattern field
 *   that got excluded from a value-field match, goes to requiresReview
 *   instead — a real candidate exists, but automated confidence isn't high
 *   enough to claim it without a human looking at real sample values.
 */

// Fields that may ONLY be resolved by an already-verified exact synonym —
// never inferred by normalized-name heuristics. Combined address/mailing/
// legal-description fields are the exact class this session repeatedly
// found split across multiple source components with no combined field
// (Hennepin MN's 9-component address, Clark NV's 6-component address and
// 3-line legal description, San Francisco's split address) — a heuristic
// name match could easily mistake one COMPONENT for the whole thing.
const TIER2_DISABLED_FIELDS = new Set(['address', 'owner_mailing', 'legal_desc']);

// Canonical fields a Shape_Area/Shape_Length-pattern source field must
// never be heuristically mapped to (see file header).
const AREA_FIELDS = new Set(['area_sqft', 'area_acres']);
const SHAPE_AREA_RE = /shape[_.]?area|shape[_.]?length/i;

const ABBREVIATIONS = {
  ASSD: 'ASSESSED', ASSESS: 'ASSESSED', ASSESSOR: 'ASSESSED', VAL: 'VALUE',
  DESC: 'DESCRIPTION', ADDR: 'ADDRESS', SUBDIV: 'SUBDIVISION',
  IMP: 'IMPROVEMENT', IMPRV: 'IMPROVEMENT', BLDG: 'BUILDING',
  ACRE: 'ACRES', YR: 'YEAR', BLT: 'BUILT', MKT: 'MARKET',
  APPR: 'APPRAISED', APPRAISE: 'APPRAISED', LGL: 'LEGAL',
  NUM: 'NUMBER', QTY: 'COUNT', CNT: 'COUNT', DT: 'DATE',
  PRC: 'PRICE', PRICE: 'PRICE', AMT: 'AMOUNT', TX: 'TAX',
  OVLY: 'OVERLAY', DIST: 'DISTRICT', TRACT: 'TRACT', CENSUS: 'CENSUS',
};

function normalizeCanonicalId(id) {
  return String(id).toUpperCase().replace(/_/g, '');
}

function normalizeSourceField(name) {
  const tokens = String(name).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  return tokens.map(tok => ABBREVIATIONS[tok] || tok).join('');
}

function buildSynonymIndex(synonyms) {
  // canonicalId -> Set of uppercased known-verified source field names
  const index = new Map();
  for (const [canonicalId, entries] of Object.entries(synonyms || {})) {
    index.set(canonicalId, new Set(entries.map(e => String(e.name).toUpperCase())));
  }
  return index;
}

/**
 * Pure function. sourceFieldNames: string[] (real field names from a live
 * service). canonicalFieldIds: string[] (the 30 ids from schema.js).
 * synonyms: the parcel_field_synonyms.json `synonyms` object (canonicalId
 * -> [{name, seen_in}]) — passed in rather than loaded here so this stays
 * network/filesystem-free and directly unit-testable.
 */
export function mapFields(sourceFieldNames, canonicalFieldIds, synonyms) {
  const synonymIndex = buildSynonymIndex(synonyms);
  const sourceUpper = sourceFieldNames.map(f => String(f).toUpperCase());
  const claimedSource = new Set();   // uppercased source field names already used
  const claimedCanonical = new Set();
  const fieldMap = {};
  const requiresReview = [];

  // ── Tier 1: exact, already human-verified synonyms ──
  // Deliberately NOT gated on claimedSource here: the same physical source
  // field genuinely and correctly serves two different canonical roles in
  // real entries (e.g. Loudoun County VA's single identifier column,
  // PA_MCPI, is independently verified as both parcel_id and pin) — each
  // canonical field's tier-1 match is an independently-verified fact, not a
  // claim that competes with another canonical field's match on the same
  // source string. claimedSource is still recorded afterward so tier 2/3
  // (lower-confidence, heuristic) never independently re-guesses a field
  // tier 1 already resolved for some other canonical role.
  for (const canonicalId of canonicalFieldIds) {
    if (canonicalId === 'county_fips') continue; // always '__computed__', never a source field
    const known = synonymIndex.get(canonicalId);
    if (!known) continue;

    // A generic name like PARCELID or PIN can be a genuinely verified
    // synonym for MORE THAN ONE canonical field across different real
    // jurisdictions (one place's parcel_id is another place's pin). If
    // this jurisdiction's own field list contains more than one DISTINCT
    // string that the corpus recognizes for this canonical id, that's a
    // real corpus collision, not a single obvious answer — guessing which
    // one applies HERE is exactly the kind of guess this pipeline refuses
    // to make silently, so it's flagged for review instead.
    const distinctMatches = [...new Set(sourceUpper.filter(f => known.has(f)))];
    if (distinctMatches.length === 1) {
      const original = sourceFieldNames[sourceUpper.indexOf(distinctMatches[0])];
      fieldMap[canonicalId] = original;
      claimedCanonical.add(canonicalId);
    } else if (distinctMatches.length > 1) {
      requiresReview.push({
        canonicalId,
        reason: 'tier1-corpus-collision',
        candidates: distinctMatches.map(m => sourceFieldNames[sourceUpper.indexOf(m)]),
        note: 'Multiple fields in this source are each independently verified elsewhere as this ' +
          'canonical field, so no single one is a safe default here — confirm which applies to this ' +
          'specific service against a real sample record.',
      });
    }
  }
  for (const value of Object.values(fieldMap)) claimedSource.add(String(value).toUpperCase());

  // ── Tier 2: unambiguous normalized-name match ──
  for (const canonicalId of canonicalFieldIds) {
    if (claimedCanonical.has(canonicalId)) continue;
    if (canonicalId === 'county_fips' || TIER2_DISABLED_FIELDS.has(canonicalId)) continue;
    // Already flagged as a tier-1 corpus collision above — don't let a
    // lower-confidence heuristic tier pile on with a second, different guess.
    if (requiresReview.some(r => r.canonicalId === canonicalId)) continue;

    const targetNorm = normalizeCanonicalId(canonicalId);
    const candidates = [];
    sourceFieldNames.forEach((original, i) => {
      const upper = sourceUpper[i];
      if (claimedSource.has(upper)) return;
      if (AREA_FIELDS.has(canonicalId) && SHAPE_AREA_RE.test(original)) return; // never inferred, tier 1 only
      if (normalizeSourceField(original) === targetNorm) candidates.push({ original, upper });
    });

    if (candidates.length === 1) {
      fieldMap[canonicalId] = candidates[0].original;
      claimedSource.add(candidates[0].upper);
      claimedCanonical.add(canonicalId);
    } else if (candidates.length > 1) {
      requiresReview.push({
        canonicalId,
        reason: 'ambiguous',
        candidates: candidates.map(c => c.original),
      });
    }
  }

  // ── Shape_Area/Length fields present but excluded from area_sqft/acres ──
  for (const original of sourceFieldNames) {
    if (SHAPE_AREA_RE.test(original) && !claimedSource.has(String(original).toUpperCase())) {
      requiresReview.push({
        sourceField: original,
        reason: 'shape-area-pattern-excluded',
        note: 'Matches a Shape_Area/Shape_Length pattern. Never auto-mapped to area_sqft/area_acres — ' +
          'units depend on the service\'s spatialReference (a Web Mercator/geographic layer\'s Shape_Area ' +
          'is not usable as square footage; a projected feet-based layer\'s may be). Verify the live ' +
          'spatialReference and a real sample value before mapping by hand.',
      });
    }
  }

  // ── Tier 3: fuzzy substring hint for anything still unclaimed ──
  // Never auto-maps (that's exactly the "guessing" this pipeline refuses to
  // do) — just stops a near-miss like TOTAL_LAND_VALUE from silently
  // becoming "this source doesn't have land_value at all" when it likely
  // does, under a name Tier 2's exact normalized-match is deliberately too
  // strict to catch. Applies even to TIER2_DISABLED_FIELDS (address/
  // owner_mailing/legal_desc) as a hint only — surfacing "SITUS_ADDRESS
  // exists, go look at it" is useful; auto-mapping it is not.
  for (const canonicalId of canonicalFieldIds) {
    if (canonicalId === 'county_fips' || claimedCanonical.has(canonicalId)) continue;
    if (requiresReview.some(r => r.canonicalId === canonicalId)) continue;

    const targetNorm = normalizeCanonicalId(canonicalId);
    const fuzzy = sourceFieldNames.filter((original, i) => {
      if (claimedSource.has(sourceUpper[i])) return false;
      const n = normalizeSourceField(original);
      return n.length > targetNorm.length && n.includes(targetNorm);
    });
    if (fuzzy.length) {
      requiresReview.push({ canonicalId, reason: 'fuzzy-candidate', candidates: fuzzy });
    }
  }

  // ── Everything else: confident notProvidedBySource ──
  const notProvidedBySource = canonicalFieldIds.filter(
    id => id !== 'county_fips' && !claimedCanonical.has(id) &&
      !requiresReview.some(r => r.canonicalId === id)
  );

  fieldMap.county_fips = '__computed__';

  return { fieldMap, notProvidedBySource, requiresReview };
}
