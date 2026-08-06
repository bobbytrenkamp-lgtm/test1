/* data/parcel_pipeline/discovery/dcat.mjs — DCAT-US / Project Open Data
 * feed adapter (the format most ArcGIS Hub open-data portals expose at
 * <portal>/api/feed/dcat-us/1.1.json).
 */

import { fetchJsonCached, makeSafeName } from './network.mjs';
import { isStaticDownloadFormat } from './static_downloads.mjs';

export const PARCEL_KEYWORD_RE = /parcel|cadastral|assessor|tax\s*lot|tax\s*parcel/i;

/* Pure. json: a raw DCAT-US catalog body (top-level `dataset` array, each
   with title/description/distribution[]). Filters to datasets whose title
   or description mentions a parcel-ish keyword, then flattens each
   dataset's distributions into one candidate stub per distribution (a
   dataset commonly publishes the same data in several formats — GeoJSON,
   Shapefile, and an Esri REST/FeatureServer link are all real, independent
   candidates worth scoring separately). */
export function parseDcatCatalog(json, jurisdiction) {
  if (!json || !Array.isArray(json.dataset)) return [];

  const matches = json.dataset.filter(d =>
    PARCEL_KEYWORD_RE.test(d.title || '') || PARCEL_KEYWORD_RE.test(d.description || ''));

  const stubs = [];
  for (const d of matches) {
    const distributions = Array.isArray(d.distribution) ? d.distribution : [];
    for (const dist of distributions) {
      const url = dist.accessURL || dist.downloadURL;
      if (!url) continue;
      const format = dist.format || dist.mediaType || null;
      stubs.push({
        candidateId: `${jurisdiction.fips}-dcat-${makeSafeName(url)}`,
        source: 'dcat',
        fips: jurisdiction.fips,
        jurisdictionName: jurisdiction.name,
        state: jurisdiction.state,
        serviceUrl: /FeatureServer|MapServer/i.test(url) ? url : null,
        portalUrl: url,
        publisherType: 'unknown',
        publisherName: d.publisher?.name || null,
        itemTitle: d.title || null,
        itemTags: d.keyword || [],
        itemType: 'DCAT Distribution',
        accessInformation: d.license || null,
        licenseInfo: d.license || null,
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
        raw: { dataset: d, distribution: dist },
      });
    }
  }
  return stubs;
}

/* Async. jurisdiction: { fips, name, state, dcatUrl? }. If jurisdiction
   doesn't supply an explicit dcatUrl, this guesses the common ArcGIS Hub
   convention (data-<slug>.opendata.arcgis.com) — the same guess pattern
   proven (and proven to sometimes 404/500 cleanly, which is a normal,
   expected outcome, not a crash) throughout this session's manual rounds. */
export async function searchDcat(jurisdiction, ctx = {}) {
  const dcatUrl = jurisdiction.dcatUrl
    || `https://data-${(jurisdiction.dcatSlug || jurisdiction.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '')}.opendata.arcgis.com/api/feed/dcat-us/1.1.json`;

  const { result, classified, attempts } = await fetchJsonCached(
    dcatUrl,
    { timeoutMs: ctx.timeoutMs, maxRetries: ctx.maxRetries, refresh: ctx.refresh },
    ctx.cacheDir || null,
  );

  if (!classified.ok) {
    return { ok: false, errorType: classified.errorType, why: classified.why, attempts, candidates: [] };
  }

  const candidates = parseDcatCatalog(classified.body, jurisdiction);
  return { ok: true, attempts, candidates };
}
