/* ---------- definitions used by bug hunts and challenge solutions ---------- */
function Pin(id, txt, title) { return P(id, txt, { title: title, 'in': false, out: true }); }
var DEFS2 = {
  /* ---- fix the bug ---- */
  bug_s4: {
    label: 'Sliders X and Z, two Construct Point components, Line, Length and a panel.',
    cols: [[S('x', 'X', 0, 10, 0.5, 6, 1), S('z', 'Z', 0, 6, 0.5, 3, 1)], [C('a', 'Construct Point', ['X', 'Y', 'Z'], ['Pt']), C('b', 'Construct Point', ['X', 'Y', 'Z'], ['Pt'])],
      [C('ln', 'Line', ['A', 'B'], ['L'])], [C('len', 'Length', ['C'], ['L'])], [P('out', '6.71')]],
    wires: [['x', 'b.X'], ['z', 'b.Y'], ['a.Pt', 'ln.A'], ['b.Pt', 'ln.B'], ['ln.L', 'len.C'], ['len.L', 'out']]
  },
  bug_s5: {
    label: 'Span and height sliders, four Construct Point components, Polyline, Explode, Length and a panel showing 4.00, 8.94 and 0.00.',
    cols: [[S('L', 'Span L', 4, 12, 0.5, 8, 1), S('H', 'Height H', 2.5, 6, 0.5, 4, 1)],
      [C('A', 'Point A', ['X', 'Y', 'Z'], ['Pt']), C('B', 'Point B', ['X', 'Y', 'Z'], ['Pt']), C('C', 'Point C', ['X', 'Y', 'Z'], ['Pt']), C('D', 'Point D', ['X', 'Y', 'Z'], ['Pt'])],
      [C('pl', 'Polyline', ['V', 'C'], ['Pl'])], [C('ex', 'Explode', ['C', 'R'], ['S', 'V'])], [C('len', 'Length', ['C'], ['L'])], [P('out', '0  4.00\n1  8.94\n2  0.00', { title: 'Panel' })]],
    wires: [['H', 'B.Z'], ['L', 'C.X'], ['L', 'D.X'], ['A.Pt', 'pl.V'], ['B.Pt', 'pl.V'], ['C.Pt', 'pl.V'], ['D.Pt', 'pl.V'], ['pl.Pl', 'ex.C'], ['ex.S', 'len.C', 'l'], ['len.L', 'out', 'l']]
  },
  bug_s7: {
    label: 'A domain of 0 to 24 and a slider set to 5 feed Range. Construct Point and a panel list 6 points.',
    cols: [[Pin('dom', '0 To 24', 'Domain'), S('n', 'Lines', 2, 10, 1, 5)], [C('rg', 'Range', ['D', 'N'], ['R'])], [C('pt', 'Construct Point', ['X', 'Y', 'Z'], ['Pt'])],
      [P('out', '0  {0.0, 0.0, 0.0}\n1  {4.8, 0.0, 0.0}\n2  {9.6, 0.0, 0.0}\n...\n5  {24.0, 0.0, 0.0}', { title: 'Panel' })]],
    wires: [['dom', 'rg.D'], ['n', 'rg.N'], ['rg.R', 'pt.X', 'l'], ['pt.Pt', 'out', 'l']]
  },
  bug_s8: {
    label: 'Two Series of 4 and 3 values feed Construct Point directly. List Length shows 4.',
    cols: [[S('nx', 'X count', 2, 6, 1, 4), S('ny', 'Y count', 1, 6, 1, 3)], [C('sx', 'Series', ['S', 'N', 'C'], ['S']), C('sy', 'Series', ['S', 'N', 'C'], ['S'])],
      [C('pt', 'Construct Point', ['X', 'Y', 'Z'], ['Pt'])], [C('ll', 'List Length', ['L'], ['L']), P('out', '4')]],
    wires: [['nx', 'sx.C'], ['ny', 'sy.C'], ['sx.S', 'pt.X', 'l'], ['sy.S', 'pt.Y', 'l'], ['pt.Pt', 'll.L', 'l'], ['ll.L', 'out']]
  },
  bug_s9: {
    label: 'Bottom points go to Shift List and to Shortest List. Shift List has its Wrap input set by a Boolean Toggle showing True.',
    cols: [[C('bot', 'Bottom pts', [], ['']), S('s', 'Shift', 0, 2, 1, 1), Pin('w', 'True', 'Boolean Toggle')],
      { align: 'flex-end', nodes: [C('sh', 'Shift List', ['L', 'S', 'W'], ['L'])] }, [C('sl', 'Shortest List', ['A', 'B'], ['A', 'B'])], [C('ln', 'Line', ['A', 'B'], ['L']), P('out', '6 lines', { title: 'List Length' })]],
    wires: [['bot.', 'sh.L', 'l'], ['s', 'sh.S'], ['w', 'sh.W'], ['bot.', 'sl.A', 'l'], ['sh.L', 'sl.B', 'l'], ['sl.A', 'ln.A', 'l'], ['sl.B', 'ln.B', 'l'], ['ln.L', 'out', 'l']]
  },
  bug_s11: {
    label: 'Grid points stored one branch per floor pass through Flatten Tree into Polyline. The Param Viewer shows one branch.',
    cols: [[C('g', 'Grid pts', [], ['P'])], [C('fl', 'Flatten Tree', ['T'], ['T'])], [C('pl', 'Polyline', ['V', 'C'], ['Pl']), P('out', '{0}  N = 1', { title: 'Param Viewer' })]],
    wires: [['g.P', 'fl.T', 't'], ['fl.T', 'pl.V', 'l'], ['pl.Pl', 'out']]
  },
  bug_s12: {
    label: 'Two Series feed the X and Z of Construct Point. The Param Viewer shows one branch of four points.',
    cols: [[S('m', 'X count', 2, 6, 1, 4), S('n', 'Z count', 2, 7, 1, 4)], [C('sx', 'Series, X', ['S', 'N', 'C'], ['S']), C('sz', 'Series, Z', ['S', 'N', 'C'], ['S'])],
      [C('pt', 'Construct Point', ['X', 'Y', 'Z'], ['Pt'])], [P('pv', '{0}  N = 4', { title: 'Param Viewer' })]],
    wires: [['m', 'sx.C'], ['n', 'sz.C'], ['sx.S', 'pt.X', 'l'], ['sz.S', 'pt.Z', 'l'], ['pt.Pt', 'pv', 'l']]
  },
  bug_s13: {
    label: 'An arch curve and a count feed Divide Curve. Its points are projected down to the deck, and Line joins each pair.',
    cols: [[C('arc', 'Arch curve', [], ['']), C('deck', 'Deck line', [], ['']), S('n', 'Count', 4, 16, 1, 8)], [C('dv', 'Divide Curve', ['C', 'N', 'K'], ['P', 'T', 't'])],
      [C('pr', 'Project to deck', ['P', 'C'], ['P'])], [C('ln', 'Line', ['A', 'B'], ['L'])]],
    wires: [['arc.', 'dv.C'], ['n', 'dv.N'], ['dv.P', 'pr.P', 'l'], ['deck.', 'pr.C'], ['dv.P', 'ln.A', 'l'], ['pr.P', 'ln.B', 'l']]
  },
  bug_s14: {
    label: 'Truss lines go to Move. Series feeds Unit Y, and Unit Y feeds the T input of Move as a plain list.',
    cols: [[C('tl', 'Truss lines', [], ['']), S('sp', 'Spacing', 3, 8, 0.5, 6, 1), S('c', 'Count', 2, 6, 1, 4)], { align: 'flex-end', nodes: [C('se', 'Series', ['S', 'N', 'C'], ['S'])] },
      { align: 'flex-end', nodes: [C('uy', 'Unit Y', ['F'], ['V'])] }, [C('mv', 'Move', ['G', 'T'], ['G', 'X']), P('out', '17 lines in 1 branch', { title: 'Param Viewer' })]],
    wires: [['tl.', 'mv.G', 'l'], ['sp', 'se.N'], ['c', 'se.C'], ['se.S', 'uy.F', 'l'], ['uy.V', 'mv.T', 'l'], ['mv.G', 'out', 'l']]
  },
  bug_s16: {
    label: 'Line to Beam, two Support components and Loads feed Assemble Model, then Analyze, which is red.',
    cols: [[C('lb', 'Line to Beam', ['Line'], ['Elem']), C('s1', 'Support, Tz', ['Pos'], ['Supp']), C('s2', 'Support, Tz', ['Pos'], ['Supp']), C('ld', 'Loads', ['Vec'], ['Load'])],
      [C('as', 'Assemble Model', ['Elem', 'Supp', 'Load'], ['Model'])], [C('an', 'Analyze', ['Model'], ['Model', 'Disp'], { cls: 'err', balloon: 'Analyze could not solve the model' })]],
    wires: [['lb.Elem', 'as.Elem'], ['s1.Supp', 'as.Supp'], ['s2.Supp', 'as.Supp'], ['ld.Load', 'as.Load'], ['as.Model', 'an.Model']]
  },
  bug_s17: {
    label: 'Top nodes and a force vector feed Point-Load, then Assemble Model and Analyze. A panel shows the chord forces.',
    cols: [[C('pts', 'Top nodes', [], ['']), Pin('vec', '{0.0, 0.0, 10.0}', 'Force vector, kN')], [C('pl', 'Point-Load', ['Pos', 'Force'], ['Load'])],
      [C('as', 'Assemble Model', ['Elem', 'Supp', 'Load'], ['Model'])], [C('an', 'Analyze', ['Model'], ['Model', 'Disp'])], [P('out', 'top chord     +180\nbottom chord  −180', { title: 'Beam Forces N, kN' })]],
    wires: [['pts.', 'pl.Pos', 'l'], ['vec', 'pl.Force'], ['pl.Load', 'as.Load', 'l'], ['as.Model', 'an.Model'], ['an.Model', 'out']]
  },
  bug_s18: {
    label: 'An I-Profile with height 300 and width 150 feeds Line to Beam, then Assemble Model and Analyze. The displacement panel shows 0.002.',
    cols: [[Pin('cs', 'Height 300\nWidth 150', 'I-Profile'), C('ln', 'Frame lines', [], [''])], [C('lb', 'Line to Beam', ['Line', 'CroSec'], ['Elem'])],
      [C('as', 'Assemble Model', ['Elem', 'Supp', 'Load'], ['Model'])], [C('an', 'Analyze', ['Model'], ['Model', 'Disp'])], [P('out', '0.002', { title: 'Disp, cm' })]],
    wires: [['cs', 'lb.CroSec'], ['ln.', 'lb.Line', 'l'], ['lb.Elem', 'as.Elem', 'l'], ['as.Model', 'an.Model'], ['an.Disp', 'out']]
  },
  bug_f1: {
    label: 'Series of floor numbers goes to Remap Numbers. Bounds measures the floor heights, Series times 4, and feeds the S input. A panel shows 0 to 0.25.',
    cols: [[S('n', 'Floors', 6, 40, 1, 20)], [C('se', 'Series', ['S', 'N', 'C'], ['S']), C('mu', 'Multiplication, \u00d7 4', ['A', 'B'], ['R'])],
      [C('bd', 'Bounds', ['N'], ['I']), C('rm', 'Remap Numbers', ['V', 'S', 'T'], ['R', 'C'])], [P('out', '0.000\n0.013\n0.026\n...\n0.250', { title: 'Panel' })]],
    wires: [['n', 'se.C'], ['se.S', 'mu.A', 'l'], ['mu.R', 'bd.N', 'l'], ['se.S', 'rm.V', 'l'], ['bd.I', 'rm.S'], ['rm.R', 'out', 'l']]
  },
  bug_f2: {
    label: 'Panel centres and the attractor point feed Distance. Distance goes straight into the F input of Scale.',
    cols: [[C('ct', 'Panel centres', [], ['']), C('at', 'Attractor', [], ['']), C('pn', 'Panel outlines', [], [''])], [C('ds', 'Distance', ['A', 'B'], ['D'])],
      [C('sc', 'Scale', ['G', 'C', 'F'], ['G', 'X']), P('out', '12.4\n9.1\n6.3\n...', { title: 'Distance, m' })]],
    wires: [['ct.', 'ds.A', 'l'], ['at.', 'ds.B'], ['pn.', 'sc.G', 'l'], ['ct.', 'sc.C', 'l'], ['ds.D', 'sc.F', 'l'], ['ds.D', 'out', 'l']]
  },
  bug_f3: {
    label: 'A twist slider of 90 and Graph Mapper values feed Multiplication, and the result goes straight into the angle input of Rotate.',
    cols: [[S('tw', 'Twist', 0, 180, 5, 90), C('gm', 'Graph Mapper', [''], [''])], [C('mu', 'Multiplication', ['A', 'B'], ['R'])], [C('pl', 'Floor plates', [], [''])],
      [C('rot', 'Rotate', ['G', 'A', 'P'], ['G', 'X'])]],
    wires: [['tw', 'mu.A'], ['gm', 'mu.B', 'l'], ['mu.R', 'rot.A', 'l'], ['pl.', 'rot.G', 'l']]
  },
  bug_f4: {
    label: 'Panels go through Deconstruct Brep, then Flatten Tree, then Plane Fit. The panel shows a single deviation.',
    cols: [[C('it', 'Isotrim', ['S', 'D'], ['S'])], [C('db', 'Deconstruct Brep', ['B'], ['F', 'E', 'V'])], [C('fl', 'Flatten Tree', ['T'], ['T'])], [C('pf', 'Plane Fit', ['P'], ['Pl', 'dx'])],
      [P('out', '3.912', { title: 'dx' })]],
    wires: [['it.S', 'db.B', 'l'], ['db.V', 'fl.T', 't'], ['fl.T', 'pf.P', 'l'], ['pf.dx', 'out']]
  },
  bug_m1: {
    label: 'Panels hold the buckling length, ix and iy. Division divides the length by ix and shows a slenderness of 30.5.',
    cols: [[P('lk', '400', { title: 'Buckling length, cm', 'in': false, out: true }), P('ix', '13.1', { title: 'ix, cm', 'in': false, out: true }), P('iy', '7.55', { title: 'iy, cm', 'in': false, out: true })],
      [C('dv', 'Division', ['A', 'B'], ['R'])], [P('lam', '30.5', { title: 'Slenderness' })]],
    wires: [['lk', 'dv.A'], ['ix', 'dv.B'], ['dv.R', 'lam']]
  },
  bug_m3: {
    label: 'The long-term allowable stress is multiplied by 1.5 before it reaches the check for load case G.',
    cols: [[P('f', '156.7', { title: 'F / 1.5, N/mm²', 'in': false, out: true }), P('k', '1.5', { title: 'Factor', 'in': false, out: true }), P('sg', '180.0', { title: 'σ for case G, N/mm²', 'in': false, out: true })],
      [C('mu', 'Multiplication', ['A', 'B'], ['R'])], [C('ck', 'Ratio, case G', ['σ', 'f'], ['r'])], [P('out', '0.77  OK', { title: 'Panel' })]],
    wires: [['f', 'mu.A'], ['k', 'mu.B'], ['mu.R', 'ck.f'], ['sg', 'ck.σ'], ['ck.r', 'out']]
  },
  bug_o1: {
    label: 'Depth, panels and type sliders feed the truss cluster and the Galapagos genome. The cluster has outputs kg and d; d is wired to Fitness.',
    cols: [[S('h', 'Depth H', 1.2, 4, 0.1, 4, 1), S('n', 'Panels n', 4, 12, 2, 12), S('t', 'Type', 0, 2, 1, 0)], { align: 'center', nodes: [C('tr', 'Truss and sizing cluster', ['H', 'n', 'T'], ['kg', 'd'])] },
      [C('gal', 'Galapagos', ['Genome', 'Fitness'], []), P('out', 'Best: H 4.0 m, 2,480 kg', { title: 'Panel' })]],
    wires: [['h', 'tr.H'], ['n', 'tr.n'], ['t', 'tr.T'], ['tr.d', 'gal.Fitness'], ['h', 'gal.Genome'], ['n', 'gal.Genome'], ['t', 'gal.Genome']]
  },
  bug_k1: {
    label: 'End Points feeds only its start output into Anchor. Length goals, the anchor and Load goals go to the Solver.',
    cols: [[C('ch', 'Chain line', [], ['']), C('lk', 'Links', [], [''])], [C('ep', 'End Points', ['C'], ['S', 'E']), C('ln', 'Length (Line)', ['L'], ['LG']), C('ld', 'Load', ['P', 'F'], ['L'])],
      [C('an', 'Anchor', ['P', 'S'], ['A'])], [C('sv', 'Solver', ['GO', 'R', 'On'], ['I', 'V', 'O'])]],
    wires: [['ch.', 'ep.C'], ['ep.S', 'an.P'], ['lk.', 'ln.L', 'l'], ['ln.LG', 'sv.GO', 'l'], ['an.A', 'sv.GO'], ['ld.L', 'sv.GO', 'l']]
  },

  /* ---- challenge solutions ---- */
  sol_s1: {
    label: 'Three sliders feed X, Y and Z of Construct Point.',
    cols: [[S('x', 'X', 0, 10, 1, 2), S('y', 'Y', 0, 10, 1, 3), S('z', 'Z', 0, 10, 1, 4)], [C('pt', 'Construct Point', ['X', 'Y', 'Z'], ['Pt'])]],
    wires: [['x', 'pt.X'], ['y', 'pt.Y'], ['z', 'pt.Z']]
  },
  sol_s4: {
    label: 'Bay width and storey height sliders set the corners of a brace. Line and Length measure it.',
    cols: [[S('b', 'Bay width', 3, 10, 0.5, 6, 1), S('h', 'Storey height', 2.5, 5, 0.1, 3.5, 1)], [C('a', 'Construct Point', ['X', 'Y', 'Z'], ['Pt']), C('c', 'Construct Point', ['X', 'Y', 'Z'], ['Pt'])],
      [C('ln', 'Line', ['A', 'B'], ['L'])], [C('len', 'Length', ['C'], ['L'])], [P('out', '6.95')]],
    wires: [['b', 'c.X'], ['h', 'c.Z'], ['a.Pt', 'ln.A'], ['c.Pt', 'ln.B'], ['ln.L', 'len.C'], ['len.L', 'out']]
  },
  sol_s5: {
    label: 'Span, height and rise sliders. Division gives the ridge position and Addition its height. Polyline joins five points.',
    cols: [[S('L', 'Span L', 6, 20, 0.5, 12, 1), S('H', 'Height H', 3, 8, 0.5, 5, 1), S('r', 'Rise', 0.5, 3, 0.1, 1.5, 1)],
      [C('dv', 'Division', ['A', 'B'], ['R']), C('ad', 'Addition', ['A', 'B'], ['R'])], [C('E', 'Point E, ridge', ['X', 'Y', 'Z'], ['Pt'])], [C('pl', 'Polyline', ['V', 'C'], ['Pl'])]],
    wires: [['L', 'dv.A'], ['H', 'ad.A'], ['r', 'ad.B'], ['dv.R', 'E.X'], ['ad.R', 'E.Z'], ['E.Pt', 'pl.V']]
  },
  sol_s7: {
    label: 'Series makes 9 points. Dispatch splits them with a True, False pattern into columns and posts, each drawn with Line SDL.',
    cols: [[S('c', 'Count', 3, 15, 1, 9), Pin('pat', 'True\nFalse', 'Panel')], [C('se', 'Series', ['S', 'N', 'C'], ['S']), C('pt', 'Construct Point', ['X', 'Y', 'Z'], ['Pt'])],
      [C('dp', 'Dispatch', ['L', 'P'], ['A', 'B'])], [C('l1', 'Line SDL, 4 m', ['S', 'D', 'L'], ['L']), C('l2', 'Line SDL, 3 m', ['S', 'D', 'L'], ['L'])]],
    wires: [['c', 'se.C'], ['se.S', 'pt.X', 'l'], ['pt.Pt', 'dp.L', 'l'], ['pat', 'dp.P'], ['dp.A', 'l1.S', 'l'], ['dp.B', 'l2.S', 'l']]
  },
  sol_s14: {
    label: 'Series feeds both Unit Y and a Multiplication by minus 0.05. Vector XYZ combines them and feeds Move, grafted.',
    cols: [[C('tl', 'Truss lines', [], ['']), S('sp', 'Spacing', 3, 8, 0.5, 6, 1), S('c', 'Count', 2, 8, 1, 7)], [C('se', 'Series', ['S', 'N', 'C'], ['S']), C('mu', 'Multiplication', ['A', 'B'], ['R'])],
      [C('vx', 'Vector XYZ', ['X', 'Y', 'Z'], ['V', 'L'])], [C('mv', 'Move', ['G', 'T'], ['G', 'X'])]],
    wires: [['sp', 'se.N'], ['c', 'se.C'], ['se.S', 'vx.Y', 'l'], ['se.S', 'mu.A', 'l'], ['mu.R', 'vx.Z', 'l'], ['tl.', 'mv.G', 'l'], ['vx.V', 'mv.T', 't']]
  },
  sol_f2: {
    label: 'Distance is remapped to 0 to 1, multiplied by the number of steps, rounded, divided back, then remapped to the opening range before Scale.',
    cols: [[C('ds', 'Distance', ['A', 'B'], ['D'])], [C('bd', 'Bounds', ['N'], ['I']), C('rm', 'Remap Numbers', ['V', 'S', 'T'], ['R', 'C'])], [C('mu', 'Multiplication', ['A', 'B'], ['R']), C('rd', 'Round', ['x'], ['N', 'F', 'C'])],
      [C('dv', 'Division', ['A', 'B'], ['R'])], [C('rm2', 'Remap Numbers', ['V', 'S', 'T'], ['R', 'C'])], [C('sc', 'Scale', ['G', 'C', 'F'], ['G', 'X'])]],
    wires: [['ds.D', 'bd.N', 'l'], ['ds.D', 'rm.V', 'l'], ['bd.I', 'rm.S'], ['rm.R', 'mu.A', 'l'], ['mu.R', 'rd.x', 'l'], ['rd.N', 'dv.A', 'l'], ['dv.R', 'rm2.V', 'l'], ['rm2.R', 'sc.F', 'l']]
  }
};
