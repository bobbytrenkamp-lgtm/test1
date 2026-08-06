/* data/parcel_pipeline/discovery/shared_services.mjs — checks the
 * reusable/shared-service registry (data/parcel_source_catalog.json's
 * `shared_services` key) before any fresh per-county discovery runs.
 *
 * A statewide service that can cover twenty counties is more valuable than
 * twenty independently-discovered connectors, so this is always checked
 * FIRST in discover_batch.mjs's source order.
 */

/* Pure, no network. jurisdiction: { fips, state, name }. sharedServicesRegistry:
   the `shared_services` object from parcel_source_catalog.json (keyed by
   service_id). Returns the matching service record plus the specific
   filter value to use for this jurisdiction, or null if no shared service
   covers this state/fips. A service already explicitly listing this FIPS in
   covered_fips is a stronger match than one only covering the jurisdiction's
   state in general (a state-level match means "worth trying," not "known to
   work for this exact county" — known_filter_values only has entries for
   FIPS someone has actually confirmed). */
export function matchSharedServices(jurisdiction, sharedServicesRegistry) {
  if (!sharedServicesRegistry) return null;
  const fips = jurisdiction.fips;
  const state = jurisdiction.state;

  for (const service of Object.values(sharedServicesRegistry)) {
    const coveredFips = service.covered_fips || [];
    const coveredStates = service.covered_states || [];
    const isKnownFips = coveredFips.includes(fips);
    const isKnownState = coveredStates.includes(state);
    if (!isKnownFips && !isKnownState) continue;

    const knownFilterValue = (service.known_filter_values || {})[fips] || null;
    return {
      serviceId: service.service_id,
      service,
      confidence: isKnownFips ? 'known-fips' : 'state-match-only',
      filterField: service.county_filter_field || null,
      filterValue: knownFilterValue,
    };
  }
  return null;
}

/* Async — a single lightweight re-check fetch confirming the shared
   service is still live before trusting it for a new jurisdiction. Does
   NOT re-verify the specific filter value for a brand-new FIPS (that still
   requires the same sample-record confirmation any other candidate needs)
   — it only confirms the service itself hasn't gone dark since
   last_verified. ctx = { cacheDir, timeoutMs?, maxRetries?, refresh? }. */
export async function verifySharedServiceMatch(match, ctx = {}) {
  const { inspectArcGISService } = await import('./schema.mjs');
  const inspected = await inspectArcGISService(match.service.service_url, ctx);
  return {
    ...match,
    serviceStillLive: inspected.ok,
    inspected,
  };
}
