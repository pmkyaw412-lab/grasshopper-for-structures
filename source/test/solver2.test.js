const S = require('../parts/solver.js');
let fails = 0;
function near(name, got, want, tol) {
  const ok = Math.abs(got - want) <= (tol || 1e-6) * Math.max(1, Math.abs(want));
  if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + '  got ' + (+got).toFixed(4) + '  want ' + (+want).toFixed(4));
}
// buckling: Lambda about 119.8; fc(0)=F/1.5; continuity at Lambda; known table values
near('Lambda', S.LAMBDA_CR, 119.79, 1e-3);
near('fc(0) = 156.7', S.fcAllow(0), 235 / 1.5, 1e-9);
near('fc continuous at Lambda (0.277 is rounded)', S.fcAllow(S.LAMBDA_CR - 1e-9), S.fcAllow(S.LAMBDA_CR + 1e-9), 5e-4);
near('fc(Lambda) = 0.277F', S.fcAllow(S.LAMBDA_CR), 0.277 * 235, 2e-3);
// worked by hand from the formula: lambda 50 -> 135.27, 100 -> 86.27, 150 -> 41.5, 200 -> 23.35
near('fc(50)', S.fcAllow(50), 135.27, 1e-3);
near('fc(100)', S.fcAllow(100), 86.27, 1e-3);
near('fc(150)', S.fcAllow(150), 41.4, 5e-3);
near('fc(200)', S.fcAllow(200), 23.3, 5e-3);
// pipe properties: 114.3 x 4.5 -> A 15.52 cm2, i 3.89 cm, 12.2 kg/m (JIS table values)
const p = S.pipe(114.3, 4.5);
near('pipe A', p.A, 15.52, 2e-3); near('pipe i', p.i, 3.89, 3e-3); near('pipe kg/m', p.kg, 12.2, 5e-3);
// statically determinate: forces independent of EA
const a = S.analyseTruss(24, 2.4, 6, 'pratt', 9, 1e5), b = S.analyseTruss(24, 2.4, 6, 'pratt', 9, 7e7);
near('truss forces independent of EA', a.sol.N[10], b.sol.N[10], 1e-9);
// per-member EA equals single EA when all equal
const t = S.makeTruss(12, 2, 4, 'pratt'), fx = { 0: true, 1: true }; fx[2 * 4 + 1] = true;
const ld = [[6, 0, -10]];
const s1 = S.solveTruss(t.nodes, t.elems, 5e5, fx, ld), s2 = S.solveTruss(t.nodes, t.elems, t.elems.map(() => 5e5), fx, ld);
near('array EA same as scalar', s1.u[5], s2.u[5], 1e-12);
// sizing: every chosen pipe passes; lighter pipe for that group fails
const z = S.sizeTruss(24, 2.4, 6, 'pratt', 9, 300);
console.log('   sizing:', z.ok, Object.entries(z.pick).map(([g, v]) => g + ' ' + v.pipe.name + ' ' + v.ratio.toFixed(2)).join(', '), 'kg', z.kg.toFixed(0), 'd mm', (z.d * 1000).toFixed(1));
if (!(z.ok && Object.values(z.pick).every(v => v.ratio <= 1))) { fails++; console.log('FAIL sizing ratios'); }
// chord check by hand: M = wL^2/8 = 648, chord 270 kN; top chord compression panel 4 m
const top = z.pick.top.pipe, lam = 400 / top.i, sig = 270 * 10 / top.A;
console.log('   top chord', top.name, 'lambda', lam.toFixed(0), 'sigma', sig.toFixed(1), 'fc', S.fcAllow(lam).toFixed(1));
if (sig > S.fcAllow(lam) + 1e-9) { fails++; console.log('FAIL top chord'); }
// Pareto
const pf = S.pareto([[1, 5], [2, 3], [3, 4], [4, 1], [2, 2]]).sort();
if (JSON.stringify(pf) !== JSON.stringify([0, 3, 4])) { fails++; console.log('FAIL pareto', pf); } else console.log('ok   pareto');
// hanging chain, self weight: compare sag with the catenary of the same length
{
  const L = 20, N = 40, factor = 1.15, w = 1;
  const c = S.makeChain(L, N, factor, w, 'self');
  const its = S.relaxToRest(c.relax, 1e-7, 20000);
  const sag = -Math.min(...c.p.map(q => q[2]));
  // catenary: S = 2a sinh(L/2a)
  const Sl = L * factor; let lo = 0.1, hi = 1000;
  for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; (2 * m * Math.sinh(L / (2 * m)) > Sl) ? lo = m : hi = m; }
  const aa = (lo + hi) / 2, f = aa * (Math.cosh(L / (2 * aa)) - 1);
  near('chain sag vs catenary (' + its + ' steps)', sag, f, 1e-2);
  // horizontal tension H = w * a
  const Hn = c.relax.force[0] * (c.p[1][0] - c.p[0][0]) / c.l0;
  near('chain H from link force vs w*a', Hn, w * aa, 3e-2);
}
// hanging chain under deck load: parabola, H = wL^2/8f
{
  const L = 20, N = 40, w = 10;
  const c = S.makeChain(L, N, 1.1, w, 'deck');
  S.relaxToRest(c.relax, 1e-7, 20000);
  const f = -Math.min(...c.p.map(q => q[2]));
  let err = 0; c.p.forEach(q => { const zp = -4 * f * q[0] * (L - q[0]) / (L * L); err = Math.max(err, Math.abs(q[2] - zp)); });
  console.log('   deck chain sag', f.toFixed(3), 'max deviation from parabola', (err * 1000).toFixed(1), 'mm');
  if (err > 0.02 * f) { fails++; console.log('FAIL parabola'); }
  const Hn = c.relax.force[0] * (c.p[1][0] - c.p[0][0]) / Math.hypot(c.p[1][0] - c.p[0][0], c.p[1][2] - c.p[0][2]);
  near('deck chain H = wL^2/8f', Hn, w * L * L / (8 * f), 3e-2);
  // flip to arch: moments tiny compared with a circular arch of same rise
  const nodes = c.p.map(q => [q[0], -q[2]]);
  const P = c.p.map((q, k) => w * (c.p[Math.min(k + 1, N)][0] - c.p[Math.max(k - 1, 0)][0]) / 2);
  const EA = 2.05e8 * 118.5e-4, EI = 2.05e8 * 20200e-8;
  const arch = S.analyseArch(nodes, P, EA, EI);
  const R = (L * L / 4 + f * f) / (2 * f), al = Math.asin(L / 2 / R), circ = [];
  for (let k = 0; k <= N; k++) { const th = -al + 2 * al * k / N; circ.push([L / 2 + R * Math.sin(th), f - R + R * Math.cos(th)]); }
  const Pc = circ.map((q, k) => w * (circ[Math.min(k + 1, N)][0] - circ[Math.max(k - 1, 0)][0]) / 2);
  const ca = S.analyseArch(circ, Pc, EA, EI);
  console.log('   arch Mmax form-found', arch.mmax.toFixed(2), 'circular', ca.mmax.toFixed(2), 'kN m; H', arch.H.toFixed(1), 'vs wL2/8f', (w * L * L / 8 / f).toFixed(1));
  if (!(arch.mmax < 0.1 * ca.mmax && arch.mmax < 0.01 * w * L * L / 8)) { fails++; console.log('FAIL arch moments'); }
}
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
