/* js/router.js — Unified hash router and deep-link builder.

   WHY: hash handling was previously spread across map.js (#fips, #s=, #@lat),
   and stocks.js (#ai-stocks). There was no way to deep-link to a tab with
   state, and no single place to add new routes. This module centralizes
   parsing and URL construction while preserving every legacy format.

   ROUTE GRAMMAR
     #<tab>                       -> #map, #news, #analytics, #pipeline, #about
     #<tab>?<k>=<v>&<k>=<v>       -> #news?q=virginia, #pipeline?state=VA
     #jurisdiction?fips=51107     -> Jurisdiction Intelligence Page (Phase 3)

   LEGACY FORMATS (still parsed, never broken)
     #51107        5-digit FIPS  -> map tab, county selected
     #s=<base64>   GIS share state
     #@lat,lng,zm  map viewport
     #ai-stocks    stocks tab

   Exports on window.Router:
     parse()                  -> { route, params, raw, legacy }
     build(route, params)     -> "#route?k=v" string
     navigate(route, params, {replace}) -> sets location.hash
     link(route, params)      -> href string safe for <a>
     onChange(fn)             -> subscribe to route changes; returns unsubscribe
     setParam(k, v)           -> update one param on the current route
*/
window.Router = (function () {
  'use strict';

  /* Tabs that switchTab() understands. Anything else is a virtual route. */
  const TAB_ROUTES = ["home", "map", "economy", "news", "stocks", "analytics", "pipeline", "about"];
  /* Virtual routes render their own view rather than mapping to a header tab. */
  const VIRTUAL_ROUTES = ["jurisdiction", "methodology", "terms", "privacy"];

  const _listeners = [];
  let _suppress = false;   // guards against reacting to our own hash writes

  /* ── Parse ──────────────────────────────────────────────────────────────── */
  function parse() {
    const raw = window.location.hash.slice(1);
    if (!raw) return { route: "home", params: {}, raw, legacy: null };

    /* Legacy: GIS share state #s=<base64url> */
    if (/^s=/.test(raw)) {
      return { route: "map", params: {}, raw, legacy: "share" };
    }
    /* Legacy: viewport #@lat,lng,zoom */
    if (/^@-?\d/.test(raw)) {
      return { route: "map", params: {}, raw, legacy: "viewport" };
    }
    /* Legacy: bare 5-digit FIPS #51107 */
    if (/^\d{5}$/.test(raw)) {
      return { route: "map", params: { fips: raw }, raw, legacy: "fips" };
    }
    /* Legacy: #ai-stocks (with or without suffix) */
    if (/^ai-stocks/.test(raw)) {
      return { route: "stocks", params: {}, raw, legacy: "ai-stocks" };
    }

    /* Modern: <route>[?query] */
    const qIdx  = raw.indexOf("?");
    const route = (qIdx === -1 ? raw : raw.slice(0, qIdx)).toLowerCase();
    const query = qIdx === -1 ? "" : raw.slice(qIdx + 1);

    const params = {};
    if (query) {
      for (const pair of query.split("&")) {
        if (!pair) continue;
        const eq = pair.indexOf("=");
        const k = decodeURIComponent(eq === -1 ? pair : pair.slice(0, eq));
        const v = eq === -1 ? "" : decodeURIComponent(pair.slice(eq + 1));
        if (k) params[k] = v;
      }
    }

    const known = TAB_ROUTES.includes(route) || VIRTUAL_ROUTES.includes(route);
    return { route: known ? route : "home", params, raw, legacy: null };
  }

  /* ── Build ──────────────────────────────────────────────────────────────── */
  function build(route, params) {
    let s = String(route || "home");
    const entries = Object.entries(params || {})
      .filter(([, v]) => v !== undefined && v !== null && v !== "");
    if (entries.length) {
      s += "?" + entries
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
    }
    return "#" + s;
  }

  function link(route, params) { return build(route, params); }

  /* ── Navigate ───────────────────────────────────────────────────────────── */
  function navigate(route, params, opts) {
    const hash = build(route, params);
    if (hash === window.location.hash) return;
    const replace = opts && opts.replace;
    if (replace && history.replaceState) {
      history.replaceState(null, "", hash);
      _emit();               // replaceState does not fire hashchange
    } else {
      window.location.hash = hash;   // fires hashchange -> _emit
    }
  }

  /* Update a single query param on the current route, preserving the rest. */
  function setParam(key, value, opts) {
    const cur = parse();
    const params = Object.assign({}, cur.params);
    if (value === undefined || value === null || value === "") delete params[key];
    else params[key] = value;
    navigate(cur.route, params, opts);
  }

  /* ── Subscribe ──────────────────────────────────────────────────────────── */
  function onChange(fn) {
    if (typeof fn !== "function") return () => {};
    _listeners.push(fn);
    return () => {
      const i = _listeners.indexOf(fn);
      if (i !== -1) _listeners.splice(i, 1);
    };
  }

  function _emit() {
    if (_suppress) return;
    const r = parse();
    for (const fn of _listeners.slice()) {
      try { fn(r); } catch (err) { console.error("[Router] listener error:", err); }
    }
  }

  /* Run a hash write without notifying subscribers (used by map.js permalink
     updates that already rendered their own state). */
  function silently(fn) {
    _suppress = true;
    try { fn(); } finally { _suppress = false; }
  }

  window.addEventListener("hashchange", _emit);

  return {
    TAB_ROUTES, VIRTUAL_ROUTES,
    parse, build, link, navigate, setParam, onChange, silently,
  };
})();
