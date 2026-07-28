/* js/3d/camera.js  (ES module)
 * Orbit/pan/zoom/tilt camera wiring on top of vendor/three/OrbitControls.js
 * (which already implements mouse-drag orbit, wheel/pinch zoom, and
 * two-finger pan/touch gestures — this file configures it rather than
 * reimplementing pointer-event handling from scratch).
 */

export function createOrbitCamera(THREE, OrbitControls, canvas, aspect) {
  const camera = new THREE.PerspectiveCamera(50, aspect || 1, 1, 100000);
  camera.position.set(0, 900, 900);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 20;
  controls.maxDistance = 20000;
  controls.maxPolarAngle = Math.PI / 2 - 0.02; // stop just short of straight-down/underground
  controls.screenSpacePanning = false;
  controls.target.set(0, 0, 0);
  controls.update();

  /* {distance, azimuthDeg, polarDeg, target:{x,y,z}} — the shape saved into
   * scene3d.camera (js/3d/scene-state.js), read back out for persistence. */
  function getState() {
    return {
      distance: camera.position.distanceTo(controls.target),
      azimuthDeg: controls.getAzimuthalAngle() * 180 / Math.PI,
      polarDeg: controls.getPolarAngle() * 180 / Math.PI,
      target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
    };
  }

  function setState(state) {
    if (!state) return;
    if (state.target) {
      controls.target.set(state.target.x || 0, state.target.y || 0, state.target.z || 0);
    }
    const distance = typeof state.distance === 'number' ? state.distance : 1200;
    const azimuthRad = ((state.azimuthDeg || 0) * Math.PI) / 180;
    const polarRad = ((state.polarDeg != null ? state.polarDeg : 45) * Math.PI) / 180;
    const sinPolar = Math.sin(polarRad);
    camera.position.set(
      controls.target.x + distance * sinPolar * Math.sin(azimuthRad),
      controls.target.y + distance * Math.cos(polarRad),
      controls.target.z + distance * sinPolar * Math.cos(azimuthRad)
    );
    controls.update();
  }

  function frame(radiusMeters) {
    const r = Math.max(radiusMeters || 500, 50);
    setState({ distance: r * 2.2, azimuthDeg: 35, polarDeg: 55, target: { x: 0, y: 0, z: 0 } });
  }

  function setAspect(aspect2) {
    camera.aspect = aspect2;
    camera.updateProjectionMatrix();
  }

  function dispose() {
    controls.dispose();
  }

  return { camera, controls, getState, setState, frame, setAspect, dispose };
}
