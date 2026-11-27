/* MITHQAL SALARY — losing your job (Milestone 10): CNSS job-loss allowance (IPE) + legal severance pay.
   Pure functions, rules from rules.js JOB_LOSS. Input:
   { reason: 'dismissal' | 'misconduct' | 'resignation' | 'cddEnd',   // dismissal includes economic reasons and closure
     avgMonthlyGross36, days36, days12, lastMonthlyGross, seniorityYears }
   Notice pay and damages for unfair dismissal are NOT computed (they depend on contract and court). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./rules.js'));
  else root.MQJobLoss = factory(root.MQSalaryRules);
})(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';
  const J = R.JOB_LOSS, IPE = J.ipe, SEV = J.severance;
  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  const SMIG = r2(J.smig.hourly * J.smig.hoursPerMonth);
  const REASONS = ['dismissal', 'cddEnd', 'resignation', 'misconduct'];

  function severanceHours(years) {
    const y = Math.ceil(Math.max(0, years) - 1e-9);   // each year OR FRACTION of a year counts
    let h = 0, from = 0; const parts = [];
    for (const t of SEV.tiers) {
      const to = t.upToYear == null ? Infinity : t.upToYear, n = Math.max(0, Math.min(y, to) - from);
      if (n > 0) { parts.push({ fromYear: from + 1, toYear: from + n, years: n, hoursPerYear: t.hours, hours: n * t.hours }); h += n * t.hours }
      from = to; if (y <= to) break;
    }
    return { countedYears: y, hours: h, parts };
  }

  function calculate(i) {
    const errors = [], num = (v, k) => { const x = Number(v); if (!isFinite(x) || x < 0) errors.push({ code: 'INVALID_' + k }); return x };
    const reason = REASONS.includes(i && i.reason) ? i.reason : (errors.push({ code: 'INVALID_REASON' }), 'dismissal');
    const avg = num(i.avgMonthlyGross36, 'AVG'), last = num(i.lastMonthlyGross == null ? i.avgMonthlyGross36 : i.lastMonthlyGross, 'LAST');
    const d36 = Math.floor(num(i.days36, 'DAYS')), d12 = Math.floor(num(i.days12, 'DAYS')), yrs = num(i.seniorityYears, 'YEARS');
    if (d12 > d36) errors.push({ code: 'DAYS_12_GT_36' });
    if (d36 > IPE.windowMonths * IPE.maxDaysPerMonth || d12 > 12 * IPE.maxDaysPerMonth) errors.push({ code: 'DAYS_TOO_MANY' });
    if (errors.length) return { ok: false, errors };

    // IPE
    const involuntary = reason === 'dismissal' || reason === 'cddEnd';
    const checks = [
      { key: 'involuntary', ok: involuntary },
      { key: 'days36', ok: d36 >= IPE.minDaysWindow, have: d36, need: IPE.minDaysWindow },
      { key: 'days12', ok: d12 >= IPE.minDaysLast12, have: d12, need: IPE.minDaysLast12 }
    ];
    const ipeOk = checks.every(c => c.ok), raw = r2(avg * IPE.rate), monthly = ipeOk ? Math.min(raw, SMIG) : 0;
    const ipe = { eligible: ipeOk, checks, raw, cap: SMIG, capped: ipeOk && raw > SMIG, monthly: r2(monthly), months: ipeOk ? IPE.months : 0, total: r2(monthly * (ipeOk ? IPE.months : 0)), claimWithinDays: IPE.claimWithinDays };

    // severance (art. 52-55): after 6 months, not for serious misconduct, not for resignation
    const months = yrs * 12, sevOk = (reason === 'dismissal') && months >= SEV.minMonths;
    const sh = severanceHours(yrs), hourly = r2(last / SEV.hoursPerMonth);
    const severance = { eligible: sevOk, reasonOk: reason === 'dismissal', seniorityOk: months >= SEV.minMonths, hourly, hours: sevOk ? sh.hours : 0, parts: sevOk ? sh.parts : [], amount: sevOk ? r2(sh.hours * last / SEV.hoursPerMonth) : 0, countedYears: sh.countedYears, monthsOfSalary: sevOk ? r2(sh.hours / SEV.hoursPerMonth) : 0 };

    return { ok: true, rulesId: J.id, input: { reason, avgMonthlyGross36: avg, lastMonthlyGross: last, days36: d36, days12: d12, seniorityYears: yrs }, smig: SMIG, ipe, severance, total: r2(ipe.total + severance.amount) };
  }
  return Object.freeze({ calculate, severanceHours, SMIG, REASONS, RULES: J, VERSION: '0.1.0' });
});
