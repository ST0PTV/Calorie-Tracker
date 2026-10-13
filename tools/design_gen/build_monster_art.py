#!/usr/bin/env python3
"""Erzeugt js/monster_art.js (alle Monster-SVGs mit Animationsgruppen) und css/monster.css.
Aufruf aus diesem Ordner: python3 build_monster_art.py"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
REPO = os.path.dirname(os.path.dirname(HERE))
import anim  # noqa: E402
import bonus  # noqa: E402,F401  registriert t45–t56
import r3kit  # noqa: E402
import r3_more  # noqa: E402,F401  registriert t57 (Erntor neu)
import r3_hatch  # noqa: E402
import r3_garden  # noqa: E402

IDS = list(range(0, 42)) + [43, 44] + list(range(45, 58))
art = {}
for i in IDS:
    svg = anim.build(i, 100, tap=True, inner_extra='%C%')
    svg = svg.replace('<svg ', '<svg class="mon" ', 1).replace('width="100" height="100"', 'width="%S%" height="%S%"', 1)
    art[f't{i}'] = svg
# statische Grundformen (für Silhouetten und Icons)
plain = {f't{i}': re.sub(r'\s+', ' ', anim.T[f't{i}'].strip()) for i in IDS}
hats = {k: re.sub(r'^<g transform="translate\(0 0\) scale\(1\)">|</g>$', '', r3kit.hat(k, 0, 0, 1)) for k in ['kranz', 'stroh', 'kuerbis', 'muetze', 'party']}
# Garten-Szenen (ohne Deko und Beet-Inhalt; beides setzt js/level_garden.js), Klassen mit Präfix lvg-
GCLS = r'\b(wander|ffly|fall|cloud|bird|flap|tw)\b'
def gpre(t):
    return re.sub(r'class="([^"]*)"', lambda m: 'class="' + re.sub(GCLS, r'lvg-\1', m.group(1)) + '"', t)
garden = {k: gpre(re.sub(r'\s+', ' ', r3_garden.scene(k, deko=False, plots_fill=False))) for k in ['herbst', 'nacht', 'winter', 'fruehling', 'sommer']}
# Hut-/Schal-Anker: von Hand korrigiert > aus den Entwürfen > automatisch geschätzt (auto_anchor.py)
_auto = json.load(open(os.path.join(HERE, 'anchors_auto.json')))
_fix = json.load(open(os.path.join(HERE, 'anchors_fix.json')))
anchors = {}
for i in IDS:
    man = r3kit.ANCHOR.get(i)
    hat_a = _fix.get(str(i)) or (list(man[0]) if man else _auto[str(i)])
    anchors[f't{i}'] = [hat_a, list(man[1]) if man and man[1] else None]
names = {f't{i}': anim.CFG[i]['name'] for i in IDS}
js = ('/* Gemüsemonster – generiert von tools/design_gen/build_monster_art.py, nicht von Hand ändern.\n'
      '   %S% = Größe in px, %C% = Platz für Kostüm (Hut/Schal) innerhalb der Körper-Animation. */\n'
      "'use strict';\n"
      f'const MONSTER_ART = {json.dumps(art, ensure_ascii=False)};\n'
      f'const MONSTER_PLAIN = {json.dumps(plain, ensure_ascii=False)};\n'
      f'const MONSTER_NAMES = {json.dumps(names, ensure_ascii=False)};\n'
      f'const MONSTER_SIG = {json.dumps({f"t{i}": anim.CFG[i].get("sig", "") for i in IDS}, ensure_ascii=False)};\n'
      f'const MONSTER_HATS = {json.dumps(hats, ensure_ascii=False)};\n'
      f'const GARDEN_SCENES = {json.dumps(garden, ensure_ascii=False)};\n'
      f'const MONSTER_ANCHOR = {json.dumps(anchors)};\n'
      f'const ARENA_SCENES = {json.dumps({k: re.sub(r"\\s+", " ", v.strip()).replace('class="scene"', 'class="lva-scn"', 1) for k, v in r3_more.SCN.items()}, ensure_ascii=False)};\n'
      "if (typeof module !== 'undefined' && module.exports) module.exports = { MONSTER_ART, MONSTER_PLAIN, MONSTER_NAMES, MONSTER_HATS, MONSTER_ANCHOR, GARDEN_SCENES, MONSTER_SIG, ARENA_SCENES };\n")
open(os.path.join(REPO, 'js/monster_art.js'), 'w', encoding='utf-8').write(js)

css = ('/* Gemüsemonster-Animationen – generiert (build_monster_art.py) */\n' + anim.css_lib(tap=True) + '\n'
       + re.sub(r'\.(eggw|crack|etop|ebot|flash|pop|lbl|spark|halo|aN|aW|bW|bN|white|evflash|evglow|evl0|evl)\b', r'.lvh-\1', r3_hatch.CSS) + '\n'
       + re.sub(r'\.(wander|ffly|fall|cloud|bird|flap|tw)\b', r'.lvg-\1', r3kit.SCENE_CSS) + '\n'
       + '.mon-still .mon *,.mon-still .mon{animation:none!important}\n'
       + '.lv-calm .mon .sg{animation:none!important}\n'
       + '@media (prefers-reduced-motion: reduce){.mon *,.mon,.lv-anim *,.lvg-scene *{animation:none!important;transition:none!important}}\n')
open(os.path.join(REPO, 'css/monster.css'), 'w', encoding='utf-8').write(css)
print('monster_art.js', len(js) // 1024, 'KB · monster.css', len(css) // 1024, 'KB ·', len(art), 'Formen')
