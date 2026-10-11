"""Baut data/recipes.json aus tools/recipes_src.py und data/bls.json (Nährwerte je Portion aus dem BLS 4.0)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from recipes_src import R
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bls = {x['id']: x for x in json.load(open(os.path.join(root, 'data', 'bls.json')))['foods']}
NUT = ['k', 'p', 'c', 'f', 'fi', 'su', 'fs']
out, ids = [], set()
for r in R:
    assert r['id'] not in ids, r['id']; ids.add(r['id'])
    tot = {k: 0.0 for k in NUT}; w = 0.0; items = []
    for fid, g in r['items']:
        w += g
        if fid == 'WATER': continue
        b = bls[fid]
        for k in NUT: tot[k] += (b.get(k) or 0) * g / 100
        if b.get('d') is not None and b['d'] < r['d']:
            raise SystemExit(f"{r['id']}: {b['n']} passt nicht zu d={r['d']}")
        miss = set(b.get('a') or []) - set(r['a'])
        if miss: raise SystemExit(f"{r['id']}: Allergen {miss} aus {b['n']} fehlt")
        items.append([fid, round(g / r['p'])])
    per = {k: round(tot[k] / w * 100, 2) for k in NUT}
    out.append(dict(id='rcp:' + r['id'], n=r['n'], meal=r['meal'], g=round(w / r['p']), d=r['d'], a=sorted(r['a']), items=items, steps=r['steps'], **per))
json.dump({'meta': {'note': 'Eigene Rezepte (Zutaten + Kurzanleitung), Nährwerte aus BLS 4.0 je 100 g fertiges Gericht; g = Gramm je Portion.', 'count': len(out)}, 'recipes': out},
          open(os.path.join(root, 'data', 'recipes.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
for r in out:
    k = r['k'] * r['g'] / 100
    print(f"{r['meal']:3} d{r['d']} {r['n'][:42]:42} {r['g']:4} g  {k:5.0f} kcal  E {r['p']*r['g']/100:4.0f}  KH {r['c']*r['g']/100:4.0f}  F {r['f']*r['g']/100:4.0f}  {','.join(r['a'])}")
print(len(out))
