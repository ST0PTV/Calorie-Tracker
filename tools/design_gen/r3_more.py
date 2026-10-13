"""Erntor neu, Arena-Duell, Onboarding, App-Icons."""
import re, math
from r3kit import *
from anim import L

src = open('/home/claude/calorie-tracker/docs/gemuesemonster.html', encoding='utf-8').read()
SCN = dict(re.findall(r'<template id="(s\d+)">(.*?)</template>', src, re.S))


def static(i, s):
    return anim.T[f't{i}'].strip().replace('class="m"', f'width="{s}" height="{s}" style="overflow:visible;flex:none"', 1)


# ---------- Erntor neu (t57) ----------
old = anim.top(anim.T['t42'])
wheat = old[11:16]
E = []
idx = {}


def add(name, el):
    idx.setdefault(name, []).append(len(E)); E.append(el)


add('aura', '<circle cx="32" cy="34" r="31" fill="#F5C76B" opacity=".13"/>'); add('aura', '<circle cx="32" cy="34" r="25" fill="#F5C76B" opacity=".08"/>')
add('shadow', '<ellipse cx="32" cy="60" rx="18" ry="2.6" fill="rgba(255,255,255,0.07)"/>')
WL = 'M23 31 C9 27 0 15 2 3 C7 10 11 12 15 11 C13 16 15 20 19 20 C17 24 21 27 25 26z'
WR = 'M41 31 C55 27 64 15 62 3 C57 10 53 12 49 11 C51 16 49 20 45 20 C47 24 43 27 39 26z'
add('wingL', f'<path d="{WL}" fill="#5FB878"/>'); add('wingL', '<path d="M23 30 L5 6 M23 30 L14 13 M23 30 L18 21" stroke="#3E8A50" stroke-width="1.1" fill="none"/>')
add('wingR', f'<path d="{WR}" fill="#5FB878"/>'); add('wingR', '<path d="M41 30 L59 6 M41 30 L50 13 M41 30 L46 21" stroke="#3E8A50" stroke-width="1.1" fill="none"/>')
add('tail', '<path d="M43 50 C55 59 63 50 60 38" stroke="#D9762A" stroke-width="3.2" fill="none" stroke-linecap="round"/>')
add('tail', '<path transform="translate(60 38) rotate(-100)" d="M0 0 C2.8 -2.8 6 -2.4 8 0 C6 2.4 2.8 2.8 0 0z" fill="#5FB878"/>')
add('legs', '<path d="M24 55 l-2.4 5 h6 M40 55 l2.4 5 h-6" stroke="#B85A1E" stroke-width="3.4" stroke-linecap="round" fill="none"/>')
for cx, rx, col in [(20, 10, '#C8642E'), (44, 10, '#C8642E'), (26, 10, '#E07A30'), (38, 10, '#E07A30'), (32, 11, '#F2A65A')]:
    add('body', f'<ellipse cx="{cx}" cy="42" rx="{rx}" ry="16" fill="{col}"/>')
add('belly', '<ellipse cx="32" cy="48" rx="7" ry="6" fill="#FFE97A" opacity=".55"/>')
add('horns', '<path d="M23 28 q-5 -8 -2 -15 q3 7 6 10z M41 28 q5 -8 2 -15 q-3 7 -6 10z" fill="#F3E7C2"/>')
for k, w in enumerate(wheat):
    add(f'w{k}', w)
for x in (26.5, 37.5):
    add('eye', f'<path transform="translate({x} 38) scale(0.7)" d="M0 -6 L1.6 -1.6 6 0 1.6 1.6 0 6 -1.6 1.6 -6 0 -1.6 -1.6z" fill="#1B1E27"/>'); add('eye', f'<circle cx="{x}" cy="38" r="1.1" fill="#FFE97A"/>')
add('brow', '<path d="M22.4 33.4 L29 35 M41.6 33.4 L35 35" stroke="#7A3A12" stroke-width="1.8" stroke-linecap="round"/>')
add('mouth', '<path d="M26.5 46 q5.5 6.6 11 0z" fill="#7A2A12" stroke="#1B1E27" stroke-width="1.2"/>'); add('mouth', '<path d="M28.6 46 l1 2.4 1 -2.4z M33.4 46 l1 2.4 1 -2.4z" fill="#fff"/>')
add('cheek', '<ellipse cx="20.5" cy="44" rx="2.6" ry="1.5" fill="#FFB46A" opacity=".7"/><ellipse cx="43.5" cy="44" rx="2.6" ry="1.5" fill="#FFB46A" opacity=".7"/>')
for p in ['M7 7.4 L7.8 9.2 L9.6 10 L7.8 10.8 L7 12.6 L6.2 10.8 L4.4 10 L6.2 9.2z', 'M57 47.6 L57.7 49.3 L59.4 50 L57.7 50.7 L57 52.4 L56.3 50.7 L54.6 50 L56.3 49.3z']:
    add('spark', f'<path d="{p}" fill="#F5C76B"/>')
anim.T['t57'] = '<svg viewBox="0 0 64 64" class="m" aria-hidden="true">' + ''.join(E) + '</svg>'
I = lambda n: idx[n]
anim.CFG[57] = dict(name='Erntor', kind='legend', noeyes=True, parts=[
    (I('wingL'), [L('i-wingL', '23px 28px'), L('sg s-flapL', '23px 28px')]), (I('wingR'), [L('i-wingR', '41px 28px'), L('sg s-flapR', '41px 28px')]),
    (I('tail'), [L('i-tail', '43px 50px')]), (I('belly'), [L('i-glow')]),
    (I('w0'), [L('i-sway', '24px 26px')]), (I('w1'), [L('i-sway', '28px 26px', -.4)]), (I('w2'), [L('i-sway', '32px 26px', -.8)]), (I('w3'), [L('i-sway', '36px 26px', -1.2)]), (I('w4'), [L('i-sway', '40px 26px', -1.6)]),
    (I('eye'), [L('i-glow')]), (I('spark')[:1], [L('i-twinkle', '7px 10px')]), (I('spark')[1:], [L('i-twinkle', '57px 50px', -1.2)])],
    act=L('sg s-rise', '32px 58px'), extras=anim.spores(32, 30, '#F5C76B', 8, 1.8, 22) + [anim.ring(32, 40, 14, '#F5C76B', 1.6)],
    rest='schwebt, Weizen wiegt, Bauch glüht', sig='Erntewind: Flügelschlag, goldene Körner')

lg1 = (f'<div><h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.02em">Erntor nachgeschärft</h1>'
       f'<div style="font-size:13px;color:{MU};margin-top:4px">Echte Drachenflügel mit Rippen, Hörner, glühender Bauch, gefächerter Kürbiskörper, Schwanz mit Blattspitze · neue Typisch-Aktion „Erntewind“</div></div>'
       f'<div style="display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:18px;align-items:stretch">'
       f'<div style="{CARD};padding:18px;display:flex;flex-direction:column;align-items:center;gap:8px"><span style="font-size:12px;color:{MU}">bisher</span>{anim.build(42, 210, tap=False, seed=1)}<b>Erntor (alt)</b></div>'
       f'<div style="{CARD};padding:18px;display:flex;flex-direction:column;align-items:center;gap:8px;border-color:{GOLD}77"><span style="font-size:12px;color:{GOLD}">neu</span>{anim.build(57, 210, tap=False, seed=1)}<b>Erntor (neu)</b></div>'
       f'<div style="{CARD};padding:18px;display:flex;flex-direction:column;gap:10px"><b style="font-size:15px">Die drei Legendären</b>'
       + ''.join(f'<div style="display:flex;gap:12px;align-items:center;border-top:1px solid rgba(255,255,255,.07);padding-top:8px"><div style="width:92px;height:92px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,{GOLD}30,transparent 70%)">{anim.build(i, 86, tap=False)}</div>'
                 f'<div style="font-size:12px;line-height:1.5"><b style="font-size:14px">{n}</b><br><span style="color:{MU}">{d}</span></div></div>' for i, n, d in
                 [(57, 'Jahr 1 · Erntor', 'Kürbis-Erntedrache · Erntewind'), (43, 'Jahr 2 · Rhizowal', 'Wolkenwal mit Wald · Wasserfontäne'), (44, 'Jahr 3 · Solarion', 'Sonnenlöwe · Sonnenbrüllen')])
       + f'<div style="font-size:11px;color:{MU}">Ab Jahr 4: Goldform – gleiche Zeichnung, Goldpalette + Funkeln.</div></div></div>')

# ---------- Arena-Duell ----------
DCSS = '''
@keyframes lunge{0%,60%,100%{transform:translate(0,0)}68%{transform:translate(70px,-26px)}74%{transform:translate(0,0)}}
.lunge{animation:lunge 3.2s ease-in-out infinite}
@keyframes hit{0%,68%,100%{transform:translateX(0);filter:none}70%{transform:translateX(-6px);filter:brightness(2)}72%{transform:translateX(6px)}74%{transform:translateX(-4px);filter:none}76%{transform:translateX(0)}}
.hit{animation:hit 3.2s ease-in-out infinite}
@keyframes dmg{0%,68%{opacity:0;transform:translateY(0)}72%{opacity:1}92%{opacity:0;transform:translateY(-26px)}100%{opacity:0}}
.dmg{animation:dmg 3.2s ease-out infinite}
@keyframes hp{0%,70%{width:64%}78%,100%{width:41%}}
.hp{animation:hp 3.2s ease-out infinite}
'''
scene0 = SCN['s0'].replace('class="scene"', 'width="358" height="214" style="display:block"', 1)


def hpbar(name, lvl, pct, col, anim_=False):
    return (f'<div style="background:rgba(13,19,32,.78);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:6px 9px;width:140px;backdrop-filter:blur(4px)">'
            f'<div style="display:flex;justify-content:space-between;font-size:11px"><b>{name}</b><span style="color:{MU}">{lvl}</span></div>'
            f'<div style="height:6px;border-radius:6px;background:rgba(255,255,255,.12);margin-top:4px;overflow:hidden"><div {"class=\"hp\"" if anim_ else ""} style="height:100%;width:{pct}%;background:{col};border-radius:6px"></div></div></div>')


atk = lambda t, s, c, pr=False: (f'<button style="height:58px;border-radius:14px;border:1px solid {c}66;background:{c}{"30" if pr else "14"};color:{TX};text-align:left;padding:0 12px;display:flex;flex-direction:column;justify-content:center">'
                                 f'<b style="font-size:13px">{t}</b><span style="font-size:10px;color:{MU}">{s}</span></button>')
ad1 = (head('Glasdom', 'Arena-Duell gegen die Leitung', 'Aufgeben')
       + f'<div style="position:relative;width:358px;height:214px;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,.12)">{scene0}'
         f'<div style="position:absolute;right:16px;top:44px" class="hit">{anim.build(11, 108, tap=False, seed=2)}</div>'
         f'<div class="dmg" style="position:absolute;right:60px;top:40px;font-weight:800;font-size:20px;color:#FFE97A;text-shadow:0 2px 6px #000">−23</div>'
         f'<div style="position:absolute;left:10px;bottom:4px" class="lunge">{anim.build(14, 116, tap=False, seed=3)}</div>'
         f'<div style="position:absolute;right:10px;top:8px">{hpbar("Brokkolos", "Leitung", 64, TYPE["Blatt"], True)}</div>'
         f'<div style="position:absolute;left:10px;top:8px">{hpbar("Kürbrock", "du", 88, TYPE["Frucht"])}</div></div>'
       + f'<div style="{CARD};border-radius:16px;padding:10px 12px;font-size:12px;line-height:1.45"><b>Kürbrock</b> setzt <b style="color:{TYPE["Frucht"]}">Rankenschlag</b> ein! '
         f'<span style="display:inline-block;margin-top:4px;font-size:10.5px;padding:2px 8px;border-radius:999px;background:#FFE97A22;color:#FFE97A;border:1px solid #FFE97A55">Frucht → Blatt · sehr effektiv ×1,5</span></div>'
       + f'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">'
         f'{atk("Rankenschlag", "Frucht · normal", TYPE["Frucht"])}{atk("Lachanfall", "Spezial · Gegner setzt aus · 1×", GOLD, True)}{atk("Abwehr", "halber Schaden nächste Runde", CY)}{atk("Wechseln", "Papri · Kicheron bereit", MU)}</div>'
       + f'<div style="display:flex;gap:8px;align-items:center;justify-content:center">' + ''.join(f'<div style="width:52px;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,{.3 if k == 0 else .1});display:grid;place-items:center">{static(i, 44)}</div>' for k, i in enumerate([14, 16, 50]))
       + f'<span style="font-size:10.5px;color:{MU};margin-left:4px">Team · 3 von 4</span></div>')

WHEEL = ['Frucht', 'Blatt', 'Wurzel', 'Pilz', 'Zwiebel', 'Spross', 'Hülse']
wheel = '<svg width="200" height="200" viewBox="-100 -100 200 200" aria-hidden="true">'
for k, t in enumerate(WHEEL):
    a = math.radians(-90 + k * 360 / 7); a2 = math.radians(-90 + (k + 1) * 360 / 7)
    x, y = 70 * math.cos(a), 70 * math.sin(a); x2, y2 = 70 * math.cos(a2), 70 * math.sin(a2)
    mx, my = 58 * math.cos((a + a2) / 2), 58 * math.sin((a + a2) / 2)
    wheel += (f'<path d="M{x * .78:.1f} {y * .78:.1f} Q{mx * 1.15:.1f} {my * 1.15:.1f} {x2 * .78:.1f} {y2 * .78:.1f}" stroke="#93A0B4" stroke-width="1.4" fill="none" marker-end="url(#ar)"/>'
              f'<circle cx="{x:.1f}" cy="{y:.1f}" r="19" fill="{TYPE[t]}33" stroke="{TYPE[t]}"/><text x="{x:.1f}" y="{y + 3.5:.1f}" text-anchor="middle" font-size="9.5" font-weight="700" fill="{TYPE[t]}" font-family="Sora,sans-serif">{t}</text>')
wheel += '<defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#93A0B4"/></marker></defs></svg>'
emblem = (f'<svg width="150" height="150" viewBox="0 0 64 64" aria-hidden="true"><g class="i-pulse" style="transform-origin:32px 32px"><circle cx="32" cy="32" r="30" fill="{GOLD}22"/></g>'
          f'<path d="M32 4 L54 14 V34 C54 48 44 56 32 60 C20 56 10 48 10 34 V14z" fill="#F2C230" stroke="#B5891E" stroke-width="1.5"/>'
          f'<path d="M20 40 V30 a12 12 0 0 1 24 0 V40z" fill="#7FD4E8" opacity=".8"/><path d="M20 40 h24 M26 30 v10 M32 24 v16 M38 30 v10" stroke="#3E8A50" stroke-width="1.2"/>'
          f'<path d="M24 46 h16" stroke="#B5891E" stroke-width="2"/></svg>')
ad2 = (head('Sieg!', 'Glasdom · Arena-Leitung Brokkolos', 'Schließen')
       + f'<div style="{CARD};padding:16px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;border-color:{GOLD}66">{emblem}'
         f'<b style="font-size:20px">Glasdom-Emblem vergoldet</b><div style="font-size:11.5px;color:{MU};line-height:1.5">Kämpfe geben keine XP und keine Samen – nur das Emblem.<br>Verlieren hat keine Folgen. Revanche jederzeit.</div>'
         f'<div style="display:flex;align-items:flex-end;gap:4px;margin-top:4px">{anim.build(14, 86, tap=False)}{anim.build(11, 70, tap=False)}</div></div>'
       + f'<div style="{CARD};padding:12px 14px;display:flex;gap:12px;align-items:center"><div style="flex:none">{wheel}</div>'
         f'<div style="font-size:11px;line-height:1.5"><b style="font-size:13px">Typenrad</b><br><span style="color:{MU}">Pfeil = stark gegen (×1,5), umgekehrt schwach (×0,75). Legendäre ohne Typ. Stärke nur aus Form + Typ.</span></div></div>')

# ---------- Onboarding ----------
dots = lambda n: '<div style="display:flex;gap:6px;justify-content:center">' + ''.join(f'<span style="width:{18 if k == n else 7}px;height:7px;border-radius:7px;background:{CY if k == n else "rgba(255,255,255,.2)"}"></span>' for k in range(3)) + '</div>'
ob1 = (f'<div style="position:relative;height:400px;margin:0 -16px;overflow:hidden;background:radial-gradient(circle at 50% 75%,rgba(91,231,245,.14),transparent 60%)">'
       + ''.join(f'<div style="position:absolute;left:{x}px;top:{y}px">{anim.build(i, s, tap=False, seed=i)}</div>' for x, y, s, i in
                 [(20, 200, 120, 0), (130, 160, 140, 3), (250, 205, 120, 6), (-6, 60, 80, 49), (300, 70, 80, 53), (160, 40, 70, 9)])
       + '</div>'
       + f'<div style="text-align:center"><h1 style="margin:0;font-size:26px;font-weight:700;letter-spacing:-0.02em">Willkommen bei den<br>Gemüsemonstern</h1>'
         f'<div style="font-size:13px;color:{MU};line-height:1.55;margin-top:10px;padding:0 6px">Ein freiwilliges Spiel neben deinem Tracker. Belohnt wird nur, dass du dranbleibst und Lebensmittel pflegst – <b style="color:{TX}">nie, wie viel du isst.</b></div></div>'
       + f'<div style="flex:1"></div>{dots(0)}<div style="display:grid;gap:8px;margin-bottom:26px">{btn("Los geht’s")}{btn("Ohne Spiel weiter", False)}</div>')
row = lambda ic, t, d, c: (f'<div style="display:flex;gap:12px;align-items:center;padding:12px 0;border-top:1px solid rgba(255,255,255,.07)"><div style="width:60px;height:60px;flex:none;border-radius:18px;background:{c}1f;display:grid;place-items:center">{ic}</div>'
                           f'<div><b style="font-size:14px">{t}</b><div style="font-size:11.5px;color:{MU};line-height:1.45;margin-top:2px">{d}</div></div></div>')
ob2 = (f'<h1 style="margin:16px 0 0;font-size:24px;font-weight:700">So funktioniert’s</h1><div style="font-size:12.5px;color:{MU}">Drei Dinge, alle ohne Druck.</div>'
       + f'<div style="{CARD};padding:4px 14px">'
       + row(egg(48), 'Level · Dranbleiben', 'Jeden Monat schlüpft ein Monster und wächst mit deinen getrackten Tagen.', CY)
       + row(seedicon(36), 'Entdecker · Samen', 'Scanne Produkte und ergänze fehlende Werte – die Datenbank wird besser.', SEED)
       + row(anim.build(49, 54, tap=False), 'Garten · Besuche', 'Gemüse in deinem Journal lockt Besucher an. Nur ob, nie wie viel.', TYPE['Hülse']) + '</div>'
       + f'<div style="{CARD};padding:12px 14px;display:flex;gap:10px;align-items:center"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="{MI}" stroke-width="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'
         f'<div style="font-size:11.5px;line-height:1.45"><b>Alles bleibt auf deinem iPhone.</b><br><span style="color:{MU}">Kein Konto, kein Server. Tauschen nur per Code.</span></div></div>'
       + f'<div style="flex:1"></div>{dots(1)}<div style="display:grid;gap:8px;margin-bottom:26px">{btn("Weiter")}</div>')
eggc = lambda c, i, n, t, sel=False: (f'<button aria-pressed="{"true" if sel else "false"}" style="border-radius:20px;border:{"2px solid " + CY if sel else "1px solid rgba(255,255,255,.12)"};background:{"rgba(91,231,245,.08)" if sel else "rgba(255,255,255,.04)"};color:{TX};padding:12px 4px;display:flex;flex-direction:column;align-items:center;gap:4px">'
                                      f'<div style="position:relative;width:90px;height:100px;display:grid;place-items:center"><svg width="90" height="100" viewBox="0 0 64 70" aria-hidden="true"><g class="i-hop" style="transform-origin:32px 64px;--x:{-.4 * len(n)}s"><path d="M32 6 C46 6 52 32 52 44 C52 58 43 64 32 64 C21 64 12 58 12 44 C12 32 18 6 32 6z" fill="{c}"/>'
                                      f'<circle cx="24" cy="30" r="3" fill="#fff" opacity=".35"/><circle cx="40" cy="44" r="4" fill="#fff" opacity=".25"/></g></svg>'
                                      f'<div style="position:absolute;bottom:-4px;right:-6px">{static(i, 40)}</div></div><b style="font-size:13px">{n}</b>{chip(t, True)}</button>')
ob3 = (f'<h1 style="margin:16px 0 0;font-size:24px;font-weight:700">Welches Ei nimmst du?</h1><div style="font-size:12.5px;color:{MU};line-height:1.5">Dein Starter schlüpft heute und entwickelt sich im ersten Monat zweimal – bei Level 6 und 10.</div>'
       + f'<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:6px">{eggc("#F2A65A", 0, "Möhri", "Wurzel")}{eggc("#8FD46B", 3, "Erbsi", "Hülse", True)}{eggc("#E8503E", 6, "Tomi", "Frucht")}</div>'
       + f'<div style="{CARD};padding:12px 14px;display:flex;gap:10px;align-items:center"><div style="display:flex;align-items:flex-end">{anim.build(3, 54, tap=False)}{anim.build(4, 64, tap=False)}{anim.build(5, 78, tap=False)}</div>'
         f'<div style="font-size:11.5px;line-height:1.45"><b>Erbsi → Schotti → Schotador</b><br><span style="color:{MU}">Teamplayer · Hülse</span></div></div>'
       + f'<div style="flex:1"></div>{dots(2)}<div style="display:grid;gap:8px;margin-bottom:26px">{btn("Erbsi ausbrüten")}</div>')

# ---------- App-Icons ----------
def icon(bg, inner, size=150, label=''):
    return (f'<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><div style="width:{size}px;height:{size}px;border-radius:{size * .225:.0f}px;background:{bg};display:grid;place-items:center;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.4);position:relative">{inner}</div>'
            f'<span style="font-size:12px;color:{MU}">{label}</span></div>')
ICONS = [('radial-gradient(circle at 50% 35%,#1E2A48,#0D1320)', f'<svg width="110" height="110" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="#5BE7F5" stroke-width="3" stroke-dasharray="120 60" stroke-linecap="round" transform="rotate(-90 32 32)"/></svg><div style="position:absolute">{static(0, 92)}</div>', 'A · Glas + Möhri'),
         ('linear-gradient(160deg,#6FE0C1,#2E9A7E)', f'<div style="margin-top:20px">{static(3, 140)}</div>', 'B · Erbsi auf Mint'),
         ('linear-gradient(160deg,#FFB46A,#E8503E)', f'<div style="margin-top:16px">{static(6, 140)}</div>', 'C · Tomi warm'),
         ('radial-gradient(circle at 50% 40%,#2A3456,#0D1320)', f'<svg width="120" height="120" viewBox="0 0 64 64"><path d="M32 6 C46 6 52 30 52 40 C52 52 43 58 32 58 C21 58 12 52 12 40 C12 30 18 6 32 6z" fill="#F3E7C2"/>{SPOTS_}<path d="M14 32 l6 -4 5 5 6 -6 5 5 6 -5 5 4" stroke="#1B1E27" stroke-width="1.6" fill="none"/></svg>' if False else '', 'D · Ei'),
         ('linear-gradient(160deg,#B9A6FF,#5A3FA0)', f'<div style="margin-top:22px">{static(50, 150)}</div>', 'E · Kicheron'),
         ('#0D1320', f'<svg width="120" height="120" viewBox="0 0 64 64"><path d="M32 10 C20 10 12 20 12 32 C12 44 21 54 32 54" stroke="#5BE7F5" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M32 54 C44 54 52 44 52 32" stroke="#B9E07A" stroke-width="4" fill="none" stroke-linecap="round"/><path transform="translate(32 32) rotate(-45)" d="M0 0 C6 -6 14 -5 20 0 C14 5 6 6 0 0z" fill="#5FB878"/></svg>', 'F · schlicht (Blatt-Ring)')]
SPOTS_ = '<circle cx="22" cy="24" r="3" fill="#B9E07A" opacity=".8"/><circle cx="41" cy="18" r="2.4" fill="#9A7ADA" opacity=".7"/><circle cx="43" cy="46" r="3.2" fill="#E8503E" opacity=".6"/>'
ICONS[3] = (ICONS[3][0], f'<svg width="118" height="118" viewBox="0 0 64 64"><path d="M32 6 C46 6 52 30 52 40 C52 52 43 58 32 58 C21 58 12 52 12 40 C12 30 18 6 32 6z" fill="#F3E7C2"/>{SPOTS_}<path d="M14 32 l6 -4 5 5 6 -6 5 5 6 -5 5 4" stroke="#1B1E27" stroke-width="1.6" fill="none"/></svg>', 'D · Ei mit Riss')
home = ''.join(f'<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:58px;height:58px;border-radius:14px;background:{b}"></div><span style="font-size:9.5px;color:#E8EEF7">{n}</span></div>' for b, n in
               [('#3A7BD5', 'Mail'), ('#F2C230', 'Notizen'), ('#4FA868', 'Karten'), ('#E8503E', 'Kalender')])
home += f'<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:58px;height:58px;border-radius:14px;overflow:hidden;background:{ICONS[1][0]};display:grid;place-items:center"><div style="margin-top:8px">{static(3, 58)}</div></div><span style="font-size:9.5px;color:#E8EEF7">Kalorien</span></div>'
ic1 = (f'<div><h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.02em">App-Icon-Varianten</h1><div style="font-size:13px;color:{MU};margin-top:4px">Für das Home-Bildschirm-Symbol (PWA) · erkennbar auch bei 58 px · Monster statisch, ohne Animation</div></div>'
       f'<div style="display:flex;justify-content:space-between">{"".join(icon(b, i, label=l) for b, i, l in ICONS)}</div>'
       f'<div style="display:flex;gap:24px;align-items:center"><div style="border-radius:28px;padding:18px 22px;background:linear-gradient(160deg,#3B5BA0,#7A4FA0);display:flex;gap:18px">{home}</div>'
       f'<div style="font-size:12px;color:{MU};line-height:1.55;max-width:480px">Vorschau: Variante B im Home-Bildschirm neben Systemsymbolen. Empfehlung: <b style="color:{TX}">A oder B</b> – A passt zum Glas-Design, B ist bei kleiner Größe am klarsten. Das Icon wechselt nicht mit der Saison (iOS-PWAs können das nicht).</div></div>')

BOARDS = [('LG1', page('Erntor neu', lg1, w=1240, h=540, tab=False, pad='32px 36px', gap=18), 'LG1 · Erntor nachgeschärft + die drei Legendären'),
          ('AD1', page('Arena-Duell', ad1, css=DCSS), 'AD1 · Arena-Duell im Glasdom'),
          ('AD2', page('Sieg', ad2, css=DCSS), 'AD2 · Sieg: Emblem vergoldet + Typenrad'),
          ('OB1', page('Willkommen', ob1, tab=False), 'OB1 · Onboarding: Willkommen'),
          ('OB2', page('So funktioniert es', ob2, tab=False), 'OB2 · Onboarding: So funktioniert’s'),
          ('OB3', page('Starter wählen', ob3, tab=False), 'OB3 · Onboarding: Starter-Ei wählen (neue Nutzer)'),
          ('IC1', page('App-Icons', ic1, w=1240, h=400, tab=False, pad='32px 36px', gap=22), 'IC1 · App-Icon-Varianten')]
