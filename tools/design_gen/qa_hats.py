import asyncio, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import anim, bonus, r3_more, r3kit  # noqa
from playwright.async_api import async_playwright
IDS = list(range(0, 42)) + [43, 44] + list(range(45, 58))
A = {int(k): v for k, v in json.load(open(os.path.join(HERE, 'anchors_auto.json'))).items()}
OVR = json.load(open(os.path.join(HERE, 'anchors_fix.json'))) if os.path.exists(os.path.join(HERE, 'anchors_fix.json')) else {}
def anc(i):
    if str(i) in OVR: return OVR[str(i)]
    if i in r3kit.ANCHOR: return list(r3kit.ANCHOR[i][0])
    return A[i]
cells = ''
for i in IDS:
    x, y, s = anc(i)
    svg = re.sub(r'\s+', ' ', anim.T[f't{i}'].strip()).replace('class="m"', 'width="120" height="120" style="overflow:visible"')
    svg = svg.replace('</svg>', r3kit.hat('kuerbis', x, y, s) + '</svg>')
    cells += f'<div style="text-align:center;font:11px sans-serif;color:#ccc">{svg}<br>t{i} {x},{y},{s}</div>'
html = f'<html><body style="margin:0;background:#1a2133;display:grid;grid-template-columns:repeat(10,130px);gap:6px;padding:20px 8px">{cells}</body></html>'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1400, 'height': 900})
        await pg.set_content(html); await pg.screenshot(path=sys.argv[1], full_page=True); await b.close()
asyncio.run(main())
