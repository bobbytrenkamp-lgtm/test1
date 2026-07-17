/* Zoning Intelligence — Leaflet layer manager
 *
 * Adds zoning district polygons to the existing Leaflet map when the
 * "Zoning Districts" layer is toggled on. Clicking a polygon selects the
 * district and opens the zoning details panel.
 *
 * Depends on: leaflet.js, zoning.js (window.ZONING), map.js globals
 */

window.ZONING_MAP = (function () {

  let _zoningGeoLayer    = null;
  let _overlayGeoLayer   = null;
  let _selectedFeature   = null;
  let _ready             = false;

  const DISTRICT_FILL_COLORS = {
    industrial:       "rgba(251,146, 60,0.35)",
    light_industrial: "rgba(251,191, 36,0.3)",
    heavy_industrial: "rgba(239, 68, 68,0.3)",
    planned_development: "rgba(167,139,250,0.3)",
    agricultural:     "rgba( 74,222,128,0.25)",
    residential:      "rgba( 96,165,250,0.2)",
    commercial:       "rgba(244,114,182,0.25)",
    office:           "rgba(129,140,248,0.25)",
  };

  function _fillFor(category) {
    return DISTRICT_FILL_COLORS[category] || "rgba(139,143,168,0.2)";
  }

  function _districtStyle(feature) {
    const props    = feature.properties || {};
    const category = props.district_category || "unclassified";
    const selected = props.zoning_code === (_selectedFeature?.properties?.zoning_code);
    return {
      fillColor:   _fillFor(category),
      fillOpacity: selected ? 1 : 0.85,
      color:       selected ? "var(--accent)" : "rgba(88,141,239,0.6)",
      weight:      selected ? 2.5 : 1,
    };
  }

  function _onDistrictClick(e, feature) {
    L.DomEvent.stopPropagation(e);
    _selectedFeature = feature;
    if (_zoningGeoLayer) _zoningGeoLayer.setStyle(_districtStyle.bind(null, feature));
    const code = feature.properties?.zoning_code;
    if (code && window.ZONING) {
      window.ZONING.selectDistrict(code);
    }
    _openPanel();
  }

  function _buildPopupHtml(feature) {
    const p = feature.properties || {};
    const code = p.zoning_code || "?";
    const name = p.district_name || code;
    const dcClass = p.dc_classification || "unknown";
    return `<strong>${escHtmlZ(name)}</strong><br>
            <span style="font-family:monospace;font-size:11px;color:var(--accent)">${escHtmlZ(code)}</span><br>
            <span style="font-size:11px;color:var(--text-muted)">DC: ${escHtmlZ(dcClass)}</span>`;
  }

  function escHtmlZ(s) {
    return String(s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  /* ── Layer build ── */

  async function _buildZoningLayer(jurisdictionId) {
    /* Try loading the GeoJSON geometry file for this jurisdiction */
    const url = `data/zoning/geometry/${jurisdictionId}.geojson`;
    let geojson;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      geojson = await res.json();
    } catch { return null; }

    if (!geojson?.features?.length) return null;

    const layer = L.geoJSON(geojson, {
      style: _districtStyle,
      onEachFeature: (feature, lyr) => {
        lyr.bindTooltip(_buildPopupHtml(feature), {
          className: "z-map-tooltip",
          sticky: true,
        });
        lyr.on("click", e => _onDistrictClick(e, feature));
      },
    });
    return layer;
  }

  /* ── Panel open/close ── */

  function _openPanel() {
    const panel = document.getElementById("zoning-panel");
    if (!panel) return;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
  }

  function _closePanel() {
    const panel = document.getElementById("zoning-panel");
    if (!panel) return;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    _selectedFeature = null;
    if (_zoningGeoLayer) _zoningGeoLayer.setStyle(_districtStyle);
    window.ZONING?.clearActive();
  }

  /* ── Layer toggle logic ── */

  /* Called by map.js when the zoning_districts layer is toggled */
  async function onLayerToggle(layerId, enabled, fips) {
    /* Requires leafletMap to be available */
    if (!window.leafletMap) return;

    if (layerId === "zoning_districts") {
      if (enabled) {
        /* If there's a selected county with coverage, load its layer */
        const activeFips = fips || window.selectedFips;
        await _activateFor(activeFips);
      } else {
        _deactivate();
        _closePanel();
      }
    }
  }

  async function _activateFor(fips) {
    if (!fips || !window.ZONING?.hasCoverage(fips)) {
      _showNoDataToast(fips);
      return;
    }
    const jid = window.ZONING.FIPS_TO_JURISDICTION[fips];
    if (!jid) return;

    /* Remove previous layer if any */
    if (_zoningGeoLayer) {
      window.leafletMap.removeLayer(_zoningGeoLayer);
      _zoningGeoLayer = null;
    }

    const layer = await _buildZoningLayer(jid);
    if (!layer) {
      /* No geometry file — still open panel in district-browser mode */
      _openPanel();
      window.ZONING.handleCountySelect(fips);
      return;
    }
    _zoningGeoLayer = layer;
    _zoningGeoLayer.addTo(window.leafletMap);
    _openPanel();
    window.ZONING.handleCountySelect(fips);
  }

  function _deactivate() {
    if (_zoningGeoLayer) {
      if (window.leafletMap) window.leafletMap.removeLayer(_zoningGeoLayer);
      _zoningGeoLayer = null;
    }
    if (_overlayGeoLayer) {
      if (window.leafletMap) window.leafletMap.removeLayer(_overlayGeoLayer);
      _overlayGeoLayer = null;
    }
  }

  function _showNoDataToast(fips) {
    /* Reuse existing map toast mechanism if available */
    const toast = document.getElementById("map-toast");
    if (!toast) return;
    toast.textContent = fips
      ? "Zoning data not yet available for this county."
      : "Select a county to view zoning data.";
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 3500);
  }

  /* ── County selection hook ── */

  /* Called when user selects a county on the map (regardless of layer state) */
  function onCountySelected(fips) {
    /* If zoning layer is active, switch the displayed jurisdiction */
    if (window.leafletMap && _isLayerActive()) {
      _activateFor(fips);
    }
  }

  function _isLayerActive() {
    return _zoningGeoLayer && window.leafletMap?.hasLayer(_zoningGeoLayer);
  }

  /* ── Init ── */

  function init() {
    if (_ready) return;
    _ready = true;

    /* Close button inside the zoning panel */
    document.addEventListener("click", e => {
      if (e.target.closest(".z-header-close")) {
        _closePanel();
      }
    });

    /* District-item clicks in the district browser */
    document.addEventListener("click", e => {
      const item = e.target.closest(".z-district-item[data-code]");
      if (item) {
        const code = item.dataset.code;
        window.ZONING?.selectDistrict(code);
      }
    });
  }

  /* Wait for the map script to finish before registering */
  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init, { once: true });
  }

  return { onLayerToggle, onCountySelected, closePanel: _closePanel };

})();
