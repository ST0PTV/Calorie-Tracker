"""Sammelkarten (inkl. Holo für Schillernde) und Saison-Kostüme."""
from r3kit import *

CSS = '''
@keyframes holo{0%{background-position:0% 50%}100%{background-position:100% 50%}}
.holo{position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,transparent 18%,rgba(255,80,180,.28) 30%,rgba(80,240,255,.28) 42%,rgba(255,240,90,.28) 54%,rgba(150,120,255,.25) 64%,transparent 76%);background-size:300% 300%;mix-blend-mode:color-dodge;animation:holo 4.5s ease-in-out infinite alternate}
.sparkle{position:absolute;inset:0;border-radius:inherit;pointer-events:none;background-image:radial-gradient(circle,rgba(255,255,255,.9) 0 1px,transparent 1.6px);background-size:18px 22px;opacity:.35;mix-blend-mode:overlay}
@keyframes tilt{0%,100%{transform:perspective(900px) rotateY(-10deg) rotateX(4deg)}50%{transform:perspective(900px) rotateY(10deg) rotateX(-3deg)}}
.tilt{animation:tilt 6s ease-in-out infinite}
'''

CARDS = {  # i: (Nummer, Typ, Formname, Spruch, Fund, Begegnungen)
    50: ('B3', 'Hülse', 'Form 2 von 2', '„Wer allein kichert, kichert nur halb.“', 'Besuch · Linsen-Dal · 3. Okt', 7),
    17: ('03', 'Frucht', 'Superform', '„Rot, gelb, grün – heute bin ich alles.“', 'Monatsei · Oktober', 20),
    35: ('09', 'Pilz', 'Superform', '„Ich sehe alles. Vor allem Sporen.“', 'Monatsei · September', 22),
    48: ('B2', 'Zwiebel', 'Form 2 von 2', '„Ich bin unwiderstehlich. Riechbar unwiderstehlich.“', 'Beet · gesät', 4),
    42: ('L1', 'Legendär', 'Jahresmonster', '„Ein Jahr Erntezeit trägt Flügel.“', 'Jahr 1 geschafft', 1),
    14: ('02', 'Frucht', 'Superform', '„HAHAHA – Lachanfall in 3, 2, 1 …“', 'Monatsei · August', 21),
    52: ('B4', 'Spross', 'Form 2 von 2', '„Pop! Pop! Pop!“', 'Besuch · Maissalat', 5),
    11: ('01', 'Blatt', 'Superform', '„Zzz … nur fünf Minuten …“', 'Monatsei · Juli', 24),
}


def card(i, shiny_=False, w=210, back=False):
    h = int(w * 1.43)
    if back:
        return (f'<div style="width:{w}px;height:{h}px;border-radius:16px;border:3px solid #2E3A55;background:radial-gradient(circle at 50% 45%,#1E2A48,#10162A);display:grid;place-items:center;position:relative;flex:none">'
                f'<svg width="{w * .62:.0f}" height="{w * .62:.0f}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="none" stroke="#5BE7F5" stroke-width="1.2" opacity=".5"/>'
                f'<circle cx="32" cy="32" r="22" fill="none" stroke="#B9E07A" stroke-width="1" stroke-dasharray="2 3" opacity=".6"/>'
                + ''.join(f'<path transform="rotate({k * 45} 32 32) translate(32 6)" d="M0 0 C2 -2 4.4 -1.6 6 0 C4.4 1.6 2 2 0 0z" fill="#5FB878" opacity=".7"/>' for k in range(8))
                + f'<text x="32" y="36" text-anchor="middle" font-size="9" font-weight="700" fill="#E8EEF7" font-family="Sora,sans-serif">GEMÜSE</text><text x="32" y="45" text-anchor="middle" font-size="5.6" fill="#93A0B4" font-family="Sora,sans-serif" letter-spacing="1.5">MONSTER</text></svg>'
                f'<div class="sparkle"></div></div>')
    num, typ, form, quote, found, meets = CARDS[i]
    c = TYPE[typ]
    name = anim.CFG[i]['name']
    art = anim.build(i, int(w * .66), tap=False, seed=i)
    if shiny_:
        art = shiny(art, 0.42)
    border = '#FFE97A' if shiny_ else c
    return (f'<div style="width:{w}px;height:{h}px;border-radius:16px;border:3px solid {border};background:linear-gradient(160deg,#242A42,#141A2A);position:relative;overflow:hidden;flex:none;display:flex;flex-direction:column;padding:9px;box-sizing:border-box;gap:6px;box-shadow:0 10px 26px rgba(0,0,0,.45)">'
            f'<div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b style="font-size:{w * .072:.1f}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{name}</b>{chip(typ, True)}</div>'
            f'<div style="flex:none;height:{h * .48:.0f}px;border-radius:10px;background:radial-gradient(circle at 50% 62%,{c}55,{c}10 60%,rgba(0,0,0,.2));display:grid;place-items:center;border:1px solid rgba(255,255,255,.08)">{art}</div>'
            f'<div style="display:flex;justify-content:space-between;font-size:{w * .046:.1f}px;color:{MU}"><span>#{num} · {form}</span><span>{"✦ schillernd" if shiny_ else ""}</span></div>'
            f'<div style="font-size:{w * .052:.1f}px;font-style:italic;line-height:1.35;color:{TX}">{quote}</div><div style="flex:1"></div>'
            f'<div style="display:flex;justify-content:space-between;font-size:{w * .044:.1f}px;color:{MU};border-top:1px solid rgba(255,255,255,.08);padding-top:5px"><span>{found}</span><span>{meets}× getroffen</span></div>'
            + ('<div class="holo"></div><div class="sparkle"></div>' if shiny_ else '') + '</div>')


# ---------- SK1 Kartenübersicht ----------
anat = ''.join(f'<div style="display:flex;gap:8px;font-size:12px;line-height:1.45"><b style="color:{CY};width:18px;flex:none">{n}</b><span>{t}</span></div>' for n, t in
               [('1', 'Name + Typ, Rahmen in Typfarbe'), ('2', 'Bild animiert, Hintergrund leuchtet in Typfarbe'), ('3', 'Nummer und Form'), ('4', 'Spruch aus den Feldnotizen'),
                ('5', 'Fundort und Begegnungen – nie Kalorien'), ('6', 'Schillernd: goldener Rahmen, Holo-Schimmer, kippt mit dem iPhone')])
sk1 = (f'<div style="display:flex;justify-content:space-between;align-items:flex-end"><div><h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.02em">Sammelkarten</h1>'
       f'<div style="font-size:13px;color:{MU};margin-top:4px">Jede Form ist eine Karte · 46 normale + Schillernde · teilbar als Bild</div></div><div style="font-size:11.5px;color:{MU}">Karten-Rückseite rechts unten</div></div>'
       f'<div style="display:flex;gap:18px;justify-content:space-between">{"".join(card(i) for i in [50, 17, 35, 48, 42])}</div>'
       f'<div style="display:flex;gap:18px;align-items:flex-start;justify-content:space-between">{"".join(card(i, True) for i in [14, 52, 11])}'
       f'<div style="{CARD};padding:14px 16px;width:210px;flex:none;display:flex;flex-direction:column;gap:6px;box-sizing:border-box"><b style="font-size:14px;margin-bottom:4px">Aufbau</b>{anat}</div>{card(0, back=True)}</div>')

# ---------- SK2 Karte im Detail ----------
sk2 = (head('Sammelkarte', 'Kürbrock · schillernd')
       + f'<div style="height:440px;display:grid;place-items:center"><div class="tilt" style="border-radius:16px">{card(14, True, w=280)}</div></div>'
       + f'<div style="text-align:center;font-size:11px;color:{MU};margin-top:-6px">Kippe dein iPhone – der Schimmer wandert mit (Bewegungssensor, nur nach Erlaubnis)</div>'
       + f'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">{btn("Als Bild teilen", False)}{btn("Feldnotizen")}</div>'
       + f'<div style="{CARD};padding:10px 14px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px">Karten-Album</span><b style="font-size:13px">14 / 46 · <span style="color:#FFE97A">✦ 3</span></b></div>')

# ---------- KO1 Kostüme ----------
COST = [('Ohne', '', None, None), ('Frühling', 'Blumenkranz', 'kranz', None), ('Sommer', 'Strohhut', 'stroh', None), ('Herbst', 'Kürbishut', 'kuerbis', None),
        ('Winter', 'Mütze + Schal', 'muetze', '#E8503E'), ('Jahrestag', 'Partyhut', 'party', None)]
MONS = [(50, 'Kicheron'), (22, 'Zwiebi'), (10, 'Brokko'), (19, 'Radi')]
hdr = '<div></div>' + ''.join(f'<div style="text-align:center"><b style="font-size:13px">{s}</b><div style="font-size:10.5px;color:{MU}">{n}</div></div>' for s, n, _, _ in COST)
rows = ''.join(f'<div style="display:flex;align-items:center;font-size:13px;font-weight:600">{n}</div>'
               + ''.join(f'<div style="{CARD};border-radius:16px;height:132px;display:grid;place-items:center">{costumed(i, 112, k, sc, seed=i + j)}</div>' for j, (_, _, k, sc) in enumerate(COST)) for i, n in MONS)
ko1 = (f'<div><h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.02em">Saison-Kostüme</h1>'
       f'<div style="font-size:13px;color:{MU};margin-top:4px">Sitzen im Monster-Körper und bewegen sich mit · ein Saison-Sammelstück pro Saison (10 Tage im Monat dabei) · rein kosmetisch</div></div>'
       f'<div style="display:grid;grid-template-columns:90px repeat(6,minmax(0,1fr));gap:10px">{hdr}{rows}</div>')

# ---------- KO2 Kleiderschrank ----------
items = ''.join(f'<button aria-pressed="{"true" if k == "kuerbis" else "false"}" style="border-radius:14px;border:{"1.5px solid " + CY if k == "kuerbis" else "1px solid rgba(255,255,255,0.10)"};background:rgba(255,255,255,0.04);color:{TX if have else MU};padding:6px 2px;display:flex;flex-direction:column;align-items:center;gap:2px;{"" if have else "opacity:.45"}">'
                f'<svg width="44" height="34" viewBox="-16 -20 32 24" aria-hidden="true">{hat(k, 0, 2, 1) if k else ""}{"<text x=\"0\" y=\"-4\" text-anchor=\"middle\" font-size=\"7\" fill=\"#93A0B4\">–</text>" if not k else ""}</svg>'
                f'<span style="font-size:10px">{n}</span><span style="font-size:8.5px;color:{MU}">{s}</span></button>'
                for k, n, s, have in [(None, 'Ohne', '', True), ('kranz', 'Kranz', 'Frühling', True), ('stroh', 'Strohhut', 'Sommer', False), ('kuerbis', 'Kürbishut', 'Herbst', True), ('muetze', 'Mütze', 'Winter', False), ('party', 'Partyhut', '1 Jahr', False)])
ko2 = (head('Kleiderschrank', 'Kostüm für deinen Begleiter')
       + f'<div style="{CARD};height:300px;display:grid;place-items:center;background:radial-gradient(circle at 50% 60%,rgba(242,166,90,.18),transparent 65%),rgba(255,255,255,0.04)">{costumed(13, 230, "kuerbis", seed=4)}</div>'
       + f'<div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px"><div><b style="font-size:16px">Kürbo</b><div style="font-size:11px;color:{MU}">Begleiter · trägt den Kürbishut</div></div>{chip("Frucht")}</div>'
       + f'<div style="{CARD};padding:12px">{sect("Kostüme", "3 von 6")}<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">{items}</div>'
         f'<div style="font-size:10px;color:{MU};margin-top:8px;line-height:1.45">Fehlende Kostüme gibt es in ihrer Saison: 10 Tage im Monat dabei. Verpasst? Nächstes Jahr wieder.</div></div>')

BOARDS = [('SK1', page('Sammelkarten', sk1, w=1240, h=760, tab=False, pad='32px 36px', gap=22, css=CSS), 'SK1 · Sammelkarten + Holo für Schillernde'),
          ('SK2', page('Sammelkarte', sk2, css=CSS), 'SK2 · Sammelkarte im Detail (Kipp-Effekt)'),
          ('KO1', page('Kostüme', ko1, w=1240, h=640, tab=False, pad='32px 36px', gap=18, css=CSS), 'KO1 · Saison-Kostüme (4 Monster × 6 Kostüme)'),
          ('KO2', page('Kleiderschrank', ko2, css=CSS), 'KO2 · Kleiderschrank für den Begleiter')]
