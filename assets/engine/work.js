/* MITHQAL SALARY — overtime and final settlement (1.6.0). Pure functions, rules from rules.js WORK / JOB_LOSS.
   overtime({ grossMonthly, hours: { day, night, restDay, restNight }, base })
     → hourly wage, pay per kind, total gross, and what lands in the pocket (net with − net without, via the payroll engine).
   settlement({ grossMonthly, seniorityYears, category, reason, daysWorked, leaveDays, noticeWorked })
     → solde de tout compte: salary of the last month, untaken leave, notice indemnity, legal severance.
   leaveAccrued({ months, seniorityYears, under18 }) → paid-leave days earned (art. 231–232).
   Everything is gross, before CNSS/AMO/IR. Nothing that depends on a contract or a court is computed. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./rules.js'), require('./payroll.js'), require('./jobloss.js'));
  else root.MQWork = factory(root.MQSalaryRules, root.MQSalary, root.MQJobLoss);
})(typeof self !== 'undefined' ? self : this, function (R, E, J) {
  'use strict';
  const W = R.WORK, OT = W.overtime, LV = W.leave, NT = W.notice, SEV = R.JOB_LOSS.severance;
  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  const KINDS = ['day', 'night', 'restDay', 'restNight'];
  const CATS = ['employee', 'cadre'], REASONS = ['dismissal', 'resignation', 'cddEnd', 'misconduct'];
  const ok = v => typeof v === 'number' && isFinite(v) && v >= 0;

  function overtime(i) {
    const g = Number(i && i.grossMonthly), hrs = (i && i.hours) || {};
    if (!(g > 0) || !isFinite(g)) return { ok: false, errors: [{ code: 'INVALID_GROSS' }] };
    const errors = [];
    KINDS.forEach(k => { const h = hrs[k] == null ? 0 : Number(hrs[k]); if (!ok(h) || h > 400) errors.push({ code: 'INVALID_HOURS', kind: k }) });
    if (errors.length) return { ok: false, errors };
    const hourly = r2(g / W.hoursPerMonth);
    const lines = KINDS.map(k => { const h = Number(hrs[k] || 0), rate = OT.rates[k]; return { kind: k, hours: h, rate, perHour: r2(g / W.hoursPerMonth * (1 + rate)), amount: r2(h * g / W.hoursPerMonth * (1 + rate)) } });
    const total = r2(lines.reduce((s, l) => s + l.amount, 0)), hours = lines.reduce((s, l) => s + l.hours, 0);
    // what reaches the pocket: overtime is taxable salary (CNSS within its ceiling, AMO, IR at the marginal rate)
    let net = null;
    if (E) {
      const base = Object.assign({ year: E.SUPPORTED_YEARS[0], dependants: 0 }, (i && i.base) || {}, { grossMonthly: g });
      const a = E.calculate(base), b = E.calculate(Object.assign({}, base, { taxableAllowancesMonthly: (base.taxableAllowancesMonthly || 0) + total }));
      if (a.ok && b.ok) net = { before: a.net.monthly, after: b.net.monthly, gain: r2(b.net.monthly - a.net.monthly), kept: total > 0 ? (b.net.monthly - a.net.monthly) / total : 0 };
    }
    return { ok: true, rulesId: W.id, hourly, lines, hours, total, net };
  }

  function noticeDays(category, years) {
    const t = NT[category] || NT.employee;
    return years < 1 ? t[0].days : years <= 5 ? t[1].days : t[2].days;
  }
  function leaveAccrued(i) {
    const months = Math.max(0, Number(i && i.months) || 0), yrs = Math.max(0, Number(i && i.seniorityYears) || 0);
    const per = i && i.under18 ? LV.daysPerMonthUnder18 : LV.daysPerMonth;
    const yearly = Math.min(LV.maxDays, per * 12 + LV.bonusDays * Math.floor(yrs / LV.bonusEveryYears));
    return { perMonth: per, yearly, days: r2(months * yearly / 12) };
  }

  function settlement(i) {
    i = i || {};
    const errors = [], g = Number(i.grossMonthly), yrs = Number(i.seniorityYears), dw = i.daysWorked == null ? 0 : Number(i.daysWorked), lv = i.leaveDays == null ? 0 : Number(i.leaveDays);
    if (!(g > 0) || !isFinite(g)) errors.push({ code: 'INVALID_GROSS' });
    if (!ok(yrs) || yrs > 60) errors.push({ code: 'INVALID_YEARS' });
    if (!ok(dw) || dw > W.workDaysPerMonth) errors.push({ code: 'INVALID_DAYS' });
    if (!ok(lv) || lv > 365) errors.push({ code: 'INVALID_LEAVE' });
    const category = CATS.includes(i.category) ? i.category : 'employee', reason = REASONS.includes(i.reason) ? i.reason : 'dismissal';
    if (errors.length) return { ok: false, errors };
    const daily = r2(g / W.workDaysPerMonth);
    const lines = [];
    // 1. salary of the days worked in the last month
    lines.push({ key: 'salary', amount: r2(daily * dw), days: dw, due: dw > 0 });
    // 2. untaken paid leave: due whatever the reason (art. 254)
    lines.push({ key: 'leave', amount: r2(daily * lv), days: lv, due: lv > 0 });
    // 3. notice: the employer pays it when it dismisses without the notice being worked; never for serious misconduct
    const nd = noticeDays(category, yrs), noticeDue = reason === 'dismissal' && !i.noticeWorked;
    lines.push({ key: 'notice', amount: noticeDue ? r2(g * nd / 30) : 0, days: nd, due: noticeDue, owedByEmployee: reason === 'resignation' && !i.noticeWorked });
    // 4. legal severance (art. 52–55), same maths as the job-loss screen
    const sevOk = reason === 'dismissal' && yrs * 12 >= SEV.minMonths, sh = J.severanceHours(yrs);
    lines.push({ key: 'severance', amount: sevOk ? r2(sh.hours * g / SEV.hoursPerMonth) : 0, hours: sevOk ? sh.hours : 0, due: sevOk });
    const total = r2(lines.reduce((s, l) => s + l.amount, 0));
    return { ok: true, rulesId: W.id, input: { grossMonthly: g, seniorityYears: yrs, category, reason, daysWorked: dw, leaveDays: lv, noticeWorked: !!i.noticeWorked }, daily, noticeDays: nd, lines, total };
  }

  return Object.freeze({ overtime, settlement, leaveAccrued, noticeDays, KINDS, CATS, REASONS, RULES: W });
});
