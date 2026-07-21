/* tests/parcel.test.js
 * Phase 1 parcel intelligence unit tests.
 * No external test framework required — run in the browser console or Node.js.
 *
 * Usage (browser):
 *   Load all parcel/*.js scripts first, then run:
 *   fetch('tests/parcel.test.js').then(r=>r.text()).then(t=>eval(t))
 *
 * Usage (Node.js — schema/selection/registry only, no DOM or Leaflet):
 *   node tests/parcel.test.js
 */

(function runTests() {
  'use strict';

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      passed++;
      console.log('%cPASS%c ' + msg, 'color:green;font-weight:bold', '');
    } else {
      failed++;
      console.error('%cFAIL%c ' + msg, 'color:red;font-weight:bold', '');
    }
  }

  function assertEq(a, b, msg) {
    if (a === b) {
      passed++;
      console.log('%cPASS%c ' + msg + ` (${JSON.stringify(a)})`, 'color:green;font-weight:bold', '');
    } else {
      failed++;
      console.error('%cFAIL%c ' + msg + ` — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`, 'color:red;font-weight:bold', '');
    }
  }

  // ── PARCEL_SCHEMA ────────────────────────────────────────────────────────

  console.group('PARCEL_SCHEMA');

  const schema = (typeof window !== 'undefined' ? window : global).PARCEL_SCHEMA;
  assert(!!schema, 'PARCEL_SCHEMA is defined');

  if (schema) {
    assert(Array.isArray(schema.FIELDS), 'FIELDS is an array');
    assert(schema.FIELDS.length > 0,    'FIELDS is non-empty');
    assert(typeof schema.FIELD_MAP === 'object', 'FIELD_MAP is an object');
    assert(Array.isArray(schema.GROUPS), 'GROUPS is an array');

    // Every field has required properties
    schema.FIELDS.forEach(f => {
      assert(typeof f.id    === 'string', `Field ${f.id} has string id`);
      assert(typeof f.label === 'string', `Field ${f.id} has string label`);
      assert(typeof f.type  === 'string', `Field ${f.id} has string type`);
      assert(typeof f.group === 'string', `Field ${f.id} has string group`);
    });

    // FIELD_MAP keys match FIELDS
    schema.FIELDS.forEach(f => {
      assert(schema.FIELD_MAP[f.id] === f, `FIELD_MAP['${f.id}'] matches FIELDS entry`);
    });

    // Formatters
    assertEq(schema.format('area_acres', null),    '—',         'format acres null → —');
    assertEq(schema.format('area_acres', 1.5),     '1.500 ac',  'format acres 1.5');
    assertEq(schema.format('assessed_value', null), '—',         'format currency null → —');
    assertEq(schema.format('assessed_value', 1000000), '$1,000,000', 'format currency 1000000');
    assertEq(schema.format('area_sqft', 43560),    '43,560 sq ft', 'format sqft 43560');
    assertEq(schema.format('parcel_id', ''),       '—',         'format empty string → —');
    assertEq(schema.format('parcel_id', 'ABC123'), 'ABC123',    'format string passthrough');

    // Validation
    const errs1 = schema.validate({ parcel_id: 'X' });
    assertEq(errs1.length, 0, 'validate with parcel_id → no errors');
    const errs2 = schema.validate({});
    assert(errs2.length > 0, 'validate without parcel_id → has errors');

    // All groups referenced by FIELDS exist in GROUPS
    const groupIds = new Set(schema.GROUPS.map(g => g.id));
    schema.FIELDS.forEach(f => {
      assert(groupIds.has(f.group), `Field ${f.id} group '${f.group}' exists in GROUPS`);
    });
  }

  console.groupEnd();

  // ── PARCEL_REGISTRY ──────────────────────────────────────────────────────

  console.group('PARCEL_REGISTRY');

  const registry = (typeof window !== 'undefined' ? window : global).PARCEL_REGISTRY;
  assert(!!registry, 'PARCEL_REGISTRY is defined');

  if (registry) {
    assert(typeof registry.get === 'function', 'registry.get is a function');
    assert(typeof registry.has === 'function', 'registry.has is a function');
    assert(typeof registry.all === 'function', 'registry.all is a function');

    // Loudoun County pilot
    assert(registry.has('51107'), 'has() → true for Loudoun County (51107)');
    assert(!registry.has('00000'), 'has() → false for unknown FIPS');

    const loudoun = registry.get('51107');
    assert(!!loudoun, 'get() returns config for 51107');

    if (loudoun) {
      assertEq(loudoun.fips,      '51107',          'Loudoun fips is 51107');
      assertEq(loudoun.state,     'VA',             'Loudoun state is VA');
      assertEq(loudoun.connector, 'arcgis',         'Loudoun connector is arcgis');
      assert(typeof loudoun.serviceUrl === 'string', 'serviceUrl is a string');
      assert(loudoun.serviceUrl.startsWith('https'), 'serviceUrl starts with https');
      assert(typeof loudoun.fieldMap === 'object',   'fieldMap is an object');
      assert(typeof loudoun.minZoom  === 'number',   'minZoom is a number');
      assert(loudoun.minZoom >= 10,                  'minZoom is reasonable (≥10)');
      assert(typeof loudoun.attribution === 'object','attribution is an object');
      assert(typeof loudoun.attribution.url === 'string', 'attribution.url is a string');

      // parcel_id must be in fieldMap
      assert(typeof loudoun.fieldMap.parcel_id === 'string', 'fieldMap.parcel_id is a string');

      // FIPS padding: '51107' and 51107 should both resolve
      assert(registry.has(51107), 'has() works with numeric FIPS');
      const c2 = registry.get(51107);
      assert(!!c2, 'get() works with numeric FIPS');
    }

    const all = registry.all();
    assert(Array.isArray(all), 'all() returns array');
    assert(all.length >= 1, 'all() has at least one jurisdiction');
  }

  console.groupEnd();

  // ── PARCEL_SELECTION ─────────────────────────────────────────────────────

  console.group('PARCEL_SELECTION');

  const sel = (typeof window !== 'undefined' ? window : global).PARCEL_SELECTION;
  assert(!!sel, 'PARCEL_SELECTION is defined');

  if (sel) {
    // Initial state
    assertEq(sel.getSelected(), null, 'initial selected is null');
    assertEq(sel.getCompared().length, 0, 'initial compared is empty');

    const fakeFeature = { type: 'Feature', geometry: null, properties: { parcel_id: 'P001', address: '1 Data Center Way' } };
    const fakeFeature2 = { type: 'Feature', geometry: null, properties: { parcel_id: 'P002', address: '2 Cloud Ave' } };

    // Select
    sel.select(fakeFeature, 'va-loudoun-county');
    assert(sel.getSelected() !== null, 'getSelected() returns non-null after select');
    assertEq(sel.getSelected()?.feature?.properties?.parcel_id, 'P001', 'getSelected().feature has correct parcel_id');

    // Deselect
    sel.deselect();
    assertEq(sel.getSelected(), null, 'getSelected() is null after deselect');

    // Compare tray
    sel.select(fakeFeature, 'va-loudoun-county');
    const added = sel.addToCompare(fakeFeature, 'va-loudoun-county');
    assert(added === true, 'addToCompare returns true on first add');
    assertEq(sel.getCompared().length, 1, 'compare tray has 1 entry');

    // Duplicate prevention
    const added2 = sel.addToCompare(fakeFeature, 'va-loudoun-county');
    assert(added2 === false, 'addToCompare returns false for duplicate PIN');
    assertEq(sel.getCompared().length, 1, 'compare tray still has 1 entry after duplicate add');

    // Second entry
    sel.addToCompare(fakeFeature2, 'va-loudoun-county');
    assertEq(sel.getCompared().length, 2, 'compare tray has 2 entries');

    // isInCompare
    assert(sel.isInCompare('P001'), 'isInCompare(P001) → true');
    assert(!sel.isInCompare('P999'), 'isInCompare(P999) → false');

    // Remove
    sel.removeFromCompare('P001');
    assertEq(sel.getCompared().length, 1, 'compare tray has 1 entry after remove');
    assert(!sel.isInCompare('P001'), 'isInCompare(P001) → false after remove');

    // Clear
    sel.clearCompare();
    assertEq(sel.getCompared().length, 0, 'compare tray is empty after clearCompare');

    // Max compare limit
    for (let i = 0; i < sel.MAX_COMPARE; i++) {
      sel.addToCompare({ type: 'Feature', geometry: null, properties: { parcel_id: `PAD${i}` } }, 'test');
    }
    assertEq(sel.getCompared().length, sel.MAX_COMPARE, `compare tray at max (${sel.MAX_COMPARE})`);
    const overflow = sel.addToCompare({ type: 'Feature', geometry: null, properties: { parcel_id: 'OVERFLOW' } }, 'test');
    assert(overflow === false, 'addToCompare returns false when tray is full');
    assertEq(sel.getCompared().length, sel.MAX_COMPARE, 'compare tray did not grow past MAX_COMPARE');

    sel.clearCompare();
    sel.deselect();
  }

  console.groupEnd();

  // ── ArcGISParcelConnector ─────────────────────────────────────────────────

  console.group('ArcGISParcelConnector');

  const Connector = (typeof window !== 'undefined' ? window : global).ArcGISParcelConnector;
  assert(typeof Connector === 'function', 'ArcGISParcelConnector is a constructor');

  if (typeof Connector === 'function') {
    const config = {
      fips:        '51107',
      id:          'va-loudoun-county',
      serviceUrl:  'https://example.com/arcgis/rest/services/Parcels/FeatureServer/0',
      maxFeatures: 100,
      outFields:   null,
      fieldMap: {
        parcel_id: 'OBJECTID',
        pin:       'PIN',
        address:   'SITE_ADDR',
        owner:     'OWNER_NAME',
        county_fips: '__computed__',
      },
    };

    const conn = new Connector(config);
    assert(typeof conn.fetchViewport   === 'function', 'fetchViewport is a function');
    assert(typeof conn.searchByQuery   === 'function', 'searchByQuery is a function');
    assert(typeof conn.fetchById       === 'function', 'fetchById is a function');

    // Test normalization (private method, exposed through _normalize for testing)
    const rawGeojson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: 42,
        geometry: { type: 'Point', coordinates: [-77.4, 38.9] },
        properties: { OBJECTID: 42, PIN: 'LC-99', SITE_ADDR: '123 Main St', OWNER_NAME: 'Test Owner', UNKNOWN_FIELD: 'value' },
      }],
    };

    const normalized = conn._normalize(rawGeojson);
    assert(!!normalized, '_normalize returns a result');
    assertEq(normalized.features.length, 1, '_normalize preserves feature count');
    const p = normalized.features[0].properties;
    assertEq(p.parcel_id, 42, '_normalize sets parcel_id from OBJECTID');
    assertEq(p.pin,       'LC-99', '_normalize maps PIN → pin');
    assertEq(p.address,   '123 Main St', '_normalize maps SITE_ADDR → address');
    assertEq(p.owner,     'Test Owner', '_normalize maps OWNER_NAME → owner');
    assertEq(p.county_fips, '51107', '_normalize sets county_fips from config');
    assertEq(p._source,   'arcgis', '_normalize sets _source');
    assert('unknown_field' in p || 'UNKNOWN_FIELD' in p, '_normalize passes through unknown fields (lowercased)');
  }

  console.groupEnd();

  // ── PARCEL_FEASIBILITY (Phase 2) ─────────────────────────────────────────

  if (typeof window !== 'undefined' && window.PARCEL_FEASIBILITY) {
    console.group('PARCEL_FEASIBILITY');

    // No zoning data available — should degrade gracefully
    const noData = window.PARCEL_FEASIBILITY.assess({ zoning_code: 'PD-IP', county_fips: '51107' }, '51107');
    assert(typeof noData === 'object', 'assess() returns an object');
    assert('available' in noData, 'assess() returns an object with .available');

    // With mock zoning data
    const mockZoning = window.ZONING;
    if (mockZoning?.getCachedByFips?.('51107')) {
      const result = window.PARCEL_FEASIBILITY.assess({
        zoning_code:   'PD-IP',
        county_fips:   '51107',
        area_acres:    25,
        area_sqft:     1089000,
        assessed_value: 5000000,
        land_use_code:  'PD-IP',
      }, '51107');

      if (result.available) {
        assert(typeof result.score === 'number',    'assess() score is a number');
        assert(result.score >= 0 && result.score <= 100, 'assess() score 0-100');
        assert(result.permissionStatus === 'permitted_by_right', 'PD-IP → permitted_by_right');
        assert(result.factors.length === 4, 'assess() has 4 factors');
        assert(result.envelope != null,       'assess() buildable envelope computed');
        const totalWeight = result.factors.reduce((s, f) => s + f.weight, 0);
        assert(Math.abs(totalWeight - 1.0) < 0.001, 'factor weights sum to 1.0');
      }
    }

    console.groupEnd();
  }

  // ── PARCEL_COMPARABLES (Phase 3) ─────────────────────────────────────────

  if (typeof window !== 'undefined' && window.PARCEL_COMPARABLES) {
    console.group('PARCEL_COMPARABLES');

    const subject = {
      type: 'Feature',
      geometry: null,
      properties: {
        parcel_id: 'A1', zoning_code: 'PD-IP', area_sqft: 500000, area_acres: 11.5,
        land_use_code: 'PD-IP', assessed_value: 8000000, land_value: 3000000,
      },
    };

    const candidates = [
      { type: 'Feature', geometry: null, properties: { parcel_id: 'A2', zoning_code: 'PD-IP', area_sqft: 600000, area_acres: 13.8, land_use_code: 'PD-IP', assessed_value: 9500000, land_value: 3500000 } },
      { type: 'Feature', geometry: null, properties: { parcel_id: 'A3', zoning_code: 'R1',    area_sqft: 5000,   area_acres: 0.11,  land_use_code: 'R1' } },
      { type: 'Feature', geometry: null, properties: { parcel_id: 'A4', zoning_code: 'I1',    area_sqft: 250000, area_acres: 5.7,   land_use_code: 'I1' } },
    ];

    // Mock getFeatures
    const origGetFeatures = window.PARCEL_RENDERER?.getFeatures;
    if (window.PARCEL_RENDERER) {
      window.PARCEL_RENDERER.getFeatures = () => candidates;
    }

    const results = window.PARCEL_COMPARABLES.find(subject, { maxResults: 5 });
    assert(Array.isArray(results), 'find() returns an array');
    if (results.length) {
      assert(results[0].feature.properties.parcel_id !== 'A1', 'find() excludes subject parcel');
      assert(results[0].score >= results[results.length - 1].score, 'find() sorted desc by score');
      // A2 (same zone, similar size) should score higher than A3 (tiny residential)
      const a2 = results.find(r => r.feature.properties.parcel_id === 'A2');
      const a3 = results.find(r => r.feature.properties.parcel_id === 'A3');
      if (a2 && a3) assert(a2.score > a3.score, 'same-zone similar-size scores higher than tiny residential');
      // A3 (ratio 0.01) is outside band — should be excluded
      assert(!a3, 'very small residential parcel outside area band excluded');
    }

    // diff()
    const d = window.PARCEL_COMPARABLES.diff(subject.properties, candidates[0].properties);
    assert(typeof d === 'object', 'diff() returns an object');
    if (d.assessed_value) {
      assert(typeof d.assessed_value.delta_pct === 'number', 'diff() computes delta_pct');
    }

    if (origGetFeatures && window.PARCEL_RENDERER) {
      window.PARCEL_RENDERER.getFeatures = origGetFeatures;
    }

    console.groupEnd();
  }

  // ── PARCEL_DRAW_TOOL (Phase 4) ────────────────────────────────────────────

  if (typeof window !== 'undefined' && window.PARCEL_DRAW_TOOL) {
    console.group('PARCEL_DRAW_TOOL');

    assert(typeof window.PARCEL_DRAW_TOOL.activate   === 'function', 'activate is a function');
    assert(typeof window.PARCEL_DRAW_TOOL.deactivate === 'function', 'deactivate is a function');
    assert(typeof window.PARCEL_DRAW_TOOL.isActive   === 'function', 'isActive is a function');
    assert(!window.PARCEL_DRAW_TOOL.isActive(), 'initially not active');

    console.groupEnd();
  }

  // ── GeoJSONParcelConnector (Phase 4) ─────────────────────────────────────

  if (typeof window !== 'undefined' && window.GeoJSONParcelConnector) {
    console.group('GeoJSONParcelConnector');

    const cfg = {
      fips: '51107',
      serviceUrl: 'data:application/json,{"type":"FeatureCollection","features":[]}',
      fieldMap: { parcel_id: 'OBJECTID', pin: 'PIN', address: 'SITE_ADDR' },
    };
    const conn = new window.GeoJSONParcelConnector(cfg);
    assert(conn != null, 'GeoJSONParcelConnector can be instantiated');
    assert(typeof conn.fetchViewport === 'function',  'fetchViewport is a function');
    assert(typeof conn.searchByQuery === 'function', 'searchByQuery is a function');
    assert(typeof conn.fetchById    === 'function',  'fetchById is a function');

    console.groupEnd();
  }

  console.groupEnd();

  // ── WFSParcelConnector (Phase 4) ─────────────────────────────────────────

  if (typeof window !== 'undefined' && window.WFSParcelConnector) {
    console.group('WFSParcelConnector');

    const wfsCfg = {
      fips: '51153',
      serviceUrl: 'https://example.com/geoserver/ows',
      layerName:  'parcel_data:parcels',
      wfsVersion: '2.0.0',
      fieldMap:   { parcel_id: 'OBJECTID', pin: 'GPIN', address: 'SITE_ADDRESS' },
    };
    const wfsConn = new window.WFSParcelConnector(wfsCfg);
    assert(wfsConn != null, 'WFSParcelConnector can be instantiated');
    assert(typeof wfsConn.fetchViewport   === 'function', 'fetchViewport is a function');
    assert(typeof wfsConn.searchByQuery   === 'function', 'searchByQuery is a function');
    assert(typeof wfsConn.fetchById       === 'function', 'fetchById is a function');

    // Test normalisation
    const wfsRaw = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: 'parcels.1',
        geometry: { type: 'Point', coordinates: [-77.5, 38.8] },
        properties: { OBJECTID: 99, GPIN: 'GP-42', SITE_ADDRESS: '456 Oak Ave' },
      }],
    };
    const wfsNorm = wfsConn._normalize(wfsRaw);
    assertEq(wfsNorm.features.length, 1, 'WFS _normalize preserves feature count');
    assertEq(wfsNorm.features[0].properties.pin, 'GP-42', 'WFS _normalize maps GPIN → pin');
    assertEq(wfsNorm.features[0].properties._source, 'wfs', 'WFS _normalize stamps _source');
    assertEq(wfsNorm.features[0].properties.county_fips, '51153', 'WFS _normalize stamps county_fips');

    // Verify 2.0.0 bbox axis order (lat-first)
    const u200 = wfsConn._buildUrl({ REQUEST: 'GetFeature', BBOX: 'test', COUNT: '10' });
    assert(u200.includes('VERSION=2.0.0'), 'WFS 2.0.0 version in URL');
    assert(u200.includes('outputFormat=application%2Fjson') || u200.includes('outputFormat=application/json'), 'JSON output format in URL');

    const wfsCfg11 = { ...wfsCfg, wfsVersion: '1.1.0' };
    const wfsConn11 = new window.WFSParcelConnector(wfsCfg11);
    const u110 = wfsConn11._buildUrl({ REQUEST: 'GetFeature', BBOX: 'test', COUNT: '10' });
    assert(u110.includes('VERSION=1.1.0'), 'WFS 1.1.0 version in URL');

    console.groupEnd();
  }

  // ── PARCEL_MASSING (Phase 5) ──────────────────────────────────────────────

  if (typeof window !== 'undefined' && window.PARCEL_MASSING) {
    console.group('PARCEL_MASSING');

    assert(typeof window.PARCEL_MASSING.render === 'function', 'render is a function');

    const container = document.createElement('div');
    const envelope = {
      footprintSqft:    20000,
      footprintAcres:   0.46,
      maxHeight_ft:     60,
      estimatedGFA_sqft: 120000,
      lotCoveragePct:   60,
      setbacks:         { front: 25, side: 10, rear: 20 },
    };
    window.PARCEL_MASSING.render(container, envelope, { theme: 'dark' });
    assert(container.querySelector('svg') !== null, 'render produces an SVG element');
    const svg = container.querySelector('svg');
    assert(svg.querySelectorAll('polygon').length >= 4, 'SVG contains at least 4 polygon faces');
    assert(svg.querySelector('text') !== null, 'SVG contains text labels');

    // Light theme
    const containerL = document.createElement('div');
    window.PARCEL_MASSING.render(containerL, envelope, { theme: 'light' });
    assert(containerL.querySelector('svg') !== null, 'render works in light theme');

    // Graceful no-op with missing envelope
    window.PARCEL_MASSING.render(container, null);
    assert(true, 'render with null envelope does not throw');

    console.groupEnd();
  }

  // ── PARCEL_REGISTRY jurisdictions (Phase 5) ───────────────────────────────

  if (typeof window !== 'undefined' && window.PARCEL_REGISTRY) {
    console.group('PARCEL_REGISTRY — jurisdiction coverage');

    const expectedFips = ['51107', '51153', '51059', '24031', '24027'];
    expectedFips.forEach(fips => {
      assert(window.PARCEL_REGISTRY.has(fips), `Registry has FIPS ${fips}`);
      const cfg = window.PARCEL_REGISTRY.get(fips);
      assert(cfg?.id?.length > 0, `${fips} has a non-empty id`);
      assert(['arcgis', 'geojson', 'wfs'].includes(cfg?.connector), `${fips} has valid connector type`);
    });
    assert(window.PARCEL_REGISTRY.all().length >= 5, 'Registry has at least 5 jurisdictions');

    console.groupEnd();
  }

  console.groupEnd();

  // ── Summary ──────────────────────────────────────────────────────────────

  const total  = passed + failed;
  const status = failed === 0 ? '%cALL PASS%c' : `%c${failed} FAILED%c`;
  const color  = failed === 0 ? 'color:green;font-weight:bold' : 'color:red;font-weight:bold';
  console.log(status + ` — ${passed}/${total} tests passed`, color, '');

  if (typeof module !== 'undefined') {
    module.exports = { passed, failed };
    if (failed > 0) process.exitCode = 1;
  }

  return { passed, failed };
})();
