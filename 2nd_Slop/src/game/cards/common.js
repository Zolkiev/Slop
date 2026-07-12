// Cartes multi-ères : les affaires courantes du royaume et ses visiteurs
// récurrents. Elles alimentent le tirage de la Roche jusqu'à la Chute
// (Avalon, épilogue mythique, garde son paquet propre).

const ERAS_VIVANTES = ['roche', 'camelot', 'graal', 'chute'];

export const common = [
  {
    id: 'common.saxons.raid',
    era: ERAS_VIVANTES,
    speaker: 'Gauvain',
    text: "Des drakkars saxons pillent la côte est, Sire. Lèverons-nous l'ost, ou leur paierons-nous le prix de la paix ?",
    left: {
      label: "Lever l'ost",
      effects: { chevalerie: +7, couronne: -4 },
    },
    right: {
      label: 'Payer le tribut',
      effects: { couronne: +4, chevalerie: -7 },
    },
    weight: 1,
  },
  {
    id: 'common.eveque.dime',
    era: ERAS_VIVANTES,
    speaker: "L'Évêque",
    text: "Dieu a béni tes récoltes, mon roi. Il serait juste que Son Église en reçoive la dîme… doublée, cette année.",
    left: {
      label: 'Doubler la dîme',
      effects: { foi: +8, couronne: -6 },
    },
    right: {
      label: 'Refuser',
      effects: { couronne: +5, foi: -8 },
    },
    weight: 1,
  },
  {
    id: 'common.merlin.vision',
    era: ERAS_VIVANTES,
    speaker: 'Merlin',
    text: "Les étoiles ont parlé cette nuit. Veux-tu entendre ce qu'elles disent de ton règne — même si cela te déplaît ?",
    left: {
      label: 'Écouter les astres',
      effects: { magie: +7, foi: -4 },
    },
    right: {
      label: 'Je ne veux pas savoir',
      effects: { foi: +4, magie: -6 },
    },
    weight: 1,
  },
  {
    id: 'common.morgane.philtre',
    era: ERAS_VIVANTES,
    speaker: 'Morgane',
    text: "Un philtre pour lier tes chevaliers à toi par serment enchanté. Un cadeau de ta chère sœur… sans arrière-pensée, bien sûr.",
    left: {
      label: 'Accepter le philtre',
      effects: { magie: +8, chevalerie: -4 },
    },
    right: {
      label: 'Se méfier de Morgane',
      effects: { chevalerie: +4, magie: -7 },
    },
    weight: 1,
  },
  {
    id: 'common.proces.guerisseuse',
    era: ERAS_VIVANTES,
    speaker: "L'Évêque",
    text: "Une guérisseuse des bois soigne par les herbes et les murmures. Le peuple l'aime ; l'Église la dit sorcière. Ton verdict ?",
    left: {
      label: 'Le bûcher',
      effects: { foi: +9, magie: -9 },
    },
    right: {
      label: 'La gracier',
      effects: { magie: +8, foi: -8 },
    },
    weight: 1,
  },
  {
    id: 'common.keu.banquet',
    era: ERAS_VIVANTES,
    speaker: 'Keu',
    text: "Les barons attendent le banquet d'usage, Sire. Les caves sont basses, mais leur patience l'est davantage.",
    left: {
      label: 'Banquet fastueux',
      effects: { couronne: +6, foi: -3 },
    },
    right: {
      label: 'Table frugale',
      effects: { foi: +4, couronne: -5 },
    },
    weight: 1,
  },
  {
    id: 'common.gauvain.duel',
    era: ERAS_VIVANTES,
    speaker: 'Gauvain',
    text: "Un chevalier a insulté mon sang, Sire. Accorde-moi le duel — ou je devrai l'exiger moins poliment.",
    left: {
      label: 'Accorder le duel',
      effects: { chevalerie: +6, couronne: -3 },
    },
    right: {
      label: 'Interdire',
      effects: { couronne: +3, chevalerie: -5 },
    },
    weight: 1,
  },
  {
    id: 'common.barde.chanson',
    era: ERAS_VIVANTES,
    speaker: 'Un barde',
    text: "J'ai composé une geste sur ton règne, Sire. Moyennant pension, elle courra toutes les tavernes de Logres.",
    left: {
      label: 'Payer le barde',
      effects: { couronne: +5, foi: -3 },
    },
    right: {
      label: 'La gloire suffira',
      effects: { foi: +3, couronne: -4 },
    },
    weight: 1,
  },
  {
    id: 'common.paysans.pont',
    era: ERAS_VIVANTES,
    speaker: 'Un paysan',
    text: "Le pont sur la Saverne s'est effondré, Sire. Sans lui, plus de marché — et l'on dit qu'un troll s'est installé dessous.",
    left: {
      label: 'Rebâtir le pont',
      effects: { couronne: +6, chevalerie: -3 },
    },
    right: {
      label: "Qu'ils contournent",
      effects: { couronne: -6, magie: +4 },
    },
    weight: 1,
  },
  {
    id: 'common.dame.lac.entretien',
    era: ERAS_VIVANTES,
    speaker: 'La Dame du Lac',
    text: "Excalibur boit ta gloire, roi de Logres. N'oublie pas de qui elle vient — Avalon attend une offrande.",
    requires: { allFlags: ['relique.excalibur'] },
    left: {
      label: "Honorer Avalon",
      effects: { magie: +6, foi: -5 },
    },
    right: {
      label: "L'épée est à moi",
      effects: { couronne: +4, magie: -6 },
    },
    weight: 1,
  },
];
