/* js/parcel/massing.js
 * Isometric 3-D buildable-envelope massing diagram.
 *
 * Renders an SVG block diagram showing the parcel footprint (ground plane)
 * and the allowable building massing (extruded box) at a glance.
 * Setback zones are shown as a lighter "exclusion" collar around the footprint.
 *
 * Public API (window.PARCEL_MASSING):
 *   render(container, envelope, opts) → <svg> element inserted into container
 *     container — DOM element to clear and populate
 *     envelope  — object from PARCEL_FEASIBILITY:
 *                   footprintSqft, footprintAcres, maxHeight_ft,
 *                   estimatedGFA_sqft, setbacks (front/rear/side ft),
 *                   lotCoveragePct (0-100)
 *     opts      — { theme: 'dark'|'light' }
 */
window.PARCEL_MASSING = (function () {
  'use strict';

  /* ── Isometric projection ───────────────────────────────────────────────── */
  // Standard 2:1 isometric: right → (cos30, sin30), up → (cos90, sin90 scaled)
  const ISO_X  = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)];   // right axis
  const ISO_Y  = [-Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)];  // left axis (depth)
  const ISO_Z  = [0, -1];                                            // vertical

  function _iso(rx, ry, rz, scale) {
    const s = scale || 1;
    return [
      (ISO_X[0] * rx + ISO_Y[0] * ry + ISO_Z[0] * rz) * s,
      (ISO_X[1] * rx + ISO_Y[1] * ry + ISO_Z[1] * rz) * s,
    ];
  }

  function _pt(rx, ry, rz, scale, ox, oy) {
    const [x, y] = _iso(rx, ry, rz, scale);
    return `${(x + ox).toFixed(1)},${(y + oy).toFixed(1)}`;
  }

  function _face(corners, fill, stroke, opacity) {
    return `<polygon points="${corners.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="0.8" opacity="${opacity ?? 1}"/>`;
  }

  /* ── SVG construction ───────────────────────────────────────────────────── */

  function _buildSVG(env, colors) {
    // Normalise envelope values with safe defaults
    const rawFt   = env.footprintSqft  || 20000;
    const covPct  = env.lotCoveragePct || 60;
    const htFt    = env.maxHeight_ft   || 40;
    const sbFront = env.setbacks?.front || 25;
    const sbSide  = env.setbacks?.side  || 10;

    // Map parcel dimensions to isometric unit lengths
    // Treat footprint as square for simplicity; scale proportionally
    const lotSide  = Math.sqrt(rawFt);                    // ft, square approximation
    const bldSide  = Math.sqrt(rawFt * covPct / 100);    // ft
    const sbFrac   = Math.max(sbFront, sbSide) / lotSide; // fraction of lot
    const aspect   = htFt / lotSide;                      // height-to-width ratio

    // Isometric drawing units (dimensionless)
    const W = 6;                           // parcel width  (iso units)
    const D = 6;                           // parcel depth
    const bw = W * Math.sqrt(covPct / 100);  // building footprint width
    const bd = D * Math.sqrt(covPct / 100);  // building footprint depth
    const bx = (W - bw) / 2;              // horizontal offset (centred)
    const by = (D - bd) / 2;              // depth offset
    const H  = Math.min(bw * aspect * 1.4, 5); // building height; capped for readability

    // SVG viewport: derive bounding box of all projected corners
    const SCALE = 34;
    const OX    = 130;
    const OY    = 95;

    const { face, ground, bldFill, bldTop, bldRight, setbackFill, strokeColor } = colors;

    const polys = [];

    // Ground plane (parcel footprint)
    polys.push(_face([
      _pt(0, 0, 0, SCALE, OX, OY),
      _pt(W, 0, 0, SCALE, OX, OY),
      _pt(W, D, 0, SCALE, OX, OY),
      _pt(0, D, 0, SCALE, OX, OY),
    ], ground, strokeColor, 0.55));

    // Setback collar (lighter fill inside parcel, outside building zone)
    polys.push(_face([
      _pt(bx,      by,      0, SCALE, OX, OY),
      _pt(bx + bw, by,      0, SCALE, OX, OY),
      _pt(bx + bw, by + bd, 0, SCALE, OX, OY),
      _pt(bx,      by + bd, 0, SCALE, OX, OY),
    ], setbackFill, strokeColor, 0.30));

    // Building — left face (depth)
    polys.push(_face([
      _pt(bx,      by + bd, 0, SCALE, OX, OY),
      _pt(bx,      by + bd, H, SCALE, OX, OY),
      _pt(bx,      by,      H, SCALE, OX, OY),
      _pt(bx,      by,      0, SCALE, OX, OY),
    ], bldFill, strokeColor, 0.80));

    // Building — right face (width)
    polys.push(_face([
      _pt(bx + bw, by,      0, SCALE, OX, OY),
      _pt(bx + bw, by,      H, SCALE, OX, OY),
      _pt(bx + bw, by + bd, H, SCALE, OX, OY),
      _pt(bx + bw, by + bd, 0, SCALE, OX, OY),
    ], bldRight, strokeColor, 0.75));

    // Building — top face
    polys.push(_face([
      _pt(bx,      by,      H, SCALE, OX, OY),
      _pt(bx + bw, by,      H, SCALE, OX, OY),
      _pt(bx + bw, by + bd, H, SCALE, OX, OY),
      _pt(bx,      by + bd, H, SCALE, OX, OY),
    ], bldTop, strokeColor, 0.95));

    // Height dashed guide line (right-front edge)
    const [lx0, ly0] = _iso(bx + bw, by, 0, SCALE);
    const [lx1, ly1] = _iso(bx + bw, by, H, SCALE);
    const htLine = `<line x1="${(lx0 + OX).toFixed(1)}" y1="${(ly0 + OY).toFixed(1)}"
                          x2="${(lx1 + OX).toFixed(1)}" y2="${(ly1 + OY).toFixed(1)}"
                          stroke="${face}" stroke-width="1" stroke-dasharray="3,2" opacity="0.5"/>`;

    // Labels
    const [lblHx, lblHy] = _iso(bx + bw + 0.5, by, H / 2, SCALE);
    const htLabel = `<text x="${(lblHx + OX).toFixed(1)}" y="${(lblHy + OY + 4).toFixed(1)}"
      font-size="9" fill="${face}" opacity="0.75" text-anchor="start">${htFt}ft</text>`;

    const [gfaLx, gfaLy] = _iso(W / 2, D + 0.3, 0, SCALE);
    const gfaLabel = env.estimatedGFA_sqft
      ? `<text x="${(gfaLx + OX).toFixed(1)}" y="${(gfaLy + OY + 4).toFixed(1)}"
          font-size="8" fill="${face}" opacity="0.60" text-anchor="middle">~${Math.round(env.estimatedGFA_sqft / 1000)}k GFA sqft</text>`
      : '';

    const covLabel = `<text x="${(gfaLx + OX).toFixed(1)}" y="${(gfaLy + OY + 14).toFixed(1)}"
      font-size="8" fill="${face}" opacity="0.50" text-anchor="middle">${covPct}% lot coverage</text>`;

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 160" width="100%" role="img"
     aria-label="Isometric massing diagram showing buildable envelope">
  <title>Buildable Envelope Diagram</title>
  ${polys.join('\n  ')}
  ${htLine}
  ${htLabel}
  ${gfaLabel}
  ${covLabel}
</svg>`.trim();
  }

  /* ── Theme palette ──────────────────────────────────────────────────────── */

  function _colors(theme) {
    if (theme === 'light') {
      return {
        ground:      '#c8d6f0',
        bldFill:     '#5a7fd4',
        bldRight:    '#3a5fb0',
        bldTop:      '#7a9eee',
        setbackFill: '#a8c2e8',
        strokeColor: '#2a3f80',
        face:        '#1e2a4a',
      };
    }
    // dark (default)
    return {
      ground:      '#1e2d4a',
      bldFill:     '#3a5fa8',
      bldRight:    '#2a4a8a',
      bldTop:      '#5a7fd0',
      setbackFill: '#2a3d60',
      strokeColor: '#7a9ee0',
      face:        '#c8d8f8',
    };
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */

  function render(container, envelope, opts) {
    if (!container || !envelope) return;

    const theme = opts?.theme
      || (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

    try {
      container.innerHTML = _buildSVG(envelope, _colors(theme));
    } catch (err) {
      console.warn('[PARCEL_MASSING] render error:', err);
      container.innerHTML = '';
    }
  }

  return { render };
})();
