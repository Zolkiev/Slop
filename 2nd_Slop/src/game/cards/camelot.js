// Ère 2 — L'Âge d'Or de Camelot. La Table Ronde, l'apogée... et ses failles.

export const camelot = [
  {
    id: 'camelot.table.ronde',
    era: 'camelot',
    speaker: 'Merlin',
    text: "Une table ronde, où nul chevalier n'est assis plus haut qu'un autre. La feras-tu bâtir ?",
    unique: true,
    left: {
      label: 'La Table Ronde',
      effects: { chevalerie: +10, couronne: -4 },
      flags: ['table.ronde'],
    },
    right: {
      label: 'Un trône au-dessus des autres',
      effects: { couronne: +8, chevalerie: -6 },
    },
    weight: 3,
  },
  // ---- Chaîne : Lancelot & Guenièvre ----
  {
    id: 'camelot.lancelot.arrive',
    era: 'camelot',
    speaker: 'Lancelot',
    text: "Nul ne manie la lance comme moi, Sire. Accorde-moi une place à ta Table — et près de la reine.",
    unique: true,
    requires: { allFlags: ['table.ronde'] },
    left: {
      label: "L'accueillir",
      effects: { chevalerie: +12, magie: -2 },
      flags: ['lancelot.cour'],
    },
    right: {
      label: 'Se méfier',
      effects: { chevalerie: -4, couronne: +4 },
    },
    weight: 2,
  },
  {
    id: 'camelot.guenievre.rumeur',
    era: 'camelot',
    speaker: 'Keu',
    text: "On chuchote que la reine et Lancelot se voient en secret, mon roi. Ordonnes-tu une enquête ?",
    unique: true,
    requires: { allFlags: ['lancelot.cour'] },
    left: {
      label: 'Enquêter',
      effects: { couronne: +6, chevalerie: -8 },
      flags: ['affaire.exposee'],
    },
    right: {
      label: 'Fermer les yeux',
      effects: { couronne: -6, foi: -4 },
      flags: ['affaire.tue'],
    },
    weight: 2,
  },
  // ---- Amorce de la quête du Graal (mène à l'ère graal) ----
  {
    id: 'camelot.graal.vision',
    era: 'camelot',
    speaker: 'Perceval',
    text: "Une coupe de lumière m'est apparue en songe : le Saint Graal. Enverras-tu la Table à sa quête ?",
    unique: true,
    left: {
      label: 'Lancer la quête',
      effects: { foi: +10, chevalerie: -6 },
      flags: ['graal.quete'],
    },
    right: {
      label: 'Garder mes chevaliers',
      effects: { chevalerie: +6, foi: -8 },
    },
    weight: 2,
  },
  {
    id: 'camelot.filler.justice',
    era: 'camelot',
    filler: true,
    speaker: 'Un paysan',
    text: "Un baron a brûlé mon champ, Sire. Rendras-tu justice contre un puissant ?",
    left: { label: 'Punir le baron', effects: { couronne: +6, chevalerie: -4 } },
    right: { label: 'Ménager le baron', effects: { chevalerie: +4, couronne: -5 } },
    weight: 1,
  },
  {
    id: 'camelot.filler.fete',
    era: 'camelot',
    filler: true,
    speaker: 'Guenièvre',
    text: "Camelot rayonne. Offrons-nous une grande fête pour le peuple ?",
    left: { label: 'Grande fête', effects: { couronne: +6, foi: -3 } },
    right: { label: 'Rester sobre', effects: { foi: +4, couronne: -3 } },
    weight: 1,
  },
  // ---- Suite de la chaîne Lancelot/Guenièvre ----
  {
    id: 'camelot.affaire.eclat',
    era: 'camelot',
    speaker: 'Gauvain',
    text: "Ton enquête a parlé, Sire : la reine et Lancelot, surpris ensemble. La cour retient son souffle. Ta sentence ?",
    unique: true,
    requires: { allFlags: ['affaire.exposee'] },
    left: {
      label: 'Bannir Lancelot',
      effects: { couronne: +6, chevalerie: -10 },
      flags: ['lancelot.banni'],
    },
    right: {
      label: 'Pardonner en secret',
      effects: { chevalerie: +5, couronne: -8, foi: -3 },
    },
    weight: 3,
  },
  {
    id: 'camelot.guenievre.silence',
    era: 'camelot',
    speaker: 'Guenièvre',
    text: "Tu sais, et tu te tais. C'est une bonté — ou un calcul. Que veux-tu de moi, mon époux ?",
    unique: true,
    requires: { allFlags: ['affaire.tue'] },
    left: {
      label: 'Ta loyauté à la couronne',
      effects: { couronne: +5, foi: -4 },
    },
    right: {
      label: 'Que cela cesse, sans bruit',
      effects: { foi: +4, chevalerie: -4 },
    },
    weight: 2,
  },
  {
    id: 'camelot.lancelot.gloire',
    era: 'camelot',
    speaker: 'Keu',
    text: "Lancelot a encore renversé tous tes chevaliers au tournoi. Le peuple scande son nom plus fort que le tien, Sire.",
    requires: { allFlags: ['lancelot.cour'] },
    left: {
      label: 'Célébrer mon champion',
      effects: { chevalerie: +6, couronne: -4 },
    },
    right: {
      label: "L'écarter des tournois",
      effects: { couronne: +4, chevalerie: -5 },
    },
    weight: 1,
  },
  // ---- Merlin & Viviane ----
  {
    id: 'camelot.merlin.viviane',
    era: 'camelot',
    speaker: 'Merlin',
    text: "Elle s'appelle Viviane. Elle veut tout mon savoir, et je le lui donnerai — je pars. À moins que mon roi ne me retienne.",
    unique: true,
    left: {
      label: 'Reste, vieil ami',
      effects: { magie: +6, couronne: -3 },
    },
    right: {
      label: 'Va vers elle',
      effects: { magie: -10, foi: +5 },
      flags: ['merlin.parti'],
    },
    weight: 2,
  },
  // ---- Morgane à la cour ----
  {
    id: 'camelot.morgane.place',
    era: 'camelot',
    speaker: 'Morgane',
    text: "Ta sœur mérite mieux qu'un manoir lointain, frère. Une place au conseil, par exemple. Les familles doivent rester… proches.",
    unique: true,
    left: {
      label: 'Une place au conseil',
      effects: { magie: +7, foi: -6 },
      flags: ['morgane.cour'],
    },
    right: {
      label: 'Loin de Camelot',
      effects: { foi: +5, magie: -7 },
    },
    weight: 2,
  },
  {
    id: 'camelot.cathedrale',
    era: 'camelot',
    speaker: "L'Évêque",
    text: "Camelot resplendit — mais pour la gloire de qui ? Une cathédrale rappellerait au royaume que tout vient de Dieu.",
    unique: true,
    left: {
      label: 'Bâtir la cathédrale',
      effects: { foi: +10, couronne: -7 },
    },
    right: {
      label: 'Les routes d’abord',
      effects: { couronne: +6, foi: -8 },
    },
    weight: 1,
  },
  {
    id: 'camelot.perceval.arrivee',
    era: 'camelot',
    speaker: 'Perceval',
    text: "Sire ! Ma mère m'a caché la chevalerie toute ma vie, alors me voilà. On dit qu'il faut des épreuves ? J'aime les épreuves.",
    unique: true,
    left: {
      label: "L'adouber",
      effects: { chevalerie: +6, magie: +2, couronne: -3 },
    },
    right: {
      label: "Qu'il fasse ses preuves",
      effects: { couronne: +2, chevalerie: -3 },
    },
    weight: 1,
  },
  {
    id: 'camelot.saxons.emissaire',
    era: 'camelot',
    speaker: 'Un émissaire saxon',
    text: "Mon roi Cerdic propose la paix : les terres de l'est contre la fin des raids. Une paix de marchands, mais une paix.",
    unique: true,
    left: {
      label: 'Céder les terres',
      effects: { couronne: +5, chevalerie: -7 },
    },
    right: {
      label: 'Pas un arpent',
      effects: { chevalerie: +6, couronne: -4 },
    },
    weight: 1,
  },
  // ---- Chaîne Mordred : l'enfant grandit (posé à la Roche, éclate à la Chute) ----
  {
    id: 'camelot.mordred.enfant',
    era: 'camelot',
    speaker: 'Morgane',
    text: "L'enfant a tes yeux, frère — et mon sang. L'élèveras-tu à Camelot, sous ton aile, ou l'enverras-tu loin d'ici, où l'on oubliera d'où il vient ?",
    unique: true,
    requires: { allFlags: ['mordred.concu'] },
    left: {
      label: "L'élever à la cour",
      effects: { magie: +4, couronne: +2, foi: -6 },
      flags: ['mordred.eleve'],
    },
    right: {
      label: 'Loin de Camelot',
      effects: { foi: +5, chevalerie: -2, magie: -4 },
      flags: ['mordred.ecarte'],
    },
    weight: 2,
  },
  {
    id: 'camelot.morgane.fourreau',
    era: 'camelot',
    speaker: 'Morgane',
    text: "Ce fourreau qui garde ton sang… un si beau travail de fée, frère. Prête-le-moi une nuit, que j'en admire les runes. Que crains-tu donc ?",
    unique: true,
    requires: { allFlags: ['relique.fourreau', 'morgane.cour'], noneFlags: ['fourreau.perdu'] },
    left: {
      label: 'Le lui prêter une nuit',
      effects: { magie: +6, chevalerie: -6 },
    },
    right: {
      label: 'Jamais',
      effects: { foi: +4, magie: -6 },
    },
    weight: 2,
  },
];
