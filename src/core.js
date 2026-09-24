/* vb,map from digitised NA.1 isopleths — proportional-distance interpolation.
   Coordinates in km on the OS National Grid (EPSG:27700). Port of vbmap_na1.py. */
const VB = (() => {
  let LV = [], BY = {}, CI = [];
  const STEP = 0.5;

  function init(data) {
    BY = {};
    for (const l of data.lines) (BY[l.v] = BY[l.v] || []).push(l);
    LV = Object.keys(BY).map(Number).sort((a, b) => a - b);
    CI = data.ci;
  }

  // nearest point on a polyline -> {d, x, y, atEnd}
  function nearestOnLine(l, px, py) {
    const c = l.c; let best = { d: Infinity };
    for (let i = 0; i < c.length - 1; i++) {
      const ax = c[i][0], ay = c[i][1], bx = c[i + 1][0], by = c[i + 1][1];
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      let t = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      const x = ax + t * dx, y = ay + t * dy, d = Math.hypot(px - x, py - y);
      if (d < best.d) best = { d, x, y, atEnd: !l.ring && ((i === 0 && t === 0) || (i === c.length - 2 && t === 1)) };
    }
    return best;
  }
  function nearestLevel(v, px, py) {
    let best = { d: Infinity };
    for (const l of BY[v]) { const r = nearestOnLine(l, px, py); if (r.d < best.d) best = r; }
    return best;
  }
  function segX(p1, p2, p3, p4) {            // proper segment intersection
    const o = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const d1 = o(p3, p4, p1), d2 = o(p3, p4, p2), d3 = o(p1, p2, p3), d4 = o(p1, p2, p4);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  }
  function crosses(v, a, b) {                 // does segment a-b cross any line of value v?
    for (const l of BY[v]) {
      const c = l.c;
      for (let i = 0; i < c.length - 1; i++) if (segX(a, b, c[i], c[i + 1])) return true;
    }
    return false;
  }
  function inPoly(c, x, y) {
    let inside = false;
    for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
      const xi = c[i][0], yi = c[i][1], xj = c[j][0], yj = c[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function distPoly(c, x, y) {
    if (inPoly(c, x, y)) return 0;
    return nearestOnLine({ c, ring: true }, x, y).d;
  }

  function vbmap(E, N) {                       // E, N in km
    const flags = [];
    for (const p of CI) if (distPoly(p, E, N) < 5)
      return { v: 24, E, N, method: 'Channel Islands (NA.1 note)', flags };

    const inFrame = E >= 0 && E <= 700 && N >= 0 && N <= 1250;
    const inInset = E >= -210 && E <= 260 && N >= 140 && N <= 700;
    if (!inFrame && !inInset) flags.push('outside_map');
    if (inInset && E < 0) flags.push('irish_republic');

    const dist = {};
    for (const v of LV) dist[v] = nearestLevel(v, E, N);
    const a = LV.reduce((m, v) => dist[v].d < dist[m].d ? v : m, LV[0]);
    const da = dist[a].d;
    if (da < 0.001) return { v: a, E, N, method: 'on isopleth', flags };

    let cand = [a - STEP, a + STEP].filter(v => dist[v]).sort((x, y) => dist[x].d - dist[y].d);
    const between = b => !crosses(a, [E, N], [dist[b].x, dist[b].y]);
    let b = cand[0];
    if (cand.length === 2 && !between(b)) b = cand[1];

    if (a === LV[0] && BY[a].some(l => l.ring && inPoly(l.c, E, N)))
      return { v: a, E, N, method: 'inside the 21.5 ring', flags: flags.concat('inside_21.5_ring') };
    if (a === LV[LV.length - 1] && b < a && !between(b))
      return { v: a, E, N, method: 'beyond the 31 line', flags: flags.concat('beyond_31') };
    if (dist[a].atEnd && da > 5) flags.push('beyond_line_end');

    let lo = { v: a, d: da, x: dist[a].x, y: dist[a].y }, hi = { v: b, d: dist[b].d, x: dist[b].x, y: dist[b].y };
    if (b < a) [lo, hi] = [hi, lo];
    const v = lo.v + (hi.v - lo.v) * lo.d / (lo.d + hi.d);
    return { v: Math.round(v * 100) / 100, E, N, lo, hi, method: 'interpolated', flags };
  }
  return { init, vbmap };
})();
if (typeof module !== 'undefined') module.exports = VB;
