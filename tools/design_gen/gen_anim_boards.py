#!/usr/bin/env python3
"""Canvas-Boards „Monster-Animationen“ (AN1–AN4) + Vergleich ruhig/lebhaft (AN5, AN6)."""
import json, re, sys
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from anim import build, css_lib, CFG, T

OUT = sys.argv[1]
BG, TX, MU, CY, GOLD = '#0D1320', '#E8EEF7', '#93A0B4', '#5BE7F5', '#F5C76B'
TYPE = {'Frucht': '#E8503E', 'Blatt': '#5FB878', 'Wurzel': '#F2A65A', 'Pilz': '#9A7ADA', 'Zwiebel': '#C9A47A', 'Spross': '#9FD07A', 'Hülse': '#8FD46B', 'Legendär': GOLD}
CARD = 'border-radius:22px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.05)'
FORM = {'baby': 'Baby', 'normal': 'Normalform', 'super': 'Superform', 'legend': 'Legendär'}

STARTERS = [('Wurzel', 'mutig und stur', [0, 1, 2], 'Starter'), ('Hülse', 'Teamplayer', [3, 4, 5], 'Starter'), ('Frucht', 'heißblütig', [6, 7, 8], 'Starter')]
MONTHLY = [('Blatt', 'verschlafen'), ('Frucht', 'lacht laut'), ('Frucht', 'schüchtern'), ('Wurzel', 'flink'), ('Zwiebel', 'weint'), ('Frucht', 'cool'),
           ('Frucht', 'adlig'), ('Spross', 'unter Strom'), ('Pilz', 'verträumt'), ('Wurzel', 'geheimnisvoll'), ('Blatt', 'weise')]
MROWS = [(t, ch, [9 + 3 * k, 10 + 3 * k, 11 + 3 * k], f'#{k + 1:02d}') for k, (t, ch) in enumerate(MONTHLY)]
STAGE = {'Starter': ['Stufe 1 · ab L1', 'Stufe 2 · ab L6', 'Stufe 3 · ab L10']}


def chip(t):
    c = TYPE[t]
    return f'<span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;background:{c}22;color:{c};border:1px solid {c}55">{t}</span>'


def cell(i, size, label):
    c = CFG[i]
    return (f'<div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">'
            f'<button aria-label="{c["name"]} antippen" style="width:{size + 30}px;height:{size + 22}px;border:0;border-radius:20px;background:radial-gradient(circle at 50% 62%,rgba(255,255,255,0.06),transparent 70%);display:grid;place-items:center;padding:0">{build(i, size)}</button>'
            f'<div style="font-size:15px;font-weight:700">{c["name"]}</div>'
            f'<div style="font-size:10.5px;color:{MU};margin-top:-4px">{label}</div>'
            f'<div style="font-size:11.5px;line-height:1.45;max-width:270px"><span style="color:{MU}">Ruhe:</span> {c["rest"]}<br><span style="color:{CY}">Typisch:</span> {c["sig"]}</div></div>')


def row(typ, char, ids, tag):
    labels = STAGE.get(tag, ['Baby · ab Tag 1', 'Normalform · ab Tag 10', 'Superform · ab Tag 20'])
    names = ' → '.join(CFG[i]['name'] for i in ids)
    return (f'<div style="{CARD};padding:16px 20px;display:flex;gap:20px;align-items:center">'
            f'<div style="width:190px;flex:none;display:flex;flex-direction:column;gap:6px">'
            f'<div style="font-size:12px;color:{MU};font-family:ui-monospace,Menlo,monospace">{tag}</div>'
            f'<div style="font-size:17px;font-weight:700;line-height:1.25">{names}</div>'
            f'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">{chip(typ)}<span style="font-size:11.5px;color:{MU}">{char}</span></div></div>'
            f'<div style="flex:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">'
            + ''.join(cell(i, 118, labels[k]) for k, i in enumerate(ids)) + '</div></div>')


def page(title, h1, sub, body, w, h, root_cls=''):
    return f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0}}
button{{font-family:'Sora',sans-serif;cursor:pointer;color:inherit}}
{css_lib()}
</style>
</helmet>
<div class="{root_cls}" style="width:{w}px;height:{h}px;box-sizing:border-box;background:{BG};color:{TX};font-family:'Sora',sans-serif;overflow:hidden;position:relative;display:flex;flex-direction:column;gap:16px;padding:32px 36px">
<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:24px">
<div><h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.02em">{h1}</h1><div style="font-size:13px;color:{MU};margin-top:4px">{sub}</div></div>
<div style="display:flex;gap:16px;font-size:11.5px;color:{MU};flex:none"><span><b style="color:{TX}">Ruhe</b> läuft dauerhaft</span><span><b style="color:{CY}">Typisch</b> alle 7–10 s</span><span><b style="color:{TX}">Antippen</b> = Hüpfer (im Abspielen)</span></div>
</div>
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''


W = 1240
RH = 252
files = {}
files['AN1.dc.html'] = (page('Animationen Starter', 'Starter', 'Entwickeln sich in Monat 1 bei Level 6 und 10', ''.join(row(*r) for r in STARTERS), W, 120 + 3 * (RH + 16)),
                        'AN1 · Animationen: Starter')
files['AN2.dc.html'] = (page('Animationen Monat 2 bis 7', 'Monatsmonster #01–#06', 'Formen nach getrackten Tagen im Monat', ''.join(row(*r) for r in MROWS[:6]), W, 120 + 6 * (RH + 16)),
                        'AN2 · Animationen: Monatsmonster #01–#06')
files['AN3.dc.html'] = (page('Animationen Monat 8 bis 12', 'Monatsmonster #07–#11', 'Formen nach getrackten Tagen im Monat', ''.join(row(*r) for r in MROWS[6:]), W, 120 + 5 * (RH + 16)),
                        'AN3 · Animationen: Monatsmonster #07–#11')
leg = (f'<div style="{CARD};padding:22px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">'
       + ''.join(cell(i, 170, lab) for i, lab in [(42, 'Jahr 1 · Kürbis-Erntedrache'), (43, 'Jahr 2 · Wolkenwal'), (44, 'Jahr 3 · Sonnenlöwe')]) + '</div>')
files['AN4.dc.html'] = (page('Animationen Legendäre', 'Legendäre Jahresmonster', 'Schweben statt hüpfen – ruhiger, größer, mit Aura', leg, W, 470), 'AN4 · Animationen: Legendäre')

# ---------- Vergleich ruhig / lebhaft auf der Fortschritt-Seite (aus U2) ----------
u2 = open(f'{OUT}/project/U2.dc.html', encoding='utf-8').read()
static_big = T['t16'].strip().replace('class="m"', 'width="100" height="100" style="overflow:visible;flex:none;"', 1)
assert static_big in u2
for key, cls, label, desc in [('AN5', 'calm', 'ruhig', 'Nur Ruhe-Bewegung: atmen, blinzeln, erröten'), ('AN6', '', 'lebhaft', 'Ruhe-Bewegung + typische Aktion alle 7–10 s')]:
    s = u2.replace(static_big, build(16, 100, tap=False, seed=5), 1)
    s = s.replace('button{font-family:\'Sora\',sans-serif;cursor:pointer}', 'button{font-family:\'Sora\',sans-serif;cursor:pointer}\n' + css_lib(False), 1)
    s = s.replace('<title>Fortschritt</title>', f'<title>Fortschritt {label}</title>', 1)
    s = s.replace('<div style="width:390px;height:844px;', f'<div class="{cls}" style="width:390px;height:844px;', 1)
    assert css_lib(False)[:30] in s and f'class="{cls}"' in s
    files[f'{key}.dc.html'] = (s, f'{key} · Fortschritt „{label}“ – {desc}')

for k, (v, _) in files.items():
    open(f'{OUT}/project/{k}', 'w', encoding='utf-8').write(v)

cj = json.load(open(f'{OUT}/project/canvas.json', encoding='utf-8'))
Y = 36760
x = 0
for k, (v, title) in files.items():
    w = int(re.search(r'"\$preview":\{"width":(\d+)', v).group(1))
    h = int(re.search(r'"\$preview":\{"width":\d+,"height":(\d+)', v).group(1))
    cj['boards'][k] = {'x': x, 'y': Y, 'w': w, 'h': h, 'title': title, 'is_interactive': True}
    if k not in cj['order']:
        cj['order'].append(k)
    x += w + 80
cj['notes']['monsteranim'] = {'x': 0, 'y': Y - 300, 'text': 'Monster-Animationen – Ruhe-Bewegung + typische Aktion, Vergleich ruhig/lebhaft (Entwurf, nicht in der App)', 'kind': 'title1', 'maxW': x - 80}
json.dump(cj, open(f'{OUT}/project/canvas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print({k: len(v) for k, (v, _) in files.items()}, 'width', x)
