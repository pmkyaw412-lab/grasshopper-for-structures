/* ---------- Structural solvers (units: m, kN, kN/m2, m4) ---------- */
function gaussSolve(A, b) {
  var n = b.length, i, j, k, p, t, f;
  A = A.map(function (r) { return r.slice(); }); b = b.slice();
  for (k = 0; k < n; k++) {
    p = k;
    for (i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
    if (Math.abs(A[p][k]) < 1e-9) return null;
    if (p !== k) { t = A[k]; A[k] = A[p]; A[p] = t; t = b[k]; b[k] = b[p]; b[p] = t; }
    for (i = k + 1; i < n; i++) {
      f = A[i][k] / A[k][k];
      if (f === 0) continue;
      for (j = k; j < n; j++) A[i][j] -= f * A[k][j];
      b[i] -= f * b[k];
    }
  }
  var x = new Array(n);
  for (i = n - 1; i >= 0; i--) {
    t = b[i];
    for (j = i + 1; j < n; j++) t -= A[i][j] * x[j];
    x[i] = t / A[i][i];
  }
  return x;
}

function zeros(n, m) {
  var a = [], i, j;
  for (i = 0; i < n; i++) { a.push([]); for (j = 0; j < m; j++) a[i].push(0); }
  return a;
}

function solveReduced(K, F, fixed) {
  var n = F.length, free = [], i, j;
  for (i = 0; i < n; i++) if (!fixed[i]) free.push(i);
  var Kf = zeros(free.length, free.length), Ff = [];
  for (i = 0; i < free.length; i++) {
    Ff.push(F[free[i]]);
    for (j = 0; j < free.length; j++) Kf[i][j] = K[free[i]][free[j]];
  }
  var uf = gaussSolve(Kf, Ff);
  if (!uf) return null;
  var u = new Array(n).fill(0);
  for (i = 0; i < free.length; i++) u[free[i]] = uf[i];
  var R = new Array(n).fill(0);
  for (i = 0; i < n; i++) if (fixed[i]) {
    var s = -F[i];
    for (j = 0; j < n; j++) s += K[i][j] * u[j];
    R[i] = s;
  }
  return { u: u, R: R };
}

/* Pin-jointed 2D truss. nodes [[x,z]], elems [[i,j]], EA in kN,
   fixed {dof:true} with dof = 2*node (x) or 2*node+1 (z), loads [[node, Fx, Fz]] */
function solveTruss(nodes, elems, EA, fixed, loads) {
  var n = nodes.length * 2, K = zeros(n, n), F = new Array(n).fill(0);
  var geo = elems.map(function (e) {
    var dx = nodes[e[1]][0] - nodes[e[0]][0], dz = nodes[e[1]][1] - nodes[e[0]][1];
    var L = Math.sqrt(dx * dx + dz * dz);
    return { L: L, c: dx / L, s: dz / L };
  });
  var ea = function (m) { return Array.isArray(EA) ? EA[m] : EA; };
  elems.forEach(function (e, m) {
    var g = geo[m], k = ea(m) / g.L, v = [-g.c, -g.s, g.c, g.s];
    var d = [2 * e[0], 2 * e[0] + 1, 2 * e[1], 2 * e[1] + 1], a, b;
    for (a = 0; a < 4; a++) for (b = 0; b < 4; b++) K[d[a]][d[b]] += k * v[a] * v[b];
  });
  loads.forEach(function (l) { F[2 * l[0]] += l[1]; F[2 * l[0] + 1] += l[2]; });
  var sol = solveReduced(K, F, fixed);
  if (!sol) return null;
  var u = sol.u;
  var N = elems.map(function (e, m) {
    var g = geo[m];
    return ea(m) / g.L * ((u[2 * e[1]] - u[2 * e[0]]) * g.c + (u[2 * e[1] + 1] - u[2 * e[0] + 1]) * g.s);
  });
  return { u: u, N: N, R: sol.R, geo: geo };
}

/* Parallel-chord truss. type: 'pratt' | 'howe' | 'warren'. n = panels (even).
   Returns nodes (bottom 0..n, top n+1..2n+1), elems, and a group label per element. */
function makeTruss(L, H, n, type) {
  var nodes = [], elems = [], grp = [], i, a = L / n, half = n / 2;
  for (i = 0; i <= n; i++) nodes.push([i * a, 0]);
  for (i = 0; i <= n; i++) nodes.push([i * a, H]);
  var B = function (k) { return k; }, T = function (k) { return n + 1 + k; };
  for (i = 0; i < n; i++) { elems.push([B(i), B(i + 1)]); grp.push('bottom'); }
  for (i = 0; i < n; i++) { elems.push([T(i), T(i + 1)]); grp.push('top'); }
  for (i = 0; i <= n; i++) { elems.push([B(i), T(i)]); grp.push('vertical'); }
  for (i = 0; i < n; i++) {
    var down; // true: diagonal runs from top-left to bottom-right of the panel
    if (type === 'warren') down = i % 2 === 0;
    else if (type === 'howe') down = i >= half;
    else down = i < half;
    elems.push(down ? [T(i), B(i + 1)] : [B(i), T(i + 1)]);
    grp.push('diagonal');
  }
  return { nodes: nodes, elems: elems, grp: grp, n: n, a: a };
}

/* Uniform load w (kN/m, downward) carried to the top chord nodes. */
function analyseTruss(L, H, n, type, w, EA) {
  var t = makeTruss(L, H, n, type), loads = [], i, P = w * L / n;
  for (i = 0; i <= n; i++) loads.push([n + 1 + i, 0, -(i === 0 || i === n ? P / 2 : P)]);
  var fixed = {}; fixed[0] = true; fixed[1] = true; fixed[2 * n + 1] = true;
  var sol = solveTruss(t.nodes, t.elems, EA, fixed, loads);
  if (!sol) return null;
  var maxT = 0, maxC = 0, dmax = 0, chord = 0;
  sol.N.forEach(function (v, m) {
    if (v > maxT) maxT = v;
    if (v < maxC) maxC = v;
    if (t.grp[m] === 'top' || t.grp[m] === 'bottom') chord = Math.max(chord, Math.abs(v));
  });
  for (i = 0; i < t.nodes.length; i++) dmax = Math.max(dmax, -sol.u[2 * i + 1]);
  return { t: t, sol: sol, P: P, maxT: maxT, maxC: maxC, dmax: dmax, chord: chord, M: w * L * L / 8 };
}

/* 2D frame, 3 dof per node (ux, uz, ry). nodes [[x,z]], elems [{i,j,EA,EI,w}]
   w = uniform load in kN/m acting in global -z on the element (horizontal members only).
   fixed {dof:true}, loads [[node, Fx, Fz, My]] */
function solveFrame(nodes, elems, fixed, loads) {
  var n = nodes.length * 3, K = zeros(n, n), F = new Array(n).fill(0), info = [];
  elems.forEach(function (e) {
    var dx = nodes[e.j][0] - nodes[e.i][0], dz = nodes[e.j][1] - nodes[e.i][1];
    var L = Math.sqrt(dx * dx + dz * dz), c = dx / L, s = dz / L;
    var a = e.EA / L, b = 12 * e.EI / (L * L * L), d = 6 * e.EI / (L * L), f = 4 * e.EI / L, g = 2 * e.EI / L;
    var kl = [
      [a, 0, 0, -a, 0, 0],
      [0, b, d, 0, -b, d],
      [0, d, f, 0, -d, g],
      [-a, 0, 0, a, 0, 0],
      [0, -b, -d, 0, b, -d],
      [0, d, g, 0, -d, f]
    ];
    var T = [
      [c, s, 0, 0, 0, 0], [-s, c, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0],
      [0, 0, 0, c, s, 0], [0, 0, 0, -s, c, 0], [0, 0, 0, 0, 0, 1]
    ];
    var p, q, r, kT = zeros(6, 6), kg = zeros(6, 6);
    for (p = 0; p < 6; p++) for (q = 0; q < 6; q++) for (r = 0; r < 6; r++) kT[p][q] += kl[p][r] * T[r][q];
    for (p = 0; p < 6; p++) for (q = 0; q < 6; q++) for (r = 0; r < 6; r++) kg[p][q] += T[r][p] * kT[r][q];
    var dof = [3 * e.i, 3 * e.i + 1, 3 * e.i + 2, 3 * e.j, 3 * e.j + 1, 3 * e.j + 2];
    for (p = 0; p < 6; p++) for (q = 0; q < 6; q++) K[dof[p]][dof[q]] += kg[p][q];
    var fe = [0, 0, 0, 0, 0, 0]; // equivalent nodal loads in local axes
    if (e.w) {
      // load is global -z; valid here for horizontal members (local y = global z)
      fe = [0, -e.w * L / 2, -e.w * L * L / 12, 0, -e.w * L / 2, e.w * L * L / 12];
      for (p = 0; p < 6; p++) for (r = 0; r < 6; r++) F[dof[p]] += T[r][p] * fe[r];
    }
    info.push({ L: L, c: c, s: s, kl: kl, T: T, dof: dof, fe: fe });
  });
  loads.forEach(function (l) { F[3 * l[0]] += l[1]; F[3 * l[0] + 1] += l[2]; F[3 * l[0] + 2] += (l[3] || 0); });
  var sol = solveReduced(K, F, fixed);
  if (!sol) return null;
  var u = sol.u;
  // end forces in local axes: [N1, V1, M1, N2, V2, M2] acting on the element ends
  var ends = info.map(function (m) {
    var ul = [0, 0, 0, 0, 0, 0], p, r, out = [0, 0, 0, 0, 0, 0];
    for (p = 0; p < 6; p++) for (r = 0; r < 6; r++) ul[p] += m.T[p][r] * u[m.dof[r]];
    for (p = 0; p < 6; p++) { for (r = 0; r < 6; r++) out[p] += m.kl[p][r] * ul[r]; out[p] -= m.fe[p]; }
    return out;
  });
  // internal moment, sagging positive: start = -M1, end = +M2. Axial, tension positive = N2.
  var M = ends.map(function (f) { return [-f[2], f[5]]; });
  var N = ends.map(function (f) { return f[3]; });
  return { u: u, R: sol.R, M: M, N: N, info: info };
}

/* Portal frame: bases at (0,0) and (L,0), beam at height H.
   P = lateral load at the top-left node (kN, +x), w = load on the beam (kN/m, down). */
function analysePortal(L, H, P, w, fixedBase, EA, EI, EAb, EIb) {
  var nc = 6, nb = 8, nodes = [], elems = [], i;
  for (i = 0; i <= nc; i++) nodes.push([0, H * i / nc]);            // left column 0..nc
  for (i = 1; i <= nb; i++) nodes.push([L * i / nb, H]);            // beam nc+1..nc+nb
  for (i = nc - 1; i >= 0; i--) nodes.push([L, H * i / nc]);        // right column, top to base
  for (i = 0; i < nodes.length - 1; i++) {
    var onBeam = i >= nc && i < nc + nb;
    elems.push({ i: i, j: i + 1, EA: onBeam && EAb ? EAb : EA, EI: onBeam && EIb ? EIb : EI, w: onBeam ? w : 0 });
  }
  var last = nodes.length - 1, fixed = {};
  fixed[0] = fixed[1] = true; fixed[3 * last] = fixed[3 * last + 1] = true;
  if (fixedBase) { fixed[2] = true; fixed[3 * last + 2] = true; }
  var sol = solveFrame(nodes, elems, fixed, [[nc, P, 0, 0]]);
  if (!sol) return null;
  return {
    nodes: nodes, elems: elems, sol: sol, nc: nc, nb: nb,
    sway: (sol.u[3 * nc] + sol.u[3 * (nc + nb)]) / 2,
    Mtop: sol.M[nc - 1][1],          // left column, top end
    Mbase: sol.M[0][0],              // left column, base
    Mmid: sol.M[nc + nb / 2 - 1][1], // beam midspan
    dmid: -(sol.u[3 * (nc + nb / 2) + 1] - (sol.u[3 * nc + 1] + sol.u[3 * (nc + nb) + 1]) / 2), // beam midspan sag relative to its ends
    Rx: [sol.R[0], sol.R[3 * last]], Rz: [sol.R[1], sol.R[3 * last + 1]]
  };
}

/* ---------- steel design (Japanese allowable stress design) ---------- */
var STEEL = { F: 235, E: 205000, rho: 7850 }; // N/mm2, N/mm2, kg/m3
var LAMBDA_CR = Math.sqrt(Math.PI * Math.PI * STEEL.E / (0.6 * STEEL.F)); // critical slenderness, about 120
/* long-term allowable compressive stress fc (N/mm2) for slenderness lam */
function fcAllow(lam, F, E) {
  F = F || STEEL.F; E = E || STEEL.E;
  var Lc = Math.sqrt(Math.PI * Math.PI * E / (0.6 * F)), r = lam / Lc;
  if (r <= 1) return (1 - 0.4 * r * r) * F / (1.5 + (2 / 3) * r * r);
  return 0.277 * F / (r * r);
}
/* circular hollow section from outside diameter and thickness (mm): A cm2, I cm4, i cm, kg/m */
function pipe(D, t) {
  var d = D - 2 * t, A = Math.PI * (D * D - d * d) / 4, I = Math.PI * (Math.pow(D, 4) - Math.pow(d, 4)) / 64;
  return { name: 'φ-' + D + '×' + t, D: D, t: t, A: A / 100, I: I / 1e4, i: Math.sqrt(I / A) / 10, kg: A * 1e-6 * STEEL.rho };
}
var PIPES = [[60.5, 3.2], [76.3, 3.2], [89.1, 3.2], [101.6, 4.0], [114.3, 4.5], [139.8, 4.5], [165.2, 5.0], [190.7, 5.3], [216.3, 5.8], [267.4, 6.6], [318.5, 6.9]]
  .map(function (p) { return pipe(p[0], p[1]); });

/* Size a parallel-chord truss with pipes, one size per member group.
   Tension: N/A <= F/1.5. Compression: N/A <= fc(lambda), buckling length = member length
   (purlins brace the top chord at every node). Every member: lambda <= 250. */
function sizeTruss(L, H, n, type, w, limitRatio) {
  var r = analyseTruss(L, H, n, type, w, 1e6);
  if (!r) return null;
  var t = r.t, N = r.sol.N, groups = ['top', 'bottom', 'vertical', 'diagonal'], pick = {}, ok = true;
  groups.forEach(function (g) {
    var members = [];
    t.elems.forEach(function (e, m) { if (t.grp[m] === g) members.push({ L: r.sol.geo[m].L, N: N[m] }); });
    var chosen = null, ratio = 0;
    for (var k = 0; k < PIPES.length && !chosen; k++) {
      var pp = PIPES[k], worst = 0, fine = true;
      members.forEach(function (mb) {
        var lam = mb.L * 100 / pp.i, sig = Math.abs(mb.N) * 10 / pp.A, rr;
        if (lam > 250) { fine = false; return; }
        rr = mb.N >= 0 ? sig / (STEEL.F / 1.5) : sig / fcAllow(lam);
        if (rr > 1) fine = false; else worst = Math.max(worst, rr);
      });
      if (fine) { chosen = pp; ratio = worst; }
    }
    if (!chosen) ok = false;
    pick[g] = { pipe: chosen, ratio: ratio, count: members.length };
  });
  if (!ok) return { ok: false, t: t, N: N, pick: pick };
  var EA = t.elems.map(function (e, m) { return STEEL.E * 1e3 * pick[t.grp[m]].pipe.A * 1e-4; }); // kN
  var fixed = {}; fixed[0] = true; fixed[1] = true; fixed[2 * n + 1] = true;
  var loads = [], P = w * L / n, i;
  for (i = 0; i <= n; i++) loads.push([n + 1 + i, 0, -(i === 0 || i === n ? P / 2 : P)]);
  var sol = solveTruss(t.nodes, t.elems, EA, fixed, loads), dmax = 0, kg = 0;
  for (i = 0; i < t.nodes.length; i++) dmax = Math.max(dmax, -sol.u[2 * i + 1]);
  t.elems.forEach(function (e, m) { kg += pick[t.grp[m]].pipe.kg * sol.geo[m].L; });
  var lim = L / (limitRatio || 300);
  return { ok: true, t: t, N: N, pick: pick, kg: kg, d: dmax, dOk: dmax <= lim, lim: lim, u: sol.u,
    worst: Math.max(pick.top.ratio, pick.bottom.ratio, pick.vertical.ratio, pick.diagonal.ratio) };
}

/* small seeded random generator so a run can be repeated */
function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

/* Pareto front of points with two objectives, both minimised: returns indexes */
function pareto(pts) {
  return pts.map(function (p, i) { return i; }).filter(function (i) {
    return !pts.some(function (q, j) { return j !== i && q[0] <= pts[i][0] && q[1] <= pts[i][1] && (q[0] < pts[i][0] || q[1] < pts[i][1]); });
  });
}

/* ---------- form-finding: position-based relaxation of cable links ----------
   p: [[x,y,z]], links: [[i,j,restLength]], fixed: array of bool, load(i,p) -> [Fx,Fy,Fz] in kN.
   Links act as cables (they pull, never push). Link forces come from the constraint corrections. */
function Relax(p, links, fixed, load, opts) {
  opts = opts || {};
  var n = p.length, prev = p.map(function (q) { return q.slice(); }), dt = opts.dt || 0.05, damp = opts.damp || 0.9, iters = opts.iters || 40;
  var force = new Array(links.length).fill(0), it = 0;
  function step() {
    var i, k, c, move = 0;
    for (i = 0; i < n; i++) {
      if (fixed[i]) continue;
      var f = load(i, p);
      for (k = 0; k < 3; k++) {
        var v = (p[i][k] - prev[i][k]) * damp;
        prev[i][k] = p[i][k];
        p[i][k] += v + f[k] * dt * dt;
      }
    }
    var lam = new Array(links.length).fill(0);
    for (c = 0; c < iters; c++) {
      for (k = 0; k < links.length; k++) {
        var a = links[k][0], b = links[k][1], wa = fixed[a] ? 0 : 1, wb = fixed[b] ? 0 : 1;
        if (!wa && !wb) continue;
        var dx = p[b][0] - p[a][0], dy = p[b][1] - p[a][1], dz = p[b][2] - p[a][2], l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-12;
        var C = l - links[k][2];
        if (C <= 0) continue;
        var corr = C / (wa + wb), ux = dx / l, uy = dy / l, uz = dz / l;
        p[a][0] += wa * corr * ux; p[a][1] += wa * corr * uy; p[a][2] += wa * corr * uz;
        p[b][0] -= wb * corr * ux; p[b][1] -= wb * corr * uy; p[b][2] -= wb * corr * uz;
        lam[k] += corr;
      }
    }
    for (i = 0; i < n; i++) if (!fixed[i]) move = Math.max(move, Math.abs(p[i][0] - prev[i][0]), Math.abs(p[i][1] - prev[i][1]), Math.abs(p[i][2] - prev[i][2]));
    for (k = 0; k < links.length; k++) force[k] = lam[k] / (dt * dt);
    it++;
    return move;
  }
  return { p: p, force: force, step: step, iterations: function () { return it; } };
}
/* run to rest: returns iterations used */
function relaxToRest(r, tol, maxSteps) {
  var calm = 0, s;
  for (s = 0; s < (maxSteps || 4000); s++) { if (r.step() < tol) { if (++calm > 20) break; } else calm = 0; }
  return s;
}

/* hanging chain between (0,0) and (L,0): N links, length factor > 1. mode 'self' (load along the chain) or 'deck' (load per horizontal metre) */
function makeChain(L, N, factor, w, mode) {
  var p = [], links = [], fixed = [], i, l0 = L * factor / N;
  for (i = 0; i <= N; i++) { p.push([L * i / N, 0, 0]); fixed.push(i === 0 || i === N); }
  for (i = 0; i < N; i++) links.push([i, i + 1, l0]);
  var load = function (k, q) {
    var trib = mode === 'deck' ? (q[Math.min(k + 1, N)][0] - q[Math.max(k - 1, 0)][0]) / 2 : l0;
    return [0, 0, -w * trib];
  };
  return { relax: Relax(p, links, fixed, load, { dt: 0.02 * Math.sqrt(L / Math.max(w, 1e-6)) / 4, iters: 60 }), p: p, links: links, l0: l0, load: load };
}

/* analyse a shape as a two-pinned arch: nodes [[x,z]] with z up, vertical nodal loads P (kN, down) */
function analyseArch(nodes, P, EA, EI) {
  var elems = [], i, fixed = {}, last = nodes.length - 1;
  for (i = 0; i < last; i++) elems.push({ i: i, j: i + 1, EA: EA, EI: EI, w: 0 });
  fixed[0] = fixed[1] = true; fixed[3 * last] = fixed[3 * last + 1] = true;
  var sol = solveFrame(nodes, elems, fixed, P.map(function (v, k) { return [k, 0, -v, 0]; }).filter(function (l, k) { return k > 0 && k < last; }));
  if (!sol) return null;
  var mmax = 0, nmax = 0;
  sol.M.forEach(function (m) { mmax = Math.max(mmax, Math.abs(m[0]), Math.abs(m[1])); });
  sol.N.forEach(function (v) { nmax = Math.max(nmax, Math.abs(v)); });
  return { sol: sol, mmax: mmax, nmax: nmax, H: Math.abs(sol.R[0]) };
}

if (typeof module !== 'undefined') {
  module.exports = { solveTruss: solveTruss, makeTruss: makeTruss, analyseTruss: analyseTruss, solveFrame: solveFrame, analysePortal: analysePortal,
    fcAllow: fcAllow, LAMBDA_CR: LAMBDA_CR, pipe: pipe, PIPES: PIPES, sizeTruss: sizeTruss, rng: rng, pareto: pareto, Relax: Relax, relaxToRest: relaxToRest, makeChain: makeChain, analyseArch: analyseArch };
}
