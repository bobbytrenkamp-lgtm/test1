/* js/3d/terrain-tiles.js
 * Pure-logic terrain tile math + Terrarium PNG decoding + in-memory cache.
 * No DOM, no THREE, no fetch() call of its own — the actual network/pixel
 * loading is injected via opts.loadPixels so this file is Node-testable
 * (see tests/scene3d.test.js) and reusable from the browser engine.
 *
 * Data source: AWS Open Data "Terrain Tiles" (Terrarium encoding), free,
 * keyless, no account required — https://registry.opendata.aws/terrain-tiles/
 * Decode: elevation_meters = (red*256 + green + blue/256) - 32768
 */
window.SCENE3D_TERRAIN_TILES = (function () {
  'use strict';

  const TILE_SIZE = 256;
  const DEFAULT_CACHE_CAPACITY = 200;

  const TERRAIN_URL_TEMPLATE = (z, x, y) =>
    `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

  function lngLatToTile(lng, lat, z) {
    const n = Math.pow(2, z);
    const x = Math.floor((lng + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    const max = n - 1;
    return {
      x: Math.min(Math.max(x, 0), max),
      y: Math.min(Math.max(y, 0), max),
      z,
    };
  }

  function tileToLngLatBounds(x, y, z) {
    const n = Math.pow(2, z);
    const lngAt = tx => tx / n * 360 - 180;
    const latAt = ty => {
      const rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * ty / n)));
      return rad * 180 / Math.PI;
    };
    return {
      west: lngAt(x),
      east: lngAt(x + 1),
      north: latAt(y),
      south: latAt(y + 1),
    };
  }

  /* pixels: RGBA byte array (Uint8Array/Uint8ClampedArray), length = w*h*4.
   * Returns a Float32Array of length w*h, one elevation-in-meters per pixel. */
  function decodeTerrarium(pixels) {
    const count = pixels.length / 4;
    const heights = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];
      heights[i] = (r * 256 + g + b / 256) - 32768;
    }
    return heights;
  }

  /* Insertion-order eviction cache of decoded heightmaps, keyed by "z/x/y",
   * plus an in-flight map to de-dupe concurrent requests for the same tile
   * (the real risk during rapid orbit/pan, not literal duplicate page loads). */
  function createTileCache(capacity) {
    const cap = capacity || DEFAULT_CACHE_CAPACITY;
    const cache = new Map();
    const inflight = new Map();
    const key = (z, x, y) => `${z}/${x}/${y}`;

    return {
      key,
      has:   (z, x, y) => cache.has(key(z, x, y)),
      get:   (z, x, y) => cache.get(key(z, x, y)),
      set(z, x, y, heights) {
        const k = key(z, x, y);
        if (!cache.has(k) && cache.size >= cap) {
          const oldest = cache.keys().next().value;
          cache.delete(oldest);
        }
        cache.set(k, heights);
      },
      getInflight:   (z, x, y) => inflight.get(key(z, x, y)),
      setInflight:   (z, x, y, p) => inflight.set(key(z, x, y), p),
      clearInflight: (z, x, y) => inflight.delete(key(z, x, y)),
      size:  () => cache.size,
      clear: () => { cache.clear(); inflight.clear(); },
    };
  }

  /* opts.cache: a createTileCache() instance (required).
   * opts.loadPixels(url, signal): Promise<Uint8Array-like RGBA bytes> — the
   * only part of this module that touches the network/DOM; injected so this
   * function stays testable without a browser. Rejects on network/CORS/404
   * failure; callers (js/3d/terrain.js) handle that per-tile, not here. */
  function fetchElevationTile(z, x, y, opts) {
    opts = opts || {};
    const cache = opts.cache;
    if (!cache) throw new Error('fetchElevationTile requires opts.cache');
    if (typeof opts.loadPixels !== 'function') throw new Error('fetchElevationTile requires opts.loadPixels');

    if (cache.has(z, x, y)) return Promise.resolve(cache.get(z, x, y));
    const existing = cache.getInflight(z, x, y);
    if (existing) return existing;

    const url = TERRAIN_URL_TEMPLATE(z, x, y);
    const p = Promise.resolve(opts.loadPixels(url, opts.signal))
      .then(pixels => {
        const heights = decodeTerrarium(pixels);
        cache.set(z, x, y, heights);
        cache.clearInflight(z, x, y);
        return heights;
      })
      .catch(err => {
        cache.clearInflight(z, x, y);
        throw err;
      });
    cache.setInflight(z, x, y, p);
    return p;
  }

  return {
    TILE_SIZE,
    TERRAIN_URL_TEMPLATE,
    lngLatToTile,
    tileToLngLatBounds,
    decodeTerrarium,
    createTileCache,
    fetchElevationTile,
  };
})();
