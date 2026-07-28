/* js/3d/fallback.js
 * WebGL capability probe + low-power heuristic. Runs before any Three.js
 * code is ever imported, so the 3D bootstrap can decide whether to fetch
 * the engine at all. "Never allow a 3D failure to break the rest of the
 * application" — every check here is wrapped so it can only return a
 * result object, never throw.
 */
window.SCENE3D_FALLBACK = (function () {
  'use strict';

  // Denylist, not allowlist: an allowlist of "known good" GPUs rots as new
  // hardware ships. A small denylist of known software rasterizers is a
  // much smaller, more stable surface, and fails open — unrecognized GPUs
  // are treated as fine, only confirmed-software renderers are flagged.
  const SOFTWARE_RENDERER_DENYLIST = [
    'swiftshader', 'llvmpipe', 'software rasterizer', 'microsoft basic render',
  ];

  function detectWebGL() {
    try {
      if (typeof document === 'undefined' || !document.createElement) {
        return { ok: false, reason: 'no-document' };
      }
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return { ok: false, reason: 'no-webgl' };

      let renderer = '';
      try {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
      } catch (_) {
        // Extension unavailable — not fatal, just means we can't detect
        // software rendering; fails open (treated as ok, not low-power).
      }
      const lower = renderer.toLowerCase();
      const lowPower = SOFTWARE_RENDERER_DENYLIST.some(s => lower.indexOf(s) !== -1);
      return { ok: true, lowPower, renderer };
    } catch (e) {
      return { ok: false, reason: 'exception', detail: String((e && e.message) || e) };
    }
  }

  const MESSAGES = {
    'no-webgl': "3D view isn't available on this device or browser. The 2D map has everything you need — try updating your browser or switching devices for 3D.",
    'no-document': "3D view isn't available in this context.",
    'exception': "3D view isn't available on this device or browser. The 2D map has everything you need — try updating your browser or switching devices for 3D.",
    'engine-load-failed': "3D view couldn't be loaded. The 2D map has everything you need — try reloading the page.",
    'terrain-failed': "Terrain data couldn't be loaded for this area. Showing the 3D scene without elevation — do not treat this as flat ground.",
    'low-power': '3D rendering may be slow on this device.',
  };

  return { detectWebGL, MESSAGES, SOFTWARE_RENDERER_DENYLIST };
})();
