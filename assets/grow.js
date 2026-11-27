/* MITHQAL website — home quick calculator, employer cost, pay rise, share buttons, beta mail link.
   Maths come from engine/payroll.js (window.MQSalary). Employer rates: CNSS 2026 (see /tools/employer-cost/). */
(function () {
  'use strict';
  const G = window.MQ_GROW || {};
  const loc = G.numLocale || 'fr-MA', cur = G.currency || 'DH', T = G.t || {};
  const f2 = new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const f0 = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
  const dh = x => `${f2.format(x)} ${cur}`;
  const pc = x => `${f0.format(x)} %`.replace(' %', loc.startsWith('en') ? '%' : ' %');
  const PLUS = loc.startsWith('ar') ? '\u200E+' : '+', MINUS = loc.startsWith('ar') ? '\u200E−' : '−';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const num = el => { if (!el) return 0; const v = parseFloat(String(el.value).replace(',', '.')); return v > 0 ? v : 0; };
  const track = (n, p) => { try { window.mqTrack && window.mqTrack(n, p || {}); } catch (e) {} };

  // ---- share boxes: WhatsApp, native share, copy (the shared link never carries the visitor's amounts)
  document.querySelectorAll('[data-share]').forEach(box => {
    const url = box.dataset.url || (location.origin + location.pathname);
    const text = box.dataset.text || document.title;
    const wa = box.querySelector('[data-wa]');
    if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url);
    const nat = box.querySelector('[data-native]');
    if (nat && navigator.share) { nat.hidden = false; nat.addEventListener('click', () => { navigator.share({ title: document.title, text, url }).catch(() => {}); track('share_native', { where: box.dataset.where || '' }); }); }
    const cp = box.querySelector('[data-copy]');
    if (cp) cp.addEventListener('click', () => {
      const done = () => { cp.textContent = cp.dataset.done || 'OK'; track('share_copy', { where: box.dataset.where || '' }); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => {}); else done();
    });
  });

  // ---- beta page: put the chosen app in the email
  const mail = document.querySelector('[data-beta-mail]');
  if (mail) {
    const names = { salary: 'MITHQAL Salary', budget: 'MITHQAL Budget', qnach: 'MITHQAL QNACH' };
    const a = new URLSearchParams(location.search).get('app');
    const list = names[a] ? names[a] + (G.andOthers || '') : Object.values(names).join(', ');
    const body = (mail.dataset.body || '').replace('{apps}', list);
    mail.href = `mailto:${mail.dataset.to}?subject=${encodeURIComponent(mail.dataset.subject || '')}&body=${encodeURIComponent(body)}`;
    mail.dataset.app = names[a] ? a : 'all';
  }

  const S = window.MQSalary;
  if (!S) return;
  const r2 = S.round2;
  const EMP = { social: 0.0898, family: 0.064, amo: 0.0411, tfp: 0.016, cap: 6000 };
  const employer = g => {
    const c = Math.min(g, EMP.cap);
    const p = { social: r2(c * EMP.social), family: r2(g * EMP.family), amo: r2(g * EMP.amo), tfp: r2(g * EMP.tfp) };
    p.total = r2(p.social + p.family + p.amo + p.tfp); p.cost = r2(g + p.total); return p;
  };
  const net = (g, d, y) => { const r = S.calculate({ grossMonthly: g, dependants: d || 0, year: y || 2026 }); return r.ok ? r : null; };

  // ---- home quick calculator
  const qc = document.getElementById('qc');
  if (qc) {
    const g = qc.querySelector('#qc-g'), d = qc.querySelector('#qc-d'), out = qc.querySelector('#qc-out'), go = qc.querySelector('#qc-go');
    let used = false;
    const run = () => {
      const gross = num(g), dep = +d.value || 0, r = gross > 0 ? net(gross, dep) : null;
      if (!r) { out.innerHTML = ''; return; }
      const r7 = net(gross, dep, 2027), diff = r7 ? r2(r7.net.monthly - r.net.monthly) : 0, e = employer(gross);
      out.innerHTML = `<span class="k">${esc(T.qcNet)}</span><b class="big num">${dh(r.net.monthly)}</b>` +
        (r7 && diff > 0 ? `<span class="ln">${esc(T.qc27)} <b class="num">${dh(r7.net.monthly)}</b> (${PLUS}${dh(diff)})</span>` : '') +
        `<span class="ln">${esc(T.qcCost)} <b class="num">${dh(e.cost)}</b></span>`;
      go.href = `${go.dataset.base}?b=${gross}&d=${dep}`;
      if (!used) { used = true; track('calc_used', { tool: 'home_quick' }); }
    };
    qc.addEventListener('input', run); qc.addEventListener('change', run); run();
  }

  // ---- employer cost tool
  const er = document.getElementById('emp');
  if (er) {
    const g = er.querySelector('#e-g'), d = er.querySelector('#e-d'), out = er.querySelector('#result'), R = T.res || {};
    const q = new URLSearchParams(location.search);
    if (+q.get('b') > 0) g.value = +q.get('b');
    if (q.get('d') !== null) d.value = Math.min(6, Math.max(0, +q.get('d') | 0));
    let used = false;
    const run = () => {
      const gross = num(g), dep = +d.value || 0, r = gross > 0 ? net(gross, dep) : null;
      if (!r) { out.innerHTML = ''; return; }
      const e = employer(gross), per100 = r2(r.net.monthly / e.cost * 100);
      const row = (l, v, c) => `<tr${c ? ` class="${c}"` : ''}><td>${esc(l)}</td><td class="num">${v}</td></tr>`;
      out.innerHTML = `<div class="k">${esc(R.k)}</div><div class="big num">${dh(e.cost)}</div><div class="muted num">${dh(e.cost * 12)} ${esc(R.perYear)}</div>
        <table><tbody>${row(R.gross, dh(gross))}${row(R.social, PLUS + ' ' + dh(e.social))}${row(R.family, PLUS + ' ' + dh(e.family))}${row(R.amo, PLUS + ' ' + dh(e.amo))}${row(R.tfp, PLUS + ' ' + dh(e.tfp))}${row(R.charges, dh(e.total), 'sub')}${row(R.cost, dh(e.cost), 'tot')}</tbody></table>
        <p class="cmp">${esc(R.per100a)} <b class="num">${f2.format(per100)}</b> ${esc(R.per100b)}</p>
        <p class="cmp">${esc(R.net)} : <b class="num">${dh(r.net.monthly)}</b>. <a href="${esc(T.calcBase)}?b=${gross}&d=${dep}">${esc(R.calc)}</a></p>`;
      try { const u = new URL(location.href); u.searchParams.set('b', gross); u.searchParams.set('d', dep); history.replaceState(null, '', u); } catch (x) {}
      if (!used) { used = true; track('calc_used', { tool: 'employer' }); }
    };
    er.addEventListener('input', run); er.addEventListener('change', run); run();
  }

  // ---- pay rise tool
  const rr = document.getElementById('raise');
  if (rr) {
    const g = rr.querySelector('#r-g'), v = rr.querySelector('#r-v'), d = rr.querySelector('#r-d'), out = rr.querySelector('#result'), R = T.res || {};
    const q = new URLSearchParams(location.search);
    if (+q.get('b') > 0) g.value = +q.get('b');
    if (q.get('m') === 'dh') rr.querySelector('input[name=rmode][value=dh]').checked = true;
    if (+q.get('v') > 0) v.value = +q.get('v');
    let used = false;
    const run = () => {
      const gross = num(g), dep = +d.value || 0, mode = rr.querySelector('input[name=rmode]:checked').value, val = num(v);
      const to = r2(mode === 'pct' ? gross * (1 + val / 100) : gross + val);
      const a = gross > 0 ? net(gross, dep) : null, b = to > 0 ? net(to, dep) : null;
      if (!a || !b || !(val > 0)) { out.innerHTML = ''; return; }
      const gg = r2(to - gross), ng = r2(b.net.monthly - a.net.monthly), kept = gg > 0 ? ng / gg * 100 : 0;
      let ask = '';
      const t = S.grossFromNet(r2(a.net.monthly + 1000), { dependants: dep, year: 2026 });
      if (t && t.ok) ask = `<p class="cmp">${esc(R.ask1)} <b class="num">${f2.format(r2(t.result.gross.monthly - gross))}</b> ${esc(R.ask2)}</p>`;
      const trap = gross <= 6500 && to > 6500 && kept < 75 ? `<p class="warn">${esc(ng <= 0 ? R.neg : R.trap)}</p>` : '';
      const row = (l, x, y) => `<tr><td>${esc(l)}</td><td class="num">${x}</td><td class="num">${y}</td></tr>`;
      out.innerHTML = `<div class="k">${esc(R.k)}</div><div class="big num">${ng >= 0 ? PLUS : ''}${dh(ng)}</div><div class="muted num">${ng >= 0 ? PLUS : ''}${dh(ng * 12)} ${esc(R.perYear)}</div>${trap}
        <table><thead><tr><th></th><th class="num">${esc(R.before)}</th><th class="num">${esc(R.after)}</th></tr></thead><tbody>
        ${row(R.gross, dh(gross), dh(to))}${row(R.net, dh(a.net.monthly), dh(b.net.monthly))}</tbody></table>
        <table><tbody><tr><td>${esc(R.gGain)}</td><td class="num">${PLUS} ${dh(gg)}</td></tr><tr><td>${esc(R.nGain)}</td><td class="num">${ng >= 0 ? PLUS : MINUS} ${dh(Math.abs(ng))}</td></tr><tr class="tot"><td>${esc(R.kept)}</td><td class="num">${pc(Math.max(0, kept))}</td></tr></tbody></table>${ask}`;
      try { const u = new URL(location.href); u.searchParams.set('b', gross); u.searchParams.set('v', val); u.searchParams.set('m', mode); history.replaceState(null, '', u); } catch (x) {}
      if (!used) { used = true; track('calc_used', { tool: 'raise' }); }
    };
    rr.addEventListener('input', run); rr.addEventListener('change', run); run();
  }
  // ---- payslip checker: recompute each deduction with the engine and compare with what the payslip says
  const pc0 = document.getElementById('payslip');
  if (pc0) {
    const R = T.r || {}, L = T.labels || {}, W = R.why || {};
    const $ = id => pc0.querySelector('#' + id), out = pc0.querySelector('#result');
    const opt = el => { if (!el || String(el.value).trim() === '') return null; const v = parseFloat(String(el.value).replace(/\s/g, '').replace(',', '.')); return isFinite(v) && v >= 0 ? v : null; };
    let used = false;
    const run = () => {
      const g = num($('p-g')), dep = +$('p-d').value || 0;
      const cimr = opt($('p-cimr')) || 0, mut = opt($('p-mut')) || 0, ex = opt($('p-ex')) || 0;
      const got = { cnss: opt($('p-cnss')), amo: opt($('p-amo')), ir: opt($('p-ir')), net: opt($('p-net')) };
      if (!(g > 0) || Object.values(got).every(v => v === null)) { out.innerHTML = `<p class="muted">${esc(R.none)}</p>`; return; }
      let r = S.calculate({ grossMonthly: g, dependants: dep, year: 2026, retirementMonthly: Math.min(cimr, g), insuranceRate: mut > 0 ? Math.min(mut / g * 100, 10) : 0 });
      if (!r.ok) r = S.calculate({ grossMonthly: g, dependants: dep, year: 2026 });
      if (!r.ok) { out.innerHTML = ''; return; }
      const d = Object.fromEntries(r.deductions.map(x => [x.key, x.monthly]));
      const exp = { cnss: d.cnss || 0, amo: d.amo || 0, ir: d.incomeTax || 0, net: r2(r.net.monthly + ex) };
      const tol = { cnss: 1, amo: 1, ir: 3, net: 3 };
      const rows = [], bad = [];
      ['cnss', 'amo', 'ir', 'net'].forEach(k => {
        if (got[k] === null) return;
        const diff = r2(got[k] - exp[k]), ok = Math.abs(diff) <= tol[k];
        let why = '';
        if (!ok) {
          why = k === 'cnss' ? (diff > 0 ? W.cnss_hi : W.cnss_lo) : k === 'ir' ? (diff > 0 ? W.ir_hi : W.ir_lo) : k === 'amo' ? W.amo : W.net;
          bad.push(k);
        }
        rows.push(`<li class="${ok ? 'ok' : 'off'}"><div class="pl-h"><span class="pl-s">${ok ? '✓' : '!'} ${esc(ok ? R.ok : R.off)}</span><b>${esc(L[k])}</b></div>
          <div class="pl-n"><span>${esc(R.got)} <b class="num">${dh(got[k])}</b></span><span>${esc(R.exp)} <b class="num">${dh(exp[k])}</b></span>${ok ? '' : `<span>${esc(R.diff)} <b class="num">${diff > 0 ? PLUS : MINUS} ${dh(Math.abs(diff))}</b></span>`}</div>
          ${why ? `<p class="pl-w">${esc(why)}</p>` : ''}</li>`);
      });
      const head = bad.length ? `<p class="pl-v off">! ${bad.length} ${esc(R.some)}</p>` : `<p class="pl-v ok">✓ ${esc(R.allOk)}</p>`;
      out.innerHTML = `${head}<ul class="pl">${rows.join('')}</ul><p class="src">${esc(R.tol)}</p><button type="button" class="btn ghost pl-print" onclick="window.print()">${esc(R.print)}</button>`;
      if (!used) { used = true; track('calc_used', { tool: 'payslip', issues: bad.length }); }
    };
    const ex = pc0.querySelector('[data-example]');
    if (ex) ex.addEventListener('click', () => {
      // a typical mistake: one dependant not taken into account by the employer
      const g = 9000, r = S.calculate({ grossMonthly: g, dependants: 1, year: 2026 }), d = Object.fromEntries(r.deductions.map(x => [x.key, x.monthly]));
      $('p-g').value = g; $('p-d').value = 1; $('p-cnss').value = d.cnss; $('p-amo').value = d.amo;
      $('p-ir').value = r2(d.incomeTax + 50); $('p-net').value = r2(r.net.monthly - 50);
      ['p-cimr', 'p-mut', 'p-ex'].forEach(id => { $(id).value = ''; });
      run(); out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    pc0.addEventListener('input', run); pc0.addEventListener('change', run); run();
  }
  // ---- home payslip: every line recomputed for the visitor's gross, links carry it to the full tool
  const sl = document.getElementById('slip');
  if (sl) {
    const gIn = sl.querySelector('#sl-g'), q = document.getElementById('qc-g');
    const base = {};
    sl.querySelectorAll('[data-bl]').forEach(a => { base[a.dataset.bl] = a.getAttribute('href').split('?')[0]; });
    const set = (key, v, qs) => { const a = sl.querySelector(`[data-bl="${key}"]`); if (!a) return; a.querySelector('.sl-v').textContent = v; a.href = base[key] + qs; };
    const run = () => {
      const g = num(gIn); if (!(g > 0)) return;
      const r = net(g, 0), r7 = net(g, 0, 2027), up = net(r2(g * 1.1), 0);
      if (!r) return;
      sl.classList.remove('sl-pulse'); void sl.offsetWidth; sl.classList.add('sl-pulse');
      set('net', dh(r.net.monthly), `?b=${g}&d=0`);
      if (r7) set('y2027', dh(r7.net.monthly), `?b=${g}&d=0`);
      set('employer', dh(employer(g).cost), `?b=${g}&d=0`);
      if (up) set('raise', `${PLUS}${dh(r2(up.net.monthly - r.net.monthly))}`, `?b=${g}&v=10&m=pct`);
    };
    gIn.addEventListener('input', () => { run(); if (q && q.value !== gIn.value) { q.value = gIn.value; q.dispatchEvent(new Event('input', { bubbles: true })); } });
    if (q) q.addEventListener('input', () => { if (gIn.value !== q.value) { gIn.value = q.value; run(); } });
    // on tool pages: follow the gross typed in the page's own calculator (one way), or the ?b= of a shared link
    const follow = id => { const el = document.getElementById(id); if (!el) return;
      const take = () => { const m = document.querySelector('input[name=mode]:checked'); if (m && m.value === 'net') return; const v = num(el); if (v > 0 && String(v) !== gIn.value) { gIn.value = v; run(); } };
      el.addEventListener('input', take); document.addEventListener('change', take); setTimeout(take, 0); };
    ['amount', 'e-g', 'r-g', 'gross', 'p-g', 'y-amount', 'salary'].forEach(follow);
    const qb = +new URLSearchParams(location.search).get('b');
    if (qb > 0 && !q) { gIn.value = qb; run(); }
  }
})();
