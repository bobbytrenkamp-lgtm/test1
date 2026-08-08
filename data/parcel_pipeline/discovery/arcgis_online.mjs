/* data/parcel_pipeline/discovery/arcgis_online.mjs — ArcGIS Online public
 * item search adapter.
 *
 * This is the search approach that repeatedly found real, county-owned
 * services this session (Mecklenburg County NC, DuPage County IL, Jefferson
 * County AL) after blind subdomain/URL guessing kept dead-ending — it is
 * checked before arcgis_server.mjs's blind folder-listing approach for that
 * reason (see discover_batch.mjs's DEFAULT_SOURCE_ORDER).
 */

import { fetchJsonCached, makeSafeName } from './network.mjs';

export const DEFAULT_KEYWORDS = ['parcel', 'parcels', 'cadastral', 'taxlot', 'assessor', 'cama'];

/* Pure. Builds the ArcGIS Online sharing/rest/search query string for a
   jurisdiction. Mirrors the exact query shape hand-written and proven this
   session, e.g. '"Mecklenburg County" AND (parcel OR cadastral OR assessor
   OR "tax parcel")'. */
export function buildSearchQuery({ countyName, stateAbbr, keywords = DEFAULT_KEYWORDS }) {
  const nameTerm = `"${countyName}"`;
  const keywordTerm = `(${keywords.map(k => (k.includes(' ') ? `"${k}"` : k)).join(' OR ')})`;
  return `${nameTerm} AND ${keywordTerm}`;
}

/* Pure. Parses a raw ArcGIS Online /sharing/rest/search response body into
   an array of un-scored candidate stubs. Does not fetch anything further —
   arcgis_server.mjs-style schema inspection of a promising result's URL
   happens in the caller (searchArcGISOnline), one layer up, since search
   results only carry item metadata, not a live field list. */
export function parseArcGISOnlineSearchResponse(json, jurisdiction) {
  if (!json || !Array.isArray(json.results)) return [];
  return json.results
    .filter(r => r.url) // items with no `url` (e.g. Web Maps, Dashboards, StoryMaps)
                          // aren't directly queryable services — schema.mjs
                          // has nothing to inspect for those, so they're
                          // dropped here rather than carried forward as
                          // dead-end candidates.
    .map(r => ({
      candidateId: `${jurisdiction.fips}-arcgis_online-${makeSafeName(r.url)}`,
      source: 'arcgis_online',
      fips: jurisdiction.fips,
      jurisdictionName: jurisdiction.name,
      state: jurisdiction.state,
      serviceUrl: r.url,
      portalUrl: `https://www.arcgis.com/home/item.html?id=${r.id}`,
      publisherType: 'unknown', // resolved after schema inspection confirms
                                  // owner/copyright — this adapter alone
                                  // can't tell official vs. hobbyist
      publisherName: r.owner || null,
      itemTitle: r.title || null,
      itemTags: r.tags || [],
      itemType: r.type || null,
      accessInformation: r.accessInformation || null,
      licenseInfo: r.licenseInfo || null,
      jurisdictionMatch: 'unknown', // resolved by the caller after a real
                                      // sample-record check — never assumed
                                      // from title/tags alone
      geometryType: null,
      queryable: null,
      isTileOnly: false,
      requiresAuth: false,
      fields: null,
      sampleRecords: null,
      sampleNullRatio: null,
      staticDownloadOnly: false,
      ingested: false,
      raw: { searchResult: r },
    }));
}

/* Async. jurisdiction: { fips, name, state }. ctx: { cacheDir, timeoutMs?,
   maxRetries?, refresh?, maxResults? }. Returns un-scored candidate stubs —
   scoring.mjs and the field-mapping preview both happen one layer up in
   discover_batch.mjs, after schema.mjs inspection augments these stubs with
   real geometry/fields/samples. */
export async function searchArcGISOnline(jurisdiction, ctx = {}) {
  const query = buildSearchQuery({ countyName: jurisdiction.name, stateAbbr: jurisdiction.state });
  const maxResults = ctx.maxResults || 10;
  const url = `https://www.arcgis.com/sharing/rest/search?q=${encodeURIComponent(query)}&f=json&num=${maxResults}`;

  const { result, classified, attempts } = await fetchJsonCached(
    url,
    { timeoutMs: ctx.timeoutMs, maxRetries: ctx.maxRetries, refresh: ctx.refresh },
    ctx.cacheDir || null,
  );

  if (!classified.ok) {
    return { ok: false, errorType: classified.errorType, why: classified.why, attempts, candidates: [] };
  }

  const candidates = parseArcGISOnlineSearchResponse(classified.body, jurisdiction);
  return { ok: true, attempts, candidates };
}
