# -*- coding: utf-8 -*-
"""Branded share images (1200x630) for every page, from the page's own h1 and description.
    python3 _tools/og.py        (needs a local server on :8811 for fonts/images, and Playwright + Chrome)
Writes assets/og/<lang>-<slug>.jpg and points og:image / twitter:image at it. The 2027 pages keep their own images."""
import asyncio, glob, html, os, re
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOOT = {'fr': 'Gratuit, sans compte, règles 2026', 'en': 'Free, no account, 2026 rules', 'ar': 'مجاني، دون حساب، قواعد 2026'}

TPL = '''<!doctype html><html lang="{l}" dir="{dir}"><head><meta charset="utf-8"><style>
@font-face{{font-family:R;src:url(/assets/fonts/readex-pro-latin-wght-normal.woff2) format("woff2");font-weight:200 700}}
@font-face{{font-family:R;src:url(/assets/fonts/readex-pro-arabic-wght-normal.woff2) format("woff2");font-weight:200 700;unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF}}
*{{margin:0;box-sizing:border-box}}
body{{width:1200px;height:630px;font-family:R,sans-serif;color:#EAF3F2;overflow:hidden;
 background:radial-gradient(110% 90% at {gx} 10%,#0F3B3F 0%,#072427 48%,#04191B 100%);display:grid;grid-template-columns:1fr 330px;gap:40px;padding:64px 72px}}
.l{{display:flex;flex-direction:column;justify-content:space-between;min-width:0}}
.brand{{display:flex;align-items:center;gap:14px;font-weight:600;letter-spacing:.14em;font-size:26px}}
.brand img{{width:52px;height:52px;border-radius:14px}}
h1{{text-wrap:balance;hyphens:none;font-weight:650;font-size:{fs}px;line-height:1.08;letter-spacing:-.01em;margin-top:28px}}
p{{text-wrap:pretty;font-size:28px;line-height:1.35;color:#A3C0BD;margin-top:20px;max-width:30ch}}
.f{{display:flex;align-items:center;gap:18px;font-size:24px;color:#A3C0BD}}
.f b{{color:#04191B;background:#D4AA55;padding:8px 16px;border-radius:12px;font-weight:600}}
.r{{display:flex;align-items:center;justify-content:center}}
.r img{{width:300px;filter:drop-shadow(0 30px 50px rgba(0,0,0,.5))}}
</style></head><body><div class="l"><div><div class="brand"><img src="/assets/img/icon-192.png" alt="">MITHQAL</div><h1>{h1}</h1><p>{sub}</p></div>
<div class="f"><b>mithqal.ma</b><span>{foot}</span></div></div><div class="r"><img src="/assets/img/{art}" alt=""></div></body></html>'''


def pages():
    for f in sorted(glob.glob(os.path.join(ROOT, '*', '**', 'index.html'), recursive=True)):
        rel = os.path.relpath(f, ROOT)
        l = rel.split('/')[0]
        if l not in ('fr', 'en', 'ar') or '/2027/' in rel + '/' and rel.count('/') == 2:
            continue
        s = open(f, encoding='utf-8').read()
        if 'og:image' not in s:
            continue
        h1 = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
        desc = re.search(r'<meta name="description" content="([^"]*)"', s)
        if not h1:
            continue
        h1 = html.unescape(re.sub(r'<[^>]+>', '', h1.group(1))).strip()
        lede = re.search(r'<p class="lede"[^>]*>(.*?)</p>', s, re.S)
        d = html.unescape(re.sub(r'<[^>]+>', '', lede.group(1))) if lede else (html.unescape(desc.group(1)) if desc else '')
        sub = re.split(r'(?<=[.!?؟])\s', d.strip())[0]
        if len(sub) > 120:
            sub = sub[:117].rsplit(' ', 1)[0] + '…'
        slug = rel[len(l) + 1:-len('index.html')].strip('/').replace('/', '-') or 'home'
        art = 'chest.webp' if '/budget/' in rel else 'mizan.webp'
        yield f, l, slug, h1, sub, art


async def main():
    os.makedirs(os.path.join(ROOT, 'assets', 'og'), exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg = await b.new_page(viewport={'width': 1200, 'height': 630})
        n = 0
        for f, l, slug, h1, sub, art in pages():
            fs = 64 if len(h1) < 34 else 56 if len(h1) < 52 else 48
            doc = TPL.format(l=l, dir='rtl' if l == 'ar' else 'ltr', gx='15%' if l == 'ar' else '85%', fs=fs, h1=html.escape(h1), sub=html.escape(sub), foot=FOOT[l], art=art)
            await pg.goto('http://localhost:8811/__og_blank.html')
            await pg.set_content(doc, wait_until='networkidle')
            await pg.evaluate('document.fonts.ready')
            out = f'assets/og/{l}-{slug}.jpg'
            await pg.screenshot(path=os.path.join(ROOT, out), type='jpeg', quality=82)
            s = open(f, encoding='utf-8').read()
            url = f'https://mithqal.ma/{out}'
            s = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{url}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">', s, count=1)
            s = re.sub(r'(<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">)+', r'<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">', s)
            s = s.replace('<meta name="twitter:card" content="summary">', '<meta name="twitter:card" content="summary_large_image">')
            open(f, 'w', encoding='utf-8').write(s)
            n += 1
        await b.close()
        print(n, 'images')

asyncio.run(main())
