/* js/3d/sun.js
 * Pure-logic solar position calculator — no DOM, no THREE. Node-testable.
 *
 * Implements NOAA's simplified solar position equations
 * (https://gml.noaa.gov/grad/solcalc/solareqns.PDF), accurate to roughly
 * 0.01 degrees. That is suitable for conceptual shadow-direction
 * visualization in the 3D view — it is NOT survey-grade solar/shading
 * analysis, and js/3d/engine.js's UI must not present it as one.
 */
window.SCENE3D_SUN = (function () {
  'use strict';

  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;

  function _dayOfYear(date) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 1);
    const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return Math.floor((today - start) / 86400000) + 1;
  }

  /* date: a JS Date, evaluated in UTC (pass a Date representing the desired
   * UTC instant, e.g. `new Date(isoString)`).
   * lat, lng: degrees (lng: east positive, west negative — matches this
   * codebase's convention elsewhere, e.g. js/3d/terrain.js).
   * Returns { altitudeDeg, azimuthDeg }: altitude is degrees above the
   * horizon (negative = below — nighttime); azimuth is compass degrees
   * from true north, clockwise. */
  function solarPosition(date, lat, lng) {
    const doy = _dayOfYear(date);
    const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

    const gamma = (2 * Math.PI / 365) * (doy - 1 + (utcHours - 12) / 24);

    const eqTimeMin = 229.18 * (
      0.000075
      + 0.001868 * Math.cos(gamma)
      - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma)
      - 0.040849 * Math.sin(2 * gamma)
    );

    const decl = (
      0.006918
      - 0.399912 * Math.cos(gamma)
      + 0.070257 * Math.sin(gamma)
      - 0.006758 * Math.cos(2 * gamma)
      + 0.000907 * Math.sin(2 * gamma)
      - 0.002697 * Math.cos(3 * gamma)
      + 0.00148 * Math.sin(3 * gamma)
    );

    const timeOffsetMin = eqTimeMin + 4 * lng; // UTC-referenced, timezone term = 0
    const trueSolarTimeMin = utcHours * 60 + timeOffsetMin;
    let hourAngleDeg = (trueSolarTimeMin / 4) - 180;
    if (hourAngleDeg < -180) hourAngleDeg += 360;
    if (hourAngleDeg > 180) hourAngleDeg -= 360;
    const hourAngle = hourAngleDeg * RAD;

    const latRad = lat * RAD;
    const cosZenith = Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(hourAngle);
    const zenith = Math.acos(Math.max(-1, Math.min(1, cosZenith)));
    const altitudeDeg = 90 - zenith * DEG;

    const sinZenith = Math.sin(zenith);
    let azimuthDeg;
    if (Math.abs(sinZenith) < 1e-6) {
      azimuthDeg = 180; // sun at/near the zenith or nadir — azimuth undefined, arbitrary but stable
    } else {
      let cosAz = -(Math.sin(latRad) * Math.cos(zenith) - Math.sin(decl)) / (Math.cos(latRad) * sinZenith);
      cosAz = Math.max(-1, Math.min(1, cosAz));
      const az = Math.acos(cosAz) * DEG;
      azimuthDeg = hourAngleDeg > 0 ? 360 - az : az;
    }

    return { altitudeDeg, azimuthDeg };
  }

  /* Unit direction vector toward the sun in this codebase's local scene
   * axes (x=east, y=up, z=south — matches js/3d/terrain.js's projection,
   * where +z is toward decreasing latitude i.e. south: see projectLatLng's
   * `z = -(lat - originLat) * METERS_PER_DEG_LAT`). Used to position the
   * directional light.
   * Azimuth 0=north/90=east/180=south/270=west means the north-component
   * is cos(az) and the east-component is sin(az); since +z=south=-north,
   * z = -cos(alt)*cos(az) (verified: az=180/south gives +z, az=0/north
   * gives -z, az=90/east gives x=+1,z=0). */
  function directionToSun(altitudeDeg, azimuthDeg) {
    const alt = altitudeDeg * RAD;
    const az = azimuthDeg * RAD;
    return {
      x: Math.cos(alt) * Math.sin(az),
      y: Math.sin(alt),
      z: -Math.cos(alt) * Math.cos(az),
    };
  }

  return { solarPosition, directionToSun, _dayOfYear };
})();
