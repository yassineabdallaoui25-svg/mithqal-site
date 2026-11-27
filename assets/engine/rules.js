/* MITHQAL SALARY — Moroccan payroll rules, versioned by year.
   DATA ONLY. No calculation logic here, no UI. To update for a new Finance Law, add or edit a rule set
   and its sources; the engine (payroll.js) never contains a rate, threshold or ceiling.

   status:
     'official' : enacted law in force (Finance Law published in the Bulletin officiel).
     'draft'    : bill not yet promulgated. Results MUST be labelled as estimates.

   All amounts in MAD. Tax brackets and professional-expense thresholds are ANNUAL (art. 73 and 59 CGI).
   CNSS ceiling is MONTHLY. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MQSalaryRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const deepFreeze = o => { Object.values(o).forEach(v => { if (v && typeof v === 'object') deepFreeze(v) }); return Object.freeze(o) };

  /* Social contributions (employee share, private sector, CNSS regime).
     4.48% = short- and long-term social benefits incl. the 0.19% job-loss allowance (IPE) since 1 Dec 2014,
     on gross capped at 6,000 MAD/month. AMO 2.26% on total gross, no ceiling.
     Unchanged since 2024; no change announced in LF 2026 or PLF 2027. */
  const SOCIAL_CNSS_PRIVATE = {
    cnss: {
      employeeRate: 0.0448, monthlyCeiling: 6000,
      sources: ['cnss-rates']
    },
    amo: {
      employeeRate: 0.0226, monthlyCeiling: null,
      sources: ['cnss-rates']
    }
  };

  const SOURCES = {
    'cgi-59-iv': {
      title: 'Code général des impôts, art. 59-IV — part salariale des primes d’assurance-groupe (maladie, maternité, invalidité, décès), déductible du salaire brut',
      url: 'https://www.tax.gov.ma',
      note: 'Verified 21/11/2026. The employee share of group health/death insurance premiums is deducted before income tax.'
    },
    'cgi-2026': {
      title: 'Code général des impôts 2026 (DGI), art. 59-I, 73-I, 74-I',
      url: 'https://www.tax.gov.ma',
      note: 'Edition integrating Finance Law n° 50-25 for 2026.'
    },
    'lf-2025': {
      title: 'Loi de finances n° 60-24 pour 2025 (BO n° 7362, 19/12/2024) — barème art. 73-I, frais professionnels art. 59-I',
      url: 'https://www.finances.gov.ma',
      note: 'Bracket table applies to income from 1 Jan 2025; not modified by LF 2026.'
    },
    'lf-2026-nc737': {
      title: 'Loi de finances n° 50-25 pour 2026 — DGI Note circulaire n° 737 (27/02/2026)',
      url: 'https://www.tax.gov.ma',
      note: 'Family-charge reduction raised from 500 to 600 MAD per dependant, cap 3,600 MAD (6 persons).'
    },
    'plf-2027': {
      title: 'Projet de loi de finances n° 60.26 pour 2027 — adopted at first reading by the Chambre des représentants on 14/11/2026, pending the Chambre des conseillers',
      url: 'https://www.finances.gov.ma',
      note: 'Exempt band 60,000 MAD; 10/20/34/37 %; flat 45 % professional expenses capped at 35,000 MAD. Not promulgated.'
    },
    'cnss-pension': {
      title: 'CNSS — Pension de vieillesse (régime général): 50 % à 3 240 jours, +1 point par 216 jours, max. 70 %; salaire de référence = moyenne des 96 derniers mois déclarés, plafonné à 6 000 MAD; minimum 1 000 MAD',
      url: 'https://www.cnss.ma/fr/content/pension-de-vieillesse',
      note: 'Age 60 (55 for underground miners with 5 years). Checked 2026-11-20.'
    },
    'decree-2-25-265': {
      title: 'Décret n° 2.25.265 (loi 02.24) — pension dès 1 320 jours: Pn = Tx × Sr, Tx = 50 % × jours / 3 240 (2 décimales); minimums 600 à 1 000 MAD',
      url: 'https://adala.justice.gov.ma',
      note: 'In force 1 May 2025, retroactive to retirements from 1 Jan 2023.'
    },
    'ipe-law-03-14': {
      title: 'Indemnité pour perte d’emploi (loi 03-14, art. 46 bis du dahir 1-72-184) — 780 jours sur 36 mois dont 260 sur les 12 derniers; 70 % du salaire moyen des 36 derniers mois, plafonné au SMIG; 6 mois; demande sous 60 jours',
      url: 'https://www.cnss.ma',
      note: 'Reform announced by the social-protection framework law, not enacted as of 2026-11-20.'
    },
    'smig-2026': {
      title: 'Décret n° 2.25.983 (BO n° 7469, 29/12/2025) — SMIG non agricole 17,92 MAD/heure au 1/1/2026; 191 heures par mois',
      url: 'https://www.sgg.gov.ma',
      note: '17.92 × 191 = 3,422.72 MAD gross per month.'
    },
    'code-travail-201': {
      title: 'Code du travail (loi 65-99), art. 196 à 203 — heures supplémentaires: majoration de 25 % (6 h–21 h) et 50 % (21 h–6 h), portée à 50 % et 100 % le jour du repos hebdomadaire',
      url: 'https://www.ilo.org/dyn/travail/docs/447/',
      note: 'Verified 24/11/2026. Non-agricultural activities; agriculture uses 5 h–20 h. Hourly wage = monthly / 191 h.'
    },
    'code-travail-231-255': {
      title: 'Code du travail (loi 65-99), art. 231 à 255 — congé annuel payé: 1,5 jour par mois de service (2 jours avant 18 ans), + 1,5 jour par 5 ans d’ancienneté (max 30), indemnité compensatrice à la rupture',
      url: 'https://www.ilo.org/dyn/travail/docs/447/',
      note: 'Verified 24/11/2026. A month = 26 working days (art. 238); any started month counts (art. 251).'
    },
    'decret-2-04-469': {
      title: 'Décret n° 2-04-469 du 29 décembre 2004 (BO 5280) — délai de préavis (CDI): cadres 1 / 2 / 3 mois, employés et ouvriers 8 jours / 1 / 2 mois (moins d’un an / 1 à 5 ans / plus de 5 ans)',
      url: 'https://adala.justice.gov.ma',
      note: 'Verified 24/11/2026. Indemnity in lieu of notice = pay the employee would have earned (Code du travail art. 51).'
    },
    'code-travail-52-55': {
      title: 'Code du travail (loi 65-99), art. 52 à 55 — indemnité de licenciement après 6 mois: 96 h/an (1–5 ans), 144 h (6–10), 192 h (11–15), 240 h (au-delà), par année ou fraction d’année',
      url: 'https://www.ilo.org/dyn/travail/docs/447/',
      note: 'Hourly wage = average monthly salary of the last 52 weeks / 191 hours.'
    },
    'cnss-rates': {
      title: 'CNSS — taux de cotisation (prestations sociales 4,48 % salarié plafonné à 6 000 MAD, dont IPE 0,19 %; AMO 2,26 % sans plafond)',
      url: 'https://www.cnss.ma',
      note: 'IPE (loi 03-14, 1/12/2014) raised the employee share from 4.29 % to 4.48 %.'
    }
  };

  const RULES = {
    2026: {
      id: 'MA-2026.1',
      year: 2026,
      status: 'official',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      verifiedOn: '2026-11-20',
      sector: { private: SOCIAL_CNSS_PRIVATE },
      tax: {
        brackets: [ // annual net taxable income (RNI), marginal rates
          { upTo: 40000, rate: 0 },
          { upTo: 60000, rate: 0.10 },
          { upTo: 80000, rate: 0.20 },
          { upTo: 100000, rate: 0.30 },
          { upTo: 180000, rate: 0.34 },
          { upTo: null, rate: 0.37 }
        ],
        // published "somme à déduire" — used only by tests to cross-check the bracket maths
        publishedDeductions: [0, 4000, 10000, 18000, 22000, 27400],
        professionalExpenses: [ // chosen on ANNUAL gross taxable salary
          { grossUpTo: 78000, rate: 0.35, annualCap: 30000 },
          { grossUpTo: null, rate: 0.25, annualCap: 35000 }
        ],
        familyReduction: { perDependantAnnual: 600, maxDependants: 6 },
        sources: ['lf-2025', 'lf-2026-nc737', 'cgi-2026']
      }
    },
    2027: {
      id: 'MA-2027.0-PLF',
      year: 2027,
      status: 'draft',
      // where the bill stands; update as it moves. stage keys: tabled, first-reading, second-reading, promulgated
      legislative: { bill: '60.26', stage: 'first-reading', date: '2026-11-14' },
      effectiveFrom: '2027-01-01',
      effectiveTo: '2027-12-31',
      verifiedOn: '2026-11-20',
      sector: { private: SOCIAL_CNSS_PRIVATE },
      tax: {
        brackets: [
          { upTo: 60000, rate: 0 },
          { upTo: 80000, rate: 0.10 },
          { upTo: 100000, rate: 0.20 },
          { upTo: 180000, rate: 0.34 },
          { upTo: null, rate: 0.37 }
        ],
        publishedDeductions: [0, 6000, 14000, 28000, 33400],
        professionalExpenses: [
          { grossUpTo: null, rate: 0.45, annualCap: 35000 }
        ],
        // Not modified by PLF 2027: CGI 2026 value carried forward.
        familyReduction: { perDependantAnnual: 600, maxDependants: 6 },
        sources: ['plf-2027', 'cgi-2026']
      }
    }
  };

  /* CNSS old-age pension (private sector, general regime). Rules in force on 2026-11-20.
     A retirement reform bill (legal age 60 -> 63) was announced but is NOT law: not used here. */
  const PENSION_CNSS = {
    id: 'MA-CNSS-PENSION-2025.1',
    status: 'official',
    verifiedOn: '2026-11-20',
    legalAge: 60,
    referenceMonths: 96,
    monthlyCeiling: 6000,           // same ceiling as contributions
    maxDaysPerMonth: 26,            // days declared per full month (312 per year)
    minDays: 1320,                  // below: refund of employee contributions, no pension
    fullDays: 3240,                 // 50 %
    baseRate: 0.50,
    stepDays: 216, stepRate: 0.01,  // +1 point per full 216 days beyond 3,240
    maxRate: 0.70,                  // reached at 7,560 days
    partialRateDecimals: 4,         // Tx = 50 % × days / 3,240, two decimals in percent (0.4815 = 48.15 %)
    minimums: [                     // minimum monthly pension by insurance days (decree 2.25.265, art. 2)
      { fromDays: 1320, amount: 600 }, { fromDays: 1705, amount: 700 }, { fromDays: 2089, amount: 800 },
      { fromDays: 2473, amount: 900 }, { fromDays: 2857, amount: 1000 }
    ],
    sources: ['cnss-pension', 'decree-2-25-265']
  };

  /* Losing your job: CNSS job-loss allowance (IPE) and the legal severance pay. Rules in force on 2026-11-20. */
  const JOB_LOSS = {
    id: 'MA-JOBLOSS-2026.1', status: 'official', verifiedOn: '2026-11-20',
    smig: { hourly: 17.92, hoursPerMonth: 191, sources: ['smig-2026'] },
    ipe: {
      minDaysWindow: 780, windowMonths: 36, minDaysLast12: 260, maxDaysPerMonth: 26,
      rate: 0.70, capAtSmig: true, months: 6, claimWithinDays: 60, involuntaryOnly: true,
      sources: ['ipe-law-03-14', 'smig-2026']
    },
    severance: {
      minMonths: 6, hoursPerMonth: 191, referenceWeeks: 52, notForSeriousMisconduct: true, fractionCountsAsYear: true,
      tiers: [{ upToYear: 5, hours: 96 }, { upToYear: 10, hours: 144 }, { upToYear: 15, hours: 192 }, { upToYear: null, hours: 240 }],
      sources: ['code-travail-52-55']
    }
  };

  // working time and end-of-contract rules (Code du travail, loi 65-99)
  const WORK = {
    id: 'MA-WORK-2026.1', status: 'official', verifiedOn: '2026-11-24',
    hoursPerMonth: 191, workDaysPerMonth: 26,
    overtime: { rates: { day: 0.25, night: 0.5, restDay: 0.5, restNight: 1 }, nightFrom: 21, nightTo: 6, sources: ['code-travail-201'] },
    leave: { daysPerMonth: 1.5, daysPerMonthUnder18: 2, bonusDays: 1.5, bonusEveryYears: 5, maxDays: 30, minMonths: 6, sources: ['code-travail-231-255'] },
    notice: {
      // [upToYears (exclusive), days] ; 30 days = one month
      cadre: [{ under: 1, days: 30 }, { under: 5, days: 60 }, { under: null, days: 90 }],
      employee: [{ under: 1, days: 8 }, { under: 5, days: 30 }, { under: null, days: 60 }],
      sources: ['decret-2-04-469']
    }
  };

  return deepFreeze({ RULES, SOURCES, PENSION_CNSS, JOB_LOSS, WORK, SUPPORTED_YEARS: Object.keys(RULES).map(Number) });
});
