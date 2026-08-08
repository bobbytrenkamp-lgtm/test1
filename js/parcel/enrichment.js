/* js/parcel/enrichment.js
 * window.PARCEL_ENRICHMENT — the generic multi-source parcel enrichment engine.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every connector in this system fetches exactly one service per
 * jurisdiction, so a parcel record is only ever as rich as whatever that one
 * service happens to publish. That is frequently just geometry. Loudoun
 * County VA — the largest data center market on earth — is the standing
 * example: its parcel layer exposes plat and subdivision metadata and
 * nothing else, so 17 of its 22 canonical fields sit in
 * `notProvidedBySource`, and registry.js's own comment on that entry names
 * the fix: "Populating them needs Loudoun's separate CAMA/assessment service
 * joined in, which this one-service-per-jurisdiction connector cannot
 * currently do."
 *
 * This module is that missing capability, built once, generically. A
 * jurisdiction declares its secondary sources and the exact identifier they
 * join on; this engine executes those declarations. No county-specific fetch
 * logic lives here or anywhere else in js/ — the registry describes the
 * relationships, and this file is the only thing that acts on them.
 *
 * NON-NEGOTIABLE RULES ENCODED HERE
 * ---------------------------------
 * 1. EXACT JOINS ONLY. Records are matched on a shared government
 *    identifier, compared exactly after a declared normalization. Owner
 *    names and addresses are rejected as join keys outright (see
 *    FORBIDDEN_JOIN_FIELDS) — two parcels owned by "SMITH JOHN" are not the
 *    same parcel, and a plausible-looking address match is how a system
 *    silently attributes one property's assessment to another.
 * 2. SECONDARY FAILURE NEVER BREAKS GEOMETRY. Every source is executed
 *    inside its own try/catch. A dead CAMA service degrades the panel to the
 *    fields it had before; it never blanks the map.
 * 3. NOTHING IS OVERWRITTEN SILENTLY. The base (geometry) source wins by
 *    default, conflicts are recorded rather than resolved invisibly, and
 *    every merged value carries a provenance record naming its source.
 * 4. MISSING IS NOT ZERO. null/undefined/'' from a secondary source is
 *    treated as "this source has nothing to say", never as a value, and
 *    never overwrites something already present.
 *
 * Executors (the things that actually perform network I/O for a given source
 * type) are registered from outside via registerExecutor(). This file
 * performs no network access itself, which is what makes the whole join /
 * conflict / provenance path testable offline with fake executors.
 *
 * Depends on: window.PARCEL_PROVENANCE (required).
 */
window.PARCEL_ENRICHMENT = (function () {
  'use strict';

  const PROV = () => window.PARCEL_PROVENANCE;

  /* Canonical fields that must never be used as a join key. These identify a
     human or a mailing location, not a parcel: they are non-unique, freely
     re-typed between systems, and the classic source of confidently-wrong
     property merges. Configuration naming one of these is a hard config
     error, not a warning — there is no correct way to use them here. */
  const FORBIDDEN_JOIN_FIELDS = new Set([
    'owner', 'owner_mailing', 'address', 'legal_desc', 'subdivision',
  ]);

  /* Registered source-type executors, e.g. 'arcgis-table' (added by the
     ArcGIS non-spatial join PR). Signature:
       executor(sourceConfig, keys, ctx) -> Promise<{
         records: { [normalizedJoinKey]: rawRecordObject },
         sourceUpdatedAt?: string,
       }>
     The executor is handed the already-normalized, de-duplicated key list
     and is responsible only for fetching; all joining, conflict resolution,
     and provenance stays here so every source type behaves identically. */
  const EXECUTORS = Object.create(null);

  function registerExecutor(type, fn) {
    if (!type || typeof fn !== 'function') throw new Error('registerExecutor(type, fn) requires both arguments');
    EXECUTORS[String(type)] = fn;
  }
  function hasExecutor(type) { return typeof EXECUTORS[String(type)] === 'function'; }
  function executorTypes() { return Object.keys(EXECUTORS).sort(); }

  /* ── Join-key normalization ──────────────────────────────────────────────
   *
   * Government identifiers for the same parcel routinely differ in
   * formatting between a county's geometry layer and its own assessment
   * table: "0123-45-6789" vs "0123456789", leading zeros dropped by a
   * spreadsheet export, inconsistent case. Normalization makes those compare
   * equal WITHOUT making genuinely different parcels compare equal — every
   * transform is opt-in per source, declared in configuration, so a
   * jurisdiction that legitimately distinguishes "12A" from "12a" simply
   * does not enable `upper`.
   *
   * Order is fixed and deliberate: trim → case → strip → pad. Padding last
   * means padStart operates on the already-stripped string, which is the
   * only ordering that makes "123-45" and "12345" pad to the same width. */
  function normalizeKey(value, rules) {
    if (value == null) return null;
    let s = String(value);
    const r = rules || {};
    s = s.trim();
    if (r.upper) s = s.toUpperCase();
    if (r.stripNonAlnum) s = s.replace(/[^A-Za-z0-9]/g, '');
    if (r.padStart && r.padStart > 0) s = s.padStart(r.padStart, '0');
    // A key that normalizes to empty is not a key. Returning null (rather
    // than '') keeps every empty variant — null, undefined, '', '   ', '---'
    // with stripNonAlnum — from colliding into one bucket that would join
    // every keyless parcel to the same record.
    return s === '' ? null : s;
  }

  /* ── Configuration validation ────────────────────────────────────────────
   *
   * Run before any network access. A misconfigured source should fail loudly
   * at review/CI time, not produce quietly wrong parcels in production. */
  function validateConfig(enrichment) {
    const errors = [];
    if (enrichment == null) return { valid: true, errors };          // absent is fine: most jurisdictions have no secondary sources
    if (typeof enrichment !== 'object' || Array.isArray(enrichment)) {
      return { valid: false, errors: ['enrichment must be an object'] };
    }
    const sources = enrichment.sources;
    if (!Array.isArray(sources)) return { valid: false, errors: ['enrichment.sources must be an array'] };

    const seenIds = new Set();
    sources.forEach((s, i) => {
      const at = `enrichment.sources[${i}]`;
      if (!s || typeof s !== 'object') { errors.push(`${at} must be an object`); return; }
      if (!s.id)   errors.push(`${at} is missing required "id"`);
      if (s.id && seenIds.has(s.id)) errors.push(`${at} duplicates source id "${s.id}"`);
      if (s.id) seenIds.add(s.id);
      if (!s.type) errors.push(`${at} is missing required "type"`);

      if (!s.baseField) {
        errors.push(`${at} is missing required "baseField" (the canonical field on the parcel to join FROM)`);
      } else if (FORBIDDEN_JOIN_FIELDS.has(s.baseField)) {
        errors.push(
          `${at} joins on "${s.baseField}", which is a name/address-like field. ` +
          `Joins must use an exact government identifier — matching property records on owner or address ` +
          `produces confidently-wrong merges.`);
      }
      if (!s.joinField) errors.push(`${at} is missing required "joinField" (the identifier column in the secondary source)`);

      if (!s.fieldMap || typeof s.fieldMap !== 'object' || !Object.keys(s.fieldMap).length) {
        errors.push(`${at} needs a non-empty "fieldMap" of canonicalField -> sourceColumn`);
      } else {
        const schema = window.PARCEL_SCHEMA;
        for (const canonical of Object.keys(s.fieldMap)) {
          if (schema && schema.FIELD_MAP && !schema.FIELD_MAP[canonical]) {
            errors.push(`${at}.fieldMap names "${canonical}", which is not a canonical field in PARCEL_SCHEMA`);
          }
        }
      }

      const prov = PROV();
      if (s.confidence && prov && !prov.isKnownConfidence(s.confidence)) {
        errors.push(`${at} has unknown confidence "${s.confidence}" (expected one of: ${prov.CONFIDENCE_IDS.join(', ')})`);
      }
      if (s.priority != null && typeof s.priority !== 'number') {
        errors.push(`${at}.priority must be a number when present`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /* ── Conflict resolution ─────────────────────────────────────────────────
   *
   * Deterministic and total: given the same inputs it always picks the same
   * winner, independent of network timing or object key order.
   *
   *   1. An existing value from a MORE-or-equally direct source is kept.
   *   2. Otherwise a source may only replace it if it explicitly declares
   *      override: true. Without that flag a secondary source can FILL a
   *      gap but never REPLACE a value, which is what keeps the geometry
   *      layer authoritative over what it does publish.
   *   3. Ties between competing secondary sources break on lower `priority`,
   *      then on config order — both stable, neither timing-dependent.
   *
   * Returns { accept, reason } and never mutates anything, so the caller can
   * record a conflict entry for the losing value either way. */
  function resolveConflict(existingValue, existingProvenance, incomingSource) {
    const prov = PROV();
    if (existingValue == null || existingValue === '') {
      return { accept: true, reason: 'filled-empty' };
    }
    const existingConf = existingProvenance ? existingProvenance.confidence : prov.CONFIDENCE.DIRECT_OFFICIAL.id;
    const incomingConf = incomingSource.confidence || prov.CONFIDENCE.OFFICIAL_JOINED.id;
    const cmp = prov.compareConfidence(incomingConf, existingConf);

    if (!incomingSource.override) {
      return { accept: false, reason: 'existing-value-kept (source did not declare override)' };
    }
    if (cmp > 0) return { accept: true,  reason: 'override-higher-confidence' };
    return { accept: false, reason: 'override-declined (not more direct than existing value)' };
  }

  /* ── Cache ───────────────────────────────────────────────────────────────
   *
   * Keyed per (sourceId, normalized join key) rather than per request, so
   * panning back over parcels already seen costs nothing even though the
   * viewport query that produced them was different. Bounded and TTL'd:
   * assessment data changes slowly, but a tab left open for a day should not
   * keep serving yesterday's values forever. */
  const DEFAULT_TTL_MS = 30 * 60 * 1000;   // 30 minutes
  const MAX_CACHE_ENTRIES = 5000;
  const _cache = new Map();                // "sourceId::key" -> { value, expires }

  function _cacheGet(sourceId, key, now) {
    const k = `${sourceId}::${key}`;
    const hit = _cache.get(k);
    if (!hit) return undefined;
    if (hit.expires <= now) { _cache.delete(k); return undefined; }
    // Refresh recency for the LRU-ish eviction below.
    _cache.delete(k); _cache.set(k, hit);
    return hit.value;
  }

  function _cacheSet(sourceId, key, value, ttlMs, now) {
    const k = `${sourceId}::${key}`;
    if (_cache.has(k)) _cache.delete(k);
    _cache.set(k, { value, expires: now + (ttlMs || DEFAULT_TTL_MS) });
    while (_cache.size > MAX_CACHE_ENTRIES) {
      const oldest = _cache.keys().next().value;   // Map preserves insertion order
      _cache.delete(oldest);
    }
  }

  function clearCache(sourceId) {
    if (!sourceId) { _cache.clear(); return; }
    const prefix = `${sourceId}::`;
    for (const k of Array.from(_cache.keys())) if (k.startsWith(prefix)) _cache.delete(k);
  }

  function cacheSize() { return _cache.size; }

  /* ── Merge one fetched record into one parcel ────────────────────────── */
  function mergeRecord(props, rawRecord, source, ctx) {
    const prov = PROV();
    const merged = [];
    const conflicts = [];
    const sourceFields = {};

    for (const [canonical, column] of Object.entries(source.fieldMap || {})) {
      const incoming = rawRecord[column];

      // Missing is not zero, and not a value. 0 and false ARE values and
      // must survive this check — hence the explicit null/''/undefined test
      // rather than a falsy one.
      if (incoming == null || incoming === '') continue;

      const decision = resolveConflict(props[canonical], prov.get(props, canonical), source);
      if (!decision.accept) {
        if (String(props[canonical]) !== String(incoming)) {
          conflicts.push({
            field: canonical,
            kept: props[canonical],
            rejected: incoming,
            rejectedFrom: source.id,
            reason: decision.reason,
          });
        }
        continue;
      }

      props[canonical] = incoming;
      sourceFields[canonical] = column;
      merged.push(canonical);
    }

    if (merged.length) {
      prov.attachMany(props, merged, {
        sourceId:        source.id,
        sourceLabel:     source.label || source.id,
        confidence:      source.confidence || prov.CONFIDENCE.OFFICIAL_JOINED.id,
        fetchedAt:       ctx.fetchedAt,
        sourceUpdatedAt: ctx.sourceUpdatedAt || source.sourceUpdatedAt || null,
        sourceFields,
      });
    }

    return { merged, conflicts };
  }

  /* ── Main entry point ────────────────────────────────────────────────────
   *
   * enrich(featureCollection, jurisdictionConfig, opts)
   *   -> { features, sources: [health], conflicts: [], aborted }
   *
   * The returned FeatureCollection is a new object, but individual feature
   * property objects are mutated in place — they were built fresh by the
   * connector's _normalize() for this fetch and are not shared.
   *
   * Never throws for source-level problems. The only way this rejects is a
   * programming error in the caller (a missing PARCEL_PROVENANCE). */
  async function enrich(geojson, jurisdictionConfig, opts) {
    const o = opts || {};
    const signal = o.signal || null;
    const now = typeof o.now === 'number' ? o.now : Date.now();
    const fetchedAt = new Date(now).toISOString();
    const features = (geojson && geojson.features) || [];
    const result = {
      features,
      sources: [],
      conflicts: [],
      aborted: false,
    };

    if (!PROV()) throw new Error('PARCEL_ENRICHMENT requires window.PARCEL_PROVENANCE to be loaded');

    const enrichment = jurisdictionConfig && jurisdictionConfig.enrichment;
    if (!enrichment || !Array.isArray(enrichment.sources) || !enrichment.sources.length) {
      return { ...result, features: geojson ? geojson.features || [] : [] };
    }

    const configCheck = validateConfig(enrichment);
    if (!configCheck.valid) {
      // A broken config disables enrichment entirely rather than running the
      // subset that happens to parse — a half-applied join is harder to
      // notice than none at all.
      result.sources.push({
        id: '(config)', status: 'config-error', error: configCheck.errors.join('; '),
        requested: 0, matched: 0, fieldsMerged: 0, durationMs: 0,
      });
      return result;
    }

    // Sources are executed in a deterministic order (priority, then declared
    // order) so that when two of them can fill the same empty field, which
    // one gets there first is a property of the configuration and not of
    // which server happened to answer faster.
    const ordered = enrichment.sources
      .map((s, i) => ({ s, i }))
      .sort((a, b) => ((a.s.priority ?? 100) - (b.s.priority ?? 100)) || (a.i - b.i))
      .map(x => x.s);

    for (const source of ordered) {
      if (signal && signal.aborted) { result.aborted = true; break; }

      const started = now;
      const health = {
        id: source.id,
        label: source.label || source.id,
        status: 'ok',
        requested: 0,
        matched: 0,
        fieldsMerged: 0,
        error: null,
        durationMs: 0,
      };

      try {
        if (!hasExecutor(source.type)) {
          health.status = 'unsupported';
          health.error = `No executor registered for source type "${source.type}" (registered: ${executorTypes().join(', ') || 'none'})`;
          result.sources.push(health);
          continue;
        }

        // Index the loaded parcels by their normalized join key. One key can
        // map to several features (a parcel split across multiple polygon
        // rows is common), so this is key -> array.
        const byKey = new Map();
        for (const f of features) {
          const props = f && f.properties;
          if (!props) continue;
          const key = normalizeKey(props[source.baseField], source.joinNormalize);
          if (key == null) continue;
          if (!byKey.has(key)) byKey.set(key, []);
          byKey.get(key).push(props);
        }

        const allKeys = Array.from(byKey.keys());
        health.requested = allKeys.length;
        if (!allKeys.length) {
          health.status = 'no-keys';
          result.sources.push(health);
          continue;
        }

        // Serve what we can from cache; only ask the executor for the rest.
        const records = Object.create(null);
        const missing = [];
        for (const key of allKeys) {
          const cached = _cacheGet(source.id, key, now);
          if (cached === undefined) missing.push(key);
          else if (cached !== null) records[key] = cached;
          // cached === null is a remembered "this key genuinely has no
          // record", which is worth caching too — otherwise every pan
          // re-asks the server about the same unmatched parcels.
        }

        let sourceUpdatedAt = null;
        if (missing.length) {
          const fetched = await EXECUTORS[source.type](source, missing, { signal, now, jurisdictionConfig });
          if (signal && signal.aborted) { result.aborted = true; break; }
          const fetchedRecords = (fetched && fetched.records) || {};
          sourceUpdatedAt = (fetched && fetched.sourceUpdatedAt) || null;
          for (const key of missing) {
            const rec = Object.prototype.hasOwnProperty.call(fetchedRecords, key) ? fetchedRecords[key] : null;
            _cacheSet(source.id, key, rec, source.cacheTtlMs, now);
            if (rec) records[key] = rec;
          }
        }

        const matchedKeys = Object.keys(records);
        health.matched = matchedKeys.length;

        for (const key of matchedKeys) {
          for (const props of (byKey.get(key) || [])) {
            const { merged, conflicts } = mergeRecord(props, records[key], source, { fetchedAt, sourceUpdatedAt });
            health.fieldsMerged += merged.length;
            for (const c of conflicts) result.conflicts.push({ ...c, joinKey: key });
          }
        }

        // A source that answered cleanly but matched nothing is reported
        // distinctly from one that matched some parcels. Zero matches across
        // a full viewport is the signature of a wrong join key — a silent
        // "ok, 0 fields merged" would hide exactly the bug most worth
        // catching.
        if (health.matched === 0) {
          health.status = 'joined-none';
          health.error = `Matched 0 of ${health.requested} parcel keys — check joinField/joinNormalize for this source.`;
        }
      } catch (err) {
        // Rule 2: a secondary source failing is a degraded panel, never a
        // broken map. The base geometry and its own fields are already in
        // `features` and are left exactly as they were.
        health.status = 'error';
        health.error = (err && err.message) ? err.message : String(err);
      }

      health.durationMs = Math.max(0, (typeof o.now === 'number' ? o.now : Date.now()) - started);
      result.sources.push(health);
    }

    return result;
  }

  /* Rolls per-source health up into one jurisdiction-level verdict for the
     UI's freshness/health indicator. Deliberately conservative: any source
     erroring makes the whole record 'degraded', because a panel showing
     ownership but silently missing valuation is not "healthy". */
  function summarizeHealth(sources) {
    const list = sources || [];
    if (!list.length) return { status: 'none', ok: 0, failed: 0, total: 0 };
    let ok = 0, failed = 0;
    for (const s of list) {
      if (s.status === 'ok') ok++;
      else failed++;
    }
    let status = 'ok';
    if (failed && ok) status = 'degraded';
    else if (failed && !ok) status = 'failed';
    return { status, ok, failed, total: list.length };
  }

  return {
    enrich, validateConfig, normalizeKey, resolveConflict, mergeRecord,
    registerExecutor, hasExecutor, executorTypes,
    clearCache, cacheSize, summarizeHealth,
    FORBIDDEN_JOIN_FIELDS, DEFAULT_TTL_MS,
  };
})();
