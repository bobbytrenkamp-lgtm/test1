/* data/parcel_pipeline/discovery/schema.mjs — automated ArcGIS service and
 * layer inspection for the permanent discovery pipeline.
 *
 * Retrieves and normalizes: title, description, copyright, owner, layer
 * list, geometry type, fields+aliases, capabilities, maxRecordCount, and
 * sample records. Never throws — every function returns a normalized
 * { ok, ..., errorType, why } shape so a single bad service can't crash a
 * batch run; failures are recorded, not fatal.
 *
 * ArcGIS returns HTTP 200 with a {"error":{...}} envelope for a bad service
 * ID or a token-required layer — that's classified here (ArcGIS-specific
 * semantics), one layer above network.mjs's generic HTTP/transport
 * classification.
 */

import { fetchJsonCached, ERROR_TYPES } from './network.mjs';

export const DEFAULT_KEYWORDS = ['parcel', 'cadastral', 'taxlot', 'assessor', 'cama', 'property'];

/* Pure. 'esriGeometryPolygon' -> 'polygon', etc. Anything unrecognized
   (including missing/null) returns null rather than guessing. */
export function normalizeGeometryType(esriGeometryType) {
  switch (esriGeometryType) {
    case 'esriGeometryPolygon': return 'polygon';
    case 'esriGeometryPoint': return 'point';
    case 'esriGeometryMultipoint': return 'point';
    case 'esriGeometryPolyline': return 'line';
    default: return null;
  }
}

/* Classifies an ArcGIS-specific error envelope on top of a body that
   network.mjs's classifyResult() already confirmed is valid JSON. Auth
   errors (code 498/499) get their own errorType so scoring.mjs can apply
   the AUTH_REQUIRED penalty precisely. */
function classifyArcGISBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, why: 'empty or non-object body', errorType: ERROR_TYPES.MALFORMED_BODY };
  }
  if (body.error) {
    const e = body.error;
    const errorType = (e.code === 499 || e.code === 498) ? 'auth' : ERROR_TYPES.UNKNOWN;
    return {
      ok: false,
      why: `ArcGIS error ${e.code ?? '?'}: ${e.message || JSON.stringify(e).slice(0, 120)}`,
      errorType,
    };
  }
  return { ok: true };
}

/* Fetches <serviceUrl>?f=json and normalizes it. serviceUrl may be a
   FeatureServer/MapServer root (has a "layers" array to pick from) or an
   already-resolved single layer (has a "fields" array directly) — this
   function handles both and reports which shape it saw via `layers` being
   present or null. ctx = { cacheDir, timeoutMs?, maxRetries?, refresh? }. */
export async function inspectArcGISService(serviceUrl, ctx = {}) {
  const url = `${serviceUrl}${serviceUrl.includes('?') ? '&' : '?'}f=json`;
  const { result, classified, attempts } = await fetchJsonCached(
    url,
    { timeoutMs: ctx.timeoutMs, maxRetries: ctx.maxRetries, refresh: ctx.refresh },
    ctx.cacheDir || null,
  );

  if (!classified.ok) {
    return {
      ok: false, url: serviceUrl, errorType: classified.errorType, why: classified.why, attempts,
    };
  }

  const body = classified.body;
  const arcgisClassified = classifyArcGISBody(body);
  if (!arcgisClassified.ok) {
    return {
      ok: false, url: serviceUrl, errorType: arcgisClassified.errorType, why: arcgisClassified.why, attempts,
    };
  }

  const layers = Array.isArray(body.layers)
    ? body.layers.map(l => ({ id: l.id, name: l.name, geometryType: normalizeGeometryType(l.geometryType) }))
    : null;

  return {
    ok: true,
    url: serviceUrl,
    name: body.name || null,
    description: body.description || body.serviceDescription || null,
    copyrightText: body.copyrightText || null,
    owner: body.owner || null,
    capabilities: typeof body.capabilities === 'string'
      ? body.capabilities.split(',').map(s => s.trim()).filter(Boolean)
      : [],
    maxRecordCount: typeof body.maxRecordCount === 'number' ? body.maxRecordCount : null,
    geometryType: normalizeGeometryType(body.geometryType),
    fields: Array.isArray(body.fields)
      ? body.fields.map(f => ({ name: f.name, alias: f.alias || f.name, type: f.type }))
      : null,
    layers,
    tables: Array.isArray(body.tables) ? body.tables.map(t => ({ id: t.id, name: t.name })) : null,
    supportsStatistics: !!body.supportsStatistics,
    supportsPagination: !!(body.advancedQueryCapabilities?.supportsPagination),
    attempts,
  };
}

/* Same shape, explicitly for an already-resolved single layer endpoint
   (e.g. <serviceRoot>/0). This is really the same request as
   inspectArcGISService — kept as a distinct export because callers that
   already know they have a specific layer URL (not a service root that
   might have multiple layers) read more clearly calling this name. */
export async function inspectArcGISLayer(layerUrl, ctx = {}) {
  return inspectArcGISService(layerUrl, ctx);
}

/* <layerUrl>/query?where=1=1&outFields=*&resultRecordCount=N&f=json.
   Never throws; a query-capability failure just returns records: null so
   scoring can still proceed using schema-only evidence. */
export async function fetchSampleRecords(layerUrl, ctx = {}, count = 3) {
  const base = layerUrl.replace(/\/+$/, '');
  const url = `${base}/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=${count}&f=json`;
  const { result, classified, attempts } = await fetchJsonCached(
    url,
    { timeoutMs: ctx.timeoutMs, maxRetries: ctx.maxRetries, refresh: ctx.refresh },
    ctx.cacheDir || null,
  );

  if (!classified.ok) {
    return { ok: false, records: null, errorType: classified.errorType, why: classified.why, attempts };
  }

  const body = classified.body;
  const arcgisClassified = classifyArcGISBody(body);
  if (!arcgisClassified.ok) {
    return { ok: false, records: null, errorType: arcgisClassified.errorType, why: arcgisClassified.why, attempts };
  }

  const features = Array.isArray(body.features) ? body.features : [];
  const records = features.map(f => f.attributes || {});
  return { ok: true, records, attempts };
}

/* Pure. Scores candidate LAYERS within a service by name-keyword match, for
   picking which layer(s) are worth spending an inspectArcGISLayer() call
   on. This is a RANKING function only — it never selects a layer as "the"
   parcel layer on its own. Callers must still confirm via geometry+samples
   (fetchSampleRecords + a real geometryType check) before treating a
   ranked layer as a real candidate — matching the requirement that title
   match alone is never sufficient proof of jurisdiction/content match. */
export function rankLayersByNameKeywords(layers, keywords = DEFAULT_KEYWORDS) {
  const lowered = keywords.map(k => k.toLowerCase());
  return layers
    .map(l => {
      const name = String(l.name || '').toLowerCase();
      const matchedKeyword = lowered.find(k => name.includes(k)) || null;
      // Prefer keyword length as a tiebreaker: "cadastral" is a stronger
      // signal than a generic substring like "property" appearing inside a
      // longer unrelated layer name.
      const keywordScore = matchedKeyword ? matchedKeyword.length : 0;
      return { ...l, matchedKeyword, keywordScore };
    })
    .filter(l => l.matchedKeyword)
    .sort((a, b) => b.keywordScore - a.keywordScore);
}
