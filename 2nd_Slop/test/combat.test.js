// L'Épreuve d'armes — résolution, terminaison, champion, Fourreau.
// Combat de fixture : tout est piloté ici, indépendamment du registre réel.
import { describe, it, expect } from 'vitest';
import { createReign, draw, choose } from '../src/game/reign.js';
import { startCombat, resolveChampion } from '../src/game/combat.js';
import { setFlag, hasFlag } from '../src/game/flags.js';

// RNG déterministe (même mulberry32 que le fuzz des invariants).
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Fixture : manœuvres et combat de test ---

const MANOEUVRES_TEST = [
  {
    id: 'man.t.frappe',
    speaker: 'Bédivère',
    text: 'Il baisse sa garde, Sire.',
    left: { label: 'Frapper', strike: { dmg: 1, gauge: 'chevalerie', min: 60, bonus: 1 }, expose: 1 },
    right: { label: 'Garde haute', guard: 1 },
  },
  {
    id: 'man.t.souffle',
    speaker: 'Bédivère',
    text: 'Reprends ton souffle ou presse-le.',
    left: { label: 'Prier', heal: { gauge: 'foi', min: 60, hp: 1 } },
    right: { label: 'Presser', strike: { dmg: 1 } },
  },
  {
    id: 'man.t.sort',
    speaker: 'Morgane',
    text: 'Un mot de moi et son sang gèle.',
    requires: { allFlags: ['morgane.cour'] },
    left: { label: 'Le sort', strike: { dmg: 2 } },
    right: { label: 'Refuser', guard: 1 },
  },
];

const makeDef = (over = {}) => ({
  id: 'test',
  title: "L'épreuve d'essai",
  foe: { name: 'Le Chevalier de Fer', speaker: 'Un chevalier', atk: 1, hp: 2 },
  selfHp: 2,
  maxRounds: 4,
  fatal: false,
  deathCause: 'Le fer a tranché ton fil à la fixture.',
  champions: [
    { name: 'Lancelot', speaker: 'Lancelot', requires: { allFlags: ['lancelot.cour'], noneFlags: ['lancelot.banni'] } },
    { name: 'Gauvain', speaker: 'Gauvain', requires: { noneFlags: ['gauvain.mort'] } },
  ],
  manoeuvres: MANOEUVRES_TEST,
  outcome: {
    win: { text: 'Victoire !', effects: { chevalerie: +8 }, flags: ['test.vaincu'] },
    lose: { text: 'Défaite…', effects: { chevalerie: -8, couronne: -4 }, flags: ['test.defait'] },
    draw: { text: 'Retraite.', effects: { couronne: -2 }, flags: [] },
  },
  ...over,
});

// Deck minimal pour les pioches hors combat.
const CARDS_TEST = [
  {
    id: 't.filler',
    speaker: 'Keu',
    text: 'Le quotidien continue.',
    left: { label: 'Oui', effects: { couronne: +1 } },
    right: { label: 'Non', effects: { couronne: -1 } },
  },
];

/** Règne prêt au duel : jauges pilotables, combat démarré. */
function reignInCombat(def, { gauges, flags = [], seed = 1 } = {}) {
  const reign = createReign(gauges ? { gauges } : {});
  for (const f of flags) setFlag(reign.flags, f);
  const rng = mulberry32(seed);
  startCombat(reign, def, rng);
  return { reign, rng };
}

/** Joue le côté donné sur la prochaine manœuvre. */
function playRound(reign, rng, side) {
  const card = draw(reign, CARDS_TEST, rng);
  expect(card, 'pioche de manœuvre vide').not.toBeNull();
  choose(reign, side, rng);
  return card;
}

/** Enchaîne le même côté jusqu'à la fin du combat. */
function playUntilEnd(reign, rng, side, guard = 20) {
  while (reign.combat && guard-- > 0) playRound(reign, rng, side);
  expect(reign.combat).toBeNull();
}

describe('combat — champion', () => {
  it('prend le premier champion éligible selon les flags', () => {
    const def = makeDef();
    const { reign } = reignInCombat(def, { flags: ['lancelot.cour'] });
    expect(reign.combat.champion.name).toBe('Lancelot');
  });

  it('saute un champion exclu et retombe sur le suivant, puis sur le roi', () => {
    const def = makeDef();
    const flags = { set: new Set(['lancelot.cour', 'lancelot.banni']), counts: {} };
    expect(resolveChampion(def, flags).name).toBe('Gauvain');
    flags.set.add('gauvain.mort');
    const roi = resolveChampion(def, flags);
    expect(roi.isKing).toBe(true);
  });

  it('un combat sans liste de champions est mené par le roi', () => {
    const { reign } = reignInCombat(makeDef({ champions: [] }));
    expect(reign.combat.champion.isKing).toBe(true);
  });
});

describe('combat — pioche de manœuvres', () => {
  it('les manœuvres gated par flags sont écartées de la pioche', () => {
    const { reign } = reignInCombat(makeDef());
    expect(reign.combat.deck).not.toContain('man.t.sort');
    const { reign: r2 } = reignInCombat(makeDef(), { flags: ['morgane.cour'] });
    expect(r2.combat.deck).toContain('man.t.sort');
  });

  it('draw() sert une manœuvre sans polluer seen/recent', () => {
    const { reign, rng } = reignInCombat(makeDef());
    const card = draw(reign, CARDS_TEST, rng);
    expect(card.left.label).toBeTruthy();
    expect(reign.seen.has(card.id)).toBe(false);
    expect(reign.recent).not.toContain(card.id);
  });

  it('la pioche ne s\'assèche jamais, même au-delà du deck (recyclage)', () => {
    const def = makeDef({ foe: { ...makeDef().foe, hp: 99, atk: 0 }, selfHp: 99, maxRounds: 8 });
    const { reign, rng } = reignInCombat(def);
    for (let i = 0; i < 8 && reign.combat; i++) {
      const card = draw(reign, CARDS_TEST, rng);
      expect(card, `manche ${i + 1}`).not.toBeNull();
      choose(reign, 'right', rng);
    }
  });
});

describe('combat — résolution des manches', () => {
  it('strike simple : les blasons adverses tombent, la riposte frappe', () => {
    const def = makeDef({ manoeuvres: [MANOEUVRES_TEST[1]] }); // souffle : right = strike 1 sec
    const { reign, rng } = reignInCombat(def, { gauges: { foi: 50 } });
    playRound(reign, rng, 'right');
    expect(reign.combat.foeHp).toBe(1); // 2 - 1
    expect(reign.combat.selfHp).toBe(1); // riposte atk 1, pas de garde
    expect(reign.years).toBe(0); // l'année n'avance pas en cours de duel
  });

  it('bonus de jauge au seuil : chevalerie 60 frappe plus fort', () => {
    const def = makeDef({ manoeuvres: [MANOEUVRES_TEST[0]] });
    const { reign, rng } = reignInCombat(def, { gauges: { chevalerie: 60 } });
    playRound(reign, rng, 'left'); // strike 1 + bonus 1 = 2 -> foe mort
    expect(reign.combat).toBeNull();
    expect(hasFlag(reign.flags, 'test.vaincu')).toBe(true);
  });

  it('bonus raté : expose ajoute le contre-coup à la riposte', () => {
    const def = makeDef({ manoeuvres: [MANOEUVRES_TEST[0]], selfHp: 3 });
    const { reign, rng } = reignInCombat(def, { gauges: { chevalerie: 40 } });
    playRound(reign, rng, 'left'); // strike 1 (pas de bonus), riposte 1 + expose 1
    expect(reign.combat.foeHp).toBe(1);
    expect(reign.combat.selfHp).toBe(1); // 3 - 2
  });

  it('guard absorbe la riposte', () => {
    const def = makeDef({ manoeuvres: [MANOEUVRES_TEST[0]] });
    const { reign, rng } = reignInCombat(def);
    playRound(reign, rng, 'right'); // guard 1 vs atk 1
    expect(reign.combat.selfHp).toBe(2);
  });

  it('heal rend un blason si la jauge passe le seuil (borné au max)', () => {
    const def = makeDef({ manoeuvres: [MANOEUVRES_TEST[1]] });
    const { reign, rng } = reignInCombat(def, { gauges: { foi: 70 } });
    playRound(reign, rng, 'left'); // riposte 1 puis heal 1 -> plein
    expect(reign.combat.selfHp).toBe(2);
    const { reign: r2, rng: rng2 } = reignInCombat(def, { gauges: { foi: 30 } });
    playRound(r2, rng2, 'left'); // heal raté
    expect(r2.combat.selfHp).toBe(1);
  });

  it('Excalibur portée : +1 sur les strikes de chevalerie', () => {
    const def = makeDef({ manoeuvres: [MANOEUVRES_TEST[0]] });
    const { reign, rng } = reignInCombat(def, {
      gauges: { chevalerie: 40 },
      flags: ['relique.excalibur'],
    });
    playRound(reign, rng, 'left'); // 1 + 1 (Excalibur) = 2 -> foe mort
    expect(reign.combat).toBeNull();
    expect(hasFlag(reign.flags, 'test.vaincu')).toBe(true);
  });
});

describe('combat — fins de duel', () => {
  it('victoire : outcome.win appliqué, année avancée, bannière affichée', () => {
    const def = makeDef({ manoeuvres: [MANOEUVRES_TEST[1]], foe: { ...makeDef().foe, hp: 1, atk: 0 } });
    const { reign, rng } = reignInCombat(def, { gauges: { chevalerie: 50 } });
    playRound(reign, rng, 'right');
    expect(reign.combat).toBeNull();
    expect(reign.gauges.chevalerie).toBe(58); // +8
    expect(reign.years).toBe(1);
    expect(reign.miracle).toBe('Victoire !');
    expect(reign.dead).toBeNull();
  });

  it('défaite non fatale : outcome.lose appliqué, le roi vit', () => {
    const def = makeDef({ manoeuvres: [MANOEUVRES_TEST[1]], selfHp: 1, foe: { ...makeDef().foe, atk: 2 } });
    const { reign, rng } = reignInCombat(def, { gauges: { foi: 30 } });
    playRound(reign, rng, 'left'); // heal raté, riposte 2 -> défaite
    expect(reign.combat).toBeNull();
    expect(reign.dead).toBeNull();
    expect(hasFlag(reign.flags, 'test.defait')).toBe(true);
  });

  it('défaite fatale du roi sans Fourreau : mort à la cause dédiée', () => {
    const def = makeDef({
      fatal: true, champions: [], selfHp: 1,
      manoeuvres: [MANOEUVRES_TEST[1]], foe: { ...makeDef().foe, atk: 2 },
    });
    const { reign, rng } = reignInCombat(def, { gauges: { foi: 30 } });
    playRound(reign, rng, 'left');
    expect(reign.dead?.cause).toBe(def.deathCause);
  });

  it('défaite fatale avec le Fourreau : il boit le coup et se consume', () => {
    const def = makeDef({
      fatal: true, champions: [], selfHp: 1,
      manoeuvres: [MANOEUVRES_TEST[1]], foe: { ...makeDef().foe, atk: 2 },
    });
    const { reign, rng } = reignInCombat(def, {
      gauges: { foi: 30 },
      flags: ['relique.fourreau'],
    });
    playRound(reign, rng, 'left');
    expect(reign.dead).toBeNull();
    expect(hasFlag(reign.flags, 'fourreau.perdu')).toBe(true);
    expect(hasFlag(reign.flags, 'test.defait')).toBe(true); // la défaite reste
  });

  it('défaite fatale d\'un champion (pas le roi) : pas de mort', () => {
    const def = makeDef({
      fatal: true, selfHp: 1,
      manoeuvres: [MANOEUVRES_TEST[1]], foe: { ...makeDef().foe, atk: 2 },
    });
    const { reign, rng } = reignInCombat(def, { gauges: { foi: 30 }, flags: ['lancelot.cour'] });
    playRound(reign, rng, 'left');
    expect(reign.dead).toBeNull();
  });

  it('retraite après maxRounds : outcome.draw', () => {
    const def = makeDef({ foe: { ...makeDef().foe, hp: 99, atk: 0 }, selfHp: 99 });
    const { reign, rng } = reignInCombat(def);
    playUntilEnd(reign, rng, 'right');
    expect(reign.gauges.couronne).toBe(48); // -2
    expect(reign.years).toBe(1);
  });
});

describe('combat — sûreté', () => {
  it('200 duels aléatoires : terminaison, blasons cohérents, année +1', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = mulberry32(seed);
      const reign = createReign();
      if (rng() < 0.5) setFlag(reign.flags, 'morgane.cour');
      const def = makeDef({ fatal: rng() < 0.3 });
      startCombat(reign, def, rng);
      let guard = 0;
      while (reign.combat) {
        const card = draw(reign, CARDS_TEST, rng);
        expect(card, `seed=${seed}`).not.toBeNull();
        choose(reign, rng() < 0.5 ? 'left' : 'right', rng);
        if (++guard > def.maxRounds + 1) throw new Error(`duel interminable seed=${seed}`);
      }
      expect(reign.years).toBe(1);
    }
  });

  it('déterminisme : même seed, même issue', () => {
    const run = (seed) => {
      const rng = mulberry32(seed);
      const reign = createReign();
      startCombat(reign, makeDef(), rng);
      while (reign.combat) {
        draw(reign, CARDS_TEST, rng);
        choose(reign, rng() < 0.5 ? 'left' : 'right', rng);
      }
      return JSON.stringify([reign.gauges, reign.dead, [...reign.flags.set].sort()]);
    };
    expect(run(42)).toBe(run(42));
    expect(run(7)).toBe(run(7));
  });
});
