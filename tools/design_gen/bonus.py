"""Bonus-Monster (nur über Besuche/Beet): 6 Linien × 2 Formen, als t45–t56 in anim.T/CFG registriert."""
import anim
from anim import L, ring as aring

D = '#1B1E27'
SH = '<ellipse cx="32" cy="59" rx="{rx}" ry="2.6" fill="rgba(255,255,255,0.07)"/>'
LEAF = 'M0 0 C2.8 -2.8 6.0 -2.4 8 0 C6.0 2.4 2.8 2.8 0 0z'


def eye(cx, cy, rx, ry):
    return (f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{D}"/>'
            f'<circle cx="{cx + rx * .35:.1f}" cy="{cy - ry * .4:.1f}" r="{rx * .4:.2f}" fill="#fff"/>')


def blush(x1, x2, y, c='#E99AD0'):
    return f'<ellipse cx="{x1}" cy="{y}" rx="2.6" ry="1.5" fill="{c}" opacity=".65"/><ellipse cx="{x2}" cy="{y}" rx="2.6" ry="1.5" fill="{c}" opacity=".65"/>'


def smile(x, y, w=3.2):
    return f'<path d="M{x} {y} q{w / 2} {w * .45:.1f} {w} 0" stroke="{D}" stroke-width="1.5" fill="none" stroke-linecap="round"/>'


def grin(x, y, w=8):
    return f'<path d="M{x} {y} q{w / 2} {w * .7:.1f} {w} 0z" fill="#E8708A" stroke="{D}" stroke-width="1.3"/>'


def svg(*parts):
    return '<svg viewBox="0 0 64 64" class="m" aria-hidden="true">' + ''.join(parts) + '</svg>'


def kernels(cx, cy, rx, ry, step=3.6, r=.9, col='#D99A14'):
    out = ''
    y = cy - ry + 3
    row = 0
    while y < cy + ry - 2:
        half = rx * (1 - ((y - cy) / ry) ** 2) ** .5 - 2
        x = cx - half + (step / 2 if row % 2 else 0)
        while x <= cx + half:
            out += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{col}"/>'
            x += step
        y += step * .9
        row += 1
    return out


def pits(pts, rx=1.5, ry=1.9, col='#5E4630'):
    return ''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{col}"/>' for x, y in pts)


B = {}
# --- Ingwer: Ingi → Ingwar ---
B[45] = svg(SH.format(rx=14), '<path d="M35 31 q1 -7 6 -9" stroke="#5FB878" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
            f'<path transform="translate(41 22) rotate(-35)" d="{LEAF}" fill="#5FB878"/>',
            '<circle cx="42" cy="34" r="4.2" fill="#D9B26A"/>',
            '<path d="M21 46 Q19 36 27 35 Q29 29 35 31 Q43 30 43 38 Q47 41 45 48 Q43 57 32 57 Q22 57 21 46z" fill="#D9B26A"/>',
            '<path d="M25 42 q7 2 14 0 M24 51 q8 2 17 0" stroke="#B8904A" stroke-width="1.2" fill="none"/>',
            eye(28.5, 45, 2.4, 2.8), eye(36, 45, 2.4, 2.8), blush(25, 39.5, 49.5), smile(30.6, 50.5))
B[46] = svg(SH.format(rx=18), '<path d="M15 44 q-6 -2 -6 -10 M49 44 q6 -2 6 -10" stroke="#D9B26A" stroke-width="4" fill="none" stroke-linecap="round"/>',
            '<circle cx="9" cy="33" r="3.2" fill="#C9A050"/><circle cx="55" cy="33" r="3.2" fill="#C9A050"/>',
            '<path d="M16 42 Q14 28 26 27 Q32 21 40 25 Q50 25 50 37 Q52 52 40 57 Q32 60 24 57 Q14 52 16 42z" fill="#D9B26A"/>',
            '<path d="M19 40 q13 4 28 0 M18 49 q14 4 30 0" stroke="#B8904A" stroke-width="1.4" fill="none"/>',
            '<path d="M20 29 Q32 12 44 29z" fill="#9AA4B5"/><path d="M19 28 h26 v3.4 h-26z" fill="#6E7888"/>',
            '<path d="M21 25 q-9 -2 -10 -11 q5 5 12 7z M43 25 q9 -2 10 -11 q-5 5 -12 7z" fill="#F3E7C2"/>',
            eye(27, 38, 2.6, 3), eye(37, 38, 2.6, 3),
            f'<path d="M23.4 33.6 L29.6 35.3 M40.6 33.6 L34.4 35.3" stroke="{D}" stroke-width="1.8" stroke-linecap="round"/>', grin(28, 46),
            '<path d="M10 20 l1 -2.5 1 2.5 2.5 1 -2.5 1 -1 2.5 -1 -2.5 -2.5 -1z" fill="#FF8C3A"/><path d="M53 17 l.8 -2 .8 2 2 .8 -2 .8 -.8 2 -.8 -2 -2 -.8z" fill="#FFC24A"/>')
# --- Knoblauch: Knobi → Graf Knobula ---
B[47] = svg(SH.format(rx=12), '<path d="M32 30 q-1 -5 2 -8" stroke="#C9B98A" stroke-width="2" fill="none" stroke-linecap="round"/>',
            '<path d="M32 28 Q43 40 41 49 Q39 57 32 57 Q25 57 23 49 Q21 40 32 28z" fill="#F3EEDF"/>',
            '<path d="M28 37 Q26 46 28 55 M36 37 Q38 46 36 55" stroke="#B79AD0" stroke-width="1.2" fill="none"/>',
            eye(28.6, 46, 2.2, 2.6), eye(35.4, 46, 2.2, 2.6), blush(25.5, 38.5, 50.5), smile(30.5, 51.5, 3),
            '<path d="M28 57 l-1 3 M32 57 v3 M36 57 l1 3" stroke="#C9B98A" stroke-width="1"/>')
B[48] = svg(SH.format(rx=20), '<path d="M10 58 Q12 30 22 24 H42 Q52 30 54 58z" fill="#3A1A4A"/>', '<path d="M16 58 Q18 34 24 28 H40 Q46 34 48 58z" fill="#B5302A"/>',
            '<path d="M18 26 L11 13 L25 22z M46 26 L53 13 L39 22z" fill="#3A1A4A"/>',
            '<path d="M32 12 Q52 26 48 42 Q46 56 32 56 Q18 56 16 42 Q12 26 32 12z" fill="#F3EEDF"/>',
            '<path d="M32 14 Q22 32 26 55 M32 14 Q42 32 38 55" stroke="#D9CFB8" stroke-width="1.2" fill="none"/>',
            '<path d="M24 22 Q19 34 22 48 M40 22 Q45 34 42 48" stroke="#B79AD0" stroke-width="1.4" fill="none" opacity=".8"/>',
            '<path d="M32 12 V5 q0 -2 3 -3" stroke="#C9B98A" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
            eye(26, 34, 2.6, 3), eye(38, 34, 2.6, 3),
            f'<path d="M22.4 29.6 L28.6 31.4 M41.6 29.6 L35.4 31.4" stroke="{D}" stroke-width="1.8" stroke-linecap="round"/>',
            f'<path d="M27 44 q5 3.4 10 0" stroke="{D}" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
            '<path d="M28.6 44.8 l1 2.8 1 -2.3z M33.4 45.3 l1 2.3 1 -2.8z" fill="#fff"/>',
            '<path d="M24 56 l-2 4 M32 56 v4 M40 56 l2 4" stroke="#C9B98A" stroke-width="1.2"/>')
# --- Kichererbse: Kichi → Kicheron ---
B[49] = svg(SH.format(rx=13), '<path d="M28 57 v2.4 M36 57 v2.4" stroke="#C9A06A" stroke-width="2.4" stroke-linecap="round"/>',
            '<circle cx="32" cy="45" r="12" fill="#E3C18F"/>', '<path d="M40 35 q6 -2 4 4 q-2 0 -4 -4z" fill="#E3C18F"/>',
            '<path d="M33 34 q-3 6 -1 12" stroke="#C9A06A" stroke-width="1" fill="none" opacity=".7"/>',
            eye(28, 44, 2.5, 2.9), eye(36, 44, 2.5, 2.9), blush(24.5, 39.5, 49), smile(30.4, 50))
B[50] = svg(SH.format(rx=24), '<circle cx="11" cy="52" r="6" fill="#E3C18F"/>',
            f'<ellipse cx="9.5" cy="51" rx="1.1" ry="1.3" fill="{D}"/><ellipse cx="12.5" cy="51" rx="1.1" ry="1.3" fill="{D}"/>',
            '<circle cx="53" cy="52" r="6" fill="#E3C18F"/>',
            f'<ellipse cx="51.5" cy="51" rx="1.1" ry="1.3" fill="{D}"/><ellipse cx="54.5" cy="51" rx="1.1" ry="1.3" fill="{D}"/>',
            '<path d="M17 42 q-5 4 -4 9 M47 42 q5 4 4 9" stroke="#E3C18F" stroke-width="3.4" fill="none" stroke-linecap="round"/>',
            '<circle cx="32" cy="38" r="17" fill="#E3C18F"/>', '<path d="M44 24 q8 -3 6 5 q-3 0 -6 -5z" fill="#E3C18F"/>',
            '<path d="M34 22 q-5 9 -2 18 M24 28 q-3 5 -2 10" stroke="#C9A06A" stroke-width="1.2" fill="none" opacity=".7"/>',
            '<path d="M16 31 Q32 25 48 31" stroke="#6FE0C1" stroke-width="3" fill="none"/>',
            '<path d="M48 31 l5 -3 M48 31 l5 2" stroke="#6FE0C1" stroke-width="2" stroke-linecap="round"/>',
            eye(26, 38, 2.8, 3.2), eye(38, 38, 2.8, 3.2), blush(21, 43, 44), grin(28, 45))
# --- Mais: Maisi → Kolbrix ---
B[51] = svg(SH.format(rx=12), '<path transform="translate(27 54) rotate(-112)" d="M0 0 C5 -5 11 -4 15 0 C11 4 5 5 0 0z" fill="#7CC46A"/>',
            '<path transform="translate(37 54) rotate(-68)" d="M0 0 C5 -5 11 -4 15 0 C11 4 5 5 0 0z" fill="#7CC46A"/>',
            '<ellipse cx="32" cy="43" rx="9" ry="13" fill="#F2C230"/>', kernels(32, 43, 9, 13),
            '<path d="M32 30 q-2 -5 -5 -6 M32 30 q0 -6 2 -8 M32 30 q3 -4 6 -4" stroke="#E9C9A0" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
            eye(28.6, 43, 2.1, 2.5), eye(35.4, 43, 2.1, 2.5), blush(25.5, 38.5, 48), smile(30.4, 49))
B[52] = svg(SH.format(rx=18), '<path transform="translate(23 57) rotate(-112)" d="M0 0 C8 -8 18 -7 26 0 C18 7 8 8 0 0z" fill="#5FB878"/>',
            '<path transform="translate(41 57) rotate(-68)" d="M0 0 C8 -8 18 -7 26 0 C18 7 8 8 0 0z" fill="#5FB878"/>',
            '<path d="M20 40 q-6 2 -8 -5 M44 40 q6 2 8 -5" stroke="#4FA868" stroke-width="3" fill="none" stroke-linecap="round"/>',
            '<ellipse cx="32" cy="35" rx="13" ry="21" fill="#F2C230"/>', kernels(32, 35, 13, 21, 4.2, 1.1),
            '<path d="M32 14 q-6 -6 -12 -6 M32 14 q-2 -8 0 -12 M32 14 q4 -7 10 -8 M32 14 q-4 -4 -8 -10" stroke="#E9C9A0" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
            eye(27, 33, 2.6, 3), eye(37, 33, 2.6, 3),
            f'<path d="M23.4 28.6 L29.6 30.3 M40.6 28.6 L34.4 30.3" stroke="{D}" stroke-width="1.8" stroke-linecap="round"/>', grin(27.5, 42, 9),
            '<path d="M30 42 l1 2.4 1 -2.4z M34 42 l1 2.4 1 -2.4z" fill="#fff"/>')
# --- Rotkohl: Kohli → Kohlossus ---
B[53] = svg(SH.format(rx=13), '<circle cx="32" cy="45" r="13" fill="#6E3A8A"/>', '<circle cx="32" cy="45" r="11" fill="#8E4FA8"/>',
            '<path d="M32 35 q-6 6 -4 16 M32 35 q6 6 4 16 M25 40 q4 2 8 0" stroke="#B57AC9" stroke-width="1" fill="none"/>',
            eye(28, 46, 2.3, 2.7), eye(36, 46, 2.3, 2.7), blush(24.5, 39.5, 50.5), smile(30.4, 51.5))
B[54] = svg(SH.format(rx=20), '<path d="M24 54 v5 M40 54 v5" stroke="#5E2F7A" stroke-width="4" stroke-linecap="round"/>',
            '<path d="M8 40 q-4 -14 8 -22 q-2 10 4 14z M56 40 q4 -14 -8 -22 q2 10 -4 14z" fill="#6E3A8A"/>',
            '<circle cx="32" cy="36" r="21" fill="#5E2F7A"/>', '<circle cx="32" cy="36" r="18.5" fill="#8E4FA8"/>',
            '<path d="M18 27 q6 -6 12 0 q6 -6 12 0 q4 -4 8 2 M17 46 q6 4 10 0 q6 4 12 0 q6 4 12 0" stroke="#B57AC9" stroke-width="1.4" fill="none"/>',
            eye(26, 36, 2.2, 2.6), eye(38, 36, 2.2, 2.6),
            '<circle cx="26" cy="36" r="5" fill="none" stroke="#F5C76B" stroke-width="1.4"/><circle cx="38" cy="36" r="5" fill="none" stroke="#F5C76B" stroke-width="1.4"/><path d="M31 36 h2" stroke="#F5C76B" stroke-width="1.4"/>',
            f'<path d="M28 46 q4 3 8 0" stroke="{D}" stroke-width="1.6" fill="none" stroke-linecap="round"/>')
# --- Morchel: Morchi → Morchelor ---
B[55] = svg(SH.format(rx=11), '<rect x="27" y="44" width="10" height="13" rx="4" fill="#F3E7C2"/>',
            '<ellipse cx="32" cy="36" rx="10" ry="12" fill="#8A6A4A"/>', pits([(28, 30), (34, 28), (31, 35), (36, 36), (27, 38), (32, 42), (37, 42)]),
            eye(29.6, 50, 1.6, 1.9), eye(34.4, 50, 1.6, 1.9), smile(30.8, 54, 2.4))
B[56] = svg(SH.format(rx=16), '<path d="M23 48 q-6 2 -7 8 M41 48 q6 2 7 8" stroke="#F3E7C2" stroke-width="3.4" fill="none" stroke-linecap="round"/>',
            '<rect x="23" y="40" width="18" height="18" rx="7" fill="#F3E7C2"/>',
            '<path d="M23 41 h18 v4 h-18z" fill="#6FE0C1"/>', '<path d="M38 45 l3 9 l-4 -1z" fill="#6FE0C1"/>',
            '<path d="M32 4 Q46 10 46 26 Q46 40 32 42 Q18 40 18 26 Q18 10 32 4z" fill="#8A6A4A"/>',
            pits([(26, 14), (32, 11), (38, 14), (23, 22), (29, 20), (35, 20), (41, 22), (25, 30), (31, 28), (37, 29), (42, 32), (28, 36), (34, 36)], 2, 2.5),
            eye(28, 49, 2, 2.3), eye(36, 49, 2, 2.3), smile(30.3, 53.5, 3.4),
            '<circle cx="10" cy="14" r="1.6" fill="#E0D2FF" opacity=".7"/><circle cx="54" cy="10" r="1.3" fill="#E0D2FF" opacity=".7"/><circle cx="56" cy="28" r="1.8" fill="#E0D2FF" opacity=".7"/>')

for i, s in B.items():
    anim.T[f't{i}'] = s

C = anim.CFG


def find(i, sub):
    return next(k for k, e in enumerate(anim.top(anim.T[f't{i}'])) if sub in e)


C[45] = dict(name='Ingi', kind='baby', parts=[([1, 2], [L('i-swayfast', '35px 31px')])], act=L('sg s-jump', '32px 58px'), rest='hüpft, Trieb wippt', sig='Funkenhüpfer')
C[46] = dict(name='Ingwar', kind='normal', split={1: 2}, parts=[(['1a'], [L('sg s-pumpL', '15px 44px')]), (['1b'], [L('sg s-pumpR', '49px 44px')]), ([2], [L('sg s-pumpL', '15px 44px')]), ([3], [L('sg s-pumpR', '49px 44px')]), ([15], [L('i-twinkle', '11px 20px')]), ([16], [L('i-twinkle', '54px 17px', -1)])],
             act=L('sg s-stomp', '32px 58px'), rest='atmet, Funken knistern', sig='Schlachtruf: stampft, reckt die Fäuste')
C[47] = dict(name='Knobi', kind='baby', parts=[([1], [L('i-sway', '32px 30px')])], act=L('sg s-proud', '32px 57px'), rest='hüpft, Stielchen wippt', sig='reckt mutig die Nase')
C[48] = dict(name='Graf Knobula', kind='normal', parts=[([1, 2, 3], [L('i-cape', '32px 24px')]), ([7], [L('i-sway', '32px 12px')])], act=L('sg s-bow', '32px 56px'),
             rest='Umhang schwingt', sig='Verbeugung mit Zähnchen-Grinsen')
C[49] = dict(name='Kichi', kind='baby', parts=[], act=L('sg s-roll', '32px 45px'), rest='hüpft', sig='kullert einen Purzelbaum')
C[50] = dict(name='Kicheron', kind='normal', parts=[([1, 2, 3], [L('i-hop', '11px 58px', -.6)]), ([4, 5, 6], [L('i-hop', '53px 58px', -1.2)]), ([12], [L('i-swayfast', '48px 31px')])],
             act=L('sg s-laugh', '32px 58px'), rest='zwei Freunde hüpfen mit', sig='Gruppenkichern')
C[51] = dict(name='Maisi', kind='baby', parts=[([1], [L('i-sway', '27px 54px')]), ([2], [L('i-sway2', '37px 54px')]), ([find(51, '#E9C9A0')], [L('i-swayfast', '32px 30px')])],
             act=L('sg s-jump', '32px 58px'), rest='hüpft, Blätter wiegen', sig='Hopser')
C[52] = dict(name='Kolbrix', kind='normal', parts=[([1], [L('i-sway', '23px 57px')]), ([2], [L('i-sway2', '41px 57px')]), ([find(52, '#E9C9A0')], [L('i-swayfast', '32px 14px')])],
             act=L('sg s-erupt', '32px 58px'), extras=anim.spores(32, 12, '#FFF6DD', 6, 2.6, 18), rest='Haare wehen, Blätter wiegen', sig='Popcorn-Explosion')
C[53] = dict(name='Kohli', kind='baby', parts=[], act=L('sg s-wobble', '32px 57px'), rest='hüpft', sig='wackelt wie ein Kohlkopf')
C[54] = dict(name='Kohlossus', kind='normal', parts=[([2], [L('i-swayslow', '32px 30px')]), ([10, 11, 12], [L('sg s-glint', '32px 36px', .4)])], act=L('sg s-nod', '32px 58px'),
             extras=[anim.ring(32, 8, 5, '#F5C76B', 1.6)], rest='atmet, Blätter wiegen', sig='grübelt – Geistesblitz')
C[55] = dict(name='Morchi', kind='baby', parts=[], act=L('sg s-hide', '32px 57px'), rest='hüpft verträumt', sig='versteckt sich unter der Kappe')
C[56] = dict(name='Morchelor', kind='normal', parts=[([4], [L('i-swayfast', '39px 45px')]), ([24], [L('i-rise')]), ([25], [L('i-rise', None, -1.2)]), ([26], [L('i-rise', None, -2.4)])], act=L('sg s-twirl', '32px 40px'),
             extras=anim.spores(32, 14, '#E0D2FF', 5, 1.8, 14), rest='Schal weht, Sporen schweben', sig='Sporenwalzer')

BONUS = [  # (baby, adult, typ, Wesen, lockt an)
    (45, 'Wurzel', 'temperamentvoll, Wikinger-Herz', 'Ingwer, Möhre, Rote Bete, Kartoffel'),
    (47, 'Zwiebel', 'mutig – ein Vampir, der sich selbst nicht riechen kann', 'Knoblauch, Zwiebel, Lauch'),
    (49, 'Hülse', 'gesellig, nie allein unterwegs', 'Kichererbsen, Linsen, Bohnen, Tofu'),
    (51, 'Spross', 'aufgedreht, platzt vor Ideen', 'Mais, Spargel, Sprossen'),
    (53, 'Blatt', 'grüblerisch, liest gern', 'Rotkohl, Spinat, Brokkoli, Salat'),
    (55, 'Pilz', 'schüchtern, tanzt nachts', 'Champignons, Shiitake, Pfifferlinge'),
]
