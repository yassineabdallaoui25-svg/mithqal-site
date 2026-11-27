# -*- coding: utf-8 -*-
"""App screenshots on the website, inside a realistic phone drawn in CSS (.device in site.css).

    python3 _tools/app_screens.py APP SHOTS_DIR VERSION      (APP = salary | budget)
SHOTS_DIR holds <lang>-NN-<name>.png full phone screens at 1080x2400 (status bar + app + gesture bar; lang = fr, en, da),
captured from the app's web bundle. Writes assets/screens/APP/<site-lang>/NN-<width>.(avif|webp) and rewrites the hero
and the "app in pictures" strip of /fr|en|ar/APP/ with <picture> (AVIF first, WebP fallback), srcset and sizes.
The Arabic site shows the app in Darija."""
import glob, html, os, re, sys
from PIL import Image

APP, SRC, VERSION = sys.argv[1], sys.argv[2], sys.argv[3]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_LANG = {'fr': 'fr', 'en': 'en', 'ar': 'da'}
WIDTHS = (270, 405, 540)  # shown in the page; 720 px WebP only as the tap-to-enlarge target
E = html.escape

ALT = {}
ALT['salary'] = {
    'fr': ['Accueil : où part ton salaire, en piles de pièces pour le net, la CNSS, l’AMO et l’IR',
           'Calcul : 8 903,64 MAD net par mois pour 10 000 MAD brut',
           'Augmentation : +759,18 MAD net par mois pour 1 000 MAD brut de plus',
           'Perte d’emploi : 45 667,21 MAD d’indemnités estimées',
           'Retraite CNSS : pension estimée à 4 200 MAD par mois',
           'Heures supplémentaires : +261,78 MAD brut pour 4 heures',
           'Mon mois : salaire, épargne, CNSS et fiche de paie au même endroit',
           'Apprendre : ta fiche de paie expliquée ligne par ligne'],
    'en': ['Home: where your salary goes, as coin stacks for net pay, CNSS, AMO and income tax',
           'Calculation: 8,903.64 MAD net a month for 10,000 MAD gross',
           'Pay rise: +759.18 MAD net a month for 1,000 MAD more gross',
           'Job loss: 45,667.21 MAD of estimated payments',
           'CNSS pension: estimated at 4,200 MAD a month',
           'Overtime: +261.78 MAD gross for 4 hours',
           'My month: salary, savings, CNSS and payslip in one place',
           'Learn: your payslip explained line by line'],
    'ar': ['الرئيسية: أين يذهب راتبك، في أكوام من القطع للصافي والضمان الاجتماعي والتأمين عن المرض والضريبة',
           'الحساب: 8.903,64 درهم صافية في الشهر مقابل 10.000 درهم إجمالية',
           'الزيادة: ‎+759,18 درهم صافية في الشهر مقابل 1.000 درهم إجمالية إضافية',
           'فقدان الشغل: 45.667,21 درهم من التعويضات المقدرة',
           'تقاعد الضمان الاجتماعي: معاش مقدر بـ 4.200 درهم في الشهر',
           'الساعات الإضافية: ‎+261,78 درهم إجمالية مقابل 4 ساعات',
           'شهري: الراتب والادخار والضمان الاجتماعي وورقة الأجر في مكان واحد',
           'تعلّم: ورقة أجرك مشروحة سطرًا بسطر'],
}
CAPTION = {}
CAPTION['salary'] = {
    'fr': ('Captures d’écran réelles de la version {v}.', 'Fais défiler pour voir les autres écrans.', 'Écran d’accueil de MITHQAL Salary'),
    'en': ('Real screenshots of version {v}.', 'Scroll to see more screens.', 'MITHQAL Salary home screen'),
    'ar': ('لقطات شاشة حقيقية من الإصدار {v}، بالدارجة.', 'مرّر لمشاهدة باقي الشاشات.', 'الشاشة الرئيسية لتطبيق MITHQAL Salary'),
}


def encode():
    total = 0
    for site, app in APP_LANG.items():
        out = os.path.join(ROOT, 'assets', 'screens', APP, site)
        os.makedirs(out, exist_ok=True)
        for f in sorted(glob.glob(os.path.join(SRC, f'{app}-*.png'))):
            n = os.path.basename(f).split('-')[1]
            im = Image.open(f).convert('RGB')
            for w in WIDTHS + (720,):
                h = round(im.height * w / im.width)
                r = im.resize((w, h), Image.LANCZOS)
                r.save(os.path.join(out, f'{n}-{w}.webp'), 'WEBP', quality=72 if w == 720 else 68, method=6)
                total += os.path.getsize(os.path.join(out, f'{n}-{w}.webp'))
                if w in WIDTHS:
                    r.save(os.path.join(out, f'{n}-{w}.avif'), 'AVIF', quality=46, speed=4)
                    total += os.path.getsize(os.path.join(out, f'{n}-{w}.avif'))
    print('encoded', round(total / 1024), 'KB in all sizes and formats')


def picture(site, n, sizes, alt, eager=False):
    base = f'/assets/screens/{APP}/{site}/{n}'
    av = ', '.join(f'{base}-{w}.avif {w}w' for w in WIDTHS)
    wp = ', '.join(f'{base}-{w}.webp {w}w' for w in WIDTHS)
    load = 'fetchpriority="high" decoding="async"' if eager else 'loading="lazy" decoding="async"'
    return (f'<picture><source type="image/avif" srcset="{av}" sizes="{sizes}">'
            f'<img src="{base}-540.webp" srcset="{wp}" sizes="{sizes}" alt="{E(alt)}" width="540" height="1200" {load}></picture>')


def pages():
    for site in APP_LANG:
        p = os.path.join(ROOT, site, APP, 'index.html')
        s = open(p, encoding='utf-8').read()
        n_shots = len(glob.glob(os.path.join(ROOT, 'assets', 'screens', APP, site, '*-540.webp')))
        cap, hint, hero_alt = CAPTION[APP][site]
        cap = cap.format(v=VERSION)
        # hero: the home screen in a phone frame
        s = re.sub(r'<figure class="(?:phone|plain|device) hero-phone">.*?</figure>',
                   f'<figure class="device hero-phone"><span class="dv-screen">{picture(site, "01", "(max-width:820px) 240px, 280px", hero_alt, eager=True)}</span></figure>', s, count=1, flags=re.S)
        # strip of all screens, each linking to its large version
        items = ''.join(f'<li><a href="/assets/screens/{APP}/{site}/{i:02d}-720.webp" class="device"><span class="dv-screen">'
                        f'{picture(site, f"{i:02d}", "(max-width:600px) 62vw, 220px", ALT[APP][site][i - 1])}</span></a></li>' for i in range(1, n_shots + 1))
        s = re.sub(r'(<ul class="shots"[^>]*>).*?(</ul>)', lambda m: m.group(1) + items + m.group(2), s, count=1, flags=re.S)
        s = re.sub(r'(<section class="sec tight shots-sec"><div class="wrap"><h2>[^<]*</h2><p class="muted">).*?(<span class="shots-hint">)[^<]*(</span></p>)',
                   lambda m: m.group(1) + E(cap) + ' ' + m.group(2) + E(hint) + m.group(3), s, count=1, flags=re.S)
        open(p, 'w', encoding='utf-8').write(s)
        print(site, n_shots, 'screens')


if __name__ == '__main__':
    encode()
    pages()
