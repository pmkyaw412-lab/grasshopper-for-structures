/* ---------- small helpers ---------- */
var NS = 'http://www.w3.org/2000/svg';
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function el(tag, attrs, kids) {
  var e = document.createElement(tag), k;
  if (attrs) for (k in attrs) { if (attrs[k] != null) e.setAttribute(k, attrs[k]); }
  if (kids != null) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
    if (c == null) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function num(v, d) {
  var s = Math.abs(v).toFixed(d == null ? 1 : d);
  return (v < 0 && Number(s) !== 0 ? '−' : '') + s;
}
function r2(v) { return Math.round(v * 100) / 100; }
var uid = 0;

/* ---------- Grasshopper-style definition renderer ----------
   spec = { label, cols: [[node,...],...] | [{align, nodes:[...]}], wires: [[from,to,type]] | function(values) }
   node types: s slider, c component, p panel, v value list, b boolean toggle */
function buildDef(host, spec, onChange) {
  var scroll = el('div', { 'class': 'def-scroll', role: 'group', 'aria-label': spec.label || 'Grasshopper definition' });
  var canvas = el('div', { 'class': 'def-canvas' });
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'wires'); svg.setAttribute('aria-hidden', 'true');
  canvas.appendChild(svg);
  var nodes = {}, values = {}, pre = 'd' + (++uid) + '-';

  function fire(id) { if (onChange) onChange(values, id); draw(); }

  function makeNode(n) {
    var e, input, out;
    if (n.t === 's') {
      var d = n.d == null ? (n.step && n.step < 1 ? 1 : 0) : n.d;
      values[n.id] = n.v;
      if (n.live === false || !onChange) {
        var pct = (n.v - n.min) / (n.max - n.min) * 100;
        e = el('div', { 'class': 'gh-slider' }, [
          el('span', { 'class': 'nm' }, n.n),
          el('span', { 'class': 'track' }, el('i', { style: '--p:' + pct + '%' })),
          el('span', { 'class': 'val' }, n.v.toFixed(d))
        ]);
      } else {
        input = el('input', { type: 'range', id: pre + n.id, min: n.min, max: n.max, step: n.step || 1, value: n.v, 'aria-label': n.aria || n.n });
        out = el('output', { 'for': pre + n.id }, n.v.toFixed(d));
        e = el('label', { 'class': 'gh-slider' }, [el('span', { 'class': 'nm' }, n.n), input, out]);
        input.addEventListener('input', function () {
          values[n.id] = parseFloat(input.value);
          out.textContent = values[n.id].toFixed(d);
          fire(n.id);
        });
      }
    } else if (n.t === 'c') {
      var ins = el('span', { 'class': 'io in' }), outs = el('span', { 'class': 'io out' });
      (n['in'] || []).forEach(function (p) { ins.appendChild(el('span', { 'data-port': p }, p || ' ')); });
      (n.out || []).forEach(function (p) { outs.appendChild(el('span', { 'data-port': p }, p || ' ')); });
      var plate;
      if (n.opts) {
        values[n.id] = n.v;
        plate = el('select', { 'class': 'plate', id: pre + n.id, 'aria-label': n.aria || 'Component' });
        n.opts.forEach(function (o) { var op = el('option', { value: o[0] }, o[1]); if (o[0] === n.v) op.selected = true; plate.appendChild(op); });
        plate.addEventListener('change', function () { values[n.id] = plate.value; fire(n.id); });
      } else {
        plate = el('span', { 'class': 'plate' }, n.n);
      }
      e = el('div', { 'class': 'gh-comp' + (n.cls ? ' ' + n.cls : ''), title: n.title || null }, [ins, plate, outs]);
      if (n.balloon) e.appendChild(el('span', { 'class': 'balloon', title: n.balloon, 'aria-hidden': 'true' }, '!'));
      e.setAttribute('data-name', n.n || 'component');
    } else if (n.t === 'p') {
      e = el('div', { 'class': 'gh-panel' + (n['in'] === false ? '' : ' has-in') + (n.out ? ' has-out' : '') });
      if (n.title) e.appendChild(el('span', { 'class': 'pt' }, n.title));
      e.appendChild(el('span', { 'class': 'tx' }, n.txt || ''));
    } else if (n.t === 'v') {
      values[n.id] = n.v;
      input = el('select', { id: pre + n.id, 'aria-label': n.aria || n.n });
      n.opts.forEach(function (o) { var op = el('option', { value: o[0] }, o[1]); if (o[0] === n.v) op.selected = true; input.appendChild(op); });
      e = el('label', { 'class': 'gh-pick' }, [el('span', { 'class': 'nm' }, n.n), input]);
      input.addEventListener('change', function () { values[n.id] = input.value; fire(n.id); });
    } else if (n.t === 'b') {
      values[n.id] = !!n.v;
      input = el('button', { type: 'button', id: pre + n.id, 'aria-pressed': String(!!n.v), 'aria-label': n.n + ' toggle' }, n.v ? 'True' : 'False');
      e = el('div', { 'class': 'gh-pick' }, [el('span', { 'class': 'nm' }, n.n), input]);
      input.addEventListener('click', function () {
        values[n.id] = !values[n.id];
        input.setAttribute('aria-pressed', String(values[n.id]));
        input.textContent = values[n.id] ? 'True' : 'False';
        fire(n.id);
      });
    }
    e.setAttribute('data-node', n.id);
    nodes[n.id] = e;
    return e;
  }

  spec.cols.forEach(function (col) {
    var list = Array.isArray(col) ? col : col.nodes;
    var c = el('div', { 'class': 'def-col' });
    if (!Array.isArray(col) && col.align) c.style.alignSelf = col.align;
    list.forEach(function (n) { c.appendChild(makeNode(n)); });
    canvas.appendChild(c);
  });
  scroll.appendChild(canvas);
  host.appendChild(scroll);

  function anchor(ref, side, base) {
    var parts = ref.split('.'), node = nodes[parts[0]];
    if (!node) return null;
    var nr = node.getBoundingClientRect(), y = nr.top + nr.height / 2;
    if (parts.length > 1) {
      var port = node.querySelector('.io.' + (side === 'out' ? 'out' : 'in') + ' [data-port="' + parts[1] + '"]');
      if (port) { var pr = port.getBoundingClientRect(); y = pr.top + pr.height / 2; }
    }
    return { x: (side === 'out' ? nr.right : nr.left) - base.left, y: y - base.top };
  }
  function draw() {
    var base = canvas.getBoundingClientRect(), html = '';
    var wires = typeof spec.wires === 'function' ? spec.wires(values) : spec.wires;
    (wires || []).forEach(function (w) {
      var a = anchor(w[0], 'out', base), b = anchor(w[1], 'in', base);
      if (!a || !b) return;
      var dx = Math.max(24, Math.abs(b.x - a.x) * 0.5);
      var d = 'M' + r2(a.x) + ' ' + r2(a.y) + 'C' + r2(a.x + dx) + ' ' + r2(a.y) + ' ' + r2(b.x - dx) + ' ' + r2(b.y) + ' ' + r2(b.x) + ' ' + r2(b.y);
      var t = w[2] || 'i';
      html += '<path class="w-' + t + '" d="' + d + '"/>';
      if (t !== 'i') html += '<path class="w-' + t + '2" d="' + d + '"/>';
    });
    svg.innerHTML = html;
    if (scroll.scrollWidth > scroll.clientWidth + 2) scroll.setAttribute('tabindex', '0'); else scroll.removeAttribute('tabindex');
  }
  if (window.ResizeObserver) new ResizeObserver(draw).observe(canvas);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  requestAnimationFrame(draw);

  return {
    values: values, el: scroll, redraw: draw,
    panel: function (id, text) { var p = nodes[id] && nodes[id].querySelector('.tx'); if (p) p.textContent = text; },
    plate: function (id, text) { var p = nodes[id] && nodes[id].querySelector('.plate'); if (p && p.tagName !== 'SELECT') p.textContent = text; },
    state: function (id, cls) { var n = nodes[id]; if (!n) return; n.classList.remove('warn', 'sel'); if (cls) n.classList.add(cls); },
    limit: function (id, max) {
      var i = nodes[id] && nodes[id].querySelector('input'); if (!i) return;
      i.max = max;
      if (values[id] > max) { values[id] = max; i.value = max; nodes[id].querySelector('output').textContent = String(max); }
    }
  };
}

/* ---------- viewport: world coordinates to an SVG that looks like a Rhino view ---------- */
function Viewport(host, name, W, H, keepH) {
  var narrow = window.matchMedia && window.matchMedia('(max-width: 560px)').matches;
  if (narrow) { H = keepH ? H : Math.round(H * 420 / W * 1.18); W = 420; }
  var box = el('div', { 'class': 'vp' + (narrow ? ' vp-narrow' : '') });
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('role', 'img');
  box.appendChild(svg); box.appendChild(el('span', { 'class': 'vp-name', 'aria-hidden': 'true' }, name));
  host.appendChild(box);
  var buf = [], v = { W: W, H: H, s: 1, box: box, narrow: narrow };
  v.fit = function (xmin, xmax, zmin, zmax, pad) {
    pad = pad || {}; var l = pad.l == null ? 44 : pad.l, r = pad.r == null ? 44 : pad.r, t = pad.t == null ? 44 : pad.t, b = pad.b == null ? 40 : pad.b;
    var dx = (xmax - xmin) || 1, dz = (zmax - zmin) || 1;
    var s = Math.min((W - l - r) / dx, (H - t - b) / dz);
    var ox = l + ((W - l - r) - s * dx) / 2 - s * xmin, oz = H - b - ((H - t - b) - s * dz) / 2 + s * zmin;
    v.s = s; v.X = function (x) { return r2(ox + s * x); }; v.Z = function (z) { return r2(oz - s * z); };
    v.toWorld = function (px, py) { return [(px - ox) / s, (oz - py) / s]; };
    return v;
  };
  v.begin = function (grid) {
    buf = [];
    if (grid !== false) {
      var steps = [0.5, 1, 2, 5, 10, 20], st = steps[steps.length - 1], i, g;
      for (i = 0; i < steps.length; i++) if (steps[i] * v.s >= 22) { st = steps[i]; break; }
      var x0 = (0 - v.X(0)) / v.s, x1 = (W - v.X(0)) / v.s, z1 = v.Z(0) / v.s, z0 = (v.Z(0) - H) / v.s;
      for (g = Math.ceil(x0 / st) * st; g <= x1; g += st) buf.push('<line class="g-grid" x1="' + v.X(g) + '" y1="0" x2="' + v.X(g) + '" y2="' + H + '"/>');
      for (g = Math.ceil(z0 / st) * st; g <= z1; g += st) buf.push('<line class="g-grid" x1="0" y1="' + v.Z(g) + '" x2="' + W + '" y2="' + v.Z(g) + '"/>');
      buf.push('<line class="g-axx" x1="0" y1="' + v.Z(0) + '" x2="' + W + '" y2="' + v.Z(0) + '"/>');
      buf.push('<line class="g-axz" x1="' + v.X(0) + '" y1="0" x2="' + v.X(0) + '" y2="' + H + '"/>');
    }
    return v;
  };
  v.line = function (x1, z1, x2, z2, cls, sw) {
    buf.push('<line class="' + cls + '" x1="' + v.X(x1) + '" y1="' + v.Z(z1) + '" x2="' + v.X(x2) + '" y2="' + v.Z(z2) + '"' + (sw ? ' stroke-width="' + r2(sw) + '"' : '') + '/>');
  };
  v.poly = function (pts, cls, close) {
    buf.push('<path class="' + cls + '" d="M' + pts.map(function (p) { return v.X(p[0]) + ' ' + v.Z(p[1]); }).join('L') + (close ? 'Z' : '') + '"/>');
  };
  v.dot = function (x, z, cls, r) { buf.push('<circle class="' + (cls || 'pt') + '" cx="' + v.X(x) + '" cy="' + v.Z(z) + '" r="' + (r || 3.6) + '"/>'); };
  v.text = function (x, z, str, cls, anchor, dx, dy) {
    buf.push('<text' + (cls ? ' class="' + cls + '"' : '') + ' x="' + r2(v.X(x) + (dx || 0)) + '" y="' + r2(v.Z(z) + (dy || 0)) + '" text-anchor="' + (anchor || 'middle') + '">' + esc(str) + '</text>');
  };
  v.label = function (px, py, str, cls, anchor) {
    buf.push('<text' + (cls ? ' class="' + cls + '"' : '') + ' x="' + px + '" y="' + py + '" text-anchor="' + (anchor || 'start') + '">' + esc(str) + '</text>');
  };
  v.pin = function (x, z) { var X = v.X(x), Z = v.Z(z); buf.push('<path class="sup" d="M' + X + ' ' + Z + 'l-9 15h18z"/>'); };
  v.roller = function (x, z) { var X = v.X(x), Z = v.Z(z); buf.push('<path class="sup" d="M' + X + ' ' + Z + 'l-9 13h18zM' + (X - 11) + ' ' + (Z + 18) + 'h22"/>'); };
  v.fixedBase = function (x, z) { var X = v.X(x), Z = v.Z(z); buf.push('<path class="sup" d="M' + (X - 13) + ' ' + Z + 'h26M' + (X - 13) + ' ' + Z + 'l-5 7M' + (X - 5) + ' ' + Z + 'l-5 7M' + (X + 3) + ' ' + Z + 'l-5 7M' + (X + 11) + ' ' + Z + 'l-5 7"/>'); };
  // arrow given in pixels: tip at world (x,z), tail offset (px, py) in screen pixels
  v.arrow = function (x, z, px, py) {
    var X = v.X(x), Z = v.Z(z), L = Math.sqrt(px * px + py * py) || 1, ux = px / L, uy = py / L;
    buf.push('<path class="ld" d="M' + r2(X + px) + ' ' + r2(Z + py) + 'L' + X + ' ' + Z + '"/>');
    buf.push('<path class="ldh" d="M' + X + ' ' + Z + 'L' + r2(X + ux * 8 - uy * 3.5) + ' ' + r2(Z + uy * 8 + ux * 3.5) + 'L' + r2(X + ux * 8 + uy * 3.5) + ' ' + r2(Z + uy * 8 - ux * 3.5) + 'Z"/>');
  };
  v.raw = function (s) { buf.push(s); };
  v.end = function (label) { svg.innerHTML = buf.join(''); svg.setAttribute('aria-label', label || name + ' viewport'); };
  v.svg = svg;
  /* drag a handle: onMove receives world coordinates */
  v.drag = function (selector, onMove) {
    var active = false;
    svg.classList.add('vp-touch');
    function pt(ev) { var m = svg.getScreenCTM(); if (!m) return null; var q = svg.createSVGPoint(); q.x = ev.clientX; q.y = ev.clientY; q = q.matrixTransform(m.inverse()); return v.toWorld(q.x, q.y); }
    svg.addEventListener('pointerdown', function (ev) { if (!ev.target.closest || !ev.target.closest(selector)) return; active = true; svg.classList.add('dragging'); try { svg.setPointerCapture(ev.pointerId); } catch (e) {} ev.preventDefault(); });
    svg.addEventListener('pointermove', function (ev) { if (!active) return; var w = pt(ev); if (w) onMove(w[0], w[1]); });
    var stop = function () { active = false; svg.classList.remove('dragging'); };
    svg.addEventListener('pointerup', stop); svg.addEventListener('pointercancel', stop);
  };
  return v;
}
/* isometric projection for the Perspective view: returns [u, v] with v up */
function iso(x, y, z) { return [(x - y) * 0.866, (x + y) * 0.42 + z]; }

function readout(host, rows) {
  var dl = el('dl', { 'class': 'readout' });
  var cells = rows.map(function (r) { var dd = el('dd', null, ''); dl.appendChild(el('div', null, [el('dt', null, r), dd])); return dd; });
  host.appendChild(dl);
  return function (vals) { vals.forEach(function (t, i) { if (cells[i]) cells[i].textContent = t; }); };
}

/* ---------- progress: checklist state, saved per person ---------- */
var Progress = (function () {
  var KEY = 'gh-structures-progress-v1', state = {}, docRef = null, writing = false, dirty = false, timer = null, listeners = [];
  function readLocal() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function writeLocal() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } }
  var auth = null, fs = null, unsub = null, who = null, merged = false;
  function label(mode) {
    var s = $('#save-state'); if (!s) return;
    s.textContent = mode === 'account' ? (auth ? 'Saved to your Google account' : 'Saved to your account') : mode === 'saving' ? 'Saving' : mode === 'offline' ? 'Offline, saved in this browser' : 'Saved in this browser';
  }
  function authButton(user) {
    var b = $('#auth-btn'); if (!b) return;
    b.hidden = !auth;
    b.textContent = user ? 'Sign out' : 'Sign in';
    b.title = user ? 'Signed in as ' + (user.email || '') : 'Save your progress to your Google account';
  }
  function emit() { listeners.forEach(function (f) { f(state); }); }
  function flush() {
    if (!docRef || writing) return;
    writing = true; dirty = false; label('saving');
    var body = { ticked: Object.assign({}, state) };
    docRef.set(body).then(function () { label('account'); }, function (e) {
      if (e && e.code === 'unavailable') dirty = true; else { docRef = null; label('browser'); }
    }).then(function () {
      writing = false;
      if (dirty && docRef) { clearTimeout(timer); timer = setTimeout(flush, 1500); }
    });
  }
  function queue() { if (!docRef) return; dirty = true; clearTimeout(timer); timer = setTimeout(flush, 700); }
  /* Firebase: Google sign-in, progress at users/{uid} in Firestore */
  function connectFirebase() {
    var fb = window.firebase, cfg = window.FIREBASE_CONFIG;
    try { fb.initializeApp(cfg); auth = fb.auth(); fs = fb.firestore(); } catch (e) { auth = null; return; }
    authButton(null);
    var btn = $('#auth-btn'), leaving = false;
    if (btn) btn.addEventListener('click', function () {
      if (auth.currentUser) { leaving = true; auth.signOut(); return; }
      var p = new fb.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      auth.signInWithPopup(p).catch(function (e) {
        var c = e && e.code;
        if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment') auth.signInWithRedirect(p);
        else if (c !== 'auth/popup-closed-by-user' && c !== 'auth/cancelled-popup-request') { var s = $('#save-state'); if (s) s.textContent = 'Sign-in failed, please try again'; }
      });
    });
    auth.onAuthStateChanged(function (user) {
      if (unsub) { unsub(); unsub = null; }
      docRef = null; merged = false; dirty = false; clearTimeout(timer);
      authButton(user);
      if (!user) {
        who = null;
        if (leaving) { leaving = false; state = {}; writeLocal(); emit(); } // signed out: the account keeps the progress
        label('browser'); return;
      }
      who = user.email || user.displayName || null;
      docRef = fs.collection('users').doc(user.uid);
      unsub = docRef.onSnapshot(function (snap) {
        if (snap.metadata && snap.metadata.hasPendingWrites) return;
        var remote = snap.exists ? ((snap.data() || {}).ticked || {}) : null;
        if (!merged) {
          // first look after signing in: keep everything ticked here or in the account
          merged = true;
          var m = Object.assign({}, remote || {}), added = false;
          Object.keys(state).forEach(function (k) { if (!(k in m)) { m[k] = state[k]; added = true; } });
          state = m; writeLocal(); emit();
          if (added) queue(); else label('account');
          return;
        }
        if (remote && !dirty && !writing) { state = Object.assign({}, remote); writeLocal(); emit(); }
        if (!dirty && !writing) label('account');
      }, function () { docRef = null; label('browser'); });
    });
  }
  function connect() {
    if (window.firebase && window.FIREBASE_CONFIG) { connectFirebase(); return; }
    if (!window.claude || typeof window.claude.use !== 'function') return;
    Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function (r) {
      var db = r[0], user = r[1];
      if (!db || !user) return null;
      return user.id().then(function (id) {
        if (!id) return;
        docRef = db.doc('data/users/' + id + '/progress');
        docRef.onSnapshot(function (snap) {
          if (snap.metadata && snap.metadata.hasPendingWrites) return;
          if (snap.exists && !dirty && !writing) {
            var d = snap.data() || {};
            state = Object.assign({}, d.ticked || {});
            writeLocal(); emit();
          } else if (!snap.exists && Object.keys(state).length) {
            queue(); // first visit with an account: upload ticks made in this browser
          }
          label('account');
        }, function () { docRef = null; label('browser'); });
      });
    }).catch(function () { docRef = null; label('browser'); });
  }
  return {
    init: function () { state = readLocal(); label('browser'); emit(); connect(); },
    get: function (id) { return !!state[id]; },
    val: function (id) { return state[id] && typeof state[id] === 'object' ? state[id] : null; },
    setVal: function (id, v) { if (v == null) delete state[id]; else state[id] = v; writeLocal(); queue(); },
    count: function (prefix) { return Object.keys(state).filter(function (k) { return k.indexOf(prefix) === 0 && state[k] === true; }).length; },
    set: function (id, on) { if (on) state[id] = true; else delete state[id]; writeLocal(); emit(); queue(); },
    reset: function () { state = {}; writeLocal(); emit(); queue(); },
    onChange: function (f) { listeners.push(f); }
  };
})();
