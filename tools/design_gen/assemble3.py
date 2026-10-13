#!/usr/bin/env python3
"""Schreibt Runde-3-Boards + Designübersicht in levelui/ und ergänzt canvas.json."""
import json, re, sys
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from r3kit import *
import r3_garden, r3_hatch, r3_cards, r3_more, r3_small

ROOT = sys.argv[1]
ROWS = [('garten', 'Garten & Animationen – lebendige Gartenszene in vier Stimmungen, Schlüpfen und Entwickeln', r3_garden.BOARDS + r3_hatch.BOARDS),
        ('sammeln', 'Sammeln & Zeigen – Sammelkarten mit Holo, Saison-Kostüme, Kleiderschrank', r3_cards.BOARDS),
        ('arena', 'Legendäre, Arena-Duell, Onboarding & App-Icon', r3_more.BOARDS),
        ('balance', 'Balance & Qualität – Samen-Simulation, Freischaltung Rang oder Zeit, Barrierefreiheit', r3_small.BOARDS)]

cj = json.load(open(f'{ROOT}/project/canvas.json', encoding='utf-8'))
dims = lambda v: (int(re.search(r'"\$preview":\{"width":(\d+)', v).group(1)), int(re.search(r'"height":(\d+)\}', v).group(1)))
Y = 15452
for nid, title, boards in ROWS:
    x, hmax = 0, 0
    for k, html, t in boards:
        open(f'{ROOT}/project/{k}.dc.html', 'w', encoding='utf-8').write(html)
        w, h = dims(html)
        cj['boards'][f'{k}.dc.html'] = {'x': x, 'y': Y, 'w': w, 'h': h, 'title': t, 'is_interactive': True}
        if f'{k}.dc.html' not in cj['order']:
            cj['order'].append(f'{k}.dc.html')
        x += w + 80; hmax = max(hmax, h)
    cj['notes'][nid] = {'x': 0, 'y': Y - 300, 'text': title, 'kind': 'title1', 'maxW': x - 80}
    Y += hmax + 120 + 300

# ---------- Designübersicht ----------
SECT = [
    ('Level-System (Varianten)', 'Grundlage', MU, 'Ältere Level- und Themen-Entwürfe; gewählt wurde das Thema Gemüsemonster.', ['LV1', 'LS0', 'TH0', 'TS0', 'TM1'], [0, 3, 6]),
    ('Gemüsemonster & Evolutionen', 'beschlossen', MI, '3 Starter, 11 Monatsmonster in 3 Formen, Arenen, Typen, Sammlung, Steckbrief.', ['MO1', 'MO3', 'MV1', 'MV6', 'MV7'], [11, 14, 17]),
    ('Level-UI', 'Entwurf', CY, 'Rückwirkender Start, Level-Chip, Fortschritt, Level-up, Sammlung, Einstellungen.', ['U1', 'U2', 'U3', 'U4', 'U5', 'U6'], [16]),
    ('Monster-Animationen', 'Entwurf', CY, 'Alle Formen mit Ruhe-Bewegung und typischer Aktion; Vergleich ruhig/lebhaft.', ['AN1', 'AN2', 'AN3', 'AN4', 'AN5', 'AN6'], [20, 23, 35]),
    ('Entdecker & Zufall', 'beschlossen', MI, 'Samen und Rang, zufälliges Monatsei, Schillernde, Begegnungen, Vergleich und Tausch.', ['EZ0', 'EZ1', 'EZ2', 'EZ3', 'EZ4', 'EZ5', 'EZ6', 'EZ7', 'EZ8'], [33]),
    ('Bonus-Monster & Ausbau', 'beschlossen', MI, '6 Bonus-Monster je Typ, Besuch → Beet, Begleiter, Mitbringsel, Postkarte, Saison, Feldnotizen.', ['BM0', 'BM1', 'BM2', 'BM3', 'BM4', 'BM5', 'BM6', 'BM7', 'BM8'], [46, 48, 50]),
    ('Garten', 'neu', GOLD, 'Lebendige Szene: Herbst, Nacht, Winter, Frühling – Monster laufen, schlafen, tragen Saison-Kostüme.', ['GA1', 'GA2', 'GA3', 'GA4'], [13]),
    ('Schlüpfen & Entwickeln', 'neu', GOLD, 'Ei wackelt, Riss, Lichtblitz, Schale fliegt; Entwicklung mit weißem Flackern; Storyboard.', ['HA1', 'HA2', 'HA3'], [49]),
    ('Sammelkarten & Kostüme', 'neu', GOLD, 'Karte je Form mit Holo für Schillernde; 5 Saison-Kostüme + Partyhut; Kleiderschrank.', ['SK1', 'SK2', 'KO1', 'KO2'], [52]),
    ('Arena-Duell', 'neu', GOLD, 'Duell gegen die Arena-Leitung mit Typenrad; Sieg vergoldet nur das Emblem, keine XP.', ['AD1', 'AD2'], [14, 11]),
    ('Legendäre, Start & Icon', 'neu', GOLD, 'Erntor nachgeschärft, Onboarding für neue Nutzer, 6 App-Icon-Varianten.', ['LG1', 'OB1', 'OB2', 'OB3', 'IC1'], [57]),
    ('Balance & Qualität', 'neu', GOLD, 'Samen-Simulation (Regel E), Freischaltung Rang oder Zeit, Barrierefreiheits-Prüfung.', ['SIM1', 'FS1', 'A11Y1'], [56]),
]
link = lambda k: f'<a href="{k}.dc.html" style="font-size:11.5px;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.07);color:{TX};text-decoration:none;border:1px solid rgba(255,255,255,.1)">{k}</a>'
cards = ''
for t, st, c, d, ks, ms in SECT:
    cards += (f'<div style="{CARD};padding:16px 18px;display:flex;gap:14px;align-items:center;min-height:150px;box-sizing:border-box">'
              f'<div style="flex:none;display:flex;align-items:flex-end">' + ''.join(anim.build(i, 92 if len(ms) == 1 else 70, tap=False, seed=i) for i in ms) + '</div>'
              f'<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px"><div style="display:flex;gap:8px;align-items:center"><b style="font-size:16px">{t}</b>'
              f'<span style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:{c}22;color:{c};border:1px solid {c}55">{st}</span></div>'
              f'<div style="font-size:12px;color:{MU};line-height:1.45">{d}</div><div style="display:flex;flex-wrap:wrap;gap:5px">{"".join(link(k) for k in ks)}</div></div></div>')
stats = ''.join(f'<div style="flex:1;{CARD};border-radius:16px;padding:12px 14px"><div style="font-size:26px;font-weight:700;color:{c}">{v}</div><div style="font-size:11.5px;color:{MU}">{l}</div></div>'
                for v, l, c in [('23', 'Monster (3 Starter, 11 Monat, 6 Bonus, 3 Legendär)', TX), ('57', 'Formen, alle animiert', CY), ('50+', 'Schillernde Varianten', '#FFE97A'), (str(len(cj['boards']) + 1), 'Boards in diesem Canvas', SEED)])
rules = ''.join(f'<li style="margin-bottom:4px">{r}</li>' for r in ['Belohnt wird nur Dranbleiben und Datenpflege – nie weniger Essen, nie Gewicht.', 'Begegnungen zählen nur, ob ein Gemüse vorkam – nie wie viel.',
                                                                    'Nichts geht verloren: Lücken kosten weder Level noch Monster.', 'Alles lokal auf dem iPhone, Tauschen nur per Code.', 'Zufall nur bei Optik und Reihenfolge, nie beim Fortschritt.'])
open_ = ''.join(f'<li style="margin-bottom:4px">{r}</li>' for r in ['✓ Monster lebhaft (AN6)', '✓ Regel E der Samen-Wirtschaft (SIM1)', '✓ Erntor neu (LG1)',
                                                                     '✓ Typ-Chip-Farben Frucht/Pilz korrigieren (A11Y1)', '✓ Alle Zusätze kommen rein', '○ App-Icon: später, nach dem Zusammenführen (IC1)'])
nxt = ''.join(f'<li style="margin-bottom:4px">{r}</li>' for r in ['js/level.js um Samen, Rang, Besuche, Beet, Zufallsschlüssel erweitern', 'Monster-Grafiken + Animationen als js/monster_art.js (aus tools/monster_*.py)',
                                                                  'Fortschritt, Garten, Sammlung, Karten als Seiten; Einstellungen + „Bewegung reduzieren“', 'Tests mit Beispieldaten, danach Simulation mit echten Backup-Daten'])
col = lambda t, inner, c: f'<div style="{CARD};padding:14px 18px;flex:1"><b style="font-size:14px;color:{c}">{t}</b><ul style="margin:8px 0 0;padding-left:18px;font-size:12.5px;line-height:1.5">{inner}</ul></div>'
ov = (f'<div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font-size:12px;color:{SEED};letter-spacing:.12em;text-transform:uppercase;font-weight:700">Kalorien Tracker · Level-System</div>'
      f'<h1 style="margin:4px 0 0;font-size:40px;font-weight:700;letter-spacing:-0.02em">Designübersicht Gemüsemonster</h1>'
      f'<div style="font-size:14px;color:{MU};margin-top:6px">Alles, was entworfen wurde – Stand 13.10.2026 · nichts davon ist in der App · Kürzel antippen (Abspielen) springt zum Board</div></div>'
      f'<div style="display:flex;align-items:flex-end">{anim.build(2, 110, tap=False)}{anim.build(17, 110, tap=False)}{anim.build(50, 110, tap=False)}{anim.build(57, 130, tap=False)}</div></div>'
      f'<div style="display:flex;gap:14px">{stats}</div>'
      f'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px">{cards}</div>'
      f'<div style="display:flex;gap:14px">{col("Leitplanken", rules, MI)}{col("Entschieden am 13.10.", open_, GOLD)}{col("Nächste Schritte bei Umsetzung", nxt, CY)}</div>')
ovh = page('Designübersicht', ov, w=1600, h=1240, tab=False, pad='36px 40px', gap=20)
open(f'{ROOT}/project/OV.dc.html', 'w', encoding='utf-8').write(ovh)
cj['boards']['OV.dc.html'] = {'x': 0, 'y': -1840, 'w': 1600, 'h': 1240, 'title': 'Designübersicht – alles auf einen Blick', 'is_interactive': True}
if 'OV.dc.html' not in cj['order']:
    cj['order'].append('OV.dc.html')
cj['notes']['overview'] = {'x': 0, 'y': -2140, 'text': 'Designübersicht', 'kind': 'title1', 'maxW': 1600}
json.dump(cj, open(f'{ROOT}/project/canvas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
new = [k for _, _, b in ROWS for k, _, _ in b] + ['OV']
json.dump({f'project/{k}.dc.html': f'project/{k}.dc.html' for k in new}, open('r3_files.json', 'w'))
print(len(cj['boards']), len(cj['order']), new)
