"""Gemeinsame Bausteine für Runde 3: Kostüme, Szenen-CSS, Monster mit Kostüm."""
import sys
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import anim, bonus  # noqa: F401  (registriert Bonus-Monster)
from ui_kit import *  # noqa: F401,F403

# ---------- Kostüme (Ankerpunkt = Mitte unten, lokale Koordinaten) ----------
def hat(kind, x, y, s=1.0):
    g = {
        'kuerbis': '<ellipse cx="0" cy="-5" rx="9" ry="6" fill="#F2A65A"/><path d="M-4 -10 Q-5.5 -5 -4 0 M4 -10 Q5.5 -5 4 0 M0 -11 V1" stroke="#D9762A" stroke-width="1" fill="none"/>'
                   '<path d="M0 -11 q0 -3 3 -4" stroke="#5F8A3A" stroke-width="1.8" fill="none" stroke-linecap="round"/><path transform="translate(2 -14) rotate(-20)" d="M0 0 C1.6 -1.6 3.4 -1.4 4.6 0 C3.4 1.4 1.6 1.6 0 0z" fill="#5FB878"/>',
        'stroh': '<ellipse cx="0" cy="-1" rx="13" ry="3.2" fill="#E9C9A0"/><path d="M-7 -1 Q-7 -10 0 -10 Q7 -10 7 -1z" fill="#E9C9A0"/><path d="M-7 -4.4 h14 v2.6 h-14z" fill="#E8503E"/>'
                 '<path d="M-10 -1 h20 M-4 -8 l1 6 M3 -8 l-1 6" stroke="#C9A47A" stroke-width=".6"/><circle cx="5" cy="-4" r="1.6" fill="#FFE97A"/>',
        'kranz': '<ellipse cx="0" cy="-1" rx="10" ry="2.6" fill="none" stroke="#5FB878" stroke-width="1.6"/>'
                 + ''.join(f'<circle cx="{px}" cy="{py}" r="2.3" fill="{c}"/><circle cx="{px}" cy="{py}" r=".8" fill="#F2C230"/>' for px, py, c in
                           [(-9, -1, '#FFB3C7'), (-5, -3.2, '#FFFFFF'), (0, -3.7, '#B9A6FF'), (5, -3.2, '#FFB3C7'), (9, -1, '#FFFFFF'), (0, 1.6, '#FFE97A')]),
        'muetze': '<path d="M-9 0 Q-9 -12 0 -12 Q9 -12 9 0z" fill="#5BA3E0"/><path d="M-8 -5 h16 M-6 -9 h12" stroke="#3E7FC0" stroke-width="1.4"/>'
                  '<rect x="-10" y="-2.5" width="20" height="4" rx="2" fill="#E8EEF7"/><circle cx="0" cy="-13" r="3.2" fill="#E8EEF7"/>',
        'party': '<path d="M-6 0 L0 -16 L6 0z" fill="#B9A6FF"/><circle cx="-2" cy="-5" r="1" fill="#FFE97A"/><circle cx="2" cy="-9" r="1" fill="#5BE7F5"/><circle cx="1" cy="-3" r="1" fill="#FF9A6B"/>'
                 '<circle cx="0" cy="-16.5" r="2.2" fill="#FFE97A"/><path d="M-6 0 h12" stroke="#8E64C4" stroke-width="1.2"/>',
    }[kind]
    return f'<g transform="translate({x} {y}) scale({s})">{g}</g>'


def scarf(x, y, w, col='#E8503E'):
    return (f'<path d="M{x - w / 2} {y - 2} Q{x} {y + 2} {x + w / 2} {y - 2} L{x + w / 2} {y + 2} Q{x} {y + 6} {x - w / 2} {y + 2}z" fill="{col}"/>'
            f'<path d="M{x - w / 4} {y + 1} v3 M{x} {y + 2} v3.4 M{x + w / 4} {y + 1} v3" stroke="#fff" stroke-width="1" opacity=".7"/>'
            f'<path d="M{x + w / 4} {y + 2} l1.6 9 l4 -1 l-2.2 -8z" fill="{col}"/>')


# Kopf- und Halsposition je Monster (viewBox 64)
ANCHOR = {10: ((32, 6, 1.0), (32, 36, 16)), 13: ((32, 23, 1.0), None), 16: ((32, 21, .9), None), 50: ((32, 22, 1.0), (32, 51, 24)),
          22: ((32, 15, .9), (32, 50, 26)), 19: ((34, 26, .9), (34, 49, 16)), 9: ((32, 21, .7), (32, 42, 10)), 49: ((32, 34, .7), (32, 54, 14)),
          56: ((32, 5, .9), None), 14: ((32, 17, 1.1), None), 53: ((32, 33, .8), (32, 56, 14)), 45: ((33, 30, .7), None), 12: ((32, 35, .7), None), 18: ((32, 38, .6), (32, 55, 10))}


def costumed(i, size, kind=None, scarf_col=None, seed=None, tap=False):
    extra = ''
    a = ANCHOR.get(i)
    if a and scarf_col and a[1]:
        extra += scarf(*a[1], scarf_col)
    if a and kind:
        extra += hat(kind, *a[0])
    return anim.build(i, size, tap=tap, seed=seed, inner_extra=extra)


SCENE_CSS = '''
@keyframes wander{0%,6%{transform:translateX(0) scaleX(1)}44%{transform:translateX(var(--wx,60px)) scaleX(1)}50%{transform:translateX(var(--wx,60px)) scaleX(-1)}94%{transform:translateX(0) scaleX(-1)}100%{transform:translateX(0) scaleX(1)}}
.wander{animation:wander var(--wd,16s) ease-in-out infinite;animation-delay:var(--wo,0s)}
@keyframes fly{0%,100%{transform:translate(0,0);opacity:.15}25%{transform:translate(12px,-8px);opacity:1}50%{transform:translate(-6px,-16px);opacity:.35}75%{transform:translate(-14px,-4px);opacity:1}}
.ffly{animation:fly var(--fd,5s) ease-in-out infinite;animation-delay:var(--fo,0s)}
@keyframes fall{0%{transform:translate(0,-30px) rotate(0);opacity:0}10%{opacity:1}100%{transform:translate(var(--fx,20px),640px) rotate(var(--fr,240deg));opacity:.9}}
.fall{animation:fall var(--fd,9s) linear infinite;animation-delay:var(--fo,0s)}
@keyframes cloud{0%{transform:translateX(-40px)}100%{transform:translateX(400px)}}
.cloud{animation:cloud var(--cd,60s) linear infinite;animation-delay:var(--co,0s)}
@keyframes bird{0%{transform:translate(-30px,0)}50%{transform:translate(200px,-14px)}100%{transform:translate(420px,4px)}}
.bird{animation:bird 18s linear infinite}
@keyframes flap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(-.6)}}
.flap{animation:flap .5s ease-in-out infinite;transform-origin:center;transform-box:fill-box}
@keyframes twinkleS{0%,100%{opacity:.25}50%{opacity:1}}
.tw{animation:twinkleS var(--td,3s) ease-in-out infinite;animation-delay:var(--to,0s)}
'''
