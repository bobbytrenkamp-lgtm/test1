/* data/parcel_pipeline/discovery/arcgis_server.mjs — direct ArcGIS Server
 * REST catalog folder listing / layer enumeration adapter.
 *
 * Checked AFTER arcgis_online.mjs's item search in discover_batch.mjs's
 * default source order — blind folder-guessing repeatedly dead-ended this
 * session (generic HTTP 500s, wrong-service guesses) compared to search,
 * but it is still useful when a jurisdiction's own REST catalog root is
 * already known (e.g. from a shared_services match, or a human-supplied
 * hint) and just needs its folders/services enumerated.
 */

import { fetchJsonCached, makeSafeName } from './network.mjs';
import { rankLayersByNameKeywords, DEFAULT_KEYWORDS, normalizeGeometryType } from './schema.mjs';

/* Async. serverRootUrl: an ArcGIS Server REST services root, e.g.
   "https://gis.example.gov/arcgis/rest/services". Returns the raw
   folder/service listing, normalized. Never throws. */
export async function listArcGISServerFolders(serverRootUrl, ctx = {}) {
  const url = `${serverRootUrl.replace(/\/+$/, '')}?f=json`;
  const { result, classified, attempts } = await fetchJsonCached(
    url,
    { timeoutMs: ctx.timeoutMs, maxRetries: ctx.maxRetries, refresh: ctx.refresh },
    ctx.cacheDir || null,
  );

  if (!classified.ok) {
    return { ok: false, errorType: classified.errorType, why: classified.why, attempts, folders: [], services: [] };
  }

  const body = classified.body;
  if (body && body.error) {
    return { ok: false, errorType: 'unknown', why: `ArcGIS error: ${JSON.stringify(body.error).slice(0, 120)}`, attempts, folders: [], services: [] };
  }

  return {
    ok: true,
    attempts,
    folders: Array.isArray(body.folders) ? body.folders : [],
    services: Array.isArray(body.services) ? body.services.map(s => ({ name: s.name, type: s.type })) : [],
  };
}

/* Pure normalizer — turns a resolved service+layer descriptor pair into the
   common candidate-stub shape. serviceDescriptor is the object returned by
   schema.mjs's inspectArcGISService (already has fields/geometryType/etc);
   layerDescriptor is one entry from rankLayersByNameKeywords, or null when
   serviceDescriptor itself is already a single resolved layer (no `layers`
   array). */
export function buildCandidateFromService(serviceDescriptor, layerDescriptor, jurisdiction) {
  const layerUrl = layerDescriptor
    ? `${serviceDescriptor.url.replace(/\/+$/, '')}/${layerDescriptor.id}`
    : serviceDescriptor.url;

  return {
    candidateId: `${jurisdiction.fips}-arcgis_server-${makeSafeName(layerUrl)}`,
    source: 'arcgis_server',
    fips: jurisdiction.fips,
    jurisdictionName: jurisdiction.name,
    state: jurisdiction.state,
    serviceUrl: layerUrl,
    portalUrl: null,
    publisherType: serviceDescriptor.owner ? 'unknown' : 'unknown',
    publisherName: serviceDescriptor.owner || null,
    itemTitle: layerDescriptor ? layerDescriptor.name : serviceDescriptor.name,
    itemTags: [],
    itemType: 'Feature Service',
    accessInformation: serviceDescriptor.copyrightText || null,
    licenseInfo: null,
    jurisdictionMatch: 'unknown',
    geometryType: layerDescriptor
      ? layerDescriptor.geometryType
      : normalizeGeometryType(serviceDescriptor.geometryType) || serviceDescriptor.geometryType || null,
    queryable: (serviceDescriptor.capabilities || []).includes('Query'),
    isTileOnly: (serviceDescriptor.capabilities || []).length > 0
      && !(serviceDescriptor.capabilities || []).includes('Query'),
    requiresAuth: false,
    fields: serviceDescriptor.fields || null,
    sampleRecords: null,
    sampleNullRatio: null,
    staticDownloadOnly: false,
    ingested: false,
    raw: { serviceDescriptor, layerDescriptor },
  };
}

/* Async. Walks a server root's folders looking for services whose name
   matches parcel-ish keywords, inspects up to maxServices of them, and
   returns candidate stubs built from any that resolve to a real polygon
   layer. This is intentionally shallow (one folder-listing call + a capped
   number of service inspections) — it is a fallback path, not the primary
   discovery mechanism (see file header). */
export async function findLikelyParcelServices(serverRootUrl, jurisdiction, ctx = {}, maxServices = 25) {
  const { inspectArcGISService } = await import('./schema.mjs');
  const listing = await listArcGISServerFolders(serverRootUrl, ctx);
  if (!listing.ok) {
    return { ok: false, errorType: listing.errorType, why: listing.why, candidates: [] };
  }

  const keywordServices = listing.services.filter(s => {
    const name = s.name.toLowerCase();
    return DEFAULT_KEYWORDS.some(k => name.includes(k));
  });
  const toInspect = keywordServices.slice(0, maxServices);

  const candidates = [];
  for (const svc of toInspect) {
    const serviceUrl = `${serverRootUrl.replace(/\/+$/, '')}/${svc.name}/${svc.type}`;
    const descriptor = await inspectArcGISService(serviceUrl, ctx);
    if (!descriptor.ok) continue;

    if (Array.isArray(descriptor.layers) && descriptor.layers.length) {
      const ranked = rankLayersByNameKeywords(descriptor.layers);
      for (const layer of ranked) {
        candidates.push(buildCandidateFromService(descriptor, layer, jurisdiction));
      }
    } else if (descriptor.fields) {
      // Already a resolved single layer.
      candidates.push(buildCandidateFromService(descriptor, null, jurisdiction));
    }
  }

  return { ok: true, candidates };
}
