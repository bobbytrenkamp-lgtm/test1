/* data/parcel_pipeline/discovery/enrichment_candidates.mjs
 *
 * Finds and EMPIRICALLY VERIFIES CAMA/assessment table join candidates for a
 * jurisdiction that already has a working parcel geometry service.
 *
 * WHY VERIFICATION, NOT INFERENCE
 * -------------------------------
 * The rest of the discovery pipeline is careful never to guess a field name;
 * this module extends the same discipline to joins, where guessing is even
 * more dangerous. A wrong parcel-boundary field mapping renders a blank row.
 * A wrong JOIN silently attributes one property's owner and assessed value to
 * a different property — data that looks completely plausible and is
 * completely wrong.
 *
 * So a candidate is never proposed on the strength of a promising layer name
 * or a field called PARCELID. It is proposed only after this module has:
 *
 *   1. pulled a real sample of parcel ids from the jurisdiction's live parcel
 *      layer,
 *   2. queried the candidate table with those exact ids, and
 *   3. measured what fraction actually came back.
 *
 * That measured match rate is the evidence. A candidate that matches 3 of 25
 * sampled parcels is rejected no matter how convincing its name was, and the
 * rate travels with the draft so a human reviewer sees the number rather than
 * a verdict.
 *
 * Network-dependent by nature. Every function takes a `ctx` carrying the
 * fetch helpers, so tests inject stubs rather than reaching the internet.
 */

import { fetchJsonWithRetry } from './network.mjs';
import { inspectArcGISLayer } from './schema.mjs';

/* Layer/table names that suggest assessment or CAMA content. Used only to
   ORDER candidates for probing -- never to accept one. Names are a hint about
   where to look first, not evidence of anything. */
export const CAMA_NAME_KEYWORDS = [
  'cama', 'assessment', 'assessor', 'appraisal', 'property', 'real estate',
  'realestate', 'tax', 'ownership', 'owner', 'parcel detail', 'parceldata',
  'land record', 'valuation',
];

/* Source columns that plausibly hold a parcel identifier, most to least
   specific. Again: ordering only. The join is verified by querying, not by
   trusting one of these names. */
export const JOIN_FIELD_CANDIDATES = [
  'pin', 'gpin', 'parcelid', 'parcel_id', 'parcelno', 'parcelnumber',
  'apn', 'ain', 'pid', 'propertyid', 'taxid', 'taxparcelid', 'accountnumber',
  'acctnum', 'mapnumber', 'mcpi', 'pamcpi', 'strap', 'folio',
];

/* A join must match at least this share of a live parcel sample to be
   proposed at all. 0.80 is deliberately demanding: a genuine parcel-to-CAMA
   join in the same county should be near-total, and the gap between "nearly
   all" and "most" is usually a formatting mismatch this module has not
   modeled correctly rather than a genuinely partial dataset. Anything below
   this is reported with its rate and marked rejected, not quietly promoted. */
export const MIN_MATCH_RATE = 0.80;

/* Sample size for the verification query. Large enough that a match rate is
   meaningful, small enough to stay polite to a county server that is doing
   this for free. */
export const DEFAULT_SAMPLE_SIZE = 25;

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/* Scores how CAMA-ish a layer/table name looks. Ordering heuristic only. */
export function scoreLayerName(name) {
  const n = norm(name);
  if (!n) return 0;
  let score = 0;
  for (const kw of CAMA_NAME_KEYWORDS) {
    if (n.includes(norm(kw))) score += 1;
  }
  // A layer literally called "parcels" is usually the geometry layer we
  // already have, not the attribute table we're looking for.
  if (n === 'parcels' || n === 'parcel') score -= 2;
  return score;
}

/* Ranks the sibling layers and tables of a service as join candidates.
   Tables outrank layers: a non-spatial table on a parcel service is almost
   always exactly the attribute companion we want, whereas a second polygon
   layer is more often a different geography entirely. */
export function rankJoinCandidates(serviceInfo, opts = {}) {
  const excludeLayerId = opts.excludeLayerId;
  const out = [];

  /* The name has to earn inclusion on its own. The table bonus is applied
     only AFTER that filter, as an ordering preference between candidates
     that already look relevant -- folding it in beforehand would admit every
     non-spatial table on the service (a streetlight inventory, a permit log)
     purely for being a table. */
  for (const t of (serviceInfo.tables || [])) {
    const nameScore = scoreLayerName(t.name);
    if (nameScore <= 0) continue;
    out.push({ kind: 'table', id: t.id, name: t.name, score: nameScore + 2 });
  }
  for (const l of (serviceInfo.layers || [])) {
    if (excludeLayerId != null && String(l.id) === String(excludeLayerId)) continue;
    const nameScore = scoreLayerName(l.name);
    if (nameScore <= 0) continue;
    out.push({ kind: 'layer', id: l.id, name: l.name, score: nameScore });
  }

  return out.sort((a, b) => b.score - a.score || a.id - b.id);
}

/* Picks which of a candidate's own fields to try as the join column.
   Returns an ordered list, best guess first. Every one of these still has to
   survive an actual match-rate probe. */
export function proposeJoinFields(candidateFields, baseJoinFieldName) {
  const names = (candidateFields || []).map(f => f.name).filter(Boolean);
  const scored = [];

  for (const name of names) {
    const n = norm(name);
    let score = 0;

    // An identically-named column on both sides is the strongest available
    // hint -- counties that split geometry from CAMA usually keep the key's
    // name.
    if (baseJoinFieldName && n === norm(baseJoinFieldName)) score += 10;

    const idx = JOIN_FIELD_CANDIDATES.findIndex(c => n === norm(c));
    if (idx >= 0) score += 8 - Math.min(idx, 7);
    else if (JOIN_FIELD_CANDIDATES.some(c => n.includes(norm(c)))) score += 2;

    // OBJECTID is an ArcGIS row number, not a parcel identity. Joining on it
    // would produce a confident, meaningless match between two unrelated
    // tables -- exactly the failure this module exists to prevent.
    if (n === 'objectid' || n === 'fid' || n === 'oid') score = -100;

    if (score > 0) scored.push({ name, score });
  }

  return scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).map(s => s.name);
}

/* Pulls a sample of real join-key values from the jurisdiction's own parcel
   layer. These are the ground truth the candidate is measured against. */
export async function sampleBaseKeys(parcelLayerUrl, baseSourceField, ctx = {}, count = DEFAULT_SAMPLE_SIZE) {
  const url = `${parcelLayerUrl.replace(/\/+$/, '')}/query?where=${encodeURIComponent(`${baseSourceField} IS NOT NULL`)}` +
    `&outFields=${encodeURIComponent(baseSourceField)}&returnGeometry=false` +
    `&resultRecordCount=${count}&f=json`;

  const { result, classified } = await fetchJsonWithRetry(url, {
    timeoutMs: ctx.timeoutMs, maxRetries: ctx.maxRetries,
  });

  if (!classified.ok || !classified.body) {
    return { ok: false, why: classified.why || 'parcel layer sample failed', keys: [] };
  }
  if (classified.body.error) {
    return { ok: false, why: `ArcGIS error: ${classified.body.error.message || 'unknown'}`, keys: [] };
  }

  const keys = [];
  for (const f of (classified.body.features || [])) {
    const v = (f.attributes || {})[baseSourceField];
    if (v != null && String(v).trim() !== '') keys.push(String(v).trim());
  }
  return { ok: keys.length > 0, why: keys.length ? null : 'parcel layer returned no usable key values', keys, httpStatus: result.httpStatus };
}

function sqlQuote(v) { return `'${String(v).replace(/'/g, "''")}'`; }

/* THE verification step: query the candidate with real parcel ids and count
   how many come back.

   Tries each join-key formatting variant separately rather than merging them,
   because WHICH variant works is itself the finding -- it becomes the
   source's `joinNormalize` config. A county storing '0123-45-6789' on its
   parcel layer and '0123456789' in CAMA is a supported, common case, but only
   if the draft records that stripNonAlnum is required. */
export async function verifyJoin(candidateUrl, joinField, sampleKeys, ctx = {}) {
  const variants = [
    { label: 'exact',      normalize: {},                                   transform: (k) => k },
    { label: 'stripped',   normalize: { stripNonAlnum: true },              transform: (k) => k.replace(/[^A-Za-z0-9]/g, '') },
    { label: 'upper',      normalize: { upper: true },                      transform: (k) => k.toUpperCase() },
  ];

  const attempts = [];

  for (const variant of variants) {
    const values = Array.from(new Set(sampleKeys.map(variant.transform).filter(v => v !== '')));
    if (!values.length) continue;

    const where = `${joinField} IN (${values.map(sqlQuote).join(',')})`;
    const url = `${candidateUrl.replace(/\/+$/, '')}/query?where=${encodeURIComponent(where)}` +
      `&outFields=${encodeURIComponent(joinField)}&returnGeometry=false&resultRecordCount=1000&f=json`;

    const { classified } = await fetchJsonWithRetry(url, {
      timeoutMs: ctx.timeoutMs, maxRetries: ctx.maxRetries,
    });

    if (!classified.ok || !classified.body) {
      attempts.push({ variant: variant.label, ok: false, why: classified.why || 'request failed', matchRate: 0 });
      continue;
    }
    if (classified.body.error) {
      // A bad field name or type mismatch lands here. Recorded rather than
      // thrown: a variant failing is information, and the next one may work.
      attempts.push({
        variant: variant.label, ok: false, matchRate: 0,
        why: `ArcGIS error: ${classified.body.error.message || 'unknown'}`,
      });
      continue;
    }

    // Count DISTINCT returned keys, not rows. CAMA tables legitimately carry
    // several rows per parcel (one per building, one per owner of record),
    // and counting rows would let a table with 3 rows for 1 parcel report a
    // 300% match rate against a 1-parcel sample.
    const returned = new Set();
    for (const f of (classified.body.features || [])) {
      const v = (f.attributes || {})[joinField];
      if (v != null && String(v).trim() !== '') returned.add(String(v).trim().toUpperCase());
    }

    const wanted = new Set(values.map(v => v.toUpperCase()));
    let matched = 0;
    for (const w of wanted) if (returned.has(w)) matched++;

    attempts.push({
      variant: variant.label,
      ok: true,
      matchRate: wanted.size ? matched / wanted.size : 0,
      matched,
      sampled: wanted.size,
      normalize: variant.normalize,
    });
  }

  const best = attempts
    .filter(a => a.ok)
    .sort((a, b) => b.matchRate - a.matchRate)[0] || null;

  return {
    joinField,
    attempts,
    best,
    // The verdict is explicit and threshold-based, and the rate is always
    // reported alongside it so a reviewer can disagree with the threshold.
    verified: !!(best && best.matchRate >= MIN_MATCH_RATE),
  };
}

/* Full evaluation of one candidate: inspect its schema, propose join columns,
   verify each until one passes, and map its remaining fields to the canonical
   fields the base entry is missing.

   `mapFieldsFn` is injected (rather than imported) so this module has no
   opinion about the mapper's tiering rules and tests can supply a stub. */
export async function evaluateCandidate(candidate, opts, ctx = {}) {
  const {
    candidateUrl, baseJoinSourceField, sampleKeys, missingCanonicalFields,
    mapFieldsFn, synonyms,
  } = opts;

  const info = await inspectArcGISLayer(candidateUrl, ctx);
  if (!info.ok) {
    return { ...candidate, url: candidateUrl, status: 'unreachable', why: info.why || info.errorType };
  }
  if (!info.fields || !info.fields.length) {
    return { ...candidate, url: candidateUrl, status: 'no-fields', why: 'layer exposes no field list' };
  }

  const joinFields = proposeJoinFields(info.fields, baseJoinSourceField);
  if (!joinFields.length) {
    return {
      ...candidate, url: candidateUrl, status: 'no-join-field',
      why: 'no field on this layer resembles a parcel identifier',
      fieldNames: info.fields.map(f => f.name),
    };
  }

  const verifications = [];
  let winner = null;
  for (const jf of joinFields.slice(0, 4)) {   // bounded: don't probe 40 columns on a wide table
    const v = await verifyJoin(candidateUrl, jf, sampleKeys, ctx);
    verifications.push(v);
    if (v.verified) { winner = v; break; }
  }

  if (!winner) {
    const bestSeen = verifications
      .map(v => v.best).filter(Boolean)
      .sort((a, b) => b.matchRate - a.matchRate)[0];
    return {
      ...candidate,
      url: candidateUrl,
      status: 'join-unverified',
      why: bestSeen
        ? `best match rate ${(bestSeen.matchRate * 100).toFixed(0)}% on ${bestSeen.sampled} sampled parcels ` +
          `(threshold ${(MIN_MATCH_RATE * 100).toFixed(0)}%)`
        : 'no join column could be queried successfully',
      verifications,
    };
  }

  // Only map the canonical fields the base entry actually lacks. Proposing a
  // secondary source for something the geometry layer already publishes adds
  // a conflict for no gain.
  const mapping = mapFieldsFn(
    info.fields.map(f => f.name),
    missingCanonicalFields,
    synonyms,
  );

  const fieldMap = { ...(mapping.fieldMap || {}) };
  // The join column is machinery, not content: it must not also be proposed
  // as a canonical value.
  for (const [canonical, column] of Object.entries(fieldMap)) {
    if (column === winner.joinField) delete fieldMap[canonical];
  }

  return {
    ...candidate,
    url: candidateUrl,
    status: Object.keys(fieldMap).length ? 'verified' : 'verified-but-empty',
    why: Object.keys(fieldMap).length
      ? null
      : 'join verified, but none of this layer\'s fields map to a canonical field the base entry is missing',
    joinField: winner.joinField,
    joinNormalize: winner.best.normalize,
    matchRate: winner.best.matchRate,
    matched: winner.best.matched,
    sampled: winner.best.sampled,
    fieldMap,
    needsReview: mapping.needsReview || [],
    fieldNames: info.fields.map(f => f.name),
    verifications,
  };
}

/* Turns a verified candidate into the `enrichment.sources[]` entry that goes
   into registry.js. Confidence is official-joined, never direct-official:
   the value reached the parcel through a key match this system performed. */
export function toEnrichmentSource(evaluated, opts = {}) {
  return {
    id: opts.id || `${opts.jurisdictionId || 'jurisdiction'}-cama`,
    label: opts.label || evaluated.name || 'Assessment table',
    type: 'arcgis-table',
    url: evaluated.url,
    baseField: opts.baseField || 'parcel_id',
    joinField: evaluated.joinField,
    joinNormalize: evaluated.joinNormalize && Object.keys(evaluated.joinNormalize).length
      ? evaluated.joinNormalize : undefined,
    confidence: 'official-joined',
    fieldMap: evaluated.fieldMap,
  };
}
