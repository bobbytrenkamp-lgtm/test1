/* Zoning Intelligence — core data module
 *
 * Exposes window.ZONING for all zoning-related queries.
 * Data is loaded lazily from data/zoning/normalized/{id}.json
 * and cached for the session lifetime.
 */

window.ZONING = (function () {

  /* County FIPS → jurisdiction_id mapping.
   * Only covers jurisdictions that have a normalized JSON file. */
  const FIPS_TO_JURISDICTION = {
    "51107": "va-loudoun-county",
  };

  /* In-memory cache: jurisdictionId → normalized data object */
  const _cache = {};

  /* Active state */
  let _activeJurisdictionId = null;
  let _activeDistrict = null;  /* district code string, or null = overview */

  /* ── Data loading ── */

  async function load(jurisdictionId) {
    if (_cache[jurisdictionId]) return _cache[jurisdictionId];
    const url = `data/zoning/normalized/${jurisdictionId}.json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Zoning data unavailable for ${jurisdictionId} (${res.status})`);
    const data = await res.json();
    _cache[jurisdictionId] = data;
    return data;
  }

  async function loadByFips(fips) {
    const jid = FIPS_TO_JURISDICTION[fips];
    if (!jid) return null;
    return load(jid);
  }

  /* ── Public API ── */

  function hasCoverage(fips) {
    return Object.prototype.hasOwnProperty.call(FIPS_TO_JURISDICTION, fips);
  }

  function getCachedByFips(fips) {
    const jid = FIPS_TO_JURISDICTION[fips];
    return jid ? (_cache[jid] || null) : null;
  }

  function getActive() {
    return {
      jurisdictionId: _activeJurisdictionId,
      district:       _activeDistrict,
      data:           _activeJurisdictionId ? (_cache[_activeJurisdictionId] || null) : null,
    };
  }

  /* Called by map click handler (map.js → handleCountyClick) */
  async function handleCountySelect(fips) {
    if (!hasCoverage(fips)) {
      _emit("zoning:no-coverage", { fips });
      return;
    }
    _emit("zoning:loading", { fips });
    try {
      const data = await loadByFips(fips);
      _activeJurisdictionId = FIPS_TO_JURISDICTION[fips];
      _activeDistrict = null;
      _emit("zoning:jurisdiction-loaded", { fips, data, jurisdictionId: _activeJurisdictionId });
    } catch (err) {
      console.warn("[ZONING] Load failed:", err);
      _emit("zoning:load-error", { fips, error: err.message });
    }
  }

  /* Select a specific district within the active jurisdiction */
  function selectDistrict(districtCode) {
    const { data } = getActive();
    if (!data) return;
    const district = data.districts?.[districtCode] || null;
    _activeDistrict = districtCode;
    _emit("zoning:district-selected", {
      jurisdictionId: _activeJurisdictionId,
      districtCode,
      district,
      data,
    });
  }

  function clearActive() {
    _activeJurisdictionId = null;
    _activeDistrict = null;
    _emit("zoning:cleared", {});
  }

  /* ── Helpers ── */

  function _emit(type, detail) {
    document.dispatchEvent(new CustomEvent(type, { detail }));
  }

  /* Format a ZoningValue for display.
   * Returns { text, unit, unverified } */
  function formatValue(zoningValue) {
    if (!zoningValue || zoningValue.value === null || zoningValue.value === undefined) {
      return { text: "—", unit: "", unverified: false };
    }
    const v = zoningValue.value;
    const unit = zoningValue.unit || "";
    const status = zoningValue.verification_status || "requires_official_verification";
    const unverified = status !== "verified" && status !== "not_applicable";
    return { text: String(v), unit, unverified };
  }

  /* Map permission_status → pill CSS class + label */
  const PERMISSION_PILL = {
    permitted_by_right:       { cls: "z-use-permitted",   label: "By Right" },
    permitted_with_limitations:{ cls: "z-use-permitted",   label: "With Limitations" },
    accessory:                { cls: "z-use-permitted",   label: "Accessory" },
    conditional:              { cls: "z-use-conditional", label: "Conditional" },
    special_exception:        { cls: "z-use-special",     label: "Special Exception" },
    special_use_permit:       { cls: "z-use-special",     label: "SUP Required" },
    administrative_approval:  { cls: "z-use-special",     label: "Admin Approval" },
    site_plan_approval:       { cls: "z-use-special",     label: "Site Plan" },
    prohibited:               { cls: "z-use-prohibited",  label: "Prohibited" },
    not_listed:               { cls: "z-use-unclear",     label: "Not Listed" },
    unclear:                  { cls: "z-use-unclear",     label: "Unclear" },
    manual_review_required:   { cls: "z-use-unclear",     label: "Manual Review" },
  };

  function permissionPill(status) {
    return PERMISSION_PILL[status] || { cls: "z-use-unclear", label: status || "Unknown" };
  }

  /* Map overall_assessment → banner CSS class + text */
  const ASSESSMENT = {
    potentially_eligible: { cls: "z-dc-eligible",   icon: "✓", label: "Potentially Eligible" },
    not_eligible:         { cls: "z-dc-ineligible",  icon: "✗", label: "Not Eligible" },
    unclear:              { cls: "z-dc-unclear",     icon: "?", label: "Unclear" },
    requires_review:      { cls: "z-dc-conditional", icon: "!", label: "Requires Review" },
  };

  function assessmentStyle(overall) {
    return ASSESSMENT[overall] || { cls: "z-dc-unclear", icon: "?", label: "Unknown" };
  }

  return {
    FIPS_TO_JURISDICTION,
    hasCoverage,
    load,
    loadByFips,
    getCachedByFips,
    getActive,
    handleCountySelect,
    selectDistrict,
    clearActive,
    formatValue,
    permissionPill,
    assessmentStyle,
  };

})();
