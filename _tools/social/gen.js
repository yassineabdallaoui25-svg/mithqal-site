const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const F = p => 'file://' + path.join(__dirname, 'node_modules/@fontsource', p);
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });

const fontCSS = `
@font-face{font-family:Lit;font-weight:600;src:url(${F('literata/files/literata-latin-600-normal.woff2')})}
@font-face{font-family:Lit;font-weight:700;src:url(${F('literata/files/literata-latin-700-normal.woff2')})}
@font-face{font-family:Lit;font-weight:600;font-style:italic;src:url(${F('literata/files/literata-latin-600-italic.woff2')})}
@font-face{font-family:Plex;font-weight:400;src:url(${F('ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2')})}
@font-face{font-family:Plex;font-weight:500;src:url(${F('ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2')})}
@font-face{font-family:Plex;font-weight:600;src:url(${F('ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2')})}
@font-face{font-family:Mono;font-weight:600;src:url(${F('ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2')})}
@font-face{font-family:Ar;font-weight:700;src:url(${F('amiri/files/amiri-arabic-700-normal.woff2')})}`;

const css = (H) => `${fontCSS}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:${H}px;position:relative;overflow:hidden;color:#F4EFE3;font-family:Plex,sans-serif;
 background:radial-gradient(120% 80% at 85% 0%,#163A6B 0%,#0B2545 50%,#071830 100%)}
.ring{position:absolute;border-radius:50%;border:2px solid rgba(201,162,74,.16)}
.r1{width:900px;height:900px;right:-420px;top:-420px}
.r2{width:700px;height:700px;right:-320px;top:-320px;border-style:dashed;border-color:rgba(201,162,74,.10)}
.head{position:absolute;left:80px;top:64px;display:flex;align-items:center;gap:16px}
.head span{font:600 22px Plex;letter-spacing:.32em;color:#C9A24A}
.foot{position:absolute;left:80px;right:80px;bottom:56px;display:flex;justify-content:space-between;align-items:center;font:500 22px Plex;color:#9FB0C8}
.foot .pg{font-family:Mono;letter-spacing:.06em}
.foot .sw{color:#C9A24A;font-weight:600}
.c{position:absolute;left:80px;right:80px;top:180px;bottom:170px;display:flex;flex-direction:column;justify-content:center;gap:34px}
.k{font:600 26px Plex;letter-spacing:.16em;text-transform:uppercase;color:#C9A24A}
.badge{align-self:flex-start;font:600 24px Plex;color:#0B2545;background:#C9A24A;padding:10px 20px;border-radius:999px;letter-spacing:.04em}
h1{font:700 94px/1.07 Lit,serif;letter-spacing:-.01em}
h2{font:600 66px/1.12 Lit,serif}
em{font-style:normal;color:#E2BD62}
p{font-size:35px;line-height:1.45;color:#D9E0EA;max-width:900px}
.stat{font:700 210px/1 Lit,serif;color:#E2BD62;letter-spacing:-.02em}
.stat.m{font-size:170px}
.lab{font:600 46px/1.2 Plex}
.note{font-size:32px;line-height:1.45;color:#A9B8CE;border-left:4px solid #C9A24A;padding-left:24px}
ol{list-style:none;display:grid;gap:28px}
ol li{display:grid;grid-template-columns:64px 1fr;gap:24px;align-items:start;font-size:36px;line-height:1.35}
ol li b{display:grid;place-items:center;width:58px;height:58px;border-radius:50%;background:#C9A24A;color:#0B2545;font:600 28px Mono}
table{border-collapse:collapse;width:100%;font-size:32px}
th{font:600 26px Plex;color:#C9A24A;text-align:right;padding:14px 10px;border-bottom:2px solid rgba(201,162,74,.5);letter-spacing:.06em;text-transform:uppercase}
th:first-child,td:first-child{text-align:left}
td{padding:22px 10px;border-bottom:1px solid rgba(255,255,255,.12);text-align:right;font-family:Mono}
td:first-child{font-family:Plex;font-weight:500}
td.hot{color:#FF8A8A}
.quote{font:600 italic 58px/1.25 Lit,serif;color:#F4EFE3}
.src{font-size:24px;color:#8FA2BD}
.ar{font:700 120px Ar,serif;color:#E2BD62;line-height:1}
.ledger{border:2px solid rgba(201,162,74,.6);border-radius:18px;padding:34px 40px;display:grid;grid-template-columns:auto 1fr auto;gap:30px;align-items:center;background:rgba(255,255,255,.04)}
.ledger .acc{font:600 40px Mono;color:#A9B8CE}.ledger .lib{font:600 44px Plex}.ledger .amt{font:600 46px Mono;color:#FF8A8A}
.house{display:grid;gap:14px}
.roof{height:110px;background:rgba(46,139,87,.28);clip-path:polygon(50% 0,100% 100%,0 100%);display:grid;place-items:end center;padding-bottom:14px;font:600 28px Plex}
.floors{display:grid;grid-template-columns:1.9fr 1fr;gap:14px}
.wing{border:2px solid rgba(255,255,255,.18);border-radius:16px;padding:18px;display:grid;gap:10px;align-content:start}
.wing h4{font:600 26px Plex;color:#C9A24A;letter-spacing:.04em}
.room{border-radius:10px;padding:12px 16px;font:500 26px Plex}
.cave{border:2px dashed rgba(255,255,255,.28);border-radius:12px;padding:14px 18px;font:500 26px Plex;color:#C8D1DE}
.cover h1{font-size:104px}
.reel .c{top:420px;bottom:420px}
.reel .play{position:absolute;left:80px;top:300px;font:600 26px Plex;letter-spacing:.16em;color:#C9A24A}
`;
const coin = s => `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="none" stroke="#C9A24A" stroke-width="2.5"/><circle cx="32" cy="32" r="24" fill="none" stroke="#C9A24A" stroke-width="1.2" stroke-dasharray="2 3"/><text x="32" y="42" text-anchor="middle" font-family="Lit" font-size="28" font-weight="700" fill="#C9A24A">M</text></svg>`;
const frame = (inner, i, n, H = 1350, extra = '') => `<html><head><meta charset="utf-8"><style>${css(H)}</style></head><body class="${extra}">
<div class="ring r1"></div><div class="ring r2"></div>
<div class="head">${coin(46)}<span>MITHQAL</span></div>
${inner}
<div class="foot"><span>@mithqal.academy</span><span>${n > 1 ? `<span class="pg">${i} / ${n}</span>${i < n ? ' &nbsp;<span class="sw">Glisse →</span>' : ''}` : ''}</span></div></body></html>`;

const T = {
  cover: (k, h, sub) => `<div class="c cover"><div class="k">${k}</div><h1>${h}</h1>${sub ? `<p>${sub}</p>` : ''}</div>`,
  text: (k, h, p) => `<div class="c">${k ? `<div class="k">${k}</div>` : ''}<h2>${h}</h2><p>${p}</p></div>`,
  stat: (n, lab, note, k, m) => `<div class="c">${k ? `<div class="k">${k}</div>` : ''}<div class="stat ${m ? 'm' : ''}">${n}</div><div class="lab">${lab}</div><div class="note">${note}</div></div>`,
  list: (k, h, items, after) => `<div class="c">${k ? `<div class="k">${k}</div>` : ''}<h2>${h}</h2><ol>${items.map((t, i) => `<li><b>${i + 1}</b><span>${t}</span></li>`).join('')}</ol>${after ? `<p>${after}</p>` : ''}</div>`,
  cta: (h, p, src) => `<div class="c">${coin(120)}<h2>${h}</h2><p>${p}</p>${src ? `<div class="src">${src}</div>` : ''}</div>`,
  raw: (html) => `<div class="c">${html}</div>`,
};

const POSTS = [
  { id: '01-histoire-mithqal', slides: [
    T.cover('Histoire de la monnaie', 'Sous Moulay Ismaïl, <em>1 mithqal = 10 dirhams.</em>', 'L’histoire du nom de cette académie.'),
    T.text('Marrakech, 1607', 'Une pièce marocaine depuis plus de quatre siècles', 'Sous le sultan saadien Zaydân an-Nâsir, un mithqal d’argent est déjà frappé à Marrakech.'),
    T.stat('×10', '1 mithqal valait 10 dirhams', 'Sous Moulay Ismaïl (1672-1727), le dirham légal est instauré avec son décuple : le mithqal.', 'Le mithqal et le dirham'),
    T.raw(`<div class="ar">مثقال</div><h2>Mesurer la valeur, <em>au poids juste</em></h2><p>Le mot désigne aussi une unité de poids pour l’or et l’argent. Mesurer la valeur, c’est exactement le métier de la finance d’entreprise.</p>`),
    T.list('Ce que tu trouveras ici', 'Mithqal, l’académie', ['Comptabilité CGNC, fiscalité 2026, analyse financière', 'Des cas réels chiffrés, pas de théorie hors-sol', '9 modules et des simulateurs, gratuits']),
    T.cta('Suis <em>@mithqal.academy</em>', 'Chaque semaine : la finance d’entreprise marocaine, expliquée simplement.', 'Source : musée de Bank Al-Maghrib, « Les empires chérifiens ».'),
  ]},
  { id: '02-fiscalite-2026', slides: [
    T.cover('Fiscalité 2026', 'Tu cites encore <em>31 % d’IS</em> ? Mauvaise nouvelle.', 'Les 6 chiffres à jour. Enregistre ce post.'),
    T.stat('20 %', 'IS si bénéfice inférieur à 100 M MAD', 'Un taux unique sur tout le bénéfice. Le barème progressif, c’est fini.', 'Impôt sur les sociétés'),
    T.stat('35 %', 'IS à partir de 100 M MAD de bénéfice', '40 % pour les banques et les assurances.', 'Impôt sur les sociétés'),
    T.stat('20 / 10', 'Les deux seuls taux de TVA', 'Les taux de 7 % et 14 % ont été supprimés par la réforme 2024-2026.', 'TVA', true),
    T.stat('40 000', 'MAD par an exonérés d’IR', 'L’ancien seuil était de 30 000 MAD.', 'Impôt sur le revenu', true),
    T.stat('37 %', 'Taux marginal d’IR', 'Au-delà de 180 000 MAD par an. L’ancien taux était de 38 %.', 'Impôt sur le revenu'),
    T.stat('0,25 %', 'Cotisation minimale du chiffre d’affaires', 'Plancher de 3 000 MAD, due même en cas de perte.', 'Cotisation minimale', true),
    T.cta('Enregistre ce post', 'Puis teste tes réflexes dans le défi chrono de l’Académie Mithqal. Lien en bio.', 'Source : CGI 2026 et loi de finances 2026. Vérifie toujours le texte officiel.'),
  ]},
  { id: '03-rentable-faillite', slides: [
    T.cover('Analyse financière', 'Cette entreprise gagne de l’argent. <em>Et elle va faire faillite.</em>', 'Le coupable a trois lettres.'),
    T.stat('+2,9 M', 'de bénéfice en 2026', 'Sur le papier, Riad Distribution est rentable.', 'Le compte de résultat', true),
    T.stat('−28,5 M', 'de trésorerie nette', 'Et pourtant, elle vit à découvert.', 'La trésorerie', true),
    T.text('Le coupable', 'Le <em>BFR</em>', 'Le besoin en fonds de roulement, c’est l’argent bloqué dans les stocks et chez les clients avant de revenir en caisse. Quand l’entreprise grandit vite, il grossit encore plus vite.'),
    T.raw(`<div class="k">La formule à retenir</div><h2>Trésorerie nette = <em>FR − BFR</em></h2><p>9,5 M de fonds de roulement − 38 M de BFR = −28,5 M de trésorerie nette.</p>`),
    T.cta('Rentable ne veut pas dire solvable', 'Joue avec le simulateur BFR gratuit de l’Académie Mithqal. Lien en bio.'),
  ]},
  { id: '04-maison-cgnc', slides: [
    T.cover('Plan comptable marocain', 'Les 9 classes du CGNC <em>en une seule image.</em>', 'Si tu sais dessiner cette maison, tu maîtrises la logique.'),
    T.raw(`<div class="house"><div class="roof">Classe 8 · Résultats : le toit</div><div class="floors"><div class="wing"><h4>LE BILAN · LA PHOTO</h4>
      <div class="room" style="background:rgba(201,162,74,.22)">1 · Financement permanent</div><div class="room" style="background:rgba(79,176,186,.22)">2 · Actif immobilisé</div><div class="room" style="background:rgba(79,176,186,.22)">3 · Actif circulant</div><div class="room" style="background:rgba(201,162,74,.22)">4 · Passif circulant</div><div class="room" style="background:rgba(46,139,87,.3)">5 · Trésorerie</div></div>
      <div class="wing"><h4>LE CPC · LE FILM</h4><div class="room" style="background:rgba(227,107,121,.3);padding:40px 16px">6 · Charges<br><span style="font-size:22px;color:#C8D1DE">ce qui sort</span></div><div class="room" style="background:rgba(46,139,87,.3);padding:40px 16px">7 · Produits<br><span style="font-size:22px;color:#C8D1DE">ce qui rentre</span></div></div></div>
      <div class="cave">Classe 0 · la cave : engagements hors bilan</div></div>`),
    T.list('Classes 1 à 5', 'Le bilan : <em>la photo au 31/12</em>', ['Classe 1 : capital, réserves, emprunts', 'Classes 2 et 3 : immobilisations, stocks, clients', 'Classes 4 et 5 : fournisseurs, État, banque, caisse']),
    T.text('Classes 6 et 7', 'Le CPC : <em>le film de l’année</em>', 'La classe 6 enregistre ce qui sort (achats, salaires, dotations). La classe 7 enregistre ce qui rentre (ventes, produits financiers). La différence, c’est le résultat.'),
    T.text('Classes 8 et 0', 'Le toit et la cave', 'La classe 8 regroupe les résultats : elle couvre toute la maison. La classe 0 garde les engagements hors bilan, comme les cautions et les garanties.'),
    T.cta('Redessine-la de mémoire', 'Quelle classe oublies-tu toujours ? Dis-le en commentaire. Le cours complet est dans le module 1 de l’Académie, lien en bio.'),
  ]},
  { id: '05-resultat-fiscal', slides: [
    T.cover('Fiscalité', '2 millions de bénéfice. <em>410 000 d’impôt.</em>', 'Le calcul en 4 étapes.'),
    T.stat('2 000 000', 'Résultat comptable avant impôt', 'Le point de départ : le bénéfice de Sahel Services en 2026.', 'Étape 1', true),
    T.list('Étape 2', 'Les réintégrations : <em>+145 000</em>', ['Pénalités : +25 000', 'Don non reconnu : +30 000', 'Amortissement excédentaire du véhicule : +40 000', 'Provision injustifiée : +50 000']),
    T.list('Étape 3', 'Les déductions : <em>−95 000</em>', ['Dividendes reçus : −80 000', 'Reprise de provision déjà taxée : −15 000'], 'Résultat fiscal : 2 000 000 + 145 000 − 95 000 = 2 050 000 MAD.'),
    T.stat('410 000', 'd’IS : 2 050 000 × 20 %', 'La cotisation minimale (0,25 % du CA, soit 75 000) est plus faible : c’est l’IS qui est dû.', 'Étape 4', true),
    T.cta('Enregistre ce calcul', 'Le cas complet et son quiz sont dans le module 2 de l’Académie Mithqal. Lien en bio.'),
  ]},
  { id: '06-cas-riad', slides: [
    T.cover('Étude de cas', '<em>+37,5 %</em> de chiffre d’affaires. <em>−28,5 M</em> de trésorerie.', 'Riad Distribution : croissance n’est pas santé.'),
    T.raw(`<div class="k">Les chiffres, en M MAD</div><h2>Trois ans de croissance…&nbsp;à&nbsp;crédit</h2><table><tr><th></th><th>2024</th><th>2025</th><th>2026</th></tr><tr><td>Chiffre d’affaires</td><td>80,0</td><td>92,0</td><td>110,0</td></tr><tr><td>BFR</td><td>18,0</td><td>25,0</td><td class="hot">38,0</td></tr><tr><td>Trésorerie nette</td><td>−11,0</td><td>−17,0</td><td class="hot">−28,5</td></tr><tr><td>Délai clients (jours)</td><td>60</td><td>68</td><td class="hot">79</td></tr></table>`),
    T.stat('38 M', 'de BFR en 2026, contre 18 M en 2024', 'Le BFR a doublé : stocks et créances clients absorbent toute la croissance.', 'Le vrai problème'),
    T.stat('79 j', 'de délai clients', 'La loi 69-21 fixe 60 jours par défaut. Chaque jour de retard se paie en découvert.', 'Le délai qui coûte'),
    T.raw(`<div class="k">Le diagnostic en une phrase</div><div class="quote">« Sans action, la société sera bloquée par sa banque avant de l’être par sa rentabilité. »</div><p>Tu aurais recommandé quoi ? Réponds en commentaire avant de glisser.</p>`),
    T.list('3 recommandations chiffrées', 'Ce que je dirais au DAF', ['Délai clients à 60 jours : environ <em>+7 M</em> de trésorerie', 'Stocks à 55 jours : environ <em>+4 M</em>', 'Consolider le découvert en crédit moyen terme'], 'Refais ce cas sur le simulateur gratuit. Lien en bio.'),
  ]},
  { id: '07-quiz-caisse', slides: [
    T.raw(`<div class="k">Quiz · Normal ou anomalie ?</div><div class="ledger"><span class="acc">5161</span><span class="lib">Caisse</span><span class="amt">18 500 C</span></div><h2>Une caisse avec un solde <em>créditeur</em> de 18 500 MAD.</h2><p>Normal ou anomalie ? Réponds en commentaire avant de lire la légende.</p>`),
  ]},
  { id: '08-plf-2027', slides: [
    T.raw(`<div class="badge">PROJET DE LOI DE FINANCES 2027</div><h1 style="font-size:96px">Jusqu’à <em>500 MAD</em> de plus par mois ?</h1><p>Ce que le PLF 2027 pourrait changer sur ton salaire.</p>`),
    T.raw(`<div class="badge">PROJET · SOUS RÉSERVE DU VOTE</div><div class="k">Mesure 1</div><div class="stat m">60 000</div><div class="lab">MAD par an exonérés d’IR, contre 40 000 en 2026</div><div class="note">Le barème démarrerait à 10 % au-delà de 60 000 MAD de revenu net imposable.</div>`),
    T.raw(`<div class="badge">PROJET · SOUS RÉSERVE DU VOTE</div><div class="k">Mesure 2</div><div class="stat m">45 %</div><div class="lab">de frais professionnels déductibles</div><div class="note">Contre 35 % ou 25 % aujourd’hui, toujours plafonnés à 35 000 MAD par an.</div>`),
    T.raw(`<div class="badge">PROJET · SOUS RÉSERVE DU VOTE</div><h2>Le gain mensuel estimé</h2><table><tr><th>Brut mensuel</th><th>IR 2026</th><th>IR PLF 2027</th><th>Gain</th></tr><tr><td>8 000 MAD</td><td>277</td><td>0</td><td style="color:#7FE0A8">+277</td></tr><tr><td>10 000 MAD</td><td>602</td><td>159</td><td style="color:#7FE0A8">+443</td></tr><tr><td>15 000 MAD</td><td>2 068</td><td>1 568</td><td style="color:#7FE0A8">+500</td></tr></table><div class="src">Estimation pédagogique : célibataire, sans charges de famille ni retraite complémentaire.</div>`),
    T.cta('Simule ton propre salaire', 'Le simulateur 2026 / PLF 2027 est gratuit dans l’Académie Mithqal. Lien en bio.', 'Projet de loi : les montants peuvent changer pendant le vote. À confirmer à la publication au Bulletin officiel.'),
  ]},
];

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const files = [];
  const LIST = process.env.BATCH ? require(path.resolve(process.env.BATCH))(T) : POSTS;
  for (const post of LIST) {
    const H = post.reel ? 1920 : 1350, n = post.slides.length;
    const page = await b.newPage({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    for (let i = 0; i < n; i++) {
      const html = frame(post.slides[i].replace(/(\d) (?=\d{3}\b)/g, '$1&nbsp;').replace(/ (%|\?|:|!|MAD\b|M\b|j\b)/g, '&nbsp;$1'), i + 1, n, H, post.reel ? 'reel' : '');
      const tmp = path.join(OUT, '_tmp.html'); fs.writeFileSync(tmp, html);
      await page.goto('file://' + tmp, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const over = await page.evaluate(() => { const c = document.querySelector('.c'); return c ? c.scrollHeight > c.clientHeight + 2 : false; });
      const f = path.join(OUT, `post-${post.id}-${String(i + 1).padStart(2, '0')}.png`);
      await page.screenshot({ path: f }); files.push(f);
      fs.writeFileSync(f.replace(/\.png$/, '.txt'), await page.evaluate(() => { const c = document.querySelector('.c'); return c ? c.innerText : ''; }));
      if (over) console.log('OVERFLOW', f);
    }
    await page.close();
  }
  await b.close();
  console.log(files.length, 'images');
})();
