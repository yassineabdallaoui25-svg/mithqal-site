#!/usr/bin/env python3
"""Build the site search indexes: assets/search-fr.json, search-en.json, search-ar.json.
Run from the site root after any content change:  python3 _tools/build_search.py"""
import glob, html, json, re

def text(s):
    s = re.sub(r'<(script|style|noscript)[^>]*>.*?</\1>', ' ', s, flags=re.S)
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()

for L in ('fr', 'en', 'ar'):
    pages = []
    for f in sorted(glob.glob(f'{L}/**/index.html', recursive=True)):
        s = open(f, encoding='utf-8').read()
        url = '/' + f[:-len('index.html')]
        title = text(re.search(r'<title>(.*?)</title>', s, re.S).group(1))
        title = re.sub(r'\s*\|\s*MITHQAL\s*$', '', title)
        m = re.search(r'<meta name="description" content="([^"]*)"', s)
        desc = html.unescape(m.group(1)) if m else ''
        main = s[s.find('<main'):s.find('</main>')] if '<main' in s else s
        h1 = text((re.search(r'<h1[^>]*>(.*?)</h1>', main, re.S) or re.search(r'()', '')).group(1))
        heads = ' '.join(text(x) for x in re.findall(r'<(?:h2|h3|summary)[^>]*>(.*?)</(?:h2|h3|summary)>', main, re.S))
        body = text(main)[:4000]
        pages.append({'u': url, 't': h1 or title, 'd': desc, 'h': heads, 'b': body})
    json.dump(pages, open(f'assets/search-{L}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(L, len(pages), 'pages')
