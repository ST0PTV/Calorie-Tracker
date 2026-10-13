#!/usr/bin/env python3
"""Animierte Gemüsemonster: zerlegt die Kompendium-SVGs in bewegliche Teile und erzeugt CSS-Animationen.
Ruhe-Animationen (Klassen i-*) laufen dauerhaft, typische Bewegung (Klasse sg + s-*) einmal pro Zyklus --d."""
import re, random

import os
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_src = open(f'{REPO}/docs/gemuesemonster.html', encoding='utf-8').read()
T = dict(re.findall(r'<template id="(t\d+)">(.*?)</template>', _src, re.S))


def top(svg):
    inner = re.sub(r'^\s*<svg[^>]*>|</svg>\s*$', '', svg.strip())
    out, depth, start = [], 0, None
    for m in re.finditer(r'<(/?)(\w+)[^>]*?(/?)>', inner):
        close, selfc = m.group(1), m.group(3)
        if close:
            depth -= 1
        if depth == 0 and not close:
            start = m.start()
        if not close and not selfc:
            depth += 1
        if depth == 0:
            out.append(inner[start:m.end()])
    return out


def attr(el, a):
    m = re.search(rf'\s{a}="([^"]*)"', el)
    return m.group(1) if m else None


# ---------------- Keyframes ----------------
IDLE = {
    'i-breathe': ('3.4s ease-in-out infinite', '0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.968)}'),
    'i-breathe-slow': ('4.8s ease-in-out infinite', '0%,100%{transform:scale(1,1)}50%{transform:scale(1.02,.978)}'),
    'i-sleep': ('5.2s ease-in-out infinite', '0%,100%{transform:scale(1,1)}45%{transform:scale(1.05,.95)}'),
    'i-hop': ('2.3s ease-in-out infinite', '0%{transform:translateY(0) scale(1.05,.95)}28%{transform:translateY(-3.5px) scale(.97,1.03)}52%{transform:translateY(0) scale(1.05,.95)}66%,100%{transform:translateY(0) scale(1,1)}'),
    'i-shadowhop': ('2.3s ease-in-out infinite', '0%{transform:scale(1.04)}28%{transform:scale(.78)}52%{transform:scale(1.04)}66%,100%{transform:scale(1)}'),
    'i-float': ('5s ease-in-out infinite', '0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}'),
    'i-shadowfloat': ('5s ease-in-out infinite', '0%,100%{transform:scale(1)}50%{transform:scale(.86)}'),
    'i-lean': ('4.4s ease-in-out infinite alternate', '0%{transform:rotate(-3.5deg)}100%{transform:rotate(3.5deg)}'),
    'i-blink': ('var(--b) linear infinite', '0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.08)}'),
    'i-sway': ('3s ease-in-out infinite alternate', '0%{transform:rotate(-6deg)}100%{transform:rotate(6deg)}'),
    'i-sway2': ('3s ease-in-out infinite alternate-reverse', '0%{transform:rotate(-6deg)}100%{transform:rotate(6deg)}'),
    'i-swayfast': ('1.15s ease-in-out infinite alternate', '0%{transform:rotate(-9deg)}100%{transform:rotate(9deg)}'),
    'i-swayslow': ('4.6s ease-in-out infinite alternate', '0%{transform:rotate(-3.5deg)}100%{transform:rotate(3.5deg)}'),
    'i-tail': ('2.4s ease-in-out infinite alternate', '0%{transform:rotate(-9deg)}100%{transform:rotate(9deg)}'),
    'i-wingL': ('2.2s ease-in-out infinite alternate', '0%{transform:rotate(3deg)}100%{transform:rotate(-7deg)}'),
    'i-wingR': ('2.2s ease-in-out infinite alternate', '0%{transform:rotate(-3deg)}100%{transform:rotate(7deg)}'),
    'i-flicker': ('.42s ease-in-out infinite alternate', '0%{transform:scale(.92,.82);opacity:.75}100%{transform:scale(1.04,1.14);opacity:1}'),
    'i-glow': ('1.8s ease-in-out infinite alternate', '0%{opacity:.45}100%{opacity:1}'),
    'i-pulse': ('3.2s ease-in-out infinite alternate', '0%{transform:scale(.94);opacity:.65}100%{transform:scale(1.05);opacity:1}'),
    'i-twinkle': ('2.4s ease-in-out infinite', '0%,100%{transform:scale(.3);opacity:.25}50%{transform:scale(1.1);opacity:1}'),
    'i-blush': ('2.6s ease-in-out infinite alternate', '0%{opacity:.35}100%{opacity:1}'),
    'i-drip': ('2.6s ease-in infinite', '0%{transform:translateY(-1px);opacity:0}15%{opacity:1}75%{transform:translateY(6px);opacity:1}100%{transform:translateY(9px);opacity:0}'),
    'i-rain': ('1.7s ease-in infinite', '0%{transform:translateY(-3px);opacity:0}20%{opacity:.9}100%{transform:translateY(11px);opacity:0}'),
    'i-rise': ('3.8s ease-out infinite', '0%{transform:translateY(2px);opacity:0}20%{opacity:.9}100%{transform:translate(2px,-12px);opacity:0}'),
    'i-zzz': ('3.9s ease-out infinite', '0%{transform:translate(0,0) scale(.5);opacity:0}20%{opacity:1}100%{transform:translate(6px,-13px) scale(1.15);opacity:0}'),
    'i-ripple': ('2.4s ease-in-out infinite alternate', '0%{transform:scale(.9)}100%{transform:scale(1.1)}'),
    'i-look': ('6.5s ease-in-out infinite', '0%,18%,92%,100%{transform:translate(0,0)}28%,46%{transform:translate(-1.6px,.3px)}56%,78%{transform:translate(1.6px,-.4px)}'),
    'i-rays': ('36s linear infinite', '0%{transform:rotate(0)}100%{transform:rotate(360deg)}'),
    'i-drift': ('6s ease-in-out infinite alternate', '0%{transform:translateX(-2.5px)}100%{transform:translateX(2.5px)}'),
    'i-cape': ('2.8s ease-in-out infinite alternate', '0%{transform:scaleX(.97)}100%{transform:scaleX(1.03)}'),
    'i-zapflicker': ('1.7s linear infinite', '0%,18%,26%,55%,66%,100%{opacity:1}22%{opacity:.15}60%{opacity:.25}'),
    'i-lines': ('1.6s ease-in-out infinite alternate', '0%{opacity:.25;transform:translateX(1px)}100%{opacity:.8;transform:translateX(-1px)}'),
    'i-mane': ('3s ease-in-out infinite alternate', '0%{transform:scale(.97)}100%{transform:scale(1.04)}'),
}

SIG = {  # Frames 0–100 innerhalb des Aktionsfensters (66–94 % von --d); full=True: über den ganzen Zyklus
    's-jump': ['transform:none', (15, 'transform:translateY(1px) scale(1.08,.9)'), (45, 'transform:translateY(-9px) scale(.94,1.07)'), (72, 'transform:translateY(0) scale(1.08,.92)'), (88, 'transform:scale(.98,1.02)'), 'transform:none'],
    's-bigjump': ['transform:none', (10, 'transform:translateY(1px) scale(1.1,.88)'), (35, 'transform:translateY(-17px) rotate(-8deg)'), (58, 'transform:translateY(0) scale(1.1,.9)'), (70, 'transform:translateY(-6px) rotate(4deg)'), (84, 'transform:translateY(0) scale(1.06,.94)'), 'transform:none'],
    's-roll': ['transform:none', (12, 'transform:translateY(1px) scale(1.06,.94)'), (50, 'transform:translateY(-10px) rotate(180deg)'), (86, 'transform:translateY(0) rotate(360deg)'), 'transform:rotate(360deg)'],
    's-twirl': ['transform:none', (12, 'transform:translateY(1px)'), (60, 'transform:translateY(-4px) rotate(360deg)'), (80, 'transform:translateY(0) rotate(360deg)'), 'transform:rotate(360deg)'],
    's-stomp': ['transform:none', (14, 'transform:translateY(-4px)'), (28, 'transform:translateY(1px) scale(1.12,.86)'), (38, 'transform:translateX(-1.6px) scale(1.05,.95)'), (48, 'transform:translateX(1.6px)'), (58, 'transform:translateX(-1.2px)'), (68, 'transform:translateX(1.2px)'), (78, 'transform:none'), 'transform:none'],
    's-pumpL': ['transform:none', (18, 'transform:rotate(-20deg)'), (36, 'transform:rotate(2deg)'), (54, 'transform:rotate(-20deg)'), (72, 'transform:rotate(2deg)'), 'transform:none'],
    's-pumpR': ['transform:none', (18, 'transform:rotate(20deg)'), (36, 'transform:rotate(-2deg)'), (54, 'transform:rotate(20deg)'), (72, 'transform:rotate(-2deg)'), 'transform:none'],
    's-flapL': ['transform:none', (12, 'transform:rotate(-24deg)'), (24, 'transform:rotate(6deg)'), (36, 'transform:rotate(-24deg)'), (48, 'transform:rotate(6deg)'), (60, 'transform:rotate(-24deg)'), (72, 'transform:rotate(6deg)'), (86, 'transform:none'), 'transform:none'],
    's-flapR': ['transform:none', (12, 'transform:rotate(24deg)'), (24, 'transform:rotate(-6deg)'), (36, 'transform:rotate(24deg)'), (48, 'transform:rotate(-6deg)'), (60, 'transform:rotate(24deg)'), (72, 'transform:rotate(-6deg)'), (86, 'transform:none'), 'transform:none'],
    's-rise': ['transform:none', (12, 'transform:translateY(1px)'), (40, 'transform:translateY(-6px)'), (72, 'transform:translateY(-6px)'), 'transform:none'],
    's-whip': ['transform:none', (25, 'transform:rotate(-20deg)'), (40, 'transform:rotate(26deg)'), (55, 'transform:rotate(-8deg)'), (70, 'transform:none'), 'transform:none'],
    's-pea': ['transform:none', (18, 'transform:translateY(-4.5px) scale(1.14)'), (36, 'transform:none'), 'transform:none'],
    's-shield': ['transform:none', (22, 'transform:translate(-3px,-4px) rotate(-14deg)'), (75, 'transform:translate(-3px,-4px) rotate(-14deg)'), 'transform:none'],
    's-wobble': ['transform:none', (12, 'transform:scale(1.13,.87)'), (25, 'transform:scale(.9,1.1)'), (37, 'transform:scale(1.07,.93)'), (50, 'transform:scale(.96,1.04)'), (62, 'transform:scale(1.02,.98)'), (75, 'transform:none'), 'transform:none'],
    's-shake': ['transform:none', (10, 'transform:translateX(-1.8px)'), (20, 'transform:translateX(1.8px)'), (30, 'transform:translateX(-1.8px)'), (40, 'transform:translateX(1.8px)'), (50, 'transform:translateX(-1.2px)'), (60, 'transform:translateX(1.2px)'), (70, 'transform:none'), 'transform:none'],
    's-steam': ['transform:translateY(0);opacity:0', (20, 'opacity:.9'), 'transform:translate(var(--dx,0px),-11px);opacity:0'],
    's-erupt': ['transform:none', (14, 'transform:scale(1.1,.88)'), (30, 'transform:translateY(-3px) scale(.95,1.07)'), (46, 'transform:none'), 'transform:none'],
    's-spray': ['transform:translate(0,0) scale(.5);opacity:0', (8, 'opacity:1'), (55, 'transform:translate(calc(var(--dx)*.6),calc(var(--dy)*1.2)) scale(1)'), 'transform:translate(var(--dx),var(--dy)) scale(.8);opacity:0'],
    's-nod': ['transform:none', (35, 'transform:rotate(9deg)'), (66, 'transform:rotate(12deg)'), (74, 'transform:translateY(-1.5px) rotate(-4deg)'), (88, 'transform:none'), 'transform:none'],
    's-stretchL': ['transform:none', (30, 'transform:rotate(30deg)'), (70, 'transform:rotate(30deg)'), 'transform:none'],
    's-stretchR': ['transform:none', (30, 'transform:rotate(-30deg)'), (70, 'transform:rotate(-30deg)'), 'transform:none'],
    's-yawn': ['transform:none', (30, 'transform:scale(1.4,2)'), (70, 'transform:scale(1.4,2)'), 'transform:none'],
    's-peek': ['transform:none', (14, 'transform:translateY(-3.5px) rotate(-10deg)'), (28, 'transform:none'), (42, 'transform:translateY(-3.5px) rotate(10deg)'), (56, 'transform:none'), 'transform:none'],
    's-giggle': ['transform:none', (8, 'transform:rotate(-5deg)'), (16, 'transform:rotate(5deg)'), (24, 'transform:rotate(-5deg)'), (32, 'transform:rotate(5deg)'), (40, 'transform:rotate(-3deg)'), (48, 'transform:rotate(3deg)'), (56, 'transform:none'), 'transform:none'],
    's-laugh': ['transform:none', (8, 'transform:translateY(-2.5px) scale(1.03,.97)'), (16, 'transform:none'), (24, 'transform:translateY(-2.5px) scale(1.03,.97)'), (32, 'transform:none'), (40, 'transform:translateY(-2.5px) scale(1.03,.97)'), (48, 'transform:none'), (58, 'transform:rotate(-4deg)'), (70, 'transform:none'), 'transform:none'],
    's-laughmouth': ['transform:none', (8, 'transform:scaleY(1.6)'), (60, 'transform:scaleY(1.6)'), (72, 'transform:none'), 'transform:none'],
    's-flare': ['opacity:1', (10, 'opacity:.35'), (20, 'opacity:1'), (32, 'opacity:.4'), (44, 'opacity:1'), 'opacity:1'],
    's-hide': ['transform:none', (20, 'transform:translateY(4px) scale(1.05,.84)'), (70, 'transform:translateY(4px) scale(1.05,.84)'), (85, 'transform:translateY(-1px)'), 'transform:none'],
    's-coverL': ['transform:none', (25, 'transform:translate(4px,-8px) rotate(14deg)'), (75, 'transform:translate(4px,-8px) rotate(14deg)'), 'transform:none'],
    's-coverR': ['transform:none', (25, 'transform:translate(-4px,-8px) rotate(-14deg)'), (75, 'transform:translate(-4px,-8px) rotate(-14deg)'), 'transform:none'],
    's-dash': ['transform:none', (14, 'transform:translateX(2px) rotate(5deg)'), (32, 'transform:translateX(-8px) rotate(-9deg)'), (62, 'transform:translateX(-8px) rotate(-9deg)'), (84, 'transform:translateX(1px)'), 'transform:none'],
    's-lines': ['opacity:.35;transform:none', (32, 'opacity:1;transform:translateX(5px)'), (62, 'opacity:1;transform:translateX(5px)'), 'opacity:.35;transform:none'],
    's-sniff': ['transform:none', (10, 'transform:translateY(-1.6px)'), (20, 'transform:none'), (30, 'transform:translateY(-1.6px)'), (40, 'transform:none'), 'transform:none'],
    's-wipe': ['transform:none', (28, 'transform:translate(-3px,-8px) rotate(-30deg)'), (40, 'transform:translate(-3px,-8px) rotate(-18deg)'), (52, 'transform:translate(-3px,-8px) rotate(-30deg)'), (72, 'transform:translate(-3px,-8px) rotate(-18deg)'), 'transform:none'],
    's-sob': ['transform:none', (10, 'transform:scale(1.03,.94)'), (20, 'transform:none'), (30, 'transform:scale(1.03,.94)'), (40, 'transform:none'), (50, 'transform:scale(1.03,.94)'), (60, 'transform:none'), 'transform:none'],
    's-flood': ['transform:translateY(-2px);opacity:0', (15, 'opacity:1'), 'transform:translate(var(--dx,0px),16px);opacity:0'],
    's-wink': ['transform:none', (18, 'transform:scaleY(.08)'), (55, 'transform:scaleY(.08)'), (70, 'transform:none'), 'transform:none'],
    's-shades': ['transform:none', (22, 'transform:translateY(3px)'), (72, 'transform:translateY(3px)'), 'transform:none'],
    's-glint': ['opacity:.6;transform:none', (30, 'opacity:1;transform:translateX(6px)'), (55, 'opacity:.6;transform:none'), 'opacity:.6;transform:none'],
    's-waveR': ['transform:none', (12, 'transform:rotate(-28deg)'), (25, 'transform:rotate(10deg)'), (37, 'transform:rotate(-28deg)'), (50, 'transform:rotate(10deg)'), (62, 'transform:rotate(-28deg)'), (80, 'transform:none'), 'transform:none'],
    's-snap': ['transform:none', (14, 'transform:rotate(-20deg)'), (28, 'transform:rotate(3deg)'), (44, 'transform:rotate(-20deg)'), (58, 'transform:rotate(3deg)'), (72, 'transform:none'), 'transform:none'],
    's-breeze': ['transform:translateX(4px);opacity:0', (20, 'opacity:.9'), 'transform:translateX(-16px);opacity:0'],
    's-proud': ['transform:none', (28, 'transform:translateY(-1.5px) rotate(-8deg)'), (72, 'transform:translateY(-1.5px) rotate(-8deg)'), 'transform:none'],
    's-bow': ['transform:none', (28, 'transform:translateY(2px) rotate(13deg)'), (66, 'transform:translateY(2px) rotate(13deg)'), (86, 'transform:none'), 'transform:none'],
    's-hat': ['transform:none', (25, 'transform:translateY(-6px) rotate(-14deg)'), (70, 'transform:translateY(-6px) rotate(-14deg)'), 'transform:none'],
    's-scepter': ['transform:none', (22, 'transform:rotate(-18deg)'), (36, 'transform:translateY(-2px) rotate(-18deg)'), (72, 'transform:translateY(-2px) rotate(-18deg)'), 'transform:none'],
    's-burst': ['transform:scale(.2);opacity:0', (10, 'opacity:1'), 'transform:scale(2.6);opacity:0'],
    's-zap': ['transform:none', (8, 'transform:translate(-1.2px,.5px)'), (16, 'transform:translate(1.2px,-.5px)'), (24, 'transform:translate(-1.2px,.5px)'), (32, 'transform:translate(1.2px,-.5px)'), (40, 'transform:none'), 'transform:none'],
    's-flash': ['opacity:0', (10, 'opacity:.55'), (22, 'opacity:0'), (34, 'opacity:.45'), (48, 'opacity:0'), 'opacity:0'],
    's-armsL': ['transform:none', (25, 'transform:rotate(28deg)'), (70, 'transform:rotate(28deg)'), 'transform:none'],
    's-armsR': ['transform:none', (25, 'transform:rotate(-28deg)'), (70, 'transform:rotate(-28deg)'), 'transform:none'],
    's-puff': ['transform:translate(0,0) scale(.4);opacity:0', (15, 'opacity:1'), 'transform:translate(var(--dx),var(--dy)) scale(1.25);opacity:0'],
    's-ripplebig': ['transform:none', (25, 'transform:scale(1.3)'), (55, 'transform:none'), 'transform:none'],
    's-tap': ['transform:none', (18, 'transform:translateY(-5px)'), (28, 'transform:translateY(1px)'), (38, 'transform:none'), (54, 'transform:translateY(-5px)'), (64, 'transform:translateY(1px)'), (74, 'transform:none'), 'transform:none'],
    's-cast': ['transform:none', (28, 'transform:translateY(-3px) rotate(-12deg)'), (72, 'transform:translateY(-3px) rotate(-12deg)'), 'transform:none'],
    's-spout': ['transform:none', (25, 'transform:scale(1.4,2)'), (70, 'transform:scale(1.4,2)'), 'transform:none'],
    's-roar': ['transform:none', (20, 'transform:scale(1.14)'), (65, 'transform:scale(1.14)'), 'transform:none'],
    's-roarbody': ['transform:none', (20, 'transform:translateY(-2px) scale(1.04)'), (65, 'transform:translateY(-2px) scale(1.04)'), 'transform:none'],
    's-raysfast': ['opacity:1', (20, 'opacity:.2'), (40, 'opacity:1'), (60, 'opacity:.2'), 'opacity:1'],
    's-sparkle': ['transform:scale(1);opacity:1', (25, 'transform:scale(1.8);opacity:1'), (55, 'transform:scale(.4);opacity:.3'), 'transform:scale(1);opacity:1'],
    's-orb': ['transform:none', (20, 'transform:scale(1.6)'), (60, 'transform:scale(1.6)'), 'transform:none'],
}
FULL = {  # über den ganzen Zyklus statt nur im Aktionsfenster
    's-colA': '0%,100%{fill:#E8503E}33%{fill:#F2C230}66%{fill:#5FB878}',
    's-colB': '0%,100%{fill:#5FB878}33%{fill:#E8503E}66%{fill:#F2C230}',
    's-colC': '0%,100%{fill:#F2C230}33%{fill:#5FB878}66%{fill:#E8503E}',
}
W0, W1 = 64, 94


def sig_kf(name, frames):
    first, last = frames[0], frames[-1]
    out = f'0%,{W0}%{{{first}}}'
    for p, css in frames[1:-1]:
        out += f'{W0 + (W1 - W0) * p / 100:.1f}%{{{css}}}'
    out += f'{W1}%,100%{{{last}}}'
    return f'@keyframes {name}{{{out}}}'


def css_lib(tap=True):
    s = []
    for k, (timing, kf) in IDLE.items():
        s.append(f'@keyframes {k}{{{kf}}}.{k}{{animation:{k} {timing}}}')
    s.append('[class^="i-"]{animation-delay:var(--x,0s)}')
    for k, fr in SIG.items():
        s.append(sig_kf(k, fr) + f'.{k}{{animation-name:{k}}}')
    for k, kf in FULL.items():
        s.append(f'@keyframes {k}{{{kf}}}.{k}{{animation-name:{k};animation-timing-function:linear!important}}')
    s.append('.sg{animation-duration:var(--d);animation-delay:calc(var(--o) + var(--x,0s));animation-iteration-count:infinite;animation-timing-function:ease-in-out}')
    s.append('.xo{opacity:0}')
    s.append('.calm .sg{animation:none!important}')
    if tap:
        s.append('.tapw{transition:transform .14s ease-out;transform-origin:32px 58px}button:active .tapw{transform:scale(1.1,.88)}')
    return '\n'.join(s)


# ---------------- Konfiguration ----------------
def L(cls, origin=None, x=0, **kw):
    return (cls, origin, x, kw)


# parts: Liste (Indizes, [Ebenen außen→innen]); act: Ebene für das ganze Monster; idle: Klasse für den Körper
# extras: (Ebene 'front'|'back', SVG-Markup, [Ebenen])
CFG = {}
STAR = 'M0 -3 L.9 -.9 3 0 .9 .9 0 3 -.9 .9 -3 0 -.9 -.9z'
Z = lambda x, y, s, d: f'<path d="M{x} {y} h{s} l-{s} {s} h{s}" stroke="#CFE8EE" stroke-width="{0.9 * s / 3:.2f}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'


def zzz(x, y):
    return [('front', Z(x, y, 3, 0), [L('i-zzz', f'{x}px {y}px', 0)]),
            ('front', Z(x + 2, y - 2, 2.2, 0), [L('i-zzz', f'{x + 2}px {y - 2}px', -1.3)]),
            ('front', Z(x + 4, y - 4, 1.6, 0), [L('i-zzz', f'{x + 4}px {y - 4}px', -2.6)])]


def spores(x, y, col='#E0D2FF', n=5, r=1.6, spread=12):
    out = []
    for k in range(n):
        ang = -150 + k * (120 / max(1, n - 1))
        import math
        dx, dy = spread * math.cos(math.radians(ang)), spread * math.sin(math.radians(ang))
        out.append(('front', f'<circle cx="{x}" cy="{y}" r="{r}" fill="{col}"/>', [L('sg s-puff xo', f'{x}px {y}px', k * 0.05, dx=f'{dx:.1f}px', dy=f'{dy:.1f}px')]))
    return out


def ring(x, y, r, col, w=1.4):
    return ('front', f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{col}" stroke-width="{w}"/>', [L('sg s-burst xo', f'{x}px {y}px')])


C = CFG
# --- Starter ---
C[0] = dict(name='Möhri', kind='baby', parts=[([4, 5, 6], [L('i-swayfast', '32px 28px')])], act=L('sg s-jump', '32px 58px'),
            rest='hüpft, Blätter wippen', sig='Freudensprung')
C[1] = dict(name='Möhrax', kind='normal', split={2: 2}, parts=[(['2a'], [L('sg s-pumpL', '16px 36px')]), (['2b'], [L('sg s-pumpR', '48px 36px')]),
            ([4, 5, 6, 7, 8], [L('i-sway', '32px 23px')])], act=L('sg s-stomp', '32px 58px'), rest='atmet, Blätter wiegen', sig='stampft auf, pumpt die Arme')
C[2] = dict(name='Möhrgon', kind='super', parts=[([1], [L('i-tail', '42px 52px'), L('sg s-whip', '42px 52px', .25)]),
            ([2], [L('i-wingL', '20px 30px'), L('sg s-flapL', '20px 30px')]), ([3], [L('i-wingR', '44px 30px'), L('sg s-flapR', '44px 30px')]),
            ([4], [L('i-wingL', '20px 34px', -.3), L('sg s-flapL', '20px 34px', .06)]), ([5], [L('i-wingR', '44px 34px', -.3), L('sg s-flapR', '44px 34px', .06)]),
            ([9, 10, 11], [L('i-sway', '32px 18px')])], act=L('sg s-rise', '32px 58px'), rest='Flügel zucken, Schwanz pendelt', sig='hebt ab, Wurzelpeitsche')
C[3] = dict(name='Erbsi', kind='baby', parts=[([1], [L('i-swayfast', '32px 22px')]), ([2], [L('i-sway', '32px 22px')])],
            act=L('sg s-roll', '32px 40px'), rest='hüpft, Ranke ringelt sich', sig='Purzelbaum')
C[4] = dict(name='Schotti', kind='normal', parts=[([3], [L('sg s-pea', '20px 44px')]), ([4], [L('sg s-pea', '32px 44px', .18)]), ([5], [L('sg s-pea', '44px 44px', .36)]),
            ([6], [L('sg s-pea', '20px 44px')]), ([7], [L('sg s-pea', '44px 44px', .36)]), ([13], [L('i-sway', '58px 40px')])],
            rest='atmet, Ranke wippt', sig='La-Ola der drei Erbsen')
C[5] = dict(name='Schotador', kind='super', parts=[([2], [L('i-sway', '10px 40px')]), ([5, 6], [L('sg s-shield', '49px 40px')])],
            act=L('sg s-stomp', '32px 58px', .1), rest='atmet, Rankenpeitsche wiegt', sig='reißt den Schild hoch')
C[6] = dict(name='Tomi', kind='baby', parts=[([3, 4, 5, 6, 7], [L('i-swayfast', '32px 29px')]), ([13, 14], [L('i-blush')])],
            act=L('sg s-wobble', '32px 56px'), rest='hüpft, Krönchen wippt', sig='wackelt wie Pudding')
C[7] = dict(name='Tomatz', kind='normal', split={1: 2}, parts=[(['1a'], [L('sg s-pumpL', '16px 46px')]), (['1b'], [L('sg s-pumpR', '48px 46px')]),
            ([6, 7, 8, 9], [L('i-swayfast', '32px 24px')])], act=L('sg s-shake', '32px 58px'),
            extras=[('front', '<circle cx="24" cy="18" r="2.2" fill="#E6EEF8" opacity=".8"/>', [L('sg s-steam xo', '24px 18px', 0, dx='-3px')]),
                    ('front', '<circle cx="40" cy="18" r="2.2" fill="#E6EEF8" opacity=".8"/>', [L('sg s-steam xo', '40px 18px', .15, dx='3px')])],
            rest='atmet, Blattkrone zuckt', sig='ballt die Fäuste, Dampf steigt auf')
C[8] = dict(name='Tomagma', kind='super', split={1: 2}, parts=[(['1a'], [L('i-swayslow', '14px 50px')]), (['1b'], [L('i-swayslow', '50px 50px', -1)]),
            ([3, 4, 5, 6], [L('i-glow')]), ([7], [L('i-flicker', '24px 18px')]), ([8], [L('i-flicker', '32px 18px', -.2)]), ([9], [L('i-flicker', '40px 18px', -.1)]),
            ([10], [L('i-rise', '32px 18px')])], act=L('sg s-erupt', '32px 58px'),
            extras=[('front', f'<circle cx="32" cy="12" r="{r}" fill="{c}"/>', [L('sg s-spray xo', '32px 12px', k * .06, dx=dx, dy=dy)])
                    for k, (r, c, dx, dy) in enumerate([(2.2, '#FF8C3A', '-16px', '14px'), (1.8, '#FFC24A', '15px', '12px'), (1.5, '#FF8C3A', '-8px', '22px'), (1.6, '#FFC24A', '9px', '24px')])],
            rest='Flammen lodern, Risse glühen', sig='Lavaspritzer')
# --- Monatsmonster ---
C[9] = dict(name='Brokki', kind='baby', idle='i-sleep', parts=[], act=L('sg s-nod', '32px 52px'), extras=zzz(42, 22), rest='schläft im Stehen, Zzz', sig='nickt ein und schreckt hoch')
C[10] = dict(name='Brokko', kind='normal', split={3: 2}, parts=[(['3a'], [L('sg s-stretchL', '24px 40px')]), (['3b'], [L('sg s-stretchR', '40px 40px')]),
             ([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], [L('i-swayslow', '32px 38px')]), ([17], [L('sg s-yawn', '32px 46px')])],
             extras=zzz(50, 12), rest='atmet tief, Krone raschelt', sig='streckt sich und gähnt')
C[11] = dict(name='Brokkolos', kind='super', idle='i-sleep', split={5: 2}, parts=[(['5a'], [L('i-swayslow', '20px 40px')]), (['5b'], [L('i-swayslow', '44px 40px', -2)]),
             ([6, 7, 8, 9, 10, 11, 12, 13, 14], [L('i-swayslow', '32px 40px')]), ([15], [L('sg s-peek', '44px 10px')])],
             act=L('sg s-nod', '32px 58px', .3), extras=zzz(56, 30), rest='schnarcht, Krone wiegt', sig='Vögelchen hüpft im Nest, Nickerchen')
C[12] = dict(name='Kürbi', kind='baby', parts=[([4], [L('i-swayfast', '32px 35px')])], act=L('sg s-giggle', '32px 56px'), rest='hüpft, Ranke wippt', sig='kichert')
C[13] = dict(name='Kürbo', kind='normal', parts=[([6, 7], [L('i-sway', '32px 22px')]), ([10, 11, 12], [L('sg s-laughmouth', '32px 45px')])],
             act=L('sg s-laugh', '32px 58px'), rest='atmet, Ranke wippt', sig='lacht laut')
C[14] = dict(name='Kürbrock', kind='super', split={3: 2}, parts=[(['3a'], [L('i-sway', '10px 40px')]), (['3b'], [L('i-sway2', '54px 40px')]),
             ([4], [L('i-sway', '10px 40px')]), ([5], [L('i-sway2', '54px 40px')]), ([14, 15], [L('i-glow'), L('sg s-flare')])],
             act=L('sg s-laugh', '32px 58px'), rest='Laterne flackert, Ranken wiegen', sig='Lachanfall mit Lichtblitz')
C[15] = dict(name='Pepi', kind='baby', parts=[([8, 9], [L('i-blush')])], act=L('sg s-hide', '32px 56px'), rest='hüpft, errötet', sig='duckt sich weg')
C[16] = dict(name='Papri', kind='normal', parts=[([3], [L('i-sway', '32px 22px')]), ([10, 11], [L('i-blush')]), ([12], [L('sg s-coverL', '20px 42px')]), ([13], [L('sg s-coverR', '44px 42px')])],
             rest='atmet, errötet', sig='hält sich die Augen zu')
C[17] = dict(name='Paprisma', kind='super', parts=[([3], [L('i-twinkle', '7px 10px')]), ([4], [L('i-twinkle', '57px 12px', -.8)]), ([5], [L('i-twinkle', '56px 50px', -1.6)]),
             ([6], [L('sg s-colC')]), ([7], [L('sg s-colA')]), ([8], [L('sg s-colB')]), ([9], [L('i-sway', '32px 12px')])],
             rest='funkelt, Stiel wiegt', sig='Farbwechsel Rot · Gelb · Grün')
C[18] = dict(name='Radl', kind='baby', parts=[([1, 2], [L('i-swayfast', '32px 38px')]), ([4], [L('i-tail', '32px 56px')])], act=L('sg s-jump', '32px 58px'),
             rest='hüpft, Wurzelschwänzchen wackelt', sig='Hopser')
C[19] = dict(name='Radi', kind='normal', parts=[([0], [L('i-lines'), L('sg s-lines')]), ([2, 3], [L('i-sway', '33px 26px')]), ([5], [L('i-tail', '34px 51px')])],
             act=L('sg s-dash', '34px 58px'), rest='tippelt, Speedlinien flirren', sig='Sprint')
C[20] = dict(name='Radirex', kind='super', parts=[([1], [L('i-tail', '46px 48px')]), ([2, 3, 4], [L('i-swayfast', '32px 18px')])], act=L('sg s-bigjump', '32px 58px'),
             rest='Schwanz schwingt, Blätter flattern', sig='Turbohüpfer')
C[21] = dict(name='Zwibbel', kind='baby', parts=[([2], [L('i-sway', '32px 32px')]), ([9], [L('i-drip', '32px 51px')])], act=L('sg s-sniff', '32px 58px'),
             rest='hüpft, Tränchen kullern', sig='schnieft')
C[22] = dict(name='Zwiebi', kind='normal', parts=[([8], [L('i-sway', '32px 12px')]), ([16], [L('i-drip', '32px 42px')]), ([18, 19], [L('sg s-wipe', '44px 46px')])],
             act=L('sg s-sniff', '32px 58px', .4), rest='Tränen kullern', sig='tupft mit dem Taschentuch')
C[23] = dict(name='Zwiebolon', kind='super', parts=[([3], [L('i-cape', '32px 26px')]), ([11], [L('i-swayslow', '32px 8px')]),
             ([18], [L('i-rain', None, 0)]), ([19], [L('i-rain', None, -.45)]), ([20], [L('i-rain', None, -.9)]), ([21], [L('i-rain', None, -1.3)])],
             act=L('sg s-sob', '32px 58px'),
             extras=[('front', f'<path d="M{x} 38 q-1.6 4 0 6 q1.6 -2 0 -6z" fill="#7AB8FF"/>', [L('sg s-flood xo', None, k * .1, dx=dx)]) for k, (x, dx) in enumerate([(23, '-4px'), (41, '4px'), (25, '-7px'), (39, '7px')])],
             rest='Tränenregen, Umhang weht', sig='Tränenflut')
C[24] = dict(name='Gurki', kind='baby', idle='i-lean', parts=[([10], [L('i-swayfast', '32px 34px')])], wink=0, rest='lehnt sich lässig, Blatt wippt', sig='zwinkert')
C[25] = dict(name='Gurkon', kind='normal', idle='i-lean', parts=[([9], [L('sg s-shades', '33px 30px')]), ([10], [L('sg s-shades', '33px 30px'), L('sg s-glint', '26px 29px', .3)]),
             ([12, 13], [L('sg s-waveR', '48px 36px', .2)])], rest='wippt lässig', sig='schiebt die Brille runter und winkt')
C[26] = dict(name='Gurkodil', kind='super', idle='i-lean', parts=[([8, 9], [L('sg s-snap', '18px 42px')]), ([13], [L('i-tail', '56px 46px')]), ([12], [L('sg s-glint', '10px 35px', .4)])],
             extras=[('front', f'<path d="M{x} {y} q4 -2 8 0" stroke="#CFE8EE" stroke-width="1" fill="none" stroke-linecap="round"/>', [L('sg s-breeze xo', None, .3 + k * .12)])
                     for k, (x, y) in enumerate([(2, 30), (0, 40), (4, 50)])],
             rest='Schwanz wedelt, lehnt lässig', sig='Coole Brise mit Kieferschnapp')
C[27] = dict(name='Aubi', kind='baby', parts=[([3], [L('i-sway', '32px 31px')])], act=L('sg s-proud', '32px 56px'), rest='hüpft, Krönchen wackelt', sig='reckt die Nase')
C[28] = dict(name='Aubaron', kind='normal', parts=[([1, 2, 3], [L('i-cape', '32px 26px')]), ([7, 8], [L('i-swayslow', '32px 14px')]), ([13, 14], [L('sg s-glint', '37px 34px', .5)])],
             act=L('sg s-bow', '32px 56px'), rest='atmet würdevoll, Umhang schwingt', sig='Verbeugung, Monokel blitzt')
C[29] = dict(name='Aubzar', kind='super', parts=[([3, 4], [L('i-cape', '32px 20px')]), ([8], [L('i-twinkle', '25px 10px')]), ([9], [L('i-twinkle', '32px 7px', -.8)]), ([10], [L('i-twinkle', '39px 10px', -1.6)]),
             ([11], [L('sg s-scepter', '52px 56px')]), ([12], [L('sg s-scepter', '52px 56px'), L('sg s-orb', '52px 22px', .25)])],
             extras=[ring(48, 21, 4, '#F5C76B')], rest='Juwelen funkeln, Umhang weht', sig='Königlicher Befehl mit Zepter')
C[30] = dict(name='Sprossi', kind='baby', parts=[([3], [L('i-zapflicker')])], act=L('sg s-zap', '32px 58px'), rest='hüpft, Funke knistert', sig='zuckt unter Strom')
C[31] = dict(name='Sparx', kind='normal', split={9: 2}, parts=[([1], [L('i-zapflicker')]), ([2], [L('i-zapflicker', None, -.4)]), ([3], [L('i-zapflicker', None, -.8)]), ([4], [L('i-zapflicker', None, -1.2)]),
             (['9a'], [L('sg s-armsL', '26px 40px')]), (['9b'], [L('sg s-armsR', '38px 40px')])], act=L('sg s-zap', '32px 58px'), rest='Blitze flackern', sig='reißt die Arme hoch, Stromstoß')
C[32] = dict(name='Sparxion', kind='super', parts=[([3], [L('i-zapflicker')]), ([4], [L('i-zapflicker', None, -.5)]), ([5], [L('i-zapflicker', None, -.9)]), ([6], [L('i-zapflicker', None, -1.3)]), ([7], [L('i-zapflicker', None, -.2)]),
             ([8], [L('i-sway', '19px 58px')]), ([9], [L('i-sway2', '45px 58px')])], act=L('sg s-zap', '32px 58px'),
             extras=[('front', '<circle cx="32" cy="30" r="30" fill="#FFE97A"/>', [L('sg s-flash xo')])], rest='Blitze zucken, Stangen wiegen', sig='Spargelblitz')
C[33] = dict(name='Spori', kind='baby', parts=[([7], [L('i-rise', '46px 30px')])], extras=spores(32, 36, '#CBB8F2', 4, 1.2, 9), rest='hüpft verträumt, Spore schwebt', sig='niest Sporen')
C[34] = dict(name='Pilzo', kind='normal', split={2: 2}, parts=[(['2a'], [L('i-swayslow', '22px 46px')]), (['2b'], [L('i-swayslow', '42px 46px', -2)]),
             ([3, 4, 5, 6, 7, 8], [L('i-swayslow', '32px 34px')]), ([9], [L('i-rise', None, 0)]), ([10], [L('i-rise', None, -1)]), ([11], [L('i-rise', None, -2)]), ([12], [L('i-rise', None, -2.8)])],
             extras=spores(32, 20, '#E0D2FF', 6, 1.6, 14), rest='Kappe wiegt, Sporen steigen', sig='Sporenwolke')
C[35] = dict(name='Myzelor', kind='super', split={8: 2}, noeyes=True, parts=[([1, 2, 3, 4], [L('i-glow')]), (['8a'], [L('i-swayslow', '20px 42px')]), (['8b'], [L('i-swayslow', '44px 42px', -2)]),
             ([17], [L('i-rise')]), ([18], [L('i-rise', None, -1)]), ([19], [L('i-rise', None, -2)]), ([20], [L('i-rise', None, -3)]),
             ([21], [L('i-blink', '32px 42px')]), ([22, 23], [L('i-blink', '32px 42px'), L('i-look')])],
             extras=spores(32, 16, '#E0D2FF', 7, 2, 18), act=L('sg s-shake', '32px 58px', .05), rest='Riesenauge schaut umher, Myzel pulsiert', sig='Sporenwolke')
C[36] = dict(name='Beti', kind='baby', parts=[([1, 2], [L('i-swayfast', '32px 36px')]), ([4], [L('i-ripple', '32px 47px')])], act=L('sg s-twirl', '32px 47px'),
             rest='hüpft, Kringel pulsiert', sig='Pirouette')
C[37] = dict(name='Betti', kind='normal', parts=[([2, 3, 4], [L('i-sway', '32px 22px')]), ([6], [L('i-ripple', '32px 38px'), L('sg s-ripplebig', '32px 38px')]),
             ([7], [L('i-ripple', '32px 38px', -.8), L('sg s-ripplebig', '32px 38px', .12)]), ([8], [L('i-ripple', '32px 38px', -1.6), L('sg s-ripplebig', '32px 38px', .24)]),
             ([9], [L('i-twinkle', '46px 20px')])], rest='Ringe pulsieren, Stern funkelt', sig='Spiralwirbel')
C[38] = dict(name='Bettrix', kind='super', parts=[([3, 4, 5], [L('sg s-hat', '32px 22px')]), ([6], [L('i-sway', '20px 26px')]), ([7], [L('i-sway2', '44px 26px')]),
             ([9], [L('i-ripple', '32px 40px'), L('sg s-ripplebig', '32px 40px')]), ([10], [L('i-ripple', '32px 40px', -.8), L('sg s-ripplebig', '32px 40px', .12)]),
             ([11], [L('i-ripple', '32px 40px', -1.6), L('sg s-ripplebig', '32px 40px', .24)]),
             ([18], [L('i-twinkle', '8px 30px')]), ([19], [L('i-twinkle', '56px 34px', -.6)]), ([20], [L('i-twinkle', '10px 52px', -1.2)]), ([21], [L('i-twinkle', '54px 54px', -1.8)])],
             extras=[ring(32, 40, 10, '#E0457A'), ('front', '<circle cx="32" cy="40" r="15" fill="none" stroke="#F5C76B" stroke-width="1"/>', [L('sg s-burst xo', '32px 40px', .2)])],
             rest='Funken tanzen, Ringe kreisen', sig='lüftet den Hut: Spiralzauber')
C[39] = dict(name='Lauchling', kind='baby', parts=[([3], [L('i-sway', '33px 36px')])], act=L('sg s-bow', '33px 58px'), rest='hüpft, Blätter wehen', sig='grüßt mit Nicken')
C[40] = dict(name='Lauchi', kind='normal', parts=[([1, 2], [L('sg s-tap', '46px 58px')]), ([3], [L('sg s-tap', '46px 58px'), L('i-glow')]),
             ([6], [L('i-sway', '31px 22px')]), ([7], [L('i-swayslow', '31px 44px')])], rest='Blätter wehen, Stab glimmt', sig='stößt den Stab auf')
C[41] = dict(name='Merlauch', kind='super', parts=[([3, 4], [L('sg s-cast', '52px 58px')]), ([5], [L('sg s-cast', '52px 58px'), L('i-glow')]), ([6], [L('sg s-cast', '52px 58px'), L('i-twinkle', '46px 4px')]),
             ([8], [L('i-twinkle', '16px 46px')]), ([9], [L('i-twinkle', '26px 52px', -.6)]), ([10], [L('i-twinkle', '40px 44px', -1.2)]), ([11], [L('i-twinkle', '44px 54px', -1.8)]),
             ([14], [L('i-sway', '32px 18px')])], extras=[ring(48, 8, 6, '#7AB8FF', 1.6), ('front', '<circle cx="32" cy="34" r="22" fill="none" stroke="#7AB8FF" stroke-width="1"/>', [L('sg s-burst xo', '32px 34px', .25)])],
             rest='Robe glitzert, Stab leuchtet', sig='Lauchzauber (Lichtwelle)')
# --- Legendäre ---
C[42] = dict(name='Erntor', kind='legend', split={4: 2}, parts=[([2], [L('i-wingL', '22px 26px'), L('sg s-flapL', '22px 26px')]), ([3], [L('i-wingR', '42px 26px'), L('sg s-flapR', '42px 26px')]),
             (['4a'], [L('i-wingL', '22px 26px'), L('sg s-flapL', '22px 26px')]), (['4b'], [L('i-wingR', '42px 26px'), L('sg s-flapR', '42px 26px')]),
             ([5, 6], [L('i-tail', '44px 50px')]), ([11], [L('i-sway', '24px 26px')]), ([12], [L('i-sway', '28px 26px', -.4)]), ([13], [L('i-sway', '32px 26px', -.8)]), ([14], [L('i-sway', '36px 26px', -1.2)]), ([15], [L('i-sway', '40px 26px', -1.6)]),
             ([25], [L('i-twinkle', '7px 10px')]), ([26], [L('i-twinkle', '57px 12px', -.8)]), ([27], [L('i-twinkle', '56px 50px', -1.6)])],
             act=L('sg s-rise', '32px 58px'), rest='schwebt, Weizenkrone wiegt, Flügel atmen', sig='Erntedrache schlägt mit den Flügeln')
C[43] = dict(name='Rhizowal', kind='legend', noeyes=True, out=[2, 3, 4], parts=[([2], [L('i-drift')]), ([3], [L('i-drift', None, -2)]), ([4], [L('i-drift', None, -4)]),
             ([5], [L('i-swayslow', '20px 42px')]), ([6], [L('i-swayslow', '26px 42px', -1)]), ([7], [L('i-swayslow', '33px 42px', -2)]), ([8], [L('i-swayslow', '40px 42px', -3)]),
             ([9], [L('i-tail', '48px 28px')]), ([20, 21, 22, 23, 24], [L('i-swayslow', '30px 20px')]), ([25, 26, 27], [L('i-blink', '14px 31px')]),
             ([30], [L('sg s-spout', '26px 22px')]), ([31], [L('i-twinkle', '7px 10px')]), ([32], [L('i-twinkle', '57px 12px', -.8)]), ([33], [L('i-twinkle', '56px 50px', -1.6)])],
             extras=[('front', f'<circle cx="25" cy="16" r="1.4" fill="#CFE8EE"/>', [L('sg s-spray xo', '25px 16px', .15 + k * .05, dx=dx, dy=dy)]) for k, (dx, dy) in enumerate([('-7px', '-6px'), ('6px', '-8px'), ('-3px', '-11px'), ('9px', '-3px')])],
             rest='schwebt, Wald wiegt, Wolken ziehen', sig='Wasserfontäne')
C[44] = dict(name='Solarion', kind='legend', out=list(range(16)), parts=[(list(range(16)), [L('i-rays', '32px 30px'), L('sg s-raysfast')]),
             ([16, 17], [L('i-tail', '46px 52px')]), (list(range(20, 36)), [L('i-mane', '32px 28px'), L('sg s-roar', '32px 28px')]),
             ([69], [L('i-twinkle', '7px 10px')]), ([70], [L('i-twinkle', '57px 12px', -.8)]), ([71], [L('i-twinkle', '56px 50px', -1.6)])],
             act=L('sg s-roarbody', '32px 58px'), rest='Strahlen kreisen, Mähne pulsiert', sig='Sonnenbrüllen')

FORM = {'baby': 'Baby', 'normal': 'Normalform', 'super': 'Superform', 'legend': 'Legendär'}
DEFAULT_IDLE = {'baby': 'i-hop', 'normal': 'i-breathe', 'super': 'i-breathe-slow', 'legend': 'i-float'}


def layer_open(cls, origin, x, kw):
    st = [f'--x:{x}s']
    if origin:
        st.insert(0, f'transform-origin:{origin}')
    for k, v in kw.items():
        st.append(f'--{k}:{v}')
    return f'<g class="{cls}" style="{";".join(st)}">'


def wrap(content, layers):
    for (cls, origin, x, kw) in reversed(layers):
        content = layer_open(cls, origin, x, kw) + content + '</g>'
    return content


def build(i, size, tap=True, seed=None, inner_extra='', front_extra=''):
    c = CFG[i]
    rnd = random.Random(seed if seed is not None else i * 7 + 3)
    els = top(T[f't{i}'])
    ids = list(range(len(els)))
    E = dict(zip(ids, els))
    order = list(ids)
    for idx, n in c.get('split', {}).items():
        d = attr(E[idx], 'd')
        segs = ['M' + s.strip() for s in d.split('M') if s.strip()]
        assert len(segs) == n, (i, idx, segs)
        new = []
        for k, seg in enumerate(segs):
            key = f'{idx}{"ab"[k]}'
            E[key] = E[idx].replace(f'd="{d}"', f'd="{seg}"')
            new.append(key)
        pos = order.index(idx)
        order[pos:pos + 1] = new
    part_of = {}
    parts = []
    for (idxs, layers) in c.get('parts', []):
        p = (tuple(idxs), layers)
        parts.append(p)
        for x in idxs:
            assert x not in part_of, (i, x)
            part_of[x] = len(parts) - 1
    # Augen automatisch erkennen
    if not c.get('noeyes'):
        eyeno = 0
        for k, key in enumerate(order):
            el = E[key]
            if key in part_of:
                continue
            fill = attr(el, 'fill') or ''
            cx = cy = None
            if el.startswith('<ellipse') and fill in ('#1B1E27', '#2A0E08', '#E6FFE0') and float(attr(el, 'rx')) >= 1.4:
                cx, cy = float(attr(el, 'cx')), float(attr(el, 'cy'))
            elif el.startswith('<path') and fill == '#1B1E27' and 'scale(' in (attr(el, 'transform') or ''):
                m = re.search(r'translate\(([\d.]+) ([\d.]+)\)', attr(el, 'transform'))
                cx, cy = float(m.group(1)), float(m.group(2))
            if cx is None:
                continue
            grp = [key]
            for nxt in order[k + 1:k + 3]:
                ne = E[nxt]
                if ne.startswith('<circle') and attr(ne, 'fill') in ('#fff', '#FFE97A') and nxt not in part_of and abs(float(attr(ne, 'cx')) - cx) < 2.5:
                    grp.append(nxt)
                else:
                    break
            layers = [L('i-blink', f'{cx}px {cy}px')]
            if c.get('wink') == eyeno:
                layers.append(L('sg s-wink', f'{cx}px {cy}px'))
            parts.append((tuple(grp), layers))
            for g in grp:
                part_of[g] = len(parts) - 1
            eyeno += 1
    # Schatten / Aura / außen
    shadow, aura, out = [], [], list(c.get('out', []))
    for key in order:
        el = E[key]
        if el.startswith('<ellipse') and attr(el, 'fill') == 'rgba(255,255,255,0.07)':
            shadow.append(key)
        elif el.startswith('<circle') and attr(el, 'opacity') in ('.13', '.08') and float(attr(el, 'r')) >= 20:
            aura.append(key)
    kind = c['kind']
    idle = c.get('idle', DEFAULT_IDLE[kind])

    def render(keys):
        html, cur, buf = '', None, ''
        for key in keys:
            p = part_of.get(key)
            if p != cur:
                if buf:
                    html += wrap(buf, parts[cur][1]) if cur is not None else buf
                cur, buf = p, ''
            buf += E[key]
        if buf:
            html += wrap(buf, parts[cur][1]) if cur is not None else buf
        return html

    sh = ''.join(E[k] for k in shadow)
    if sh:
        cx, cy = attr(E[shadow[0]], 'cx'), attr(E[shadow[0]], 'cy')
        shc = {'i-hop': 'i-shadowhop', 'i-float': 'i-shadowfloat'}.get(idle)
        sh = wrap(sh, [L(shc, f'{cx}px {cy}px')]) if shc else sh
    au = wrap(''.join(E[k] for k in aura), [L('i-pulse', '32px 34px')]) if aura else ''
    outer = render([k for k in order if k in out])
    inner = render([k for k in order if k not in shadow and k not in aura and k not in out])
    body = wrap(inner + inner_extra, [L(idle, '32px 58px')])
    if c.get('act'):
        body = wrap(body, [c['act']])
    back = ''.join(wrap(m, ly) for (pos, m, ly) in c.get('extras', []) if pos == 'back')
    front = ''.join(wrap(m, ly) for (pos, m, ly) in c.get('extras', []) if pos == 'front')
    content = sh + au + outer + back + body + front + front_extra
    if tap:
        content = f'<g class="tapw">{content}</g>'
    d = rnd.uniform(7.2, 9.8)
    o = -rnd.uniform(0, d)
    b = rnd.uniform(4.2, 6.4)
    return (f'<svg viewBox="0 0 64 64" width="{size}" height="{size}" aria-hidden="true" '
            f'style="overflow:visible;flex:none;--d:{d:.2f}s;--o:{o:.2f}s;--b:{b:.2f}s">{content}</svg>')


if __name__ == '__main__':
    for i in range(45):
        build(i, 100)
    print('alle 45 gebaut')
