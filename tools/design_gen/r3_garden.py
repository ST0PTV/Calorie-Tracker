"""Garten-Ansicht: lebendige Szene mit Beet, Deko und Monstern (4 Stimmungen)."""
import random
from r3kit import *

W, H = 358, 520
DY = 50
PAL = {
    'herbst': dict(sky=('#9FD0EA', '#F6D9A8'), hill='#9CC27A', hill2='#7FAE66', grass='#8DBF6E', path='#E2C79A', tree='#E07A3A', tree2='#F2A65A', sun='#FFE08A'),
    'nacht': dict(sky=('#0B1430', '#1C2B52'), hill='#1E3A3C', hill2='#173030', grass='#1F3B2E', path='#3A3A44', tree='#24483A', tree2='#2E5A46', sun='#F3F0D8'),
    'winter': dict(sky=('#B8CDE2', '#E9F0F6'), hill='#E3ECF4', hill2='#D2DFEB', grass='#EEF3F7', path='#C9D3DE', tree='#8A6A4A', tree2='#F4F8FB', sun='#FFF2C4'),
    'fruehling': dict(sky=('#A6D8F2', '#E6F5DA'), hill='#A8D88A', hill2='#8CC872', grass='#9BD27E', path='#E9D6A8', tree='#F7B6CF', tree2='#FCD3E2', sun='#FFE97A'),
    'sommer': dict(sky=('#7CC6EE', '#D8F0F4'), hill='#86C46A', hill2='#6FB058', grass='#7DBE5E', path='#E6CF9A', tree='#4E9E4A', tree2='#6CBE5E', sun='#FFE08A'),
}


def plot_svg(x, y, inner='', n=0):
    return (f'<g transform="translate({x} {y})"><rect x="-34" y="-12" width="68" height="26" rx="10" fill="#6B4A2E"/>'
            f'<path d="M-26 -4 h52 M-26 3 h52" stroke="#56391F" stroke-width="1.4" stroke-linecap="round"/>{inner}</g>')


def scene(season, deko=True, plots_fill=True):
    p = PAL[season]
    night = season == 'nacht'
    r = random.Random(7)
    s = (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" aria-hidden="true" style="position:absolute;inset:0;display:block">'
         f'<defs><linearGradient id="sky-{season}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{p["sky"][0]}"/><stop offset="1" stop-color="{p["sky"][1]}"/></linearGradient>'
         f'<radialGradient id="glow-{season}"><stop offset="0" stop-color="#FFE08A" stop-opacity=".75"/><stop offset="1" stop-color="#FFE08A" stop-opacity="0"/></radialGradient></defs>'
         f'<rect width="{W}" height="{H}" fill="url(#sky-{season})"/>')
    if night:
        s += ''.join(f'<circle class="tw" style="--td:{r.uniform(2, 5):.1f}s;--to:-{r.uniform(0, 4):.1f}s" cx="{r.uniform(5, W - 5):.0f}" cy="{r.uniform(5, 150):.0f}" r="{r.uniform(.6, 1.5):.1f}" fill="#F3F0D8"/>' for _ in range(40))
        s += f'<circle cx="290" cy="56" r="20" fill="{p["sun"]}"/><circle cx="298" cy="50" r="18" fill="{p["sky"][0]}"/>'
    else:
        s += (f'<g class="i-rays" style="transform-origin:290px 58px"><circle cx="290" cy="58" r="34" fill="{p["sun"]}" opacity=".25"/></g><circle cx="290" cy="58" r="20" fill="{p["sun"]}"/>'
              + ''.join(f'<g class="cloud" style="--cd:{d}s;--co:-{o}s"><g transform="translate(0 {cy})"><ellipse cx="0" cy="0" rx="22" ry="8" fill="#fff" opacity=".85"/><ellipse cx="12" cy="-5" rx="12" ry="8" fill="#fff" opacity=".85"/></g></g>'
                        for cy, d, o in [(40, 70, 10), (88, 90, 55), (24, 110, 80)]))
        s += '<g class="bird"><g transform="translate(0 70)"><path class="flap" d="M0 0 q4 -4 8 0 q4 -4 8 0" stroke="#3A4A5A" stroke-width="1.4" fill="none"/></g></g>'
    s += f'<g transform="translate(0 {DY})">'
    s += (f'<path d="M0 190 Q70 140 150 175 Q230 205 300 160 Q340 140 358 150 V300 H0z" fill="{p["hill2"]}"/>'
          f'<path d="M0 230 Q90 190 180 220 Q270 245 358 205 V470 H0z" fill="{p["hill"]}"/>'
          f'<path d="M0 260 Q180 240 358 262 V470 H0z" fill="{p["grass"]}"/>')
    # Zaun hinten
    s += ''.join(f'<g transform="translate({x} 252)"><path d="M-3 0 v-22 l3 -4 l3 4 v22z" fill="{"#5A4A3A" if night else "#C9A47A"}"/></g>' for x in range(14, 350, 24))
    s += f'<path d="M0 238 H358 M0 246 H358" stroke="{"#5A4A3A" if night else "#B08A63"}" stroke-width="2.4"/>'
    # Weg
    s += f'<path d="M170 470 Q190 400 150 350 Q120 310 175 268 L195 268 Q150 312 180 352 Q218 404 210 470z" fill="{p["path"]}"/>'
    # Baum links
    trunk = '#5A4130' if night else '#8A6A4A'
    s += f'<path d="M44 330 Q48 280 42 250 L56 250 Q54 290 60 330z" fill="{trunk}"/>'
    if season == 'winter':
        s += f'<path d="M50 252 L28 220 M50 256 L74 222 M49 240 L40 205 M52 238 L64 200" stroke="{trunk}" stroke-width="4" stroke-linecap="round"/>'
        s += '<path d="M24 218 q4 -3 8 0 M70 220 q4 -3 8 0 M36 204 q4 -3 8 0 M60 199 q4 -3 8 0" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
    else:
        s += (f'<circle cx="50" cy="218" r="40" fill="{p["tree"]}"/><circle cx="28" cy="236" r="24" fill="{p["tree"]}"/><circle cx="74" cy="232" r="26" fill="{p["tree"]}"/>'
              f'<circle cx="40" cy="206" r="16" fill="{p["tree2"]}" opacity=".8"/><circle cx="66" cy="214" r="12" fill="{p["tree2"]}" opacity=".8"/>')
    # Beet 3×2
    plots = [(120, 380, '<path d="M0 -4 c-5 0 -7 -3 -7 -6 c5 0 7 3 7 6z M0 -3 V-12" fill="#5FB878" stroke="#5FB878" stroke-width="1.6"/>'),
             (196, 380, ''), (272, 380, '<ellipse cx="-6" cy="-6" rx="7" ry="5" fill="#F2A65A"/><ellipse cx="10" cy="-4" rx="5" ry="4" fill="#E9893A"/>'),
             (120, 428, ''), (196, 428, ''), (272, 428, '<path d="M-8 -4 l2 -8 2 8 M4 -4 l2 -10 2 10" stroke="#5FB878" stroke-width="2"/>')]
    if season == 'winter' or not plots_fill:
        plots = [(x, y, '') for x, y, _ in plots]
    s += ''.join(plot_svg(x, y, c) for x, y, c in plots)
    if season == 'winter':
        s += ''.join(f'<rect x="{x - 34}" y="{y - 14}" width="68" height="7" rx="3.5" fill="#fff"/>' for x, y, _ in plots)
    # Laterne
    if deko: s += (f'<g transform="translate(318 300)"><path d="M0 0 V-46" stroke="#4A4A54" stroke-width="3"/><path d="M0 -46 h10" stroke="#4A4A54" stroke-width="2.4"/>'
          f'<rect x="4" y="-44" width="12" height="16" rx="4" fill="#F2A65A"/><rect x="7" y="-40" width="6" height="8" rx="2" fill="#FFE97A"/></g>')
    if deko and (night or season == 'winter'):
        s += f'<g class="i-glow"><circle cx="328" cy="264" r="38" fill="url(#glow-{season})"/></g>'
    # Vogelhaus + Gießkanne
    if deko: s += ('<g transform="translate(96 300)"><path d="M0 0 V-34" stroke="#8A6A4A" stroke-width="3"/><path d="M-12 -34 l12 -10 l12 10z" fill="#B5302A"/>'
          '<rect x="-9" y="-34" width="18" height="13" fill="#E9C9A0"/><circle cx="0" cy="-28" r="3" fill="#6B4A2E"/></g>')
    if deko: s += '<g transform="translate(232 330)"><path d="M0 0 h16 v-12 h-16z" fill="#7AB8FF"/><path d="M16 -8 l10 -7" stroke="#7AB8FF" stroke-width="2.6" stroke-linecap="round"/><path d="M3 -12 a5 5 0 0 1 10 0" stroke="#7AB8FF" stroke-width="2" fill="none"/></g>'
    # Saison-Partikel
    if season == 'herbst':
        s += ''.join(f'<g class="fall" style="--fd:{r.uniform(8, 13):.1f}s;--fo:-{r.uniform(0, 12):.1f}s;--fx:{r.uniform(-40, 40):.0f}px;--fr:{r.choice([-1, 1]) * 300}deg"><path transform="translate({r.uniform(10, 340):.0f} 0)" d="M0 0 C2 -2 4.5 -1.6 6 0 C4.5 1.6 2 2 0 0z" fill="{r.choice(["#E07A3A", "#F2A65A", "#C9402E"])}"/></g>' for _ in range(10))
    if season == 'winter':
        s += ''.join(f'<g class="fall" style="--fd:{r.uniform(7, 14):.1f}s;--fo:-{r.uniform(0, 14):.1f}s;--fx:{r.uniform(-20, 20):.0f}px;--fr:0deg"><circle cx="{r.uniform(5, 352):.0f}" cy="0" r="{r.uniform(1, 2.4):.1f}" fill="#fff"/></g>' for _ in range(36))
    if season == 'fruehling':
        s += ''.join(f'<g class="fall" style="--fd:{r.uniform(9, 14):.1f}s;--fo:-{r.uniform(0, 14):.1f}s;--fx:{r.uniform(-50, 50):.0f}px;--fr:{r.choice([-1, 1]) * 360}deg"><ellipse cx="{r.uniform(10, 340):.0f}" cy="0" rx="2.6" ry="1.6" fill="#FCD3E2"/></g>' for _ in range(14))
        s += ''.join(f'<g transform="translate({x} {y})"><circle r="3" fill="{c}"/><circle r="1.1" fill="#F2C230"/></g>' for x, y, c in [(30, 300, '#fff'), (300, 350, '#FFB3C7'), (246, 300, '#B9A6FF'), (20, 420, '#FFE97A'), (330, 440, '#fff')])
    if night:
        s += ''.join(f'<circle class="ffly" style="--fd:{r.uniform(4, 7):.1f}s;--fo:-{r.uniform(0, 6):.1f}s" cx="{x}" cy="{y}" r="2" fill="#FFF3A0"/>' for x, y in [(70, 300), (140, 330), (250, 290), (300, 360), (40, 360), (210, 420)])
    return s + '</g></svg>'


def mon_at(x, y, size, inner, wander=None, label=''):
    w = f' class="wander" style="--wx:{wander[0]}px;--wd:{wander[1]}s;--wo:-{wander[2]}s"' if wander else ''
    return (f'<div style="position:absolute;left:{x}px;top:{y + DY}px;width:{size}px;height:{size}px"><div{w}>'
            f'<button aria-label="{label}" style="border:0;background:none;padding:0;display:block">{inner}</button></div></div>')


CAST = {
    'herbst': [(140, 279, 91, costumed(13, 91, 'kuerbis'), (90, 16, 0), 'Kürbo'), (92, 302, 70, costumed(50, 70), None, 'Kicheron'),
               (11, 268, 78, anim.build(11, 78, seed=3), None, 'Brokkolos'), (243, 253, 65, costumed(19, 65, 'kuerbis'), (-60, 12, 4), 'Radi'),
               (180, 339, 59, anim.build(49, 59, seed=5), None, 'Kichi'), (53, 381, 67, anim.build(55, 67, seed=6), None, 'Morchi')],
    'nacht': [(11, 270, 78, anim.build(11, 78, seed=3), None, 'Brokkolos'), (121, 300, 78, anim.build(9, 78, seed=4), None, 'Brokki'),
              (243, 282, 80, anim.build(35, 80, seed=8), None, 'Myzelor'), (189, 341, 65, anim.build(56, 65, seed=9), (-50, 20, 2), 'Morchelor'), (54, 381, 59, anim.build(55, 59, seed=6), None, 'Morchi')],
    'winter': [(120, 279, 91, costumed(50, 91, 'muetze', '#E8503E'), (80, 18, 0), 'Kicheron'), (31, 282, 78, costumed(22, 78, 'muetze', '#5BA3E0'), None, 'Zwiebi'),
               (242, 274, 72, costumed(19, 72, 'muetze', '#F2C230'), (-70, 14, 3), 'Radi'), (173, 336, 62, costumed(49, 62, None, '#6FE0C1'), None, 'Kichi'), (62, 380, 70, costumed(53, 70, None, '#F2C230'), None, 'Kohli')],
    'fruehling': [(131, 281, 85, costumed(16, 85, 'kranz'), (90, 15, 0), 'Papri'), (28, 284, 72, costumed(9, 72, 'kranz'), None, 'Brokki'),
                  (242, 264, 70, costumed(18, 70, 'kranz'), (-60, 11, 3), 'Radl'), (183, 335, 65, anim.build(51, 65, seed=4), None, 'Maisi'), (62, 380, 70, anim.build(47, 70, seed=6), None, 'Knobi')],
}
LABEL = {'herbst': ('Herbst · Kürbiszeit', '15:20 · 4 Gäste im Garten'), 'nacht': ('Nacht', '22:40 · alle schlafen'),
         'winter': ('Winter · Kohlzeit', '11:05 · Schal-Saison'), 'fruehling': ('Frühling · Bärlauch', '09:30 · Blütenregen')}


def garden_board(season):
    sub, info = LABEL[season]
    dark = season == 'nacht'
    stage = (f'<div style="position:relative;width:{W}px;height:{H}px;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);flex:none">'
             + scene(season) + ''.join(mon_at(x, y, sz, inner, wd, lab) for x, y, sz, inner, wd, lab in CAST[season])
             + (f'<div style="position:absolute;left:10px;top:10px;padding:6px 10px;border-radius:12px;background:rgba(13,19,32,.55);color:{TX};font-size:11px;backdrop-filter:blur(6px)">{info}</div>')
             + '</div>')
    chips = ''.join(f'<button style="flex:1;height:46px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:{TX};font-size:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.2">'
                    f'<b style="font-size:12.5px">{a}</b><span style="font-size:9.5px;color:{MU}">{b}</span></button>' for a, b in [('Beet', '4 / 6'), ('Deko', '9 Teile'), ('Besucher', 'Buch'), ('Foto', 'teilen')])
    body = head('Garten', sub) + stage + f'<div style="display:flex;gap:6px">{chips}</div>'
    news = {'herbst': 'Kicheron ist zu Besuch · Kohli hat 5 Samen dagelassen', 'nacht': 'Morchelor tanzt bei Mondschein · Glühwürmchen-Deko aktiv', 'winter': 'Saison-Deko: Schal-Set für alle Bewohner', 'fruehling': 'Blumenkränze geschenkt · Saison-Bonus Zwiebel'}[season]
    body += f'<div style="{CARD};border-radius:16px;padding:10px 12px;font-size:11px;line-height:1.4"><b style="color:{SEED}">Heute im Garten</b><br><span style="color:{MU}">{news}</span></div>'
    return page(f'Garten {sub}', body, css=SCENE_CSS)


BOARDS = [('GA1', garden_board('herbst'), 'GA1 · Garten: Herbst am Tag (Kürbiszeit)'),
          ('GA2', garden_board('nacht'), 'GA2 · Garten: Nacht mit Glühwürmchen'),
          ('GA3', garden_board('winter'), 'GA3 · Garten: Winter mit Schals und Mützen'),
          ('GA4', garden_board('fruehling'), 'GA4 · Garten: Frühling mit Blütenregen')]
