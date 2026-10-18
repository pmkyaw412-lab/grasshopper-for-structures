// Drives the site build with a stand-in for the Firebase compat SDK, so the
// sign-in, merge, sync and sign-out paths can be checked without the network.
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
const MOCK = `
(function(){
  var KEY='mockfs', U='mockuser';
  function db(){ try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}} }
  function save(d){ localStorage.setItem(KEY, JSON.stringify(d)); }
  var listeners={};
  function snap(p){ var d=db()[p]; return {exists:!!d, data:function(){return d?JSON.parse(JSON.stringify(d)):undefined}, metadata:{hasPendingWrites:false}}; }
  function docRef(p){ return {
    set:function(b){ window.__writes=(window.__writes||0)+1; var d=db(); d[p]=JSON.parse(JSON.stringify(b)); save(d);
      setTimeout(function(){ (listeners[p]||[]).forEach(function(f){f(snap(p))}); },20); return Promise.resolve(); },
    onSnapshot:function(cb){ (listeners[p]=listeners[p]||[]).push(cb); setTimeout(function(){cb(snap(p))},30);
      return function(){ listeners[p]=listeners[p].filter(function(f){return f!==cb}); }; } }; }
  var authObj={ currentUser: JSON.parse(sessionStorage.getItem(U)||'null'), _cbs:[],
    onAuthStateChanged:function(cb){ this._cbs.push(cb); var u=this.currentUser; setTimeout(function(){cb(u)},10); },
    _fire:function(){ var u=this.currentUser; this._cbs.forEach(function(f){f(u)}); },
    signInWithPopup:function(){ this.currentUser={uid:'u1',email:'eric@example.com'}; sessionStorage.setItem(U, JSON.stringify(this.currentUser)); this._fire(); return Promise.resolve({}); },
    signInWithRedirect:function(){}, signOut:function(){ this.currentUser=null; sessionStorage.removeItem(U); this._fire(); return Promise.resolve(); } };
  var fsObj={ collection:function(c){ return {doc:function(id){ return docRef(c+'/'+id); }}; } };
  var auth=function(){return authObj}; auth.GoogleAuthProvider=function(){ this.setCustomParameters=function(){}; };
  window.firebase={ initializeApp:function(){}, auth:auth, firestore:function(){return fsObj} };
})();`;
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8')
    .replace(/<script src="https:\/\/www\.gstatic\.com[^"]*app-compat\.js"><\/script>/, '<script>' + MOCK + '</script>')
    .replace(/<script src="https:\/\/www\.gstatic\.com[^"]*"><\/script>\n/g, '')
    .replace(/https:\/\/fonts\.googleapis\.com[^"]*/, '');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('https://course.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
  const state = () => page.evaluate(() => ({ label: document.querySelector('#save-state').textContent, btn: document.querySelector('#auth-btn').textContent, hidden: document.querySelector('#auth-btn').hidden,
    n: document.querySelector('#prog-n').textContent, remote: JSON.parse(localStorage.getItem('mockfs') || '{}')['users/u1'] }));
  await page.goto('https://course.test/'); await page.waitForTimeout(400);
  let s = await state();
  ok(!s.hidden && s.btn === 'Sign in' && s.label === 'Saved in this browser', 'signed out: button shows, saved in browser');
  // ticks before signing in, and something already in the account
  await page.evaluate(() => { localStorage.setItem('mockfs', JSON.stringify({ 'users/u1': { ticked: { 's1-a': true, 'q:x': true } } })); });
  for (const id of ['s2-a', 's2-b']) await page.click('input[data-id="' + id + '"]', { force: true });
  s = await state(); ok(s.n === '2', 'two ticks while signed out (n=' + s.n + ')');
  await page.click('#auth-btn'); await page.waitForTimeout(1200);
  s = await state();
  ok(s.btn === 'Sign out', 'button flips to Sign out');
  ok(s.n === '3', 'merged: account tick plus two local ticks (n=' + s.n + ')');
  ok(s.remote && s.remote.ticked['s2-a'] && s.remote.ticked['s1-a'] && s.remote.ticked['q:x'], 'merged ticks uploaded to the account');
  ok(s.label === 'Saved to your Google account', 'label: ' + s.label);
  await page.click('input[data-id="s3-a"]', { force: true }); await page.waitForTimeout(1200);
  s = await state(); ok(s.remote.ticked['s3-a'] === true, 'new tick syncs to the account');
  await page.click('input[data-id="s3-a"]', { force: true }); await page.waitForTimeout(1200);
  s = await state(); ok(!('s3-a' in s.remote.ticked), 'untick syncs to the account');
  // another device changes the account: snapshot should update this page
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('mockfs')); d['users/u1'].ticked['s4-a'] = true; localStorage.setItem('mockfs', JSON.stringify(d)); });
  await page.reload(); await page.waitForTimeout(800);
  s = await state(); ok(s.btn === 'Sign out' && s.n === '4' && await page.isChecked('input[data-id="s4-a"]'), 'reload: still signed in, progress from account (n=' + s.n + ')');
  await page.click('#auth-btn'); await page.waitForTimeout(300);
  s = await state(); ok(s.btn === 'Sign in' && s.n === '0' && s.remote.ticked['s4-a'], 'sign out clears this browser, account keeps progress');
  await page.click('#auth-btn'); await page.waitForTimeout(800);
  s = await state(); ok(s.n === '4', 'sign back in restores (n=' + s.n + ')');
  // phone width: bar must not overflow
  await page.setViewportSize({ width: 390, height: 800 }); await page.waitForTimeout(200);
  const ov = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, bar: document.querySelector('.bar .wrap').scrollWidth, w: innerWidth }));
  ok(ov.doc <= ov.w && ov.bar <= ov.w, 'no overflow at 390px ' + JSON.stringify(ov));
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'site-bar-390.png'), clip: { x: 0, y: 0, width: 390, height: 120 } });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'site-bar-1440.png'), clip: { x: 0, y: 0, width: 1440, height: 120 } });
  ok(errs.length === 0, 'no console errors ' + (errs.slice(0, 3).join(' | ')));
  await browser.close();
})();
