/* data/parcel_pipeline/coverage_rules.mjs
 *
 * The classification and scoring rules behind data/parcel_coverage_metrics.json.
 *
 * Separated from the generator so the rules are readable on their own, unit
 * testable without touching the filesystem, and — most importantly — so the
 * thresholds are visible in one place rather than scattered through report
 * generation. Anyone who wants to argue with a jurisdiction's tier should be
 * able to read exactly why it got that tier in under a minute.
 *
 * WHAT THESE NUMBERS ARE AND ARE NOT
 * ----------------------------------
 * These tiers and scores measure ONE thing: how many canonical fields a
 * jurisdiction's configured sources are wired up to populate. That is a
 * useful engineering signal — it tells us where to spend the next day of
 * work — and it is emphatically NOT a measure of data quality, accuracy,
 * freshness, or fitness for any real estate decision.
 *
 * A county can score 100 here while publishing values that are five years
 * stale, and a county scoring 30 may publish immaculate geometry. The score
 * says "we have wired up 100% of what this publisher exposes", nothing more.
 *
 * The tier boundaries below are judgment calls, not discoveries. They were
 * chosen so the tiers correspond to recognizable real-world situations (a
 * boundary-only service; a service with valuation but no sales; a genuinely
 * complete CAMA join), not derived from any statistical property of the data.
 * The per-category coverage percentages the generator emits alongside them
 * are the more honest number, and the report says so.
 */

/* Canonical fields grouped into the categories the coverage report reasons
   about. A field appearing in no group is simply not counted — the groups
   are the report's vocabulary, not an exhaustive partition of the schema. */
export const FIELD_CATEGORIES = Object.freeze({
  /* 'area' rather than 'geometry' on purpose. Every connector in this system
     returns polygons — geometry is universal and measuring it would report
     100% for everyone. What actually varies is whether the publisher exposes
     a usable AREA attribute, which is what site sizing depends on. Calling
     this category 'geometry' would have quietly implied some jurisdictions
     lack boundaries, which is false. */
  area:       ['area_acres', 'area_sqft'],
  identity:   ['parcel_id', 'pin'],
  address:    ['address'],
  ownership:  ['owner', 'owner_mailing'],
  assessment: ['assessed_value', 'land_value', 'improvement_value', 'tax_year'],
  sales:      ['last_sale_date', 'last_sale_price'],
  zoning:     ['zoning_code'],
  building:   ['building_count', 'year_built', 'gross_floor_area'],
  legal:      ['deed_book', 'deed_page', 'legal_desc'],
  land_use:   ['land_use_code', 'land_use_desc'],
});

/* Weighted quality score. Transparent by construction: every weight is
   visible here, the components are reported individually alongside the total,
   and the arithmetic is a plain weighted sum with no hidden terms.

   Polygon geometry is deliberately NOT scored. It is a precondition — a
   parcel source without it is not a parcel source at all — so scoring it
   would hand every jurisdiction the same free points and compress the range
   that actually distinguishes them. The 'area' category below scores the
   publisher's area ATTRIBUTE, which genuinely varies.

   The weights encode a specific claim about CRE site intelligence: valuation
   and sales evidence (15 each) do more work than an address (10), and
   ownership matters because assemblage and contiguity analysis depend on it.
   Reasonable people would weight these differently; that is why they are
   constants in a file rather than magic numbers in a loop. */
export const QUALITY_WEIGHTS = Object.freeze({
  identity:   10,
  area:        5,
  address:    10,
  ownership:  10,
  assessment: 15,
  sales:      15,
  zoning:     15,
  building:   10,
  land_use:    5,
  legal:       5,
  provenance:  5,   // has a declared enrichment source with recorded confidence
});

export const MAX_QUALITY_SCORE = Object.values(QUALITY_WEIGHTS).reduce((a, b) => a + b, 0);

export const TIERS = Object.freeze({
  FULL_INTELLIGENCE: 'full-intelligence',
  RICH:              'rich',
  STANDARD:          'standard',
  BASIC:             'basic',
  BOUNDARY_ONLY:     'boundary-only',
  DEGRADED:          'degraded',
  BLOCKED:           'blocked',
  UNSUPPORTED:       'unsupported',
});

export const TIER_DESCRIPTIONS = Object.freeze({
  [TIERS.FULL_INTELLIGENCE]: 'Geometry, ownership, assessment, sales, and zoning all wired up.',
  [TIERS.RICH]:              'Geometry and identity plus ownership/address and valuation.',
  [TIERS.STANDARD]:          'Geometry plus several useful attribute categories.',
  [TIERS.BASIC]:             'Geometry and identity plus limited attributes.',
  [TIERS.BOUNDARY_ONLY]:     'Essentially polygons and an identifier.',
  [TIERS.DEGRADED]:          'Normally supported, but one or more configured sources are currently failing.',
  [TIERS.BLOCKED]:           'A known source problem prevents use.',
  [TIERS.UNSUPPORTED]:       'No verified source yet.',
});

/* Which categories does this jurisdiction have at least one populated field
   for? Counts both the base fieldMap and any enrichment source's fieldMap,
   since from the panel's point of view a joined field is a present field. */
export function categoriesPresent(entry) {
  const provided = new Set(Object.keys(entry.fieldMap || {}));
  for (const source of ((entry.enrichment || {}).sources || [])) {
    for (const canonical of Object.keys(source.fieldMap || {})) provided.add(canonical);
  }

  const present = {};
  for (const [category, fields] of Object.entries(FIELD_CATEGORIES)) {
    present[category] = fields.some(f => provided.has(f));
  }
  return present;
}

/* Per-category fill ratio (0..1) rather than a boolean — "assessment" with 1
   of 4 fields is genuinely weaker than one with all 4, and the quality score
   should reflect that instead of rounding both up to "has assessment". */
export function categoryRatios(entry) {
  const provided = new Set(Object.keys(entry.fieldMap || {}));
  for (const source of ((entry.enrichment || {}).sources || [])) {
    for (const canonical of Object.keys(source.fieldMap || {})) provided.add(canonical);
  }

  const ratios = {};
  for (const [category, fields] of Object.entries(FIELD_CATEGORIES)) {
    const hit = fields.filter(f => provided.has(f)).length;
    ratios[category] = fields.length ? hit / fields.length : 0;
  }
  return ratios;
}

/* The transparent weighted score. Returns the total AND every component, so
   the dashboard can show the breakdown rather than a bare number. */
export function qualityScore(entry) {
  const ratios = categoryRatios(entry);
  const components = {};
  let total = 0;

  for (const [category, weight] of Object.entries(QUALITY_WEIGHTS)) {
    if (category === 'provenance') continue;
    const earned = (ratios[category] || 0) * weight;
    components[category] = { weight, ratio: ratios[category] || 0, earned: round1(earned) };
    total += earned;
  }

  // Provenance credit is for having a DECLARED secondary source with a stated
  // confidence — i.e. the jurisdiction's data can be attributed field by
  // field rather than assumed. It is not credit for the data being good.
  const sources = (entry.enrichment || {}).sources || [];
  const hasProvenance = sources.length > 0 && sources.every(s => !!s.confidence);
  const provEarned = hasProvenance ? QUALITY_WEIGHTS.provenance : 0;
  components.provenance = {
    weight: QUALITY_WEIGHTS.provenance,
    ratio: hasProvenance ? 1 : 0,
    earned: provEarned,
  };
  total += provEarned;

  return { total: round1(total), max: MAX_QUALITY_SCORE, components };
}

function round1(n) { return Math.round(n * 10) / 10; }

/* Assigns a tier.
 *
 * Order matters and is deliberate: operational state (blocked/degraded) overrides
 * field depth, because a jurisdiction whose CAMA service is down right now is
 * not "rich" no matter how many fields its config names. A user looking at it
 * today sees a boundary-only parcel.
 *
 * `health` is optional and comes from the service checker; absent, tiers are
 * assigned purely on configured depth. */
export function classify(entry, health = null) {
  if (!entry || !entry.serviceUrl) return TIERS.UNSUPPORTED;

  if (health && health.status === 'blocked') return TIERS.BLOCKED;
  if (health && health.status === 'failing') return TIERS.DEGRADED;

  const present = categoriesPresent(entry);
  if (!present.area && !present.identity) return TIERS.UNSUPPORTED;

  const has = (c) => !!present[c];

  // Full intelligence requires the complete CRE picture: who owns it, what
  // it's worth, what it last traded for, and what it may be used for.
  if (has('ownership') && has('assessment') && has('sales') && has('zoning')) {
    return TIERS.FULL_INTELLIGENCE;
  }

  // Rich: identity plus a way to reach the owner, plus a valuation.
  if ((has('ownership') || has('address')) && has('assessment')) {
    return TIERS.RICH;
  }

  const attributeCategories = ['address', 'ownership', 'assessment', 'sales', 'zoning', 'building', 'legal', 'land_use'];
  const attributeCount = attributeCategories.filter(has).length;

  if (attributeCount >= 3) return TIERS.STANDARD;
  if (attributeCount >= 1) return TIERS.BASIC;
  return TIERS.BOUNDARY_ONLY;
}

/* Ranks the jurisdictions worth working on next. Facility count leads because
   the product exists to analyze data center sites: enriching a county with 40
   facilities beats a county with none, whatever their field gaps look like.

   `effort` is a coarse, honest guess from what the catalog already knows, not
   a estimate anyone should schedule against. */
export function rankOpportunities(catalogJurisdictions, facilityCounts, registryFips) {
  const covered = new Set(registryFips);
  const out = [];

  for (const [fips, j] of Object.entries(catalogJurisdictions || {})) {
    if (covered.has(fips)) continue;
    if (j.status === 'rejected') continue;

    const facilities = facilityCounts[fips] || j.facility_count || 0;
    if (!facilities) continue;   // no facilities means no reason to prioritize it here

    out.push({
      fips,
      name: j.name,
      state: j.state,
      facilities,
      status: j.status,
      likelySource: j.service_url || j.portal_url || null,
      sourceType: j.source_type || null,
      sharedService: !!j.shared_service_id,
      fieldsAvailable: Array.isArray(j.available_fields) ? j.available_fields.length : null,
      effort: estimateEffort(j),
      previousInvestigation: j.status === 'candidate' ? 'catalogued, not yet promoted'
        : j.status === 'blocked' ? 'investigated, blocked'
        : j.status === 'requires-review' ? 'investigated, needs human review'
        : 'not investigated',
    });
  }

  return out.sort((a, b) => b.facilities - a.facilities || a.fips.localeCompare(b.fips));
}

function estimateEffort(j) {
  // A known queryable service with a field list is close to a config change.
  if (j.service_url && j.query_support && Array.isArray(j.available_fields) && j.available_fields.length) return 'low';
  if (j.service_url) return 'medium';
  if (j.portal_url) return 'high';
  return 'unknown';
}
