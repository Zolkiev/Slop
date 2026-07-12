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

  it('tout flag requis est posé quelque part dans le deck', () => {
    const set = flagsSetBy();
    for (const f of flagsRequiredBy()) {
      expect(set.has(f), `flag requis jamais posé: ${f}`).toBe(true);
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

  it('chaque ère possède au moins une carte de remplissage sans condition', () => {
    for (const era of ERAS) {
      const fillers = CARDS.filter(
        (c) => c.era === era.id && c.filler && !c.requires,
      );
      expect(fillers.length, `ère sans filler: ${era.id}`).toBeGreaterThan(0);
    }
  });
});

describe('invariant de jouabilité (fuzz)', () => {
  it('1000 règnes aléatoires : jamais de blocage, jauges toujours bornées', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const rng = mulberry32(seed);
      const reign = createReign();
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
        choose(reign, side);

        if (++guard > 5000) throw new Error(`règne interminable seed=${seed}`);
      }
      // La mort a bien une cause thématique.
      expect(reign.dead.cause).toBeTruthy();
    }
  });
});
