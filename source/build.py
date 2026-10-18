#!/usr/bin/env python3
"""Assemble the course page from parts.

Authoring shorthands expanded here:
  <drill id=".."> <q>..</q> [<def name=".."/>] <o>..</o> <o correct>..</o> <why>..</why> </drill>
  <challenge id=".." title=".."> <task>..</task> <done><li>..</li></done> <hint>..</hint> <solution>..</solution> </challenge>
  <bug id=".." def=".." answer=".."> <q>..</q> <hint>..</hint> <why>..</why> </bug>
  <matrix id=".." options="A|B|C"> <c name=".." unit=".." better="low|high" w="3"/> ... </matrix>
  {{sn}} session number, {{n:id}} number of the session with that id, {{count}}, {{sims}}, {{weeks}}, {{months}}
"""
import re, sys, pathlib, html
root = pathlib.Path(__file__).parent
P = lambda n: (root / 'parts' / n).read_text(encoding='utf8')

ORDER = ['b00_top.html', 'b01_setup_rhino.html', 'b02_first.html', 'b03_lists.html', 'b04_trees.html',
         'b06_geometry.html', 'b07_form.html', 'b08_analysis.html', 'b09_members.html', 'b10_optimise.html',
         'b11_formfinding.html', 'b12_projects.html', 'b13_reference.html']
body = ''.join(P(n) for n in ORDER if (root / 'parts' / n).exists())

# ---------- practice blocks for existing sessions: <practice for="sid">..</practice> ----------
import os
prac = ''.join(P(n) for n in sorted(os.listdir(root / 'parts')) if n.startswith('practice') and n.endswith('.html'))
for sid, block in re.findall(r'<practice for="([^"]+)">(.*?)</practice>', prac, re.S):
    m = re.search(r'<article class="session" id="%s".*?(<h4>Checklist</h4>)' % re.escape(sid), body, re.S)
    assert m, 'no checklist for ' + sid
    body = body[:m.start(1)] + '<div class="practice"><h4>Practice</h4>' + block + '</div>\n\n    ' + body[m.start(1):]

def attrs(s):
    return dict(re.findall(r'(\w[\w-]*)="([^"]*)"', s))

# ---------- drills ----------
def drill(m):
    a = attrs(m.group(1)); inner = m.group(2); did = a['id']
    q = re.search(r'<q>(.*?)</q>', inner, re.S).group(1).strip()
    d = re.search(r'<def name="([^"]+)"\s*/>', inner)
    why = re.search(r'<why>(.*?)</why>', inner, re.S).group(1).strip()
    opts = re.findall(r'<o( correct)?>(.*?)</o>', inner, re.S)
    ans = [i for i, o in enumerate(opts) if o[0]]
    assert len(ans) == 1, 'drill %s needs exactly one correct option' % did
    nm = 'q-' + did
    rows = ''.join('<label class="opt" for="%s-%d"><input type="radio" name="%s" id="%s-%d" value="%d"><span class="box" aria-hidden="true"></span><span class="ot">%s</span></label>'
                   % (nm, i, nm, nm, i, i, o[1].strip()) for i, o in enumerate(opts))
    return ('<div class="drill" data-qid="q:%s" data-answer="%d"><fieldset><legend class="dq"><span class="kind">Predict.</span> %s</legend>%s<div class="opts">%s</div></fieldset>'
            '<div class="drill-foot"><button type="button" class="act check">Check answer</button><button type="button" class="act show" hidden>Show the answer</button>'
            '<p class="fb" role="status" aria-live="polite"></p></div><div class="why" hidden><p>%s</p></div></div>'
            % (did, ans[0], q, ('<div data-def="%s"></div>' % d.group(1)) if d else '', rows, why))
body = re.sub(r'<drill ([^>]*)>(.*?)</drill>', drill, body, flags=re.S)

# ---------- build challenges ----------
def challenge(m):
    a = attrs(m.group(1)); inner = m.group(2); cid = a['id']
    task = re.search(r'<task>(.*?)</task>', inner, re.S).group(1).strip()
    done = re.search(r'<done>(.*?)</done>', inner, re.S).group(1).strip()
    hints = re.findall(r'<hint>(.*?)</hint>', inner, re.S)
    sol = re.search(r'<solution>(.*?)</solution>', inner, re.S).group(1).strip()
    sol = re.sub(r'<def name="([^"]+)"\s*/>', r'<div data-def="\1"></div>', sol)
    hh = ''.join('<details class="hint"><summary>Hint %d</summary><div class="dbody"><p>%s</p></div></details>' % (i + 1, h.strip()) for i, h in enumerate(hints))
    return ('<section class="challenge" aria-labelledby="ch-%s"><h4 class="grp-name" id="ch-%s">Build challenge: %s</h4><div class="grp-body">'
            '<div class="task">%s</div><p class="done-h">Done when</p><ul class="done">%s</ul>%s'
            '<details class="sol"><summary>Show the solution</summary><div class="dbody">%s</div></details>'
            '<ul class="ticks"><li><label><input type="checkbox" id="t-ch-%s" data-id="ch-%s"><span>I built it and it meets every point above</span></label></li></ul></div></section>'
            % (cid, cid, a['title'], task, done, hh, sol, cid, cid))
body = re.sub(r'<challenge ([^>]*)>(.*?)</challenge>', challenge, body, flags=re.S)

# ---------- fix the bug ----------
def bug(m):
    a = attrs(m.group(1)); inner = m.group(2); bid = a['id']
    q = re.search(r'<q>(.*?)</q>', inner, re.S).group(1).strip()
    hint = re.search(r'<hint>(.*?)</hint>', inner, re.S).group(1).strip()
    why = re.search(r'<why>(.*?)</why>', inner, re.S).group(1).strip()
    return ('<div class="bug" data-qid="b:%s" data-answer="%s"><p class="dq"><span class="kind">Fix the bug.</span> %s</p><div data-def="%s" data-pick="1"></div>'
            '<div class="drill-foot"><button type="button" class="act show" hidden>Show the answer</button><p class="fb" role="status" aria-live="polite"></p></div>'
            '<p class="bug-hint" hidden>%s</p><div class="why" hidden><p>%s</p></div></div>'
            % (bid, a['answer'], q, a['def'], hint, why))
body = re.sub(r'<bug ([^>]*)>(.*?)</bug>', bug, body, flags=re.S)

# ---------- option matrix (比較検討表) ----------
def matrix(m):
    a = attrs(m.group(1)); inner = m.group(2); mid = a['id']
    opts = a['options'].split('|')
    crit = [attrs(c) for c in re.findall(r'<c ([^>]*)/>', inner)]
    head = '<tr><th scope="col">Criterion</th><th scope="col">Weight</th>' + ''.join('<th scope="col">%s</th>' % o for o in opts) + '</tr>'
    rows = ''
    for ci, c in enumerate(crit):
        unit = (', ' + c['unit']) if c.get('unit') else ''
        lab = '%s%s <span class="better">(%s is better)</span>' % (c['name'], unit, 'lower' if c['better'] == 'low' else 'higher')
        w = '<select id="mx-%s-w%d" data-w="%d" aria-label="Weight for %s">%s</select>' % (mid, ci, ci, html.escape(c['name'], quote=True),
             ''.join('<option value="%d"%s>%d</option>' % (k, ' selected' if str(k) == c.get('w', '3') else '', k) for k in range(0, 6)))
        cells = ''.join('<td><input type="number" inputmode="decimal" step="any" id="mx-%s-%d-%d" data-c="%d" data-o="%d" aria-label="%s for %s"></td>'
                        % (mid, ci, oi, ci, oi, html.escape(c['name'], quote=True), html.escape(o, quote=True)) for oi, o in enumerate(opts))
        rows += '<tr data-better="%s"><th scope="row">%s</th><td>%s</td>%s</tr>' % (c['better'], lab, w, cells)
    score = '<tr class="score"><th scope="row">Score out of 100</th><td></td>' + ''.join('<td data-score="%d">-</td>' % oi for oi in range(len(opts))) + '</tr>'
    return ('<div class="matrix" data-mid="%s" data-n="%d"><div class="tbl"><table><thead>%s</thead><tbody>%s%s</tbody></table></div>'
            '<p class="mx-out" role="status" aria-live="polite">Fill in a row for every option to see the ranking.</p></div>' % (mid, len(opts), head, rows, score))
body = re.sub(r'<matrix ([^>]*)>(.*?)</matrix>', matrix, body, flags=re.S)

# ---------- session numbering ----------
ids = re.findall(r'<article class="session" id="([^"]+)"', body)
num = {sid: i + 1 for i, sid in enumerate(ids)}
parts = re.split(r'(<article class="session" id="[^"]+")', body)
cur = None; out = []
for p in parts:
    m = re.match(r'<article class="session" id="([^"]+)"', p)
    if m: cur = m.group(1)
    elif cur: p = p.replace('{{sn}}', str(num[cur]), 1)
    out.append(p)
body = ''.join(out)
def nref(m):
    k = m.group(1); assert k in num, 'unknown session ref ' + k
    return str(num[k])
body = re.sub(r'\{\{n:([\w-]+)\}\}', nref, body)
nsims = len(re.findall(r'data-sim="', body))
weeks = len(ids)
body = body.replace('{{count}}', str(len(ids))).replace('{{sims}}', str(nsims)).replace('{{weeks}}', str(weeks)).replace('{{months}}', str(round(weeks / 4.35)))

# ---------- wrap bare Japanese in lang="ja" ----------
CJK = r'[぀-ヿ㐀-鿿＀-￯々〆]+(?:[぀-ヿ㐀-鿿＀-￯々〆，]+)*'
out, depth_ja, stack = [], 0, []
for tok in re.split(r'(<[^>]+>)', body):
    if tok.startswith('<'):
        m = re.match(r'<\s*(/?)\s*([a-zA-Z0-9]+)', tok)
        if m and not tok.startswith('<!--'):
            closing, tag = m.group(1) == '/', m.group(2).lower()
            if closing:
                while stack:
                    t, ja = stack.pop()
                    if ja: depth_ja -= 1
                    if t == tag: break
            elif not tok.endswith('/>') and tag not in ('br', 'input', 'hr', 'img', 'meta', 'link'):
                ja = 'lang="ja"' in tok
                if ja: depth_ja += 1
                stack.append((tag, ja))
        out.append(tok)
    else:
        out.append(tok if depth_ja else re.sub(CJK, lambda m: '<span lang="ja">' + m.group(0) + '</span>', tok))
body = ''.join(out)

js = '\n'.join(P(n) for n in ('solver.js', 'app-core.js', 'app-practice.js', 'app-sims.js', 'app-sims2.js', 'app-defs.js', 'app-main.js') if (root / 'parts' / n).exists())
js = re.sub(r'\{\{n:([\w-]+)\}\}', nref, js)
page = P('head.html') + body + '\n<script>\n(function(){\n"use strict";\n' + js + '\n})();\n</script>\n'
(root / 'grasshopper-for-structures.html').write_text(page, encoding='utf8')

# ---------- site version for GitHub Pages: full document + Firebase sign-in ----------
FB = 'https://www.gstatic.com/firebasejs/10.14.1/'
FIREBASE_CONFIG = {
    'apiKey': 'AIzaSyCy1QKzhLOObVC6iym0N6q_e-Jxd2HTH6o',
    'authDomain': 'grasshopper-for-structures.firebaseapp.com',
    'projectId': 'grasshopper-for-structures',
    'storageBucket': 'grasshopper-for-structures.firebasestorage.app',
    'messagingSenderId': '738490615847',
    'appId': '1:738490615847:web:dbff6fadda4e44982f2602',
}
import json
icon = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231e1e1c'/%3E"
        "%3Cpath d='M6 24h20M8 24l4-14 4 14 4-14 4 14' fill='none' stroke='%23e9c46a' stroke-width='2.4' stroke-linejoin='round'/%3E%3C/svg%3E")
site_head = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
             '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
             '<meta name="description" content="A Grasshopper course for structural engineers: parametric modelling, Karamba analysis, member checks, optimisation and form-finding, with live examples and practice.">\n'
             '<link rel="icon" href="' + icon + '">\n' + P('head.html') + '\n</head>\n<body>\n')
site_scripts = ''.join('<script src="' + FB + n + '"></script>\n' for n in ('firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'))
site_scripts += '<script>window.FIREBASE_CONFIG = ' + json.dumps(FIREBASE_CONFIG) + ';</script>\n'
site = site_head + body + '\n' + site_scripts + '<script>\n(function(){\n"use strict";\n' + js + '\n})();\n</script>\n</body>\n</html>\n'
(root / 'site').mkdir(exist_ok=True)
(root / 'site' / 'index.html').write_text(site, encoding='utf8')
(root / 'site' / '.nojekyll').write_text('')

# ---------- checks ----------
visible = re.sub(r'<style.*?</style>|<script.*?</script>', '', page, flags=re.S)
bad = [c for c in ('—', '–', '・') if c in visible] + [c for c in ('—', '–') if c in js]
ticks = re.findall(r'data-id="([^"]+)"', page)
qids = re.findall(r'data-qid="([^"]+)"', page)
left = re.findall(r'\{\{[^}]*\}\}|<(?:drill|challenge|bug|matrix|task|done|hint|solution|why|o)[ >]', body)
defs_used = set(re.findall(r'data-def="([^"]+)"', page)); sims_used = set(re.findall(r'data-sim="([^"]+)"', page))
dups = sorted({t for t in ticks if ticks.count(t) > 1} | {q for q in qids if qids.count(q) > 1})
print('bytes', len(page.encode('utf8')), '| sessions', len(ids), '| ticks', len(ticks), '| drills', sum(q.startswith('q:') for q in qids),
      '| bugs', sum(q.startswith('b:') for q in qids), '| sims', nsims, '| banned', bad or 'none', '| dups', dups or 'none', '| leftovers', left[:5] or 'none')
(root / 'build-manifest.txt').write_text('defs ' + ' '.join(sorted(defs_used)) + '\nsims ' + ' '.join(sorted(sims_used)) + '\n')
sys.exit(1 if bad or dups or left else 0)
