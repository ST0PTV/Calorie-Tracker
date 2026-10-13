import re, os, sys
from playwright.sync_api import sync_playwright
from PIL import Image

OUT = __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), 'qa_out')
os.makedirs(OUT, exist_ok=True)


def render(boards, name, t=None, maxw=3000):
    """boards: [(key, html, title)]; rendert jede Seite, setzt Animationen optional auf Zeit t (s)."""
    ims = []
    errs_all = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for key, html, _ in boards:
            w = int(re.search(r'"\$preview":\{"width":(\d+)', html).group(1)); h = int(re.search(r'"height":(\d+)\}', html).group(1))
            style = re.search(r'<style>(.*?)</style>', html, re.S).group(1); body = re.search(r'</helmet>(.*?)</x-dc>', html, re.S).group(1)
            f = f'{OUT}/{key}.html'
            open(f, 'w').write(f'<html><head><meta charset="utf-8"><style>{style}</style></head><body style="margin:0">{body}</body></html>')
            pg = b.new_page(viewport={'width': w, 'height': h}); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('file://' + f); pg.wait_for_timeout(400)
            if t is not None:
                pg.evaluate(f"document.getAnimations().forEach(a=>{{a.pause();a.currentTime={t * 1000}}})")
            pg.screenshot(path=f'{OUT}/{key}.png'); pg.close()
            errs_all[key] = errs
            ims.append(Image.open(f'{OUT}/{key}.png'))
        b.close()
    W = sum(i.width for i in ims) + 10 * (len(ims) - 1); H = max(i.height for i in ims)
    s = Image.new('RGB', (W, H), (40, 40, 40)); x = 0
    for im in ims:
        s.paste(im, (x, 0)); x += im.width + 10
    if W > maxw:
        s = s.resize((maxw, int(H * maxw / W)))
    s.save(f'{OUT}/{name}.png')
    return f'{OUT}/{name}.png', errs_all
