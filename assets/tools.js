/* MITHQAL website — CNSS pension, severance/IPE and overtime tools.
   All maths come from the app's engines (engine/retire.js, jobloss.js, work.js, payroll.js). This file reads inputs and renders. */
(function () {
  'use strict';
  const L = window.MQ_TOOL_I18N, root = document.getElementById('tool');
  if (!L || !root) return;
  const kind = root.dataset.tool;
  const $ = s => root.querySelector(s);
  const num = id => { const el = $('#' + id); return el ? parseFloat(String(el.value).replace(',', '.')) : NaN; };
  const fmt = new Intl.NumberFormat(L.numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const int = new Intl.NumberFormat(L.numLocale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(L.numLocale, { style: 'percent', maximumFractionDigits: 2 });
  const money = x => `${fmt.format(x)} ${L.c.currency}`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const row = (a, b, cls) => `<tr${cls ? ` class="${cls}"` : ''}><td>${esc(a)}</td><td class="num">${b}</td></tr>`;
  const out = $('#result');
  let tracked = false;
  const track = () => { if (!tracked) { tracked = true; window.mqTrack && window.mqTrack('calc_used', { tool: kind }); } };

  // pre-fill from the URL, so campaign links can open a worked example
  try { new URLSearchParams(location.search).forEach((v, k) => { const el = $('#' + k); if (el && v !== '') el.value = v; }); } catch (e) {}

  function pension() {
    const R = window.MQRetire, t = L.t;
    const avg = num('avg'), years = num('years');
    if (!(avg >= 0) || !(years >= 0)) { out.innerHTML = ''; return; }
    const days = R.daysFromYears(years);
    const r = R.calculate({ avgMonthlyGross: avg, days });
    if (!r.ok) { out.innerHTML = ''; return; }
    let next = '';
    if (r.next) {
      const p = r.next.pension != null ? money(r.next.pension) + ' ' + L.c.perMonth : '';
      next = r.next.kind === 'eligible' ? t.nextEligible(int.format(r.next.days), p) : r.next.kind === 'full' ? t.nextFull(int.format(r.next.days), p) : t.nextStep(int.format(r.next.days), money(r.next.gain));
    } else if (r.eligible) next = t.maxed;
    out.innerHTML = r.refund
      ? `<div class="k">${esc(t.pension)}</div><div class="big num">${money(0)}</div><p class="warn">${esc(t.refund)}</p><p class="cmp">${esc(next)}</p>`
      : `<div class="k">${esc(t.pension)}</div><div class="big num">${money(r.pension)}</div><div class="muted num">${money(r.annual)} ${esc(L.c.perYear)}</div>
        <table><tbody>
        ${row(t.daysLbl, int.format(r.input.days))}
        ${row(t.ref, money(r.referenceSalary) + (r.capped ? ` <small>(${esc(t.capped)})</small>` : ''))}
        ${row(t.rate, pct.format(r.rate))}
        ${row(t.formula, money(r.formula))}
        ${row(t.minimum, money(r.minimum))}
        </tbody></table>
        ${r.minimumApplied ? `<p class="warn">${esc(t.minApplied)}</p>` : ''}
        <p class="cmp">${esc(next)}</p>`;
    track();
  }

  function jobloss() {
    const J = window.MQJobLoss, t = L.t;
    const salary = num('salary'), years = num('seniority'), m36 = num('m36'), m12 = num('m12'), reason = $('#reason').value;
    if (!(salary >= 0) || !(years >= 0) || !(m36 >= 0) || !(m12 >= 0)) { out.innerHTML = ''; return; }
    const r = J.calculate({ reason, avgMonthlyGross36: salary, lastMonthlyGross: salary, days36: Math.round(m36 * 26), days12: Math.round(m12 * 26), seniorityYears: years });
    if (!r.ok) { out.innerHTML = `<p class="warn">${esc(L.invalid)}</p>`; return; }
    const s = r.severance, i = r.ipe;
    const sevBody = s.eligible
      ? `<table><tbody>${s.parts.map(p => row(`${t.yearsRange(p.fromYear, p.toYear)} · ${t.perYearH(p.hoursPerYear)}`, `${int.format(p.hours)} ${L.c.hours}`)).join('')}
         ${row(t.hoursTotal, `${int.format(s.hours)} ${L.c.hours}`)}${row(t.hourly, money(s.hourly))}${row(t.sev, money(s.amount), 'tot')}</tbody></table>`
      : `<p class="cmp"><b>${esc(t.notDue)}</b> · ${esc(!s.reasonOk ? t.sevWhy.reason : t.sevWhy.seniority)}</p>`;
    const ipeChecks = `<ul class="checks">${i.checks.map(c => `<li class="${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '✗'} ${esc(t.checks[c.key])}</li>`).join('')}</ul>`;
    const ipeBody = i.eligible
      ? `<table><tbody>${row(t.ipeMonthly, money(i.monthly) + (i.capped ? ` <small>(${esc(t.capSmig)})</small>` : ''))}${row(t.ipeMonths, `${i.months} ${esc(L.c.months)}`)}${row(t.ipe, money(i.total), 'tot')}</tbody></table><p class="cmp">${esc(t.claim)}</p>`
      : `<p class="cmp"><b>${esc(t.notDue)}</b></p>`;
    out.innerHTML = `<div class="k">${esc(t.total)}</div><div class="big num">${money(r.total)}</div>
      <h3 class="rh">${esc(t.sev)}</h3>${sevBody}
      <h3 class="rh">${esc(t.ipe)}</h3>${ipeChecks}${ipeBody}
      <p class="cmp">${esc(t.notIncluded)}</p>`;
    track();
  }

  function overtime() {
    const W = window.MQWork, t = L.t;
    const gross = num('gross');
    const hours = { day: num('day') || 0, night: num('night') || 0, restDay: num('restDay') || 0, restNight: num('restNight') || 0 };
    if (!(gross > 0)) { out.innerHTML = ''; return; }
    const r = W.overtime({ grossMonthly: gross, hours, base: { year: 2026 } });
    if (!r.ok) { out.innerHTML = `<p class="warn">${esc(L.invalid)}</p>`; return; }
    const lines = r.lines.filter(l => l.hours > 0);
    out.innerHTML = `<div class="k">${esc(t.total)}</div><div class="big num">${money(r.total)}</div>
      ${r.net ? `<div class="muted num">${esc(t.net)} : + ${money(r.net.gain)} · ${esc(t.kept)} ${pct.format(r.net.kept)}</div>` : ''}
      <table><tbody>${row(t.hourly, money(r.hourly))}
      ${lines.map(l => row(`${t.kinds[l.kind]} · ${int.format(l.hours)} ${L.c.hours} · ${esc(t.bonus)} ${pct.format(l.rate)}`, money(l.amount))).join('')}
      ${row(t.total, money(r.total), 'tot')}</tbody></table>`;
    track();
  }

  const run = { pension, jobloss, overtime }[kind];
  if (!run) return;
  root.addEventListener('input', run);
  root.addEventListener('change', run);
  run();
})();
