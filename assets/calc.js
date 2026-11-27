/* MITHQAL website — salary calculator UI. All maths come from engine/payroll.js (window.MQSalary), the same
   file the MITHQAL Salary app ships. This file only reads inputs, calls the engine and renders. */
(function () {
  'use strict';
  const S = window.MQSalary, L = window.MQ_CALC_I18N, root = document.getElementById('calc');
  if (!S || !L || !root) return;
  const $ = s => root.querySelector(s);
  const fmt = new Intl.NumberFormat(L.numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = new Intl.NumberFormat(L.numLocale, { style: 'percent', maximumFractionDigits: 1 });
  const dh = x => `${fmt.format(x)} ${L.currency}`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // restore from URL (?b=8000&d=2&y=2027&m=net) so results are shareable and campaign links can pre-fill
  const q = new URLSearchParams(location.search);
  if (q.get('m') === 'net') $('input[name=mode][value=net]').checked = true;
  if (+q.get('b') > 0) $('#amount').value = +q.get('b');
  if (q.get('d') !== null && +q.get('d') >= 0) $('#dependants').value = Math.min(6, +q.get('d') | 0);
  if (q.get('y') === '2027') $('#year').value = '2027';

  let tracked = false;
  function run() {
    const mode = $('input[name=mode]:checked').value;
    const amount = parseFloat(String($('#amount').value).replace(',', '.'));
    const dependants = +$('#dependants').value || 0;
    const year = +$('#year').value;
    $('#amount-label').textContent = mode === 'net' ? L.amountNet : L.amountGross;
    const out = $('#result');
    if (!(amount > 0)) { out.innerHTML = ''; return; }

    let r, note = '';
    if (mode === 'net') {
      const g = S.grossFromNet(amount, { dependants, year });
      if (!g.ok) { out.innerHTML = ''; return; }
      r = g.result;
      if (!g.exact) note = `<p class="warn">${esc(L.inexact)} <b class="num">${dh(r.net.monthly)}</b></p>`;
    } else {
      r = S.calculate({ grossMonthly: amount, dependants, year });
      if (!r.ok) { out.innerHTML = ''; return; }
    }
    const d = Object.fromEntries(r.deductions.map(x => [x.key, x.monthly]));
    const g = r.gross.monthly, w = x => (g > 0 ? Math.max(0, x / g * 100) : 0).toFixed(2) + '%';

    // compare with the other year (2026 ↔ 2027) — the most asked question this season
    let cmp = '';
    const other = year === 2026 ? 2027 : 2026;
    if (S.SUPPORTED_YEARS.includes(other) && year === 2026) {
      const o = S.calculate({ grossMonthly: g, dependants, year: other });
      if (o.ok) {
        const diff = S.round2(o.net.monthly - r.net.monthly);
        const word = diff > 0 ? `+${dh(diff)} ${L.diffMore}` : diff < 0 ? `${dh(diff)} ${L.diffLess}` : L.diffSame;
        cmp = `<p class="cmp">${esc(L.vs2027)} <b class="num">${dh(o.net.monthly)}</b> (${esc(word)}).</p>`;
      }
    }

    const headline = mode === 'net'
      ? `<div class="k">${esc(L.gross)}</div><div class="big num">${dh(g)}</div><div class="muted num">${esc(L.net)} : ${dh(r.net.monthly)}</div>`
      : `<div class="k">${esc(L.net)}</div><div class="big num">${dh(r.net.monthly)}</div><div class="muted num">${dh(r.net.annual)} ${esc(L.perYear)}</div>`;

    out.innerHTML = `
      ${r.isEstimate ? `<p class="warn">${esc(L.draftBanner)}</p>` : ''}
      ${headline}
      ${note}
      <div class="bar" aria-hidden="true"><i class="c-net" style="width:${w(r.net.monthly)}"></i><i class="c-cnss" style="width:${w(d.cnss)}"></i><i class="c-amo" style="width:${w(d.amo)}"></i><i class="c-ir" style="width:${w(d.incomeTax)}"></i></div>
      <div class="legend"><span><i class="c-net"></i>${esc(L.net)}</span><span><i class="c-cnss"></i>CNSS</span><span><i class="c-amo"></i>AMO</span><span><i class="c-ir"></i>IR</span></div>
      <table><tbody>
        <tr><td>${esc(L.gross)}</td><td class="num">${dh(g)}</td></tr>
        <tr><td>${esc(L.lines.cnss)}</td><td class="num">− ${dh(d.cnss)}</td></tr>
        <tr><td>${esc(L.lines.amo)}</td><td class="num">− ${dh(d.amo)}</td></tr>
        <tr><td>${esc(L.lines.incomeTax)}</td><td class="num">− ${dh(d.incomeTax)}</td></tr>
        <tr class="tot"><td>${esc(L.net)}</td><td class="num">${dh(r.net.monthly)}</td></tr>
      </tbody></table>
      ${cmp}
      <details><summary>${esc(L.breakdown)}</summary><table><tbody>
        <tr><td>${esc(L.lines.fp)}</td><td class="num">${dh(r.tax.professionalExpensesAnnual)} (${pct.format(r.tax.professionalExpensesRate)})</td></tr>
        <tr><td>${esc(L.lines.taxable)}</td><td class="num">${dh(r.tax.netTaxableIncomeAnnual)}</td></tr>
        <tr><td>${esc(L.lines.family)}</td><td class="num">${dh(r.tax.familyReductionAnnual)}</td></tr>
        <tr><td>${esc(L.lines.marginal)}</td><td class="num">${pct.format(r.tax.marginalRate)}</td></tr>
        <tr><td>${esc(L.lines.effective)}</td><td class="num">${pct.format(r.totals.effectiveMandatoryRate)}</td></tr>
      </tbody></table>
      <p class="src">${esc(L.verified)} ${esc(r.rules.verifiedOn)} · ${esc(r.rules.id)}</p></details>`;

    if (!tracked) { tracked = true; window.mqTrack && window.mqTrack('calc_used', { tool: 'salary', mode, year }); }
    try { // shareable URL; some embedded viewers forbid history changes
      const u = new URL(location.href);
      u.searchParams.set('b', amount); u.searchParams.set('d', dependants); u.searchParams.set('y', year);
      mode === 'net' ? u.searchParams.set('m', 'net') : u.searchParams.delete('m');
      history.replaceState(null, '', u);
    } catch (e) { /* keep calculating */ }
  }
  root.addEventListener('input', run);
  root.addEventListener('change', run);
  run();
})();
