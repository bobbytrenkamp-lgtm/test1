/* data/parcel_pipeline/discovery/static_downloads.mjs — thin stub for
 * jurisdictions whose only public parcel data is a static download (zipped
 * shapefile, GeoJSON, GeoPackage, File Geodatabase, etc).
 *
 * This PR only RECORDS "found a static download, not ingested." Real
 * ingestion (download, checksum, size limits, format conversion into a
 * browser-queryable static layer) is deferred to a future PR — see the
 * "PR E — Static-download ingestion pilot" entry in the parcel pipeline
 * plan. Nothing here fetches or parses the file itself.
 */

export const KNOWN_STATIC_FORMATS = ['shapefile', 'shp', 'geojson', 'csv', 'zip', 'kml', 'fgdb', 'gpkg'];

/* Pure. formatString: a free-text format label as published by a DCAT/CKAN/
   Socrata resource entry (e.g. "Shapefile", "GeoJSON", "ESRI REST"). Returns
   true only for known static-file formats — "ESRI REST"/"ArcGIS
   FeatureServer"-style values are NOT static downloads and correctly
   return false here (those are queryable services, handled by the ArcGIS
   adapters instead). */
export function isStaticDownloadFormat(formatString) {
  if (!formatString) return false;
  const normalized = String(formatString).toLowerCase().trim();
  return KNOWN_STATIC_FORMATS.some(fmt => normalized === fmt || normalized.includes(fmt));
}

/* Pure. Re-tags any candidate stub (from dcat.mjs/ckan.mjs/socrata.mjs)
   whose resource format is a known static format with
   staticDownloadOnly:true, ingested:false. Does not mutate input stubs —
   returns new objects. Stubs with no recognizable static format, or that
   already represent a queryable ArcGIS service, pass through unchanged. */
export function flagStaticDownloadCandidates(candidateStubs) {
  return candidateStubs.map(stub => {
    if (stub.staticDownloadOnly) return stub; // already flagged upstream
    if (!isStaticDownloadFormat(stub.resourceFormat)) return stub;
    return { ...stub, staticDownloadOnly: true, ingested: false };
  });
}
