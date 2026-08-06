/* data/parcel_pipeline/discovery/socrata.mjs — Socrata Discovery API
 * adapter (open-data portal software used by many cities/counties;
 * cross-domain discovery: https://api.us.socrata.com/api/catalog/v1).
 *
 * This session's manual investigation of Denver County CO found that a
 * Socrata portal's own catalog UI endpoint (<portal>/api/catalog/v1)
 * commonly returns a client-side-rendered HTML app shell rather than JSON
 * when queried directly from a non-browser client — the cross-domain
 * discovery endpoint at api.us.socrata.com is the reliable one to use
 * instead, since it's a real, documented, server-rendered JSON API.
 */

import { fetchJsonCached, makeSafeName } from './network.mjs';

/* Pure. json: a raw Socrata Discovery API response
   ({results:[{resource:{name,description,id}, permalink, link, metadata}]}).
   Socrata dataset landing pages (permalink/link) are not directly
   queryable REST endpoints the way an ArcGIS FeatureServer URL is — they're
   recorded as portalUrl only; serviceUrl stays null unless the dataset's
   own metadata happens to expose an ArcGIS-shaped URL. */
export function parseSocrataDiscoveryResponse(json, jurisdiction) {
  if (!json || !Array.isArray(json.results)) return [];

  return json.results.map(r => {
    const resource = r.resource || {};
    const link = r.permalink || r.link || null;
    return {
      candidateId: `${jurisdiction.fips}-socrata-${makeSafeName(link || resource.id || String(Math.random()))}`,
      source: 'socrata',
      fips: jurisdiction.fips,
      jurisdictionName: jurisdiction.name,
      state: jurisdiction.state,
      serviceUrl: null,
      portalUrl: link,
      publisherType: 'unknown',
      publisherName: r.metadata?.domain || null,
      itemTitle: resource.name || null,
      itemTags: resource.tags || [],
      itemType: 'Socrata Dataset',
      accessInformation: null,
      licenseInfo: null,
      jurisdictionMatch: 'unknown',
      geometryType: null,
      queryable: false,
      isTileOnly: false,
      requiresAuth: false,
      fields: null,
      sampleRecords: null,
      sampleNullRatio: null,
      resourceFormat: resource.type || null,
      staticDownloadOnly: false, // a Socrata dataset landing page isn't a
                                   // download link itself, so this adapter
                                   // never flags it as one — a human/PR C
                                   // would need to resolve the real export
                                   // URL from the dataset page
      ingested: false,
      raw: { result: r },
    };
  });
}

/* Async. jurisdiction: { fips, name, state }. Queries the cross-domain
   Socrata Discovery API, optionally scoped to a specific domain via
   jurisdiction.socrataDomain if known. */
export async function searchSocrata(jurisdiction, ctx = {}) {
  const q = encodeURIComponent(`${jurisdiction.name} parcel`);
  const domainParam = jurisdiction.socrataDomain ? `&domains=${encodeURIComponent(jurisdiction.socrataDomain)}` : '';
  const url = `https://api.us.socrata.com/api/catalog/v1?q=${q}${domainParam}&limit=${ctx.maxResults || 10}`;

  const { result, classified, attempts } = await fetchJsonCached(
    url,
    { timeoutMs: ctx.timeoutMs, maxRetries: ctx.maxRetries, refresh: ctx.refresh },
    ctx.cacheDir || null,
  );

  if (!classified.ok) {
    return { ok: false, errorType: classified.errorType, why: classified.why, attempts, candidates: [] };
  }

  const candidates = parseSocrataDiscoveryResponse(classified.body, jurisdiction);
  return { ok: true, attempts, candidates };
}
