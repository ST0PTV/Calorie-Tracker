"""Schlüpf- und Entwicklungs-Animationen (Schleifen) + Storyboard."""
from r3kit import *

ZIG = 'L22 33 L28 37 L34 32 L40 37 L46 33 L52 36'
TOP = f'M32 6 C46 6 52 30 52 36 L46 33 L40 37 L34 32 L28 37 L22 33 L12 36 C12 30 18 6 32 6z'
BOT = f'M12 36 {ZIG} C52 52 43 58 32 58 C21 58 12 52 12 36z'
SPOTS = '<circle cx="22" cy="24" r="3" fill="#B9E07A" opacity=".8"/><circle cx="41" cy="18" r="2.4" fill="#9A7ADA" opacity=".7"/><circle cx="43" cy="46" r="3.2" fill="#E8503E" opacity=".6"/><circle cx="24" cy="48" r="2.2" fill="#F2A65A" opacity=".7"/>'

CSS = '''
@keyframes eggWob{0%,8%{transform:rotate(0)}12%{transform:rotate(-5deg)}16%{transform:rotate(5deg)}20%{transform:rotate(0)}30%{transform:rotate(-8deg)}34%{transform:rotate(8deg)}38%{transform:rotate(0)}43%{transform:rotate(-12deg)}46%{transform:rotate(12deg)}49%,100%{transform:rotate(0)}}
.eggw{animation:eggWob 7s ease-in-out infinite;transform-origin:50% 92%}
@keyframes crack{0%,26%{stroke-dashoffset:70}47%,100%{stroke-dashoffset:0}}
.crack{stroke-dasharray:70;animation:crack 7s linear infinite}
@keyframes topFly{0%,50%{transform:translate(0,0) rotate(0);opacity:1}62%{transform:translate(-16px,-34px) rotate(-40deg);opacity:0}97%{transform:translate(0,0) rotate(0);opacity:0}100%{opacity:1}}
@keyframes botFly{0%,50%{transform:translate(0,0) rotate(0);opacity:1}62%{transform:translate(12px,16px) rotate(22deg);opacity:0}97%{transform:translate(0,0) rotate(0);opacity:0}100%{opacity:1}}
.etop{animation:topFly 7s ease-out infinite;transform-box:fill-box;transform-origin:center}
.ebot{animation:botFly 7s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes flash{0%,48%{transform:scale(0);opacity:0}52%{transform:scale(1);opacity:1}66%{transform:scale(3.2);opacity:0}100%{transform:scale(3.2);opacity:0}}
.flash{animation:flash 7s ease-out infinite}
@keyframes pop{0%,52%{transform:scale(0);opacity:0}60%{transform:scale(1.18);opacity:1}66%{transform:scale(.94);opacity:1}72%,93%{transform:scale(1);opacity:1}99%,100%{transform:scale(1);opacity:0}}
.pop{animation:pop 7s ease-out infinite;transform-origin:50% 85%}
@keyframes lbl{0%,64%{opacity:0;transform:translateY(8px)}72%,93%{opacity:1;transform:none}99%,100%{opacity:0}}
.lbl{animation:lbl 7s ease-out infinite}
@keyframes spark{0%,54%{transform:scale(0) rotate(0);opacity:0}62%{transform:scale(1.2) rotate(90deg);opacity:1}80%,100%{transform:scale(0) rotate(180deg);opacity:0}}
.spark{animation:spark 7s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes halo{0%,100%{transform:scale(.9);opacity:.5}50%{transform:scale(1.08);opacity:1}}
.halo{animation:halo 3.5s ease-in-out infinite}
/* Entwicklung */
@keyframes aN{0%,20%{opacity:1}21%,100%{opacity:0}}
@keyframes aW{0%,20%{opacity:0}21%,29%{opacity:1}30%,35%{opacity:0}36%,40%{opacity:1}41%,44%{opacity:0}45%,47%{opacity:1}48%,49.5%{opacity:0}50%,51%{opacity:1}52%,100%{opacity:0}}
@keyframes bW{0%,29%{opacity:0}30%,35%{opacity:1}36%,40%{opacity:0}41%,44%{opacity:1}45%,47%{opacity:0}48%,49.5%{opacity:1}50%,51%{opacity:0}52%,56%{opacity:1}57%,100%{opacity:0}}
@keyframes bN{0%,56%{opacity:0;transform:scale(.9)}60%{opacity:1;transform:scale(1.1)}66%,94%{opacity:1;transform:scale(1)}100%{opacity:0}}
.aN{animation:aN 8s linear infinite}.aW{animation:aW 8s linear infinite}.bW{animation:bW 8s linear infinite}.bN{animation:bN 8s ease-out infinite;transform-origin:50% 85%}
.white{filter:brightness(0) invert(1) drop-shadow(0 0 10px #fff)}
@keyframes ev-flash{0%,54%{transform:scale(0);opacity:0}57%{transform:scale(1);opacity:1}70%,100%{transform:scale(3.4);opacity:0}}
.evflash{animation:ev-flash 8s ease-out infinite}
@keyframes ev-glow{0%,18%{opacity:0}30%,55%{opacity:1}70%,100%{opacity:0}}
.evglow{animation:ev-glow 8s ease-in-out infinite}
@keyframes ev-lbl{0%,60%{opacity:0}68%,94%{opacity:1}100%{opacity:0}}
@keyframes ev-lbl0{0%,18%{opacity:1}24%,100%{opacity:0}}
.evl{animation:ev-lbl 8s ease-out infinite}.evl0{animation:ev-lbl0 8s ease-out infinite}
'''


def egg_svg(size, cls=True):
    c = (lambda x: f' class="{x}"') if cls else (lambda x: '')
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 64 64" aria-hidden="true" style="overflow:visible">'
            f'<ellipse cx="32" cy="60" rx="14" ry="2.4" fill="rgba(255,255,255,0.08)"/>'
            f'<g{c("eggw")}><path{c("ebot")} d="{BOT}" fill="#F3E7C2"/><path{c("etop")} d="{TOP}" fill="#F3E7C2"/>'
            f'<g{c("etop")}>{SPOTS}</g><path{c("crack")} d="M12 36 {ZIG}" stroke="#1B1E27" stroke-width="1.6" fill="none" stroke-linejoin="round"/></g></svg>')


def sparks(n=6, r=110, cls='spark'):
    import math
    out = ''
    for k in range(n):
        a = math.radians(k * 360 / n + 15)
        x, y = 50 + 42 * math.cos(a), 50 + 42 * math.sin(a)
        out += f'<path class="{cls}" style="animation-delay:{k * .05:.2f}s" transform="translate({x:.1f} {y:.1f})" d="M0 -5 L1.3 -1.3 5 0 1.3 1.3 0 5 -1.3 1.3 -5 0 -1.3 -1.3z" fill="#FFE97A"/>'
    return f'<svg width="{r * 2}" height="{r * 2}" viewBox="0 0 100 100" aria-hidden="true" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);overflow:visible">{out}</svg>'


def stage(inner, glow='#FFE97A'):
    return (f'<div style="position:relative;height:420px;display:grid;place-items:center">'
            f'<div class="halo" style="position:absolute;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,{glow}38,transparent 66%)"></div>'
            f'<div style="position:absolute;inset:0"><svg class="i-rays" style="position:absolute;left:50%;top:50%;width:420px;height:420px;margin:-210px 0 0 -210px;transform-origin:50% 50%" viewBox="0 0 100 100" aria-hidden="true">'
            + ''.join(f'<path d="M50 50 L{50 + 60 * __import__("math").cos(k * .3927):.1f} {50 + 60 * __import__("math").sin(k * .3927):.1f} L{50 + 60 * __import__("math").cos(k * .3927 + .12):.1f} {50 + 60 * __import__("math").sin(k * .3927 + .12):.1f}z" fill="{glow}" opacity=".07"/>' for k in range(16))
            + '</svg></div>' + inner + '</div>')


# ---------- HA1 Schlüpfen ----------
hatch = stage(f'<div style="position:absolute;display:grid;place-items:center">{egg_svg(220)}</div>'
              f'<div class="flash" style="position:absolute;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,#fff,#FFF3B0 45%,transparent 70%)"></div>'
              f'<div class="pop" style="position:absolute">{anim.build(49, 240, tap=False, seed=12)}</div>' + sparks())
ha1 = (f'<div style="text-align:center;margin-top:10px"><div style="font-size:11px;color:{SEED};letter-spacing:.12em;text-transform:uppercase;font-weight:700">3 getrackte Tage geschafft</div>'
       f'<h1 style="margin:6px 0 0;font-size:24px;font-weight:700">Im Beet bewegt sich was …</h1></div>'
       + hatch +
       f'<div class="lbl" style="text-align:center"><div style="font-size:26px;font-weight:700">Kichi ist geschlüpft!</div>'
       f'<div style="display:flex;gap:6px;justify-content:center;margin-top:6px">{chip("Hülse")}<span style="font-size:11px;color:{MU}">eingeladen beim Linsen-Dal</span></div></div>'
       f'<div style="flex:1"></div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:24px">{btn("Feldnotizen", False)}{btn("In den Garten")}</div>'
       f'<div style="font-size:10px;color:{MU};text-align:center;margin:-14px 0 14px">Animation: 7 s, Schleife nur im Entwurf · in der App einmalig, antippen überspringt</div>')
# ---------- HA2 Entwicklung ----------
A, B = 16, 17
evo = stage(f'<div class="evglow" style="position:absolute;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,#fff8,transparent 65%)"></div>'
            f'<div class="aN" style="position:absolute">{anim.build(A, 210, tap=False, seed=2)}</div>'
            f'<div class="aW white" style="position:absolute">{anim.build(A, 210, tap=False, seed=2)}</div>'
            f'<div class="bW white" style="position:absolute">{anim.build(B, 240, tap=False, seed=3)}</div>'
            f'<div class="evflash" style="position:absolute;width:130px;height:130px;border-radius:50%;background:radial-gradient(circle,#fff,#FFF3B0 45%,transparent 70%)"></div>'
            f'<div class="bN" style="position:absolute">{anim.build(B, 240, tap=False, seed=3)}</div>', glow='#F2C230')
ha2 = (f'<div style="text-align:center;margin-top:10px"><div style="font-size:11px;color:#F2C230;letter-spacing:.12em;text-transform:uppercase;font-weight:700">20 Tage im Oktober</div>'
       f'<h1 style="margin:6px 0 0;font-size:24px;font-weight:700">Papri entwickelt sich!</h1></div>'
       + evo +
       f'<div style="position:relative;height:60px;text-align:center"><div class="evl0" style="position:absolute;inset:0"><div style="font-size:15px;color:{MU}">Was passiert mit Papri?</div></div>'
       f'<div class="evl" style="position:absolute;inset:0"><div style="font-size:26px;font-weight:700">Paprisma</div><div style="font-size:11.5px;color:{MU}">Superform · Level 13</div></div></div>'
       f'<div style="flex:1"></div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:24px">{btn("Sammelkarte", False)}{btn("Weiter")}</div>'
       f'<div style="font-size:10px;color:{MU};text-align:center;margin:-14px 0 14px">Animation: 8 s · weißes Flackern wird schneller, dann Lichtblitz</div>')

# ---------- HA3 Storyboard ----------
def frame(n, t, art, txt):
    return (f'<div style="{CARD};border-radius:18px;padding:12px;flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">'
            f'<div style="font-size:10.5px;color:{MU};font-family:ui-monospace,Menlo,monospace">{n} · {t}</div><div style="height:120px;width:100%;display:grid;place-items:center;position:relative">{art}</div>'
            f'<div style="font-size:11px;color:{MU};line-height:1.4">{txt}</div></div>')
egg_static = lambda rot=0, crack=False, open_=False: (
    f'<svg width="96" height="96" viewBox="0 0 64 64" aria-hidden="true" style="overflow:visible"><g transform="rotate({rot} 32 58)">'
    + (f'<path d="{BOT}" fill="#F3E7C2" transform="translate(6 8) rotate(18 32 46)" opacity=".8"/><path d="{TOP}" fill="#F3E7C2" transform="translate(-6 -10) rotate(-30 32 20)" opacity=".8"/>' if open_ else
       f'<path d="{BOT}" fill="#F3E7C2"/><path d="{TOP}" fill="#F3E7C2"/>{SPOTS}')
    + (f'<path d="M12 36 {ZIG}" stroke="#1B1E27" stroke-width="1.6" fill="none"/>' if crack and not open_ else '') + '</g></svg>')
flash_static = '<div style="width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,#fff,#FFF3B0 45%,transparent 70%)"></div>'
row1 = ''.join([frame('0,0 s', 'Ruhe', egg_static(), 'Ei sitzt im Beet, leichtes Atmen'),
                frame('0,8 s', 'Wackeln', egg_static(-10), 'drei Wackler, jeder stärker'),
                frame('2,0 s', 'Riss', egg_static(8, True), 'Zickzack-Riss zeichnet sich'),
                frame('3,5 s', 'Blitz', flash_static, 'heller Lichtblitz, Haptik-Tipp'),
                frame('3,7 s', 'Schale fliegt', egg_static(0, False, True) + f'<div style="position:absolute">{anim.build(49, 60, tap=False)}</div>', 'Hälften fliegen weg, Monster springt raus'),
                frame('4,2 s', 'Da!', f'{anim.build(49, 96, tap=False)}', 'Funken, Name erscheint, Knöpfe')])
row2 = ''.join([frame('0,0 s', 'Ausgang', anim.build(16, 96, tap=False), 'Papri in Normalform'),
                frame('1,6 s', 'Leuchten', f'<div class="white">{anim.build(16, 96, tap=False)}</div>', 'Silhouette wird weiß'),
                frame('2,4–4,2 s', 'Flackern', f'<div style="display:flex;align-items:flex-end"><div class="white" style="opacity:.6">{anim.build(16, 70, tap=False)}</div><div class="white">{anim.build(17, 86, tap=False)}</div></div>', 'wechselt immer schneller zwischen beiden Formen'),
                frame('4,4 s', 'Blitz', flash_static, 'Lichtblitz'),
                frame('4,8 s', 'Neue Form', anim.build(17, 100, tap=False), 'Paprisma, kurzer Hüpfer'),
                frame('5,4 s', 'Karte', f'<div style="width:70px;height:96px;border-radius:10px;border:2px solid #F2C230;background:linear-gradient(160deg,#2A2E44,#1A1F30);display:grid;place-items:center">{anim.build(17, 58, tap=False)}</div>', 'Sammelkarte wird freigeschaltet')])
ha3 = (f'<div><h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.02em">Storyboard: Schlüpfen & Entwickeln</h1>'
       f'<div style="font-size:13px;color:{MU};margin-top:4px">Zeitachse der beiden Animationen · bei „Bewegung reduzieren“ nur Überblendung ohne Wackeln und Flackern</div></div>'
       f'<div style="font-size:13px;font-weight:600;margin-top:4px">Schlüpfen (Beet, Monatsei)</div><div style="display:flex;gap:10px">{row1}</div>'
       f'<div style="font-size:13px;font-weight:600;margin-top:4px">Entwicklung (Normalform → Superform, Bonus-Monster)</div><div style="display:flex;gap:10px">{row2}</div>')

BOARDS = [('HA1', page('Schlüpfen', ha1, tab=False, css=CSS, pad='44px 16px 0'), 'HA1 · Schlüpf-Animation (Schleife)'),
          ('HA2', page('Entwicklung', ha2, tab=False, css=CSS), 'HA2 · Entwicklungs-Animation (Schleife)'),
          ('HA3', page('Storyboard', ha3, w=1240, h=600, tab=False, pad='32px 36px', gap=12, css=CSS), 'HA3 · Storyboard Schlüpfen + Entwickeln')]
