# -*- coding: utf-8 -*-
"""Growth pass (27/11/2026). Builds the new pages (employer cost, pay rise, SMIG 2026, beta) in fr/en/ar and patches
existing pages: home quick calculator + tools grid, related-tools blocks, footer calculators column, beta links,
share box on the salary calculator, tools index, sitemap. Idempotent: run it again after editing grow_text.py.

    node _tools/grow_numbers.js > /tmp/mq_numbers.json && python3 _tools/grow.py /tmp/mq_numbers.json
    python3 _tools/build_search.py
"""
import glob, html, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from grow_text import LANGS, TOOLS, TOOL_TXT, UI, PAGES, WHERE, PWA, SLIP

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = json.load(open(sys.argv[1]))
CONTACT = 'yassine.abdallaoui25@gmail.com'
LOCALE = {'fr': 'fr-MA', 'en': 'en-US', 'ar': 'ar-MA'}
CUR = {'fr': 'DH', 'en': 'MAD', 'ar': 'درهم'}
E = html.escape


def money(x, l, cur=True):
    s = f'{x:,.2f}'
    if l != 'en':
        s = s.replace(',', ' ').replace('.', ',').replace(' ', '.')
    return f'{s} {CUR[l]}' if cur else s


def pct(x, l):
    s = f'{x:.1f}'.rstrip('0').rstrip('.')
    return (s + '%') if l == 'en' else (s.replace('.', ',') + (' %' if l == 'fr' else '٪'))


def rd(p):
    return open(os.path.join(ROOT, p), encoding='utf-8').read()


def wr(p, s):
    full = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(s)


def fill(s, l):
    if not isinstance(s, str):
        return s
    m = N['smig']
    e30 = next(x for x in N['employer'] if x['gross'] == 30000)
    e8 = next(x for x in N['employer'] if x['gross'] == 8000)
    t = N['trap']
    rep = {'{m}': money(m['monthly'], l), '{n}': money(m['net'], l), '{cnss}': money(m['cnss'], l), '{amo}': money(m['amo'], l),
           '{emp}': money(m['employer'], l), '{cost}': money(m['cost'], l), '{panier}': money(m['panierDay'], l),
           '{g30}': money(30000, l), '{r30}': pct(e30['rate'], l), '{p8}': money(e8['per100'], l, False),
           '{c8}': money(e8['cost'], l), '{n8}': money(e8['net'], l),
           '{t6500}': money(t['at6500'], l), '{t6510}': money(t['at6510'], l), '{t6600}': money(t['at6600'], l)}
    for k, v in rep.items():
        s = s.replace(k, v)
    return s


# ------------------------------------------------------------------ page shell from an existing tool page
def shell(l):
    s = rd(f'{l}/tools/overtime/index.html')
    head = s[:s.find('</head>')]
    body_top = s[s.find('<body>'):s.find('<main')]
    foot = s[s.find('</main>') + len('</main>'):s.find('<script src="../../../assets/track.js"')]
    body_top = body_top.replace('../../../assets/', '/assets/').replace(" aria-current='page'", '')
    foot = foot.replace('../../../assets/', '/assets/')
    return head, body_top, foot


def build(l, path, title, desc, main, ld, scripts, i18n):
    head, top, foot = shell(l)
    url = f'https://mithqal.ma/{l}{path}'
    head = re.sub(r'<title>.*?</title>', f'<title>{E(title)}</title>', head)
    head = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{E(desc)}">', head)
    head = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{E(title)}">', head)
    head = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{E(desc)}">', head)
    head = head.replace('/tools/overtime/', path).replace('../../../assets/', '/assets/')
    head = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', '', head, flags=re.S)
    ads = head.rfind('<script async src="https://pagead2')
    head = head[:ads] + ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False, separators=(",", ":"))}</script>\n' for x in ld) + '\n' + head[ads:]
    top = top.replace('/tools/overtime/', path)
    js = ''.join(f'<script src="/assets/{x}" defer></script>' for x in scripts)
    return (f'{head}</head>\n{top}<main id="main">\n{main}\n</main>{foot}'
            f'<script src="/assets/track.js" defer></script>\n'
            f'<script>window.MQ_GROW={json.dumps(i18n, ensure_ascii=False)}</script>\n{js}\n'
            f'<script src="/assets/search.js" defer></script>\n</body></html>\n')


def faq_ld(faq):
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]}


def app_ld(name, url, l):
    return {'@context': 'https://schema.org', '@type': 'WebApplication', 'name': name, 'url': url, 'applicationCategory': 'FinanceApplication',
            'operatingSystem': 'Any', 'inLanguage': l, 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'MAD'}, 'isAccessibleForFree': True}


def dep_select(id_, label):
    opts = ''.join(f'<option value="{i}"{" selected" if i == 0 else ""}>{i}</option>' for i in range(7))
    return f'<label class="fld"><span>{E(label)}</span><select id="{id_}">{opts}</select></label>'


def table(head, rows, num_from=1):
    th = ''.join(f'<th{" style=\"text-align:end\"" if i >= num_from else ""}>{E(h)}</th>' for i, h in enumerate(head))
    tr = ''.join('<tr>' + ''.join(f'<td class="{"r num" if i >= num_from else "num"}">{c}</td>' for i, c in enumerate(r)) + '</tr>' for r in rows)
    return f'<div class="scroll-x"><table class="tbl"><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>'


def faq_html(faq):
    return ''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q, a in faq)


def slip_rows(l, exclude=None):
    k = SLIP[l]
    e8 = next(x for x in N['employer'] if x['gross'] == 8000)
    r8 = next(x for x in N['raise'] if x['from'] == 8000)
    vals = {'net': money(e8['net'], l), 'y2027': money(N['net2027_8000'], l), 'employer': money(e8['cost'], l),
            'raise': ('‎' if l == 'ar' else '') + '+' + money(r8['netGain'], l), 'smig': money(N['smig']['net'], l)}
    hrefs = {'net': '/tools/salary-calculator/', 'y2027': '/2027/', 'employer': '/tools/employer-cost/', 'raise': '/tools/raise/', 'smig': '/smig-2026/'}
    skip = {'salary': 'net', 'y2027': 'y2027', 'employer': 'employer', 'raise': 'raise', 'smig': 'smig'}.get(exclude)
    rows = ''.join(f'<li><a href="/{l}{hrefs[key]}" data-bl="{key}" data-track="slip" data-where="{key}"><span class="sl-l">{E(k["lines"][key])}</span><span class="sl-d" aria-hidden="true"></span><b class="sl-v num">{vals[key]}</b></a></li>'
                   for key in ('net', 'y2027', 'employer', 'raise') if key != skip)
    if skip != 'smig':
        rows += f'<li class="sl-ref"><a href="/{l}{hrefs["smig"]}" data-track="slip" data-where="smig"><span class="sl-l">{E(k["lines"]["smig"])}</span><span class="sl-d" aria-hidden="true"></span><b class="sl-v num">{vals["smig"]}</b></a></li>'
    return (f'<div class="slip" id="slip"><div class="sl-top"><h3>{E(k["title"])}</h3>'
            f'<label class="sl-in"><span>{E(k["for"])}</span><input id="sl-g" type="number" inputmode="decimal" min="0" step="100" value="8000" aria-label="{E(k["for"])} ({E(k["per"])})"><span>{E(k["per"])}</span></label></div>'
            f'<ul class="sl-rows">{rows}</ul><p class="sl-tap">{E(k["tap"])}</p></div>')


def check_block(l, preview=True):
    k = SLIP[l]
    prev = ''.join(f'<li class="{c}"><span>{E(a)}</span><b class="num">{E(v)}</b><i>{"✓" if c == "ok" else "!"} {E(t)}</i></li>' for a, v, c, t in k['prev'])
    return (f'<a class="check" href="/{l}/tools/payslip-check/" data-track="check_block"><b class="ck-t">{E(k["feat"])}</b><span class="ck-p">{E(k["featText"])}</span>'
            + (f'<ul class="ck-prev" aria-hidden="true">{prev}</ul>' if preview else '') + f'<span class="btn">{E(k["featBtn"])}</span></a>')


def others_list(l, keys, title):
    items = ''.join(f'<li><a href="/{l}{pp}" data-track="related" data-where="{kk}"><b>{E(TOOL_TXT[l][kk][0])}</b><span>{E(TOOL_TXT[l][kk][1])}</span></a></li>' for kk, pp, ic in TOOLS if kk in keys)
    return f'<div class="others"><h3>{E(title)}</h3><ul>{items}</ul></div>'


def related(l, exclude):
    """Bottom block of every tool page: the payslip (recomputed for the gross typed in the page) + the checker + other tools."""
    side = ''
    if exclude != 'payslip':
        side += check_block(l, preview=False)
    side += others_list(l, [x for x in ('overtime', 'severance', 'pension') if x != exclude], SLIP[l]['other'])
    return (f'<!--mq-related--><section class="sec related slip-sec"><div class="wrap"><div class="slip-head"><h2>{E(UI[l]["related"])}</h2></div>'
            f'<div class="slip-grid">{slip_rows(l, exclude)}<div class="slip-side">{side}</div></div></div></section><!--/mq-related-->')


def share_box(l, where, url=None):
    u = UI[l]
    attrs = f' data-url="{E(url)}"' if url else ''
    return (f'<div class="share" data-share data-where="{where}" data-text="{E(u["shareText"])}"{attrs}><span>{E(u["share"])}</span>'
            f'<a class="btn wa" data-wa href="https://wa.me/" target="_blank" rel="noopener" data-track="share_whatsapp" data-where="{where}">WhatsApp</a>'
            f'<button type="button" class="btn ghost" data-native hidden>{E(u["more"])}</button>'
            f'<button type="button" class="btn ghost" data-copy data-done="{E(u["copied"])}">{E(u["copy"])}</button></div>')


def src_list(items):
    return '<ul class="src">' + ''.join(f'<li>{E(x)}</li>' for x in items) + '</ul>'


ENGINE = ['engine/rules.js', 'engine/payroll.js', 'grow.js']


# ------------------------------------------------------------------ new pages
def page_employer(l):
    P = PAGES['employer'];
    t = {k: fill(v, l) if isinstance(v, str) else v for k, v in P[l].items()}
    t['faq'] = [[fill(q, l), fill(a, l)] for q, a in P[l]['faq']]
    ex = [[money(x['gross'], l, False), money(x['charges'], l, False), money(x['cost'], l, False), money(x['net'], l, False), pct(x['per100'], l)] for x in N['employer']]
    main = (f'<section class="sec hero tight"><div class="wrap" style="display:block"><h1>{E(t["h1"])}</h1><p class="lede">{E(t["lede"])}</p></div></section>\n'
            f'<section class="sec tight" style="padding-top:0"><div class="wrap"><div class="calc" id="emp">'
            f'<form class="form card" onsubmit="return false"><label class="fld"><span>{E(t["form"]["gross"])}</span><input id="e-g" type="number" inputmode="decimal" min="0" step="100" value="8000"></label>'
            f'{dep_select("e-d", t["form"]["dep"])}<p class="fine" style="margin:0">{E(t["fine"])}</p></form>'
            f'<div class="res" id="result" aria-live="polite"></div></div>{share_box(l, "employer")}</div></section>\n'
            f'<section class="sec paper"><div class="wrap prose"><h2>{E(t["how_h"])}</h2><ol>' + ''.join(f'<li>{E(x)}</li>' for x in t['how']) + '</ol>'
            f'<h2>{E(t["rates_h"])}</h2>{table(t["rates_head"], [[E(c) for c in r] for r in t["rates"]])}'
            f'<h2>{E(t["ex_h"])}</h2>{table([h + (f' ({CUR[l]})' if 0 < i < 4 or (i == 0) else '') for i, h in enumerate(t['ex_head'])], ex)}'
            f'<h2>FAQ</h2>{faq_html(t["faq"])}<h2>{E(t["src_h"])}</h2>{src_list(t["src"])}</div></section>\n' + related(l, 'employer'))
    i18n = {'numLocale': LOCALE[l], 'currency': CUR[l], 't': {'res': t['res'], 'calcBase': f'/{l}/tools/salary-calculator/'}}
    url = f'https://mithqal.ma/{l}{P["path"]}'
    wr(f'{l}{P["path"]}index.html', build(l, P['path'], t['title'], t['desc'], main, [app_ld(t['h1'], url, l), faq_ld(t['faq'])], ENGINE, i18n))


def page_raise(l):
    P = PAGES['raise'];
    t = {k: fill(v, l) if isinstance(v, str) else v for k, v in P[l].items()}
    t['faq'] = [[fill(q, l), fill(a, l)] for q, a in P[l]['faq']]
    fm = t['form']
    ex = [[money(x['from'], l, False), money(x['to'], l, False), money(x['grossGain'], l, False), money(x['netGain'], l, False), pct(x['kept'], l)] for x in N['raise']]
    main = (f'<section class="sec hero tight"><div class="wrap" style="display:block"><h1>{E(t["h1"])}</h1><p class="lede">{E(t["lede"])}</p></div></section>\n'
            f'<section class="sec tight" style="padding-top:0"><div class="wrap"><div class="calc" id="raise">'
            f'<form class="form card" onsubmit="return false"><label class="fld"><span>{E(fm["gross"])}</span><input id="r-g" type="number" inputmode="decimal" min="0" step="100" value="8000"></label>'
            f'<fieldset style="border:0;padding:0;margin:0"><legend class="fine" style="margin-bottom:6px">{E(fm["mode"])}</legend><div class="seg"><label><input type="radio" name="rmode" value="pct" checked><span>{E(fm["pct"])}</span></label><label><input type="radio" name="rmode" value="dh"><span>{E(fm["dh"])}</span></label></div></fieldset>'
            f'<label class="fld"><span>{E(fm["val"])}</span><input id="r-v" type="number" inputmode="decimal" min="0" step="1" value="10"></label>'
            f'{dep_select("r-d", fm["dep"])}<p class="fine" style="margin:0">{E(t["fine"])}</p></form>'
            f'<div class="res" id="result" aria-live="polite"></div></div>{share_box(l, "raise")}</div></section>\n'
            f'<section class="sec paper"><div class="wrap prose"><h2>{E(t["how_h"])}</h2><ol>' + ''.join(f'<li>{E(x)}</li>' for x in t['how']) + '</ol>'
            f'<h2>{E(t["ex_h"])}</h2>{table([h + (f' ({CUR[l]})' if 0 < i < 4 or (i == 0) else '') for i, h in enumerate(t['ex_head'])], ex)}'
            f'<h2>FAQ</h2>{faq_html(t["faq"])}<h2>{E(t["src_h"])}</h2>{src_list(t["src"])}</div></section>\n' + related(l, 'raise'))
    i18n = {'numLocale': LOCALE[l], 'currency': CUR[l], 't': {'res': t['res']}}
    url = f'https://mithqal.ma/{l}{P["path"]}'
    wr(f'{l}{P["path"]}index.html', build(l, P['path'], t['title'], t['desc'], main, [app_ld(t['h1'], url, l), faq_ld(t['faq'])], ENGINE, i18n))


def page_smig(l):
    P = PAGES['smig'];
    t = {k: fill(v, l) if isinstance(v, str) else v for k, v in P[l].items()}
    t['faq'] = [[fill(q, l), fill(a, l)] for q, a in P[l]['faq']]
    cards = ''.join(f'<div class="stat"><b class="num">{E(fill(a, l))}</b><span>{E(b)}</span></div>' for a, b in t['cards'])
    rows = ''.join(f'<tr{" class=\"tot\"" if i == len(t["net_rows"]) - 1 else ""}><td>{E(a)}</td><td class="r num">{E(fill(b, l))}</td></tr>' for i, (a, b) in enumerate(t['net_rows']))
    hist = [[h['y'], money(h['h'], l, False), money(h['m'], l, False), money(h['smag'], l, False)] for h in N['history']]
    links = ''.join(f'<li>{E(fill(a, l))} <a href="/{l}{p}">{E(b)}</a></li>' for a, p, b in t['links'])
    main = (f'<section class="sec hero tight"><div class="wrap" style="display:block"><h1>{E(t["h1"])}</h1><p class="lede">{E(t["lede"])}</p><div class="stats">{cards}</div></div></section>\n'
            f'<section class="sec paper"><div class="wrap prose"><h2>{E(t["net_h"])}</h2><table class="tbl"><tbody>{rows}</tbody></table><p>{E(fill(t["net_note"], l))}</p>'
            f'<h2>{E(t["hist_h"])}</h2>{table([h + (f' ({CUR[l]})' if i else '') for i, h in enumerate(t['hist_head'])], hist)}<p class="src">{E(t["hist_note"])}</p>'
            f'<h2>{E(t["links_h"])}</h2><ul>{links}</ul>'
            f'<h2>FAQ</h2>{faq_html(t["faq"])}<h2>{E(t["src_h"])}</h2>{src_list(t["src"])}'
            f'{share_box(l, "smig")}</div></section>\n' + related(l, 'smig'))
    art = {'@context': 'https://schema.org', '@type': 'Article', 'headline': t['h1'], 'inLanguage': l, 'dateModified': '2026-11-27',
           'author': {'@type': 'Organization', 'name': 'MITHQAL'}, 'publisher': {'@type': 'Organization', 'name': 'MITHQAL'},
           'mainEntityOfPage': f'https://mithqal.ma/{l}{P["path"]}'}
    i18n = {'numLocale': LOCALE[l], 'currency': CUR[l], 't': {}}
    wr(f'{l}{P["path"]}index.html', build(l, P['path'], fill(t['title'], l), fill(t['desc'], l), main, [art, faq_ld(t['faq'])], ['grow.js'], i18n))


def page_beta(l):
    P = PAGES['beta']; t = P[l]
    steps = ''.join(f'<li><h3>{E(a)}</h3><p>{E(b)}</p></li>' for a, b in t['steps'])
    apps = ''.join(f"<li><a href='/{l}/{k}/'><b>{E(n)}</b> <span>{E(d)}</span></a></li>" for k, (n, d) in t['apps'].items())
    know = ''.join(f'<li>{E(x)}</li>' for x in t['know'])
    btn = (f'<a class="btn" data-beta-mail data-to="{CONTACT}" data-subject="{E(t["mail_subject"])}" data-body="{E(t["mail_body"])}" '
           f'href="mailto:{CONTACT}?subject={E(t["mail_subject"])}" data-track="beta_mail" data-where="beta">{E(t["btn"])}</a>')
    main = (f'<section class="sec hero tight"><div class="wrap" style="display:block"><h1>{E(t["h1"])}</h1><p class="lede">{E(t["lede"])}</p><div class="row" style="margin-top:20px">{btn}</div></div></section>\n'
            f'<section class="sec paper"><div class="wrap prose"><h2>{E(t["steps_h"])}</h2><ol class="steps">{steps}</ol><div class="row">{btn}</div>'
            f'<h2>{E(t["why_h"])}</h2><p>{E(t["why"])}</p><h2>{E(t["know_h"])}</h2><ul>{know}</ul>'
            f'<h2>{E(t["apps_h"])}</h2><ul class="beta-apps">{apps}</ul>'
            f'<div class="callout" style="margin-top:28px"><p>{E(t["web"])}</p><a class="btn" href="/{l}/tools/salary-calculator/">{E(t["webBtn"])}</a></div></div></section>\n')
    i18n = {'numLocale': LOCALE[l], 'currency': CUR[l], 'andOthers': {'fr': ' (et les autres si possible)', 'en': ' (and the others if possible)', 'ar': ' (والباقي إن أمكن)'}[l], 't': {}}
    wr(f'{l}{P["path"]}index.html', build(l, P['path'], t['title'], t['desc'], main, [], ['grow.js'], i18n))


def page_payslip(l):
    P = PAGES['payslip']; t = P[l]; f = t['f']
    def fld(id_, label, ph='', val=''):
        return f'<label class="fld"><span>{E(label)}</span><input id="{id_}" type="text" inputmode="decimal" autocomplete="off" placeholder="{E(ph)}" value="{val}"></label>'
    form = (f'<form class="form card" onsubmit="return false"><fieldset class="pg"><legend>{E(f["base"])}</legend>'
            f'{fld("p-g", f["gross"], "9000")}{dep_select("p-d", f["dep"])}</fieldset>'
            f'<fieldset class="pg"><legend>{E(f["lines"])}</legend>{fld("p-cnss", f["cnss"])}{fld("p-amo", f["amo"])}{fld("p-ir", f["ir"])}{fld("p-net", f["net"])}'
            f'<p class="fine" style="margin:0">{E(f["empty"])}</p></fieldset>'
            f'<details class="extras"><summary>{E(f["opt"])}</summary><div class="form extras-body">{fld("p-cimr", f["cimr"])}{fld("p-mut", f["mut"])}{fld("p-ex", f["exempt"])}</div></details>'
            f'<button type="button" class="btn ghost" data-example>{E(f["example"])}</button></form>')
    read = ''.join(f'<dt>{E(a)}</dt><dd>{E(b)}</dd>' for a, b in t['read'])
    err = ''.join(f'<li>{E(x)}</li>' for x in t['err'])
    main = (f'<section class="sec hero tight"><div class="wrap" style="display:block"><h1>{E(t["h1"])}</h1><p class="lede">{E(t["lede"])}</p></div></section>\n'
            f'<section class="sec tight" style="padding-top:0"><div class="wrap"><div class="calc" id="payslip">{form}'
            f'<div class="res" id="result" aria-live="polite"></div></div>{share_box(l, "payslip")}</div></section>\n'
            f'<section class="sec paper"><div class="wrap prose"><h2>{E(t["h_read"])}</h2><dl class="read">{read}</dl>'
            f'<h2>{E(t["h_err"])}</h2><ul>{err}</ul><h2>FAQ</h2>{faq_html(t["faq"])}<h2>{E(t["src_h"])}</h2>{src_list(t["src"])}</div></section>\n' + related(l, 'payslip'))
    labels = {'cnss': f['cnss'].split(' (')[0], 'amo': f['amo'].split(' (')[0], 'ir': f['ir'].split(' (')[0], 'net': f['net'].split(' (')[0]}
    i18n = {'numLocale': LOCALE[l], 'currency': CUR[l], 't': {'r': t['r'], 'labels': labels}}
    url = f'https://mithqal.ma/{l}{P["path"]}'
    wr(f'{l}{P["path"]}index.html', build(l, P['path'], t['title'], t['desc'], main, [app_ld(t['h1'], url, l), faq_ld(t['faq'])], ENGINE, i18n))


def install_box(l, where):
    w = PWA[l]
    return (f'<div class="install" data-install data-where="{where}" data-done="{E(w["done"])}" hidden><div><b>{E(w["btn"])}</b><p>{E(w["lede"])}</p>'
            f'<p class="fine" data-ios hidden>{E(w["ios"])}</p></div><button type="button" class="btn" data-track="pwa_click" data-where="{where}">{E(w["btn"])}</button></div>')


def manifests():
    for l in LANGS:
        w = PWA[l]
        sc = [{'name': TOOL_TXT[l][k][0], 'url': f'/{l}{p}?source=pwa', 'icons': [{'src': '/assets/img/icon-192.png', 'sizes': '192x192'}]} for k, p, ic in TOOLS if k in ('salary', 'payslip', 'raise', 'y2027')]
        m = {'name': w['name'], 'short_name': w['short'], 'description': w['desc'], 'lang': l, 'dir': 'rtl' if l == 'ar' else 'ltr',
             'start_url': f'/{l}/?source=pwa', 'scope': '/', 'id': f'/{l}/', 'display': 'standalone', 'background_color': '#04191B', 'theme_color': '#04191B',
             'categories': ['finance', 'productivity'],
             'icons': [{'src': '/assets/img/icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': '/assets/img/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                       {'src': '/assets/img/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}],
             'shortcuts': sc}
        wr(f'{l}/manifest.webmanifest', json.dumps(m, ensure_ascii=False, indent=1))


def pwa_head_all():
    for f in glob.glob(os.path.join(ROOT, '*', '**', 'index.html'), recursive=True) + [os.path.join(ROOT, 'salary', 'privacy', 'index.html')]:
        rel = os.path.relpath(f, ROOT); l = rel.split('/')[0]
        if l not in LANGS or not os.path.exists(f):
            continue
        s = open(f, encoding='utf-8').read(); o = s
        s = re.sub(r'<!--mq-pwa-->.*?<!--/mq-pwa-->\n?', '', s, flags=re.S)
        s = s.replace('</head>', f'<!--mq-pwa--><link rel="manifest" href="/{l}/manifest.webmanifest"><link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png"><meta name="mobile-web-app-capable" content="yes"><!--/mq-pwa-->\n</head>', 1)
        if '/assets/pwa.js' not in s:
            s = s.replace('</body>', '<script src="/assets/pwa.js" defer></script>\n</body>', 1)
        # install box: home (under the quick calculator), app pages (after the hero)
        s = re.sub(r'<!--mq-inst-->.*?<!--/mq-inst-->\n?', '', s, flags=re.S)
        if rel == f'{l}/index.html':
            s = s.replace('<!--/mq-qc-->', '<!--/mq-qc-->\n<!--mq-inst-->' + install_box(l, 'home') + '<!--/mq-inst-->', 1)
        elif rel in (f'{l}/salary/index.html', f'{l}/budget/index.html', f'{l}/qnach/index.html', f'{l}/beta/index.html'):
            i = s.find('</section>', s.find('<main'))
            s = s[:i + 10] + f'\n<!--mq-inst--><section class="sec tight inst-sec"><div class="wrap">{install_box(l, rel.split("/")[1])}</div></section><!--/mq-inst-->' + s[i + 10:]
        if s != o:
            open(f, 'w', encoding='utf-8').write(s)


# ------------------------------------------------------------------ patches on existing pages
def footer_col(l):
    items = ''.join(f"<li><a href='/{l}{p}'>{E(TOOL_TXT[l][k][0])}</a></li>" for k, p, ic in TOOLS)
    return f'<!--mq-ftools--><div><h2>{E(UI[l]["footTools"])}</h2><ul>{items}</ul></div><!--/mq-ftools-->'


def patch_all():
    files = [f for f in glob.glob(os.path.join(ROOT, '*', '**', 'index.html'), recursive=True) if '/_tools/' not in f]
    files += [os.path.join(ROOT, 'salary', 'privacy', 'index.html')]
    seen = set()
    for f in files:
        if f in seen or not os.path.exists(f):
            continue
        seen.add(f)
        rel = os.path.relpath(f, ROOT)
        l = rel.split('/')[0]
        if l not in LANGS:
            continue
        s = open(f, encoding='utf-8').read()
        o = s
        # footer calculators column (before the legal column)
        s = re.sub(r'<!--mq-ftools-->.*?<!--/mq-ftools-->', '', s, flags=re.S)
        legal = f'<div><h2>{UI[l]["legal"]}</h2>'
        if legal in s:
            s = s.replace(legal, footer_col(l) + legal, 1)
        # tester buttons -> beta page
        s = re.sub(r'<a class="btn" href="mailto:[^"]*" data-track="tester_click" data-app="(\w+)" data-where="(\w+)">[^<]*</a>',
                   lambda m: f'<a class="btn" href="/{l}/beta/?app={m.group(1)}" data-track="tester_click" data-app="{m.group(1)}" data-where="{m.group(2)}">{E(UI[l]["betaBtn"])}</a>', s)
        # related tools on tool pages, 2027 and the blog article
        key = {f'{l}/tools/salary-calculator/index.html': 'salary', f'{l}/tools/overtime/index.html': 'overtime',
               f'{l}/tools/severance-job-loss/index.html': 'severance', f'{l}/tools/cnss-pension/index.html': 'pension',
               f'{l}/2027/index.html': 'y2027', f'{l}/blog/loi-de-finances-2027-salaire-net/index.html': 'blog'}.get(rel)
        if key:
            s = re.sub(r'<!--mq-related-->.*?<!--/mq-related-->\n?', '', s, flags=re.S)
            s = s.replace('</main>', related(l, key) + '\n</main>', 1)
            # the payslip block needs the engine and grow.js on every page that shows it
            if 'window.MQ_GROW=' not in s:
                g = {'numLocale': LOCALE[l], 'currency': CUR[l], 't': {}}
                s = s.replace('<script src="/assets/search.js" defer></script>', f'<script>window.MQ_GROW={json.dumps(g, ensure_ascii=False)}</script>\n<script src="/assets/search.js" defer></script>', 1)
            if 'engine/payroll.js' not in s:
                eng = ('' if 'engine/rules.js' in s else '<script src="/assets/engine/rules.js" defer></script>') + '<script src="/assets/engine/payroll.js" defer></script>'
                s = s.replace('<script src="/assets/search.js" defer></script>', eng + '\n<script src="/assets/search.js" defer></script>', 1)
            if 'assets/grow.js' not in s:
                s = s.replace('<script src="/assets/search.js" defer></script>', '<script src="/assets/grow.js" defer></script>\n<script src="/assets/search.js" defer></script>', 1)
        if s != o:
            open(f, 'w', encoding='utf-8').write(s)


def patch_calc(l):
    p = f'{l}/tools/salary-calculator/index.html'
    s = rd(p)
    s = re.sub(r'<!--mq-share-->.*?<!--/mq-share-->\n?', '', s, flags=re.S)
    s = s.replace('<div class="callout" style="margin-top:24px">', f'<!--mq-share-->{share_box(l, "calc", f"https://mithqal.ma/{l}/tools/salary-calculator/")}<!--/mq-share-->\n<div class="callout" style="margin-top:24px">', 1)
    # employer-cost line in the result (calc.js reads these keys)
    m = re.search(r'window\.MQ_CALC_I18N=(\{.*?\})</script>', s)
    d = json.loads(m.group(1))
    d['where'] = WHERE[l]
    d['emp'] = {'a': UI[l]['empLine'], 'b': UI[l]['empLine2'], 'more': UI[l]['empMore'], 'href': f'/{l}/tools/employer-cost/'}
    s = s[:m.start(1)] + json.dumps(d, ensure_ascii=False) + s[m.end(1):]
    if 'assets/grow.js' not in s:
        s = s.replace('<script src="../../../assets/calc.js" defer></script>', '<script src="../../../assets/calc.js" defer></script><script src="/assets/grow.js" defer></script>')
    wr(p, s)


def patch_home(l):
    p = f'{l}/index.html'
    s = rd(p)
    u = UI[l]
    n = next(x for x in N['employer'] if x['gross'] == 8000)
    form = (f'<!--mq-qc--><form class="qc" id="qc" onsubmit="return false"><div class="qc-in">'
            f'<label class="fld"><span>{E(u["qcGross"])}</span><input id="qc-g" type="number" inputmode="decimal" min="0" step="100" value="8000"></label>'
            f'{dep_select("qc-d", u["qcDep"])}</div>'
            f'<div class="qc-out" id="qc-out" aria-live="polite"><span class="k">{E(u["qcNet"])}</span><b class="big num">{money(n["net"], l)}</b></div>'
            f'<div class="row"><a class="btn" id="qc-go" data-base="/{l}/tools/salary-calculator/" href="/{l}/tools/salary-calculator/?b=8000&amp;d=0" data-track="cta_calc" data-where="home_quick">{E(u["qcGo"])}</a>'
            f'<a class="btn ghost" href="#apps">{E(u["qcApps"])}</a></div></form><!--/mq-qc-->')
    s = re.sub(r'<!--mq-inst-->.*?<!--/mq-inst-->\n?', '', s, flags=re.S)
    s = re.sub(r'\n?<!--mq-qc-->.*?<!--/mq-qc-->\n?', '', s, flags=re.S)
    s = re.sub(r'<p class="hero-ex">.*?</p>\s*<div class="row" style="margin-top:24px">.*?</div>', '', s, count=1, flags=re.S)
    s = s.replace('</p>\n</div>\n<img class="hero-art"', '</p>\n' + form + '\n</div>\n<img class="hero-art"', 1) if form not in s else s
    if '<!--mq-qc-->' not in s:  # first run: lede is followed directly by the closing div
        s = re.sub(r'(<p class="lede">.*?</p>)\s*(</div>\s*<img class="hero-art")', lambda m: m.group(1) + '\n' + form + '\n' + m.group(2), s, count=1, flags=re.S)
    # the calculators shown as a payslip whose lines update with the visitor's gross; the payslip checker beside it
    k = SLIP[l]
    grid = (f'<!--mq-htools--><section class="sec slip-sec" id="outils"><div class="wrap"><div class="slip-head"><h2>{E(k["h2"])}</h2><p class="lede">{E(k["lede"])}</p></div>'
            f'<div class="slip-grid">{slip_rows(l)}<div class="slip-side">{check_block(l)}{others_list(l, ("overtime", "severance", "pension"), k["other"])}</div></div></div></section><!--/mq-htools-->')
    s = re.sub(r'<!--mq-htools-->.*?<!--/mq-htools-->\n?', '', s, flags=re.S)
    s = re.sub(r'<section class="sec"><div class="wrap"><div class="callout"><h2>.*?</section>', grid, s, count=1, flags=re.S)
    if '<!--mq-htools-->' not in s:
        s = s.replace('<section class="sec paper tight">', grid + '\n<section class="sec paper tight">', 1)
    i18n = {'numLocale': LOCALE[l], 'currency': CUR[l], 't': {k: u[k] for k in ('qcNet', 'qc27', 'qcCost')}}
    s = re.sub(r'<script>window\.MQ_GROW=.*?</script>', '', s)
    if 'assets/grow.js' not in s:
        s = s.replace('<script src="/assets/search.js" defer></script>',
                      f'<script>window.MQ_GROW={json.dumps(i18n, ensure_ascii=False)}</script><script src="/assets/engine/rules.js" defer></script><script src="/assets/engine/payroll.js" defer></script><script src="/assets/grow.js" defer></script>\n<script src="/assets/search.js" defer></script>', 1)
    else:
        s = s.replace('<script src="/assets/engine/rules.js" defer>', f'<script>window.MQ_GROW={json.dumps(i18n, ensure_ascii=False)}</script><script src="/assets/engine/rules.js" defer>', 1)
    wr(p, s)


def patch_tools_index(l):
    p = f'{l}/tools/index.html'
    s = rd(p)
    cards = ''.join(
        f"<a class='card app-card tool-card' href='/{l}{pp}'><span class=\"tool-ico\" aria-hidden=\"true\">{ic}</span>"
        f"<div><h3>{E(TOOL_TXT[l][k][0])}</h3><p>{E(TOOL_TXT[l][k][1])}</p></div></a>" for k, pp, ic in TOOLS)
    s = re.sub(r'<section class="sec paper"><div class="wrap"><div class="grid">.*?</div></div></section>',
               f'<section class="sec paper"><div class="wrap"><div class="grid">{cards}</div></div></section>', s, count=1, flags=re.S)
    wr(p, s)


def patch_sitemap():
    p = 'sitemap.xml'
    s = rd(p)
    for k in ('employer', 'raise', 'smig', 'beta', 'payslip'):
        for l in LANGS:
            u = f'https://mithqal.ma/{l}{PAGES[k]["path"]}'
            if f'<loc>{u}</loc>' not in s:
                alts = ''.join(f'<xhtml:link rel="alternate" hreflang="{x}" href="https://mithqal.ma/{x}{PAGES[k]["path"]}"/>' for x in LANGS) if 'xhtml:link' in s else ''
                s = s.replace('</urlset>', f'<url><loc>{u}</loc>{alts}<lastmod>2026-11-27</lastmod></url>\n</urlset>')
    wr(p, s)


if __name__ == '__main__':
    for l in LANGS:
        page_employer(l); page_raise(l); page_smig(l); page_beta(l); page_payslip(l)
    patch_all()
    for l in LANGS:
        patch_calc(l); patch_home(l); patch_tools_index(l)
    patch_sitemap()
    manifests()
    pwa_head_all()
    print('ok')
