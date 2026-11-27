/* MITHQAL website — site search. Runs entirely in the browser on a small per-language index
   (assets/search-<lang>.json, built by _tools/build_search.py). Queries are never sent anywhere. */
(function () {
  'use strict';
  const hd = document.querySelector('.hd .wrap');
  if (!hd) return;
  const lang = (document.documentElement.lang || 'fr').slice(0, 2);
  const T = {
    fr: { open: 'Rechercher', ph: 'Rechercher un outil, une règle, un article…', close: 'Fermer', none: 'Aucun résultat pour', tryw: 'Essaie « salaire net », « panier » ou « retraite ».', count: n => `${n} résultat${n > 1 ? 's' : ''}` },
    en: { open: 'Search', ph: 'Search tools, rules, articles…', close: 'Close', none: 'No results for', tryw: 'Try “net salary”, “meal allowance” or “pension”.', count: n => `${n} result${n > 1 ? 's' : ''}` },
    ar: { open: 'بحث', ph: 'ابحث عن أداة أو قاعدة أو مقال…', close: 'إغلاق', none: 'لا نتائج لـ', tryw: 'جرّب «الراتب الصافي» أو «منحة السلة» أو «التقاعد».', count: n => `${n} نتيجة` }
  }[lang] || null;
  if (!T) return;

  // fold accents, case and Arabic spelling variants so "prime panier" finds "Prime de panier"
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[’'`]/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const STOP = new Set(['de', 'la', 'le', 'les', 'du', 'des', 'un', 'une', 'et', 'en', 'a', 'au', 'aux', 'mon', 'ma', 'mes', 'the', 'of', 'and', 'my', 'for', 'to', 'in', 'في', 'من', 'على']);

  // --- UI ---
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'srch-btn'; btn.setAttribute('aria-label', T.open); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const langs = hd.querySelector('.langs');
  hd.insertBefore(btn, langs);

  const panel = document.createElement('div');
  panel.className = 'srch'; panel.hidden = true;
  panel.innerHTML = `<div class="wrap"><div class="srch-box"><input type="search" id="srch-q" autocomplete="off" spellcheck="false" placeholder="${T.ph}" aria-label="${T.open}" aria-controls="srch-r" aria-autocomplete="list"><button type="button" class="srch-x" aria-label="${T.close}">×</button></div><p class="srch-n" aria-live="polite"></p><ol id="srch-r" class="srch-r" role="listbox"></ol></div>`;
  hd.parentNode.insertBefore(panel, hd.nextSibling);
  const q = panel.querySelector('input'), list = panel.querySelector('ol'), count = panel.querySelector('.srch-n');

  let index = null, loading = null, sel = -1, items = [];
  function load() {
    if (index || loading) return loading;
    loading = fetch(`/assets/search-${lang}.json`).then(r => r.json()).then(d => {
      index = d.map(p => Object.assign(p, { nt: norm(p.t), nd: norm(p.d), nh: norm(p.h), nb: norm(p.b) }));
      run();
    }).catch(() => { loading = null; });
    return loading;
  }

  function score(p, words) {
    let s = 0;
    for (const w of words) {
      let ws = 0;
      if (p.nt.includes(w)) ws += 10;
      if (p.nd.includes(w)) ws += 4;
      if (p.nh.includes(w)) ws += 3;
      if (p.nb.includes(w)) ws += 1;
      if (!ws) return 0; // every word must appear somewhere on the page
      s += ws;
    }
    return s;
  }
  // the page description is the clearest one-line summary in every language
  const snippet = p => p.d;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function run() {
    const raw = q.value.trim();
    sel = -1;
    if (!raw || !index) { list.innerHTML = ''; count.textContent = ''; items = []; return; }
    const words = norm(raw).split(' ').filter(w => w && !STOP.has(w));
    if (!words.length) { list.innerHTML = ''; count.textContent = ''; return; }
    items = index.map(p => ({ p, s: score(p, words) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8);
    if (!items.length) { list.innerHTML = ''; count.textContent = `${T.none} « ${raw} ». ${T.tryw}`; return; }
    count.textContent = T.count(items.length);
    list.innerHTML = items.map((x, i) => `<li role="option" id="srch-o${i}"><a href="${x.p.u}"><span class="srch-t">${esc(x.p.t)}</span><span class="srch-s">${esc(snippet(x.p))}</span></a></li>`).join('');
  }
  function move(d) {
    const opts = list.querySelectorAll('li');
    if (!opts.length) return;
    sel = (sel + d + opts.length) % opts.length;
    opts.forEach((o, i) => o.classList.toggle('on', i === sel));
    q.setAttribute('aria-activedescendant', 'srch-o' + sel);
    opts[sel].scrollIntoView({ block: 'nearest' });
  }

  function open() {
    panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); load(); q.focus();
    window.mqTrack && window.mqTrack('search_open');
  }
  function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
  btn.addEventListener('click', () => panel.hidden ? open() : close());
  panel.querySelector('.srch-x').addEventListener('click', close);
  q.addEventListener('input', run);
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { const a = list.querySelectorAll('li a')[Math.max(sel, 0)]; if (a) { e.preventDefault(); location.href = a.href; } }
    else if (e.key === 'Escape') close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && panel.hidden && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
  });
  document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) close(); });
})();
