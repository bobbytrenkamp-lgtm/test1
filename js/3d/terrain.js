/* js/3d/terrain.js  (ES module)
 * Local-tangent-plane projection + THREE.js terrain mesh building.
 *
 * The projection here is a standard flat-earth approximation, accurate
 * enough at county scale (tens of km) — it is NOT a survey-grade
 * projection, and is only used to place mesh geometry in the 3D scene's
 * local coordinate system. The elevation values themselves come unmodified
 * from the AWS Terrarium tiles (see js/3d/terrain-tiles.js).
 */

const METERS_PER_DEG_LAT = 110540;
const metersPerDegLng = latDeg => 111320 * Math.cos(latDeg * Math.PI / 180);

export function projectLatLng(lat, lng, originLat, originLng) {
  return {
    x: (lng - originLng) * metersPerDegLng(originLat),
    z: -(lat - originLat) * METERS_PER_DEG_LAT,
  };
}

export function unprojectXZ(x, z, originLat, originLng) {
  return {
    lng: originLng + x / metersPerDegLng(originLat),
    lat: originLat - z / METERS_PER_DEG_LAT,
  };
}

const TILE_GRID_RADIUS = 1;  // 3x3 tile grid centered on the origin tile
const SAMPLE_STEP = 8;       // subsample each 256px tile every 8px -> 33x33 mesh grid
const DEFAULT_ZOOM = 12;     // ~38m/px at mid-latitudes — county-scale detail

/* Builds a THREE.Group of terrain mesh patches around (originLat, originLng).
 * Tiles that fail to fetch/decode (network, CORS, 404) get a visually
 * distinct wireframe "no data" placeholder patch instead of silently
 * rendering as normal-looking flat ground — do not present flat terrain as
 * real terrain. Returns { group, loadedCount, failedCount, totalCount }. */
export async function buildTerrainMesh(THREE, opts) {
  const {
    originLat, originLng, zoom = DEFAULT_ZOOM,
    tileTiles, cache, loadPixels, exaggeration = 1.5,
  } = opts;

  const TT = tileTiles;
  const center = TT.lngLatToTile(originLng, originLat, zoom);
  const group = new THREE.Group();
  group.name = 'scene3d-terrain';

  const okMaterial = new THREE.MeshLambertMaterial({ color: 0x7c9070 });
  const noDataMaterial = new THREE.MeshBasicMaterial({
    color: 0x555555, wireframe: true, transparent: true, opacity: 0.35,
  });

  const tileCoords = [];
  for (let dy = -TILE_GRID_RADIUS; dy <= TILE_GRID_RADIUS; dy++) {
    for (let dx = -TILE_GRID_RADIUS; dx <= TILE_GRID_RADIUS; dx++) {
      tileCoords.push({ x: center.x + dx, y: center.y + dy });
    }
  }

  const results = await Promise.all(tileCoords.map(async ({ x, y }) => {
    try {
      const heights = await TT.fetchElevationTile(zoom, x, y, { cache, loadPixels });
      return { x, y, heights, ok: true };
    } catch (e) {
      return { x, y, ok: false, error: e };
    }
  }));

  let loadedCount = 0, failedCount = 0;
  const side = Math.floor(TT.TILE_SIZE / SAMPLE_STEP) + 1; // e.g. 33

  results.forEach(r => {
    const bounds = TT.tileToLngLatBounds(r.x, r.y, zoom);
    const nw = projectLatLng(bounds.north, bounds.west, originLat, originLng);
    const se = projectLatLng(bounds.south, bounds.east, originLat, originLng);
    const width = se.x - nw.x;
    const depth = se.z - nw.z;
    const cx = (nw.x + se.x) / 2;
    const cz = (nw.z + se.z) / 2;

    if (r.ok) {
      loadedCount++;
      const geometry = new THREE.PlaneGeometry(width, depth, side - 1, side - 1);
      geometry.rotateX(-Math.PI / 2);
      const pos = geometry.attributes.position;
      for (let row = 0; row < side; row++) {
        for (let col = 0; col < side; col++) {
          const px = Math.min(col * SAMPLE_STEP, TT.TILE_SIZE - 1);
          const py = Math.min(row * SAMPLE_STEP, TT.TILE_SIZE - 1);
          const elevation = r.heights[py * TT.TILE_SIZE + px] || 0;
          pos.setY(row * side + col, elevation);
        }
      }
      pos.needsUpdate = true;
      const mesh = new THREE.Mesh(geometry, okMaterial);
      mesh.position.set(cx, 0, cz);
      mesh.userData.tileStatus = 'ok';
      group.add(mesh);
    } else {
      failedCount++;
      const geometry = new THREE.PlaneGeometry(width, depth, 1, 1);
      geometry.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, noDataMaterial);
      mesh.position.set(cx, 0, cz);
      mesh.userData.tileStatus = 'no-data';
      group.add(mesh);
    }
  });

  // Re-center vertically on the origin tile's elevation so the scene sits
  // near y=0 regardless of absolute elevation (e.g. a mile-high city vs.
  // sea level), then apply the user's vertical exaggeration multiplier.
  const originResult = results.find(r => r.x === center.x && r.y === center.y && r.ok);
  let baseElevation = 0;
  if (originResult) {
    const mid = Math.floor(TT.TILE_SIZE / 2);
    baseElevation = originResult.heights[mid * TT.TILE_SIZE + mid] || 0;
  }
  group.children.forEach(mesh => {
    if (mesh.userData.tileStatus !== 'ok') return;
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, (pos.getY(i) - baseElevation) * exaggeration);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });

  return { group, loadedCount, failedCount, totalCount: tileCoords.length };
}
