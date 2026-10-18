/* ---------- static definitions shown in lessons ---------- */
var DEFS = {
  first: {
    label: 'A Number Slider wired into the X input of Construct Point',
    cols: [[S('x', 'Number Slider', 0, 10, 1, 4)], [C('pt', 'Construct Point', ['X', 'Y', 'Z'], ['Pt'])]],
    wires: [['x', 'pt.X']]
  },
  ref: {
    label: 'A Curve parameter and a slider feed Divide Curve. A panel lists the points.',
    cols: [[C('crv', 'Curve', [], ['']), S('n', 'Count', 2, 20, 1, 10)], [C('dv', 'Divide Curve', ['C', 'N', 'K'], ['P', 'T', 't'])],
      [P('out', ' 0  {0.0, 0.0, 0.0}\n 1  {2.4, 0.0, 1.1}\n 2  {4.8, 0.0, 1.9}\n ...\n10  {24.0, 0.0, 0.0}', { title: 'Panel' })]],
    wires: [['crv.', 'dv.C'], ['n', 'dv.N'], ['dv.P', 'out', 'l']]
  },
  tree3: {
    label: 'A Curve parameter holding three curves feeds Divide Curve. A Param Viewer shows three branches.',
    cols: [[C('crv', 'Curve (3 curves)', [], ['']), S('n', 'Count', 2, 10, 1, 4)], [C('dv', 'Divide Curve', ['C', 'N', 'K'], ['P', 'T', 't'])],
      [P('pv', '{0;0}  N = 5\n{0;1}  N = 5\n{0;2}  N = 5', { title: 'Param Viewer' })]],
    wires: [['crv.', 'dv.C', 'l'], ['n', 'dv.N'], ['dv.P', 'pv', 't']]
  },
  frame: {
    label: 'Two Series feed Construct Point. The Z list is grafted, so the output is one branch of nodes per level.',
    cols: [[S('m', 'X count', 2, 6, 1, 4), S('n', 'Z count', 2, 7, 1, 4)],
      [C('sx', 'Series', ['S', 'N', 'C'], ['S']), C('sz', 'Series', ['S', 'N', 'C'], ['S, grafted'])],
      [C('pt', 'Construct Point', ['X', 'Y', 'Z'], ['Pt'])],
      [P('pv', '{0;0}  N = 4\n{0;1}  N = 4\n{0;2}  N = 4\n{0;3}  N = 4', { title: 'Param Viewer' })]],
    wires: [['m', 'sx.C'], ['n', 'sz.C'], ['sx.S', 'pt.X', 'l'], ['sz.S, grafted', 'pt.Z', 't'], ['pt.Pt', 'pv', 't']]
  },
  karamba: {
    label: 'Cross section, line, support points and load vector feed Line to Beam, Support and Loads, which all feed Assemble Model.',
    cols: [[C('cs', 'Cross Sections', [], ['']), C('ln', 'Line', [], ['']), C('pts', 'End points', [], ['']), C('vec', 'Load vector', [], [''])],
      [C('lb', 'Line to Beam', ['Line', 'CroSec'], ['Elem']), C('sup', 'Support', ['Pos'], ['Supp']), C('ld', 'Loads', ['Vec'], ['Load'])],
      [C('as', 'Assemble Model', ['Elem', 'Supp', 'Load'], ['Model'])]],
    wires: [['cs.', 'lb.CroSec'], ['ln.', 'lb.Line'], ['pts.', 'sup.Pos', 'l'], ['vec.', 'ld.Vec'], ['lb.Elem', 'as.Elem'], ['sup.Supp', 'as.Supp', 'l'], ['ld.Load', 'as.Load']]
  },
  karamba2: {
    label: 'Assemble Model feeds Analyze. Its model output goes to ModelView and BeamView, and its displacement output to a panel.',
    cols: [[C('as', 'Assemble Model', ['Elem', 'Supp', 'Load'], ['Model'])], [C('an', 'Analyze', ['Model'], ['Model', 'Disp'])],
      [C('mv', 'ModelView', ['Model'], ['Model']), P('out', '1.14', { title: 'Disp, cm' })], { align: 'flex-start', nodes: [C('bv', 'BeamView', ['Model'], ['Model'])] }],
    wires: [['as.Model', 'an.Model'], ['an.Model', 'mv.Model'], ['an.Disp', 'out'], ['mv.Model', 'bv.Model']]
  }
};

/* ---------- mount everything ---------- */
function mount() {
  if (typeof DEFS2 !== 'undefined') Object.keys(DEFS2).forEach(function (k) { DEFS[k] = DEFS2[k]; });
  $$('[data-def]').forEach(function (h) { var d = DEFS[h.getAttribute('data-def')]; if (d) buildDef(h, d, null); });
  $$('[data-sim]').forEach(function (h) {
    var f = SIMS[h.getAttribute('data-sim')];
    if (!f) return;
    try { f(h); } catch (e) { h.appendChild(el('p', { 'class': 'sim-cap' }, 'This example could not start. Reload the page to try again.')); if (window.console) console.error(e); }
  });

  var boxes = $$('.ticks input[type="checkbox"]'), stages = $$('.stage[data-stage]'), links = $$('.rail a[data-stage]');
  var qids = $$('[data-qid]').map(function (q) { return q.getAttribute('data-qid'); }), sessions = $$('article.session');
  $('#prog-t').textContent = String(boxes.length); $('#drill-t').textContent = String(qids.length);
  initPractice();

  var chain = $('.rail .chain'), wsvg = document.createElementNS(NS, 'svg');
  wsvg.setAttribute('class', 'wires'); wsvg.setAttribute('aria-hidden', 'true');
  chain.insertBefore(wsvg, chain.firstChild);
  var doneFlags = [];
  function railWires() {
    if (window.matchMedia('(max-width: 999px)').matches) { wsvg.innerHTML = ''; return; }
    var base = chain.getBoundingClientRect(), html = '';
    for (var i = 0; i < links.length - 1; i++) {
      var a = links[i].getBoundingClientRect(), b = links[i + 1].getBoundingClientRect();
      var x1 = a.right - base.left, y1 = a.top + a.height / 2 - base.top, x2 = b.left - base.left, y2 = b.top + b.height / 2 - base.top, dx = Math.abs(x1 - x2) * 0.5;
      html += '<path class="w-i' + (doneFlags[i] ? '' : ' w-empty') + '" d="M' + r2(x1) + ' ' + r2(y1) + 'C' + r2(x1 + dx) + ' ' + r2(y1) + ' ' + r2(x2 - dx) + ' ' + r2(y2) + ' ' + r2(x2) + ' ' + r2(y2) + '"/>';
    }
    wsvg.innerHTML = html;
  }

  function render() {
    var total = 0;
    boxes.forEach(function (b) { b.checked = Progress.get(b.getAttribute('data-id')); if (b.checked) total++; });
    $('#prog-n').textContent = String(total);
    $('#drill-n').textContent = String(qids.filter(function (q) { return Progress.get(q); }).length);
    var next = sessions.filter(function (s) { return $$('.ticks input', s).some(function (b) { return !b.checked; }); })[0], cont = $('#cont');
    if (cont) {
      if (next) { cont.href = '#' + next.id; cont.textContent = 'Continue at session ' + $('.sn', next).textContent; cont.hidden = false; }
      else { cont.href = '#capstone'; cont.textContent = 'Course complete'; }
    }
    stages.forEach(function (s, i) {
      var bs = $$('.ticks input', s), n = bs.filter(function (b) { return b.checked; }).length;
      var link = links.filter(function (l) { return l.getAttribute('data-stage') === s.getAttribute('data-stage'); })[0];
      if (!link) return;
      var done = bs.length > 0 && n === bs.length;
      doneFlags[i] = done;
      link.classList.toggle('done', done);
      $('.cnt', link).textContent = n + '/' + bs.length;
      link.setAttribute('aria-label', $('.plate', link).textContent + ', ' + n + ' of ' + bs.length + ' steps ticked' + (done ? ', complete' : ''));
    });
    railWires();
  }
  Progress.onChange(render);
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.matches && t.matches('.ticks input[type="checkbox"]')) Progress.set(t.getAttribute('data-id'), t.checked);
  });
  Progress.init();

  var reset = $('#reset'), armed = null;
  reset.addEventListener('click', function () {
    if (armed) { clearTimeout(armed); armed = null; Progress.reset(); reset.classList.remove('armed'); reset.textContent = 'Progress reset'; setTimeout(function () { reset.textContent = 'Reset my progress'; }, 2500); return; }
    reset.classList.add('armed'); reset.textContent = 'Click again to clear every tick';
    armed = setTimeout(function () { armed = null; reset.classList.remove('armed'); reset.textContent = 'Reset my progress'; }, 5000);
  });

  // which stage is on screen
  if (window.IntersectionObserver) {
    var strip = $('.rail ol');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.getAttribute('data-stage');
        links.forEach(function (l) {
          var on = l.getAttribute('data-stage') === id;
          if (on) { l.setAttribute('aria-current', 'true'); if (strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: l.parentNode.offsetLeft - 16, behavior: 'auto' }); }
          else l.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    stages.forEach(function (s) { io.observe(s); });
  }
  if (window.ResizeObserver) new ResizeObserver(railWires).observe(chain);
  window.addEventListener('resize', railWires);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(railWires);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
