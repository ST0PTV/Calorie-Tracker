#!/usr/bin/env python3
"""Erzeugt die Level-UI-Entwürfe (U1–U6) als .dc.html-Artboards. Beispieldaten, keine echten Nutzerdaten."""
import json, re, sys, os

REPO = '/home/claude/calorie-tracker'
OUT = sys.argv[1]
src = open(f'{REPO}/docs/gemuesemonster.html', encoding='utf-8').read()
T = dict(re.findall(r'<template id="(t\d+)">(.*?)</template>', src, re.S))

BG, TX, MU, CY, MI, WA, GOLD = '#0D1320', '#E8EEF7', '#93A0B4', '#5BE7F5', '#6FE0C1', '#FF9A6B', '#F5C76B'
TYPE = {'Frucht': '#E8503E', 'Blatt': '#5FB878', 'Wurzel': '#F2A65A', 'Pilz': '#9A7ADA', 'Zwiebel': '#C9A47A',
        'Spross': '#9FD07A', 'Hülse': '#8FD46B', 'Legendär': GOLD}
CARD = 'border-radius:22px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.05)'


def mon(i, size, extra=''):
    s = T[f't{i}'].strip()
    return s.replace('class="m"', f'width="{size}" height="{size}" style="overflow:visible;flex:none;{extra}"', 1)


def sil(i, size):
    """Silhouette für unentdeckte Monster."""
    s = mon(i, size)
    s = re.sub(r'fill="(?!none)[^"]*"', 'fill="rgba(255,255,255,0.10)"', s)
    return re.sub(r'stroke="(?!none)[^"]*"', 'stroke="rgba(255,255,255,0.10)"', s)


def chip(t):
    c = TYPE[t]
    return f'<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;background:{c}22;color:{c};border:1px solid {c}55">{t}</span>'


def ring(pct, size, label, color=CY, stroke=3.2, fs=11):
    r = size / 2 - stroke
    c = 2 * 3.14159 * r
    h = size / 2
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" aria-hidden="true" style="flex:none">'
            f'<circle cx="{h}" cy="{h}" r="{r:.1f}" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="{stroke}"/>'
            f'<circle cx="{h}" cy="{h}" r="{r:.1f}" fill="none" stroke="{color}" stroke-width="{stroke}" stroke-linecap="round" '
            f'stroke-dasharray="{c*pct:.1f} {c:.1f}" transform="rotate(-90 {h} {h})"/>'
            f'<text x="{h}" y="{h + fs*0.36:.1f}" text-anchor="middle" font-size="{fs}" font-weight="700" fill="{TX}" font-family="Sora,sans-serif">{label}</text></svg>')


TABBAR = (f'<nav aria-label="Hauptnavigation" style="position:absolute;left:12px;right:12px;bottom:14px;height:60px;border-radius:20px;border:1px solid rgba(255,255,255,0.10);'
          f'background:rgba(22,30,45,0.95);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:6px;box-sizing:border-box">'
          f'<button style="border:0;border-radius:14px;background:rgba(91,231,245,0.14);color:{CY};font-weight:600;font-size:12px">Journal</button>'
          + ''.join(f'<button style="border:0;background:none;color:{MU};font-size:12px">{t}</button>' for t in ['Timeline', 'Essen', 'Analytics'])
          + '</nav>')


def page(title, body, h=844, tab=True, pad='44px 16px 0'):
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
button{{font-family:'Sora',sans-serif;cursor:pointer}}
</style>
</helmet>
<div style="width:390px;height:{h}px;box-sizing:border-box;background:{BG};color:{TX};font-family:'Sora',sans-serif;overflow:hidden;position:relative;display:flex;flex-direction:column;gap:10px;padding:{pad}">
{body}
{TABBAR if tab else ''}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":390,"height":{h}}}}}'>
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


# Beispieldaten: erster Eintrag 14.07.2026 → Monat 4 = Oktober; Aug + Sep vollständig → Level 12
PEPI = (15, 16, 17)
OCT_DAYS = 11  # gezählt bis 12.10. (davon 1 Pausetag)
files = {}

# ---------- U1 Journal mit Level-Chip ----------
chipbtn = (f'<button aria-label="Level 12, Papri 11 von 20 Tagen – Fortschritt öffnen" style="display:flex;align-items:center;gap:6px;padding:3px 10px 3px 3px;'
           f'border-radius:999px;border:1px solid {CY}44;background:{CY}12;color:{TX}">'
           f'<span style="position:relative;width:34px;height:34px;display:grid;place-items:center">{ring(OCT_DAYS/20, 34, "", CY, 2.6)}'
           f'<span style="position:absolute;inset:4px;display:grid;place-items:center">{mon(PEPI[1], 24)}</span></span>'
           f'<span style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.1"><b style="font-size:12px">Lv 12</b>'
           f'<span style="font-size:9.5px;color:{MU}">11/20</span></span></button>')
navbtn = lambda t, l: f'<button aria-label="{l}" style="width:38px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.05);color:{MU};font-size:16px">{t}</button>'
meal = lambda n, s: (f'<div style="{CARD};border-radius:18px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center">'
                     f'<div><div style="font-size:14px;font-weight:600">{n}</div><div style="font-size:11px;color:{MU}">{s}</div></div>'
                     f'<button aria-label="{n} hinzufügen" style="width:44px;height:44px;border-radius:12px;border:1px solid {CY}66;background:none;color:{CY};font-size:18px">+</button></div>')
u1 = (f'<div style="display:flex;align-items:flex-end;justify-content:space-between;padding:0 4px">'
      f'<div><div style="font-size:12px;color:{MU}">Montag, 12. Oktober</div><h1 style="margin:0;font-size:26px;font-weight:600;letter-spacing:-0.02em">Heute</h1></div>'
      f'<div style="display:flex;gap:8px;align-items:center">{chipbtn}{navbtn("‹", "Vortag")}{navbtn("›", "Folgetag")}</div></div>'
      f'<div style="{CARD};height:196px;display:grid;place-items:center;color:{MU};font-size:11px">… Kalorien-Übersicht wie bisher …</div>'
      + meal('Frühstück', 'Haferflocken · 420 kcal') + meal('Mittagessen', '2 Einträge · 780 kcal') + meal('Abendessen', 'noch leer') + meal('Snacks', 'Banane · 105 kcal')
      + f'<div role="status" style="position:absolute;left:50%;transform:translateX(-50%);bottom:90px;display:flex;align-items:center;gap:10px;padding:8px 14px 8px 8px;'
        f'border-radius:16px;background:{TX};color:{BG};font-size:12.5px;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.45)">'
        f'{mon(PEPI[1], 28)}<span>Tag gezählt · <b>Papri 11/20</b></span></div>')
files['U1.dc.html'] = page('Journal mit Level-Chip', u1)

# ---------- U2 Fortschritt ----------
cal = ''
for d in range(1, 32):
    if d > 12:
        bg = 'rgba(255,255,255,0.03)'; mark = ''
    elif d in (3, 4, 9):
        bg = 'rgba(255,255,255,0.08)'; mark = ''
    elif d == 10:
        bg = 'transparent'; mark = f'border:1.5px dashed {TYPE["Frucht"]}aa;box-sizing:border-box'
    else:
        bg = TYPE['Frucht']; mark = ''
    cal += f'<div title="{d}. Okt" style="aspect-ratio:1;border-radius:6px;background:{bg};{mark}"></div>'
steps = ''.join(
    f'<div style="position:absolute;left:{x}%;top:-34px;transform:translateX(-50%)">{(mon(t, 34) if on else sil(t, 34))}</div>'
    f'<div style="position:absolute;left:{x}%;top:14px;transform:translateX(-50%);font-size:9.5px;color:{MU};white-space:nowrap">{lab}</div>'
    for x, t, lab, on in [(4, PEPI[0], 'Tag 1', True), (50, PEPI[1], '10 Tage', True), (96, PEPI[2], '20 Tage', False)])
u2 = (head('Fortschritt', 'Level 12 · seit 14. Juli dabei')
      + f'<div style="{CARD};padding:14px;display:flex;gap:12px;align-items:center">'
        f'<div style="width:112px;height:112px;border-radius:26px;background:radial-gradient(circle at 50% 60%,{TYPE["Frucht"]}33,transparent 70%);display:grid;place-items:center">{mon(PEPI[1], 100)}</div>'
        f'<div style="flex:1;min-width:0"><div style="font-size:11px;color:{MU};display:flex;gap:6px;align-items:center">Monster des Oktobers {chip("Frucht")}</div>'
        f'<div style="font-size:24px;font-weight:700;margin-top:2px">Papri</div>'
        f'<div style="font-size:11px;color:{MU};margin-top:2px;line-height:1.45">Normalform · schüchtern.<br>Noch <b style="color:{TX}">9 Tage</b> bis Paprisma und Level 13.</div></div></div>'
      + f'<div style="{CARD};padding:12px 14px">{sect("Oktober", "11 / 20 Tage")}'
        f'<div style="position:relative;margin:40px 8px 26px"><div style="height:8px;border-radius:4px;background:rgba(255,255,255,0.08)"></div>'
        f'<div style="position:absolute;left:0;top:0;height:8px;width:55%;border-radius:4px;background:{TYPE["Frucht"]}"></div>{steps}</div>'
        f'<div style="display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:3px">{cal}</div>'
        f'<div style="display:flex;gap:12px;font-size:10px;color:{MU};margin-top:8px;align-items:center">'
        f'<span style="display:flex;gap:5px;align-items:center"><i style="width:10px;height:10px;border-radius:3px;background:{TYPE["Frucht"]}"></i>getrackt</span>'
        f'<span style="display:flex;gap:5px;align-items:center"><i style="width:10px;height:10px;border-radius:3px;border:1.5px dashed {TYPE["Frucht"]}aa;box-sizing:border-box"></i>Pausetag (zählt mit)</span></div></div>'
      + f'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">'
        f'<button style="{CARD};border-radius:18px;padding:10px 12px;color:{TX};text-align:left;display:flex;gap:8px;align-items:center">{mon(5, 40)}'
        f'<span><span style="display:block;font-size:10px;color:{MU}">Starter</span><b style="font-size:13px">Schotador</b></span></button>'
        f'<button style="{CARD};border-radius:18px;padding:10px 12px;color:{TX};text-align:left;display:flex;gap:8px;align-items:center">'
        f'<span style="width:40px;height:40px;border-radius:12px;background:{GOLD}1f;color:{GOLD};display:grid;place-items:center;font-weight:700;font-size:13px">4/17</span>'
        f'<span><span style="display:block;font-size:10px;color:{MU}">Sammlung</span><b style="font-size:13px">11 Formen</b></span></button></div>'
      + f'<button style="{CARD};border-radius:18px;padding:12px 14px;color:{TX};text-align:left;display:flex;gap:10px;align-items:center;border-color:{MI}55">'
        f'<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="{MI}" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 20h18M5 20V11a7 7 0 0 1 14 0v9M9 20v-5h6v5M12 4V2"/></svg>'
        f'<span style="flex:1"><b style="font-size:13px">Glasdom ist offen</b><span style="display:block;font-size:10.5px;color:{MU}">Erste Arena · 4 Plätze für Blatt und Spross</span></span>'
        f'<span style="color:{CY};font-size:12px">Ansehen ›</span></button>'
      + f'<div style="font-size:10.5px;color:{MU};line-height:1.45;padding:0 4px">Hier zählt nur, dass du einträgst – nicht, wie viel du isst. Ausgelassene Tage kosten nichts.</div>')
files['U2.dc.html'] = page('Fortschritt', u2)

# ---------- U3 Erster Start: rückwirkend + Starter-Wahl ----------
def starter(base, name, final, typ, desc, sel=False):
    bd = f'border:1.5px solid {CY}' if sel else 'border:1px solid rgba(255,255,255,0.10)'
    return (f'<button aria-pressed="{"true" if sel else "false"}" style="border-radius:18px;{bd};background:{"rgba(91,231,245,0.08)" if sel else "rgba(255,255,255,0.05)"};'
            f'color:{TX};padding:10px 12px;display:flex;align-items:center;gap:10px;text-align:left">'
            f'<span style="display:flex;align-items:flex-end;gap:2px">{mon(base, 34)}{mon(base+1, 42)}{mon(base+2, 56)}</span>'
            f'<span style="flex:1;min-width:0"><span style="display:flex;gap:6px;align-items:center"><b style="font-size:14px">{name}</b>{chip(typ)}</span>'
            f'<span style="display:block;font-size:10.5px;color:{MU};margin-top:2px">wird {final} · {desc}</span></span></button>')
u3 = (f'<div style="text-align:center;padding:6px 8px 0"><div style="font-size:11px;color:{CY};letter-spacing:.08em;text-transform:uppercase;font-weight:600">Neu: Gemüsemonster</div>'
      f'<h1 style="margin:6px 0 4px;font-size:24px;font-weight:700;letter-spacing:-0.02em">Du trackst schon seit dem 14. Juli</h1>'
      f'<div style="font-size:12px;color:{MU};line-height:1.5">Deine bisherigen Tage zählen mit. Du startest direkt auf</div></div>'
      f'<div style="{CARD};padding:12px 14px;display:flex;align-items:center;gap:12px">{ring(1.0, 58, "12", CY, 4, 18)}'
      f'<div style="flex:1;font-size:11.5px;line-height:1.55"><b style="font-size:14px">Level 12</b><br>'
      f'<span style="color:{MU}">Monat 1 · Level 10 erreicht<br>August und September geschafft</span></div>'
      f'<div style="display:flex">{mon(11, 34)}{mon(14, 34, "margin-left:-8px")}</div></div>'
      f'<h2 style="margin:6px 2px 0;font-size:15px;font-weight:600">Wähle deinen Starter</h2>'
      f'<div style="font-size:11px;color:{MU};margin:-6px 2px 2px">Er ist gleich voll entwickelt – Monat 1 hast du ja schon hinter dir.</div>'
      + starter(0, 'Möhri', 'Möhrgon', 'Wurzel', 'mutig und stur')
      + starter(3, 'Erbsi', 'Schotador', 'Hülse', 'Teamplayer', True)
      + starter(6, 'Tomi', 'Tomagma', 'Frucht', 'heißblütig')
      + f'<div style="flex:1"></div>'
        f'<button style="height:50px;border:0;border-radius:16px;background:{CY};color:{BG};font-weight:700;font-size:15px">Erbsi wählen</button>'
        f'<button style="height:44px;border:0;background:none;color:{MU};font-size:12.5px;margin-bottom:18px">Später – Level-System in den Einstellungen</button>')
files['U3.dc.html'] = page('Erster Start mit Starter-Wahl', u3, tab=False)

# ---------- U4 Level-up ----------
dim = (f'<div aria-hidden="true" style="position:absolute;inset:0;padding:44px 16px 0;opacity:.28;filter:blur(1.5px);display:flex;flex-direction:column;gap:10px">'
       f'<div style="font-size:26px;font-weight:600">Heute</div><div style="{CARD};height:196px"></div>'
       + ''.join(f'<div style="{CARD};height:64px;border-radius:18px"></div>' for _ in range(4)) + '</div>')
spark = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" opacity=".85"/>' for x, y, r, c in
                [(40, 60, 3, GOLD), (300, 40, 2.5, CY), (60, 210, 2, MI), (290, 200, 3.5, GOLD), (180, 20, 2, TX), (20, 140, 2.5, CY), (320, 130, 2, MI)])
u4 = (dim + f'<div style="position:absolute;inset:0;background:rgba(8,12,22,0.72)"></div>'
      f'<div role="dialog" aria-label="Level-up" style="position:absolute;left:16px;right:16px;top:120px;border-radius:28px;border:1px solid {GOLD}55;'
      f'background:linear-gradient(180deg,#1A2236,#121A2A);padding:22px 18px 18px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.5)">'
      f'<svg width="340" height="240" viewBox="0 0 340 240" aria-hidden="true" style="position:absolute;left:0;top:0">{spark}</svg>'
      f'<div style="position:relative;font-size:11px;color:{GOLD};letter-spacing:.1em;text-transform:uppercase;font-weight:700">Level 13</div>'
      f'<div style="position:relative;font-size:22px;font-weight:700;margin-top:4px">Oktober geschafft!</div>'
      f'<div style="position:relative;display:flex;justify-content:center;align-items:flex-end;gap:6px;margin:16px 0 6px">'
      f'<span style="opacity:.55">{mon(PEPI[1], 54)}</span>'
      f'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="{MU}" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="margin-bottom:22px"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
      f'<span style="width:150px;height:150px;border-radius:40px;background:radial-gradient(circle,{TYPE["Frucht"]}40,transparent 68%);display:grid;place-items:center">{mon(PEPI[2], 132)}</span></div>'
      f'<div style="font-size:12px;color:{MU}">Papri hat sich entwickelt zu</div><div style="font-size:20px;font-weight:700">Paprisma</div>'
      f'<div style="font-size:11px;color:{MU};margin-top:4px;line-height:1.5">Rot, gelb und grün zugleich · 20 Tage im Oktober</div>'
      f'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:16px">'
      f'<button style="height:46px;border-radius:14px;border:1px solid rgba(255,255,255,0.14);background:none;color:{TX};font-size:13px">Zur Sammlung</button>'
      f'<button style="height:46px;border:0;border-radius:14px;background:{CY};color:{BG};font-weight:700;font-size:13px">Weiter</button></div></div>'
      f'<div style="position:absolute;left:24px;right:24px;bottom:96px;text-align:center;font-size:10.5px;color:{MU}">Beispiel: so sähe es am Tag der 20. Eintragung aus</div>')
files['U4.dc.html'] = page('Level-up mit Superform', u4)

# ---------- U5 Sammlung ----------
def tile(t, name, typ, forms, month, gold=False, unknown=False):
    dots = ''.join(f'<i style="width:6px;height:6px;border-radius:50%;background:{TYPE[typ] if k < forms else "rgba(255,255,255,0.14)"}"></i>' for k in range(3 if typ != 'Legendär' else 1))
    art = sil(t, 58) if unknown else mon(t, 58)
    nm = '???' if unknown else name
    bd = f'{GOLD}66' if gold else 'rgba(255,255,255,0.10)'
    return (f'<button style="border-radius:16px;border:1px solid {bd};background:rgba(255,255,255,0.05);color:{TX};padding:8px 4px 8px;display:flex;flex-direction:column;align-items:center;gap:3px">'
            f'{art}<b style="font-size:11px;{"color:" + MU if unknown else ""}">{nm}</b><span style="font-size:9px;color:{MU}">{month}</span>'
            f'<span style="display:flex;gap:3px;margin-top:1px">{dots}</span></button>')
tiles = (tile(5, 'Schotador', 'Hülse', 3, 'Starter') + tile(11, 'Brokkolos', 'Blatt', 3, 'Aug 26') + tile(14, 'Kürbrock', 'Frucht', 3, 'Sep 26')
         + tile(16, 'Papri', 'Frucht', 2, 'Okt 26') + tile(18, '', 'Wurzel', 0, 'Nov 26', unknown=True) + tile(21, '', 'Zwiebel', 0, 'Dez 26', unknown=True)
         + tile(24, '', 'Frucht', 0, 'Jan 27', unknown=True) + tile(27, '', 'Frucht', 0, 'Feb 27', unknown=True) + tile(30, '', 'Spross', 0, 'Mär 27', unknown=True)
         + tile(33, '', 'Pilz', 0, 'Apr 27', unknown=True) + tile(36, '', 'Wurzel', 0, 'Mai 27', unknown=True) + tile(42, '', 'Legendär', 0, 'Jahr 1', unknown=True))
stat = lambda v, l, c: f'<div style="flex:1;text-align:center"><div style="font-size:18px;font-weight:700;color:{c}">{v}</div><div style="font-size:10px;color:{MU}">{l}</div></div>'
filt = ''.join(f'<button aria-pressed="{"true" if i == 0 else "false"}" style="flex:none;height:32px;padding:0 12px;border-radius:999px;font-size:11.5px;'
               f'border:1px solid {(CY + "88") if i == 0 else "rgba(255,255,255,0.12)"};background:{"rgba(91,231,245,0.12)" if i == 0 else "none"};color:{CY if i == 0 else MU}">{t}</button>'
               for i, t in enumerate(['Alle', 'Frucht', 'Blatt', 'Wurzel', 'Hülse', 'Pilz', 'Zwiebel', 'Spross']))
u5 = (head('Sammlung', 'Gemüsemonster')
      + f'<div style="{CARD};padding:12px 8px;display:flex">{stat("4/17", "Monster", TX)}{stat("11/45", "Formen", TX)}{stat("0/8", "Orden", GOLD)}</div>'
      + f'<div style="display:flex;gap:6px;overflow:hidden;margin:0 -16px;padding:0 16px">{filt}</div>'
      + f'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">{tiles}</div>')
files['U5.dc.html'] = page('Sammlung', u5)

# ---------- U6 Einstellungen ----------
def tog(label, sub, on):
    knob = (f'<span role="switch" aria-checked="{"true" if on else "false"}" aria-label="{label}" style="flex:none;width:48px;height:28px;border-radius:999px;'
            f'background:{CY if on else "rgba(255,255,255,0.14)"};position:relative"><i style="position:absolute;top:3px;{"right" if on else "left"}:3px;width:22px;height:22px;border-radius:50%;background:{BG if on else TX}"></i></span>')
    return (f'<label style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-top:1px solid rgba(255,255,255,0.06)">'
            f'<span style="flex:1"><span style="display:block;font-size:13.5px">{label}</span><span style="display:block;font-size:10.5px;color:{MU};margin-top:2px;line-height:1.4">{sub}</span></span>{knob}</label>')
themes = ''.join(f'<button aria-pressed="{"true" if i == 0 else "false"}" style="border-radius:14px;border:{"1.5px solid " + CY if i == 0 else "1px solid rgba(255,255,255,0.10)"};'
                 f'background:rgba(255,255,255,0.04);color:{TX if i == 0 else MU};padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10.5px">'
                 f'{art}{t}</button>' for i, (t, art) in enumerate([
                     ('Gemüsemonster', mon(1, 34)),
                     ('Garten', '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#5FB878" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 21v-8M12 13c-4 0-6-3-6-7 4 0 6 3 6 7zM12 11c0-4 2-6 6-6 0 4-2 6-6 6"/></svg>'),
                     ('Weitere später', f'<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="{MU}" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/></svg>')]))
u6 = (head('Level-System', 'Einstellungen › Motivation')
      + f'<div style="{CARD};overflow:hidden">'
        f'<div style="padding:12px 14px">{sect("Allgemein")}</div>'
        + tog('Level-System anzeigen', 'Chip im Journal, Fortschritt und Sammlung', True)
        + tog('Meldungen beim Eintragen', '„Tag gezählt · Papri 11/20“ und Level-ups', True)
        + tog('Pausetag', 'Pro Woche zählt ein ausgelassener Tag automatisch mit', True)
        + '</div>'
      + f'<div style="{CARD};padding:12px 14px">{sect("Thema", "Level bleibt beim Wechsel")}<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">{themes}</div></div>'
      + f'<div style="{CARD};padding:12px 14px">{sect("So funktioniert es")}'
        f'<ul style="margin:0;padding-left:18px;font-size:11.5px;line-height:1.6;color:{TX}">'
        f'<li>Monat 1: Level 1–10 nach XP fürs Eintragen und Pflegen von Lebensmitteln.</li>'
        f'<li>Danach: 1 Level pro Monat mit 20 Tagen, ab Jahr 2 pro Quartal mit 60 Tagen.</li>'
        f'<li>Jeden Monat ein neues Monster: Baby ab Tag 1, Normalform ab 10, Superform ab 20.</li>'
        f'<li><b>Belohnt wird nur das Dranbleiben</b> – nie weniger Essen, nie ein Gewichtsverlust.</li>'
        f'<li>Nichts geht verloren: Lücken kosten weder Level noch Monster.</li></ul></div>')
files['U6.dc.html'] = page('Level-System Einstellungen', u6)

os.makedirs(f'{OUT}/project', exist_ok=True)
for k, v in files.items():
    open(f'{OUT}/project/{k}', 'w', encoding='utf-8').write(v)

# canvas.json ergänzen
cj = json.load(open(f'{OUT}/project/canvas.json', encoding='utf-8'))
titles = {'U1': 'U1 · Journal: Level-Chip + Tagesmeldung', 'U2': 'U2 · Fortschritt (Monster des Monats)', 'U3': 'U3 · Erster Start: rückwirkend + Starter',
          'U4': 'U4 · Level-up mit Superform', 'U5': 'U5 · Sammlung', 'U6': 'U6 · Einstellungen + Regeln'}
Y = 35200
for i, k in enumerate(['U1', 'U2', 'U3', 'U4', 'U5', 'U6']):
    f = f'{k}.dc.html'
    cj['boards'][f] = {'x': i * 470, 'y': Y, 'w': 390, 'h': 844, 'title': titles[k]}
    if f not in cj['order']:
        cj['order'].append(f)
cj['notes']['levelui'] = {'x': 0, 'y': Y - 300, 'text': 'Level-UI zur Freigabe – rückwirkender Start, Beispieldaten (erster Eintrag 14.07., heute 12.10.)', 'kind': 'title1', 'maxW': 2740}
json.dump(cj, open(f'{OUT}/project/canvas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', list(files))
