#!/usr/bin/env python3
"""Reihe „Bonus-Monster & Ausbau“ (BM0–BM8) im Level-UI-Canvas. Beispieldaten."""
import json, re, sys
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import anim, bonus
from ui_kit import *

ROOT = sys.argv[1]
files = {}


def static(i, s):
    return anim.T[f't{i}'].strip().replace('class="m"', f'width="{s}" height="{s}" style="overflow:visible;flex:none"', 1)


def arrow():
    return f'<svg style="align-self:center" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="{MU}" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" style="flex:none"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'


def wide(title, h1, sub, body, h, right=''):
    hdr = (f'<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:24px"><div><h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.02em">{h1}</h1>'
           f'<div style="font-size:13px;color:{MU};margin-top:4px">{sub}</div></div><div style="font-size:11.5px;color:{MU};flex:none;text-align:right;line-height:1.5">{right}</div></div>')
    return page(title, hdr + body, w=1240, h=h, tab=False, pad='32px 36px', gap=18)


# ---------- BM0 Bonus-Monster ----------
cards = ''
for base, typ, wesen, lure in bonus.BONUS:
    a, b = anim.CFG[base], anim.CFG[base + 1]
    cards += (f'<div style="{CARD};padding:16px 18px;display:flex;flex-direction:column;gap:10px">'
              f'<div style="display:flex;align-items:flex-end;justify-content:center;gap:10px;height:150px">'
              f'<button aria-label="{a["name"]} antippen" style="border:0;background:none;padding:0">{anim.build(base, 92)}</button>{arrow()}'
              f'<button aria-label="{b["name"]} antippen" style="border:0;background:none;padding:0">{anim.build(base + 1, 132)}</button></div>'
              f'<div style="display:flex;align-items:center;gap:8px;justify-content:center"><b style="font-size:16px">{a["name"]} → {b["name"]}</b>{chip(typ)}</div>'
              f'<div style="font-size:12px;color:{MU};text-align:center;margin-top:-4px">{wesen}</div>'
              f'<div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:8px;font-size:11.5px;line-height:1.55">'
              f'<span style="color:{SEED}">Lockt an:</span> {lure}<br>'
              f'<span style="color:{MU}">Ruhe:</span> {b["rest"]} · <span style="color:{CY}">Typisch:</span> {b["sig"]}</div></div>')
files['BM0'] = (wide('Bonus-Monster', 'Bonus-Monster', 'Nur über Besuche und das Beet · wachsen mit 3 weiteren Besuchen ihres Typs zur zweiten Form',
                     f'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">{cards}</div>', 740,
                     'Ein Bonus-Monster je Typ<br>Pool gesamt: 17 + 6 = 23 Monster'), 'BM0 · Bonus-Monster: 6 neue Linien je Typ')

# ---------- BM1 Ablauf Besuch → Beet → Schlüpfen ----------
def step(n, title, art, txt, hl=None):
    return (f'<div style="{CARD};padding:14px;flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;{("border-color:" + hl + "66") if hl else ""}">'
            f'<div style="font-size:11px;color:{MU};font-family:ui-monospace,Menlo,monospace">{n}</div><div style="height:112px;display:grid;place-items:center">{art}</div>'
            f'<b style="font-size:14px">{title}</b><div style="font-size:11.5px;color:{MU};line-height:1.45">{txt}</div></div>')
jrow = (f'<div style="width:100%;box-sizing:border-box;border-radius:14px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.05);padding:10px 12px;text-align:left">'
        f'<div style="font-size:12.5px;font-weight:600">Mittagessen</div><div style="font-size:10.5px;color:{MU}">Linsen-Dal, Reis</div>'
        f'<div style="display:flex;gap:4px;margin-top:6px">{chip("Hülse", True)}</div></div>')
flow = (f'<div style="display:flex;align-items:stretch;gap:8px">'
        + step('1', 'Gemüse eintragen', jrow, 'Ein Lebensmittel mit Hülsenfrüchten taucht im Journal auf.') + arrow()
        + step('2', 'Besuch kommt', anim.build(49, 96), 'Ein Kichi schaut vorbei – im Journal, unter der Mahlzeit.', TYPE['Hülse']) + arrow()
        + step('3', 'Einladen', egg(96), 'Für 40 Samen kommt ein Ei ins Beet. Schlüpft nach 3 getrackten Tagen.', SEED) + arrow()
        + step('4', 'Schlüpft', anim.build(49, 96, seed=11), 'Kichi zieht ins Beet ein und steht in der Sammlung.') + arrow()
        + step('5', 'Wächst', anim.build(50, 112), 'Nach 3 weiteren Tagen mit Hülse wird Kichi zu Kicheron.', TYPE['Hülse'])
        + '</div>')
rules = (f'<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">'
         + ''.join(f'<div style="{CARD};border-radius:16px;padding:12px 14px"><b style="font-size:12.5px">{t}</b><div style="font-size:11px;color:{MU};line-height:1.5;margin-top:4px">{d}</div></div>'
                   for t, d in [('Nur ob, nie wie viel', 'Ein Typ zählt, wenn er an dem Tag vorkam – höchstens 1× pro Tag. Mehr essen bringt nichts.'),
                                ('Ein Besuch pro Tag', 'Gibt es mehrere Typen, entscheidet der Zufall – gewichtet nach Gemüse der letzten 7 Tage.'),
                                ('Nichts verpasst', 'Besuch kommt an 40 % der Gemüse-Tage. Nicht eingeladen? Kommt später wieder. Volles Beet: wartet höflich.'),
                                ('Wer kommen kann', 'Neue Bonus-Monster (Rang oder Zeit) – einladen 40 Samen. Bekannte: gratis Freundschaftsbesuch, 1:8 schillernd. Monatsmonster nur übers Monatsei.')])
         + '</div>')
files['BM1'] = (wide('Ablauf Besuch', 'Vom Teller ins Beet', 'Besucher kommen aus dem Journal und ziehen eingeladen ins Beet – Variante A und B zusammen',
                     flow + rules, 500, 'Einladen 40 Samen · Säen 60 Samen<br>Schlüpfen nach 3 getrackten Tagen'), 'BM1 · Ablauf: Besuch → Einladen → Beet → Schlüpfen → Wachsen')

# ---------- BM2 Beet v2 ----------
def plot(inner, title, sub, hl=None, lock=False):
    st = f'border-color:{hl}88;background:{hl}12' if hl else ''
    return (f'<button style="border-radius:18px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.05);{st};color:{TX};padding:8px 4px 10px;display:flex;flex-direction:column;align-items:center;gap:3px;{"opacity:.5" if lock else ""}">'
            f'<div style="height:78px;display:grid;place-items:center">{inner}</div><b style="font-size:12px">{title}</b><span style="font-size:9.5px;color:{MU};line-height:1.3">{sub}</span></button>')
soil = lambda c='': f'<svg width="70" height="70" viewBox="0 0 64 64" aria-hidden="true"><path d="M12 52 Q32 44 52 52 L50 58 H14z" fill="#6B4A2E"/>{c}</svg>'
lockic = f'<path d="M26 36 v-5 a6 6 0 0 1 12 0 v5" stroke="{MU}" stroke-width="2" fill="none"/><rect x="23" y="36" width="18" height="12" rx="3" fill="{MU}"/>'
deko = ''.join(f'<div style="flex:1;border-radius:14px;border:1px solid {"rgba(255,255,255,0.10)" if not own else SEED + "55"};background:rgba(255,255,255,0.04);padding:8px 4px;text-align:center">'
               f'<div style="height:34px;display:grid;place-items:center">{ic}</div><div style="font-size:10.5px;font-weight:600">{n}</div><div style="font-size:9px;color:{SEED if own else MU}">{s}</div></div>'
               for n, s, own, ic in [('Laterne', 'Kürbiszeit', True, '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3" stroke="#93A0B4" stroke-width="1.6"/><rect x="7" y="6" width="10" height="13" rx="4" fill="#F2A65A"/><rect x="9.5" y="9" width="5" height="7" rx="2" fill="#FFE97A"/></svg>'),
                                     ('Gießkanne', 'von Brokki', True, '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h10v9H5z" fill="#7AB8FF"/><path d="M15 11l5-4" stroke="#7AB8FF" stroke-width="2" stroke-linecap="round"/><path d="M7 9a3 3 0 0 1 6 0" stroke="#7AB8FF" stroke-width="1.6" fill="none"/></svg>'),
                                     ('Zaun', '80 Samen', False, '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8l1.5-3L8 8v11H5zM10.5 8L12 5l1.5 3v11h-3zM16 8l1.5-3L19 8v11h-3z" fill="#C9A47A"/><path d="M4 11h16M4 16h16" stroke="#9C6B3E" stroke-width="1.4"/></svg>'),
                                     ('Vogelhaus', '120 Samen', False, '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-6 8 6" fill="#B5302A"/><rect x="6" y="11" width="12" height="8" fill="#E9C9A0"/><circle cx="12" cy="15" r="2" fill="#6B4A2E"/></svg>')])
bm2 = (head('Beet', '4 von 6 Plätzen belegt · 340 Samen')
       + f'<div style="{CARD};padding:10px;background:linear-gradient(180deg,rgba(95,184,120,0.08),rgba(107,74,46,0.12))"><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">'
       + plot(egg(70), 'Kichi-Ei', 'Besuch · noch 2 Tage', SEED)
       + plot(anim.build(53, 70), 'Kohli', 'wächst · 2/3 Blatt-Tage', TYPE['Blatt'])
       + plot(anim.build(55, 70), 'Morchi', 'wohnt hier · 0/3 Pilz-Tage')
       + plot(soil(f'<g class="i-swayslow" style="transform-origin:32px 50px;--x:0s"><path d="M32 50 V36" stroke="#5FB878" stroke-width="2.6" stroke-linecap="round"/><path d="M32 40 c-7 0 -10 -4 -10 -9 c7 0 10 4 10 9z" fill="#5FB878"/></g>'), 'Gesät', 'Überraschung · noch 1 Tag')
       + plot(soil(f'<path d="M32 30 v14 M25 37 h14" stroke="{SEED}" stroke-width="2.6" stroke-linecap="round"/>'), 'Frei', '60 Samen säen')
       + plot(soil(lockic), 'Gesperrt', 'ab Rang Kartograf', lock=True)
       + '</div></div>'
       + f'<div style="{CARD};padding:12px 14px">{sect("Deko", "Samen ausgeben")}<div style="display:flex;gap:6px">{deko}</div></div>'
       + f'<div style="{CARD};padding:12px 14px;display:flex;gap:10px;align-items:center"><div style="flex:1"><b style="font-size:13px">Heute noch kein Besuch</b>'
         f'<div style="font-size:10.5px;color:{MU};line-height:1.45;margin-top:2px">Besucher kommen, wenn ein Gemüse im Journal steht. Gesätes ist eine Überraschung – gewichtet nach deinen Gemüsen der Woche.</div></div></div>')
files['BM2'] = (page('Beet', bm2), 'BM2 · Beet: Besuchs-Eier, Wachstum, Säen, Deko')

# ---------- BM3 Begleiter ----------
moods = ''.join(f'<div style="flex:1;text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px">{anim.build(i, 46, seed=k)}<b style="font-size:10.5px">{t}</b><span style="font-size:9px;color:{MU};line-height:1.25">{s}</span></div>'
                for k, (i, t, s) in enumerate([(9, 'morgens', 'gähnt'), (50, 'Tag gezählt', 'freut sich'), (11, 'abends', 'schläft ein'), (47, 'Pausetag', '„Pause ist okay“')]))
meal = lambda n, s: (f'<div style="{CARD};border-radius:18px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center">'
                     f'<div><div style="font-size:14px;font-weight:600">{n}</div><div style="font-size:11px;color:{MU}">{s}</div></div>'
                     f'<button aria-label="{n} hinzufügen" style="width:44px;height:44px;border-radius:12px;border:1px solid {CY}66;background:none;color:{CY};font-size:18px">+</button></div>')
bm3 = (f'<div style="display:flex;align-items:flex-end;justify-content:space-between;padding:0 4px"><div><div style="font-size:12px;color:{MU}">Dienstag, 13. Oktober</div>'
       f'<h1 style="margin:0;font-size:26px;font-weight:600;letter-spacing:-0.02em">Heute</h1></div></div>'
       f'<div style="position:relative;margin-top:44px">'
       f'<div style="position:absolute;right:14px;top:-62px;z-index:2">{anim.build(50, 84, seed=21)}</div>'
       f'<div style="position:absolute;right:104px;top:-50px;z-index:2;max-width:170px;padding:8px 11px;border-radius:14px 14px 4px 14px;background:{TX};color:{BG};font-size:11.5px;line-height:1.35;box-shadow:0 6px 18px rgba(0,0,0,.35)">Schön, dass du da bist! Heute zählt schon.</div>'
       f'<div style="{CARD};height:170px;display:grid;place-items:center;color:{MU};font-size:11px">… Kalorien-Übersicht wie bisher …</div></div>'
       + meal('Frühstück', 'Haferflocken · 420 kcal') + meal('Mittagessen', 'Linsen-Dal · 640 kcal')
       + f'<div style="{CARD};padding:12px 12px">{sect("Begleiter-Stimmungen", "wählbar in der Sammlung")}<div style="display:flex;gap:4px">{moods}</div>'
         f'<div style="font-size:10px;color:{MU};margin-top:8px;line-height:1.45">Der Begleiter reagiert nur auf Uhrzeit, Eintragen und Pausen – nie auf Kalorien, Mengen oder Gewicht.</div></div>')
files['BM3'] = (page('Begleiter', bm3), 'BM3 · Begleiter im Journal')

# ---------- BM4 Mitbringsel ----------
dim = (f'<div aria-hidden="true" style="position:absolute;inset:0;padding:44px 16px 0;opacity:.25;filter:blur(1.5px);display:flex;flex-direction:column;gap:10px">'
       f'<div style="font-size:26px;font-weight:600">Heute</div><div style="{CARD};height:196px"></div>' + ''.join(f'<div style="{CARD};height:64px;border-radius:18px"></div>' for _ in range(4)) + '</div>')
bm4 = (dim + '<div style="position:absolute;inset:0;background:rgba(8,12,22,0.75)"></div>'
       f'<div role="dialog" aria-label="Mitbringsel" style="position:absolute;left:16px;right:16px;top:140px;border-radius:28px;border:1px solid {SEED}66;background:linear-gradient(180deg,#18243A,#121A2A);padding:22px 18px 18px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.5)">'
       f'<div style="font-size:11px;color:{SEED};letter-spacing:.1em;text-transform:uppercase;font-weight:700">Mitbringsel</div>'
       f'<div style="font-size:20px;font-weight:700;margin-top:4px">Kohli hat etwas dagelassen</div>'
       f'<div style="display:flex;align-items:flex-end;justify-content:center;gap:8px;margin:14px 0 8px">{anim.build(53, 110, seed=8)}'
       f'<div style="width:92px;height:92px;border-radius:24px;background:rgba(185,224,122,0.12);border:1px solid {SEED}55;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px">{seedicon(30)}<b style="font-size:16px;color:{SEED}">+15</b></div></div>'
       f'<div style="font-size:11.5px;color:{MU};line-height:1.5">Monster im Beet bringen dir ab und zu etwas mit, wenn du die App öffnest – Samen oder eine Deko. Höchstens eins pro Tag.</div>'
       f'<div style="display:flex;gap:8px;justify-content:center;margin-top:12px">{chip("Blatt")}<span style="font-size:10.5px;color:{MU}">Seltene Mitbringsel: Gießkanne, Strohhut, Glühwürmchen</span></div>'
       f'<div style="display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:8px;margin-top:16px">{btn("Danke, Kohli!")}</div></div>')
files['BM4'] = (page('Mitbringsel', bm4, tab=False), 'BM4 · Mitbringsel von Beet-Monstern')

# ---------- BM5 Monatspostkarte ----------
stat = lambda v, l, c=TX: f'<div style="flex:1;text-align:center"><div style="font-size:20px;font-weight:700;color:{c}">{v}</div><div style="font-size:9.5px;color:#6B5A44;line-height:1.3">{l}</div></div>'
bm5 = (head('Monatspostkarte', 'Zum Teilen – ohne Kalorien, Mengen oder Gewicht')
       + f'<div style="border-radius:20px;background:#F6EEDC;color:#3A2E22;padding:16px;position:relative;box-shadow:0 10px 30px rgba(0,0,0,.35)">'
         f'<div style="position:absolute;right:14px;top:14px;width:62px;height:72px;border:2px dashed #C9A47A;border-radius:6px;display:grid;place-items:center;background:#FFF8E8">{static(17, 50)}</div>'
         f'<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9C6B3E;font-weight:700">Grüße aus dem</div>'
         f'<div style="font-size:30px;font-weight:700;letter-spacing:-0.02em;line-height:1.05">Oktober<br>2026</div>'
         f'<div style="height:190px;margin:8px -4px 6px;border-radius:14px;background:radial-gradient(circle at 50% 70%,#F2C23055,transparent 70%),#EFE2C6;display:flex;align-items:flex-end;justify-content:center;gap:4px;padding-bottom:6px">'
         f'{anim.build(17, 150, seed=31)}{anim.build(53, 70, seed=32)}{anim.build(49, 62, seed=33)}</div>'
         f'<div style="display:flex;border-top:1px dashed #C9A47A;padding-top:10px">{stat("24", "Tage dabei", "#3A2E22")}{stat("6", "Besucher", "#3A2E22")}{stat("9", "Lebensmittel vervollständigt", "#3A2E22")}{stat("✦ 1", "schillernd", "#B5891E")}</div>'
         f'<div style="font-size:12px;font-style:italic;color:#6B5A44;margin-top:10px">„Paprisma hat diesen Monat alle Farben gezeigt.“</div></div>'
       + f'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">{btn("Speichern", False)}{btn("Als Bild teilen")}</div>'
       + f'<div style="font-size:10px;color:{MU};line-height:1.45;padding:0 6px">Erscheint am 1. des Folgemonats. Die Karte zeigt nur Monster und Zähler fürs Dranbleiben.</div>')
files['BM5'] = (page('Monatspostkarte', bm5), 'BM5 · Monatspostkarte zum Teilen')

# ---------- BM6 Saison-Events ----------
SEASON = [('Jan', 'Kohlzeit', 'Blatt'), ('Feb', 'Wurzelwinter', 'Wurzel'), ('Mär', 'Bärlauch', 'Zwiebel'), ('Apr', 'Spargelzeit', 'Spross'), ('Mai', 'Radieschen', 'Wurzel'), ('Jun', 'Erbsenzeit', 'Hülse'),
          ('Jul', 'Beerensommer', 'Frucht'), ('Aug', 'Tomatenzeit', 'Frucht'), ('Sep', 'Pilzsaison', 'Pilz'), ('Okt', 'Kürbiszeit', 'Frucht'), ('Nov', 'Lauch & Kohl', 'Zwiebel'), ('Dez', 'Linsenwinter', 'Hülse')]
cal = ''.join(f'<div style="border-radius:10px;padding:6px 2px;text-align:center;background:{TYPE[t]}{"33" if m == "Okt" else "14"};border:1px solid {TYPE[t]}{"aa" if m == "Okt" else "33"}">'
              f'<div style="font-size:10px;font-weight:700">{m}</div><div style="font-size:8.5px;color:{MU};line-height:1.2;margin-top:2px">{n}</div></div>' for m, n, t in SEASON)
bm6 = (head('Saison', 'Jeden Monat ein Saison-Thema')
       + f'<div style="{CARD};padding:14px;border-color:{TYPE["Frucht"]}66;background:linear-gradient(135deg,rgba(242,166,90,0.16),rgba(255,255,255,0.04));display:flex;gap:10px;align-items:center">'
         f'<div style="flex:none">{anim.build(14, 110, seed=41)}</div><div><div style="font-size:10.5px;color:{TYPE["Wurzel"]};font-weight:700;letter-spacing:.06em;text-transform:uppercase">Jetzt · bis 31. Okt</div>'
         f'<div style="font-size:22px;font-weight:700">Kürbiszeit</div><div style="font-size:11px;color:{MU};line-height:1.45;margin-top:2px">Frucht-Besucher kommen öfter, Schillernd-Chance für Kürbi & Co. verdoppelt. Saison-Deko: Laterne.</div></div></div>'
       + f'<div style="{CARD};padding:12px 14px">{sect("Saisonkalender", "Typ-Bonus je Monat")}<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">{cal}</div>'
         f'<div style="font-size:10px;color:{MU};margin-top:8px;line-height:1.45">Grob nach deutschem Saisonkalender (Trainingswissen, nicht geprüft). Der Bonus verschiebt nur, wer zu Besuch kommt – er belohnt nie eine Menge.</div></div>'
       + f'<div style="{CARD};padding:12px 14px">{sect("Saison-Sammelstück", "1 von 12")}'
         f'<div style="display:flex;gap:6px">' + ''.join(f'<span style="flex:1;aspect-ratio:1;border-radius:8px;background:{"#F2A65A55" if k == 9 else "rgba(255,255,255,0.06)"};display:grid;place-items:center;font-size:9px;color:{MU}">{m[:1]}</span>' for k, (m, _, _) in enumerate(SEASON)) + '</div>'
         f'<div style="font-size:10.5px;color:{MU};margin-top:8px">Pro Saison eine Deko fürs Beet – wer im Monat 10 Tage dabei ist, bekommt sie.</div></div>')
files['BM6'] = (page('Saison', bm6), 'BM6 · Saison-Events + Saisonkalender')

# ---------- BM7 Feldnotizen ----------
note = lambda t, open_: (f'<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid rgba(255,255,255,0.06)">'
                         f'<span style="width:22px;height:22px;border-radius:7px;flex:none;display:grid;place-items:center;font-size:11px;{"background:" + SEED + ";color:" + BG if open_ else "border:1.5px solid rgba(255,255,255,0.2);color:" + MU}">{"✓" if open_ else "?"}</span>'
                         f'<span style="font-size:11.5px;line-height:1.45;{"" if open_ else "color:" + MU}">{t}</span></div>')
bm7 = (head('Feldnotizen', 'Kicheron · Bonus-Monster')
       + f'<div style="{CARD};padding:14px;display:flex;gap:12px;align-items:center"><div style="flex:none;width:130px;display:grid;place-items:center">{anim.build(50, 128, seed=51)}</div>'
         f'<div style="flex:1;min-width:0"><div style="display:flex;gap:6px;flex-wrap:wrap">{chip("Hülse")}<span style="font-size:10px;color:{MU}">2 / 2 Formen</span></div>'
         f'<div style="font-size:12px;line-height:1.6;margin-top:6px"><span style="color:{MU}">Zuerst getroffen</span><br>3. Okt · Besuch beim Linsen-Dal<br><span style="color:{MU}">Besuche</span> 7 · <span style="color:{MU}">Schillernd</span> noch nicht</div></div></div>'
       + f'<div style="{CARD};padding:12px 14px">{sect("Notizen", "2 von 4 entdeckt")}'
       + note('Kicheron ist nie allein: Die zwei Kleinen sind Geschwister aus derselben Schote.', True)
       + note('Das Stirnband trägt es seit seinem ersten Wettrollen im Wolkenbeet.', True)
       + note('Schalte frei mit 10 Besuchen.', False) + note('Schalte frei, wenn Kicheron in einer Arena steht.', False) + '</div>'
       + f'<div style="{CARD};padding:12px 14px">{sect("Lockt an")}<div style="display:flex;flex-wrap:wrap;gap:6px">'
       + ''.join(f'<span style="font-size:11px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,0.06)">{f}</span>' for f in ['Kichererbsen', 'Linsen', 'Bohnen', 'Erbsen', 'Tofu', 'Tempeh'])
       + f'</div><div style="font-size:10px;color:{MU};margin-top:8px">Lieblings-Arena: Wolkenbeet (Spross, Hülse)</div></div>')
files['BM7'] = (page('Feldnotizen', bm7), 'BM7 · Feldnotizen pro Monster')

# ---------- BM8 Welches Gemüse lockt wen ----------
LURE = [('Blatt', 'Spinat, Salat, Kohl, Brokkoli, Grünkohl, Mangold, Rucola', [9, 39, 53]),
        ('Frucht', 'Tomate, Paprika, Gurke, Zucchini, Kürbis, Aubergine, Obst', [12, 15, 24, 27, 6]),
        ('Wurzel', 'Möhre, Rote Bete, Radieschen, Kartoffel, Ingwer, Pastinake', [18, 36, 45, 0]),
        ('Zwiebel', 'Zwiebel, Knoblauch, Lauch, Schalotte, Frühlingszwiebel', [21, 47]),
        ('Hülse', 'Linsen, Kichererbsen, Bohnen, Erbsen, Tofu, Tempeh, Edamame', [49, 3]),
        ('Spross', 'Spargel, Mais, Sprossen, Bambus, Kohlrabi', [30, 51]),
        ('Pilz', 'Champignons, Shiitake, Pfifferlinge, Austernpilze', [33, 55])]
rows = ''.join(f'<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid rgba(255,255,255,0.06)">'
               f'<div style="width:62px;flex:none">{chip(t, True)}</div><div style="flex:1;min-width:0;font-size:10.5px;color:{MU};line-height:1.35">{foods}</div>'
               f'<div style="display:flex;flex:none">' + ''.join(f'<span style="margin-left:-6px">{static(i, 30)}</span>' for i in ms[:3]) + '</div></div>' for t, foods, ms in LURE)
bm8 = (head('Wer kommt zu Besuch?', 'Gemüse im Journal → Typ → Besucher')
       + f'<div style="{CARD};padding:6px 14px 10px">{rows}</div>'
       + f'<div style="{CARD};padding:12px 14px;font-size:11px;line-height:1.5"><b>So wird erkannt</b><div style="color:{MU};margin-top:4px">Über Stichwörter im Namen des Lebensmittels und die BLS-Gruppe („Linsen-Dal“ → Hülse). Bei Rezepten zählt jede Zutat. Unklare Lebensmittel lassen sich in den Details einem Typ zuordnen – das gibt 5 Samen.</div></div>'
       + f'<div style="font-size:10px;color:{MU};line-height:1.45;padding:0 6px">Starter (Möhri, Erbsi, Tomi) kommen nie zu Besuch – die hat man schon.</div>')
files['BM8'] = (page('Wer kommt zu Besuch', bm8), 'BM8 · Welches Gemüse lockt wen')

# ---------- schreiben + Index ----------
for k, (v, _) in files.items():
    open(f'{ROOT}/project/{k}.dc.html', 'w', encoding='utf-8').write(v)
cj = json.load(open(f'{ROOT}/project/canvas.json', encoding='utf-8'))
Y = 14172
x = 0
for k in ['BM0', 'BM1', 'BM2', 'BM3', 'BM4', 'BM5', 'BM6', 'BM7', 'BM8']:
    v, title = files[k]
    w = int(re.search(r'"\$preview":\{"width":(\d+)', v).group(1)); h = int(re.search(r'"height":(\d+)\}', v).group(1))
    f = f'{k}.dc.html'
    cj['boards'][f] = {'x': x, 'y': Y, 'w': w, 'h': h, 'title': title, 'is_interactive': True}
    if f not in cj['order']:
        cj['order'].append(f)
    x += w + 80
cj['notes']['bonus'] = {'x': 0, 'y': Y - 300, 'text': 'Bonus-Monster & Ausbau – Besuch → Beet, Begleiter, Mitbringsel, Postkarte, Saison, Feldnotizen', 'kind': 'title1', 'maxW': x - 80}
json.dump(cj, open(f'{ROOT}/project/canvas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print({k: len(v) for k, (v, _) in files.items()})
