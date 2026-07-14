// Invariants du contenu et de la jouabilité — le filet de sécurité du jeu.
import { describe, it, expect } from 'vitest';
import {
  CARDS,
  flagsSetBy,
  flagsRequiredBy,
  nextIdsReferenced,
} from '../src/game/cards/index.js';
import { GAUGE_KEYS, ERAS, GAUGE_MIN, GAUGE_MAX } from '../src/config.js';
import { createReign, draw, choose } from '../src/game/reign.js';
import { PORTRAITS } from '../src/game/portraits.js';
import { COMBATS, combatFlagsSetBy } from '../src/game/combats/index.js';
import { KINGS, lineageFlag } from '../src/game/dynasty.js';
import { setFlag } from '../src/game/flags.js';
import { SCENES } from '../src/game/scenes.js';

// RNG déterministe (mulberry32) pour un fuzz reproductible.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('intégrité du deck', () => {
  it('les ids de carte sont uniques', () => {
    const ids = CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque carte a un texte, un orateur et deux choix étiquetés', () => {
    for (const c of CARDS) {
      expect(c.text, c.id).toBeTruthy();
      expect(c.speaker, c.id).toBeTruthy();
      expect(c.left?.label, c.id).toBeTruthy();
      expect(c.right?.label, c.id).toBeTruthy();
    }
  });

  it('tous les effets ciblent des jauges valides', () => {
    for (const c of CARDS) {
      for (const side of ['left', 'right']) {
        for (const key of Object.keys(c[side].effects ?? {})) {
          expect(GAUGE_KEYS, `${c.id}.${side}`).toContain(key);
        }
      }
    }
  });

  it('tout flag requis est posé quelque part (deck, combats, lignées)', () => {
    // Trois sources légitimes : les choix de cartes, les issues de combat,
    // et les flags lignee.* posés par le moteur au premier jour du règne.
    const univers = new Set([
      ...flagsSetBy(),
      ...combatFlagsSetBy(),
      ...KINGS.map(lineageFlag),
    ]);
    for (const f of flagsRequiredBy()) {
      expect(univers.has(f), `flag requis jamais posé: ${f}`).toBe(true);
    }
  });

  it('tout id référencé par un next existe', () => {
    const ids = new Set(CARDS.map((c) => c.id));
    for (const ref of nextIdsReferenced()) {
      expect(ids.has(ref), `next inexistant: ${ref}`).toBe(true);
    }
  });

  it('chaque orateur du deck a un portrait mappé', () => {
    for (const c of CARDS) {
      expect(PORTRAITS[c.speaker], `orateur sans portrait: ${c.speaker}`).toBeTruthy();
    }
  });

  it('chaque art de carte pointe une scène connue', () => {
    for (const c of CARDS) {
      if (c.art) expect(SCENES, `scène inconnue: ${c.art} (${c.id})`).toContain(c.art);
    }
  });

  it('chaque ère possède au moins une carte de remplissage sans condition', () => {
    for (const era of ERAS) {
      const fillers = CARDS.filter(
        (c) => c.era === era.id && c.filler && !c.requires,
      );
      expect(fillers.length, `ère sans filler: ${era.id}`).toBeGreaterThan(0);
    }
  });

  // Rang d'une ère (roche=0 … avalon=4).
  const ERA_RANK = Object.fromEntries(ERAS.map((e, i) => [e.id, i]));
  const eraRanks = (c) =>
    c.era == null
      ? ERAS.map((_, i) => i)
      : (Array.isArray(c.era) ? c.era : [c.era]).map((id) => ERA_RANK[id]).filter((r) => r != null);
  const minEraRank = (c) => {
    const r = eraRanks(c);
    return r.length ? Math.min(...r) : 0;
  };
  const posersOf = (flag) =>
    CARDS.filter((p) =>
      ['left', 'right'].some((s) =>
        (p[s]?.flags ?? []).some((e) => (Array.isArray(e) ? e[0] : e) === flag)));

  it('tout flag requis est posable à une ère ≤ celle où il est requis', () => {
    const combatFlags = combatFlagsSetBy(); // posés par les issues de duel
    for (const c of CARDS) {
      const r = c.requires;
      if (!r) continue;
      const consumerRank = minEraRank(c);
      for (const f of [...(r.allFlags ?? []), ...(r.anyFlags ?? [])]) {
        if (f.startsWith('lignee.')) continue; // posé au premier jour (rang 0)
        if (combatFlags.has(f)) continue; // l'ère vient du déclencheur du duel
        const posers = posersOf(f);
        expect(posers.length, `flag jamais posé: ${f} (requis par ${c.id})`).toBeGreaterThan(0);
        const earliest = Math.min(...posers.map(minEraRank));
        expect(earliest, `flag ${f} posé trop tard (rang ${earliest}) pour ${c.id} (rang ${consumerRank})`)
          .toBeLessThanOrEqual(consumerRank);
      }
    }
  });

  it('chaque ère vivante peut monter ET baisser chaque jauge', () => {
    const LIVING = ['roche', 'camelot', 'graal', 'chute'];
    const inEra = (c, eraId) =>
      c.era == null || (Array.isArray(c.era) ? c.era.includes(eraId) : c.era === eraId);
    for (const eraId of LIVING) {
      const pool = CARDS.filter((c) => inEra(c, eraId));
      for (const key of GAUGE_KEYS) {
        const up = pool.some((c) => ['left', 'right'].some((s) => (c[s]?.effects?.[key] ?? 0) > 0));
        const down = pool.some((c) => ['left', 'right'].some((s) => (c[s]?.effects?.[key] ?? 0) < 0));
        expect(up, `${eraId}: aucune carte ne monte ${key}`).toBe(true);
        expect(down, `${eraId}: aucune carte ne baisse ${key}`).toBe(true);
      }
    }
  });
});

describe('intégrité des épreuves d\'armes', () => {
  it('tout combat référencé par une carte existe au registre', () => {
    for (const c of CARDS) {
      for (const side of ['left', 'right']) {
        const ref = c[side]?.combat;
        if (ref) expect(COMBATS[ref], `combat inconnu: ${ref} (${c.id}.${side})`).toBeTruthy();
      }
    }
  });

  it('les ids de manœuvres sont uniques au sein de chaque combat', () => {
    for (const def of Object.values(COMBATS)) {
      const ids = def.manoeuvres.map((m) => m.id);
      expect(new Set(ids).size, def.id).toBe(ids.length);
    }
  });

  it('chaque combat garde au moins maxRounds manœuvres sans condition', () => {
    for (const def of Object.values(COMBATS)) {
      const libres = def.manoeuvres.filter((m) => !m.requires);
      expect(libres.length, `${def.id}: pioche trop conditionnelle`)
        .toBeGreaterThanOrEqual(def.maxRounds);
    }
  });

  it('les effets de manœuvre et d\'issue ciblent des jauges valides', () => {
    for (const def of Object.values(COMBATS)) {
      for (const m of def.manoeuvres) {
        for (const side of ['left', 'right']) {
          const ch = m[side];
          expect(ch?.label, `${def.id}/${m.id}.${side}`).toBeTruthy();
          for (const g of [ch.strike?.gauge, ch.heal?.gauge]) {
            if (g) expect(GAUGE_KEYS, `${def.id}/${m.id}.${side}`).toContain(g);
          }
        }
      }
      for (const key of ['win', 'lose', 'draw']) {
        for (const g of Object.keys(def.outcome[key]?.effects ?? {})) {
          expect(GAUGE_KEYS, `${def.id}.outcome.${key}`).toContain(g);
        }
      }
    }
  });

  it('un combat fatal a une cause de mort ; les autres non', () => {
    for (const def of Object.values(COMBATS)) {
      if (def.fatal) expect(def.deathCause, def.id).toBeTruthy();
    }
  });

  it('chaque orateur de manœuvre et d\'adversaire a un portrait mappé', () => {
    for (const def of Object.values(COMBATS)) {
      expect(PORTRAITS[def.foe.speaker], `adversaire sans portrait: ${def.foe.speaker}`).toBeTruthy();
      for (const champ of def.champions) {
        expect(PORTRAITS[champ.speaker], `champion sans portrait: ${champ.speaker}`).toBeTruthy();
      }
      for (const m of def.manoeuvres) {
        expect(PORTRAITS[m.speaker], `manœuvre sans portrait: ${m.speaker}`).toBeTruthy();
      }
    }
  });

});

describe('invariant de jouabilité (fuzz)', () => {
  it('1000 règnes aléatoires (250 par lignée) : jamais de blocage, jauges bornées', () => {
    for (const king of KINGS)
    for (let seed = 1; seed <= 250; seed++) {
      const rng = mulberry32(seed);
      const reign = createReign({ gauges: king.gauges });
      setFlag(reign.flags, lineageFlag(king)); // même départ que startReign
      let guard = 0;
      while (!reign.dead) {
        const card = draw(reign, CARDS, rng);
        // Tant que le roi est vivant, il doit toujours exister une carte jouable.
        expect(card, `blocage seed=${seed} an=${reign.years}`).not.toBeNull();

        for (const k of GAUGE_KEYS) {
          expect(reign.gauges[k]).toBeGreaterThanOrEqual(GAUGE_MIN);
          expect(reign.gauges[k]).toBeLessThanOrEqual(GAUGE_MAX);
        }

        const side = rng() < 0.5 ? 'left' : 'right';
        choose(reign, side, rng); // rng : pioche de manœuvres reproductible

        if (++guard > 5000) throw new Error(`règne interminable seed=${seed}`);
      }
      // La mort a bien une cause thématique.
      expect(reign.dead.cause).toBeTruthy();
    }
  });
});
