/* MITHQAL SALARY — payroll calculation engine (pure, offline, no dependencies, no UI).
   Works in the browser (window.MQSalary) and in Node (require).

   Pipeline (one function per step, each step recorded in result.trace):
     1. validate input
     2. gross remuneration      : base + taxable allowances (monthly)
     3. contribution bases      : CNSS base = min(gross, ceiling); AMO base = gross
     4. social contributions    : CNSS, AMO (mandatory)
     5. taxable income (annual) : gross − professional expenses − CNSS − AMO − deductible retirement
     6. income tax (annual)     : progressive brackets − family reduction, floored at 0
     7. adjustments             : non-taxable allowances (+), other user withholdings (−)
     8. net salary (monthly)

   Rounding: everything is computed on an annual basis, then divided by 12 and rounded to the centime
   (half away from zero). Payslips that use the rounded MONTHLY table can differ by ±0.02 MAD.

   Warnings and errors are CODES. The UI translates them (Darija / French / English). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./rules.js'));
  else root.MQSalary = factory(root.MQSalaryRules);
})(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';
  const { RULES, SOURCES } = R;

  const round2 = x => { const s = x < 0 ? -1 : 1; return s * Math.round((Math.abs(x) + Number.EPSILON) * 100) / 100 };
  const isNum = x => typeof x === 'number' && Number.isFinite(x);

  /* ---------- 1. validation ---------- */
  const DEFAULTS = {
    year: 2026, sector: 'private', grossMonthly: 0,
    taxableAllowancesMonthly: 0, nonTaxableAllowancesMonthly: 0,
    dependants: 0, retirementMonthly: 0, otherWithholdingsMonthly: 0,
    insuranceRate: 0 // complementary health insurance, employee share, % of gross (CGI art. 59-IV)
  };
  const MAX_INSURANCE_RATE = 20;
  const MAX_MONTHLY = 10000000; // sanity guard against typos (10 M MAD / month)

  function validate(raw) {
    const input = Object.assign({}, DEFAULTS, raw || {});
    const errors = [];
    if (!RULES[input.year]) errors.push({ field: 'year', code: 'YEAR_UNSUPPORTED' });
    if (input.sector !== 'private') errors.push({ field: 'sector', code: 'SECTOR_UNSUPPORTED' });
    ['grossMonthly', 'taxableAllowancesMonthly', 'nonTaxableAllowancesMonthly', 'retirementMonthly', 'otherWithholdingsMonthly'].forEach(f => {
      const v = input[f];
      if (!isNum(v)) errors.push({ field: f, code: 'NOT_A_NUMBER' });
      else if (v < 0) errors.push({ field: f, code: 'NEGATIVE' });
      else if (v > MAX_MONTHLY) errors.push({ field: f, code: 'TOO_LARGE' });
    });
    if (isNum(input.grossMonthly) && input.grossMonthly <= 0 && !errors.some(e => e.field === 'grossMonthly')) errors.push({ field: 'grossMonthly', code: 'REQUIRED' });
    if (!isNum(input.insuranceRate)) errors.push({ field: 'insuranceRate', code: 'NOT_A_NUMBER' });
    else if (input.insuranceRate < 0 || input.insuranceRate > MAX_INSURANCE_RATE) errors.push({ field: 'insuranceRate', code: 'INSURANCE_RATE_RANGE' });
    if (!Number.isInteger(input.dependants) || input.dependants < 0 || input.dependants > 20) errors.push({ field: 'dependants', code: 'INVALID_DEPENDANTS' });
    if (!errors.some(e => e.field === 'grossMonthly' || e.field === 'taxableAllowancesMonthly' || e.field === 'retirementMonthly') &&
        input.retirementMonthly > input.grossMonthly + input.taxableAllowancesMonthly)
      errors.push({ field: 'retirementMonthly', code: 'EXCEEDS_GROSS' });
    return { input, errors };
  }

  /* ---------- 6. progressive tax ---------- */
  function progressiveTax(annualIncome, brackets) {
    let tax = 0, lower = 0;
    const slices = [];
    for (const b of brackets) {
      const upper = b.upTo == null ? Infinity : b.upTo;
      if (annualIncome > lower) {
        const amount = Math.min(annualIncome, upper) - lower;
        tax += amount * b.rate;
        slices.push({ from: lower, to: b.upTo, rate: b.rate, taxedAmount: amount, tax: amount * b.rate });
      }
      lower = upper;
    }
    return { tax, slices, marginalRate: (slices[slices.length - 1] || { rate: 0 }).rate };
  }

  function professionalExpenses(annualGross, tiers) {
    const t = tiers.find(x => x.grossUpTo == null || annualGross <= x.grossUpTo);
    const raw = annualGross * t.rate;
    return { amount: Math.min(raw, t.annualCap), rate: t.rate, cap: t.annualCap, capped: raw > t.annualCap };
  }

  /* ---------- main calculation ---------- */
  function calculate(rawInput) {
    const { input, errors } = validate(rawInput);
    if (errors.length) return { ok: false, errors, input };

    const rules = RULES[input.year];
    const social = rules.sector[input.sector];
    const tax = rules.tax;
    const trace = [];
    const step = (k, v) => { trace.push({ step: k, value: round2(v) }); return v };
    const warnings = [];
    if (rules.status !== 'official') warnings.push('RULES_NOT_ENACTED');
    if (input.taxableAllowancesMonthly > 0) warnings.push('ALLOWANCES_ASSUMED_TAXABLE_AND_CONTRIBUTORY');
    if (input.nonTaxableAllowancesMonthly > 0) warnings.push('NON_TAXABLE_ALLOWANCES_USER_DECLARED');

    // 2. gross remuneration
    const gross = step('grossTaxableMonthly', input.grossMonthly + input.taxableAllowancesMonthly);

    // 3–4. contribution bases and social contributions (monthly)
    const cnssBase = step('cnssBase', social.cnss.monthlyCeiling == null ? gross : Math.min(gross, social.cnss.monthlyCeiling));
    const amoBase = step('amoBase', social.amo.monthlyCeiling == null ? gross : Math.min(gross, social.amo.monthlyCeiling));
    const cnss = round2(step('cnss', cnssBase * social.cnss.employeeRate));
    const amo = round2(step('amo', amoBase * social.amo.employeeRate));
    const retirement = round2(input.retirementMonthly);
    // complementary health insurance (group policy, employee share) — deductible, CGI art. 59-IV
    const insurance = round2(step('insurance', gross * input.insuranceRate / 100));

    // 5. taxable income (annual)
    const grossA = gross * 12;
    const fp = professionalExpenses(grossA, tax.professionalExpenses);
    step('professionalExpensesAnnual', fp.amount);
    const taxableA = Math.max(0, step('netTaxableIncomeAnnual', grossA - fp.amount - 12 * (cnss + amo + retirement + insurance)));

    // 6. income tax (annual), family reduction, floor at 0
    const prog = progressiveTax(taxableA, tax.brackets);
    step('incomeTaxBeforeFamilyAnnual', prog.tax);
    const fam = tax.familyReduction;
    const famEligible = Math.min(input.dependants, fam.maxDependants);
    const famReduction = Math.min(prog.tax, famEligible * fam.perDependantAnnual);
    if (input.dependants > fam.maxDependants) warnings.push('DEPENDANTS_CAPPED');
    step('familyReductionAnnual', famReduction);
    const irA = Math.max(0, prog.tax - famReduction);
    const ir = round2(step('incomeTaxMonthly', irA / 12));

    // 7–8. adjustments and net
    const nonTaxable = round2(input.nonTaxableAllowancesMonthly);
    const otherW = round2(input.otherWithholdingsMonthly);
    const mandatory = round2(cnss + amo + ir);
    const optional = round2(retirement + insurance + otherW);
    const net = round2(step('netMonthly', gross - mandatory - optional + nonTaxable));

    const pct = x => gross > 0 ? x / gross : 0;
    const line = (key, amount, kind, extra) => Object.assign({ key, kind, monthly: amount, annual: round2(amount * 12), shareOfGross: pct(amount) }, extra || {});

    return {
      ok: true,
      input,
      rules: { id: rules.id, year: rules.year, status: rules.status, effectiveFrom: rules.effectiveFrom, verifiedOn: rules.verifiedOn,
               sources: Array.from(new Set([...tax.sources, ...social.cnss.sources, ...social.amo.sources])).map(k => Object.assign({ key: k }, SOURCES[k])) },
      isEstimate: rules.status !== 'official',
      warnings,
      gross: { monthly: round2(gross), annual: round2(gross * 12) },
      deductions: [
        line('cnss', cnss, 'mandatory', { base: round2(cnssBase), rate: social.cnss.employeeRate, ceiling: social.cnss.monthlyCeiling, capped: gross > social.cnss.monthlyCeiling }),
        line('amo', amo, 'mandatory', { base: round2(amoBase), rate: social.amo.employeeRate }),
        line('incomeTax', ir, 'mandatory', { marginalRate: prog.marginalRate }),
        ...(insurance ? [line('insurance', insurance, 'optional', { taxDeductible: true, rate: input.insuranceRate / 100, base: round2(gross), source: 'cgi-59-iv' })] : []),
        ...(retirement ? [line('retirement', retirement, 'optional', { taxDeductible: true })] : []),
        ...(otherW ? [line('otherWithholdings', otherW, 'optional', { taxDeductible: false })] : [])
      ],
      additions: nonTaxable ? [line('nonTaxableAllowances', nonTaxable, 'user')] : [],
      tax: {
        professionalExpensesAnnual: round2(fp.amount), professionalExpensesRate: fp.rate, professionalExpensesCapped: fp.capped,
        netTaxableIncomeAnnual: round2(taxableA), netTaxableIncomeMonthly: round2(taxableA / 12),
        beforeFamilyAnnual: round2(prog.tax), familyReductionAnnual: round2(famReduction), incomeTaxAnnual: round2(irA),
        marginalRate: prog.marginalRate, slices: prog.slices.map(s => ({ from: s.from, to: s.to, rate: s.rate, taxedAmount: round2(s.taxedAmount), tax: round2(s.tax) }))
      },
      totals: {
        mandatoryMonthly: mandatory, optionalMonthly: optional, deductionsMonthly: round2(mandatory + optional),
        mandatoryAnnual: round2(mandatory * 12), deductionsAnnual: round2((mandatory + optional) * 12),
        effectiveMandatoryRate: pct(mandatory), effectiveDeductionRate: pct(mandatory + optional)
      },
      net: { monthly: net, annual: round2(net * 12) },
      trace
    };
  }

  /* ---------- net → gross (numerical inversion) ----------
     Net is continuous and strictly increasing in gross EXCEPT at the 2026 professional-expense threshold
     (78,000 MAD/yr = 6,500/month), where the rate drops 35 % → 25 % and net falls by about 65 MAD/month.
     Search therefore returns the LOWEST gross reaching the target; result.exact is false when the target
     sits in that gap (the nearest reachable net is returned and the difference is reported). */
  function grossFromNet(targetNetMonthly, otherInput) {
    if (!isNum(targetNetMonthly) || targetNetMonthly <= 0) return { ok: false, errors: [{ field: 'targetNetMonthly', code: 'REQUIRED' }] };
    const base = Object.assign({}, otherInput || {});
    const netAt = g => { const r = calculate(Object.assign({}, base, { grossMonthly: g })); if (!r.ok) throw r; return r };
    let probe;
    try { probe = netAt(1) } catch (r) { return r }
    let lo = 0, hi = Math.max(1000, targetNetMonthly * 2);
    while (netAt(hi).net.monthly < targetNetMonthly) { lo = hi; hi *= 2; if (hi > MAX_MONTHLY) return { ok: false, errors: [{ field: 'targetNetMonthly', code: 'TOO_LARGE' }] } }
    for (let i = 0; i < 80 && hi - lo > 0.001; i++) {
      const mid = (lo + hi) / 2;
      if (netAt(mid).net.monthly >= targetNetMonthly) hi = mid; else lo = mid;
    }
    // smallest gross in centimes that reaches the target
    let gross = Math.ceil(hi * 100) / 100;
    while (gross > 0.01 && netAt(round2(gross - 0.01)).net.monthly >= targetNetMonthly) gross = round2(gross - 0.01);
    const result = netAt(gross);
    const diff = round2(result.net.monthly - targetNetMonthly);
    return Object.assign({ ok: true, mode: 'netToGross', targetNetMonthly, grossMonthly: gross, difference: diff,
      exact: Math.abs(diff) <= 0.01, iterative: true, result, assumptions: probe.input });
  }

  /* ---------- comparison of two offers ---------- */
  function compare(a, b) {
    const ra = calculate(a), rb = calculate(b);
    if (!ra.ok || !rb.ok) return { ok: false, a: ra, b: rb };
    const d = (x, y) => round2(y - x);
    const byKey = r => Object.fromEntries(r.deductions.map(x => [x.key, x.monthly]));
    const ka = byKey(ra), kb = byKey(rb);
    const keys = Array.from(new Set([...Object.keys(ka), ...Object.keys(kb)]));
    return {
      ok: true, a: ra, b: rb,
      difference: {
        grossMonthly: d(ra.gross.monthly, rb.gross.monthly), grossAnnual: d(ra.gross.annual, rb.gross.annual),
        netMonthly: d(ra.net.monthly, rb.net.monthly), netAnnual: d(ra.net.annual, rb.net.annual),
        deductionsMonthly: Object.fromEntries(keys.map(k => [k, d(ka[k] || 0, kb[k] || 0)]))
      },
      anyEstimate: ra.isEstimate || rb.isEstimate
    };
  }

  /* ---------- simulation (slider) ---------- */
  function simulate(baseInput, grossValues) {
    return grossValues.map(g => { const r = calculate(Object.assign({}, baseInput, { grossMonthly: g })); return r.ok ? { gross: g, net: r.net.monthly, deductions: r.totals.deductionsMonthly, rate: r.totals.effectiveDeductionRate } : { gross: g, error: r.errors } });
  }

  return Object.freeze({ calculate, grossFromNet, compare, simulate, validate, progressiveTax, professionalExpenses, round2,
    SUPPORTED_YEARS: R.SUPPORTED_YEARS, ENGINE_VERSION: '0.1.0' });
});
