#!/usr/bin/env python3
"""Put the real Play Store screenshots on the app pages.
- assets/screens/<app>/NN.webp (540 px wide) and NN-sm.webp (270 px) from the raw uploads
- app pages (fr/en/ar): hero shows screen 01 in a phone frame; a scrollable strip shows all screens
Run from the site root:  python3 _tools/add_screens.py RAW_DIR   (RAW_DIR/<app>/NN.webp)"""
import glob, os, re, sys
from PIL import Image

RAW = sys.argv[1]
APPS = ['salary', 'budget', 'qnach']
NAMES = {'salary': 'MITHQAL Salary', 'budget': 'MITHQAL Budget', 'qnach': 'MITHQAL QNACH'}
T = {
 'fr': dict(h='L’app en images', p='Captures d’écran réelles de l’application, telles que publiées sur Google Play.', alt='Écran {n} sur {t} de {name}', hero='Écran d’accueil de {name}', hint='Fais défiler pour voir les autres écrans.'),
 'en': dict(h='The app in pictures', p='Real screenshots of the app, as published on Google Play.', alt='{name} screen {n} of {t}', hero='{name} home screen', hint='Scroll to see more screens.'),
 'ar': dict(h='التطبيق بالصور', p='لقطات شاشة حقيقية للتطبيق، كما هي منشورة على Google Play.', alt='الشاشة {n} من {t} في {name}', hero='الشاشة الرئيسية لتطبيق {name}', hint='مرّر لمشاهدة باقي الشاشات.'),
}

counts = {}
for app in APPS:
    src = sorted(glob.glob(os.path.join(RAW, app, '*.webp')))
    os.makedirs(f'assets/screens/{app}', exist_ok=True)
    for i, f in enumerate(src, 1):
        im = Image.open(f).convert('RGB')
        for suffix, w in (('', 540), ('-sm', 270)):
            h = round(im.height * w / im.width)
            im.resize((w, h), Image.LANCZOS).save(f'assets/screens/{app}/{i:02d}{suffix}.webp', 'WEBP', quality=80, method=6)
    counts[app] = len(src)
    print(app, len(src), 'screens', Image.open(f'assets/screens/{app}/01.webp').size)

for L, t in T.items():
    for app in APPS:
        n = counts[app]
        if not n: continue
        p = f'{L}/{app}/index.html'
        s = open(p, encoding='utf-8').read()
        if 'class="shots"' in s:
            print(p, 'already has screens'); continue
        name = NAMES[app]
        w, h = Image.open(f'assets/screens/{app}/01.webp').size
        # hero: real home screen in a phone frame instead of the decorative image
        frame = 'phone' if app == 'salary' else 'plain'  # budget/qnach store visuals already include a device
        s, k = re.subn(r'<img class="hero-art"[^>]*>',
                       f'<figure class="{frame} hero-phone"><img src="/assets/screens/{app}/01.webp" alt="{t["hero"].format(name=name)}" width="{w}" height="{h}" fetchpriority="high"></figure>', s, count=1)
        assert k == 1, p
        items = ''.join(
            f'<li><a href="/assets/screens/{app}/{i:02d}.webp" class="{frame}"><img src="/assets/screens/{app}/{i:02d}-sm.webp" '
            f'srcset="/assets/screens/{app}/{i:02d}-sm.webp 270w, /assets/screens/{app}/{i:02d}.webp 540w" sizes="(max-width:600px) 62vw, 220px" '
            f'alt="{t["alt"].format(n=i, t=n, name=name)}" width="270" height="{round(270*h/w)}" loading="lazy"></a></li>'
            for i in range(1, n + 1))
        section = (f'<section class="sec tight shots-sec"><div class="wrap"><h2>{t["h"]}</h2><p class="muted">{t["p"]} <span class="shots-hint">{t["hint"]}</span></p>'
                   f'<ul class="shots" tabindex="0" aria-label="{t["h"]}">{items}</ul></div></section>\n')
        i = s.find('</section>', s.find('<section class="sec hero"')) + len('</section>\n')
        s = s[:i] + section + s[i:]
        open(p, 'w', encoding='utf-8').write(s)
        print(p, 'ok')

css = open('assets/site.css').read()
if '/* app screenshots */' not in css:
    css += '''
/* app screenshots */
.phone{display:block;margin:0;padding:8px;border-radius:28px;background:#0b1f21;border:1px solid rgba(234,243,242,.18);box-shadow:0 24px 48px -24px rgba(0,0,0,.6)}
.phone img{display:block;width:100%;height:auto;border-radius:20px}
.plain{display:block;margin:0}
.plain img{display:block;width:100%;height:auto;border-radius:18px;box-shadow:0 24px 48px -24px rgba(0,0,0,.6)}
.hero-phone{justify-self:center;width:min(100%,280px)}
@media (max-width:820px){.hero-phone{width:min(62%,240px);order:-1}}
.shots-sec{background:var(--deep)}
.shots{list-style:none;margin:20px 0 0;padding:4px 2px 18px;display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:thin}
.shots li{flex:none;width:220px;scroll-snap-align:start}
@media (max-width:600px){.shots li{width:62vw}}
.shots a:focus-visible{outline:3px solid var(--gold-soft);outline-offset:3px}
.shots-hint{white-space:nowrap}
@media (min-width:1200px){.shots-hint{display:none}}
'''
    open('assets/site.css', 'w').write(css)
print('done')
