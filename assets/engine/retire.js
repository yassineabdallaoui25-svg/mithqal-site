/* MITHQAL SALARY — CNSS old-age pension estimate (Milestone 9). Pure function, rules from rules.js PENSION_CNSS.
   Input: { avgMonthlyGross, days }  (avg of the last 96 declared months; insurance days, 26 per full month).
   It never invents a rule: no revaluation, no reform that is not law. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./rules.js'));
  else root.MQRetire = factory(root.MQSalaryRules);
})(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';
  const P = R.PENSION_CNSS;
  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  const roundTo = (x, d) => { const f = Math.pow(10, d); return Math.round((x + Number.EPSILON) * f) / f };

  function rateFor(days) {
    if (days < P.minDays) return 0;
    if (days < P.fullDays) return roundTo(P.baseRate * days / P.fullDays, P.partialRateDecimals);
    const steps = Math.floor((days - P.fullDays) / P.stepDays);
    return Math.min(P.maxRate, roundTo(P.baseRate + steps * P.stepRate, 4));
  }
  const minimumFor = days => { let m = 0; P.minimums.forEach(x => { if (days >= x.fromDays) m = x.amount }); return m };

  function calculate(input) {
    const errors = [];
    const g = Number(input && input.avgMonthlyGross), days = Math.floor(Number(input && input.days));
    if (!(g >= 0) || !isFinite(g)) errors.push({ code: 'INVALID_AVG' });
    if (!(days >= 0) || !isFinite(days) || days > 20000) errors.push({ code: 'INVALID_DAYS' });
    if (errors.length) return { ok: false, errors };
    const ref = Math.min(g, P.monthlyCeiling), rate = rateFor(days), eligible = days >= P.minDays;
    const formula = r2(ref * rate), minimum = eligible ? minimumFor(days) : 0;
    const pension = eligible ? Math.max(formula, minimum) : 0;
    // next milestone: what the next block of days brings
    let next = null;
    if (!eligible) next = { days: P.minDays - days, kind: 'eligible' };
    else if (days < P.fullDays) next = { days: P.fullDays - days, kind: 'full' };
    else if (rate < P.maxRate) {
      const toNext = P.stepDays - ((days - P.fullDays) % P.stepDays);
      next = { days: toNext, kind: 'step', gain: r2(ref * P.stepRate) };
    }
    if (next && next.kind !== 'step') { const p2 = calculate({ avgMonthlyGross: g, days: days + next.days }); next.pension = p2.pension }
    return {
      ok: true, input: { avgMonthlyGross: g, days }, rulesId: P.id, legalAge: P.legalAge,
      eligible, refund: !eligible, referenceSalary: ref, capped: g > P.monthlyCeiling, rate, formula, minimum,
      minimumApplied: eligible && minimum > formula, pension, annual: r2(pension * 12),
      maxRateDays: P.fullDays + Math.round((P.maxRate - P.baseRate) / P.stepRate) * P.stepDays,
      maxPension: r2(P.monthlyCeiling * P.maxRate), next
    };
  }
  const daysFromYears = (years, monthsPerYear) => Math.round(Math.max(0, years) * (monthsPerYear || 12) * P.maxDaysPerMonth);
  return Object.freeze({ calculate, rateFor, minimumFor, daysFromYears, RULES: P, VERSION: '0.1.0' });
});
