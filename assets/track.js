/* MITHQAL website — event hook. Cookieless; sends nothing unless an analytics provider is configured.
   Usage: <a data-track="play_click" data-app="salary">… or window.mqTrack('calc_used', {...}).
   Debug: add ?mqdebug=1 to any URL to log events to the console. */
(function () {
  'use strict';
  const debug = /[?&]mqdebug=1/.test(location.search);
  // keep the campaign that brought the visitor (first touch, this tab only) so outbound links can carry it on
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('utm_source') && !sessionStorage.getItem('mq-utm')) {
      sessionStorage.setItem('mq-utm', JSON.stringify({ s: q.get('utm_source'), m: q.get('utm_medium') || '', c: q.get('utm_campaign') || '', t: q.get('utm_content') || '' }));
    }
  } catch (e) { /* storage blocked: tracking simply degrades */ }

  window.mqTrack = function (name, props) {
    props = Object.assign({ page: location.pathname, lang: document.documentElement.lang }, props || {});
    try { const u = JSON.parse(sessionStorage.getItem('mq-utm') || 'null'); if (u) props.utm = u.s + '/' + u.c; } catch (e) {}
    if (debug) console.log('[mqTrack]', name, props);
    if (window.umami && typeof window.umami.track === 'function') window.umami.track(name, props);
  };

  document.addEventListener('click', function (e) {
    const a = e.target.closest('[data-track]');
    if (!a) return;
    // carry the visitor's campaign into the Play install referrer
    if (a.dataset.track === 'play_click' && a.href.includes('play.google.com/store')) {
      try {
        const u = JSON.parse(sessionStorage.getItem('mq-utm') || 'null');
        if (u) {
          const url = new URL(a.href);
          const ref = new URLSearchParams({ utm_source: u.s, utm_medium: u.m || 'social', utm_campaign: u.c || 'site', utm_content: u.t || a.dataset.where || '' });
          url.searchParams.set('referrer', ref.toString());
          a.href = url.toString();
        }
      } catch (err) {}
    }
    window.mqTrack(a.dataset.track, { app: a.dataset.app || '', where: a.dataset.where || '' });
  });
})();
