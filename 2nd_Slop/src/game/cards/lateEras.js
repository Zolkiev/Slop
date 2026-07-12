// Ères 3-5 — Graal, Chute, Avalon. Les chaînes posées plus tôt éclatent ici.

export const graal = [
  {
    id: 'graal.perceval.retour',
    era: 'graal',
    speaker: 'Perceval',
    text: "J'ai vu le Graal, mais mes mains l'ont laissé fuir. Dois-je repartir, au risque de vider ta Table ?",
    unique: true,
    requires: { anyFlags: ['graal.quete'] },
    left: {
      label: 'Repartir',
      effects: { foi: +12, chevalerie: -10 },
    },
    right: {
      label: 'Rentre à Camelot',
      effects: { chevalerie: +8, foi: -8 },
    },
    weight: 2,
  },
  {
    id: 'graal.filler.pelerins',
    era: 'graal',
    filler: true,
    speaker: "L'Évêque",
    text: "Des pèlerins affluent vers Logres. Ouvriras-tu les greniers royaux pour les nourrir ?",
    left: { label: 'Nourrir les pèlerins', effects: { foi: +7, couronne: -5 } },
    right: { label: 'Refermer les greniers', effects: { couronne: +5, foi: -6 } },
    weight: 1,
  },
  {
    id: 'graal.filler.eremite',
    era: 'graal',
    filler: true,
    speaker: 'Un ermite',
    text: "L'ancienne magie s'efface des bois, dit-on. Feras-tu protéger les cercles de pierres ?",
    left: { label: 'Protéger les pierres', effects: { magie: +7, foi: -5 } },
    right: { label: 'Les laisser tomber', effects: { foi: +5, magie: -6 } },
    weight: 1,
  },
];

export const chute = [
  // ---- Éclatement de la chaîne Mordred, posée à l'ère de la Roche ----
  {
    id: 'chute.mordred.revele',
    era: 'chute',
    speaker: 'Mordred',
    text: "Père. Oui — père. Le fils que Morgane t'a caché réclame sa part de Logres. Me nommeras-tu héritier ?",
    unique: true,
    requires: { allFlags: ['mordred.concu'] },
    left: {
      label: 'Le reconnaître',
      effects: { couronne: +6, chevalerie: -12 },
      flags: ['mordred.heritier'],
    },
    right: {
      label: 'Le renier',
      effects: { chevalerie: +4, magie: -10 },
      flags: ['mordred.ennemi'],
    },
    weight: 3,
  },
  {
    id: 'chute.mordred.guerre',
    era: 'chute',
    speaker: 'Gauvain',
    text: "Mordred lève une armée contre toi ! Marcherons-nous sur lui à Camlann ?",
    unique: true,
    requires: { anyFlags: ['mordred.ennemi'] },
    left: {
      label: 'Marcher sur Camlann',
      effects: { chevalerie: -14, couronne: +6 },
    },
    right: {
      label: 'Négocier',
      effects: { couronne: -10, foi: +4 },
    },
    weight: 3,
  },
  {
    id: 'chute.filler.desertion',
    era: 'chute',
    filler: true,
    speaker: 'Keu',
    text: "Des chevaliers désertent la Table, découragés. Sévir contre les traîtres ?",
    left: { label: 'Sévir', effects: { couronne: +5, chevalerie: -6 } },
    right: { label: 'Leur pardonner', effects: { chevalerie: +5, couronne: -5 } },
    weight: 1,
  },
  {
    id: 'chute.filler.presage',
    era: 'chute',
    filler: true,
    speaker: 'Merlin',
    text: "Les corbeaux tournent sur Logres, mauvais présage. Consulteras-tu les augures païens ?",
    left: { label: 'Consulter', effects: { magie: +6, foi: -6 } },
    right: { label: 'Prier Dieu', effects: { foi: +6, magie: -6 } },
    weight: 1,
  },
];

export const avalon = [
  {
    id: 'avalon.barque',
    era: 'avalon',
    speaker: 'Morgane',
    text: "Tu es blessé à mort, frère. Une barque attend pour te porter à Avalon. Y monteras-tu ?",
    unique: true,
    left: {
      label: 'Monter dans la barque',
      effects: { magie: +10, foi: -6 },
    },
    right: {
      label: 'Mourir en roi chrétien',
      effects: { foi: +10, magie: -8 },
    },
    weight: 3,
  },
  {
    id: 'avalon.filler.excalibur',
    era: 'avalon',
    filler: true,
    speaker: 'Un chevalier',
    text: "Faut-il rendre Excalibur au lac, comme le veut la légende ?",
    left: { label: 'La rendre au lac', effects: { magie: +7, chevalerie: -5 } },
    right: { label: 'La garder', effects: { chevalerie: +6, magie: -6 } },
    weight: 1,
  },
  {
    id: 'avalon.filler.memoire',
    era: 'avalon',
    filler: true,
    speaker: 'Le peuple',
    text: "On grave déjà ta légende dans la pierre. La veux-tu sincère, ou flatteuse ?",
    left: { label: 'Sincère', effects: { foi: +5, couronne: -3 } },
    right: { label: 'Flatteuse', effects: { couronne: +6, foi: -4 } },
    weight: 1,
  },
];
