/* js/economy-map.js — economic choropleth layers for the MAIN Map tab.
 *
 * WHY IT INTEGRATES THE WAY IT DOES
 * map.js already has a view-mode pattern: getColor() dispatches on _densityMode
 * / _wsMode / _suitMode before falling through to restriction severity, and
 * countyStyle() reads getColor(). Adding an economic mode through that same
 * switch means:
 *   - turning the layer OFF restores the restriction colours automatically,
 *     because the restriction branch is simply reached again. Nothing is
 *     overwritten and nothing needs restoring by hand.
 *   - satellite/hybrid opacity, zoom fade, filter dimming, screener highlight
 *     and the selected-county outline all keep working untouched.
 *
 * ONE LAYER AT A TIME
 * Only one economic metric can be active. Stacking two opaque choropleths over
 * the restriction layer would make all three unreadable, so selecting a second
 * economic layer replaces the first (and clears the other view modes, matching
 * how suitability/density/water already behave toward each other).
 *
 * Exposes window.ECONOMY_MAP; called by setLayerVisible() in map.js.
 */
window.ECONOMY_MAP = (function () {
  'use strict';

  /* Layer id -> the county metric it colours. Ids match layer-registry.js. */
  const LAYER_METRIC = {
    econ_population_growth: { metric: "population",              measure: "change_5y" },
    econ_income:            { metric: "median_household_income", measure: "value" },
    econ_unemployment:      { metric: "unemployment_rate",        measure: "value" },
    econ_workforce:         { metric: "bachelors_or_higher_pct",  measure: "value" },
    econ_housing_cost:      { metric: "median_home_value",        measure: "value" },
    econ_broadband:         { metric: "broadband_pct",            measure: "value" },
  };

  let _activeLayer = null;     // layer id, or null
  let _classifier  = null;
  let _records     = null;     // fips -> county record
  let _loading     = false;

  function isActive()      { return !!_activeLayer; }
  function activeLayerId() { return _activeLayer; }
  function activeSpec()    { return _activeLayer ? LAYER_METRIC[_activeLayer] : null; }

  /* Colour for one county under the active economic layer.
     Returns null when this module is not driving the map, so getColor() in
     map.js can fall through to its normal severity logic. */
  function colorFor(fips) {
    if (!_activeLayer || !_classifier || !_records) return null;
    const spec = LAYER_METRIC[_activeLayer];
    const v = window.ECONOMY.metricValue(_records[fips], spec.metric, spec.measure);
    return _classifier.color(v);
  }

  /* Does this county have a value for the active layer? Used by countyStyle()
     to decide fill opacity, so "No data" reads as absent rather than as a
     dark-but-present value. */
  function hasValue(fips) {
    if (!_activeLayer || !_records) return false;
    const spec = LAYER_METRIC[_activeLayer];
    const v = window.ECONOMY.metricValue(_records[fips], spec.metric, spec.measure);
    return v !== null && v !== undefined && isFinite(v);
  }

  /* Formatted value for the hover tooltip. */
  function valueText(fips) {
    if (!_activeLayer) return null;
    const spec = LAYER_METRIC[_activeLayer];
    const meta = window.ECONOMY.METRICS[spec.metric];
    const v = _records ? window.ECONOMY.metricValue(_records[fips], spec.metric, spec.measure) : null;
    if (v === null || v === undefined) return { label: meta.label, text: "No data" };
    return {
      label: meta.label + (spec.measure !== "value" ? " (5-yr change)" : ""),
      text: spec.measure === "value"
        ? window.ECONOMY.fmtValue(v, meta.unit, meta.dec)
        : window.ECONOMY.fmtPct(v),
    };
  }

  /* Legend rows for renderLegend() in map.js. */
  function legend() {
    if (!_activeLayer || !_classifier) return null;
    const spec = LAYER_METRIC[_activeLayer];
    const meta = window.ECONOMY.METRICS[spec.metric];
    return {
      title: meta.label + (spec.measure !== "value" ? " — 5-year change" : ""),
      rows: window.ECONOMY.legendRows(_classifier, spec.metric, spec.measure),
      source: `U.S. Census Bureau, ACS ${_vintage || "—"} 5-Year Estimates`,
      count: _classifier.count,
    };
  }

  let _vintage = null;

  /* Build the classifier for a layer. Async because the county file is lazy. */
  function activate(layerId) {
    const spec = LAYER_METRIC[layerId];
    if (!spec) return Promise.resolve(false);
    if (_loading) return Promise.resolve(false);
    _loading = true;

    return window.ECONOMY.load("county").then(payload => {
      _loading = false;
      if (!window.ECONOMY.hasCounty(payload)) {
        // Not populated yet. Say so rather than drawing an empty grey map that
        // would look like "no economic activity anywhere".
        if (typeof showMapToast === "function") {
          showMapToast("Economic data has not been generated yet — run the Update Economic Data workflow", 5000);
        }
        return false;
      }
      _records = payload.counties;
      _vintage = payload.acs_vintage;
      const values = Object.keys(_records)
        .map(f => window.ECONOMY.metricValue(_records[f], spec.metric, spec.measure));
      _classifier = window.ECONOMY.makeClassifier(values, spec.measure);
      _activeLayer = layerId;
      return true;
    }).catch(err => {
      _loading = false;
      console.warn("ECONOMY_MAP activate failed:", err);
      if (typeof showMapToast === "function") {
        showMapToast("Economic data could not be loaded", 3500);
      }
      return false;
    });
  }

  function deactivate() {
    _activeLayer = null;
    _classifier = null;
    // _records is intentionally kept: it is the cached county payload and
    // re-enabling a layer should not refetch several megabytes.
  }

  /* Called by setLayerVisible() in map.js.
     Restyling happens here so the caller does not need to know whether the
     activation was synchronous. */
  function onLayerToggle(layerId, enabled) {
    if (!LAYER_METRIC[layerId]) return;

    if (!enabled) {
      if (_activeLayer === layerId) {
        deactivate();
        _restyle();
      }
      return;
    }

    /* Exclusive: turn off any other economic layer first, including its
       checkbox, so the panel never shows two active economic layers. */
    for (const other in LAYER_METRIC) {
      if (other !== layerId && window.layerStateRef && window.layerStateRef[other]) {
        window.layerStateRef[other] = false;
        const input = document.querySelector(`#filter-panel-body input[data-layer="${other}"]`);
        if (input) input.checked = false;
      }
    }

    activate(layerId).then(ok => {
      if (!ok) {
        // Roll the toggle back so the UI does not claim an active layer that
        // is not drawing anything.
        if (window.layerStateRef) window.layerStateRef[layerId] = false;
        const input = document.querySelector(`#filter-panel-body input[data-layer="${layerId}"]`);
        if (input) input.checked = false;
        _restyle();
        return;
      }
      _restyle();
      if (typeof showMapToast === "function") {
        const meta = window.ECONOMY.METRICS[LAYER_METRIC[layerId].metric];
        showMapToast(`${meta.label} — ACS ${_vintage} estimates`, 3000);
      }
    });
  }

  /* Re-apply county styles and refresh the legend through map.js's own
     functions, so selected-county highlighting and legend content stay
     consistent with every other layer. */
  function _restyle() {
    try {
      if (typeof countyGeoLayer !== "undefined" && countyGeoLayer) {
        countyGeoLayer.setStyle(countyStyle);
        // countyGeoLayer.setStyle() resets ALL styles including the selected
        // county's white outline — a documented trap in AI_CONTEXT.md.
        if (typeof selectedFips !== "undefined" && selectedFips &&
            typeof countyLayerByFips !== "undefined" && countyLayerByFips[selectedFips]) {
          countyLayerByFips[selectedFips].setStyle(selectedCountyStyle());
        }
      }
      if (typeof renderLegend === "function") renderLegend();
    } catch (err) {
      console.warn("ECONOMY_MAP restyle failed:", err);
    }
  }

  return {
    LAYER_METRIC,
    isActive, activeLayerId, activeSpec,
    colorFor, hasValue, valueText, legend,
    onLayerToggle, deactivate,
    vintage: () => _vintage,
  };
})();
