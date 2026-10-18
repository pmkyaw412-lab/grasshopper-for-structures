/* ---------- node shorthands ---------- */
function S(id, n, min, max, step, v, d) { return { t: 's', id: id, n: n, min: min, max: max, step: step, v: v, d: d }; }
function C(id, n, ins, outs, extra) { var o = { t: 'c', id: id, n: n, 'in': ins, out: outs }, k; if (extra) for (k in extra) o[k] = extra[k]; return o; }
function P(id, txt, extra) { var o = { t: 'p', id: id, txt: txt || '' }, k; if (extra) for (k in extra) o[k] = extra[k]; return o; }
function V(id, n, opts, v) { return { t: 'v', id: id, n: n, opts: opts, v: v }; }
function B(id, n, v) { return { t: 'b', id: id, n: n, v: v }; }
function sign(v, d) { return (v > 0 ? '+' : '') + num(v, d == null ? 0 : d); }
function div(cls, html) { var d = el('div', { 'class': cls }); if (html != null) d.innerHTML = html; return d; }

var E_STEEL = 2.05e8; // kN/m2 (205,000 N/mm2)
var SECTIONS = [ // name, A cm2, Ix cm4, Zx cm3 (JIS table values)
  ['H-200×100×5.5×8', 26.67, 1810, 181],
  ['H-250×125×6×9', 36.97, 3960, 317],
  ['H-300×150×6.5×9', 46.78, 7210, 481],
  ['H-350×175×7×11', 62.91, 13500, 771],
  ['H-400×200×8×13', 83.37, 23500, 1170],
  ['H-500×200×10×16', 112.3, 46800, 1870]
];
var SIMS = {};

/* ---------- truss: used by the opening, session 17 and the capstone ---------- */
function trussSim(host, o) {
  var sl = [S('L', 'Span L', 6, 30, 1, o.L || 12), S('H', 'Depth H', 1, 4, 0.1, o.H || 2, 1), S('n', 'Panels n', 4, 10, 2, o.n || 6)];
  var an = ['Ln', 'w'], extra = [];
  if (o.roof) { extra = [S('s', 'Spacing s', 3, 9, 0.5, 6, 1), S('q', 'Load q', 0.5, 4, 0.1, 1.5, 1)]; }
  else extra = [S('w', 'Load w', 5, 40, 1, o.w || 20)];
  if (o.area) { extra.push(S('A', 'Area A', 10, 80, 1, 30)); an = ['Ln', 'w', 'A']; }
  var trussNode = o.types
    ? C('tr', '', ['L', 'H', 'n'], ['Ln'], { opts: [['pratt', 'Pratt truss'], ['howe', 'Howe truss'], ['warren', 'Warren truss']], v: 'pratt', aria: 'Truss type' })
    : C('tr', 'Truss cluster', ['L', 'H', 'n'], ['Ln']);
  var wires = [['L', 'tr.L'], ['H', 'tr.H'], ['n', 'tr.n'], ['tr.Ln', 'an.Ln', 'l']];
  if (o.roof) { wires.push(['s', 'ld.A'], ['q', 'ld.B'], ['ld.R', 'an.w']); } else wires.push(['w', 'an.w']);
  if (o.area) wires.push(['A', 'an.A']);
  var cols = [sl.concat(extra), { align: 'flex-start', nodes: [trussNode] }];
  if (o.roof) cols.push({ align: 'center', nodes: [C('ld', 'Multiplication', ['A', 'B'], ['R'])] });
  cols.push({ align: o.roof ? 'flex-end' : 'center', nodes: [C('an', 'Analyse cluster', an, ['N', 'd'])] });
  var def = buildDef(host, { label: 'Sliders feed a truss cluster and an analysis cluster', cols: cols, wires: wires }, update);
  var vp = Viewport(host, 'Front', 720, o.compact ? 270 : 320);
  var leg = div('legend', '<span><i class="lt"></i>tension</span><span><i class="lc"></i>compression</span><span><i class="lz"></i>zero force</span>');
  host.appendChild(leg);
  var rows = ['Max tension', 'Max compression', 'Deflection at midspan'];
  if (o.area) rows.push('Highest tensile stress');
  if (o.roof) rows.push('Load per truss w', 'Deflection limit L/300', 'Members in one truss');
  var put = readout(host, rows), chk = div('check-line'); host.appendChild(chk);

  function update() {
    var v = def.values, type = o.types ? v.tr : 'pratt', A = o.area ? v.A : 30;
    var w = o.roof ? v.q * v.s : v.w;
    var r = analyseTruss(v.L, v.H, v.n, type, w, E_STEEL * A * 1e-4);
    if (!r) return;
    var t = r.t, N = r.sol.N, big = Math.max(r.maxT, -r.maxC, 1e-9);
    vp.fit(0, v.L, 0, v.H, { l: 46, r: 46, t: 62, b: 40 }).begin();
    t.elems.forEach(function (e, m) {
      var a = t.nodes[e[0]], b = t.nodes[e[1]], f = N[m] / big;
      if (Math.abs(f) < 1e-6) vp.line(a[0], a[1], b[0], b[1], 'zero');
      else vp.line(a[0], a[1], b[0], b[1], f > 0 ? 'ten' : 'com', 1.6 + 5 * Math.abs(f));
    });
    t.nodes.forEach(function (p) { vp.dot(p[0], p[1], 'pt', 3.2); });
    vp.pin(0, 0); vp.roller(v.L, 0);
    for (var i = 0; i <= v.n; i++) vp.arrow(i * t.a, v.H, 0, i === 0 || i === v.n ? -18 : -30);
    if (o.labels && v.n <= (vp.narrow ? 4 : 6)) {
      t.elems.forEach(function (e, m) {
        var a = t.nodes[e[0]], b = t.nodes[e[1]], g = t.grp[m], cls = 'num ' + (N[m] > 1e-6 ? 'tn' : N[m] < -1e-6 ? 'cn' : '');
        var s = Math.abs(N[m]) < 1e-6 ? '0' : sign(N[m]);
        if (vp.narrow && g !== 'top' && g !== 'bottom') return;
        if (g === 'top') vp.text((a[0] + b[0]) / 2, a[1], s, cls, 'middle', 0, -9);
        else if (g === 'bottom') vp.text((a[0] + b[0]) / 2, 0, s, cls, 'middle', 0, 17);
        else if (g === 'vertical') vp.text(a[0], v.H * 0.24, s, cls, 'start', 5, 0);
        else { var right = (b[0] - a[0]) * (b[1] - a[1]) < 0; vp.text((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, s, cls, right ? 'start' : 'end', right ? 13 : -13, -6); }
      });
    }
    vp.end('Front view of a ' + type + ' truss, span ' + v.L + ' m, depth ' + v.H.toFixed(1) + ' m, ' + v.n + ' panels. Maximum tension ' + Math.round(r.maxT) + ' kN, maximum compression ' + Math.round(-r.maxC) + ' kN.');
    var vals = [sign(r.maxT) + ' kN', sign(r.maxC) + ' kN', num(r.dmax * 1000, 1) + ' mm  (L/' + Math.round(v.L / r.dmax) + ')'];
    var stress = r.maxT / A * 10;
    if (o.area) vals.push(num(stress, 0) + ' N/mm²');
    if (o.roof) {
      var lim = v.L / 300 * 1000, members = 4 * v.n + 1;
      vals.push(num(w, 1) + ' kN/m', num(lim, 0) + ' mm  ' + (r.dmax * 1000 <= lim ? 'OK' : 'exceeded'), String(members));
    }
    put(vals);
    var hand = r.M / v.H, msg = '<b>Hand check.</b> M = wL²/8 = ' + num(r.M, 0) + ' kN·m, so the chord force should be near M / H = <b>' + num(hand, 0) + ' kN</b>. The solver gives ' + num(r.chord, 0) + ' kN in the most loaded chord.';
    if (type === 'warren' && Math.abs(r.chord - hand) > 0.5) msg += ' A Warren truss misses it slightly because no single chord member faces the midspan moment.';
    if (o.roof) {
      msg += ' Tension stress is ' + num(stress, 0) + ' N/mm² against a long-term allowable of 156 N/mm² for SN400' + (stress <= 156 ? '.' : ', so the area is too small.');
      msg += ' Compression members also need the buckling check from Session {{n:m1}}.';
      if (4 * v.n + 1 > 20) msg += ' With ' + (4 * v.n + 1) + ' members this is over the 20-beam limit of Karamba’s full-feature trial mode.';
    }
    chk.innerHTML = msg;
  }
  update();
}
SIMS.hero = function (h) { trussSim(h, { compact: true }); };
SIMS.s17 = function (h) { trussSim(h, { types: true, area: true, labels: true, n: 4, H: 3 }); };
SIMS.s21 = function (h) { trussSim(h, { types: true, area: true, roof: true, L: 24, H: 2.4, n: 6 }); };

/* ---------- session 4: a point and a line ---------- */
SIMS.s4 = function (host) {
  var def = buildDef(host, {
    label: 'Two sliders set the X and Z of point B. A line joins A at the origin to B, and Length measures it.',
    cols: [[S('x', 'X', 0, 10, 0.5, 6, 1), S('z', 'Z', 0, 6, 0.5, 3, 1)],
      [C('a', 'Construct Point', ['X', 'Y', 'Z'], ['Pt']), C('b', 'Construct Point', ['X', 'Y', 'Z'], ['Pt'])],
      [C('ln', 'Line', ['A', 'B'], ['L'])], [C('len', 'Length', ['C'], ['L'])], [P('out', '')]],
    wires: [['x', 'b.X'], ['z', 'b.Z'], ['a.Pt', 'ln.A'], ['b.Pt', 'ln.B'], ['ln.L', 'len.C'], ['len.L', 'out']]
  }, update);
  var vp = Viewport(host, 'Front', 720, 300);
  function update() {
    var v = def.values, len = Math.sqrt(v.x * v.x + v.z * v.z);
    vp.fit(-1, 11, -0.6, 6.6, { l: 30, r: 30, t: 34, b: 24 }).begin();
    vp.line(0, 0, v.x, v.z, 'geo'); vp.dot(0, 0); vp.dot(v.x, v.z);
    vp.text(0, 0, 'A (0, 0, 0)', 'num', 'start', 9, 18);
    vp.text(v.x, v.z, 'B (' + v.x.toFixed(1) + ', 0, ' + v.z.toFixed(1) + ')', 'num', v.x > 7 ? 'end' : 'start', v.x > 7 ? -9 : 9, -9);
    vp.end('Front view. A line from the origin to point B at x ' + v.x.toFixed(1) + ', z ' + v.z.toFixed(1) + '. Length ' + len.toFixed(2) + ' m.');
    def.panel('out', len.toFixed(2));
  }
  update();
};

/* ---------- session 5: portal frame geometry ---------- */
SIMS.s5 = function (host) {
  var pt = function (id) { return C(id, 'Construct Point', ['X', 'Y', 'Z'], ['Pt']); };
  var def = buildDef(host, {
    label: 'Span and height sliders feed four points. Polyline joins them, Explode splits it into three members, Length measures each.',
    cols: [[S('L', 'Span L', 4, 12, 0.5, 8, 1), S('H', 'Height H', 2.5, 6, 0.5, 4, 1)],
      [pt('A'), pt('B'), pt('C'), pt('D')], [C('pl', 'Polyline', ['V', 'C'], ['Pl'])], [C('ex', 'Explode', ['C', 'R'], ['S', 'V'])], [C('len', 'Length', ['C'], ['L'])]],
    wires: [['H', 'B.Z'], ['H', 'C.Z'], ['L', 'C.X'], ['L', 'D.X'], ['A.Pt', 'pl.V'], ['B.Pt', 'pl.V'], ['C.Pt', 'pl.V'], ['D.Pt', 'pl.V'], ['pl.Pl', 'ex.C'], ['ex.S', 'len.C', 'l']]
  }, update);
  var vp = Viewport(host, 'Front', 720, 300), put = readout(host, ['Segment 0, left column', 'Segment 1, beam', 'Segment 2, right column', 'Total length']);
  function update() {
    var v = def.values;
    vp.fit(-1.5, 13.5, -0.8, 6.8, { l: 30, r: 30, t: 34, b: 24 }).begin();
    vp.poly([[0, 0], [0, v.H], [v.L, v.H], [v.L, 0]], 'geo');
    [[0, 0, 'A'], [0, v.H, 'B'], [v.L, v.H, 'C'], [v.L, 0, 'D']].forEach(function (p, i) {
      vp.dot(p[0], p[1]); vp.text(p[0], p[1], p[2], 'num', i < 2 ? 'end' : 'start', i < 2 ? -9 : 9, i === 1 || i === 2 ? -6 : 16);
    });
    vp.end('Front view of a portal frame, span ' + v.L.toFixed(1) + ' m, height ' + v.H.toFixed(1) + ' m.');
    put([v.H.toFixed(2) + ' m', v.L.toFixed(2) + ' m', v.H.toFixed(2) + ' m', (v.L + 2 * v.H).toFixed(2) + ' m']);
  }
  update();
};

/* ---------- session 7: Series ---------- */
SIMS.s7 = function (host) {
  var def = buildDef(host, {
    label: 'Start, step and count sliders feed Series. The list of numbers becomes the X of a list of points.',
    cols: [[S('s', 'Start S', 0, 6, 1, 0), S('n', 'Step N', 2, 8, 0.5, 6, 1), S('c', 'Count C', 2, 8, 1, 4)],
      [C('se', 'Series', ['S', 'N', 'C'], ['S'])], [C('pt', 'Construct Point', ['X', 'Y', 'Z'], ['Pt'])], [P('out', '', { title: 'Panel' })]],
    wires: [['s', 'se.S'], ['n', 'se.N'], ['c', 'se.C'], ['se.S', 'pt.X', 'l'], ['pt.Pt', 'out', 'l']]
  }, update);
  var vp = Viewport(host, 'Top', 720, 190);
  function update() {
    var v = def.values, xs = [], i;
    for (i = 0; i < v.c; i++) xs.push(v.s + i * v.n);
    vp.fit(-2, Math.max(30, xs[xs.length - 1]) + 2, -1, 1, { l: 24, r: 24, t: 60, b: 50 }).begin();
    xs.forEach(function (x, k) { vp.dot(x, 0); vp.text(x, 0, String(k), 'num', 'middle', 0, -12); vp.text(x, 0, x.toFixed(1), '', 'middle', 0, 22); });
    vp.end('Top view. ' + v.c + ' points along X at ' + xs.map(function (x) { return x.toFixed(1); }).join(', ') + ' metres.');
    def.panel('out', xs.map(function (x, k) { return k + '  {' + x.toFixed(1) + ', 0.0, 0.0}'; }).join('\n'));
  }
  update();
};

/* ---------- session 8: data matching ---------- */
SIMS.s8 = function (host) {
  var def = buildDef(host, {
    label: 'Two Series of different lengths pass through a matching component before Construct Point.',
    cols: [[S('nx', 'X count', 2, 6, 1, 4), S('ny', 'Y count', 1, 6, 1, 3)],
      [C('sx', 'Series', ['S', 'N', 'C'], ['S']), C('sy', 'Series', ['S', 'N', 'C'], ['S'])],
      [C('m', '', ['A', 'B'], ['A', 'B'], { opts: [['long', 'Longest List'], ['short', 'Shortest List'], ['cross', 'Cross Reference']], v: 'long', aria: 'Matching rule' })],
      [C('pt', 'Construct Point', ['X', 'Y', 'Z'], ['Pt'])]],
    wires: [['nx', 'sx.C'], ['ny', 'sy.C'], ['sx.S', 'm.A', 'l'], ['sy.S', 'm.B', 'l'], ['m.A', 'pt.X', 'l'], ['m.B', 'pt.Y', 'l']]
  }, update);
  var vp = Viewport(host, 'Top', 720, 320), put = readout(host, ['X list', 'Y list', 'Points made']), chk = div('check-line'); host.appendChild(chk);
  function update() {
    var v = def.values, xs = [], ys = [], i, j, pts = [], msg;
    for (i = 0; i < v.nx; i++) xs.push(i * 6);
    for (j = 0; j < v.ny; j++) ys.push(j * 4);
    if (v.m === 'cross') { for (j = 0; j < v.ny; j++) for (i = 0; i < v.nx; i++) pts.push([xs[i], ys[j]]); }
    else {
      var cnt = v.m === 'long' ? Math.max(v.nx, v.ny) : Math.min(v.nx, v.ny);
      for (i = 0; i < cnt; i++) pts.push([xs[Math.min(i, v.nx - 1)], ys[Math.min(i, v.ny - 1)]]);
    }
    vp.fit(0, 30, 0, 20, { l: 40, r: 40, t: 40, b: 36 }).begin();
    for (i = 0; i < v.nx; i++) for (j = 0; j < v.ny; j++) vp.raw('<circle class="ghost" cx="' + vp.X(xs[i]) + '" cy="' + vp.Z(ys[j]) + '" r="5"/>');
    if (v.m !== 'cross' && pts.length > 1) vp.poly(pts, 'geo-soft');
    pts.forEach(function (p, k) { vp.dot(p[0], p[1]); if (v.m !== 'cross') vp.text(p[0], p[1], String(k), 'num', 'start', 8, -8); });
    vp.end('Top view. ' + pts.length + ' points from ' + v.nx + ' X values and ' + v.ny + ' Y values.');
    put([v.nx + ' items', v.ny + ' items', String(pts.length)]);
    if (v.m === 'cross') msg = '<b>Cross Reference</b> pairs every X with every Y: ' + v.nx + ' × ' + v.ny + ' = ' + pts.length + ' points. This is the column grid.';
    else if (v.nx === v.ny) msg = 'Both lists have ' + v.nx + ' items, so every rule pairs them one to one: a diagonal row of points.';
    else if (v.m === 'long') msg = '<b>Longest List</b> is the default. The shorter list runs out after item ' + (Math.min(v.nx, v.ny) - 1) + ', so its last value is reused for the rest. You get ' + pts.length + ' points, and not the grid you wanted.';
    else msg = '<b>Shortest List</b> stops when the shorter list runs out: ' + pts.length + ' points, and the extra items of the longer list are ignored.';
    chk.innerHTML = msg;
  }
  update();
};

/* ---------- session 9: Shift List on truss nodes ---------- */
SIMS.s9 = function (host) {
  var n = 5;
  var def = buildDef(host, {
    label: 'Bottom points go to Line input A. A second list passes through Shift List, then a matching component, into Line input B.',
    cols: [[C('a', 'Bottom pts', [], ['']), V('src', 'B list', [['top', 'Top pts'], ['bot', 'Bottom pts']], 'top'), S('s', 'Shift S', 0, 2, 1, 1), B('w', 'Wrap W', false)],
      { align: 'flex-end', nodes: [C('sh', 'Shift List', ['L', 'S', 'W'], ['L'])] },
      [C('m', '', ['A', 'B'], ['A', 'B'], { opts: [['long', 'Longest List'], ['short', 'Shortest List']], v: 'long', aria: 'Matching rule' })],
      [C('ln', 'Line', ['A', 'B'], ['L'])]],
    wires: [['a.', 'm.A', 'l'], ['src', 'sh.L', 'l'], ['s', 'sh.S'], ['w', 'sh.W'], ['sh.L', 'm.B', 'l'], ['m.A', 'ln.A', 'l'], ['m.B', 'ln.B', 'l']]
  }, update);
  var vp = Viewport(host, 'Front', 720, 300);
  host.appendChild(div('legend', '<span><i class="lp"></i>line you wanted</span><span><i class="ls"></i>stray line</span>'));
  var put = readout(host, ['List A', 'List B after Shift List', 'Lines made']), chk = div('check-line'); host.appendChild(chk);
  function update() {
    var v = def.values, A = [], Bl = [], i, a = 2.4, H = 2.4, zB = v.src === 'top' ? H : 0;
    for (i = 0; i <= n; i++) { A.push(i); Bl.push(i); }
    Bl = v.w ? Bl.slice(v.s).concat(Bl.slice(0, v.s)) : Bl.slice(v.s);
    var cnt = v.m === 'long' ? Math.max(A.length, Bl.length) : Math.min(A.length, Bl.length), good = 0, stray = 0, zero = 0;
    vp.fit(0, n * a, 0, H, { l: 60, r: 60, t: 56, b: 46 }).begin();
    vp.line(0, 0, n * a, 0, 'ghost'); vp.line(0, H, n * a, H, 'ghost');
    for (i = 0; i < cnt; i++) {
      var ia = A[Math.min(i, A.length - 1)], ib = Bl[Math.min(i, Bl.length - 1)], ok = ib === ia + v.s;
      if (ia === ib && v.src === 'bot') { zero++; vp.raw('<circle class="ring" cx="' + vp.X(ia * a) + '" cy="' + vp.Z(0) + '" r="10"/>'); continue; }
      if (ok) good++; else stray++;
      if (v.src === 'bot' && !ok) vp.raw('<path class="stray" d="M' + vp.X(ia * a) + ' ' + vp.Z(0) + 'Q' + vp.X((ia + ib) * a / 2) + ' ' + (vp.Z(0) + 44) + ' ' + vp.X(ib * a) + ' ' + vp.Z(0) + '"/>');
      else vp.line(ia * a, 0, ib * a, zB, ok ? 'geo' : 'stray');
    }
    for (i = 0; i <= n; i++) {
      vp.dot(i * a, 0); vp.text(i * a, 0, String(i), 'num', 'middle', 0, 22);
      vp.dot(i * a, H); vp.text(i * a, H, String(i), 'num', 'middle', 0, -12);
    }
    vp.label(12, vp.Z(H) - 8, 'top', '', 'start'); vp.label(12, vp.Z(0) - 8, 'bottom', '', 'start');
    vp.end('Front view of truss nodes. ' + good + ' intended lines, ' + stray + ' stray lines, ' + zero + ' zero-length lines.');
    put(['0 to ' + n + '  (' + A.length + ' items)', Bl.join(', ') + '  (' + Bl.length + ' items)', String(good + stray) + (zero ? ' + ' + zero + ' invalid' : '')]);
    def.state('ln', zero ? 'warn' : null);
    var msg;
    if (v.s === 0) msg = v.src === 'top' ? 'No shift: item i meets item i, which draws the <b>verticals</b>.' : 'No shift on the same list: every line starts and ends at the same point, so none of them is valid.';
    else if (!stray && !zero) msg = 'Clean. Each bottom node ' + 'i meets node i + ' + v.s + (v.src === 'top' ? ' on the top chord: the <b>diagonals</b>.' : ' on the bottom chord: the <b>chord segments</b>.');
    else if (v.w) msg = '<b>Wrap is on</b>, so the items pushed off the front come back at the end. The last ' + v.s + ' bottom node' + (v.s > 1 ? 's connect' : ' connects') + ' back to the start of the truss. Turn Wrap off.';
    else if (zero) msg = 'List B is ' + v.s + ' short, and <b>Longest List</b> reuses its last item. The last line starts and ends on node ' + n + ', which is a zero-length line, and Line turns orange. Switch to Shortest List.';
    else msg = 'List B is ' + v.s + ' short, and <b>Longest List</b> reuses its last item, which adds ' + stray + ' line' + (stray > 1 ? 's' : '') + ' you did not ask for at the right end. Switch to Shortest List.';
    chk.innerHTML = msg;
  }
  update();
};

/* ---------- session 11: tree operations ---------- */
SIMS.s11 = function (host) {
  var def = buildDef(host, {
    label: 'A tree of points, one branch per floor, passes through a tree operation and into Polyline.',
    cols: [[S('f', 'Floors', 2, 4, 1, 3), S('c', 'Columns', 2, 5, 1, 4)], [C('g', 'Grid pts cluster', ['n', 'm'], ['P'])],
      [C('op', '', ['T'], ['T'], { opts: [['none', 'No change'], ['flat', 'Flatten Tree'], ['graft', 'Graft Tree'], ['flip', 'Flip Matrix']], v: 'none', aria: 'Tree operation' })],
      [C('pl', 'Polyline', ['V', 'C'], ['Pl']), P('pv', '', { title: 'Param Viewer' })]],
    wires: function (v) { var t = v.op === 'flat' ? 'l' : 't'; return [['f', 'g.n'], ['c', 'g.m'], ['g.P', 'op.T', 't'], ['op.T', 'pl.V', t], ['op.T', 'pv', t]]; }
  }, update);
  var vp = Viewport(host, 'Front', 720, 320), chk = div('check-line'); host.appendChild(chk);
  function update() {
    var v = def.values, F = v.f, Cn = v.c, i, j, br = [], lines = [], msg, a = 6, h = 3.5;
    var P0 = function (i, j) { return [j * a, i * h]; };
    if (v.op === 'none') for (i = 0; i < F; i++) { br.push('{' + i + '}  N = ' + Cn); lines.push(Array.from({ length: Cn }, function (_, j) { return P0(i, j); })); }
    else if (v.op === 'flat') { br.push('{0}  N = ' + F * Cn); var all = []; for (i = 0; i < F; i++) for (j = 0; j < Cn; j++) all.push(P0(i, j)); lines.push(all); }
    else if (v.op === 'graft') { for (i = 0; i < F; i++) for (j = 0; j < Cn; j++) if (br.length < 5) br.push('{' + i + ';' + j + '}  N = 1'); br.push('...  ' + F * Cn + ' branches in all'); }
    else for (j = 0; j < Cn; j++) { br.push('{' + j + '}  N = ' + F); lines.push(Array.from({ length: F }, function (_, i) { return P0(i, j); })); }
    vp.fit(0, 24, 0, 10.5, { l: 60, r: 40, t: 40, b: 34 }).begin();
    lines.forEach(function (l) { vp.poly(l, 'geo'); });
    for (i = 0; i < F; i++) for (j = 0; j < Cn; j++) vp.dot(j * a, i * h);
    for (i = 0; i < F; i++) vp.text(0, i * h, 'floor ' + i, '', 'end', -12, -8);
    vp.end('Front view. ' + F * Cn + ' points on ' + F + ' floors. ' + lines.length + ' polylines drawn.');
    def.panel('pv', br.join('\n'));
    def.state('pl', v.op === 'graft' ? 'warn' : null);
    if (v.op === 'none') msg = 'One branch per floor. Polyline runs once per branch, so you get <b>' + F + ' beam lines</b>.';
    else if (v.op === 'flat') msg = '<b>Flatten</b> pours every point into one list. Polyline runs once and zigzags through all ' + F * Cn + ' points. This is the most common tree mistake.';
    else if (v.op === 'graft') msg = '<b>Graft</b> puts every point in its own branch. A polyline needs at least two points, so Polyline has nothing to draw and turns orange.';
    else msg = '<b>Flip Matrix</b> swaps rows and columns: branch {j} now holds point j of every floor. Polyline gives <b>' + Cn + ' column lines</b>.';
    chk.innerHTML = msg;
  }
  update();
};

/* ---------- session 12: frame members by branch ---------- */
SIMS.s12 = function (host) {
  var def = buildDef(host, {
    label: 'Storeys and bays feed a frame cluster with two tree outputs. Tree Branch pulls one branch out.',
    cols: [[S('n', 'Storeys', 1, 6, 1, 3), S('m', 'Bays', 1, 5, 1, 3), V('t', 'Read', [['B', 'Beams B'], ['C', 'Columns C']], 'B'), S('k', 'Branch', 0, 5, 1, 1)],
      { align: 'flex-start', nodes: [C('fr', 'Frame cluster', ['n', 'm'], ['B', 'C'])] },
      { align: 'flex-end', nodes: [C('tb', 'Tree Branch', ['T', 'P'], ['B'])] }],
    wires: function (v) { return [['n', 'fr.n'], ['m', 'fr.m'], ['fr.' + v.t, 'tb.T', 't'], ['k', 'tb.P']]; }
  }, update);
  var vp = Viewport(host, 'Front', 720, 340);
  host.appendChild(div('legend', '<span><i class="lp"></i>all members</span><span><i class="lh"></i>the branch you picked</span>'));
  var put = readout(host, ['Branches in this tree', 'Path picked', 'Items in the branch']), chk = div('check-line'); host.appendChild(chk);
  function update() {
    var v = def.values, n = v.n, m = v.m, a = 6, h = 3.5, i, j;
    var maxK = v.t === 'B' ? n - 1 : m;
    def.limit('k', maxK);
    var k = Math.min(v.k, maxK);
    vp.fit(0, Math.max(18, m * a), 0, Math.max(10.5, n * h), { l: 40, r: 40, t: 34, b: 40 }).begin();
    for (i = 1; i <= n; i++) for (j = 0; j < m; j++) vp.line(j * a, i * h, (j + 1) * a, i * h, 'geo-thin');
    for (j = 0; j <= m; j++) for (i = 0; i < n; i++) vp.line(j * a, i * h, j * a, (i + 1) * h, 'geo-thin');
    if (v.t === 'B') for (j = 0; j < m; j++) vp.line(j * a, (k + 1) * h, (j + 1) * a, (k + 1) * h, 'hot');
    else for (i = 0; i < n; i++) vp.line(k * a, i * h, k * a, (i + 1) * h, 'hot');
    for (j = 0; j <= m; j++) vp.pin(j * a, 0);
    vp.end('Front view of a frame with ' + n + ' storeys and ' + m + ' bays. Branch ' + k + ' of the ' + (v.t === 'B' ? 'beams' : 'columns') + ' tree is highlighted.');
    put([String(v.t === 'B' ? n : m + 1), '{' + k + '}', String(v.t === 'B' ? m : n)]);
    chk.innerHTML = v.t === 'B'
      ? 'Beams are stored <b>by floor</b>: branch {' + k + '} is floor ' + (k + 1) + ' with ' + m + ' beam' + (m > 1 ? 's' : '') + '. That is the shape you need to give each floor its own section.'
      : 'Columns are stored <b>by column line</b>: branch {' + k + '} is grid line ' + (k + 1) + ' with ' + n + ' storey' + (n > 1 ? 's' : '') + '. Flip Matrix would regroup them by storey instead.';
  }
  update();
};

/* ---------- session 13: arc divided into equal lengths ---------- */
SIMS.s13 = function (host) {
  var def = buildDef(host, {
    label: 'Span and rise make three points for Arc 3Pt. Divide Curve cuts the arc into N equal lengths.',
    cols: [[S('L', 'Span L', 20, 40, 1, 30), S('f', 'Rise f', 2, 10, 0.5, 6, 1), S('N', 'Count N', 4, 16, 1, 8)],
      { align: 'flex-start', nodes: [C('p', 'Arch pts cluster', ['L', 'f'], ['A', 'B', 'C'])] },
      { align: 'flex-start', nodes: [C('arc', 'Arc 3Pt', ['A', 'B', 'C'], ['A'])] },
      { align: 'flex-end', nodes: [C('dv', 'Divide Curve', ['C', 'N', 'K'], ['P', 'T', 't'])] }],
    wires: [['L', 'p.L'], ['f', 'p.f'], ['p.A', 'arc.A'], ['p.B', 'arc.B'], ['p.C', 'arc.C'], ['arc.A', 'dv.C'], ['N', 'dv.N']]
  }, update);
  var vp = Viewport(host, 'Front', 720, 300), put = readout(host, ['Arc length', 'Each segment along the arc', 'Hanger spacing on the deck']);
  function update() {
    var v = def.values, L = v.L, f = v.f, R = (L * L / 4 + f * f) / (2 * f), al = Math.asin(Math.min(1, L / 2 / R)), i, pts = [], crv = [];
    for (i = 0; i <= 60; i++) { var th = -al + 2 * al * i / 60; crv.push([L / 2 + R * Math.sin(th), f - R + R * Math.cos(th)]); }
    for (i = 0; i <= v.N; i++) { var t2 = -al + 2 * al * i / v.N; pts.push([L / 2 + R * Math.sin(t2), f - R + R * Math.cos(t2)]); }
    vp.fit(0, 40, 0, 10, { l: 40, r: 40, t: 44, b: 40 }).begin();
    vp.line(0, 0, L, 0, 'geo-thin');
    pts.forEach(function (p, k) { if (k > 0 && k < v.N) vp.line(p[0], p[1], p[0], 0, 'geo-thin'); });
    vp.poly(crv, 'geo');
    pts.forEach(function (p, k) { vp.dot(p[0], p[1]); if (v.N <= 12) vp.text(p[0], p[1], String(k), 'num', 'middle', 0, -11); });
    vp.pin(0, 0); vp.pin(L, 0);
    vp.end('Front view of an arch, span ' + L + ' m, rise ' + f.toFixed(1) + ' m, divided into ' + v.N + ' equal lengths with hangers down to the deck.');
    var dmin = Infinity, dmax = 0;
    for (i = 1; i < pts.length; i++) { var d = pts[i][0] - pts[i - 1][0]; dmin = Math.min(dmin, d); dmax = Math.max(dmax, d); }
    put([(2 * al * R).toFixed(2) + ' m', (2 * al * R / v.N).toFixed(2) + ' m', dmin.toFixed(2) + ' to ' + dmax.toFixed(2) + ' m']);
  }
  update();
};

/* ---------- session 14: copy a truss along Y ---------- */
SIMS.s14 = function (host) {
  var def = buildDef(host, {
    label: 'Series makes a list of distances, Unit Y turns them into vectors, and Move copies the truss lines by each vector.',
    cols: [[C('g', 'Truss lines', [], ['']), S('sp', 'Spacing', 3, 8, 0.5, 6, 1), S('c', 'Count', 2, 6, 1, 4), B('gr', 'Graft T', true)],
      { align: 'flex-end', nodes: [C('se', 'Series', ['S', 'N', 'C'], ['S'])] },
      { align: 'flex-end', nodes: [C('uy', 'Unit Y', ['F'], ['V'])] },
      [C('mv', 'Move', ['G', 'T'], ['G', 'X'])]],
    wires: function (v) { return [['g.', 'mv.G', 'l'], ['sp', 'se.N'], ['c', 'se.C'], ['se.S', 'uy.F', 'l'], ['uy.V', 'mv.T', v.gr ? 't' : 'l']]; }
  }, update);
  var vp = Viewport(host, 'Perspective', 720, 360), put = readout(host, ['Lines in', 'Vectors in', 'Lines out', 'Branches out']), chk = div('check-line'); host.appendChild(chk);
  var tr = makeTruss(12, 2.4, 4, 'pratt');
  function update() {
    var v = def.values, i, j, segs = [], ext = [], Lm = tr.elems.length;
    var add = function (m, y) { var a = tr.nodes[tr.elems[m][0]], b = tr.nodes[tr.elems[m][1]]; segs.push([iso(a[0], y, a[1]), iso(b[0], y, b[1])]); };
    if (v.gr) for (j = 0; j < v.c; j++) for (i = 0; i < Lm; i++) add(i, j * v.sp);
    else for (i = 0; i < Lm; i++) add(i, Math.min(i, v.c - 1) * v.sp);
    var ym = Math.max(20, (v.c - 1) * v.sp);
    [[0, 0, 0], [12, 0, 0], [0, ym, 0], [12, ym, 0], [0, 0, 2.4], [12, ym, 2.4]].forEach(function (p) { ext.push(iso(p[0], p[1], p[2])); });
    var us = ext.map(function (p) { return p[0]; }), vs = ext.map(function (p) { return p[1]; });
    vp.fit(Math.min.apply(null, us), Math.max.apply(null, us), Math.min.apply(null, vs), Math.max.apply(null, vs), { l: 30, r: 30, t: 30, b: 26 }).begin(false);
    for (j = 0; j < v.c; j++) { var p = iso(0, j * v.sp, 0), q = iso(12, j * v.sp, 0); vp.line(p[0], p[1], q[0], q[1], 'g-grid'); }
    var o0 = iso(0, 0, 0), ox = iso(14, 0, 0), oy = iso(0, (v.c - 1) * v.sp + 2, 0);
    vp.line(o0[0], o0[1], ox[0], ox[1], 'g-axx'); vp.line(o0[0], o0[1], oy[0], oy[1], 'g-axz');
    segs.forEach(function (s) { vp.line(s[0][0], s[0][1], s[1][0], s[1][1], 'geo-thin'); });
    vp.end('Perspective view. ' + (v.gr ? v.c + ' complete trusses in a row.' : 'One truss whose members are scattered over ' + v.c + ' positions.'));
    put([String(Lm), String(v.c), String(v.gr ? Lm * v.c : Lm), String(v.gr ? v.c : 1)]);
    chk.innerHTML = v.gr
      ? '<b>Graft on.</b> Each vector sits in its own branch, so the whole list of ' + Lm + ' lines is moved once per vector: ' + v.c + ' trusses, one branch each.'
      : '<b>Graft off.</b> Two plain lists are matched item by item: line 0 with vector 0, line 1 with vector 1, and every line after that with the last vector. The truss is torn apart.';
  }
  update();
};

/* ---------- session 15: barrel roof from a divided surface ---------- */
SIMS.s15 = function (host) {
  var def = buildDef(host, {
    label: 'An arc is extruded along Y into a surface. Divide Surface returns a grid of points to connect.',
    cols: [[S('L', 'Span', 8, 24, 1, 16), S('f', 'Rise', 2, 8, 0.5, 4, 1), S('D', 'Length', 10, 40, 1, 24), S('U', 'U count', 4, 12, 1, 8), S('Vc', 'V count', 2, 10, 1, 6), V('mem', 'Members', [['both', 'U and V lines'], ['u', 'U lines only'], ['v', 'V lines only'], ['dia', 'Diagrid']], 'both')],
      { align: 'flex-start', nodes: [C('ar', 'Arch cluster', ['L', 'f'], ['C']), C('uy', 'Unit Y', ['F'], ['V'])] },
      { align: 'flex-start', nodes: [C('ex', 'Extrude', ['B', 'D'], ['E'])] },
      [C('ds', 'Divide Surface', ['S', 'U', 'V'], ['P', 'N', 'uv'])]],
    wires: [['L', 'ar.L'], ['f', 'ar.f'], ['D', 'uy.F'], ['ar.C', 'ex.B'], ['uy.V', 'ex.D'], ['ex.E', 'ds.S'], ['U', 'ds.U'], ['Vc', 'ds.V']]
  }, update);
  var vp = Viewport(host, 'Perspective', 720, 380), put = readout(host, ['Points', 'Branches', 'Members drawn']);
  function update() {
    var v = def.values, L = v.L, f = v.f, R = (L * L / 4 + f * f) / (2 * f), al = Math.asin(Math.min(1, L / 2 / R)), i, j, G = [], cnt = 0;
    for (i = 0; i <= v.U; i++) { var th = -al + 2 * al * i / v.U, row = []; for (j = 0; j <= v.Vc; j++) row.push(iso(L / 2 + R * Math.sin(th), v.D * j / v.Vc, f - R + R * Math.cos(th))); G.push(row); }
    var ext = [iso(0, 0, 0), iso(24, 0, 0), iso(0, 40, 0), iso(24, 40, 0), iso(12, 0, 8), iso(12, 40, 8)];
    var us = ext.map(function (p) { return p[0]; }), vs = ext.map(function (p) { return p[1]; });
    vp.fit(Math.min.apply(null, us), Math.max.apply(null, us), Math.min.apply(null, vs), Math.max.apply(null, vs), { l: 26, r: 26, t: 30, b: 22 }).begin(false);
    var o0 = iso(0, 0, 0), ox = iso(L + 2, 0, 0), oy = iso(0, v.D + 2, 0);
    vp.line(o0[0], o0[1], ox[0], ox[1], 'g-axx'); vp.line(o0[0], o0[1], oy[0], oy[1], 'g-axz');
    var ln = function (a, b) { vp.line(a[0], a[1], b[0], b[1], 'geo-thin'); cnt++; };
    for (i = 0; i <= v.U; i++) for (j = 0; j <= v.Vc; j++) {
      if ((v.mem === 'both' || v.mem === 'u') && i < v.U) ln(G[i][j], G[i + 1][j]);
      if ((v.mem === 'both' || v.mem === 'v') && j < v.Vc) ln(G[i][j], G[i][j + 1]);
      if (v.mem === 'dia' && i < v.U && j < v.Vc) { ln(G[i][j], G[i + 1][j + 1]); ln(G[i + 1][j], G[i][j + 1]); }
    }
    if ((v.U + 1) * (v.Vc + 1) <= 80) G.forEach(function (row) { row.forEach(function (p) { vp.dot(p[0], p[1], 'pt', 2.4); }); });
    vp.end('Perspective view of a barrel roof, span ' + L + ' m, rise ' + f.toFixed(1) + ' m, length ' + v.D + ' m, with ' + cnt + ' members.');
    put([(v.U + 1) + ' × ' + (v.Vc + 1) + ' = ' + (v.U + 1) * (v.Vc + 1), (v.U + 1) + ', each N = ' + (v.Vc + 1), String(cnt)]);
  }
  update();
};

/* ---------- session 16: one beam, checked by hand ---------- */
SIMS.s16 = function (host) {
  var def = buildDef(host, {
    label: 'Span, section and load feed the beam model. Out come the deflection and the bending moment.',
    cols: [[S('L', 'Span L', 3, 12, 0.5, 6, 1), V('sec', 'Section', SECTIONS.map(function (s, i) { return [String(i), s[0]]; }), '2'), S('w', 'Load w', 2, 40, 1, 10)],
      [C('bm', 'Beam model cluster', ['L', 'Sec', 'w'], ['d', 'M'])]],
    wires: [['L', 'bm.L'], ['sec', 'bm.Sec'], ['w', 'bm.w']]
  }, update);
  var vp = Viewport(host, 'Front', 720, 300, true);
  var put = readout(host, ['EI', 'Deflection 5wL⁴/384EI', 'Span / deflection', 'Moment wL²/8', 'Bending stress M/Z', 'Ratio to 156 N/mm²']), chk = div('check-line'); host.appendChild(chk);
  function update() {
    var v = def.values, s = SECTIONS[+v.sec], L = v.L, w = v.w, EI = E_STEEL * s[2] * 1e-8;
    var d = 5 * w * Math.pow(L, 4) / (384 * EI), M = w * L * L / 8, sig = M * 1e6 / (s[3] * 1e3), i, x;
    vp.fit(0, 1, 0, 1).begin(false);
    var W = vp.W, m0 = vp.narrow ? 30 : 70, X = function (x) { return r2(m0 + (W - 2 * m0) * x / L); }, y0 = 92, yM = 200, defl = [], bmd = ['M' + X(0) + ' ' + yM];
    for (i = 0; i <= 40; i++) {
      x = L * i / 40;
      var yx = w * x * (Math.pow(L, 3) - 2 * L * x * x + Math.pow(x, 3)) / (24 * EI), mx = w * x * (L - x) / 2;
      defl.push((i ? 'L' : 'M') + X(x) + ' ' + r2(y0 + 30 * yx / d));
      bmd.push('L' + X(x) + ' ' + r2(yM + 62 * mx / M));
    }
    for (i = 0; i <= 12; i++) { var ax = m0 + (W - 2 * m0) * i / 12; vp.raw('<path class="ld" d="M' + r2(ax) + ' ' + (y0 - 34) + 'V' + (y0 - 8) + '"/><path class="ldh" d="M' + r2(ax) + ' ' + (y0 - 4) + 'l-3.5 -8h7z"/>'); }
    vp.raw('<path class="ld" d="M' + m0 + ' ' + (y0 - 34) + 'H' + (W - m0) + '"/>');
    vp.raw('<path class="ghost" d="M' + m0 + ' ' + y0 + 'H' + (W - m0) + '"/>');
    vp.raw('<path class="geo" d="' + defl.join('') + '"/>');
    vp.raw('<path class="sup" d="M' + m0 + ' ' + y0 + 'l-9 15h18z"/><path class="sup" d="M' + (W - m0) + ' ' + y0 + 'l-9 13h18zM' + (W - m0 - 11) + ' ' + (y0 + 18) + 'h22"/>');
    vp.raw('<path class="bmd" d="' + bmd.join('') + 'L' + X(L) + ' ' + yM + 'Z"/>');
    vp.label(W / 2, y0 - 44, 'w = ' + w + ' kN/m', '', 'middle');
    vp.label(W / 2, y0 + 54, 'δ = ' + num(d * 1000, 1) + ' mm', 'num', 'middle');
    vp.label(W / 2, yM + 84, 'M = ' + num(M, 1) + ' kN·m', 'num tn', 'middle');
    vp.label(m0, yM - 8, vp.narrow ? 'bending moment, on the tension side' : 'bending moment, drawn on the tension side', '', 'start');
    vp.end('A simply supported beam of ' + L.toFixed(1) + ' m under ' + w + ' kN per metre. Midspan deflection ' + (d * 1000).toFixed(1) + ' mm, maximum moment ' + M.toFixed(1) + ' kN m.');
    put([Math.round(EI).toLocaleString('en-US') + ' kN·m²', num(d * 1000, 1) + ' mm', 'L/' + Math.round(L / d), num(M, 1) + ' kN·m', num(sig, 0) + ' N/mm²', num(sig / 156, 2) + (sig <= 156 ? '  OK' : '  over')]);
    chk.innerHTML = '<b>What Karamba should show.</b> Analyze reports the largest displacement in centimetres, so look for about <b>' + num(d * 100, 2) + ' cm</b>. A few percent of difference is normal, and the note below explains why.';
  }
  update();
};

/* ---------- session 18: portal frame ---------- */
SIMS.s18 = function (host) {
  var def = buildDef(host, {
    label: 'Span, height, lateral load, beam load and base fixity feed the frame model.',
    cols: [[S('L', 'Span L', 4, 12, 0.5, 8, 1), S('H', 'Height H', 3, 6, 0.5, 4, 1), S('P', 'Lateral P', 0, 100, 5, 50), S('w', 'Load w', 0, 40, 1, 0), V('b', 'Bases', [['pin', 'Pinned'], ['fix', 'Fixed']], 'pin')],
      [C('fm', 'Frame model cluster', ['L', 'H', 'P', 'w', 'Supp'], ['M', 'd'])]],
    wires: [['L', 'fm.L'], ['H', 'fm.H'], ['P', 'fm.P'], ['w', 'fm.w'], ['b', 'fm.Supp']]
  }, update);
  var vp = Viewport(host, 'Front', 720, 380);
  host.appendChild(div('legend', '<span><i class="lp"></i>frame</span><span><i class="lt"></i>bending moment, on the tension side</span><span><i class="lz"></i>deflected shape, exaggerated</span>'));
  var put = readout(host, ['Sway at beam level', 'Storey drift angle', 'Column top moment', 'Column base moment', 'Beam midspan moment', 'Vertical reactions']), chk = div('check-line'); host.appendChild(chk);
  var sec = SECTIONS[4];
  function update() {
    var v = def.values, L = v.L, H = v.H, fixed = v.b === 'fix';
    var r = analysePortal(L, H, v.P, v.w, fixed, E_STEEL * sec[1] * 1e-4, E_STEEL * sec[2] * 1e-8);
    if (!r) return;
    var nd = r.nodes, M = r.sol.M, u = r.sol.u, info = r.sol.info, i, maxM = 1e-9, maxU = 1e-9;
    M.forEach(function (m) { maxM = Math.max(maxM, Math.abs(m[0]), Math.abs(m[1])); });
    for (i = 0; i < nd.length; i++) maxU = Math.max(maxU, Math.abs(u[3 * i]), Math.abs(u[3 * i + 1]));
    var km = 0.24 * Math.min(L, H) / maxM, ku = 0.1 * Math.min(L, H) / maxU;
    vp.fit(-2, 14, -0.6, 7.6, { l: 30, r: 30, t: 30, b: 30 }).begin();
    var groups = [[0, r.nc], [r.nc, r.nc + r.nb], [r.nc + r.nb, nd.length - 1]];
    if (v.P || v.w) groups.forEach(function (g) {
      var base = [], off = [], e;
      for (e = g[0]; e < g[1]; e++) {
        var a = nd[e], m = M[e][0];
        base.push(a); off.push([a[0] + m * km * info[e].s, a[1] - m * km * info[e].c]);
        if (e === g[1] - 1) { var b = nd[e + 1], m2 = M[e][1]; base.push(b); off.push([b[0] + m2 * km * info[e].s, b[1] - m2 * km * info[e].c]); }
      }
      vp.poly(base.concat(off.reverse()), 'bmd', true);
    });
    if (v.P || v.w) vp.poly(nd.map(function (p, k) { return [p[0] + u[3 * k] * ku, p[1] + u[3 * k + 1] * ku]; }), 'ghost');
    vp.poly(nd, 'geo');
    if (fixed) { vp.fixedBase(0, 0); vp.fixedBase(L, 0); } else { vp.pin(0, 0); vp.pin(L, 0); }
    if (v.P) { vp.arrow(0, H, -40, 0); vp.text(0, H, 'P', 'num', 'end', -46, 4); }
    if (v.P || v.w) vp.text(0, H, num(Math.abs(r.Mtop), 0) + ' kN·m', 'num tn', 'end', -10, 26);
    if (v.w) { for (i = 0; i <= 8; i++) vp.arrow(L * i / 8, H, 0, -22); vp.text(L / 2, H, 'w', 'num', 'middle', 0, -28); }
    vp.end('Front view of a portal frame, span ' + L + ' m, height ' + H + ' m, bases ' + (fixed ? 'fixed' : 'pinned') + '. Column top moment ' + Math.abs(r.Mtop).toFixed(0) + ' kN m.');
    put([num(r.sway * 1000, 1) + ' mm', Math.abs(r.sway) > 1e-7 ? '1/' + Math.round(H / Math.abs(r.sway)) : '0', num(Math.abs(r.Mtop), 1) + ' kN·m', num(Math.abs(r.Mbase), 1) + ' kN·m', num(Math.abs(r.Mmid), 1) + ' kN·m', num(r.Rz[0], 1) + ' and ' + num(r.Rz[1], 1) + ' kN']);
    var msg = '<b>Check 1.</b> The horizontal reactions must add up to P: ' + num(-(r.Rx[0] + r.Rx[1]), 1) + ' kN against ' + num(v.P, 1) + ' kN. ';
    if (!fixed && v.w === 0 && v.P > 0) msg += '<b>Check 2.</b> With pinned bases and no beam load each column takes P/2, so the column-top moment is P·H/2 = <b>' + num(v.P * H / 2, 1) + ' kN·m</b>. The solver gives ' + num(Math.abs(r.Mtop), 1) + '. The small gap is the beam shortening under its axial force, which the hand formula ignores.';
    else if (fixed && v.w === 0 && v.P > 0) msg += '<b>Check 2.</b> With fixed bases the column shear is still close to P/2, so top moment plus base moment is about P·H/2 = ' + num(v.P * H / 2, 1) + ' kN·m. The solver gives ' + num(Math.abs(r.Mtop) + Math.abs(r.Mbase), 1) + '.';
    else msg += 'Set the beam load to 0 to test the P·H/2 rule for the columns.';
    chk.innerHTML = msg;
  }
  update();
};
