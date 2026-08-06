/* data/parcel_pipeline/discovery/ckan.mjs — CKAN Action API adapter
 * (open-data portal software used by some state/regional GIS catalogs;
 * query shape: <portal>/api/3/action/package_search?q=<terms>).
 */

import { fetchJsonCached, makeSafeName } from './network.mjs';
import { isStaticDownloadFormat } from './static_downloads.mjs';

/* Pure. json: a raw CKAN package_search response
   ({success, result:{results:[{title, notes, organization, resources[]}]}}).
   One candidate stub per resource, same reasoning as dcat.mjs: a CKAN
   package commonly exposes the same dataset as several independently
   scoreable resource formats. */
export function parseCkanSearchResponse(json, jurisdiction) {
  if (!json || json.success !== true || !json.result || !Array.isArray(json.result.results)) return [];

  const stubs = [];
  for (const pkg of json.result.results) {
    const resources = Array.isArray(pkg.resources) ? pkg.resources : [];
    for (const res of resources) {
      const url = res.url;
      if (!url) continue;
      const format = res.format || null;
      stubs.push({
        candidateId: `${jurisdiction.fips}-ckan-${makeSafeName(url)}`,
        source: 'ckan',
        fips: jurisdiction.fips,
        jurisdictionName: jurisdiction.name,
        state: jurisdiction.state,
        serviceUrl: /FeatureServer|MapServer/i.test(url) ? url : null,
        portalUrl: url,
        publisherType: 'unknown',
        publisherName: pkg.organization?.title || null,
        itemTitle: pkg.title || null,
        itemTags: (pkg.tags || []).map(t => t.name || t),
        itemType: 'CKAN Resource',
        accessInformation: pkg.license_title || null,
        licenseInfo: pkg.license_title || null,
        jurisdictionMatch: 'unknown',
        geometryType: null,
        queryable: /FeatureServer|MapServer/i.test(url),
        isTileOnly: false,
        requiresAuth: false,
        fields: null,
        sampleRecords: null,
        sampleNullRatio: null,
        resourceFormat: format,
        staticDownloadOnly: isStaticDownloadFormat(format) && !/FeatureServer|MapServer/i.test(url),
        ingested: false,
        raw: { package: pkg, resource: res },
      });
    }
  }
  return stubs;
}

/* Async. jurisdiction: { fips, name, state, ckanBaseUrl }. ckanBaseUrl is
   required — unlike ArcGIS Hub's predictable DCAT-slug convention, CKAN
   instances (state/regional portals) don't have a guessable per-county URL
   pattern, so a caller (discover_batch.mjs, from the shared_services
   registry or a --state hint) must supply the actual portal base. Returns
   ok:false, candidates:[] cleanly (not an error) when no ckanBaseUrl is
   available for this jurisdiction. */
export async function searchCkan(jurisdiction, ctx = {}) {
  if (!jurisdiction.ckanBaseUrl) {
    return { ok: false, errorType: 'unsupported-source', why: 'no CKAN base URL known for this jurisdiction/state', attempts: 0, candidates: [] };
  }

  const q = encodeURIComponent(`${jurisdiction.name} parcel`);
  const url = `${jurisdiction.ckanBaseUrl.replace(/\/+$/, '')}/api/3/action/package_search?q=${q}`;

  const { result, classified, attempts } = await fetchJsonCached(
    url,
    { timeoutMs: ctx.timeoutMs, maxRetries: ctx.maxRetries, refresh: ctx.refresh },
    ctx.cacheDir || null,
  );

  if (!classified.ok) {
    return { ok: false, errorType: classified.errorType, why: classified.why, attempts, candidates: [] };
  }

  const candidates = parseCkanSearchResponse(classified.body, jurisdiction);
  return { ok: true, attempts, candidates };
}
