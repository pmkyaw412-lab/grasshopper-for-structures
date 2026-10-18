/* ---------- practice: predict drills, bug hunts, option matrices ---------- */
function initPractice() {
  var restorers = [];

  /* predict-the-output drills */
  $$('.drill').forEach(function (d) {
    var qid = d.getAttribute('data-qid'), ans = d.getAttribute('data-answer');
    var check = $('.check', d), show = $('.show', d), fb = $('.fb', d), why = $('.why', d);
    var radios = $$('input[type="radio"]', d), state = '';
    function clearMarks() { $$('.opt', d).forEach(function (o) { o.classList.remove('wrong', 'right'); }); }
    function solve(byYou, quiet) {
      state = byYou ? 'you' : 'shown';
      clearMarks();
      radios[+ans].checked = true;
      radios[+ans].closest('.opt').classList.add('right');
      why.hidden = false; show.hidden = true; check.hidden = true;
      fb.className = 'fb' + (byYou ? ' ok' : '');
      fb.textContent = byYou ? (quiet ? 'Answered correctly.' : 'Correct.') : 'Here is the answer. It does not count as answered.';
    }
    function unsolve() {
      state = ''; clearMarks(); why.hidden = true; check.hidden = false; show.hidden = true;
      radios.forEach(function (r) { r.checked = false; }); fb.textContent = ''; fb.className = 'fb';
    }
    radios.forEach(function (r) {
      r.addEventListener('change', function () { if (state) return; clearMarks(); fb.textContent = ''; fb.className = 'fb'; });
    });
    check.addEventListener('click', function () {
      var c = radios.filter(function (r) { return r.checked; })[0];
      if (!c) { fb.textContent = 'Pick an option first.'; fb.className = 'fb no'; return; }
      if (c.value === ans) { solve(true); Progress.set(qid, true); }
      else {
        c.closest('.opt').classList.add('wrong');
        fb.textContent = 'Not this one. Try another option, or show the answer.'; fb.className = 'fb no';
        show.hidden = false;
      }
    });
    show.addEventListener('click', function () { solve(false); });
    restorers.push(function () {
      if (Progress.get(qid) && state !== 'you') solve(true, true);
      else if (!Progress.get(qid) && state === 'you') unsolve();
    });
  });

  /* fix-the-bug: pick a component on the canvas */
  $$('.bug').forEach(function (b) {
    var qid = b.getAttribute('data-qid'), answers = b.getAttribute('data-answer').split('|');
    var fb = $('.fb', b), why = $('.why', b), hint = $('.bug-hint', b), show = $('.show', b), state = '';
    var nodes = $$('[data-node]', b);
    function finish(byYou, quiet) {
      state = byYou ? 'you' : 'shown';
      nodes.forEach(function (n) {
        n.classList.remove('miss');
        if (answers.indexOf(n.getAttribute('data-node')) >= 0) n.classList.add('found');
      });
      why.hidden = false; hint.hidden = true; show.hidden = true;
      fb.className = 'fb' + (byYou ? ' ok' : '');
      fb.textContent = byYou ? (quiet ? 'Found it earlier.' : 'Found it.') : 'Here is the answer. It does not count as found.';
    }
    function reset() {
      state = ''; nodes.forEach(function (n) { n.classList.remove('miss', 'found'); });
      why.hidden = true; hint.hidden = true; show.hidden = true; fb.textContent = ''; fb.className = 'fb';
    }
    nodes.forEach(function (n) {
      var name = n.getAttribute('data-name') || ($('.nm', n) && $('.nm', n).textContent) || ($('.pt', n) && $('.pt', n).textContent + ' panel') || 'panel';
      n.classList.add('pickable'); n.setAttribute('tabindex', '0'); n.setAttribute('role', 'button');
      n.setAttribute('aria-label', 'Pick ' + name);
      function pick() {
        if (state) return;
        if (answers.indexOf(n.getAttribute('data-node')) >= 0) { finish(true); Progress.set(qid, true); }
        else {
          n.classList.add('miss');
          fb.textContent = 'Not this one. ' + name.charAt(0).toUpperCase() + name.slice(1) + ' is doing what it was asked to do.'; fb.className = 'fb no';
          hint.hidden = false; show.hidden = false;
        }
      }
      n.addEventListener('click', pick);
      n.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    show.addEventListener('click', function () { finish(false); });
    restorers.push(function () {
      if (Progress.get(qid) && state !== 'you') finish(true, true);
      else if (!Progress.get(qid) && state === 'you') reset();
    });
  });

  /* option matrix: weighted, normalised scores */
  $$('.matrix').forEach(function (m) {
    var id = 'm:' + m.getAttribute('data-mid'), n = +m.getAttribute('data-n');
    var rows = $$('tbody tr', m).filter(function (tr) { return !tr.classList.contains('score'); });
    var names = $$('thead th', m).slice(2).map(function (th) { return th.textContent; });
    var cells = $$('tr.score td[data-score]', m), out = $('.mx-out', m);
    function read() {
      return { w: rows.map(function (tr) { return +$('select', tr).value; }), v: rows.map(function (tr) { return $$('input', tr).map(function (i) { return i.value; }); }) };
    }
    function fill(st) {
      if (!st) return;
      rows.forEach(function (tr, ci) {
        var s = $('select', tr); if (st.w && st.w[ci] != null && document.activeElement !== s) s.value = st.w[ci];
        $$('input', tr).forEach(function (inp, oi) { if (document.activeElement !== inp && st.v && st.v[ci]) inp.value = st.v[ci][oi] == null ? '' : st.v[ci][oi]; });
      });
    }
    function compute() {
      var tot = new Array(n).fill(0), W = 0, skipped = 0;
      rows.forEach(function (tr) {
        var w = +$('select', tr).value, vals = $$('input', tr).map(function (i) { return i.value === '' ? NaN : parseFloat(i.value); });
        if (vals.some(isNaN)) { if (vals.some(function (v) { return !isNaN(v); })) skipped++; return; }
        if (!w) return;
        var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), low = tr.getAttribute('data-better') === 'low';
        vals.forEach(function (v, o) { tot[o] += w * (hi === lo ? 1 : low ? (hi - v) / (hi - lo) : (v - lo) / (hi - lo)); });
        W += w;
      });
      cells.forEach(function (c) { c.classList.remove('win'); c.textContent = '-'; });
      if (!W) { out.textContent = 'Fill in a row for every option to see the ranking.'; return; }
      var sc = tot.map(function (t) { return Math.round(100 * t / W); }), best = sc.indexOf(Math.max.apply(null, sc));
      cells.forEach(function (c, o) { c.textContent = String(sc[o]); var bar = el('i', { style: 'width:' + Math.max(2, sc[o]) + '%', 'aria-hidden': 'true' }); c.appendChild(bar); });
      cells[best].classList.add('win');
      var order = sc.map(function (s, o) { return [s, o]; }).sort(function (a, b) { return b[0] - a[0]; });
      out.textContent = names[order[0][1]] + ' ranks first with ' + order[0][0] + ' out of 100' + (order[1] ? ', then ' + names[order[1][1]] + ' with ' + order[1][0] : '') + '.' +
        (skipped ? ' ' + skipped + (skipped > 1 ? ' rows are' : ' row is') + ' only partly filled and not counted yet.' : '') +
        ' Scores compare the options with each other, so they change when you add or change a value.';
    }
    m.addEventListener('input', function () { compute(); Progress.setVal(id, read()); });
    m.addEventListener('change', function () { compute(); Progress.setVal(id, read()); });
    restorers.push(function () { fill(Progress.val(id)); compute(); });
  });

  Progress.onChange(function () { restorers.forEach(function (f) { f(); }); });
}
