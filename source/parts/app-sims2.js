/* ================= new simulators: design with data, member design, optimisation, form-finding ================= */
var HSEC = [ // name, A cm2, Ix cm4, Zx cm3, ix cm, iy cm  (Nippon Steel handbook)
  ['H-200×100×5.5×8', 26.67, 1810, 181, 8.23, 2.24],
  ['H-250×125×6×9', 36.97, 3960, 317, 10.4, 2.82],
  ['H-300×150×6.5×9', 46.78, 7210, 481, 12.4, 3.29],
  ['H-350×175×7×11', 62.91, 13500, 771, 14.6, 3.96],
  ['H-400×200×8×13', 83.37, 23500, 1170, 16.8, 4.56],
  ['H-500×200×10×16', 112.3, 46800, 1870, 20.4, 4.36],
  ['H-200×200×8×12', 63.53, 4720, 472, 8.62, 5.02],
  ['H-250×250×9×14', 91.43, 10700, 860, 10.8, 6.32],
  ['H-300×300×10×15', 118.5, 20200, 1350, 13.1, 7.55]
];
var FT = STEEL.F / 1.5; // long-term allowable tension and (braced) bending, N/mm2

function niceStep(range, target) {
  var raw = range / (target || 5), p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}
/* switch a viewport into chart mode: independent x and y scales, gridlines, ticks and axis titles */
function chart(v, x0, x1, y0, y1, o) {
  o = o || {};
  var l = o.l == null ? 58 : o.l, r = o.r == null ? 18 : o.r, t = o.t == null ? 44 : o.t, b = o.b == null ? 44 : o.b;
  var sx = (v.W - l - r) / (x1 - x0), sy = (v.H - t - b) / (y1 - y0);
  v.X = function (x) { return r2(l + (x - x0) * sx); }; v.Z = function (y) { return r2(v.H - b - (y - y0) * sy); };
  v.s = Math.min(sx, sy); v.toWorld = function (px, py) { return [x0 + (px - l) / sx, y0 + (v.H - b - py) / sy]; };
  v.begin(false);
  var xs = o.xstep || niceStep(x1 - x0, 6), ys = o.ystep || niceStep(y1 - y0, 5), g;
  for (g = Math.ceil(x0 / xs - 1e-9) * xs; g <= x1 + 1e-9; g += xs) {
    v.raw('<line class="g-grid" x1="' + v.X(g) + '" y1="' + v.Z(y0) + '" x2="' + v.X(g) + '" y2="' + v.Z(y1) + '"/>');
    v.text(g, y0, o.xfmt ? o.xfmt(g) : String(r2(g)), 'small', 'middle', 0, 16);
  }
  for (g = Math.ceil(y0 / ys - 1e-9) * ys; g <= y1 + 1e-9; g += ys) {
    v.raw('<line class="g-grid" x1="' + v.X(x0) + '" y1="' + v.Z(g) + '" x2="' + v.X(x1) + '" y2="' + v.Z(g) + '"/>');
    v.text(x0, g, o.yfmt ? o.yfmt(g) : String(r2(g)), 'small', 'end', -7, 4);
  }
  v.raw('<path class="axis" d="M' + v.X(x0) + ' ' + v.Z(y1) + 'V' + v.Z(y0) + 'H' + v.X(x1) + '"/>');
  if (o.xlab) v.label(r2((l + v.W - r) / 2), v.H - 8, o.xlab, 'small', 'middle');
  if (o.ylab) v.label(v.W - r, t - 14, o.ylab, 'small', 'end');
  return v;
}
function curvePath(v, pts) { return 'M' + pts.map(function (p) { return v.X(p[0]) + ' ' + v.Z(p[1]); }).join('L'); }

/* ---------- graph mapper shapes ---------- */
var GRAPHS = {
  linear: function (t) { return t; },
  sqrt: function (t) { return Math.sqrt(t); },
  parabola: function (t) { return 1 - Math.pow(2 * t - 1, 2); },
  sigmoid: function (t) { var f = function (u) { return 1 / (1 + Math.exp(-12 * (u - 0.5))); }; return (f(t) - f(0)) / (f(1) - f(0)); },
  sine: function (t) { return 0.5 - 0.5 * Math.cos(2 * Math.PI * t); }
};
var GRAPH_OPTS = [['linear', 'Linear'], ['sqrt', 'Square root'], ['parabola', 'Parabola'], ['sigmoid', 'Sigmoid'], ['sine', 'Sine']];

/* ---------- f1: Remap and Graph Mapper shape a tower ---------- */
SIMS.f1 = function (host) {
  var def = buildDef(host, {
    label: 'Floor numbers are remapped to 0 to 1, shaped by Graph Mapper, then remapped again to a scale factor for each floor plate.',
    cols: [[S('n', 'Floors', 6, 40, 1, 20), V('g', 'Graph', GRAPH_OPTS, 'parabola'), S('lo', 'Min scale', 0.4, 1, 0.05, 0.7, 2), S('hi', 'Max scale', 0.8, 1.6, 0.05, 1.2, 2)],
      { align: 'flex-start', nodes: [C('se', 'Series', ['S', 'N', 'C'], ['S']), C('bd', 'Bounds', ['N'], ['I'])] },
      { align: 'flex-start', nodes: [C('rm', 'Remap Numbers', ['V', 'S', 'T'], ['R', 'C'])] },
      { align: 'center', nodes: [C('gm', 'Graph Mapper', ['', ''], [''])] },
      [C('rm2', 'Remap Numbers', ['V', 'S', 'T'], ['R', 'C']), P('out', '', { title: 'Scale factors' })]],
    wires: [['n', 'se.C'], ['se.S', 'bd.N', 'l'], ['se.S', 'rm.V', 'l'], ['bd.I', 'rm.S'], ['rm.R', 'gm', 'l'], ['g', 'gm'], ['gm', 'rm2.V', 'l'], ['lo', 'rm2.T'], ['hi', 'rm2.T'], ['rm2.R', 'out', 'l']]
  }, update);
  var vp = Viewport(host, 'Graph and Front', 720, 360, true);
  var put = readout(host, ['Ground floor plate', 'Widest plate', 'Total floor area']);
  function update() {
    var v = def.values, n = v.n, f = GRAPHS[v.g], i, sc = [], a = 30, h = 4, W = vp.W, gx = 34, gy = 40, gs = vp.narrow ? 140 : 220;
    for (i = 0; i < n; i++) { var t = n > 1 ? i / (n - 1) : 0; sc.push(v.lo + (v.hi - v.lo) * f(t)); }
    vp.fit(0, 1, 0, 1).begin(false);
    // the graph: a Graph Mapper box
    vp.raw('<rect class="pan" x="' + gx + '" y="' + gy + '" width="' + gs + '" height="' + gs + '"/>');
    var gp = []; for (i = 0; i <= 60; i++) { var u = i / 60; gp.push(r2(gx + u * gs) + ' ' + r2(gy + gs - f(u) * gs)); }
    vp.raw('<path class="geo" d="M' + gp.join('L') + '"/>');
    for (i = 0; i < n; i++) { var tt = n > 1 ? i / (n - 1) : 0; vp.raw('<circle class="pt" cx="' + r2(gx + tt * gs) + '" cy="' + r2(gy + gs - f(tt) * gs) + '" r="2.6"/>'); }
    vp.label(gx, gy - 10, 'Graph Mapper, 0 to 1 in and out', 'small', 'start');
    vp.label(gx, gy + gs + 18, 'floor 0', 'small', 'start'); vp.label(gx + gs, gy + gs + 18, 'top floor', 'small', 'end');
    // the tower elevation
    var ex0 = gx + gs + (vp.narrow ? 30 : 70), ew = W - ex0 - 24, eh = vp.H - 70, top = 30, pxm = Math.min(ew / (a * 1.6), eh / (n * h)), cx = ex0 + ew / 2;
    for (i = 0; i < n; i++) {
      var y = top + eh - (i + 1) * h * pxm, half = a * sc[i] / 2 * pxm;
      vp.raw('<rect class="floor" x="' + r2(cx - half) + '" y="' + r2(y) + '" width="' + r2(2 * half) + '" height="' + r2(Math.max(1, h * pxm - 1.5)) + '"/>');
    }
    vp.raw('<line class="g-axx" x1="' + r2(ex0) + '" y1="' + r2(top + eh) + '" x2="' + r2(W - 10) + '" y2="' + r2(top + eh) + '"/>');
    vp.label(ex0, 22, 'Front: a 30 m square plate scaled per floor', 'small', 'start');
    vp.end('A tower of ' + n + ' floors whose plate size follows the ' + v.g + ' graph, from scale ' + v.lo.toFixed(2) + ' to ' + v.hi.toFixed(2) + '.');
    var area = sc.reduce(function (s, k) { return s + Math.pow(a * k, 2); }, 0), mx = Math.max.apply(null, sc);
    put([num(a * sc[0], 1) + ' m square', num(a * mx, 1) + ' m, floor ' + sc.indexOf(mx), Math.round(area).toLocaleString('en-US') + ' m²']);
    def.panel('out', sc.slice(0, 6).map(function (k, j) { return j + '  ' + k.toFixed(3); }).join('\n') + (n > 6 ? '\n...' : ''));
  }
  update();
};

/* ---------- f2: attractor point on a facade ---------- */
SIMS.f2 = function (host) {
  var Wf = 30, Hf = 12;
  var def = buildDef(host, {
    label: 'A facade surface is cut into panels. The distance from each panel centre to an attractor point is remapped to an opening size.',
    cols: [[S('u', 'Columns U', 6, 24, 1, 15), S('vv', 'Rows V', 3, 10, 1, 6), S('ax', 'Point X', 0, 30, 0.5, 21, 1), S('az', 'Point Z', 0, 12, 0.5, 7, 1),
      S('mn', 'Smallest', 0.05, 0.6, 0.05, 0.15, 2), S('mx', 'Largest', 0.3, 0.95, 0.05, 0.85, 2), V('dir', 'Near point', [['big', 'Larger'], ['small', 'Smaller']], 'big'), S('k', 'Panel types', 0, 8, 1, 0)],
      { align: 'flex-start', nodes: [C('dd', 'Divide Domain²', ['I', 'U', 'V'], ['S']), C('it', 'Isotrim', ['S', 'D'], ['S']), C('ar', 'Area', ['G'], ['A', 'C'])] },
      { align: 'center', nodes: [C('ds', 'Distance', ['A', 'B'], ['D'])] },
      { align: 'center', nodes: [C('rm', 'Remap Numbers', ['V', 'S', 'T'], ['R', 'C'])] },
      [C('sc', 'Scale', ['G', 'C', 'F'], ['G', 'X'])]],
    wires: [['u', 'dd.U'], ['vv', 'dd.V'], ['dd.S', 'it.D', 'l'], ['it.S', 'ar.G', 'l'], ['ar.C', 'ds.A', 'l'], ['ax', 'ds.B'], ['az', 'ds.B'], ['ds.D', 'rm.V', 'l'], ['mn', 'rm.T'], ['mx', 'rm.T'], ['rm.R', 'sc.F', 'l'], ['it.S', 'sc.G', 'l'], ['ar.C', 'sc.C', 'l']]
  }, update);
  var vp = Viewport(host, 'Front', 720, 320);
  host.appendChild(div('legend', '<span><i class="lp"></i>opening</span><span><i class="lh"></i>attractor point, drag it</span>'));
  var put = readout(host, ['Panels', 'Different opening sizes', 'Glazed share of the facade']);
  var setting = false;
  vp.drag('.att', function (x, z) {
    if (setting) return; setting = true;
    var sx = host.querySelector('input[aria-label="Point X"]'), sz = host.querySelector('input[aria-label="Point Z"]');
    x = Math.max(0, Math.min(Wf, Math.round(x * 2) / 2)); z = Math.max(0, Math.min(Hf, Math.round(z * 2) / 2));
    sx.value = x; sz.value = z; sx.dispatchEvent(new Event('input')); sz.dispatchEvent(new Event('input'));
    setting = false;
  });
  function update() {
    var v = def.values, pw = Wf / v.u, ph = Hf / v.vv, i, j, ds = [], ctr = [];
    for (i = 0; i < v.u; i++) for (j = 0; j < v.vv; j++) { var cx = (i + 0.5) * pw, cz = (j + 0.5) * ph; ctr.push([cx, cz]); ds.push(Math.hypot(cx - v.ax, cz - v.az)); }
    var dmin = Math.min.apply(null, ds), dmax = Math.max.apply(null, ds), lo = Math.min(v.mn, v.mx), hi = Math.max(v.mn, v.mx), sizes = {}, glazed = 0;
    vp.fit(0, Wf, 0, Hf, { l: 20, r: 20, t: 30, b: 20 }).begin(false);
    ctr.forEach(function (c, k) {
      var t = dmax > dmin ? (ds[k] - dmin) / (dmax - dmin) : 0, f = v.dir === 'big' ? hi - t * (hi - lo) : lo + t * (hi - lo);
      if (v.k > 1) { var q = Math.round((f - lo) / (hi - lo) * (v.k - 1)); f = lo + q * (hi - lo) / (v.k - 1); }
      sizes[f.toFixed(3)] = 1; glazed += f * f;
      vp.raw('<rect class="pan" x="' + vp.X(c[0] - pw / 2) + '" y="' + vp.Z(c[1] + ph / 2) + '" width="' + r2(pw * vp.s) + '" height="' + r2(ph * vp.s) + '"/>');
      vp.raw('<rect class="hole" x="' + vp.X(c[0] - f * pw / 2) + '" y="' + vp.Z(c[1] + f * ph / 2) + '" width="' + r2(f * pw * vp.s) + '" height="' + r2(f * ph * vp.s) + '"/>');
    });
    vp.raw('<circle class="att" cx="' + vp.X(v.ax) + '" cy="' + vp.Z(v.az) + '" r="9"/>');
    vp.end('Facade of ' + ctr.length + ' panels. Openings are ' + (v.dir === 'big' ? 'largest' : 'smallest') + ' near the point at x ' + v.ax + ' m, z ' + v.az + ' m.');
    var nsz = Object.keys(sizes).length;
    put([v.u + ' × ' + v.vv + ' = ' + ctr.length, nsz > 40 ? nsz + ', every panel is different' : String(nsz), Math.round(100 * glazed / ctr.length) + '%']);
  }
  update();
};

/* ---------- f3: twisting tower with an optional diagrid ---------- */
SIMS.f3 = function (host) {
  var def = buildDef(host, {
    label: 'Floor levels feed Graph Mapper, which sets how the total twist is shared between floors. Rotate and Scale shape each plate; Loft or a diagrid wraps them.',
    cols: [[S('n', 'Floors', 10, 40, 1, 30), S('tw', 'Twist, degrees', 0, 180, 5, 90), V('g', 'Graph', GRAPH_OPTS.filter(function (o) { return o[0] !== 'parabola' && o[0] !== 'sine'; }), 'linear'), S('tp', 'Top scale', 0.5, 1.2, 0.05, 0.75, 2), V('sk', 'Skin', [['plates', 'Floor plates'], ['diagrid', 'Diagrid']], 'diagrid')],
      { align: 'flex-start', nodes: [C('se', 'Series', ['S', 'N', 'C'], ['S']), C('gm', 'Graph Mapper', [''], [''])] },
      { align: 'center', nodes: [C('rd', 'Radians', ['D'], ['R']), C('rot', 'Rotate', ['G', 'A', 'P'], ['G', 'X'])] },
      [C('sc', 'Scale', ['G', 'C', 'F'], ['G', 'X']), C('lf', 'Loft', ['C', 'O'], ['L'])]],
    wires: [['n', 'se.C'], ['se.S', 'gm', 'l'], ['g', 'gm'], ['gm', 'rot.A', 'l'], ['tw', 'rd.D'], ['rd.R', 'rot.A'], ['rot.G', 'sc.G', 'l'], ['tp', 'sc.F'], ['sc.G', 'lf.C', 'l']]
  }, update);
  var vp = Viewport(host, 'Perspective', 720, 460, true);
  var put = readout(host, ['Ground floor area', 'Top floor area', 'Rotation between floors', 'Total floor area', 'Diagrid members']);
  var a = 30, h = 4;
  function perim(s, side) { // s in [0,4): point on a square of side 'side' centred at origin
    var k = Math.floor(s) % 4, f = s - Math.floor(s), hs = side / 2;
    return k === 0 ? [-hs + f * side, -hs] : k === 1 ? [hs, -hs + f * side] : k === 2 ? [hs - f * side, hs] : [-hs, hs - f * side];
  }
  function update() {
    var v = def.values, n = v.n, i, f = GRAPHS[v.g], tw = v.tw * Math.PI / 180, ang = [], scl = [];
    for (i = 0; i <= n; i++) { var t = i / n; ang.push(tw * f(t)); scl.push(1 + (v.tp - 1) * t); }
    var P3 = function (i, s) { var p = perim(s, a * scl[i]), c = Math.cos(ang[i]), sn = Math.sin(ang[i]); return iso(p[0] * c - p[1] * sn, p[0] * sn + p[1] * c, i * h); };
    var ext = [iso(-26, -26, 0), iso(26, 26, 0), iso(26, -26, 0), iso(-26, 26, 0), iso(0, 0, n * h)];
    var us = ext.map(function (q) { return q[0]; }), vs = ext.map(function (q) { return q[1]; });
    vp.fit(Math.min.apply(null, us), Math.max.apply(null, us), Math.min.apply(null, vs), Math.max.apply(null, vs), { l: 20, r: 20, t: 24, b: 20 }).begin(false);
    var o0 = iso(0, 0, 0), ox = iso(26, 0, 0), oy = iso(0, 26, 0);
    vp.line(o0[0], o0[1], ox[0], ox[1], 'g-axx'); vp.line(o0[0], o0[1], oy[0], oy[1], 'g-axz');
    var members = 0;
    if (v.sk === 'plates') {
      for (i = 0; i <= n; i++) {
        var pts = [0, 1, 2, 3, 4].map(function (k) { return P3(i, k % 4); });
        vp.poly(pts, i === 0 || i === n ? 'geo' : 'geo-thin');
      }
      for (var c = 0; c < 4; c++) { var col = []; for (i = 0; i <= n; i++) col.push(P3(i, c)); vp.poly(col, 'geo-thin'); }
    } else {
      var m = 16, step = 2, lv = [];
      for (i = 0; i <= n; i += step) lv.push(i);
      if (lv[lv.length - 1] !== n) lv.push(n);
      lv.forEach(function (li, k) { var pts = []; for (var j = 0; j <= m; j++) pts.push(P3(li, 4 * j / m)); vp.poly(pts, 'geo-thin'); });
      for (var k2 = 0; k2 < lv.length - 1; k2++) {
        var off0 = (k2 % 2) * 0.5, off1 = ((k2 + 1) % 2) * 0.5;
        for (var j2 = 0; j2 < m; j2++) {
          var A = P3(lv[k2], 4 * ((j2 + off0) % m) / m), B1 = P3(lv[k2 + 1], 4 * ((j2 + off1) % m) / m), B2 = P3(lv[k2 + 1], 4 * ((j2 + off1 - 1 + m) % m) / m);
          vp.line(A[0], A[1], B1[0], B1[1], 'geo'); vp.line(A[0], A[1], B2[0], B2[1], 'geo'); members += 2;
        }
      }
    }
    vp.end('Perspective of a ' + n + ' floor tower twisting ' + v.tw + ' degrees, top scale ' + v.tp.toFixed(2) + ', shown as ' + (v.sk === 'plates' ? 'floor plates' : 'a diagrid') + '.');
    var area = 0; for (i = 0; i < n; i++) area += Math.pow(a * scl[i], 2);
    var perFloor = n ? (ang[1] - ang[0]) * 180 / Math.PI : 0;
    put([Math.round(a * a).toLocaleString('en-US') + ' m²', Math.round(Math.pow(a * scl[n - 1], 2)).toLocaleString('en-US') + ' m²',
      v.g === 'linear' ? num(v.tw / n, 2) + '° on every floor' : 'varies, ' + num(perFloor, 2) + '° at the base', Math.round(area).toLocaleString('en-US') + ' m²', v.sk === 'diagrid' ? String(members) : 'switch Skin to Diagrid']);
  }
  update();
};

/* ---------- f4: panels on a curved roof, flatness and panel types ---------- */
function planeDeviation(pts) { // max distance of points from their least-squares plane
  var n = pts.length, c = [0, 0, 0], i, j, k;
  pts.forEach(function (p) { c[0] += p[0] / n; c[1] += p[1] / n; c[2] += p[2] / n; });
  var M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  pts.forEach(function (p) { var d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) M[i][j] += d[i] * d[j]; });
  var V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (var sweep = 0; sweep < 30; sweep++) { // Jacobi rotations
    for (var p = 0; p < 2; p++) for (var q = p + 1; q < 3; q++) {
      if (Math.abs(M[p][q]) < 1e-15) continue;
      var th = 0.5 * Math.atan2(2 * M[p][q], M[q][q] - M[p][p]), cs = Math.cos(th), sn = Math.sin(th);
      for (k = 0; k < 3; k++) { var mkp = M[k][p], mkq = M[k][q]; M[k][p] = cs * mkp - sn * mkq; M[k][q] = sn * mkp + cs * mkq; }
      for (k = 0; k < 3; k++) { var mpk = M[p][k], mqk = M[q][k]; M[p][k] = cs * mpk - sn * mqk; M[q][k] = sn * mpk + cs * mqk; }
      for (k = 0; k < 3; k++) { var vkp = V[k][p], vkq = V[k][q]; V[k][p] = cs * vkp - sn * vkq; V[k][q] = sn * vkp + cs * vkq; }
    }
  }
  var e = [M[0][0], M[1][1], M[2][2]], mi = e.indexOf(Math.min.apply(null, e)), nrm = [V[0][mi], V[1][mi], V[2][mi]], dev = 0;
  pts.forEach(function (p) { dev = Math.max(dev, Math.abs((p[0] - c[0]) * nrm[0] + (p[1] - c[1]) * nrm[1] + (p[2] - c[2]) * nrm[2])); });
  return dev;
}
SIMS.f4 = function (host) {
  var Lp = 20;
  var def = buildDef(host, {
    label: 'A roof surface is divided into quad panels. Plane Fit measures how far each panel is from flat.',
    cols: [[V('sf', 'Surface', [['trans', 'Translation dome'], ['sphere', 'Spherical dome'], ['hypar', 'Hypar saddle']], 'sphere'), S('rise', 'Rise', 1, 6, 0.5, 4, 1), S('n', 'Grid', 4, 14, 1, 8), S('tol', 'Tolerance, mm', 2, 50, 1, 10), V('mode', 'Panels', [['quad', 'Quads'], ['tri', 'Triangles']], 'quad')],
      { align: 'flex-start', nodes: [C('dd', 'Divide Domain²', ['I', 'U', 'V'], ['S']), C('it', 'Isotrim', ['S', 'D'], ['S'])] },
      { align: 'center', nodes: [C('dv', 'Deconstruct Brep', ['B'], ['F', 'E', 'V'])] },
      [C('pf', 'Plane Fit', ['P'], ['Pl', 'dx']), P('out', '', { title: 'Deviation, mm' })]],
    wires: [['n', 'dd.U'], ['n', 'dd.V'], ['dd.S', 'it.D', 'l'], ['it.S', 'dv.B', 'l'], ['dv.V', 'pf.P', 't'], ['pf.dx', 'out', 'l']]
  }, update);
  var vp = Viewport(host, 'Perspective', 720, 380, true);
  host.appendChild(div('legend', '<span><i class="lp"></i>stronger colour, further from flat</span><span><i class="ls"></i>over your tolerance</span>'));
  var put = readout(host, ['Panels', 'Largest deviation', 'Panels over tolerance']);
  function zf(sf, rise, x, y) {
    var u = x / Lp, w = y / Lp;
    if (sf === 'trans') return rise / 2 * (1 - Math.pow(2 * u - 1, 2)) + rise / 2 * (1 - Math.pow(2 * w - 1, 2));
    if (sf === 'hypar') return rise * (2 * u - 1) * (2 * w - 1);
    var R = (Lp * Lp / 2 + rise * rise) / (2 * rise); // sphere through the corners, crown at 'rise'
    return Math.sqrt(Math.max(0, R * R - Math.pow(x - Lp / 2, 2) - Math.pow(y - Lp / 2, 2))) - (R - rise);
  }
  function update() {
    var v = def.values, n = v.n, i, j, G = [], quads = [], devmax = 0, over = 0;
    for (i = 0; i <= n; i++) { G.push([]); for (j = 0; j <= n; j++) { var x = Lp * i / n, y = Lp * j / n; G[i].push([x, y, zf(v.sf, v.rise, x, y)]); } }
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
      var q = [G[i][j], G[i + 1][j], G[i + 1][j + 1], G[i][j + 1]];
      var d = v.mode === 'tri' ? 0 : planeDeviation(q) * 1000;
      devmax = Math.max(devmax, d); if (d > v.tol) over++;
      quads.push({ q: q, d: d });
    }
    var all = []; G.forEach(function (r) { r.forEach(function (p) { all.push(iso(p[0], p[1], p[2])); }); });
    var us = all.map(function (q) { return q[0]; }), vs = all.map(function (q) { return q[1]; });
    vp.fit(Math.min.apply(null, us), Math.max.apply(null, us), Math.min.apply(null, vs) - 1, Math.max.apply(null, vs), { l: 20, r: 20, t: 30, b: 20 }).begin(false);
    quads.sort(function (A, B) { return (A.q[0][0] + A.q[0][1]) < (B.q[0][0] + B.q[0][1]) ? 1 : -1; }); // far to near
    quads.forEach(function (Q) {
      var pp = Q.q.map(function (p) { return iso(p[0], p[1], p[2]); }), path = 'M' + pp.map(function (p) { return vp.X(p[0]) + ' ' + vp.Z(p[1]); }).join('L') + 'Z';
      var k = Math.min(1, Q.d / v.tol);
      vp.raw('<path d="' + path + '" style="fill:var(--' + (Q.d > v.tol ? 'warn' : 'preview') + ');fill-opacity:' + (Q.d > v.tol ? 0.85 : r2(0.06 + 0.5 * k)) + ';stroke:var(--preview);stroke-width:1"/>');
      if (v.mode === 'tri') vp.raw('<path class="geo-thin" d="M' + vp.X(pp[0][0]) + ' ' + vp.Z(pp[0][1]) + 'L' + vp.X(pp[2][0]) + ' ' + vp.Z(pp[2][1]) + '"/>');
    });
    vp.end('Perspective of a ' + n + ' by ' + n + ' panel roof. Largest deviation from flat ' + devmax.toFixed(1) + ' mm.');
    put([v.mode === 'tri' ? String(2 * n * n) + ' triangles' : String(n * n) + ' quads', v.mode === 'tri' ? '0 mm, three points are always flat' : num(devmax, 1) + ' mm', String(over)]);
    def.panel('out', v.mode === 'tri' ? 'all 0.0' : quads.slice(0, 4).map(function (Q, k) { return k + '  ' + Q.d.toFixed(1); }).join('\n') + '\n...');
  }
  update();
};

/* ---------- m1: column buckling ---------- */
var KFACT = [['0.5', 'Fixed, fixed  K = 0.5'], ['0.7', 'Fixed, pinned  K = 0.7'], ['1', 'Pinned, pinned  K = 1.0'], ['2', 'Fixed, free  K = 2.0']];
function secOpts(list) { return list.map(function (i) { return [String(i), HSEC[i][0]]; }); }
SIMS.m1 = function (host) {
  var def = buildDef(host, {
    label: 'Section, length, end condition and axial load feed a buckling check that returns slenderness, allowable stress and the ratio.',
    cols: [[V('sec', 'Section', secOpts([2, 3, 4, 6, 7, 8]), '7'), S('L', 'Length L', 2, 12, 0.5, 4, 1), V('k', 'Ends', KFACT, '1'), S('N', 'Load N, kN', 50, 2000, 10, 600)],
      [C('bk', 'Buckling check cluster', ['Sec', 'L', 'K', 'N'], ['λ', 'fc', 'ratio'])]],
    wires: [['sec', 'bk.Sec'], ['L', 'bk.L'], ['k', 'bk.K'], ['N', 'bk.N']]
  }, update);
  var vp = Viewport(host, 'Chart', 720, 320, true);
  host.appendChild(div('legend', '<span><i class="lp"></i>allowable stress fc, long-term</span><span><i class="lt"></i>your column</span><span><i class="ls"></i>column limit λ = 200</span>'));
  var put = readout(host, ['Buckling length', 'λ about the strong axis', 'λ about the weak axis', 'Allowable fc', 'Stress N / A', '検定比 σc / fc']);
  var chk = div('check-line'); host.appendChild(chk);
  function update() {
    var v = def.values, s = HSEC[+v.sec], lk = v.L * parseFloat(v.k), lx = lk * 100 / s[4], ly = lk * 100 / s[5], lam = Math.max(lx, ly);
    var fc = fcAllow(lam), sig = v.N * 10 / s[1], ratio = sig / fc;
    chart(vp, 0, 250, 0, 170, { xlab: 'slenderness λ', ylab: 'fc, N/mm²', xstep: 50, ystep: 40 });
    var cv = []; for (var l = 0; l <= 250; l += 2) cv.push([l, fcAllow(l)]);
    vp.raw('<path class="geo" d="' + curvePath(vp, cv) + '"/>');
    vp.raw('<path class="limit" d="M' + vp.X(200) + ' ' + vp.Z(0) + 'V' + vp.Z(170) + '"/>');
    vp.raw('<path class="ghost" d="M' + vp.X(LAMBDA_CR) + ' ' + vp.Z(0) + 'V' + vp.Z(fcAllow(LAMBDA_CR)) + '"/>');
    vp.text(LAMBDA_CR, fcAllow(LAMBDA_CR), 'Λ = ' + Math.round(LAMBDA_CR), 'small', 'start', 8, -8);
    var lp = Math.min(lam, 250);
    vp.raw('<path class="ten" stroke-width="2" d="M' + vp.X(lp) + ' ' + vp.Z(0) + 'V' + vp.Z(Math.min(170, sig)) + '"/>');
    vp.raw('<circle class="dotBest" cx="' + vp.X(lp) + '" cy="' + vp.Z(Math.min(170, sig)) + '" r="6"/>');
    vp.text(lp, Math.min(170, sig), 'σ = ' + num(sig, 0), 'num tn', lp > 170 ? 'end' : 'start', lp > 170 ? -10 : 10, -6);
    vp.end('Allowable compressive stress against slenderness. Your column has slenderness ' + Math.round(lam) + ', stress ' + Math.round(sig) + ' against an allowable ' + Math.round(fc) + ' newtons per square millimetre.');
    put([num(lk, 2) + ' m', num(lx, 0), num(ly, 0) + (ly >= lx ? ', governs' : ''), num(fc, 1) + ' N/mm²', num(sig, 1) + ' N/mm²', num(ratio, 2) + (lam > 200 ? '  too slender' : ratio <= 1 ? '  OK' : '  over')]);
    chk.innerHTML = '<b>By hand.</b> λ = ' + num(lk * 100, 0) + ' cm / ' + s[5] + ' cm = ' + num(ly, 0) + ' about the weak axis. λ / Λ = ' + num(lam / LAMBDA_CR, 3) +
      (lam <= LAMBDA_CR ? ', so ν = 3/2 + 2/3(λ/Λ)² = ' + num(1.5 + 2 / 3 * Math.pow(lam / LAMBDA_CR, 2), 3) + ' and fc = {1 − 0.4(λ/Λ)²} F / ν = <b>' + num(fc, 1) + ' N/mm²</b>.' : ', past Λ, so fc = 0.277 F / (λ/Λ)² = <b>' + num(fc, 1) + ' N/mm²</b>.') +
      (lam > 200 ? ' The law limits a column to λ = 200, so this column is not allowed at all.' : '');
  }
  update();
};

/* ---------- m2: bending plus axial force ---------- */
SIMS.m2 = function (host) {
  var def = buildDef(host, {
    label: 'A column with axial load and bending moment. The check adds the two stress ratios.',
    cols: [[V('sec', 'Section', secOpts([6, 7, 8, 3, 4]), '7'), S('L', 'Storey height', 2.5, 6, 0.1, 4, 1), S('N', 'Axial N, kN', 0, 1500, 10, 500), S('M', 'Moment M, kN·m', 0, 300, 5, 80), V('lt', 'Load term', [['long', 'Long-term'], ['short', 'Short-term']], 'long')],
      [C('bc', 'Beam-column check cluster', ['Sec', 'L', 'N', 'M', 'T'], ['c', 'b', 'sum'])]],
    wires: [['sec', 'bc.Sec'], ['L', 'bc.L'], ['N', 'bc.N'], ['M', 'bc.M'], ['lt', 'bc.T']]
  }, update);
  var vp = Viewport(host, 'Chart', 720, 320, true);
  var put = readout(host, ['σc = N / A', 'fc', 'σb = M / Z', 'fb', 'σc/fc + σb/fb']);
  var chk = div('check-line'); host.appendChild(chk);
  function update() {
    var v = def.values, s = HSEC[+v.sec], k = v.lt === 'short' ? 1.5 : 1, lam = v.L * 100 / s[5];
    var fc = fcAllow(lam) * k, fb = FT * k, sc = v.N * 10 / s[1], sb = v.M * 1000 / s[3], a = sc / fc, b = sb / fb, sum = a + b;
    chart(vp, 0, 1.4, 0, 1.4, { xlab: 'σb / fb, bending share', ylab: 'σc / fc, axial share', xstep: 0.2, ystep: 0.2, xfmt: function (g) { return g.toFixed(1); }, yfmt: function (g) { return g.toFixed(1); } });
    vp.raw('<path class="fill-ok" d="M' + vp.X(0) + ' ' + vp.Z(0) + 'L' + vp.X(1) + ' ' + vp.Z(0) + 'L' + vp.X(0) + ' ' + vp.Z(1) + 'Z"/>');
    vp.raw('<path class="geo" d="M' + vp.X(1) + ' ' + vp.Z(0) + 'L' + vp.X(0) + ' ' + vp.Z(1) + '"/>');
    vp.text(0.12, 0.88, 'sum = 1', 'small', 'start', 10, -6);
    var px = Math.min(b, 1.4), py = Math.min(a, 1.4);
    vp.raw('<path class="ghost" d="M' + vp.X(0) + ' ' + vp.Z(py) + 'H' + vp.X(px) + 'V' + vp.Z(0) + '"/>');
    vp.raw('<circle class="' + (sum <= 1 ? 'dotBest' : 'dotFail') + '" cx="' + vp.X(px) + '" cy="' + vp.Z(py) + '" r="7"/>');
    vp.end('Interaction chart. Axial share ' + a.toFixed(2) + ', bending share ' + b.toFixed(2) + ', sum ' + sum.toFixed(2) + '.');
    put([num(sc, 1) + ' N/mm²', num(fc, 1) + ' N/mm² (λ = ' + Math.round(lam) + ')', num(sb, 1) + ' N/mm²', num(fb, 1) + ' N/mm²', num(sum, 2) + (sum <= 1 ? '  OK' : '  over')]);
    chk.innerHTML = '<b>By hand.</b> ' + num(sc, 1) + ' / ' + num(fc, 1) + ' + ' + num(sb, 1) + ' / ' + num(fb, 1) + ' = ' + num(a, 2) + ' + ' + num(b, 2) + ' = <b>' + num(sum, 2) + '</b>. ' +
      (v.lt === 'short' ? 'Short-term allowables are 1.5 times the long-term ones. ' : '') + 'Here fb is taken as F / 1.5, which assumes the column cannot buckle sideways under bending. An unbraced member needs a smaller fb.';
  }
  update();
};

/* ---------- m3: load combinations and a check report for a portal frame ---------- */
SIMS.m3 = function (host) {
  var def = buildDef(host, {
    label: 'Span, height, sections, vertical load G and seismic load K feed two analyses. The check cluster combines them and writes the report.',
    cols: [[S('L', 'Span L', 6, 12, 0.5, 9, 1), S('H', 'Height H', 3, 5, 0.1, 4, 1), V('cs', 'Columns', secOpts([6, 7, 8]), '8'), V('bs', 'Beam', secOpts([2, 3, 4, 5]), '5'), S('G', 'Load G, kN/m', 5, 60, 1, 30), S('K', 'Load K, kN', 0, 300, 5, 120)],
      { align: 'center', nodes: [C('aG', 'Analyze, case G', ['Model'], ['Model']), C('aK', 'Analyze, case K', ['Model'], ['Model'])] },
      [C('ck', 'Check cluster', ['G', 'K'], ['Rep']), P('rep', '', { title: 'Check report' })]],
    wires: [['L', 'aG.Model'], ['H', 'aG.Model'], ['cs', 'aG.Model'], ['bs', 'aG.Model'], ['G', 'aG.Model'], ['K', 'aK.Model'], ['aG.Model', 'ck.G'], ['aK.Model', 'ck.K'], ['ck.Rep', 'rep']]
  }, update);
  var vp = Viewport(host, 'Front', 720, 340);
  host.appendChild(div('legend', '<span><i class="lh"></i>member passes</span><span><i class="ls"></i>member over 1.0</span><span><i class="lz"></i>deflected shape for G + K, exaggerated</span>'));
  function ratioOf(N, M, s, lk, k) { // N kN tension +, M kN m
    var A = s[1], fc = fcAllow(lk * 100 / s[5]) * k, ax = N < 0 ? (-N * 10 / A) / fc : (N * 10 / A) / (FT * k);
    return ax + Math.abs(M) * 1000 / s[3] / (FT * k);
  }
  function update() {
    var v = def.values, cs = HSEC[+v.cs], bs = HSEC[+v.bs], Ec = STEEL.E * 1e3;
    var g = analysePortal(v.L, v.H, 0, v.G, true, Ec * cs[1] * 1e-4, Ec * cs[2] * 1e-8, Ec * bs[1] * 1e-4, Ec * bs[2] * 1e-8);
    var q = analysePortal(v.L, v.H, v.K, 0, true, Ec * cs[1] * 1e-4, Ec * cs[2] * 1e-8, Ec * bs[1] * 1e-4, Ec * bs[2] * 1e-8);
    if (!g || !q) return;
    var nc = g.nc, nb = g.nb, groups = [['Left column', 0, nc, cs, v.H], ['Beam', nc, nc + nb, bs, v.L], ['Right column', nc + nb, g.elems.length, cs, v.H]];
    var combos = [['Long-term G', 1, 0, 1], ['Short-term G + K', 1, 1, 1.5], ['Short-term G − K', 1, -1, 1.5]];
    var res = groups.map(function (gr) {
      var worst = combos.map(function (cb) {
        var w = 0;
        for (var e = gr[1]; e < gr[2]; e++) for (var end = 0; end < 2; end++) {
          var N = cb[1] * g.sol.N[e] + cb[2] * q.sol.N[e], M = cb[1] * g.sol.M[e][end] + cb[2] * q.sol.M[e][end];
          w = Math.max(w, ratioOf(N, M, gr[3], gr[4], cb[3]));
        }
        return w;
      });
      return { name: gr[0], r: worst, max: Math.max.apply(null, worst) };
    });
    var drift = Math.abs(q.sway) / v.H, sag = g.dmid / v.L;
    var lines = res.map(function (r) { return pad(r.name, 13) + ' ' + r.r.map(function (x) { return x.toFixed(2); }).join('  ') + '  ' + (r.max <= 1 ? 'OK' : 'NG'); });
    lines.unshift(pad('', 13) + ' long  G+K   G-K');
    lines.push('Drift, K      ' + (drift > 0 ? '1/' + Math.round(1 / drift) : '0') + '  limit 1/200  ' + (drift <= 1 / 200 ? 'OK' : 'NG'));
    lines.push('Beam sag, G   ' + (sag > 0 ? 'L/' + Math.round(1 / sag) : '0') + '  limit L/300  ' + (sag <= 1 / 300 ? 'OK' : 'NG'));
    def.panel('rep', lines.join('\n'));
    def.state('ck', res.some(function (r) { return r.max > 1; }) || drift > 1 / 200 || sag > 1 / 300 ? 'warn' : null);
    // drawing
    vp.fit(-2, 14, -0.6, 6.6, { l: 30, r: 30, t: 30, b: 26 }).begin();
    var nd = g.nodes, ku = 0, i;
    for (i = 0; i < nd.length; i++) ku = Math.max(ku, Math.abs(g.sol.u[3 * i] + q.sol.u[3 * i]), Math.abs(g.sol.u[3 * i + 1] + q.sol.u[3 * i + 1]));
    ku = ku ? 0.08 * Math.min(v.L, v.H) / ku : 0;
    vp.poly(nd.map(function (p, k) { return [p[0] + (g.sol.u[3 * k] + q.sol.u[3 * k]) * ku, p[1] + (g.sol.u[3 * k + 1] + q.sol.u[3 * k + 1]) * ku]; }), 'ghost');
    groups.forEach(function (gr, k) {
      var pts = nd.slice(gr[1], gr[2] + 1);
      vp.poly(pts, res[k].max <= 1 ? 'hot' : 'stray');
      var mid = pts[Math.floor(pts.length / 2)];
      vp.text(mid[0], mid[1], res[k].max.toFixed(2), 'num', k === 0 ? 'end' : k === 2 ? 'start' : 'middle', k === 0 ? -10 : k === 2 ? 10 : 0, k === 1 ? -10 : 4);
    });
    vp.fixedBase(0, 0); vp.fixedBase(v.L, 0);
    if (v.K) vp.arrow(0, v.H, -40, 0);
    for (i = 0; i <= 6; i++) vp.arrow(v.L * i / 6, v.H, 0, -20);
    vp.end('Portal frame with fixed bases. Largest ratios: columns ' + Math.max(res[0].max, res[2].max).toFixed(2) + ', beam ' + res[1].max.toFixed(2) + '. Drift 1/' + (drift ? Math.round(1 / drift) : 0) + '.');
  }
  function pad(s, n) { while (s.length < n) s += ' '; return s; }
  update();
};

/* ---------- design evaluation shared by o1, o2 and p1 ---------- */
var TYPES = ['pratt', 'howe', 'warren'], TYPE_NAMES = { pratt: 'Pratt', howe: 'Howe', warren: 'Warren' };
function evalTruss(L, H, n, type, w, lim) {
  var z = sizeTruss(L, H, n, type, w, lim || 300);
  if (!z || !z.ok) return { fit: 1e5, ok: false, z: z, H: H, n: n, type: type };
  var pen = z.dOk ? 0 : z.kg * 10 * (z.d / z.lim - 1);
  return { fit: z.kg + pen, ok: z.dOk, z: z, H: H, n: n, type: type };
}

/* ---------- o1: Galapagos-style evolutionary search for the lightest truss ---------- */
SIMS.o1 = function (host) {
  var L = 24;
  var def = buildDef(host, {
    label: 'Three genome sliders (depth, panels, type) feed the truss and its sizing. The fitness is the steel weight plus a penalty when the deflection limit is broken.',
    cols: [[S('w', 'Load w, kN/m', 5, 15, 0.5, 9, 1), { t: 's', id: 'gH', n: 'Depth H', min: 1.2, max: 4, step: 0.1, v: 2.4, d: 1, live: false }, { t: 's', id: 'gn', n: 'Panels n', min: 4, max: 12, step: 2, v: 6, live: false }, { t: 's', id: 'gt', n: 'Type', min: 0, max: 2, step: 1, v: 0, live: false }],
      { align: 'center', nodes: [C('tr', 'Truss and sizing cluster', ['w', 'H', 'n', 'T'], ['kg', 'd'])] },
      { align: 'center', nodes: [C('fit', 'Fitness cluster', ['kg', 'd'], ['F'])] },
      [C('gal', 'Galapagos', ['Genome', 'Fitness'], [], { cls: 'sel' })]],
    wires: [['w', 'tr.w'], ['gH', 'tr.H'], ['gn', 'tr.n'], ['gt', 'tr.T'], ['tr.kg', 'fit.kg'], ['tr.d', 'fit.d'], ['fit.F', 'gal.Fitness'], ['gH', 'gal.Genome'], ['gn', 'gal.Genome'], ['gt', 'gal.Genome']]
  }, function () { reset(); });
  var bar = div('gala-bar'); bar.className = 'gbar';
  var go = el('button', { type: 'button', 'class': 'act primary' }, 'Start solver'), again = el('button', { type: 'button', 'class': 'act' }, 'Run again with a new seed'), stat = el('p', { 'class': 'gstat', role: 'status', 'aria-live': 'polite' }, '');
  bar.appendChild(go); bar.appendChild(again); bar.appendChild(stat);
  var wrap = el('div', { 'class': 'gala two' }); host.appendChild(bar); host.appendChild(wrap);
  var left = el('div'), right = el('div'); wrap.appendChild(left); wrap.appendChild(right);
  var vpL = Viewport(left, 'Every design tried', 520, 340, true), vpR = Viewport(right, 'Best fitness per generation', 520, 340, true);
  host.appendChild(div('legend', '<span><i class="lt"></i>a design Galapagos tried</span><span><i class="lh"></i>best so far</span><span><i class="lz"></i>lightest possible weight at each depth, by brute force</span>'));
  var put = readout(host, ['Best design', 'Steel weight, one truss', 'Deflection', 'Member sizes', 'Best of all 435']);
  var seed = 7, timer = null, gen = 0, GENS = 24, POP = 20, pop = [], tried = [], best = null, hist = [], land = null, brute = null;
  var genes = [{ min: 1.2, max: 4, step: 0.1 }, { min: 4, max: 12, step: 2 }, { min: 0, max: 2, step: 1 }];
  function snap(g, x) { return Math.min(g.max, Math.max(g.min, Math.round((x - g.min) / g.step) * g.step + g.min)); }
  function evaluate(gn) { var e = evalTruss(L, r2(gn[0] * 10) / 10, gn[1], TYPES[gn[2]], def.values.w); e.g = gn; return e; }
  function landscape() {
    var w = def.values.w, by = {}, all = [];
    for (var H = 1.2; H <= 4.0001; H += 0.1) for (var n = 4; n <= 12; n += 2) for (var t = 0; t < 3; t++) {
      var e = evalTruss(L, r2(H * 10) / 10, n, TYPES[t], w); all.push(e);
      var k = (r2(H * 10) / 10).toFixed(1); if (e.ok && (!by[k] || e.fit < by[k])) by[k] = e.fit;
    }
    land = Object.keys(by).map(function (k) { return [parseFloat(k), by[k]]; }).sort(function (a, b) { return a[0] - b[0]; });
    brute = all.filter(function (e) { return e.ok; }).sort(function (a, b) { return a.fit - b.fit; })[0];
  }
  function reset() {
    clearInterval(timer); timer = null; gen = 0; pop = []; tried = []; best = null; hist = []; landscape();
    go.textContent = 'Start solver'; stat.textContent = 'Press Start solver. Galapagos will try ' + POP + ' designs per generation for ' + GENS + ' generations.';
    draw();
  }
  function step(R) {
    if (!pop.length) {
      for (var i = 0; i < POP; i++) pop.push(evaluate(genes.map(function (g) { return snap(g, g.min + R() * (g.max - g.min)); })));
    } else {
      pop.sort(function (a, b) { return a.fit - b.fit; });
      var next = pop.slice(0, 3); // elites survive
      var pick = function () { var a = pop[Math.floor(R() * POP)], b = pop[Math.floor(R() * POP)]; return a.fit < b.fit ? a : b; };
      while (next.length < POP) {
        var A = pick(), Bp = pick(), child = genes.map(function (g, k) {
          var x = R() < 0.5 ? A.g[k] : Bp.g[k];
          if (k === 0) x = A.g[0] + (Bp.g[0] - A.g[0]) * R();
          if (R() < 0.25) x += (R() - 0.5) * (g.max - g.min) * 0.4;
          return snap(g, x);
        });
        next.push(evaluate(child));
      }
      pop = next;
    }
    pop.forEach(function (e) { tried.push({ e: e, gen: gen }); if (e.ok && (!best || e.fit < best.fit)) best = e; });
    hist.push(best ? best.fit : null); gen++;
  }
  function draw() {
    var maxKg = 3000, R;
    chart(vpL, 1.2, 4, 0, maxKg, { xlab: 'depth H, m', ylab: 'steel, kg', xstep: 0.4, ystep: 500, xfmt: function (g) { return g.toFixed(1); } });
    if (land) vpL.raw('<path class="ghost" d="' + curvePath(vpL, land.map(function (p) { return [p[0], Math.min(p[1], maxKg)]; })) + '"/>');
    tried.forEach(function (t) { if (t.e.fit <= maxKg) vpL.raw('<circle class="' + (t.e.ok ? 'dotA' : 'dotBad') + '" cx="' + vpL.X(t.e.H) + '" cy="' + vpL.Z(t.e.fit) + '" r="3"/>'); });
    if (best) vpL.raw('<circle class="dotBest" cx="' + vpL.X(best.H) + '" cy="' + vpL.Z(best.fit) + '" r="7"/>');
    vpL.end('Weight against depth for ' + tried.length + ' designs tried.' + (best ? ' Best ' + Math.round(best.fit) + ' kilograms at depth ' + best.H.toFixed(1) + ' metres.' : ''));
    chart(vpR, 0, GENS, 0, maxKg, { xlab: 'generation', ylab: 'best fitness, kg', xstep: 4, ystep: 500 });
    var hp = hist.map(function (h, i) { return [i + 1, Math.min(h || maxKg, maxKg)]; }).filter(function (p) { return p[1] < maxKg; });
    if (hp.length) { vpR.raw('<path class="frontline" d="' + curvePath(vpR, hp) + '"/>'); hp.forEach(function (p) { vpR.raw('<circle class="dotBest" cx="' + vpR.X(p[0]) + '" cy="' + vpR.Z(p[1]) + '" r="3.5"/>'); }); }
    if (brute) { vpR.raw('<path class="limit" d="M' + vpR.X(0) + ' ' + vpR.Z(brute.fit) + 'H' + vpR.X(GENS) + '"/>'); vpR.text(GENS, brute.fit, 'brute force ' + Math.round(brute.fit) + ' kg', 'small', 'end', 0, -8); }
    vpR.end('Best fitness per generation over ' + hist.length + ' generations.');
    var b = best;
    if (b) {
      setSlider('gH', b.H, 1); setSlider('gn', b.n, 0); setSlider('gt', TYPES.indexOf(b.type), 0);
      var pk = b.z.pick;
      put([TYPE_NAMES[b.type] + ', H ' + b.H.toFixed(1) + ' m, ' + b.n + ' panels', Math.round(b.z.kg) + ' kg', num(b.z.d * 1000, 1) + ' mm, limit ' + Math.round(b.z.lim * 1000), 'top ' + pk.top.pipe.name + ', bottom ' + pk.bottom.pipe.name + ', web ' + pk.diagonal.pipe.name + ' and ' + pk.vertical.pipe.name,
        brute ? Math.round(brute.fit).toLocaleString('en-US') + ' kg, ' + TYPE_NAMES[brute.type] + ' ' + brute.H.toFixed(1) + ' m' : '-']);
    } else put(['-', '-', '-', '-', brute ? Math.round(brute.fit).toLocaleString('en-US') + ' kg, ' + TYPE_NAMES[brute.type] + ' ' + brute.H.toFixed(1) + ' m' : '-']);
  }
  function setSlider(id, val, d) {
    var node = host.querySelector('[data-node="' + id + '"]'); if (!node) return;
    var g = id === 'gH' ? genes[0] : id === 'gn' ? genes[1] : genes[2];
    $('.val', node).textContent = val.toFixed(d); $('.track i', node).style.setProperty('--p', ((val - g.min) / (g.max - g.min) * 100) + '%');
    if (id === 'gt') $('.val', node).textContent = ['Pratt', 'Howe', 'Warren'][val];
  }
  function run() {
    if (timer) { clearInterval(timer); timer = null; go.textContent = 'Continue solver'; stat.textContent = 'Paused at generation ' + gen + '.'; return; }
    if (gen >= GENS) reset();
    var R = rng(seed * 7919 + gen);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function tick() {
      step(R); draw();
      stat.textContent = 'Generation ' + gen + ' of ' + GENS + '. Best so far ' + (best ? Math.round(best.fit) + ' kg' : 'none that passes') + '.';
      if (gen >= GENS) { clearInterval(timer); timer = null; go.textContent = 'Start solver'; stat.textContent = 'Finished after ' + GENS + ' generations and ' + tried.length + ' designs. Best ' + (best ? Math.round(best.fit) + ' kg' : 'none') + '.'; }
    }
    if (reduce) { while (gen < GENS) step(R); draw(); tick(); return; }
    go.textContent = 'Pause solver'; timer = setInterval(tick, 160);
  }
  go.addEventListener('click', run);
  again.addEventListener('click', function () { seed++; reset(); run(); });
  reset();
};

/* ---------- o2: trade-offs and the Pareto front ---------- */
SIMS.o2 = function (host) {
  var L = 24;
  var def = buildDef(host, {
    label: 'Every combination of depth, panels and type is evaluated. Two objectives are plotted, and the designs no other design beats on both are marked.',
    cols: [[S('w', 'Load w, kN/m', 5, 15, 0.5, 9, 1), V('ax', 'Compare with', [['H', 'Depth'], ['d', 'Deflection']], 'H'), S('hmax', 'Max depth, m', 1.2, 4, 0.1, 2.4, 1), S('lim', 'Deflection L/', 200, 600, 50, 300)],
      [C('all', 'All designs cluster', ['w'], ['kg', 'H', 'd'])], [C('pf', 'Pareto cluster', ['A', 'B'], ['F'])]],
    wires: [['w', 'all.w'], ['all.kg', 'pf.A', 'l'], ['all.H', 'pf.B', 'l'], ['ax', 'pf.B']]
  }, update);
  var vp = Viewport(host, 'Chart', 720, 360, true);
  host.appendChild(div('legend', '<span><i class="lt"></i>a design</span><span><i class="lh"></i>Pareto front</span><span><i class="ls"></i>your limit</span>'));
  var put = readout(host, ['Designs that pass', 'On the Pareto front', 'Lightest within your limits']);
  var cache = {};
  function all(w) {
    var k = String(w); if (cache[k]) return cache[k];
    var out = [];
    for (var H = 1.2; H <= 4.0001; H += 0.1) for (var n = 4; n <= 12; n += 2) for (var t = 0; t < 3; t++) {
      var z = sizeTruss(L, r2(H * 10) / 10, n, TYPES[t], w, 300);
      if (z && z.ok) out.push({ H: r2(H * 10) / 10, n: n, type: TYPES[t], kg: z.kg, d: z.d * 1000 });
    }
    return (cache[k] = out);
  }
  function update() {
    var v = def.values, ds = all(v.w), byD = v.ax === 'd';
    var pts = ds.map(function (e) { return [e.kg, byD ? e.d : e.H]; }), front = pareto(pts);
    var limY = byD ? L * 1000 / v.lim : v.hmax, ok = ds.filter(function (e) { return e.H <= v.hmax + 1e-9 && e.d <= L * 1000 / v.lim + 1e-9; });
    var best = ok.sort(function (a, b) { return a.kg - b.kg; })[0];
    var ymax = byD ? 160 : 4.2;
    chart(vp, 600, 3000, 0, ymax, { xlab: 'steel in one truss, kg', ylab: byD ? 'deflection, mm' : 'depth, m', xstep: 400, ystep: byD ? 40 : 1 });
    vp.raw('<path class="fill-ok" d="M' + vp.X(600) + ' ' + vp.Z(0) + 'H' + vp.X(3000) + 'V' + vp.Z(Math.min(limY, ymax)) + 'H' + vp.X(600) + 'Z"/>');
    vp.raw('<path class="limit" d="M' + vp.X(600) + ' ' + vp.Z(Math.min(limY, ymax)) + 'H' + vp.X(3000) + '"/>');
    if (byD) vp.raw('<path class="limit" d="M' + vp.X(600) + ' ' + vp.Z(0) + 'H' + vp.X(600) + '"/>');
    ds.forEach(function (e) { var y = byD ? e.d : e.H; if (e.kg <= 3000 && y <= ymax) vp.raw('<circle class="dotA" cx="' + vp.X(e.kg) + '" cy="' + vp.Z(y) + '" r="2.8"/>'); });
    var fp = front.map(function (i) { return pts[i]; }).filter(function (p) { return p[0] <= 3000 && p[1] <= ymax; }).sort(function (a, b) { return a[0] - b[0]; });
    if (fp.length) vp.raw('<path class="frontline" d="' + curvePath(vp, fp) + '"/>');
    fp.forEach(function (p) { vp.raw('<circle class="dotBest" cx="' + vp.X(p[0]) + '" cy="' + vp.Z(p[1]) + '" r="4"/>'); });
    if (best) { var by = byD ? best.d : best.H; vp.raw('<circle class="att" cx="' + vp.X(Math.min(best.kg, 3000)) + '" cy="' + vp.Z(Math.min(by, ymax)) + '" r="8"/>'); }
    vp.end(ds.length + ' designs that pass the member checks. ' + front.length + ' are on the Pareto front.');
    put([String(ds.length) + ' of 435', String(front.length), best ? TYPE_NAMES[best.type] + ', H ' + best.H.toFixed(1) + ' m, ' + best.n + ' panels: ' + Math.round(best.kg) + ' kg, ' + num(best.d, 0) + ' mm' : 'none, relax a limit']);
  }
  update();
};

/* ---------- k1: hanging chain to arch ---------- */
SIMS.k1 = function (host) {
  var Lsp = 20;
  var def = buildDef(host, {
    label: 'A divided line becomes links with a set length. Anchor goals hold the ends, Load goals pull every node down, and the Solver finds the hanging shape.',
    cols: [[S('f', 'Length factor', 1.02, 1.5, 0.01, 1.12, 2), S('N', 'Links', 8, 40, 2, 24), V('mode', 'Load', [['self', 'Self weight'], ['deck', 'Deck load']], 'deck'), B('flip', 'Flip to arch', false)],
      { align: 'center', nodes: [C('ln', 'Length (Line)', ['L', 'Len', 'S'], ['LG']), C('an', 'Anchor', ['P', 'S'], ['A']), C('ld', 'Load', ['P', 'F'], ['L'])] },
      { align: 'center', nodes: [C('sv', 'Solver', ['GO', 'R', 'On'], ['I', 'V', 'O'])] },
      [C('sh', 'Show', [''], [''])]],
    wires: [['f', 'ln.Len'], ['N', 'ln.L'], ['mode', 'ld.F'], ['ln.LG', 'sv.GO'], ['an.A', 'sv.GO'], ['ld.L', 'sv.GO'], ['sv.O', 'sh', 'l']]
  }, function (vals, id) { if (id === 'flip') draw(); else { restart(); run(); } });
  var bar = el('div', { 'class': 'gbar' }), runB = el('button', { type: 'button', 'class': 'act primary' }, 'Run solver'), resetB = el('button', { type: 'button', 'class': 'act' }, 'Reset'), stat = el('p', { 'class': 'gstat', role: 'status', 'aria-live': 'polite' });
  bar.appendChild(runB); bar.appendChild(resetB); bar.appendChild(stat); host.appendChild(bar);
  var vp = Viewport(host, 'Front', 720, 320);
  host.appendChild(div('legend', '<span><i class="lp"></i>found shape</span><span><i class="lz"></i>circular arch of the same rise</span><span><i class="lt"></i>bending moment, when flipped</span>'));
  var put = readout(host, ['Sag or rise', 'Horizontal force H', 'Largest moment, found shape', 'Largest moment, circular arch', 'Solver iterations']);
  var c = null, timer = null, w = 10, sec = HSEC[8], EA = STEEL.E * 1e3 * sec[1] * 1e-4, EI = STEEL.E * 1e3 * sec[2] * 1e-8;
  function restart(settle) { stop(); c = makeChain(Lsp, def.values.N, def.values.f, w, def.values.mode); if (settle) { relaxToRest(c.relax, 1e-6, 20000); stat.textContent = 'At rest after ' + c.relax.iterations() + ' iterations. Press Reset, then Run solver, to watch it hang.'; } else stat.textContent = 'Press Run solver to let the chain hang.'; draw(); }
  function stop() { if (timer) { cancelAnimationFrame(timer); timer = null; } runB.textContent = 'Run solver'; }
  function run() {
    if (timer) { stop(); return; }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { relaxToRest(c.relax, 1e-6, 20000); stat.textContent = 'At rest.'; draw(); return; }
    runB.textContent = 'Pause solver';
    var calm = 0;
    (function frame() {
      var mv = 0; for (var k = 0; k < 60; k++) mv = c.relax.step();
      calm = mv < 1e-6 ? calm + 1 : 0;
      draw();
      if (calm > 3 || c.relax.iterations() > 30000) { stop(); stat.textContent = 'At rest after ' + c.relax.iterations() + ' iterations.'; return; }
      stat.textContent = 'Solving, iteration ' + c.relax.iterations() + '.';
      timer = requestAnimationFrame(frame);
    })();
  }
  function loadsOf(p) { var N = p.length - 1; return p.map(function (q, k) { return def.values.mode === 'deck' ? w * (p[Math.min(k + 1, N)][0] - p[Math.max(k - 1, 0)][0]) / 2 : w * c.l0; }); }
  function draw() {
    var p = c.p, N = p.length - 1, flip = def.values.flip, sag = -Math.min.apply(null, p.map(function (q) { return q[2]; }));
    var shape = p.map(function (q) { return [q[0], flip ? -q[2] : q[2]]; });
    vp.fit(-1, Lsp + 1, -9.5, 9.5, { l: 24, r: 24, t: 24, b: 20 }).begin();
    var mF = null, mC = null, H = 0;
    var atRest = !timer && c.relax.iterations() > 0;
    if (atRest && sag > 0.05) {
      var P = loadsOf(p), arch = analyseArch(p.map(function (q) { return [q[0], -q[2]]; }), P, EA, EI);
      var R = (Lsp * Lsp / 4 + sag * sag) / (2 * sag), al = Math.asin(Math.min(1, Lsp / 2 / R)), circ = [];
      for (var k = 0; k <= N; k++) { var th = -al + 2 * al * k / N; circ.push([Lsp / 2 + R * Math.sin(th), sag - R + R * Math.cos(th)]); }
      var Pc = circ.map(function (q, k) { return def.values.mode === 'deck' ? w * (circ[Math.min(k + 1, N)][0] - circ[Math.max(k - 1, 0)][0]) / 2 : w * c.l0; });
      var ca = analyseArch(circ, Pc, EA, EI);
      if (arch && ca) {
        mF = arch.mmax; mC = ca.mmax; H = arch.H;
        if (flip) {
          vp.poly(circ, 'ghost');
          var km = 2.5 / Math.max(mC, 1e-9), base = [], off = [];
          circ.forEach(function (q, k) { var e = Math.min(k, N - 1), m = k < N ? ca.sol.M[e][0] : ca.sol.M[N - 1][1], inf = ca.sol.info[e]; base.push(q); off.push([q[0] + m * km * inf.s, q[1] - m * km * inf.c]); });
          vp.poly(base.concat(off.reverse()), 'bmd', true);
        }
      }
    }
    vp.poly(shape, 'geo');
    shape.forEach(function (q, k) { if (k > 0 && k < N) vp.dot(q[0], q[1], 'pt', 2.6); });
    vp.pin(0, 0); vp.pin(Lsp, 0);
    vp.end((flip ? 'Arch' : 'Hanging chain') + ' over ' + Lsp + ' metres with ' + N + ' links. ' + (flip ? 'Rise ' : 'Sag ') + sag.toFixed(2) + ' metres.');
    put([num(sag, 2) + ' m', H ? num(H, 1) + ' kN' : 'run the solver', mF != null ? num(mF, 1) + ' kN·m' : '-', mC != null ? num(mC, 1) + ' kN·m' : '-', String(c.relax.iterations())]);
  }
  runB.addEventListener('click', run);
  resetB.addEventListener('click', function () { restart(false); });
  restart(true);
};

/* ---------- k2: hanging net to gridshell ---------- */
SIMS.k2 = function (host) {
  var Lp = 20, q = 1;
  var def = buildDef(host, {
    label: 'A flat grid of links is anchored at its corners or edges and loaded downwards. The Solver lets it hang; flipping it gives a gridshell in compression.',
    cols: [[S('n', 'Grid', 6, 14, 1, 10), S('f', 'Length factor', 1.02, 1.3, 0.01, 1.1, 2), V('an', 'Anchors', [['corners', 'Corners'], ['two', 'Two edges'], ['four', 'Four edges']], 'four'), B('flip', 'Flip to shell', true)],
      { align: 'center', nodes: [C('ln', 'Length (Line)', ['L', 'Len'], ['LG']), C('ac', 'Anchor', ['P'], ['A']), C('ld', 'Load', ['P', 'F'], ['L'])] },
      [C('sv', 'Solver', ['GO', 'R', 'On'], ['I', 'V', 'O'])]],
    wires: [['n', 'ln.L'], ['f', 'ln.Len'], ['an', 'ac.P'], ['ln.LG', 'sv.GO'], ['ac.A', 'sv.GO'], ['ld.L', 'sv.GO']]
  }, function (vals, id) { if (id === 'flip') draw(); else { restart(); run(); } });
  var bar = el('div', { 'class': 'gbar' }), runB = el('button', { type: 'button', 'class': 'act primary' }, 'Run solver'), resetB = el('button', { type: 'button', 'class': 'act' }, 'Reset'), stat = el('p', { 'class': 'gstat', role: 'status', 'aria-live': 'polite' });
  bar.appendChild(runB); bar.appendChild(resetB); bar.appendChild(stat); host.appendChild(bar);
  var vp = Viewport(host, 'Perspective', 720, 380, true);
  host.appendChild(div('legend', '<span><i class="lp"></i>link, thicker when it carries more force</span>'));
  var put = readout(host, ['Rise or sag', 'Largest link force', 'Shell link lengths after solving', 'Solver iterations']);
  var net = null, timer = null;
  function build() {
    var v = def.values, n = v.n, a = Lp / n, p = [], links = [], fixed = [], i, j, id = function (i, j) { return i * (n + 1) + j; };
    for (i = 0; i <= n; i++) for (j = 0; j <= n; j++) {
      p.push([i * a, j * a, 0]);
      var edge = i === 0 || j === 0 || i === n || j === n, corner = (i === 0 || i === n) && (j === 0 || j === n);
      fixed.push(v.an === 'corners' ? corner : v.an === 'two' ? (i === 0 || i === n) : edge);
    }
    for (i = 0; i <= n; i++) for (j = 0; j <= n; j++) { if (i < n) links.push([id(i, j), id(i + 1, j), a * v.f]); if (j < n) links.push([id(i, j), id(i, j + 1), a * v.f]); }
    var P = q * a * a;
    return { n: n, a: a, links: links, fixed: fixed, relax: Relax(p, links, fixed, function () { return [0, 0, -P]; }, { dt: 0.02 * Math.sqrt(a / P), iters: 30 }) };
  }
  function restart(settle) { stop(); net = build(); if (settle) { relaxToRest(net.relax, 1e-5, 8000); stat.textContent = 'At rest after ' + net.relax.iterations() + ' iterations. Press Reset, then Run solver, to watch it hang.'; } else stat.textContent = 'Press Run solver to let the net hang.'; draw(); }
  function stop() { if (timer) { cancelAnimationFrame(timer); timer = null; } runB.textContent = 'Run solver'; }
  function run() {
    if (timer) { stop(); return; }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { relaxToRest(net.relax, 1e-5, 8000); stat.textContent = 'At rest.'; draw(); return; }
    runB.textContent = 'Pause solver'; var calm = 0;
    (function frame() {
      var mv = 0; for (var k = 0; k < 12; k++) mv = net.relax.step();
      calm = mv < 2e-5 ? calm + 1 : 0; draw();
      if (calm > 4 || net.relax.iterations() > 12000) { stop(); stat.textContent = 'At rest after ' + net.relax.iterations() + ' iterations.'; return; }
      stat.textContent = 'Solving, iteration ' + net.relax.iterations() + '.';
      timer = requestAnimationFrame(frame);
    })();
  }
  function draw() {
    var p = net.relax.p, flip = def.values.flip, s = flip ? -1 : 1, F = net.relax.force, fmax = Math.max.apply(null, F.concat([1e-9])), lmin = Infinity, lmax = 0;
    var ext = [iso(0, 0, 0), iso(Lp, Lp, 0), iso(Lp, 0, 0), iso(0, Lp, 0), iso(Lp / 2, Lp / 2, 9), iso(Lp / 2, Lp / 2, -9)];
    var us = ext.map(function (e) { return e[0]; }), vs = ext.map(function (e) { return e[1]; });
    vp.fit(Math.min.apply(null, us), Math.max.apply(null, us), Math.min.apply(null, vs), Math.max.apply(null, vs), { l: 20, r: 20, t: 24, b: 16 }).begin(false);
    var o0 = iso(0, 0, 0), ox = iso(Lp + 2, 0, 0), oy = iso(0, Lp + 2, 0);
    vp.line(o0[0], o0[1], ox[0], ox[1], 'g-axx'); vp.line(o0[0], o0[1], oy[0], oy[1], 'g-axz');
    net.links.forEach(function (lk, k) {
      var A = p[lk[0]], B = p[lk[1]], ia = iso(A[0], A[1], s * A[2]), ib = iso(B[0], B[1], s * B[2]);
      var l = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
      if (!(net.fixed[lk[0]] && net.fixed[lk[1]])) { lmin = Math.min(lmin, l); lmax = Math.max(lmax, l); }
      vp.line(ia[0], ia[1], ib[0], ib[1], flip ? 'com' : 'ten', 0.8 + 3.6 * Math.max(0, F[k]) / fmax);
    });
    var rise = Math.max.apply(null, p.map(function (e) { return Math.abs(e[2]); }));
    vp.end((flip ? 'Gridshell' : 'Hanging net') + ' of ' + net.n + ' by ' + net.n + ' cells over 20 metres, ' + (flip ? 'rise ' : 'sag ') + rise.toFixed(2) + ' metres.');
    put([num(rise, 2) + ' m', net.relax.iterations() ? num(fmax, 1) + ' kN' : '-', num(lmin, 2) + ' to ' + num(lmax, 2) + ' m', String(net.relax.iterations())]);
  }
  runB.addEventListener('click', run); resetB.addEventListener('click', function () { restart(false); });
  restart(true);
};

/* ---------- p1: footbridge truss options ---------- */
SIMS.p1 = function (host) {
  var def = buildDef(host, {
    label: 'Span, depth, panels, truss type and the brief’s load feed the sizing cluster for one of the two main trusses.',
    cols: [[S('L', 'Span L', 20, 40, 1, 30), S('H', 'Depth H', 1.5, 4, 0.1, 2.5, 1), S('n', 'Panels n', 6, 14, 2, 10), V('t', 'Type', [['pratt', 'Pratt'], ['howe', 'Howe'], ['warren', 'Warren']], 'warren'), S('q', 'Load q, kN/m²', 3, 6, 0.5, 5, 1)],
      [C('sz', 'Truss and sizing cluster', ['L', 'H', 'n', 'T', 'w'], ['kg', 'd', 'r'])]],
    wires: [['L', 'sz.L'], ['H', 'sz.H'], ['n', 'sz.n'], ['t', 'sz.T'], ['q', 'sz.w']]
  }, update);
  var vp = Viewport(host, 'Front', 720, 260);
  var put = readout(host, ['Load on one truss', 'Steel, one truss', 'Deflection', 'Brief limit L/500', 'Largest 検定比', 'Member sizes']);
  function update() {
    var v = def.values, w = v.q * 3 / 2, z = sizeTruss(v.L, v.H, v.n, v.t, w, 500);
    vp.fit(0, v.L, 0, v.H, { l: 30, r: 30, t: 40, b: 30 }).begin();
    if (!z) return;
    var t = z.t, big = Math.max.apply(null, z.N.map(Math.abs).concat([1e-9]));
    t.elems.forEach(function (e, m) { var a = t.nodes[e[0]], b = t.nodes[e[1]], f = z.N[m] / big; if (Math.abs(f) < 1e-6) vp.line(a[0], a[1], b[0], b[1], 'zero'); else vp.line(a[0], a[1], b[0], b[1], f > 0 ? 'ten' : 'com', 1.4 + 4 * Math.abs(f)); });
    vp.pin(0, 0); vp.roller(v.L, 0);
    vp.end('Footbridge truss, span ' + v.L + ' metres, depth ' + v.H.toFixed(1) + ' metres, ' + v.n + ' panels, ' + v.t + ' type.');
    if (!z.ok) { put([num(w, 1) + ' kN/m', 'no pipe in the list passes', '-', '-', '-', 'try more depth or more panels']); return; }
    var pk = z.pick;
    put([num(w, 1) + ' kN/m', Math.round(z.kg) + ' kg', num(z.d * 1000, 1) + ' mm', num(z.lim * 1000, 0) + ' mm  ' + (z.dOk ? 'OK' : 'exceeded'), num(z.worst, 2),
      'top ' + pk.top.pipe.name + ', bottom ' + pk.bottom.pipe.name + ', diagonals ' + pk.diagonal.pipe.name + ', verticals ' + pk.vertical.pipe.name]);
  }
  update();
};
