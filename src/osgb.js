/* WGS84 <-> OS National Grid (OSGB36, Transverse Mercator) with a 7-parameter Helmert
   transform (typically ~5 m accurate, ample for a wind map). Grid-reference helpers. */
const OSGB = (() => {
  const rad = Math.PI / 180;
  const AIRY = { a: 6377563.396, b: 6356256.909 }, GRS80 = { a: 6378137, b: 6356752.314245 };
  const F0 = 0.9996012717, lat0 = 49 * rad, lon0 = -2 * rad, N0 = -100000, E0 = 400000;
  // WGS84 -> OSGB36 Helmert
  const H = { tx: -446.448, ty: 125.157, tz: -542.060, s: 20.4894e-6, rx: -0.1502, ry: -0.2470, rz: -0.8421 };

  function toCart(lat, lon, el) {
    const e2 = 1 - (el.b * el.b) / (el.a * el.a), s = Math.sin(lat), c = Math.cos(lat);
    const nu = el.a / Math.sqrt(1 - e2 * s * s);
    return [nu * c * Math.cos(lon), nu * c * Math.sin(lon), (1 - e2) * nu * s];
  }
  function fromCart([x, y, z], el) {
    const e2 = 1 - (el.b * el.b) / (el.a * el.a), p = Math.hypot(x, y);
    let lat = Math.atan2(z, p * (1 - e2)), prev = 2 * Math.PI;
    while (Math.abs(lat - prev) > 1e-12) {
      const nu = el.a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
      prev = lat; lat = Math.atan2(z + e2 * nu * Math.sin(lat), p);
    }
    return [lat, Math.atan2(y, x)];
  }
  function helmert([x, y, z], sign) {
    const s = 1 + sign * H.s, k = sign * rad / 3600;
    const rx = H.rx * k, ry = H.ry * k, rz = H.rz * k;
    return [sign * H.tx + s * x - rz * y + ry * z,
            sign * H.ty + rz * x + s * y - rx * z,
            sign * H.tz - ry * x + rx * y + s * z];
  }
  function meridional(lat, n, b) {
    const d = lat - lat0, s = lat + lat0;
    return b * F0 * ((1 + n + 1.25 * n * n + 1.25 * n ** 3) * d
      - (3 * n + 3 * n * n + 2.625 * n ** 3) * Math.sin(d) * Math.cos(s)
      + (1.875 * n * n + 1.875 * n ** 3) * Math.sin(2 * d) * Math.cos(2 * s)
      - (35 / 24) * n ** 3 * Math.sin(3 * d) * Math.cos(3 * s));
  }
  function llToEN(latDeg, lonDeg) {
    const [la, lo] = fromCart(helmert(toCart(latDeg * rad, lonDeg * rad, GRS80), 1), AIRY);
    const { a, b } = AIRY, e2 = 1 - (b * b) / (a * a), n = (a - b) / (a + b);
    const s = Math.sin(la), c = Math.cos(la), t = Math.tan(la);
    const nu = a * F0 / Math.sqrt(1 - e2 * s * s), rho = a * F0 * (1 - e2) / (1 - e2 * s * s) ** 1.5;
    const eta2 = nu / rho - 1, M = meridional(la, n, b), dl = lo - lon0;
    const I = M + N0, II = nu / 2 * s * c, III = nu / 24 * s * c ** 3 * (5 - t * t + 9 * eta2),
      IIIA = nu / 720 * s * c ** 5 * (61 - 58 * t * t + t ** 4),
      IV = nu * c, V = nu / 6 * c ** 3 * (nu / rho - t * t),
      VI = nu / 120 * c ** 5 * (5 - 18 * t * t + t ** 4 + 14 * eta2 - 58 * t * t * eta2);
    return [E0 + IV * dl + V * dl ** 3 + VI * dl ** 5, I + II * dl ** 2 + III * dl ** 4 + IIIA * dl ** 6];
  }
  function enToLL(E, N) {
    const { a, b } = AIRY, e2 = 1 - (b * b) / (a * a), n = (a - b) / (a + b);
    let la = lat0, M = 0;
    do { la = (N - N0 - M) / (a * F0) + la; M = meridional(la, n, b); } while (Math.abs(N - N0 - M) >= 0.00001);
    const s = Math.sin(la), c = Math.cos(la), t = Math.tan(la);
    const nu = a * F0 / Math.sqrt(1 - e2 * s * s), rho = a * F0 * (1 - e2) / (1 - e2 * s * s) ** 1.5;
    const eta2 = nu / rho - 1, sec = 1 / c, dE = E - E0;
    const VII = t / (2 * rho * nu), VIII = t / (24 * rho * nu ** 3) * (5 + 3 * t * t + eta2 - 9 * t * t * eta2),
      IX = t / (720 * rho * nu ** 5) * (61 + 90 * t * t + 45 * t ** 4),
      X = sec / nu, XI = sec / (6 * nu ** 3) * (nu / rho + 2 * t * t),
      XII = sec / (120 * nu ** 5) * (5 + 28 * t * t + 24 * t ** 4),
      XIIA = sec / (5040 * nu ** 7) * (61 + 662 * t * t + 1320 * t ** 4 + 720 * t ** 6);
    const lat = la - VII * dE ** 2 + VIII * dE ** 4 - IX * dE ** 6;
    const lon = lon0 + X * dE - XI * dE ** 3 + XII * dE ** 5 - XIIA * dE ** 7;
    const [p, q] = fromCart(helmert(toCart(lat, lon, AIRY), -1), GRS80);
    return [p / rad, q / rad];
  }
  const L = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
  function squareLetters(E, N) {             // E, N in metres
    const e100 = Math.floor(E / 100000), n100 = Math.floor(N / 100000);
    if (e100 < 0 || e100 > 6 || n100 < 0 || n100 > 12) return null;
    let l1 = (19 - n100) - (19 - n100) % 5 + Math.floor((e100 + 10) / 5);
    let l2 = (19 - n100) * 5 % 25 + e100 % 5;
    return L[l1] + L[l2];
  }
  function toGridRef(E, N, digits = 10) {
    const sq = squareLetters(E, N); if (!sq) return null;
    const k = digits / 2, f = 10 ** (5 - k);
    const e = String(Math.floor((E % 100000) / f)).padStart(k, '0');
    const n = String(Math.floor((N % 100000) / f)).padStart(k, '0');
    return `${sq} ${e} ${n}`;
  }
  function fromGridRef(s) {
    const m = s.toUpperCase().replace(/\s+/g, ' ').trim().match(/^([A-HJ-Z]{2})\s?(\d*)\s?(\d*)$/);
    if (!m) return null;
    let digits = m[2] + m[3];
    if (digits.length % 2 || digits.length > 10) return null;
    const i1 = L.indexOf(m[1][0]), i2 = L.indexOf(m[1][1]);
    let e100 = ((i1 - 2) % 5) * 5 + (i2 % 5), n100 = (19 - Math.floor(i1 / 5) * 5) - Math.floor(i2 / 5);
    if (e100 < 0 || n100 < 0) return null;
    const k = digits.length / 2, f = 10 ** (5 - k);
    const e = k ? +digits.slice(0, k) * f : 0, n = k ? +digits.slice(k) * f : 0;
    return [e100 * 100000 + e + f / 2 * (k ? 1 : 100), n100 * 100000 + n + f / 2 * (k ? 1 : 100)];
  }
  return { llToEN, enToLL, toGridRef, fromGridRef, squareLetters };
})();
if (typeof module !== 'undefined') module.exports = OSGB;
