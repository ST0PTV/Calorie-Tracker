"""Samen-Simulation (SIM1), Freischaltung Rang oder Zeit (FS1), Barrierefreiheit (A11Y1)."""
import json
from r3kit import *

R = json.load(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), 'sim_result.json')))
PERS = ['Gelegentlich', 'Mitnutzer (Daten geteilt)', 'Regelmäßig', 'Datenfan']
PCOL = {'Gelegentlich': '#93A0B4', 'Mitnutzer (Daten geteilt)': '#FF9A6B', 'Regelmäßig': '#5BE7F5', 'Datenfan': '#B9E07A'}
DAYS = ['30', '90', '180', '365']


def chart(rule, w=520, h=260):
    mx = 11000
    X = lambda k: 50 + k * (w - 80) / 3
    Y = lambda v: h - 34 - v / mx * (h - 60)
    s = f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="Verdiente Samen je Nutzertyp, Regel {rule}">'
    for v in range(0, 11001, 2500):
        s += f'<path d="M50 {Y(v):.0f} H{w - 20}" stroke="rgba(255,255,255,.07)"/><text x="44" y="{Y(v) + 4:.0f}" text-anchor="end" font-size="10" fill="#93A0B4" font-family="Sora">{v:,}</text>'.replace(',', '.')
    for k, d in enumerate(DAYS):
        s += f'<text x="{X(k):.0f}" y="{h - 12}" text-anchor="middle" font-size="10.5" fill="#93A0B4" font-family="Sora">Tag {d}</text>'
    for p in PERS:
        pts = [R[rule][p][d]['earned'] for d in DAYS]
        band = ' '.join(f'{X(k):.1f},{Y(v[2]):.1f}' for k, v in enumerate(pts)) + ' ' + ' '.join(f'{X(k):.1f},{Y(v[0]):.1f}' for k, v in reversed(list(enumerate(pts))))
        s += f'<polygon points="{band}" fill="{PCOL[p]}" opacity=".12"/>'
        s += f'<polyline points="{" ".join(f"{X(k):.1f},{Y(v[1]):.1f}" for k, v in enumerate(pts))}" fill="none" stroke="{PCOL[p]}" stroke-width="2.4"/>'
        s += ''.join(f'<circle cx="{X(k):.1f}" cy="{Y(v[1]):.1f}" r="3.4" fill="{PCOL[p]}"/>' for k, v in enumerate(pts))
        last = pts[-1][1]
        s += f'<text x="{w - 16}" y="{Y(last) - 6:.0f}" text-anchor="end" font-size="10.5" font-weight="700" fill="{PCOL[p]}" font-family="Sora">{p.split(" ")[0]}</text>'
    return s + '</svg>'


rules = [('A', 'Besucher = jedes Monster des Typs', 'Monatsei nach 3 Monaten leer · Samen immer ~20 · nie Deko', WA),
         ('B', 'Monatsmonster nur übers Ei', 'alle Bonus nach 6 Wochen · weiterhin pleite', WA),
         ('C', '+ Doppelte gratis, Einladen nur Neue', 'Deko nach 6 Monaten durch · 3.000 Samen Überschuss', GOLD),
         ('D', '+ Bonus nach Rang, kleinere Mitbringsel, Saison-Deko', 'gutes Tempo · Gelegenheitsnutzer nur 3/6 Bonus', GOLD),
         ('E', '+ Freischaltung Rang ODER Zeit (Monat 4 / 8)', 'empfohlen · Gelegentlich 5/6 · Regelmäßig alle bis Tag 140', MI)]
rt = ''.join(f'<div style="display:grid;grid-template-columns:34px 1fr;gap:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,.07)"><b style="font-size:18px;color:{c}">{k}</b>'
             f'<div style="font-size:12px;line-height:1.45"><b>{t}</b><br><span style="color:{MU}">{d}</span></div></div>' for k, t, d, c in rules)


def cell(v):
    return f'<td style="padding:6px 8px;text-align:right;border-top:1px solid rgba(255,255,255,.06)">{v}</td>'


tab = '<table style="border-collapse:collapse;font-size:12px;width:100%"><thead><tr>' + ''.join(f'<th style="text-align:{"left" if i == 0 else "right"};padding:6px 8px;color:{MU};font-weight:600">{h}</th>' for i, h in enumerate(['Regel E · nach 1 Jahr (Median)', 'Samen verdient', 'Rang', 'Bonus', 'Deko', 'Schillernd'])) + '</tr></thead><tbody>'
for p in PERS:
    x = R['E'][p]['365']
    tab += f'<tr><td style="padding:6px 8px;border-top:1px solid rgba(255,255,255,.06)"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:{PCOL[p]};margin-right:6px"></span>{p}</td>' + cell(f'{x["earned"][1]:,.0f}'.replace(',', '.')) + cell(x['rank']) + cell(f'{x["bonus"][1]:.0f}/6') + cell(f'{x["deko"][1]:.0f}') + cell(f'{x["shiny"][1]:.0f}') + '</tr>'
tab += '</tbody></table>'
sim1 = (f'<div><h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.02em">Samen-Wirtschaft · Simulation</h1>'
        f'<div style="font-size:13px;color:{MU};margin-top:4px">Monte-Carlo, 400 Läufe × 365 Tage je Nutzertyp · Linie = Median, Fläche = 10.–90. Perzentil · alle Raten geschätzt (keine Nutzungsdaten)</div></div>'
        f'<div style="display:grid;grid-template-columns:560px 1fr;gap:18px"><div style="{CARD};padding:14px">{sect("Verdiente Samen · Regel E")}{chart("E")}</div>'
        f'<div style="{CARD};padding:12px 16px">{sect("Fünf Regel-Varianten")}{rt}</div></div>'
        f'<div style="display:grid;grid-template-columns:1.3fr 1fr;gap:18px"><div style="{CARD};padding:12px 14px">{tab}</div>'
        f'<div style="{CARD};padding:12px 16px;font-size:12px;line-height:1.55"><b>Empfehlung (Regel E)</b><br><span style="color:{MU}">Einladen 40 · Säen 60 · Besuch an 40 % der Gemüse-Tage · Doppelte gratis · Mitbringsel 5–10 (20 %) · Saison-Deko 150/Monat · Ränge 200/700/1.800/3.500/7.000 · Bonus 3–4 ab Kartograf oder Monat 4, 5–6 ab Botaniker oder Monat 8.<br><br>'
        f'Schwächen: geschätzte Raten (Scans, Gemüse-Häufigkeit, Kaufverhalten); Datenfans häufen weiter an (unschädlich). Nach dem Start mit echten Backup-Daten nachrechnen.</span></div></div>')

# ---------- FS1 Freischaltung ----------
import re


def lock_sil(i, size=58):
    svg = anim.T[f't{i}'].strip().replace('class="m"', f'width="{size}" height="{size}" style="overflow:visible"', 1)
    svg = re.sub(r'fill="(?!none)[^"]*"', 'fill="rgba(255,255,255,0.14)"', svg)
    return re.sub(r'stroke="(?!none)[^"]*"', 'stroke="rgba(255,255,255,0.14)"', svg)


pairs = [(45, 'Ingi → Ingwar', 'sofort', 'frei'), (47, 'Knobi → Graf Knobula', 'sofort', 'frei'), (49, 'Kichi → Kicheron', 'Kartograf oder Monat 4', 'frei'),
         (51, 'Maisi → Kolbrix', 'Kartograf oder Monat 4', 'frei'), (53, 'Kohli → Kohlossus', 'Botaniker oder Monat 8', 'in 4 Mon.'), (55, 'Morchi → Morchelor', 'Botaniker oder Monat 8', 'in 4 Mon.')]
fs = ''
for i, n, cond, st in pairs:
    ok = st == 'frei'
    fs += (f'<div style="display:flex;gap:10px;align-items:center;padding:4px 0;border-top:1px solid rgba(255,255,255,.07)">'
           f'<div style="width:54px;height:54px;display:grid;place-items:center">{anim.build(i, 52, tap=False) if ok else lock_sil(i, 52)}</div>'
           f'<div style="flex:1;min-width:0"><b style="font-size:13px">{n}</b><div style="font-size:11px;color:{MU}">{cond}</div></div>'
           f'<span style="font-size:11px;padding:4px 9px;border-radius:999px;white-space:nowrap;{"background:" + MI + "22;color:" + MI if ok else "background:rgba(255,255,255,.06);color:" + MU}">{st}</span></div>')
tl = ''.join(f'<div style="flex:1;text-align:center"><div style="height:8px;border-radius:4px;background:{c}"></div><div style="font-size:11px;margin-top:4px">{t}</div><div style="font-size:10px;color:{MU}">{d}</div></div>'
             for t, d, c in [('Start', '2 Bonus', MI), ('Monat 4', '+2 Bonus', MI), ('Monat 8', '+2 Bonus', 'rgba(255,255,255,.18)')])
fs1 = (head('Bonus-Monster', 'Freischaltung: Rang oder Zeit – was zuerst kommt')
       + f'<div style="{CARD};padding:12px 14px">{sect("Zeitplan für alle", "garantiert")}<div style="display:flex;gap:6px">{tl}</div>'
         f'<div style="font-size:11px;color:{MU};margin-top:8px;line-height:1.45">Wer viele Lebensmittel pflegt, ist schneller dran – wer wenig Zeit hat, bekommt sie trotzdem. Niemand wird abgehängt.</div></div>'
       + f'<div style="{CARD};padding:4px 14px 8px">{fs}</div>'
       + f'<div style="{CARD};padding:10px 14px;font-size:11px;color:{MU};line-height:1.45">Simulation (Regel E): Gelegenheitsnutzer haben nach einem Jahr 5 statt 3 von 6 Bonus-Monstern.</div>')

# ---------- A11Y1 ----------
def lum(h):
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def cr(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True)
    return (x + .05) / (y + .05)


def blend(fg, bg, a):
    return '#' + ''.join(f'{round(int(fg[i:i + 2], 16) * a + int(bg[i:i + 2], 16) * (1 - a)):02X}' for i in (1, 3, 5))


CB = blend('#FFFFFF', BG, .05)
FIX = {'Frucht': '#FF7A66', 'Pilz': '#B49BEA'}
crow = ''
for n, c in [('Text', TX), ('Gedämpft', MU), ('Cyan', CY), ('Samen', SEED)] + [(t, TYPE[t]) for t in ['Frucht', 'Blatt', 'Wurzel', 'Pilz', 'Zwiebel', 'Spross', 'Hülse']]:
    v = cr(c, blend(c, CB, .13)) if n in TYPE else cr(c, CB)
    ok = v >= 4.5
    fix = FIX.get(n)
    crow += (f'<tr><td style="padding:5px 8px;border-top:1px solid rgba(255,255,255,.06)"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:{c};margin-right:6px"></span>{n}</td>'
             f'<td style="padding:5px 8px;text-align:right;border-top:1px solid rgba(255,255,255,.06);color:{TX if ok else WA}">{v:.1f} : 1</td>'
             f'<td style="padding:5px 8px;border-top:1px solid rgba(255,255,255,.06);color:{MU}">{("→ " + fix + f" ({cr(fix, blend(fix, CB, .13)):.1f} : 1)") if fix else ("ok" if ok else "")}</td></tr>')
ctab = f'<table style="border-collapse:collapse;font-size:12px;width:100%"><thead><tr><th style="text-align:left;padding:5px 8px;color:{MU}">Farbe (auf Karte bzw. Typ-Chip)</th><th style="text-align:right;padding:5px 8px;color:{MU}">Kontrast</th><th style="text-align:left;padding:5px 8px;color:{MU}">Korrektur</th></tr></thead><tbody>{crow}</tbody></table>'
demo = ''.join(f'<span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;background:{TYPE[t]}22;color:{c};border:1px solid {TYPE[t]}55;margin-right:6px">{t}{l}</span>'
               for t, c, l in [('Frucht', TYPE['Frucht'], ' alt'), ('Frucht', FIX['Frucht'], ' neu'), ('Pilz', TYPE['Pilz'], ' alt'), ('Pilz', FIX['Pilz'], ' neu')])
finds = [('Kleine Schrift', '134 Stellen unter 10 px in den Level-Entwürfen (meist 9–9,5 px Hilfstexte).', 'In der App mindestens 11 px; Hilfstexte 11–12 px, an Dynamic Type koppeln.'),
         ('Kleine Tippziele', '18 Knöpfe unter 44 px Höhe (Filter-Chips 32 px, „Ergänzen“ 32 px, „Einladen“ 34 px).', 'Sichtbar klein lassen, Tippfläche per Innenabstand auf 44 × 44 px.'),
         ('Typ-Chips Frucht/Pilz', 'Text auf getöntem Chip unter 4,5 : 1.', 'Hellere Chip-Textfarbe, Rahmen bleibt Typfarbe.'),
         ('Farbe allein', 'Formpunkte und Typen nur über Farbe unterscheidbar.', 'Typname steht immer im Chip; Formpunkte zusätzlich gefüllt/leer.'),
         ('Bewegung', 'Viele Dauer-Animationen.', 'Bei „Bewegung reduzieren“: alles still, Schlüpfen nur als Überblendung; Monster in Listen immer still.'),
         ('Screenreader', 'Monster-SVGs sind dekorativ.', 'Knöpfe mit Namen + Form + Typ beschriften („Papri, Normalform, Frucht“).')]
ft = ''.join(f'<div style="padding:8px 0;border-top:1px solid rgba(255,255,255,.07);font-size:12px;line-height:1.45"><b>{a}</b><br><span style="color:{MU}">{b}</span><br><span style="color:{MI}">→ {c}</span></div>' for a, b, c in finds)
a11y = (f'<div><h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.02em">Barrierefreiheit · Prüfung</h1>'
        f'<div style="font-size:13px;color:{MU};margin-top:4px">Kontraste nach WCAG berechnet (Schwelle 4,5 : 1 für normalen Text) · Schriftgrößen und Knopfhöhen automatisch aus den Entwürfen gezählt</div></div>'
        f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px"><div style="{CARD};padding:12px 14px">{ctab}<div style="margin-top:10px">{demo}</div></div>'
        f'<div style="{CARD};padding:4px 16px 8px">{ft}</div></div>')

BOARDS = [('SIM1', page('Samen-Simulation', sim1, w=1240, h=700, tab=False, pad='32px 36px', gap=18), 'SIM1 · Samen-Wirtschaft: Simulation + Empfehlung'),
          ('FS1', page('Freischaltung', fs1), 'FS1 · Bonus-Monster: Freischaltung Rang oder Zeit'),
          ('A11Y1', page('Barrierefreiheit', a11y, w=1240, h=640, tab=False, pad='32px 36px', gap=18), 'A11Y1 · Barrierefreiheit: Kontraste, Schrift, Tippziele')]
