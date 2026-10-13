#!/usr/bin/env python3
"""Entwürfe „Entdecker & Zufall“ (EZ0–EZ8) für den Level-UI-Canvas. Nur Beispieldaten."""
import json, re, sys, colorsys, random
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from anim import build, css_lib, CFG, T
import bonus  # noqa: F401

ROOT = sys.argv[1]
BG, TX, MU, CY, MI, WA, GOLD = '#0D1320', '#E8EEF7', '#93A0B4', '#5BE7F5', '#6FE0C1', '#FF9A6B', '#F5C76B'
SEED = '#B9E07A'  # Samen-Farbe
TYPE = {'Frucht': '#E8503E', 'Blatt': '#5FB878', 'Wurzel': '#F2A65A', 'Pilz': '#9A7ADA', 'Zwiebel': '#C9A47A', 'Spross': '#9FD07A', 'Hülse': '#8FD46B', 'Legendär': GOLD}
CARD = 'border-radius:22px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.05)'
SKIP = {'#1B1E27', '#2A0E08', '#FFF', '#FFFFFF', '#F4F6FA', '#E6E9EF', '#F0E6FF'}


# ---------- Schillernde Variante: Farbton jeder Monsterfarbe drehen ----------
def shiny(svg, shift=0.45):
    def rot(m):
        h = m.group(2)
        hx = '#' + h.upper()
        if len(h) == 3:
            h = ''.join(c * 2 for c in h)
        if hx in SKIP:
            return m.group(0)
        r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
        hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
        if ll < 0.16 or ll > 0.9 or ss < 0.12:
            return m.group(0)
        r, g, b = colorsys.hls_to_rgb((hh + shift) % 1, min(.82, ll * 1.06), min(1, ss * 1.1))
        return f'{m.group(1)}#{int(r * 255):02X}{int(g * 255):02X}{int(b * 255):02X}'
    out = re.sub(r'((?:fill|stroke)=")#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})(?=")', rot, svg)
    stars = ''.join(f'<g class="i-twinkle" style="transform-origin:{x}px {y}px;--x:{d}s"><path transform="translate({x} {y}) scale({s})" d="M0 -3 L.9 -.9 3 0 .9 .9 0 3 -.9 .9 -3 0 -.9 -.9z" fill="#FFE97A"/></g>'
                    for x, y, s, d in [(8, 14, 1.1, 0), (58, 20, .9, -.8), (54, 52, 1, -1.6), (10, 46, .8, -1.1)])
    return out.replace('</svg>', stars + '</svg>')


SHIFT = {i: 0.28 + (i * 0.137) % 0.4 for i in range(45)}


def mon(i, size, sh=False, tap=False, seed=None):
    s = build(i, size, tap=tap, seed=seed)
    return shiny(s, SHIFT[i]) if sh else s


def chip(t, small=False):
    c = TYPE[t]
    return f'<span style="font-size:{9.5 if small else 10.5}px;font-weight:600;padding:2px 8px;border-radius:999px;background:{c}22;color:{c};border:1px solid {c}55;white-space:nowrap">{t}</span>'


def shinychip():
    return f'<span style="font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:linear-gradient(90deg,#FFE97A33,#B9A6FF33);color:#FFE97A;border:1px solid #FFE97A66;white-space:nowrap">✦ Schillernd</span>'


def seedicon(size=16):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" aria-hidden="true" style="flex:none"><path d="M12 21c0-6 0-9 0-11" stroke="{SEED}" stroke-width="2" stroke-linecap="round"/>'
            f'<path d="M12 11c-4.5 0-6.5-3-6.5-7 4.5 0 6.5 3 6.5 7z" fill="{SEED}"/><path d="M12 13c0-4 2.2-6.5 6.5-6.5 0 4-2.2 6.5-6.5 6.5z" fill="{SEED}" opacity=".7"/></svg>')


def ring(pct, size, label, color, stroke=3.2, fs=11):
    r = size / 2 - stroke; c = 6.28318 * r; h = size / 2
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" aria-hidden="true" style="flex:none">'
            f'<circle cx="{h}" cy="{h}" r="{r:.1f}" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="{stroke}"/>'
            f'<circle cx="{h}" cy="{h}" r="{r:.1f}" fill="none" stroke="{color}" stroke-width="{stroke}" stroke-linecap="round" stroke-dasharray="{c * pct:.1f} {c:.1f}" transform="rotate(-90 {h} {h})"/>'
            f'<text x="{h}" y="{h + fs * .36:.1f}" text-anchor="middle" font-size="{fs}" font-weight="700" fill="{TX}" font-family="Sora,sans-serif">{label}</text></svg>')


def bar(pct, color, h=8):
    return f'<div style="height:{h}px;border-radius:{h}px;background:rgba(255,255,255,0.08);overflow:hidden"><div style="height:100%;width:{pct}%;background:{color};border-radius:{h}px"></div></div>'


def egg(size, q=True, crack=False):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 64 64" aria-hidden="true" style="overflow:visible;flex:none">'
            f'<g class="i-hop" style="transform-origin:32px 58px;--x:0s">'
            f'<ellipse cx="32" cy="59" rx="14" ry="2.4" fill="rgba(255,255,255,0.07)"/>'
            f'<path d="M32 6 C46 6 52 30 52 40 C52 52 43 58 32 58 C21 58 12 52 12 40 C12 30 18 6 32 6z" fill="#F3E7C2"/>'
            f'<circle cx="22" cy="30" r="3" fill="#B9E07A" opacity=".8"/><circle cx="41" cy="22" r="2.4" fill="#9A7ADA" opacity=".7"/><circle cx="43" cy="44" r="3.2" fill="#E8503E" opacity=".6"/><circle cx="24" cy="48" r="2.2" fill="#F2A65A" opacity=".7"/>'
            + (f'<text x="32" y="42" text-anchor="middle" font-size="20" font-weight="700" fill="#93A0B4" font-family="Sora,sans-serif">?</text>' if q else '')
            + (f'<path d="M14 32 l6 -4 5 5 6 -6 5 5 6 -5 5 4" stroke="#1B1E27" stroke-width="1.6" fill="none" stroke-linejoin="round"/>' if crack else '')
            + '</g></svg>')


def sprout(size, stage):
    leaves = {1: '<path d="M32 50 V40" stroke="#5FB878" stroke-width="2.4" stroke-linecap="round"/><path d="M32 42 c-6 0 -9 -4 -9 -8 c6 0 9 4 9 8z" fill="#5FB878"/>',
              2: '<path d="M32 50 V32" stroke="#5FB878" stroke-width="2.6" stroke-linecap="round"/><path d="M32 40 c-8 0 -11 -5 -11 -10 c8 0 11 5 11 10z" fill="#5FB878"/><path d="M32 36 c7 0 10 -5 10 -10 c-7 0 -10 5 -10 10z" fill="#7CC46A"/>'}[stage]
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 64 64" aria-hidden="true" style="overflow:visible;flex:none"><g class="i-swayslow" style="transform-origin:32px 50px;--x:0s">{leaves}</g>'
            f'<path d="M12 52 Q32 44 52 52 L50 58 H14z" fill="#6B4A2E"/></svg>')


TABBAR = (f'<nav aria-label="Hauptnavigation" style="position:absolute;left:12px;right:12px;bottom:14px;height:60px;border-radius:20px;border:1px solid rgba(255,255,255,0.10);'
          f'background:rgba(22,30,45,0.95);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:6px;box-sizing:border-box">'
          f'<button style="border:0;border-radius:14px;background:rgba(91,231,245,0.14);color:{CY};font-weight:600;font-size:12px">Journal</button>'
          + ''.join(f'<button style="border:0;background:none;color:{MU};font-size:12px">{t}</button>' for t in ['Timeline', 'Essen', 'Analytics']) + '</nav>')


def page(title, body, w=390, h=844, tab=True, pad='44px 16px 0', gap=10):
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
<div style="width:{w}px;height:{h}px;box-sizing:border-box;background:{BG};color:{TX};font-family:'Sora',sans-serif;overflow:hidden;position:relative;display:flex;flex-direction:column;gap:{gap}px;padding:{pad}">
{body}
{TABBAR if tab else ''}
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


def head(title, sub=None, right='‹ Zurück'):
    s = (f'<div style="display:flex;align-items:center;justify-content:space-between;padding:0 2px">'
         f'<h1 style="margin:0;font-size:22px;font-weight:600;letter-spacing:-0.01em">{title}</h1>'
         f'<button style="border:0;background:none;color:{CY};font-size:13px;padding:10px 0 10px 12px">{right}</button></div>')
    if sub:
        s += f'<div style="font-size:12px;color:{MU};margin-top:-8px;padding:0 2px">{sub}</div>'
    return s


def sect(t, right=''):
    return (f'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">'
            f'<h2 style="margin:0;font-size:15px;font-weight:600">{t}</h2><span style="font-size:11px;color:{MU}">{right}</span></div>')


def btn(label, primary=True, h=46):
    if primary:
        return f'<button style="height:{h}px;border:0;border-radius:14px;background:{CY};color:{BG};font-weight:700;font-size:13.5px">{label}</button>'
    return f'<button style="height:{h}px;border-radius:14px;border:1px solid rgba(255,255,255,0.14);background:none;color:{TX};font-size:13px">{label}</button>'


files = {}
RANKS = [('Sammler', 0), ('Spurenleser', 200), ('Kartograf', 700), ('Botaniker', 1800), ('Archivar', 3500), ('Meister-Entdecker', 7000)]

# ---------- EZ1 Fortschritt mit zwei Fortschritten ----------
ez1 = (head('Fortschritt', 'Zwei Wege nach vorn – beide verlieren nie etwas')
       + f'<div style="{CARD};padding:14px;display:flex;gap:12px;align-items:center">'
         f'<div style="position:relative;width:96px;height:96px;flex:none;display:grid;place-items:center">{ring(11 / 20, 96, "", CY, 4)}<div style="position:absolute;inset:10px;display:grid;place-items:center">{mon(16, 70, seed=3)}</div></div>'
         f'<div style="flex:1;min-width:0"><div style="font-size:10.5px;color:{CY};font-weight:700;letter-spacing:.06em;text-transform:uppercase">Level · Dranbleiben</div>'
         f'<div style="font-size:24px;font-weight:700;margin-top:2px">Level 12</div>'
         f'<div style="font-size:11px;color:{MU};line-height:1.45;margin-top:2px">Oktober: <b style="color:{TX}">11 / 20 Tage</b><br>Papri · noch 9 Tage bis Paprisma</div></div></div>'
       + f'<div style="{CARD};padding:14px;display:flex;gap:12px;align-items:center;border-color:{SEED}44">'
         f'<div style="position:relative;width:96px;height:96px;flex:none;display:grid;place-items:center">{ring(140 / 500, 96, "", SEED, 4)}<div style="position:absolute;inset:0;display:grid;place-items:center">{seedicon(46)}</div></div>'
         f'<div style="flex:1;min-width:0"><div style="font-size:10.5px;color:{SEED};font-weight:700;letter-spacing:.06em;text-transform:uppercase">Entdecker · Datenpflege</div>'
         f'<div style="font-size:24px;font-weight:700;margin-top:2px">Spurenleser</div>'
         f'<div style="font-size:11px;color:{MU};line-height:1.45;margin-top:2px"><b style="color:{TX}">340 Samen</b> gesammelt · 360 bis <b style="color:{TX}">Kartograf</b><br>23 Lebensmittel vervollständigt</div></div></div>'
       + f'<div style="{CARD};padding:12px 14px">{sect("Diese Woche", "")}'
       + ''.join(f'<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,0.06)"><span style="width:8px;height:8px;border-radius:50%;background:{c};flex:none"></span>'
                 f'<span style="flex:1;font-size:12.5px">{t}</span><b style="font-size:12.5px;color:{c}">{v}</b></div>'
                 for t, v, c in [('5 Tage gezählt', '+5 Tage', CY), ('2 neue Produkte gescannt', '+30 Samen', SEED), ('Fehlende Werte bei 4 Lebensmitteln', '+40 Samen', SEED), ('Wochen-Forschungsauftrag', '+50 Samen', SEED)])
       + '</div>'
       + f'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">'
       + ''.join(f'<button style="{CARD};border-radius:16px;padding:10px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;color:{TX}">{ic}<b style="font-size:12px">{t}</b><span style="font-size:9.5px;color:{MU}">{s}</span></button>'
                 for ic, t, s in [(egg(36), 'Monatsei', 'schlüpft 1. Nov'), (sprout(36, 2), 'Beet', '1 bereit'), (mon(17, 36, sh=True, seed=9), 'Sammlung', '5/23 · ✦1')])
       + '</div>')
files['EZ1'] = (ez1, 'EZ1 · Fortschritt: Level + Entdecker getrennt')

# ---------- EZ2 Entdecker-Seite ----------
task = lambda n, miss, done: (f'<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,0.06)">'
                              f'<span style="width:22px;height:22px;border-radius:7px;flex:none;display:grid;place-items:center;{"background:" + SEED + ";color:" + BG if done else "border:1.5px solid rgba(255,255,255,0.25)"};font-size:12px;font-weight:700">{"✓" if done else ""}</span>'
                              f'<span style="flex:1;min-width:0"><span style="display:block;font-size:12.5px;{"text-decoration:line-through;color:" + MU if done else ""}">{n}</span><span style="display:block;font-size:10px;color:{MU}">{miss}</span></span>'
                              f'{"" if done else f"<button style=\"height:32px;padding:0 10px;border-radius:10px;border:1px solid {SEED}66;background:none;color:{SEED};font-size:11px\">Ergänzen</button>"}</div>')
ranks = ''.join(f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><span style="width:12px;height:12px;border-radius:50%;background:{SEED if v <= 340 else "rgba(255,255,255,0.12)"};{"box-shadow:0 0 0 4px " + SEED + "33" if n == "Spurenleser" else ""}"></span>'
                f'<span style="font-size:8.5px;color:{TX if v <= 340 else MU};text-align:center;line-height:1.2">{n}</span></div>' for n, v in RANKS)
ez2 = (head('Entdecker', 'Deine Beiträge machen die Lebensmittel-Daten besser')
       + f'<div style="{CARD};padding:14px"><div style="display:flex;align-items:center;gap:10px">{seedicon(34)}<div style="flex:1"><div style="font-size:22px;font-weight:700">340 Samen</div>'
         f'<div style="font-size:11px;color:{MU}">Rang <b style="color:{TX}">Spurenleser</b> · 360 bis Kartograf</div></div></div>'
         f'<div style="margin:10px 0 8px">{bar(28, SEED)}</div><div style="display:flex;gap:2px;margin-top:6px">{ranks}</div></div>'
       + f'<div style="{CARD};padding:12px 14px">{sect("Forschungsauftrag der Woche", "+50 Samen")}'
         f'<div style="font-size:11px;color:{MU};margin:-4px 0 4px">Lebensmittel, die du schon gegessen hast, denen aber Werte fehlen:</div>'
       + task('Haferdrink Barista', 'Ballaststoffe fehlen', True) + task('Räuchertofu', 'Zucker fehlt', False) + task('Vollkorn-Toast', 'Scheibengewicht fehlt', False)
       + f'<div style="margin-top:8px">{bar(33, SEED, 6)}</div></div>'
       + f'<div style="{CARD};padding:12px 14px">{sect("So gibt es Samen", "max. 60 pro Tag")}'
       + ''.join(f'<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-top:1px solid rgba(255,255,255,0.05)"><span>{t}</span><b style="color:{SEED}">{v}</b></div>'
                 for t, v in [('Neues Produkt mit allen Nährwerten', '15'), ('Fehlenden Wert ergänzt', '10'), ('Portions- oder Scheibengewicht', '10'), ('Eigenes Rezept', '20'), ('Lebensmittel geteilt (1× / Woche)', '25')])
       + f'<div style="font-size:10px;color:{MU};margin-top:8px;line-height:1.45">Samen zählen erst, wenn du das Lebensmittel einmal im Journal eingetragen hast – so lohnen sich nur echte Einträge.</div></div>')
files['EZ2'] = (ez2, 'EZ2 · Entdecker: Samen, Rang, Forschungsauftrag')

# ---------- EZ3 Monatsei: zufälliges Monatsmonster ----------
left = [(18, 'Wurzel'), (21, 'Zwiebel'), (24, 'Frucht'), (27, 'Frucht'), (30, 'Spross'), (33, 'Pilz'), (36, 'Wurzel'), (39, 'Blatt')]
SIL = lambda i, s: re.sub(r'stroke="(?!none)[^"]*"', 'stroke="rgba(255,255,255,0.12)"', re.sub(r'fill="(?!none)[^"]*"', 'fill="rgba(255,255,255,0.12)"', T[f't{i}'].strip().replace('class="m"', f'width="{s}" height="{s}" style="overflow:visible;flex:none"', 1)))
ez3 = (head('Monatsei', 'Wer schlüpft am 1. November?')
       + f'<div style="{CARD};padding:18px 14px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px">'
         f'<div style="width:170px;height:170px;border-radius:50%;background:radial-gradient(circle,rgba(255,233,122,0.14),transparent 68%);display:grid;place-items:center">{egg(130)}</div>'
         f'<div style="font-size:18px;font-weight:700">Noch 19 Tage</div>'
         f'<div style="font-size:11.5px;color:{MU};line-height:1.5;max-width:300px">Es schlüpft ein Monatsmonster, das du <b style="color:{TX}">noch nicht hast</b>. Welches, entscheidet der Zufall – deine Freunde haben eine andere Reihenfolge.</div></div>'
       + f'<div style="{CARD};padding:12px 14px">{sect("Noch möglich", "8 von 11")}'
         f'<div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:2px">' + ''.join(f'<div style="display:grid;place-items:center">{SIL(i, 38)}</div>' for i, _ in left) + '</div>'
         f'<div style="font-size:10px;color:{MU};margin-top:6px">Besucher bringen nur Bonus-Monster oder Doppelte – das Monatsei bleibt bis Monat 12 spannend.</div></div>'
       + f'<div style="{CARD};padding:12px 14px;border-color:#FFE97A44">{sect("Schillernd-Chance", "")}'
         f'<div style="display:flex;align-items:center;gap:10px"><div style="flex:1;font-size:11.5px;line-height:1.5">Jedes Schlüpfen: <b>1 zu 15</b><br><span style="color:{MU}">Spätestens beim 6. Monster garantiert</span></div>'
         f'<div style="display:flex;gap:4px">' + ''.join(f'<span style="width:14px;height:14px;border-radius:4px;background:{"#FFE97A" if k < 3 else "rgba(255,255,255,0.10)"}"></span>' for k in range(6)) + '</div></div>'
         f'<div style="font-size:10px;color:{MU};margin-top:6px">3 von 6 – spätestens in 3 Monstern ist eins schillernd.</div></div>')
files['EZ3'] = (ez3, 'EZ3 · Monatsei: zufälliges Monatsmonster + Schillernd-Garantie')

# ---------- EZ4 Schillernd geschlüpft ----------
dim = (f'<div aria-hidden="true" style="position:absolute;inset:0;padding:44px 16px 0;opacity:.25;filter:blur(1.5px);display:flex;flex-direction:column;gap:10px">'
       f'<div style="font-size:26px;font-weight:600">Heute</div><div style="{CARD};height:196px"></div>' + ''.join(f'<div style="{CARD};height:64px;border-radius:18px"></div>' for _ in range(4)) + '</div>')
ez4 = (dim + '<div style="position:absolute;inset:0;background:rgba(8,12,22,0.75)"></div>'
       f'<div role="dialog" aria-label="Schillerndes Monster" style="position:absolute;left:16px;right:16px;top:110px;border-radius:28px;border:1px solid #FFE97A66;background:linear-gradient(180deg,#1E2440,#121A2A);padding:22px 18px 18px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.5)">'
       f'<div style="font-size:11px;color:#FFE97A;letter-spacing:.1em;text-transform:uppercase;font-weight:700">1. November · geschlüpft</div>'
       f'<div style="font-size:22px;font-weight:700;margin-top:4px">Ein schillerndes Spori!</div>'
       f'<div style="width:190px;height:190px;margin:12px auto 4px;border-radius:50%;background:radial-gradient(circle,rgba(255,233,122,0.22),transparent 66%);display:grid;place-items:center">{mon(33, 150, sh=True, seed=2)}</div>'
       f'<div style="display:flex;gap:6px;justify-content:center;margin-bottom:6px">{chip("Pilz")}{shinychip()}</div>'
       f'<div style="font-size:11.5px;color:{MU};line-height:1.5">Nur jedes 15. Monster schillert. Es entwickelt sich ganz normal weiter – in seinen eigenen Farben.</div>'
       f'<div style="display:flex;align-items:center;justify-content:center;gap:14px;margin:14px 0 4px">'
       f'<div style="display:flex;flex-direction:column;align-items:center;gap:2px">{mon(33, 54, seed=4)}<span style="font-size:9.5px;color:{MU}">normal</span></div>'
       f'<span style="color:{MU}">→</span><div style="display:flex;flex-direction:column;align-items:center;gap:2px">{mon(33, 54, sh=True, seed=5)}<span style="font-size:9.5px;color:#FFE97A">schillernd</span></div></div>'
       f'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px">{btn("Zur Sammlung", False)}{btn("Weiter")}</div></div>')
files['EZ4'] = (ez4, 'EZ4 · Schillerndes Monster geschlüpft')

# ---------- EZ5 Variante A: Beet ----------
chance = [('Hülse', 34, 'Linsen, Tofu, Erbsen'), ('Blatt', 26, 'Spinat, Brokkoli'), ('Frucht', 18, 'Tomate, Paprika'), ('Zwiebel', 10, 'Zwiebel, Lauch'), ('Wurzel', 7, 'Möhre'), ('Pilz · Spross', 5, 'Grundchance')]
plot = lambda inner, title, sub, hl=False: (f'<div style="{CARD};border-radius:18px;padding:10px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;{"border-color:" + SEED + "88;background:rgba(185,224,122,0.07)" if hl else ""}">'
                                            f'<div style="height:64px;display:grid;place-items:center">{inner}</div><b style="font-size:12px">{title}</b><span style="font-size:9.5px;color:{MU};line-height:1.3">{sub}</span></div>')
ez5 = (head('Beet', 'Variante A · Samen säen, nach getrackten Tagen schlüpft ein Monster')
       + f'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">'
       + plot(egg(60, q=False, crack=True), 'Bereit!', 'antippen zum Öffnen', True)
       + plot(sprout(60, 2), 'Wächst', 'noch 2 getrackte Tage')
       + plot(f'<svg width="60" height="60" viewBox="0 0 64 64" aria-hidden="true"><path d="M12 52 Q32 44 52 52 L50 58 H14z" fill="#6B4A2E"/><path d="M32 30 v14 M25 37 h14" stroke="{SEED}" stroke-width="2.6" stroke-linecap="round"/></svg>', 'Frei', '60 Samen säen')
       + '</div>'
       + f'<div style="{CARD};padding:12px 14px">{sect("Was im Beet raschelt", "letzte 7 Tage")}'
         f'<div style="font-size:11px;color:{MU};margin:-4px 0 6px;line-height:1.45">Gemüse aus deinem Journal macht passende Typen wahrscheinlicher.</div>'
       + ''.join(f'<div style="display:grid;grid-template-columns:86px 1fr 34px;gap:8px;align-items:center;padding:4px 0">'
                 f'<span>{chip(t.split(" ")[0], True) if t in TYPE else f"<span style=\"font-size:9.5px;color:{MU}\">{t}</span>"}</span>'
                 f'<span><span style="display:block">{bar(p * 2.5, TYPE.get(t, MU), 6)}</span><span style="display:block;font-size:9.5px;color:{MU};margin-top:2px">{ex}</span></span>'
                 f'<b style="font-size:11.5px;text-align:right">{p} %</b></div>' for t, p, ex in chance)
       + '</div>'
       + f'<div style="{CARD};padding:10px 14px;font-size:10.5px;color:{MU};line-height:1.5"><b style="color:{TX}">Zählt nur, ob ein Gemüse vorkam – nicht wie viel.</b> Jeder Typ höchstens einmal pro Tag. Doppelte Monster haben eine höhere Schillernd-Chance (1 zu 8).</div>')
files['EZ5'] = (ez5, 'EZ5 · Begegnung Variante A: Beet säen')

# ---------- EZ6 Variante B: Besucher im Journal ----------
meal = lambda n, s: (f'<div style="{CARD};border-radius:18px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center">'
                     f'<div><div style="font-size:14px;font-weight:600">{n}</div><div style="font-size:11px;color:{MU}">{s}</div></div>'
                     f'<button aria-label="{n} hinzufügen" style="width:44px;height:44px;border-radius:12px;border:1px solid {CY}66;background:none;color:{CY};font-size:18px">+</button></div>')
ez6 = (f'<div style="display:flex;align-items:flex-end;justify-content:space-between;padding:0 4px"><div><div style="font-size:12px;color:{MU}">Dienstag, 13. Oktober</div>'
       f'<h1 style="margin:0;font-size:26px;font-weight:600;letter-spacing:-0.02em">Heute</h1></div><span style="font-size:11px;color:{MU}">Variante B</span></div>'
       f'<div style="{CARD};height:150px;display:grid;place-items:center;color:{MU};font-size:11px">… Kalorien-Übersicht wie bisher …</div>'
       + meal('Frühstück', 'Haferflocken, Haferdrink · 420 kcal') + meal('Mittagessen', 'Brokkoli-Curry, Reis · 690 kcal')
       + f'<div style="{CARD};border-radius:20px;padding:12px 14px;border-color:{TYPE["Blatt"]}66;background:linear-gradient(135deg,rgba(95,184,120,0.10),rgba(255,255,255,0.04));display:flex;gap:10px;align-items:center">'
         f'<div style="width:86px;height:86px;flex:none;display:grid;place-items:center">{build(53, 80, seed=1)}</div>'
         f'<div style="flex:1;min-width:0"><div style="font-size:10px;color:{TYPE["Blatt"]};font-weight:700;letter-spacing:.06em;text-transform:uppercase">Besuch!</div>'
         f'<div style="font-size:15px;font-weight:700;margin-top:1px">Ein Kohli schaut vorbei</div>'
         f'<div style="font-size:10.5px;color:{MU};line-height:1.4;margin-top:2px">Es hat den Brokkoli in deinem Mittagessen gerochen.</div>'
         f'<div style="display:flex;gap:6px;margin-top:8px"><button style="height:34px;padding:0 10px;border:0;border-radius:10px;background:{SEED};color:{BG};font-weight:700;font-size:11px">Einladen · 40 Samen</button>'
         f'<button style="height:34px;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:none;font-size:11px">Tschüss</button></div></div></div>'
       + meal('Abendessen', 'noch leer')
       + f'<div style="font-size:10px;color:{MU};line-height:1.45;padding:0 6px">Höchstens ein Besuch pro Tag, nur wenn ein Gemüse des Typs eingetragen ist – egal wie viel. Neue Bonus-Monster kann man einladen; Bekannte kommen gratis auf einen Freundschaftsbesuch.</div>')
files['EZ6'] = (ez6, 'EZ6 · Begegnung Variante B: Besucher im Journal')

# ---------- EZ7 Sammlung + Vergleich ----------
def tile(i, name, typ, forms, sh=False, unknown=False, friend=False):
    dots = ''.join(f'<i style="width:6px;height:6px;border-radius:50%;background:{TYPE[typ] if k < forms else "rgba(255,255,255,0.14)"}"></i>' for k in range(3))
    art = SIL(i, 50) if unknown else mon(i, 50, sh=sh)
    badge = f'<span style="position:absolute;top:5px;right:6px;font-size:10px;color:#FFE97A">✦</span>' if sh else ''
    fr = f'<span style="position:absolute;top:5px;left:6px;width:8px;height:8px;border-radius:50%;background:{WA}" title="Alex hat es"></span>' if friend else ''
    return (f'<button style="position:relative;border-radius:16px;border:1px solid {"#FFE97A66" if sh else "rgba(255,255,255,0.10)"};background:rgba(255,255,255,0.05);color:{TX};padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:2px">'
            f'{badge}{fr}{art}<b style="font-size:10.5px;{"color:" + MU if unknown else ""}">{"???" if unknown else name}</b><span style="display:flex;gap:3px;margin-top:2px">{dots}</span></button>')
tiles = (tile(5, 'Schotador', 'Hülse', 3) + tile(14, 'Kürbrock', 'Frucht', 3) + tile(35, 'Myzelor', 'Pilz', 3) + tile(16, 'Papri', 'Frucht', 2)
         + tile(33, 'Spori', 'Pilz', 1, sh=True) + tile(9, 'Brokki', 'Blatt', 1) + tile(20, '', 'Wurzel', 0, unknown=True, friend=True)
         + tile(26, '', 'Frucht', 0, unknown=True, friend=True) + tile(23, '', 'Zwiebel', 0, unknown=True))
ez7 = (head('Sammlung', '5 von 23 Monstern · 1 schillernd')
       + f'<div style="{CARD};padding:12px 8px;display:flex">' + ''.join(f'<div style="flex:1;text-align:center"><div style="font-size:18px;font-weight:700;color:{c}">{v}</div><div style="font-size:10px;color:{MU}">{l}</div></div>'
                                                                       for v, l, c in [('5/23', 'Monster', TX), ('13/57', 'Formen', TX), ('1', 'Schillernd', '#FFE97A')]) + '</div>'
       + f'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">{tiles}</div>'
       + f'<div style="{CARD};padding:12px 14px;border-color:{WA}55">{sect("Vergleich mit Alex", "Code vom 12. Okt")}'
         f'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;text-align:center">'
       + ''.join(f'<div style="border-radius:12px;background:rgba(255,255,255,0.04);padding:8px 4px"><div style="font-size:17px;font-weight:700;color:{c}">{v}</div><div style="font-size:9.5px;color:{MU};line-height:1.3">{l}</div></div>'
                 for v, l, c in [('3', 'habt ihr beide', TX), ('2', 'hat nur Alex', WA), ('3', 'hast nur du', CY)])
       + f'</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px">{btn("Code einlesen", False, 40)}{btn("Meinen Code teilen", True, 40)}</div></div>')
files['EZ7'] = (ez7, 'EZ7 · Sammlung mit Schillernden + Vergleich per Code')

# ---------- EZ8 Tauschen ----------
ez8 = (head('Tauschen', 'Doppelte gegen fehlende – per Code, ohne Server')
       + f'<div style="{CARD};padding:12px 14px">{sect("Du gibst", "doppelt vorhanden")}'
         f'<div style="display:flex;gap:10px;align-items:center"><div style="width:78px;height:78px;border-radius:18px;border:1.5px solid #FFE97A88;display:grid;place-items:center;flex:none">{mon(9, 64, sh=True, seed=6)}</div>'
         f'<div style="flex:1"><b style="font-size:14px">Brokki</b><div style="display:flex;gap:6px;margin:4px 0">{chip("Blatt", True)}{shinychip()}</div><div style="font-size:10.5px;color:{MU}">Du hast 2 · eins bleibt bei dir</div></div></div></div>'
       + f'<div style="display:flex;justify-content:center;color:{MU}"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/></svg></div>'
       + f'<div style="{CARD};padding:12px 14px">{sect("Du bekommst", "von Alex")}'
         f'<div style="display:flex;gap:10px;align-items:center"><div style="width:78px;height:78px;border-radius:18px;border:1px dashed rgba(255,255,255,0.25);display:grid;place-items:center;flex:none">{SIL(20, 64)}</div>'
         f'<div style="flex:1"><b style="font-size:14px;color:{MU}">wird beim Einlösen sichtbar</b><div style="font-size:10.5px;color:{MU};margin-top:4px;line-height:1.4">Alex wählt aus seinen Doppelten – Überraschung!</div></div></div></div>'
       + f'<div style="{CARD};padding:14px;text-align:center"><div style="font-size:10.5px;color:{MU}">Dein Tauschcode</div>'
         f'<div style="font-size:24px;font-weight:700;letter-spacing:.12em;margin:6px 0;font-family:ui-monospace,Menlo,monospace">GM-7Q4K-BR1X</div>'
         f'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px">{btn("Kopieren", False, 42)}{btn("Teilen", True, 42)}</div></div>'
       + f'<div style="font-size:10px;color:{MU};line-height:1.5;padding:0 6px">Der Code enthält nur Monster und Form – keine Ess- oder Gewichtsdaten. Ohne Server lässt sich nicht prüfen, ob ein Code woanders schon eingelöst wurde: gedacht für Freunde, nicht für Fremde.</div>')
files['EZ8'] = (ez8, 'EZ8 · Tauschen per Code')

# ---------- EZ0 Schillernde Farben (breit) ----------
lines = [(2, 'Möhrgon', 'Wurzel'), (5, 'Schotador', 'Hülse'), (8, 'Tomagma', 'Frucht'), (11, 'Brokkolos', 'Blatt'), (14, 'Kürbrock', 'Frucht'), (17, 'Paprisma', 'Frucht'), (20, 'Radirex', 'Wurzel'),
         (23, 'Zwiebolon', 'Zwiebel'), (26, 'Gurkodil', 'Frucht'), (29, 'Aubzar', 'Frucht'), (32, 'Sparxion', 'Spross'), (35, 'Myzelor', 'Pilz'), (38, 'Bettrix', 'Wurzel'), (41, 'Merlauch', 'Blatt'), (42, 'Erntor', 'Legendär')]
pairs = ''.join(f'<div style="{CARD};padding:12px 10px;display:flex;flex-direction:column;align-items:center;gap:6px">'
                f'<div style="display:flex;gap:6px;align-items:flex-end">{mon(i, 82, seed=i)}{mon(i, 82, sh=True, seed=i + 50)}</div>'
                f'<div style="display:flex;gap:6px;align-items:center"><b style="font-size:13px">{n}</b>{chip(t, True)}</div>'
                f'<div style="display:flex;gap:36px;font-size:9.5px;color:{MU}"><span>normal</span><span style="color:#FFE97A">✦ schillernd</span></div></div>' for i, n, t in lines)
ez0 = (f'<div style="display:flex;justify-content:space-between;align-items:flex-end"><div><h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.02em">Schillernde Varianten</h1>'
       f'<div style="font-size:13px;color:{MU};margin-top:4px">Gleiche Zeichnung, gedrehter Farbton + Funkeln · gilt für alle Formen eines Monsters</div></div>'
       f'<div style="font-size:11.5px;color:{MU}">Chance 1 : 15 · Garantie spätestens beim 6. Monster · Doppelte 1 : 8</div></div>'
       f'<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px">{pairs}</div>')
files['EZ0'] = (page('Schillernde Varianten', ez0, w=1240, h=610, tab=False, pad='32px 36px', gap=18), 'EZ0 · Schillernde Varianten (alle Endformen)')

# ---------- schreiben + Index ----------
for k in list(files):
    if k != 'EZ0':
        body, title = files[k]
        files[k] = (page(title.split(' · ')[1], body, tab=k not in ('EZ4',)), title)
for k, (v, _) in files.items():
    open(f'{ROOT}/project/{k}.dc.html', 'w', encoding='utf-8').write(v)

cj = json.load(open(f'{ROOT}/project/canvas.json', encoding='utf-8'))
Y = 12908
x = 0
for k in ['EZ0', 'EZ1', 'EZ2', 'EZ3', 'EZ4', 'EZ5', 'EZ6', 'EZ7', 'EZ8']:
    v, title = files[k]
    w = int(re.search(r'"\$preview":\{"width":(\d+)', v).group(1)); h = int(re.search(r'"height":(\d+)\}', v).group(1))
    f = f'{k}.dc.html'
    cj['boards'][f] = {'x': x, 'y': Y, 'w': w, 'h': h, 'title': title, 'is_interactive': True}
    if f not in cj['order']:
        cj['order'].append(f)
    x += w + 80
cj['notes']['entdecker'] = {'x': 0, 'y': Y - 300, 'text': 'Entdecker & Zufall – Samen für Datenpflege, zufällige Monster, Schillernde, Begegnungen, Tauschen', 'kind': 'title1', 'maxW': x - 80}
json.dump(cj, open(f'{ROOT}/project/canvas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print({k: len(v) for k, (v, _) in files.items()})
