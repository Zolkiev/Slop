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
  {
    id: 'roche.uther.doute',
    era: 'roche',
    speaker: 'Un baron',
    text: "On murmure que tu n'es pas le fils d'Uther, mais un bâtard placé là par le sorcier. Feras-tu taire la rumeur ?",
    unique: true,
    left: {
      label: 'Punir les médisants',
      effects: { couronne: +6, chevalerie: -5 },
    },
    right: {
      label: 'Que Merlin témoigne',
      effects: { magie: +7, couronne: -3, foi: -3 },
    },
    weight: 2,
  },
  {
    id: 'roche.lot.defi',
    era: 'roche',
    speaker: 'Le roi Lot',
    text: "Un garçon sorti d'une pierre ne régnera pas sur moi. Orcanie se soulève — à moins que tu n'achètes ma loyauté.",
    unique: true,
    left: {
      label: 'La guerre, donc',
      effects: { chevalerie: +8, couronne: -6 },
    },
    right: {
      label: 'Négocier son allégeance',
      effects: { couronne: +6, chevalerie: -6 },
    },
    weight: 2,
  },
  {
    id: 'roche.fourreau',
    era: 'roche',
    speaker: 'La Dame du Lac',
    text: "L'épée tranche, mais le Fourreau garde. Tant que tu le porteras, ton sang ne coulera pas. Le veux-tu aussi ?",
    unique: true,
    requires: { allFlags: ['relique.excalibur'] },
    left: {
      label: 'Prendre le Fourreau',
      effects: { magie: +8, foi: -6 },
      flags: ['relique.fourreau'],
    },
    right: {
      label: "L'épée me suffit",
      effects: { chevalerie: +5, magie: -4 },
    },
    weight: 2,
  },
  {
    id: 'roche.saxons.fortins',
    era: 'roche',
    speaker: 'Gauvain',
    text: "Les Saxons tâtent nos côtes, Sire. Des fortins de bois sur les falaises les décourageraient — mais videraient tes coffres.",
    unique: true,
    left: {
      label: 'Bâtir les fortins',
      effects: { chevalerie: +6, couronne: -5 },
      flags: ['cote.fortifiee'],
    },
    right: {
      label: 'La mer nous garde',
      effects: { couronne: +4, chevalerie: -6 },
    },
    weight: 1,
  },
  {
    id: 'roche.fee.tribut',
    era: 'roche',
    speaker: 'Une fée',
    text: "Sous les anciens rois, le petit peuple recevait lait et miel à chaque lune. Le nouveau roi honorera-t-il l'usage ?",
    left: {
      label: "Honorer l'usage",
      effects: { magie: +7, foi: -6 },
    },
    right: {
      label: 'Les temps ont changé',
      effects: { foi: +6, magie: -7 },
    },
    weight: 1,
  },
  {
    id: 'roche.keu.charge',
    era: 'roche',
    speaker: 'Keu',
    text: "Je t'ai vu grandir, je t'ai servi avant la pierre. La charge de sénéchal me revient, frère — dis que non pour voir.",
    unique: true,
    left: {
      label: 'Nommer Keu sénéchal',
      effects: { couronne: +4, chevalerie: -3 },
    },
    right: {
      label: 'Le mérite décidera',
      effects: { chevalerie: +5, couronne: -4 },
    },
    weight: 1,
  },
  {
    id: 'roche.couronnement',
    era: 'roche',
    speaker: "L'Évêque",
    text: "Le peuple doit voir Dieu poser la couronne sur ta tête. Un sacre fastueux, en grande cathédrale — et à grands frais.",
    unique: true,
    left: {
      label: 'Sacre fastueux',
      effects: { foi: +7, couronne: +4, magie: -6 },
    },
    right: {
      label: "L'épée m'a déjà sacré",
      effects: { magie: +6, couronne: -3, foi: -5 },
    },
    weight: 2,
  },
  {
    id: 'roche.pelerin.pierre',
    era: 'roche',
    speaker: 'Un pèlerin',
    text: "Des foules viennent toucher la pierre fendue, Sire. Faut-il en faire un sanctuaire… et y poster un percepteur ?",
    left: {
      label: 'Sanctuaire payant',
      effects: { couronne: +5, foi: -4 },
    },
    right: {
      label: 'La pierre reste libre',
      effects: { foi: +5, couronne: -3 },
    },
    weight: 1,
  },
];
