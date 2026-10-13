#!/usr/bin/env python3
"""Schätzt für jede Monsterform den Hut-Ankerpunkt (Kopfoberkante) aus der gerenderten Silhouette.
Ergebnis: anchors_auto.json {tpl: [x, y, scale]} (viewBox 64). Handgesetzte Anker in r3kit.ANCHOR haben Vorrang."""
import asyncio, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import anim, bonus, r3_more  # noqa: F401  registriert alle Formen
from playwright.async_api import async_playwright
IDS = list(range(0, 42)) + [43, 44] + list(range(45, 58))
S = 4  # Pixel je Einheit

async def main():
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 64 * S, 'height': 64 * S})
        for i in IDS:
            svg = re.sub(r'\s+', ' ', anim.T[f't{i}'].strip()).replace('class="m"', f'width="{64 * S}" height="{64 * S}"')
            await pg.set_content(f'<html><body style="margin:0;background:transparent">{svg}</body></html>')
            buf = await pg.screenshot(omit_background=True)
            from PIL import Image; import io
            im = Image.open(io.BytesIO(buf)).convert('RGBA'); px = im.load(); W, H = im.size
            rows = []
            for y in range(H):
                xs = [x for x in range(W) if px[x, y][3] > 120]
                rows.append((min(xs), max(xs), len(xs)) if xs else None)
            # erste Zeile, ab der die Silhouette mindestens 9 Einheiten breit und dicht ist (Stiele/Antennen überspringen)
            y0 = next((y for y, r in enumerate(rows) if r and r[2] >= 9 * S and (r[1] - r[0]) <= r[2] * 1.6), None)
            if y0 is None: y0 = next((y for y, r in enumerate(rows) if r and r[2] >= 5 * S), None)
            if y0 is None: y0 = next(y for y, r in enumerate(rows) if r)
            r = rows[min(H - 1, y0 + 3 * S)] or rows[y0]
            cx = (r[0] + r[1]) / 2 / S; w = (r[1] - r[0]) / S
            out[i] = [round(cx, 1), round(y0 / S + 2.5, 1), round(max(0.55, min(1.25, w / 20)), 2)]
        await b.close()
    json.dump(out, open(os.path.join(HERE, 'anchors_auto.json'), 'w'), indent=0)
    print(len(out), 'Anker')
asyncio.run(main())
