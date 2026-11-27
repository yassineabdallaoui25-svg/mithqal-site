module.exports = (T) => {
  const ratio = (k, h, v, note) => T.raw(`<div class="k">${k}</div><h2>${h}</h2><div class="stat m">${v}</div><div class="note">${note}</div>`);
  const qa = (n, q, a) => T.raw(`<div class="k">Question ${n} / 5</div><h2>${q}</h2><p>${a}</p>`);
  const tbl = (rows, head, cls) => `<style>td.tot{color:#E2BD62;font-weight:600;border-top:2px solid rgba(201,162,74,.5)}.opt td{text-align:left;font:500 34px/1.35 Plex;padding:20px 10px}.opt td:first-child{font:600 36px Mono;color:#C9A24A;width:70px}</style><table${cls ? ` class="${cls}"` : ''}>${head ? `<tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>` : ''}${rows.map(r => `<tr>${r.map((c, i) => `<td${r.cls ? ` class="${r.cls}"` : ''}>${c}</td>`).join('')}</tr>`).join('')}</table>`;
  const tot = (a) => { a.cls = 'tot'; return a; };
  const quiz = (k, line, h, opts, q) => T.raw(`<div class="k">${k}</div>${line || ''}<h2 style="font-size:58px">${h}</h2>${tbl(opts, null, 'opt')}<p>${q}</p>`);

  return [
  { id: '09-ratios-banquier', slides: [
    T.cover('Analyse financière', 'Les 5 ratios que ton banquier calcule <em>avant de te répondre.</em>', 'Ta checklist avant une demande de crédit. Enregistre.'),
    ratio('Ratio 1 · Autonomie financière', 'Capitaux propres <em>÷</em> total bilan', '≥ 20 %', 'En dessous, l’entreprise vit surtout de l’argent des autres. Repère usuel, à adapter au secteur.'),
    ratio('Ratio 2 · Capacité de remboursement', 'Dettes financières <em>÷</em> CAF', '< 4 ans', 'Combien d’années de capacité d’autofinancement pour rembourser toute la dette. Au-delà, le dossier se complique.'),
    ratio('Ratio 3 · Liquidité générale', 'Actif circulant <em>÷</em> passif circulant', '> 1', 'Les actifs à court terme doivent couvrir les dettes à court terme. En dessous de 1, alerte.'),
    ratio('Ratio 4 · Délai clients', 'Clients TTC <em>÷</em> CA TTC × 360', '≤ 60 j', 'Le délai légal par défaut de la loi 69-21. Chaque jour au-delà se finance par découvert.'),
    ratio('Ratio 5 · Taux d’EBE', 'EBE <em>÷</em> chiffre d’affaires', 'Secteur', 'Pas de norme universelle : compare-le à tes concurrents et à tes années passées. C’est la tendance qui compte.'),
    T.cta('Calcule-les sur tes chiffres', 'Le module analyse financière de l’Académie Mithqal est gratuit. Lien en bio.', 'Repères pédagogiques usuels, pas des normes réglementaires.'),
  ]},
  { id: '10-quiz-tva', slides: [
    quiz('Quiz · Écriture comptable', '', 'Achat de marchandises à crédit : <em>12 000 MAD TTC</em>, TVA 20 %.', [
      ['A', '6111 débit 12 000 · 4411 crédit 12 000'],
      ['B', '6111 débit 10 000 · 34552 débit 2 000 · 4411 crédit 12 000'],
      ['C', '6111 débit 10 000 · 4411 crédit 10 000'],
    ], 'A, B ou C ? Réponds en commentaire avant de lire la légende.'),
  ]},
  { id: '11-soldes-gestion', slides: [
    T.cover('Lire un compte de résultat', 'Le résultat net ne dit pas tout. <em>L’ESG raconte le reste.</em>', 'Les 7 soldes que l’analyste lit avant le bénéfice.'),
    T.list('Le tableau de formation des résultats', 'Du chiffre d’affaires au <em>résultat net</em>', ['Marge brute sur ventes en l’état', 'Production de l’exercice', 'Valeur ajoutée', 'Excédent brut d’exploitation (EBE)', 'Résultat d’exploitation', 'Résultat courant', 'Résultat net']),
    T.text('Le solde clé n°1', 'La <em>valeur ajoutée</em>', 'Ce que l’entreprise crée vraiment : sa production moins ce qu’elle consomme à l’extérieur. C’est elle qui paie les salariés, l’État, les banques et les actionnaires.'),
    T.text('Le solde clé n°2', 'L’<em>EBE</em>', 'La performance de l’exploitation avant amortissements, frais financiers et impôt sur les sociétés. Le chiffre préféré des banquiers.'),
    T.raw(`<div class="k">Exemple, en M MAD</div><h2>De la VA à l’EBE</h2>${tbl([['Valeur ajoutée', '4,0'], ['− Impôts et taxes', '0,1'], ['− Charges de personnel', '2,5'], tot(['= EBE', '1,4']), ['− Dotations d’exploitation', '0,6'], tot(['= Résultat d’exploitation', '0,8'])])}`),
    T.cta('Ne t’arrête plus au résultat net', 'Les soldes de gestion sont expliqués pas à pas dans l’Académie Mithqal. Lien en bio.'),
  ]},
  { id: '12-voiture-tourisme', slides: [
    T.cover('Fiscalité', 'Ta société achète une voiture à 400 000 MAD. <em>Le fisc n’en reconnaît que 300 000.</em>'),
    T.stat('300 000', 'MAD TTC par véhicule de tourisme', 'Plafond de la base d’amortissement déductible. Le taux fiscal admis est de 20 % par an, soit 5 ans.', 'La règle', true),
    T.list('Le calcul', 'Ce qui se passe <em>chaque année</em>', ['Amortissement comptable : 400 000 × 20 % = 80 000', 'Amortissement déductible : 300 000 × 20 % = 60 000', 'À réintégrer au résultat fiscal : 20 000']),
    T.stat('100 000', 'MAD réintégrés en 5 ans', 'Soit 20 000 MAD d’IS en plus au taux de 20 %. Le coût caché d’une belle voiture de fonction.', 'L’addition', true),
    T.text('Double peine', 'Et la <em>TVA</em> ?', 'La TVA payée sur une voiture de tourisme n’est pas récupérable, sauf exceptions comme la location ou le transport public de personnes. Elle s’ajoute au coût du véhicule.'),
    T.cta('Pense fiscal avant d’acheter', 'Les réintégrations sont détaillées dans le module fiscalité de l’Académie Mithqal. Lien en bio.', 'Source : CGI 2026. Vérifie toujours le texte officiel.'),
  ]},
  { id: '13-questions-entretien', slides: [
    T.cover('Entretien comptable', '5 questions qui éliminent <em>la moitié des candidats.</em>', 'Lis la question, réponds dans ta tête, puis glisse.'),
    qa(1, 'Une entreprise rentable peut-elle faire faillite ?', '<em>Oui.</em> Le résultat mesure la performance, pas la trésorerie. Si le BFR explose, la caisse se vide malgré le bénéfice.'),
    qa(2, 'Une caisse peut-elle être créditrice ?', '<em>Jamais.</em> On ne sort pas plus d’espèces qu’il n’y en a. Un solde créditeur signale une erreur ou une recette non enregistrée.'),
    qa(3, 'Amortissement ou provision ?', 'L’amortissement constate une perte de valeur <em>irréversible</em> liée à l’usage ou au temps. La provision couvre une perte <em>probable</em> et peut être reprise.'),
    qa(4, 'TVA : encaissement ou débits ?', 'Au Maroc, le régime de droit commun est <em>l’encaissement</em> : la TVA est due quand le client paie. Le régime des débits est sur option.'),
    qa(5, 'FR, BFR, trésorerie : le lien ?', 'Le FR finance le cycle, le BFR le consomme. <em>Trésorerie nette = FR − BFR.</em> Si tu sais l’expliquer avec un exemple, tu passes.'),
    T.cta('Laquelle t’a piégé ?', 'Dis-le en commentaire. 24 autres questions t’attendent dans le défi chrono de l’Académie Mithqal. Lien en bio.'),
  ]},
  { id: '14-delais-paiement', slides: [
    T.cover('Loi 69-21', 'Ton client te paie à 150 jours ? <em>La loi plafonne à 120.</em>', 'Les délais de paiement à connaître.'),
    T.stat('60 j', 'délai légal par défaut', 'Si le contrat ne prévoit rien : 60 jours à compter de la livraison ou de la prestation.', 'Sans accord'),
    T.stat('120 j', 'maximum si le contrat le prévoit', 'Les parties peuvent convenir d’un délai plus long, sans jamais dépasser 120 jours.', 'Avec accord'),
    T.text('Ce qui a changé', 'Le retard a <em>un prix</em>', 'Les entreprises concernées doivent déclarer leurs retards de paiement et payer une amende proportionnelle au montant impayé et à la durée du retard.'),
    T.text('Le réflexe de l’analyste', 'Suis ton <em>délai clients</em>', 'Créances clients TTC ÷ CA TTC × 360. Au-delà de 60 jours, chaque jour de retard pèse sur ta trésorerie et sur ta banque.'),
    T.cta('Combien de jours chez toi ?', 'Dis-le en commentaire. Le cas Riad Distribution montre l’impact chiffré, dans l’Académie Mithqal. Lien en bio.', 'Source : loi 69-21 modifiant le Code de commerce.'),
  ]},
  { id: '15-quiz-prorata', slides: [
    quiz('Quiz · Amortissement', '', 'Camion acheté <em>300 000 MAD HT</em> le 1<sup>er</sup> juillet 2026, linéaire sur 5 ans.', [
      ['A', 'Dotation 2026 : 60 000 MAD'],
      ['B', 'Dotation 2026 : 30 000 MAD'],
      ['C', 'Dotation 2026 : 25 000 MAD'],
    ], 'A, B ou C ? Réponds en commentaire avant de lire la légende.'),
  ]},
  { id: '16-cout-salarie', slides: [
    T.cover('Paie au Maroc', 'Brut : 10 000 MAD. <em>Coût : 11 750. Net : 8 904.</em>', 'Où passe la différence, ligne par ligne.'),
    T.raw(`<div class="k">Côté employeur</div><h2>+ 1 750 MAD de charges</h2>${tbl([['Allocations familiales · 6,40 %', '640'], ['Court terme · 1,05 % (plafond 6 000)', '63'], ['Long terme · 7,93 % (plafond 6 000)', '476'], ['AMO · 4,11 %', '411'], ['Formation professionnelle · 1,60 %', '160'], tot(['Coût total employeur', '11 750'])])}`),
    T.raw(`<div class="k">Côté salarié</div><h2>− 1 096 MAD de retenues</h2>${tbl([['CNSS · 4,48 % (plafond 6 000)', '269'], ['AMO · 2,26 %', '226'], ['IR 2026 (barème, frais pro 25 %)', '602'], tot(['Net à payer', '8 904'])])}`),
    T.stat('2 846', 'MAD entre le coût et le net', 'Soit 24 % du coût employeur. Le plafond de 6 000 MAD protège les hauts salaires sur une partie de la CNSS, pas sur l’AMO.', 'L’écart', true),
    T.cta('Simule ton propre salaire', 'Le simulateur IR 2026 est gratuit dans l’Académie Mithqal. Lien en bio.', 'Estimation pédagogique : taux CNSS/AMO 2026, célibataire, sans retraite complémentaire.'),
  ]},
  { id: '17-auto-entrepreneur', slides: [
    T.cover('Freelance au Maroc', 'Auto-entrepreneur : <em>1 % d’impôt.</em> Jusqu’à ce piège.'),
    T.stat('1 %', 'du CA encaissé pour les services', '0,5 % pour le commerce, l’industrie et l’artisanat. Cet impôt remplace l’IR.', 'Le taux'),
    T.stat('200 000', 'MAD de CA max par an en services', '500 000 MAD en commerce et industrie. Le statut ne tombe que si le plafond est dépassé deux années de suite.', 'Le plafond', true),
    T.stat('30 %', 'retenue à la source', 'Sur la part du CA réalisé avec un même client au-delà de 80 000 MAD par an, en prestations de services.', 'Le piège'),
    T.text('La leçon', 'Un seul gros client <em>tue l’avantage</em>', 'Diversifie tes clients, ou compare avec une SARL : IS à 20 %, mais comptabilité complète obligatoire.'),
    T.cta('Freelance ou SARL ?', 'Pose ta question en commentaire. La fiscalité des petites structures est dans l’Académie Mithqal. Lien en bio.', 'Source : guide DGI 2026 relayé par Le Matin. Vérifie ta situation avec un professionnel.'),
  ]},
  { id: '18-rapprochement', slides: [
    T.cover('Clôture mensuelle', 'La banque dit 152 000. Ta compta dit 140 000. <em>Qui a raison ?</em>', 'Le rapprochement bancaire en 4 étapes.'),
    T.list('La méthode', '4 étapes, <em>dans l’ordre</em>', ['Pointer les opérations présentes des deux côtés', 'Relevé seul (frais, agios, virements reçus) : à comptabiliser', 'Compta seule (chèques émis non encaissés) : à justifier', 'Les deux soldes rapprochés doivent être égaux']),
    T.raw(`<div class="k">L’exemple, en MAD</div><h2>Les deux ont raison</h2>${tbl([['Solde relevé bancaire', '152 000'], ['− Chèque émis non encaissé', '15 000'], tot(['= Solde rapproché', '137 000']), ['Solde comptable 5141', '140 000'], ['− Frais bancaires non comptabilisés', '3 000'], tot(['= Solde rapproché', '137 000'])])}`),
    T.text('Le signal d’alerte', 'L’écart <em>qui traîne</em>', 'Un chèque ancien jamais encaissé, un écart sans explication d’un mois sur l’autre : ce sont les premières lignes qu’un auditeur demande à voir.'),
    T.cta('Fais-le chaque mois', 'Pas seulement au 31/12. Le cycle de clôture est détaillé dans l’Académie Mithqal. Lien en bio.'),
  ]},
  { id: '19-quiz-stock', slides: [
    quiz('Quiz · Clôture', '', 'Le stock final 2026 est <em>surévalué de 100 000 MAD</em>. Effet sur les résultats ?', [
      ['A', '2026 : +100 000 · 2027 : −100 000'],
      ['B', 'Aucun effet sur le résultat'],
      ['C', '2026 : −100 000 · 2027 : +100 000'],
    ], 'A, B ou C ? Réponds en commentaire avant de lire la légende.'),
  ]},
  { id: '20-etats-synthese', slides: [
    T.cover('CGNC', 'Pas 2 états financiers. <em>5.</em>', 'Les états de synthèse qu’un comptable marocain doit connaître.'),
    T.list('Les états de synthèse', 'Le dossier complet', ['Bilan : le patrimoine à une date', 'CPC : charges et produits de l’exercice', 'ESG : soldes de gestion et CAF', 'Tableau de financement : emplois et ressources', 'ETIC : les informations complémentaires']),
    T.text('Le plus sous-estimé', 'L’<em>ESG</em>', 'Il calcule la valeur ajoutée, l’EBE et la capacité d’autofinancement. C’est là que l’analyste commence, pas au résultat net.'),
    T.text('Le plus ignoré', 'L’<em>ETIC</em>', 'Méthodes d’évaluation, engagements, dérogations : les notes qui changent la lecture des chiffres. Un bon auditeur commence souvent par là.'),
    T.cta('Lequel ne sais-tu pas lire ?', 'Dis-le en commentaire. Les 5 états sont expliqués dans l’Académie Mithqal. Lien en bio.'),
  ]},
  ];
};
