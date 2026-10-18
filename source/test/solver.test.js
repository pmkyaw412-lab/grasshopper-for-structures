const S = require('../parts/solver.js');
let fails = 0;
function near(name, got, want, tol) {
  const ok = Math.abs(got - want) <= (tol || 1e-6) * Math.max(1, Math.abs(want));
  if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + '  got ' + got.toFixed(6) + '  want ' + want.toFixed(6));
}

// 1. Truss: reactions, chord force = M/h, for all three types
const E = 2.05e8, A = 30e-4;
for (const type of ['pratt', 'howe', 'warren']) {
  for (const n of [4, 6, 8]) {
    const L = 12, H = 2, w = 10;
    const r = S.analyseTruss(L, H, n, type, w, E * A);
    const sumR = r.sol.R[1] + r.sol.R[2 * n + 1];
    near(type + ' n=' + n + ' sum of vertical reactions', sumR, w * L);
    near(type + ' n=' + n + ' horizontal reaction', r.sol.R[0], 0, 1e-6);
    // max chord force equals M/h for pratt (top) and howe (bottom); warren depends on n
    if (type !== 'warren') near(type + ' n=' + n + ' chord = M/h', r.chord, r.M / H, 1e-9);
  }
}

// 2. Truss method of joints check: Pratt n=4, L=12, H=3, w=10 -> P=30, R=60
//    end vertical carries R - P/2 = 45 kN compression... (load enters at top node)
{
  const r = S.analyseTruss(12, 3, 4, 'pratt', 10, E * A);
  const g = r.t.grp, N = r.sol.N;
  const vert = N.filter((_, i) => g[i] === 'vertical');
  near('pratt end vertical', vert[0], -60);   // reaction 60 goes up the end post
  const diag = N.filter((_, i) => g[i] === 'diagonal');
  // first panel shear = 60 - 15 = 45; diagonal length = sqrt(9+9); N = 45 * sqrt(2), tension in Pratt
  near('pratt first diagonal', diag[0], 45 * Math.SQRT2);
  const bot = N.filter((_, i) => g[i] === 'bottom');
  near('pratt first bottom chord', bot[0], 0, 1e-6);
  const top = N.filter((_, i) => g[i] === 'top');
  near('pratt first top chord', top[0], -45);       // M at x=3: 60*3-15*3 = 135; /3 = 45
  near('pratt mid top chord', top[1], -60);         // M at x=6: 180; /3 = 60
}

// 3. Frame: simply supported beam, UDL, exact midspan deflection and moment
{
  const L = 6, w = 10, EI = 2.05e8 * 7.21e-5, EAb = 2.05e8 * 46.78e-4, nb = 8;
  const nodes = [], elems = [];
  for (let i = 0; i <= nb; i++) nodes.push([L * i / nb, 0]);
  for (let i = 0; i < nb; i++) elems.push({ i, j: i + 1, EA: EAb, EI, w });
  const fixed = { 0: true, 1: true }; fixed[3 * nb + 1] = true;
  const sol = S.solveFrame(nodes, elems, fixed, []);
  near('beam midspan deflection', -sol.u[3 * (nb / 2) + 1], 5 * w * L ** 4 / (384 * EI), 1e-9);
  near('beam midspan moment (sagging +)', sol.M[nb / 2 - 1][1], w * L * L / 8, 1e-9);
  near('beam reaction', sol.R[1], w * L / 2, 1e-9);
  console.log('   delta mm =', (5 * w * L ** 4 / (384 * EI) * 1000).toFixed(2));
}

// 4. Portal, pinned bases, lateral load only: column top moment = P*H/2, shears P/2
{
  const L = 8, H = 4, P = 50, EI = 2.05e8 * 2.35e-4, EAc = 2.05e8 * 83.37e-4;
  const r = S.analysePortal(L, H, P, 0, false, EAc, EI);
  near('portal pinned |M top| (within 0.2%, beam shortening)', Math.abs(r.Mtop), P * H / 2, 2e-3);
  near('portal pinned M base', r.Mbase, 0, 1e-6);
  near('portal sum Rx', r.Rx[0] + r.Rx[1], -P, 1e-9);
  near('portal Rz couple', r.Rz[1], P * H / L, 1e-9);
  console.log('   pinned sway mm =', (r.sway * 1000).toFixed(2));
  // fixed bases: sum of column end moments = P*H (two columns, top + base each)
  const f = S.analysePortal(L, H, P, 0, true, EAc, EI);
  near('portal fixed sum Rx', f.Rx[0] + f.Rx[1], -P, 1e-9);
  console.log('   fixed: Mtop', f.Mtop.toFixed(2), 'Mbase', f.Mbase.toFixed(2), 'sway mm', (f.sway * 1000).toFixed(2));
  near('portal fixed |Mtop|+|Mbase| per column (within 1%)', Math.abs(f.Mtop) + Math.abs(f.Mbase), P * H / 2, 1e-2);
}

// 5. Portal, gravity only, pinned: symmetric, no sway, vertical reactions wL/2
{
  const L = 8, H = 4, w = 20, EI = 2.05e8 * 2.35e-4, EAc = 2.05e8 * 83.37e-4;
  const r = S.analysePortal(L, H, 0, w, false, EAc, EI);
  near('portal gravity Rz', r.Rz[0], w * L / 2, 1e-9);
  near('portal gravity sway', r.sway, 0, 1e-6);
  // statics: M_mid - M_corner(hogging) = wL^2/8
  const top = r.sol.M[r.nc][0]; // beam start
  near('portal gravity Mmid - Mend = wL2/8', r.Mmid - top, w * L * L / 8, 1e-9);
  console.log('   gravity: beam end M', top.toFixed(2), 'mid M', r.Mmid.toFixed(2), 'col top M', r.Mtop.toFixed(2));
}
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
