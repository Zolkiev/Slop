// Registre des épreuves d'armes (spec : docs/superpowers/specs/
// 2026-07-14-combat-design.md). Les côtés de carte `combat: '<id>'` pointent
// ici. Chaque combat compose les manœuvres communes + ses dédiées ; les
// communes sont sans condition (la pioche ne s'assèche jamais, invariant
// testé). Le second — Bédivère, Keu, un héraut… — commente le duel : c'est sa
// voix qu'on lit sur les cartes de manœuvre.

// ---- Manœuvres communes (toujours éligibles) ----

const COMMUNES = [
  {
    id: 'man.charge',
    speaker: 'Bédivère',
    text: "Il laisse une ouverture après chaque moulinet, Sire. Fonce dedans — ou attends-le au fer, sagement.",
    left: {
      label: 'Charger',
      strike: { dmg: 1, gauge: 'chevalerie', min: 60, bonus: 1 },
      expose: 1,
    },
    right: { label: "L'attendre au fer", strike: { dmg: 1 } },
  },
  {
    id: 'man.garde',
    speaker: 'Keu',
    text: "Son fer cherche ta gorge. Pare tout — ou rends coup pour coup et qu'on en finisse.",
    left: { label: 'Garde haute', guard: 2 },
    right: { label: 'Coup pour coup', strike: { dmg: 1 } },
  },
  {
    id: 'man.feinte',
    speaker: 'Gauvain',
    text: "Feinte basse, frappe haute — le vieux tour. S'il le connaît, ça piquera. L'autre école : frapper juste, tout simplement.",
    left: {
      label: 'Feinter',
      strike: { dmg: 1, gauge: 'magie', min: 55, bonus: 1 },
      expose: 1,
    },
    right: {
      label: 'Frapper juste',
      strike: { dmg: 1, gauge: 'chevalerie', min: 70, bonus: 1 },
    },
  },
  {
    id: 'man.priere',
    speaker: 'Un moine',
    text: "Dieu regarde ce duel, Sire. Un mot pour Lui referme les plaies — ou garde ton souffle pour frapper.",
    left: { label: 'Prier', guard: 1, heal: { gauge: 'foi', min: 55, hp: 1 } },
    right: { label: 'Le souffle au fer', strike: { dmg: 1 } },
  },
  {
    id: 'man.cri',
    speaker: 'Un héraut',
    text: "Les bannières te regardent. Un cri de roi porte parfois plus loin qu'une lame.",
    left: {
      label: 'Cri de guerre',
      strike: { dmg: 1, gauge: 'couronne', min: 60, bonus: 1 },
    },
    right: {
      label: 'Serrer les rangs',
      guard: 1,
      heal: { gauge: 'chevalerie', min: 70, hp: 1 },
    },
  },
];

// ---- Manœuvres dédiées (gated par l'histoire) ----

const MAN_EXCALIBUR = {
  id: 'man.excalibur',
  speaker: 'Bédivère',
  text: "Excalibur chante dans ta main, Sire — elle veut du sang de légende. Ou lève-la au soleil : son éclat aveugle.",
  requires: { allFlags: ['relique.excalibur'], noneFlags: ['excalibur.rendue'] },
  left: {
    label: 'Frapper de légende',
    strike: { dmg: 2, gauge: 'chevalerie', min: 50, bonus: 1 },
    expose: 1,
  },
  right: { label: "L'éclat aveugle", guard: 2 },
};

const MAN_MORGANE = {
  id: 'man.morgane.sort',
  speaker: 'Morgane',
  text: "Un mot de moi, frère, et son sang gèle dans ses veines. Ça ne coûte presque rien. Presque.",
  requires: { allFlags: ['morgane.cour'] },
  left: { label: 'Accepter le sort', strike: { dmg: 2, gauge: 'magie', min: 50, bonus: 1 } },
  right: { label: 'Mon fer suffira', strike: { dmg: 1 } },
};

const MAN_MORDRED_MOTS = {
  id: 'man.mordred.mots',
  speaker: 'Mordred',
  text: "Père. Tu peux encore poser l'épée. Dis un mot et tout s'arrête — tu me crois, n'est-ce pas ?",
  left: { label: 'Baisser la garde, parler', heal: { gauge: 'couronne', min: 60, hp: 1 } },
  right: { label: 'Répondre par le fer', strike: { dmg: 1 } },
};

const MAN_OST_CAVALERIE = {
  id: 'man.ost.cavalerie',
  speaker: 'Gauvain',
  text: "L'ost piaffe, Sire. Lâche la cavalerie dans leur flanc — ou tiens le mur de boucliers et laisse-les s'y briser.",
  left: {
    label: 'Lâcher la cavalerie',
    strike: { dmg: 1, gauge: 'chevalerie', min: 55, bonus: 2 },
    expose: 1,
  },
  right: { label: 'Mur de boucliers', guard: 2 },
};

const MAN_OST_TRIBUT = {
  id: 'man.ost.tribut',
  speaker: 'Un émissaire saxon',
  text: "Mon roi prendrait encore ton or contre un peu de répit, roi de Logres. Il rirait, mais il le prendrait.",
  left: { label: 'Acheter le répit', guard: 1, heal: { gauge: 'couronne', min: 55, hp: 1 } },
  right: { label: 'Pas un denier', strike: { dmg: 1, gauge: 'couronne', min: 60, bonus: 1 } },
};

const MAN_CLOS_HONNEUR = {
  id: 'man.clos.honneur',
  speaker: 'Un héraut',
  text: "Les juges regardent, champion. Un coup fourré passerait peut-être — ou frappe loyal, et que Dieu choisisse.",
  left: {
    label: 'Coup fourré',
    strike: { dmg: 2, gauge: 'magie', min: 50, bonus: 0 },
    expose: 1,
  },
  right: { label: 'Frapper loyal', strike: { dmg: 1, gauge: 'foi', min: 55, bonus: 1 } },
};

const MAN_GAUVAIN_RAGE = {
  id: 'man.gauvain.rage',
  speaker: 'Gauvain',
  text: "Mes frères, Lancelot ! Chaque coup portera leurs noms — tant pis pour ma garde.",
  left: {
    label: 'Frapper pour les morts',
    strike: { dmg: 2, gauge: 'chevalerie', min: 55, bonus: 1 },
    expose: 2,
  },
  right: { label: 'Garder la tête froide', strike: { dmg: 1 } },
};

const MAN_LANCELOT_PITIE = {
  id: 'man.lancelot.pitie',
  speaker: 'Lancelot',
  text: "Cède, Gauvain. Je ne veux pas te tuer — ne m'oblige pas à être encore le meilleur.",
  left: { label: 'Reprendre son souffle', guard: 1, heal: { gauge: 'chevalerie', min: 55, hp: 1 } },
  right: { label: "Répondre par l'assaut", strike: { dmg: 1, gauge: 'couronne', min: 60, bonus: 1 } },
};

const MAN_TOURNOI_PANACHE = {
  id: 'man.tournoi.panache',
  speaker: 'Un barde',
  text: "La foule veut du panache, pas du sang. Donne-lui un beau geste — ou gagne, bêtement, efficacement.",
  left: { label: 'Jouer pour la foule', strike: { dmg: 1, gauge: 'couronne', min: 55, bonus: 1 } },
  right: {
    label: 'Jouer pour gagner',
    strike: { dmg: 1, gauge: 'chevalerie', min: 60, bonus: 1 },
    expose: 1,
  },
};

// ---- Les épreuves ----

export const COMBATS = {
  camlann: {
    id: 'camlann',
    title: 'Camlann',
    foe: { name: 'Mordred', speaker: 'Mordred', atk: 2, hp: 4 },
    selfHp: 3,
    maxRounds: 5,
    fatal: true,
    deathCause:
      "À Camlann, le fer de Mordred t'a trouvé le premier — père et fils quittent Logres ensemble.",
    champions: [], // ce duel-là, nul ne peut le mener à ta place
    manoeuvres: [...COMMUNES, MAN_EXCALIBUR, MAN_MORGANE, MAN_MORDRED_MOTS],
    outcome: {
      win: {
        text: 'Mordred est tombé. Camlann est à toi — et le silence aussi.',
        effects: { couronne: +10, chevalerie: +6, magie: -6 },
        flags: ['camlann.vaincu'],
      },
      lose: {
        text: "On t'a tiré du champ, brisé. Logres a vu son roi tomber.",
        effects: { chevalerie: -12, couronne: -10 },
        flags: ['camlann.perdu'],
      },
      draw: {
        text: "Les deux osts se sont saignés jusqu'à la nuit. Nul n'a gagné Camlann.",
        effects: { chevalerie: -8, couronne: -6 },
        flags: ['camlann.sanglant'],
      },
    },
  },

  'champ.clos': {
    id: 'champ.clos',
    title: 'Le champ clos',
    foe: { name: "Le roi d'Outre-Humber", speaker: "Le roi d'Outre-Humber", atk: 1, hp: 3 },
    selfHp: 3,
    maxRounds: 5,
    fatal: false,
    deathCause: '',
    champions: [
      {
        name: 'Lancelot',
        speaker: 'Lancelot',
        requires: { allFlags: ['lancelot.cour'], noneFlags: ['lancelot.banni'] },
      },
      { name: 'Gauvain', speaker: 'Gauvain' },
    ],
    manoeuvres: [...COMMUNES, MAN_CLOS_HONNEUR, MAN_EXCALIBUR],
    outcome: {
      win: {
        text: "Ton champion a couché l'orgueil d'Outre-Humber dans le sable.",
        effects: { chevalerie: +8, couronne: +4 },
        flags: ['champ.clos.vaincu'],
      },
      lose: {
        text: "Outre-Humber repart avec la victoire — et ta légende s'écorne.",
        effects: { chevalerie: -6, couronne: -6 },
        flags: ['champ.clos.perdu'],
      },
      draw: {
        text: 'Les lances brisées, les juges ont renvoyé chacun à sa gloire.',
        effects: { couronne: -3 },
        flags: [],
      },
    },
  },

  'bataille.saxonne': {
    id: 'bataille.saxonne',
    title: 'La bataille de la côte',
    foe: { name: 'Le chef saxon', speaker: 'Le chef saxon', atk: 1, hp: 3 },
    selfHp: 3,
    maxRounds: 5,
    fatal: false,
    deathCause: '',
    champions: [], // le roi mène son ost
    manoeuvres: [...COMMUNES, MAN_OST_CAVALERIE, MAN_OST_TRIBUT],
    outcome: {
      win: {
        text: 'Les drakkars ont repris la mer, laissant leurs morts sur ta grève.',
        effects: { chevalerie: +8, couronne: +5 },
        flags: ['saxons.repousses'],
      },
      lose: {
        text: 'La côte brûle. Les Saxons hivernent sur tes terres.',
        effects: { chevalerie: -8, couronne: -8 },
        flags: ['saxons.installes'],
      },
      draw: {
        text: "L'ost a tenu, la côte a saigné. Chacun garde sa rive.",
        effects: { couronne: -4 },
        flags: [],
      },
    },
  },

  'joyeuse.garde': {
    id: 'joyeuse.garde',
    title: 'La Joyeuse Garde',
    foe: { name: 'Lancelot', speaker: 'Lancelot', atk: 2, hp: 3 },
    selfHp: 3,
    maxRounds: 5,
    fatal: false,
    deathCause: '',
    champions: [{ name: 'Gauvain', speaker: 'Gauvain' }], // c'est SA vengeance
    manoeuvres: [...COMMUNES, MAN_GAUVAIN_RAGE, MAN_LANCELOT_PITIE],
    outcome: {
      win: {
        text: 'Lancelot a plié le genou devant Gauvain — sans avoir voulu tuer.',
        effects: { chevalerie: +8, couronne: +5 },
        flags: ['lancelot.soumis'],
      },
      lose: {
        text: 'Gauvain gît dans le sable ; Lancelot a pleuré en le frappant.',
        effects: { chevalerie: -8, couronne: -4 },
        flags: ['gauvain.blesse'],
      },
      draw: {
        text: 'Trois jours de duel, nul vainqueur — que des larmes sous les heaumes.',
        effects: { chevalerie: -3 },
        flags: [],
      },
    },
  },

  tournoi: {
    id: 'tournoi',
    title: 'Le grand tournoi',
    foe: { name: 'Le Chevalier Noir', speaker: 'Le Chevalier Noir', atk: 1, hp: 2 },
    selfHp: 2,
    maxRounds: 4,
    fatal: false,
    deathCause: '',
    champions: [
      { name: 'Perceval', speaker: 'Perceval' },
      { name: 'Gauvain', speaker: 'Gauvain' },
    ],
    manoeuvres: [...COMMUNES, MAN_TOURNOI_PANACHE],
    outcome: {
      win: {
        text: "Ton champion soulève le heaume noir sous l'ovation — Camelot rayonne.",
        effects: { chevalerie: +6, couronne: +6 },
        flags: ['tournoi.vaincu'],
      },
      lose: {
        text: 'Le Chevalier Noir repart invaincu, et les bardes en font déjà une chanson.',
        effects: { couronne: -6, chevalerie: -4 },
        flags: ['tournoi.perdu'],
      },
      draw: {
        text: 'Trois lances brisées, nul vainqueur — la foule, elle, a gagné.',
        effects: { couronne: -2 },
        flags: [],
      },
    },
  },
};

/** Flags posés par les issues de combat (pour l'univers des invariants). */
export function combatFlagsSetBy(combats = COMBATS) {
  const set = new Set();
  for (const def of Object.values(combats)) {
    for (const key of ['win', 'lose', 'draw']) {
      for (const f of def.outcome?.[key]?.flags ?? []) {
        set.add(Array.isArray(f) ? f[0] : f);
      }
    }
  }
  return set;
}
