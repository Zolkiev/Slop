// Ère 1 — L'Épée dans la Roche. Ascension d'Arthur, légitimité fragile.
// Format de carte : voir docs/DESIGN.md §3.

export const roche = [
  {
    id: 'roche.merlin.couronne',
    era: 'roche',
    speaker: 'Merlin',
    text: "L'épée a quitté la pierre dans ta main. Proclameras-tu ton droit divin, ou laisseras-tu les barons t'élire ?",
    left: {
      label: 'Droit divin',
      effects: { foi: +8, couronne: +6, chevalerie: -6 },
    },
    right: {
      label: 'Les barons voteront',
      effects: { couronne: +8, chevalerie: +6, magie: -6 },
    },
    weight: 3,
  },
  {
    id: 'roche.eveque.paien',
    era: 'roche',
    speaker: "L'Évêque",
    text: "Le vieux Merlin murmure à ton oreille des sorts païens, mon roi. L'Église exige que tu le chasses de la cour.",
    left: {
      label: 'Chasser Merlin',
      effects: { foi: +12, magie: -14 },
      flags: ['merlin.offense'],
    },
    right: {
      label: 'Merlin reste',
      effects: { magie: +10, foi: -10 },
    },
    weight: 2,
  },
  {
    id: 'roche.dame.lac',
    era: 'roche',
    speaker: 'La Dame du Lac',
    text: "Ton épée s'est brisée. Je puis t'en offrir une forgée à Avalon — Excalibur. Accepteras-tu ce présent des fées ?",
    unique: true,
    left: {
      label: 'Accepter Excalibur',
      effects: { magie: +10, chevalerie: +8 },
      flags: ['relique.excalibur'],
    },
    right: {
      label: 'Refuser le sortilège',
      effects: { foi: +8, chevalerie: -4 },
    },
    weight: 2,
  },
  // ---- Chaîne : la naissance de Mordred (posée tôt, éclatera à l'ère de la Chute) ----
  {
    id: 'roche.morgane.nuit',
    era: 'roche',
    speaker: 'Morgane',
    text: "La nuit est froide, mon roi, et je ne suis pas si lointaine parente. M'ouvriras-tu ta porte ?",
    unique: true,
    left: {
      label: 'Ouvrir la porte',
      effects: { magie: +8, foi: -8 },
      flags: ['mordred.concu'],
    },
    right: {
      label: 'La renvoyer',
      effects: { foi: +6, magie: -6 },
    },
    weight: 1,
  },
  // ---- Cartes de remplissage (toujours éligibles) : garantissent le non-blocage ----
  {
    id: 'roche.filler.impots',
    era: 'roche',
    filler: true,
    speaker: 'Keu',
    text: "Les coffres de la couronne sonnent creux. Lèverai-je un nouvel impôt sur les récoltes ?",
    left: { label: 'Lever l’impôt', effects: { couronne: +6, chevalerie: +4 } },
    right: { label: 'Épargner le peuple', effects: { couronne: -4, foi: +5 } },
    weight: 1,
  },
  {
    id: 'roche.filler.tournoi',
    era: 'roche',
    filler: true,
    speaker: 'Un héraut',
    text: "Un tournoi rassemblerait les chevaliers errants sous ta bannière. En ordonnes-tu un ?",
    left: { label: 'Grand tournoi', effects: { chevalerie: +7, couronne: -3 } },
    right: { label: 'Trop coûteux', effects: { couronne: +4, chevalerie: -4 } },
    weight: 1,
  },
];
