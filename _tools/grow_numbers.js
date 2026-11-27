// Numbers for the growth pages, computed with the site's own engine (2026 rules, no dependants).
const S = require('../assets/engine/payroll.js');
const r2 = x => Math.round(x * 100) / 100;
const net = (g, d = 0, y = 2026) => S.calculate({ grossMonthly: g, dependants: d, year: y }).net.monthly;
const EMP = { social: 0.0898, family: 0.064, amo: 0.0411, tfp: 0.016, cap: 6000 };
const emp = g => { const c = Math.min(g, EMP.cap); const p = { social: r2(c * EMP.social), family: r2(g * EMP.family), amo: r2(g * EMP.amo), tfp: r2(g * EMP.tfp) }; p.total = r2(p.social + p.family + p.amo + p.tfp); return p; };
const out = { employer: [], raise: [], smig: {}, history: [] };
for (const g of [3422.72, 5000, 8000, 10000, 15000, 20000, 30000]) {
  const e = emp(g), n = net(g);
  out.employer.push({ gross: g, charges: e.total, cost: r2(g + e.total), net: n, rate: r2(e.total / g * 100), per100: r2(n / (g + e.total) * 100) });
}
for (const [a, b] of [[5000, 5500], [6000, 6600], [6400, 6600], [8000, 8800], [10000, 11000], [15000, 16500], [20000, 22000]]) {
  const na = net(a), nb = net(b);
  out.raise.push({ from: a, to: b, grossGain: r2(b - a), netGain: r2(nb - na), kept: r2((nb - na) / (b - a) * 100) });
}
const smig = r2(17.92 * 191), sr = S.calculate({ grossMonthly: smig, dependants: 0, year: 2026 });
out.smig = { hourly: 17.92, monthly: smig, net: sr.net.monthly, cnss: sr.deductions.find(x => x.key === 'cnss').monthly, amo: sr.deductions.find(x => x.key === 'amo').monthly, ir: sr.deductions.find(x => x.key === 'incomeTax').monthly, panierDay: r2(17.92 * 2), employer: emp(smig).total, cost: r2(smig + emp(smig).total) };
for (const [y, h, smag] of [['2021', 14.81, 76.70], ['2022', 15.55, 84.37], ['2023', 16.29, 88.58], ['2025', 17.10, 93.00], ['2026', 17.92, 97.44]]) out.history.push({ y, h, m: r2(h * 191), smag });
// threshold trap: net just under / over 6 500 DH gross
out.trap = { at6500: net(6500), at6510: net(6510), at6600: net(6600), at6400: net(6400) };
out.net2027_8000 = net(8000, 0, 2027);
console.log(JSON.stringify(out, null, 1));
