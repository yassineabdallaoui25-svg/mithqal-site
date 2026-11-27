module.exports = (T) => {
  const qa = (n, q, a) => T.raw(`<div class="k">Erreur ${n} / 5</div><h2>${q}</h2><p>${a}</p>`);
  const tbl = (rows, head, cls) => `<style>td.tot{color:#E2BD62;font-weight:600;border-top:2px solid rgba(201,162,74,.5)}.opt td{text-align:left;font:500 34px/1.35 Plex;padding:20px 10px}.opt td:first-child{font:600 36px Mono;color:#C9A24A;width:70px}</style><table${cls ? ` class="${cls}"` : ''}>${head ? `<tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>` : ''}${rows.map(r => `<tr>${r.map((c, i) => `<td${r.cls ? ` class="${r.cls}"` : ''}>${c}</td>`).join('')}</tr>`).join('')}</table>`;
  const tot = (a) => { a.cls = 'tot'; return a; };
  const quiz = (k, line, h, opts, q) => T.raw(`<div class="k">${k}</div>${line || ''}<h2 style="font-size:58px">${h}</h2>${tbl(opts, null, 'opt')}<p>${q}</p>`);

  return [
  { id: '21-seuil-rentabilite', slides: [
    T.cover('Contrôle de gestion', 'Ton entreprise travaille <em>9 mois par an</em> pour rien.', 'Le seuil de rentabilité, expliqué avec un exemple.'),
    T.raw(`<div class="k">L’exemple, en MAD</div><h2>Atelier Nour, une PME fictive</h2>${tbl([['Chiffre d’affaires', '2 000 000'], ['− Charges variables', '1 200 000'], tot(['= Marge sur coût variable', '800 000']), ['− Charges fixes', '600 000'], tot(['= Résultat', '200 000'])])}`),
    T.stat('40 %', 'de taux de marge sur coût variable', '800 000 ÷ 2 000 000. Sur chaque 100 MAD vendus, 40 MAD servent à payer les charges fixes.', 'Étape 1'),
    T.raw(`<div class="k">Étape 2 · La formule</div><h2>Seuil = charges fixes <em>÷</em> taux de MCV</h2><div class="stat m">1,5 M</div><div class="note">600 000 ÷ 40 % = 1 500 000 MAD de chiffre d’affaires pour atteindre un résultat nul.</div>`),
    T.stat('270 j', 'pour atteindre le point mort', '1 500 000 ÷ 2 000 000 × 360 jours. Si l’activité est régulière, le premier dirham de bénéfice arrive fin septembre.', 'Étape 3'),
    T.stat('25 %', 'de marge de sécurité', '500 000 MAD de CA au-dessus du seuil. Une baisse des ventes de plus de 25 % et l’entreprise passe en perte.', 'Étape 4'),
    T.cta('Connais ton point mort', 'Le contrôle de gestion pas à pas est dans l’Académie Mithqal. Lien en bio.', 'Exemple pédagogique, entreprise fictive.'),
  ]},
  { id: '22-quiz-provision', slides: [
    quiz('Quiz · Clôture', '', 'Créance client douteuse : <em>60 000 MAD TTC</em>, TVA 20 %. Perte probable : 40 %. Provision ?', [
      ['A', '24 000 MAD'],
      ['B', '20 000 MAD'],
      ['C', '60 000 MAD'],
    ], 'A, B ou C ? Réponds en commentaire avant de lire la légende.'),
  ]},
  { id: '23-dividendes-2026', slides: [
    T.cover('Fiscalité 2026', '500 000 MAD de bénéfice. <em>355 000 dans ta poche.</em>', 'Ce que l’État prélève avant que l’associé touche un dividende.'),
    T.stat('20 %', 'd’IS sur le bénéfice', '500 000 × 20 % = 100 000 MAD. Taux 2026 pour un bénéfice inférieur à 100 M MAD. Il reste 400 000 à distribuer.', 'Prélèvement 1'),
    T.stat('11,25 %', 'de retenue à la source sur dividendes', '400 000 × 11,25 % = 45 000 MAD, retenus par la société au moment de la distribution.', 'Prélèvement 2', true),
    T.raw(`<div class="k">Le bilan, en MAD</div><h2>De la société à l’associé</h2>${tbl([['Bénéfice avant impôt', '500 000'], ['− IS à 20 %', '100 000'], tot(['= Bénéfice distribuable', '400 000']), ['− Retenue à 11,25 %', '45 000'], tot(['= Net pour l’associé', '355 000'])])}<p>145 000 MAD prélevés au total : 29 % du bénéfice.</p>`),
    T.text('Le détail qui compte', 'C’est la date de <em>distribution</em> qui fixe le taux', 'Depuis la loi de finances 2025, on applique le taux de l’année où le dividende est distribué. 11,25 % en 2026, 10 % prévus en 2027 : sur 400 000, la retenue passerait à 40 000.'),
    T.cta('Pense fiscal avant de distribuer', 'La fiscalité des dirigeants est dans l’Académie Mithqal. Lien en bio.', 'Sources : FNH (OCDE 2026), Meyran Partners, Upsilon Consulting. Hypothèse : réserve légale déjà constituée. Vérifie le CGI.'),
  ]},
  { id: '24-cas-tanja-emballage', slides: [
    T.cover('Étude de cas', '1,2 M MAD pour une machine. <em>Investir ou pas ?</em>', 'Tanja Emballage, PME fictive de Tanger.'),
    T.raw(`<div class="k">Les données</div><h2>Le projet du DAF</h2>${tbl([['Coût de la machine', '1 200 000'], ['Flux nets après impôt par an', '350 000'], ['Durée du projet', '5 ans'], ['Coût du capital', '10 %'], ['Valeur résiduelle', '0']])}`),
    T.stat('3,4 ans', 'pour récupérer la mise', '1 200 000 ÷ 350 000 = 3,43 ans. Simple, mais ce calcul ignore la valeur du temps.', 'Le délai de récupération', true),
    T.stat('+127 000', 'MAD de VAN à 10 %', 'Les 5 flux actualisés valent 1 326 775 MAD, contre 1 200 000 investis. Le projet crée de la valeur.', 'La VAN', true),
    T.stat('14,1 %', 'de TRI', 'Le taux qui annule la VAN. Il dépasse le coût du capital de 10 % : le projet passe le test.', 'Le TRI', true),
    T.stat('−63 000', 'de VAN si les flux tombent à 300 000', 'Une baisse de 14 % des flux suffit à détruire la valeur. Le vrai risque est dans l’hypothèse de flux.', 'Le test de sensibilité', true),
    T.cta('Tu aurais signé ?', 'Réponds en commentaire. Les calculs de VAN et de TRI sont dans l’Académie Mithqal. Lien en bio.', 'Cas pédagogique, entreprise fictive.'),
  ]},
  { id: '25-quiz-cca', slides: [
    quiz('Quiz · Régularisation', '', 'Assurance annuelle de <em>36 000 MAD</em> payée le 1<sup>er</sup> octobre 2026. Montant en charges constatées d’avance au 31/12 ?', [
      ['A', '9 000 MAD'],
      ['B', '27 000 MAD'],
      ['C', '36 000 MAD'],
    ], 'A, B ou C ? Réponds en commentaire avant de lire la légende.'),
  ]},
  { id: '26-assertions-audit', slides: [
    T.cover('Audit', 'L’auditeur ne refait pas tes comptes. <em>Il teste 5 affirmations.</em>', 'Les assertions d’audit, en clair.'),
    T.list('Les assertions', 'Ce que tes comptes <em>affirment</em>', ['Existence : ce qui est inscrit existe', 'Exhaustivité : rien ne manque', 'Évaluation : le bon montant', 'Séparation des exercices : la bonne année', 'Droits et présentation : c’est à toi, bien classé']),
    T.text('Existence et exhaustivité', 'Deux tests <em>en sens inverse</em>', 'Existence : on part du compte et on remonte à la pièce. Exhaustivité : on part de la pièce et on vérifie qu’elle est dans les comptes. Les dettes oubliées se cachent là.'),
    T.text('Évaluation', 'Le bon <em>montant</em>', 'Un stock compté n’est pas un stock bien évalué. L’auditeur regarde le coût, la dépréciation des articles qui ne tournent plus et les provisions clients.'),
    T.text('Séparation des exercices', 'La <em>bonne année</em>', 'Une livraison du 31 décembre facturée le 3 janvier : à quel exercice appartient la vente ? L’auditeur teste les jours autour de la clôture.'),
    T.text('Droits et présentation', 'À toi, et <em>bien rangé</em>', 'Un bien en crédit-bail n’est pas à ton actif. Une dette à long terme qui échoit dans l’année doit être lue comme telle dans l’ETIC.'),
    T.cta('Pense comme un auditeur', 'Le cycle d’audit est détaillé dans l’Académie Mithqal. Lien en bio.'),
  ]},
  { id: '27-erreurs-analyse', slides: [
    T.cover('Analyse financière', '5 erreurs qui faussent <em>ton diagnostic.</em>', 'Même les bons analystes les font. Vérifie les tiennes.'),
    qa(1, 'Mélanger HT et TTC', 'Délai clients = créances <em>TTC</em> ÷ CA <em>TTC</em> × 360. Avec un CA hors taxes, le délai paraît 20 % plus long qu’en réalité.'),
    qa(2, 'Oublier le crédit-bail', 'En CGNC, les biens en crédit-bail ne sont pas au bilan. L’endettement réel est plus élevé que ce que montre le passif : lis l’ETIC.'),
    qa(3, 'Analyser une seule année', 'Un ratio seul ne dit rien. Il faut <em>au moins trois exercices</em> et un point de comparaison dans le secteur.'),
    qa(4, 'Confondre EBE et trésorerie', 'L’EBE ignore la variation du BFR. Une entreprise peut afficher un bel EBE et une trésorerie qui fond.'),
    qa(5, 'Croire la photo du 31/12', 'Le bilan est une photo à une date. Dans une activité saisonnière, le BFR de décembre peut être au plus bas de l’année.'),
    T.cta('Laquelle tu faisais ?', 'Dis-le en commentaire. L’analyse financière complète est dans l’Académie Mithqal. Lien en bio.'),
  ]},
  ];
};
