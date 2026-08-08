/* js/parcel/provenance.js
 * window.PARCEL_PROVENANCE — where every canonical parcel field came from.
 *
 * Once a parcel record can be assembled from more than one government
 * service (geometry from the county's parcel layer, ownership and valuation
 * from its separate CAMA/assessment table, zoning from a third), "what is
 * this parcel's assessed value" stops having a single obvious answer and
 * starts needing a citation. This module is that citation layer: a small,
 * dependency-free vocabulary for recording, per field, which source
 * supplied the value, how directly that source knows it, and — for values
 * this application computed rather than read — exactly which inputs it was
 * computed from.
 *
 * Deliberately NOT a scoring system. Nothing here ranks a parcel or a
 * jurisdiction. It only answers "where did this number come from," so the
 * UI, the report generator, and any downstream consumer can show a source
 * instead of asking the user to trust a bare figure.
 *
 * Depends on: nothing. Safe to load before or after any other parcel module.
 */
window.PARCEL_PROVENANCE = (function () {
  'use strict';

  /* The property key under which per-field provenance records are stashed on
     a normalized parcel's properties object. Leading underscore matches the
     existing `_source` convention the connectors already use, and keeps it
     out of the schema-driven field loops in panel.js/report.js, which
     iterate PARCEL_SCHEMA.FIELDS rather than Object.keys(props). */
  const KEY = '_provenance';

  /* Confidence tiers, most to least direct.
   *
   * `rank` exists so conflict resolution can be deterministic and
   * inspectable (see enrichment.js's resolveConflict). It is an ordering,
   * not a score: rank 6 is not "twice as trustworthy" as rank 3, and these
   * numbers are never summed, averaged, or shown to users.
   *
   * The distinction that matters most in practice is DIRECT_OFFICIAL vs
   * OFFICIAL_JOINED: both come from the government, but a joined value
   * arrived through a key match this application performed, so a bad join
   * key silently produces confidently-wrong data. Joined values are ranked
   * below direct ones for exactly that reason. */
  const CONFIDENCE = {
    DIRECT_OFFICIAL: {
      id:    'direct-official',
      rank:  6,
      label: 'Official (direct)',
      desc:  'Read directly from the authoritative government service that publishes this parcel.',
    },
    OFFICIAL_JOINED: {
      id:    'official-joined',
      rank:  5,
      label: 'Official (joined)',
      desc:  'From an official government table, matched to this parcel on an exact shared identifier.',
    },
    OFFICIAL_DERIVED: {
      id:    'official-derived',
      rank:  4,
      label: 'Calculated from official values',
      desc:  'Computed by this application from official source values. See the derivation for its inputs.',
    },
    THIRD_PARTY_MIRROR: {
      id:    'third-party-mirror',
      rank:  3,
      label: 'Third-party mirror',
      desc:  'A non-government republication of official data. Content may lag or diverge from the original.',
    },
    INFERRED: {
      id:    'inferred',
      rank:  2,
      label: 'Inferred',
      desc:  'Estimated or inferred rather than published by any source. Treat as an approximation.',
    },
    UNKNOWN: {
      id:    'unknown',
      rank:  1,
      label: 'Unknown origin',
      desc:  'No provenance was recorded for this value.',
    },
  };

  const BY_ID = {};
  for (const tier of Object.values(CONFIDENCE)) BY_ID[tier.id] = tier;

  /* Every confidence id the configuration layer is allowed to name, exported
     so validators (check_registry_integrity.mjs, enrichment.js's config
     validation) can reject a typo like 'offical-joined' at load time rather
     than silently degrading it to unknown at render time. */
  const CONFIDENCE_IDS = Object.keys(BY_ID);

  function tier(confidenceId) {
    return BY_ID[String(confidenceId || '').trim()] || CONFIDENCE.UNKNOWN;
  }

  function isKnownConfidence(confidenceId) {
    return Object.prototype.hasOwnProperty.call(BY_ID, String(confidenceId || '').trim());
  }

  function rankOf(confidenceId) {
    return tier(confidenceId).rank;
  }

  /* Ordering comparator: positive when `a` is the more direct source.
     Used by enrichment.js so "which value wins" is a pure function of
     recorded confidence, never of fetch order or object key order. */
  function compareConfidence(a, b) {
    return rankOf(a) - rankOf(b);
  }

  /* Builds one provenance record.
   *
   * sourceField is kept because it is the single most useful thing to show a
   * developer debugging a wrong value: "assessed_value came from TOTVAL on
   * loudoun-cama" immediately distinguishes a bad field mapping from a bad
   * join, which the value alone never does. */
  function record(opts) {
    const o = opts || {};
    const confidence = isKnownConfidence(o.confidence) ? String(o.confidence).trim() : CONFIDENCE.UNKNOWN.id;
    const rec = {
      sourceId:    o.sourceId    != null ? String(o.sourceId)    : null,
      sourceLabel: o.sourceLabel != null ? String(o.sourceLabel) : null,
      confidence,
      sourceField: o.sourceField != null ? String(o.sourceField) : null,
      fetchedAt:   o.fetchedAt   != null ? String(o.fetchedAt)   : null,
      sourceUpdatedAt: o.sourceUpdatedAt != null ? String(o.sourceUpdatedAt) : null,
    };
    if (Array.isArray(o.derivedFrom) && o.derivedFrom.length) {
      rec.derivedFrom = o.derivedFrom.map(String);
    }
    if (o.note) rec.note = String(o.note);
    return rec;
  }

  /* Convenience constructor for a value this application computed.
     Requires derivedFrom: a derived number with no stated inputs is exactly
     the kind of unexplained figure this module exists to prevent, so an
     empty/missing list is recorded as INFERRED (an admission that we cannot
     explain it) rather than being dressed up as OFFICIAL_DERIVED. */
  function derived(opts) {
    const o = opts || {};
    const inputs = Array.isArray(o.derivedFrom) ? o.derivedFrom.filter(Boolean) : [];
    return record({
      ...o,
      confidence:  inputs.length ? CONFIDENCE.OFFICIAL_DERIVED.id : CONFIDENCE.INFERRED.id,
      derivedFrom: inputs,
    });
  }

  /* Attaches a record for one field. Mutates and returns `props` — callers
     are always working with a freshly-normalized properties object they own
     (the connectors build a new one per feature), never a shared one. */
  function attach(props, fieldId, rec) {
    if (!props || !fieldId || !rec) return props;
    if (!props[KEY] || typeof props[KEY] !== 'object') props[KEY] = {};
    props[KEY][fieldId] = rec;
    return props;
  }

  function get(props, fieldId) {
    if (!props || !props[KEY]) return null;
    return props[KEY][fieldId] || null;
  }

  function all(props) {
    return (props && props[KEY]) ? props[KEY] : {};
  }

  /* True when this field's value came from a source at least as direct as
     the given tier. Lets a caller say "only show sale figures that are
     genuinely official" without hardcoding rank arithmetic at the call site. */
  function isAtLeast(props, fieldId, confidenceId) {
    const rec = get(props, fieldId);
    if (!rec) return false;
    return rankOf(rec.confidence) >= rankOf(confidenceId);
  }

  /* Bulk-attaches one source's provenance across many fields at once — the
     shape enrichment.js produces after merging a joined record. */
  function attachMany(props, fieldIds, recTemplate) {
    for (const fieldId of (fieldIds || [])) {
      attach(props, fieldId, record({ ...recTemplate, sourceField: (recTemplate.sourceFields || {})[fieldId] || null }));
    }
    return props;
  }

  /* One-line human summary for a field, e.g.
     "Official (joined) — Loudoun County CAMA (TOTVAL)".
     Returns null when nothing is recorded, so callers can distinguish
     "no provenance" from a string that merely says "unknown". */
  function describe(props, fieldId) {
    const rec = get(props, fieldId);
    if (!rec) return null;
    const t = tier(rec.confidence);
    let out = t.label;
    if (rec.sourceLabel) out += ` — ${rec.sourceLabel}`;
    if (rec.sourceField) out += ` (${rec.sourceField})`;
    if (rec.derivedFrom && rec.derivedFrom.length) out += ` from ${rec.derivedFrom.join(' + ')}`;
    return out;
  }

  /* The weakest tier present across the given fields — the honest headline
     confidence for a panel or report section that presents several fields
     together. A section is only as trustworthy as its shakiest number, so
     this deliberately takes the minimum rather than an average. Fields with
     no record at all count as UNKNOWN; fields absent from props are skipped
     entirely (missing data is not low-confidence data). */
  function weakestOf(props, fieldIds) {
    let weakest = null;
    for (const fieldId of (fieldIds || [])) {
      if (!props || props[fieldId] == null || props[fieldId] === '') continue;
      const rec = get(props, fieldId);
      const id  = rec ? rec.confidence : CONFIDENCE.UNKNOWN.id;
      if (weakest === null || rankOf(id) < rankOf(weakest)) weakest = id;
    }
    return weakest;
  }

  return {
    KEY, CONFIDENCE, CONFIDENCE_IDS,
    tier, isKnownConfidence, rankOf, compareConfidence,
    record, derived, attach, attachMany, get, all, isAtLeast, describe, weakestOf,
  };
})();
