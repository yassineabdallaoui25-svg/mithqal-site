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
  const day = iso => { try { return new Intl.DateTimeFormat(L.numLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z')); } catch (e) { return iso; } };
  const num = sel => { const el = $(sel); if (!el) return 0; const v = parseFloat(String(el.value).replace(',', '.')); return v > 0 ? v : 0; };
  const L2 = L.lines2 || {}, LA = L.allow || {};

  // restore from URL (?b=8000&d=2&y=2027&m=net&pr=500&pa=900&j=26&tr=500&tz=outside&re=0) so results are shareable
  const q = new URLSearchParams(location.search);
  if (q.get('m') === 'net') $('input[name=mode][value=net]').checked = true;
  if (+q.get('b') > 0) $('#amount').value = +q.get('b');
  if (q.get('d') !== null && +q.get('d') >= 0) $('#dependants').value = Math.min(6, +q.get('d') | 0);
  if (q.get('y') === '2027') $('#year').value = '2027';
  const URLX = { pr: '#x-bonus', pa: '#x-panier', j: '#x-days', tr: '#x-transport', re: '#x-repr' };
  let hasExtras = false;
  Object.entries(URLX).forEach(([k, sel]) => { if ($(sel) && q.get(k) !== null && +q.get(k) >= 0) { $(sel).value = +q.get(k); if (k !== 'j' && +q.get(k) > 0) hasExtras = true; } });
  if ($('#x-zone') && q.get('tz') === 'outside') $('#x-zone').value = 'outside';
  if (hasExtras && $('details.extras')) $('details.extras').open = true;

  let tracked = false;
  function run() {
    const mode = $('input[name=mode]:checked').value;
    const amount = parseFloat(String($('#amount').value).replace(',', '.'));
    const dependants = +$('#dependants').value || 0;
    const year = +$('#year').value;
    const daysRaw = $('#x-days') ? parseInt($('#x-days').value, 10) : NaN;
    const extras = {
      taxableAllowancesMonthly: num('#x-bonus'),
      panierMonthly: num('#x-panier'),
      workedDays: Number.isInteger(daysRaw) && daysRaw >= 0 && daysRaw <= 31 ? daysRaw : null,
      transportMonthly: num('#x-transport'),
      transportZone: $('#x-zone') ? $('#x-zone').value : 'urban',
      representationMonthly: num('#x-repr')
    };
    const anyExtra = extras.taxableAllowancesMonthly + extras.panierMonthly + extras.transportMonthly + extras.representationMonthly > 0;
    $('#amount-label').textContent = mode === 'net' ? L.amountNet : L.amountGross;
    const out = $('#result');
    if (!(amount > 0)) { out.innerHTML = ''; return; }

    const common = Object.assign({ dependants, year }, extras);
    let r, note = '';
    if (mode === 'net') {
      const g = S.grossFromNet(amount, common);
      if (!g.ok) { out.innerHTML = ''; return; }
      r = g.result;
      if (!g.exact) note = `<p class="warn">${esc(L.inexact)} <b class="num">${dh(r.net.monthly)}</b></p>`;
    } else {
      r = S.calculate(Object.assign({ grossMonthly: amount }, common));
      if (!r.ok) { out.innerHTML = ''; return; }
    }
    const d = Object.fromEntries(r.deductions.map(x => [x.key, x.monthly]));
    const g = r.gross.monthly, base = r.components ? r.components.baseMonthly : g;
    const exempt = r.allowances ? r.allowances.exemptMonthly : 0;
    const whole = g + exempt, w = x => (whole > 0 ? Math.max(0, x / whole * 100) : 0).toFixed(2) + '%';

    // compare with the other year (2026 ↔ 2027) — the most asked question this season
    let cmp = '';
    if (year === 2026 && S.SUPPORTED_YEARS.includes(2027)) {
      const o = S.calculate(Object.assign({}, common, { grossMonthly: base, year: 2027 }));
      if (o.ok) {
        const diff = S.round2(o.net.monthly - r.net.monthly);
        const word = diff > 0 ? `+${dh(diff)} ${L.diffMore}` : diff < 0 ? `${dh(diff)} ${L.diffLess}` : L.diffSame;
        cmp = `<p class="cmp">${esc(L.vs2027)} <b class="num">${dh(o.net.monthly)}</b> (${esc(word)}).</p>`;
      }
    }

    const netLabel = anyExtra ? (L2.netPay || L.net) : L.net;
    const headline = mode === 'net'
      ? `<div class="k">${esc(anyExtra ? (L.baseNeeded || L.gross) : L.gross)}</div><div class="big num">${dh(base)}</div><div class="muted num">${esc(netLabel)} : ${dh(r.net.monthly)}</div>`
      : `<div class="k">${esc(netLabel)}</div><div class="big num">${dh(r.net.monthly)}</div><div class="muted num">${dh(r.net.annual)} ${esc(L.perYear)}</div>`;

    // payslip-style lines
    const row = (label, value, cls) => `<tr${cls ? ` class="${cls}"` : ''}><td>${esc(label)}</td><td class="num">${value}</td></tr>`;
    let top = '';
    if (anyExtra) {
      top += row(L2.base, dh(base));
      if (r.components.taxableBonusesMonthly) top += row(L2.bonuses, dh(r.components.taxableBonusesMonthly));
      if (r.components.allowanceExcessMonthly) top += row(L2.excess, dh(r.components.allowanceExcessMonthly));
      top += row(L2.taxableGross, dh(g), 'sub');
    } else top += row(L.gross, dh(g));
    const bottom = (exempt ? row(L2.exempt, `+ ${dh(exempt)}`) : '') + row(netLabel, dh(r.net.monthly), 'tot');

    let allow = '';
    if (r.allowances && r.allowances.items.length) {
      const capText = it => it.key === 'panier' ? `${LA.cap} ${dh(it.cap)}, ${r.allowances.workedDays} ${LA.days}`
                         : it.key === 'representation' ? `${LA.cap} ${dh(it.cap)}, 10 % ${LA.base}` : `${LA.cap} ${dh(it.cap)}`;
      allow = `<h3 class="rh">${esc(L.allowTitle)}</h3><ul class="checks">` + r.allowances.items.map(it =>
        `<li class="${it.excess > 0 ? 'no' : 'ok'}">${esc(LA[it.key] || it.key)} : <span class="num">${dh(it.amount)}</span>, ${esc(LA.of)} <span class="num">${dh(it.exempt)}</span> ${esc(LA.exempt)} <small>(${esc(capText(it))})</small></li>`).join('') + '</ul>';
    }

    out.innerHTML = `
      ${r.isEstimate ? `<p class="warn">${esc(L.draftBanner)}</p>` : ''}
      ${headline}
      ${note}
      <div class="bar" aria-hidden="true"><i class="c-net" style="width:${w(r.net.monthly)}"></i><i class="c-cnss" style="width:${w(d.cnss)}"></i><i class="c-amo" style="width:${w(d.amo)}"></i><i class="c-ir" style="width:${w(d.incomeTax)}"></i></div>
      <div class="legend"><span><i class="c-net"></i>${esc(netLabel)}</span><span><i class="c-cnss"></i>CNSS</span><span><i class="c-amo"></i>AMO</span><span><i class="c-ir"></i>IR</span></div>
      <table><tbody>
        ${top}
        <tr><td>${esc(L.lines.cnss)}</td><td class="num">− ${dh(d.cnss)}</td></tr>
        <tr><td>${esc(L.lines.amo)}</td><td class="num">− ${dh(d.amo)}</td></tr>
        <tr><td>${esc(L.lines.incomeTax)}</td><td class="num">− ${dh(d.incomeTax)}</td></tr>
        ${bottom}
      </tbody></table>
      ${allow}
      ${cmp}
      <details><summary>${esc(L.breakdown)}</summary><table><tbody>
        <tr><td>${esc(L.lines.fp)}</td><td class="num">${dh(r.tax.professionalExpensesAnnual)} (${pct.format(r.tax.professionalExpensesRate)})</td></tr>
        <tr><td>${esc(L.lines.taxable)}</td><td class="num">${dh(r.tax.netTaxableIncomeAnnual)}</td></tr>
        <tr><td>${esc(L.lines.family)}</td><td class="num">${dh(r.tax.familyReductionAnnual)}</td></tr>
        <tr><td>${esc(L.lines.marginal)}</td><td class="num">${pct.format(r.tax.marginalRate)}</td></tr>
        <tr><td>${esc(L.lines.effective)}</td><td class="num">${pct.format(r.totals.effectiveMandatoryRate)}</td></tr>
      </tbody></table>
      <p class="src">${esc(L.verified)} ${esc(day(r.rules.verifiedOn))}.</p></details>`;

    if (!tracked) { tracked = true; window.mqTrack && window.mqTrack('calc_used', { tool: 'salary', mode, year }); }
    try { // shareable URL; some embedded viewers forbid history changes
      const u = new URL(location.href);
      u.searchParams.set('b', amount); u.searchParams.set('d', dependants); u.searchParams.set('y', year);
      mode === 'net' ? u.searchParams.set('m', 'net') : u.searchParams.delete('m');
      const xv = { pr: extras.taxableAllowancesMonthly, pa: extras.panierMonthly, tr: extras.transportMonthly, re: extras.representationMonthly };
      Object.entries(xv).forEach(([k, v]) => v > 0 ? u.searchParams.set(k, v) : u.searchParams.delete(k));
      if (anyExtra) { u.searchParams.set('j', extras.workedDays == null ? 26 : extras.workedDays); extras.transportZone === 'outside' ? u.searchParams.set('tz', 'outside') : u.searchParams.delete('tz'); }
      else { u.searchParams.delete('j'); u.searchParams.delete('tz'); }
      history.replaceState(null, '', u);
    } catch (e) { /* keep calculating */ }
  }
  root.addEventListener('input', run);
  root.addEventListener('change', run);
  run();
})();
