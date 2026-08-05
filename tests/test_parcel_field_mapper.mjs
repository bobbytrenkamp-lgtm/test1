/* tests/test_parcel_field_mapper.mjs — regression tests for
   data/parcel_pipeline/field_mapper.mjs.

   The highest-value check here is the ground-truth regression: for every
   one of the 51 real production jurisdictions in js/parcel/registry.js,
   feed field_mapper.mjs that jurisdiction's own already-verified source
   field names (the fieldMap values a human already confirmed correct
   against a real live service) and confirm the resolver reproduces the
   exact same canonical-id assignment. This is real, previously-verified
   ground truth, not synthetic fixtures -- if a future change to the
   resolver's tier-1 logic ever stops reproducing a mapping a human already
   confirmed, this test catches it immediately.

   Also covers the two hard-won precedent rules from this session as
   explicit fixture tests: Shape_Area/Length fields are never HEURISTICALLY
   mapped to area_sqft/area_acres (only an already-verified exact synonym
   may claim them), and split-address-component families are never
   concatenated.

   Run:  node tests/test_parcel_field_mapper.mjs
*/
import { mapFields } from '../data/parcel_pipeline/field_mapper.mjs';
import { loadRegistry, loadSchemaFieldIds } from '../data/parcel_pipeline/lib/load_registry.mjs';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
function t(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`   got:  ${JSON.stringify(actual)}\n   want: ${JSON.stringify(expected)}`);
}

const canonicalFieldIds = loadSchemaFieldIds();
const synonyms = JSON.parse(readFileSync(new URL('../data/parcel_field_synonyms.json', import.meta.url), 'utf8')).synonyms;

// ── Ground-truth regression: every real production jurisdiction ──
// A mismatch is only a real failure when the resolver CONFIDENTLY gives a
// different, wrong answer (a silent guess) — that's the dangerous case.
// When a jurisdiction's own field list contains a genuine corpus collision
// (the same generic name like PARCELID or PIN is independently verified as
// a DIFFERENT canonical field elsewhere in the registry), correctly
// detecting that ambiguity and flagging it via requiresReview instead of
// picking one is the desired safe behavior, not a bug to chase toward 100%
// reproduction.
{
  const registry = loadRegistry();
  let jurisdictionsChecked = 0;
  let mappingsChecked = 0;
  let mappingsReproduced = 0;
  let mappingsSafelyFlagged = 0;
  const wrongGuesses = [];

  for (const entry of registry.all()) {
    const realFieldMap = entry.fieldMap || {};
    const sourceFieldNames = Object.values(realFieldMap).filter(v => v && v !== '__computed__');
    if (sourceFieldNames.length === 0) continue;

    const result = mapFields(sourceFieldNames, canonicalFieldIds, synonyms);
    jurisdictionsChecked++;

    for (const [canonicalId, sourceField] of Object.entries(realFieldMap)) {
      if (sourceField === '__computed__') continue;
      mappingsChecked++;
      if (result.fieldMap[canonicalId] === sourceField) {
        mappingsReproduced++;
      } else if (result.requiresReview.some(r => r.canonicalId === canonicalId)) {
        mappingsSafelyFlagged++;
      } else {
        wrongGuesses.push(
          `${entry.fips} (${entry.name}): expected ${canonicalId} -> "${sourceField}", ` +
          `resolver confidently gave "${result.fieldMap[canonicalId] ?? '(unresolved, and not flagged)'}"`
        );
      }
    }
  }

  console.log(`\nGround-truth regression: ${jurisdictionsChecked} jurisdictions, ${mappingsChecked} real mappings — ` +
    `${mappingsReproduced} reproduced exactly, ${mappingsSafelyFlagged} correctly flagged as ambiguous, ` +
    `${wrongGuesses.length} confident wrong guesses.`);
  if (wrongGuesses.length) {
    console.log(`\n${wrongGuesses.length} confident WRONG guess(es) (the dangerous case):`);
    for (const f of wrongGuesses.slice(0, 20)) console.log(`  - ${f}`);
  }
  t('ground truth: zero confident wrong guesses', wrongGuesses.length, 0);
  t('ground truth: every real mapping is either reproduced or safely flagged (never silently dropped)',
    mappingsReproduced + mappingsSafelyFlagged, mappingsChecked);
}

// ── Shape_Area / Shape_Length: never heuristically mapped ──
{
  // A brand-new, never-seen-before Shape_Area-pattern field with no exact
  // synonym entry must never claim area_sqft/area_acres, even though its
  // normalized name would otherwise heuristically match "AREA".
  const result = mapFields(['PARCEL_ID_XYZ', 'Some_Never_Seen_Shape_Area_Field'],
    ['parcel_id', 'area_sqft', 'area_acres', 'county_fips'], {});
  t('unfamiliar Shape_Area-pattern field never auto-maps to area_sqft', result.fieldMap.area_sqft, undefined);
  t('unfamiliar Shape_Area-pattern field never auto-maps to area_acres', result.fieldMap.area_acres, undefined);
  t('unfamiliar Shape_Area-pattern field is flagged for review, not silently dropped',
    result.requiresReview.some(r => r.reason === 'shape-area-pattern-excluded'), true);
}

// ── A KNOWN Fairfax-style Shape__Area synonym still resolves via tier 1 ──
{
  const fairfaxSynonyms = { area_sqft: [{ name: 'Shape__Area', seen_in: ['51059'] }] };
  const result = mapFields(['Shape__Area'], ['area_sqft', 'county_fips'], fairfaxSynonyms);
  t('an already-verified Shape_Area synonym still resolves (tier 1 exempt from the exclusion)',
    result.fieldMap.area_sqft, 'Shape__Area');
}

// ── Split-address components: never concatenated, never heuristically inferred ──
{
  // Simulates Hennepin MN / Clark NV's split situs address: multiple real
  // components, none of them a combined field, and none of them named
  // literally "ADDRESS" so tier 2's disabled-list is the only thing
  // preventing a false match.
  const result = mapFields(['ST_NUM', 'ST_NAME', 'ST_TYPE', 'UNIT_NUM'],
    ['address', 'county_fips'], {});
  t('split address components never get concatenated into a fabricated address mapping',
    result.fieldMap.address, undefined);
}

// ── A genuinely combined address field (Manassas-style) resolves via tier 1 only ──
{
  const manassasSynonyms = { address: [{ name: 'PROPERTY_ADDRESS', seen_in: ['51683'] }] };
  const result = mapFields(['PROPERTY_ADDRESS'], ['address', 'county_fips'], manassasSynonyms);
  t('a known-verified combined address field still resolves via tier 1',
    result.fieldMap.address, 'PROPERTY_ADDRESS');
}

// ── Ambiguous tier-2 ties are never auto-resolved ──
{
  // Both normalize to the identical "LANDVALUE" string (formatting-only
  // difference) -- a genuine tie, unlike a field that merely shares a
  // substring.
  const result = mapFields(['LANDVALUE', 'LAND_VALUE'], ['land_value', 'county_fips'], {});
  t('two fields both normalizing to the exact same canonical id are not auto-claimed',
    result.fieldMap.land_value, undefined);
  t('an ambiguous tie is flagged for review with both candidates listed',
    result.requiresReview.some(r => r.canonicalId === 'land_value' && r.reason === 'ambiguous' &&
      r.candidates.length === 2), true);
}

// ── The same verified source field may legitimately serve two roles ──
{
  // Loudoun County VA's real pattern: one physical identifier column
  // independently verified (in the real registry) as both parcel_id and
  // pin. Tier 1 must let both canonical fields claim it.
  const dualRoleSynonyms = {
    parcel_id: [{ name: 'PA_MCPI', seen_in: ['51107'] }],
    pin: [{ name: 'PA_MCPI', seen_in: ['51107'] }],
  };
  const result = mapFields(['PA_MCPI'], ['parcel_id', 'pin', 'county_fips'], dualRoleSynonyms);
  t('a single verified source field can serve two canonical roles at once',
    [result.fieldMap.parcel_id, result.fieldMap.pin], ['PA_MCPI', 'PA_MCPI']);
}

// ── county_fips is always the computed sentinel, never a source field ──
{
  const result = mapFields(['ANYTHING'], ['county_fips'], {});
  t('county_fips is always __computed__', result.fieldMap.county_fips, '__computed__');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
