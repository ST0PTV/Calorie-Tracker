#!/usr/bin/env python3
"""Entwürfe „Entdecker & Zufall“ (EZ0–EZ8) für den Level-UI-Canvas. Nur Beispieldaten."""
import json, re, sys, colorsys, random
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from anim import build, css_lib, CFG, T

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


def page(title, body, w=390, h=844, tab=True, pad='44px 16px 0', gap=10, css=''):
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
{css}
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


