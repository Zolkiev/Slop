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
];
