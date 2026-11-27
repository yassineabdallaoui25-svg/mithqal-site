/* MITHQAL website — installable web app: registers the service worker and drives the "Install" buttons. */
(function () {
  'use strict';
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }
  const boxes = [...document.querySelectorAll('[data-install]')];
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) { document.documentElement.classList.add('is-app'); return; }
  let deferred = null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  const show = () => boxes.forEach(b => { b.hidden = false; });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; show(); });
  if (ios) boxes.forEach(b => { b.hidden = false; const t = b.querySelector('[data-ios]'); if (t) t.hidden = false; const btn = b.querySelector('button'); if (btn) btn.hidden = true; });
  boxes.forEach(b => {
    const btn = b.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      const c = await deferred.userChoice.catch(() => ({}));
      window.mqTrack && window.mqTrack('pwa_install', { outcome: c && c.outcome || '', where: b.dataset.where || '' });
      deferred = null;
      if (c && c.outcome === 'accepted') boxes.forEach(x => { x.innerHTML = `<p>${x.dataset.done || ''}</p>`; });
    });
  });
  window.addEventListener('appinstalled', () => { window.mqTrack && window.mqTrack('pwa_installed', {}); });
})();
