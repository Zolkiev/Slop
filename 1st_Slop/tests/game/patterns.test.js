import { describe, it, expect } from 'vitest';
import { nextSalve, POOLS, flow, escalier, zigzag, couloir, chicane } from '../../src/game/patterns.js';
import { difficultyForLevel } from '../../src/game/level.js';
import { CONFIG } from '../../src/config.js';

// PRNG seedé local (mulberry32) — tests déterministes.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CENTRE = CONFIG.HEIGHT / 2;

function assertDansLesBornes(salve) {
  for (const g of salve) {
    expect(g.gapY).toBeGreaterThanOrEqual(CONFIG.GAP_MARGIN);
    expect(g.gapY).toBeLessThanOrEqual(CONFIG.HEIGHT - CONFIG.GAP_MARGIN - g.gapH);
  }
}

describe('motifs — bornes et formes', () => {
  const MOTIFS = { flow, escalier, zigzag, couloir, chicane };
  for (const [nom, motif] of Object.entries(MOTIFS)) {
    it(`${nom} reste dans l'écran à tous les niveaux`, () => {
      const rand = mulberry32(7);
      for (const level of [1, 3, 5, 7, 10, 15, 30]) {
        const diff = difficultyForLevel(level);
        for (let i = 0; i < 50; i += 1) assertDansLesBornes(motif(rand, CENTRE, diff));
      }
    });
  }

  it('flow produit 3 à 5 portes aux deltas doux', () => {
    const rand = mulberry32(1);
    const diff = difficultyForLevel(1);
    for (let i = 0; i < 100; i += 1) {
      const salve = flow(rand, CENTRE, diff);
      expect(salve.length).toBeGreaterThanOrEqual(3);
      expect(salve.length).toBeLessThanOrEqual(5);
      let prev = CENTRE;
      for (const g of salve) {
        const d = g.gapY - prev;
        expect(Math.abs(d)).toBeLessThanOrEqual(0.35 * Math.max(diff.deltaUp, diff.deltaDown) + 1e-9);
        prev = g.gapY;
      }
    }
  });

  it('escalier : 4 portes monotones (jamais de rebond au mur)', () => {
    const rand = mulberry32(2);
    for (const level of [3, 8, 15]) {
      const diff = difficultyForLevel(level);
      for (const depart of [CENTRE, 100, 420]) {
        for (let i = 0; i < 50; i += 1) {
          const salve = escalier(rand, depart, diff);
          expect(salve.length).toBe(4);
          let prev = depart;
          let signe = 0;
          for (const g of salve) {
            const d = g.gapY - prev;
            if (signe !== 0 && d !== 0) expect(d * signe).toBeGreaterThan(0); // monotone
            if (d !== 0) signe = d;
            prev = g.gapY;
          }
        }
      }
    }
  });

  it('zigzag : directions alternées (niveau 12, loin des bords)', () => {
    const rand = mulberry32(3);
    const diff = difficultyForLevel(12);
    for (let i = 0; i < 100; i += 1) {
      const salve = zigzag(rand, CENTRE, diff);
      expect(salve.length).toBe(4);
      let prev = CENTRE;
      let prevD = 0;
      for (const g of salve) {
        const d = g.gapY - prev;
        if (prevD !== 0) expect(d * prevD).toBeLessThan(0); // signe opposé
        prev = g.gapY;
        prevD = d;
      }
    }
  });

  it('couloir : 3 portes à ±10 px, gap serré, spacing réduit ≥ 160', () => {
    const rand = mulberry32(4);
    const diff = difficultyForLevel(8);
    for (let i = 0; i < 100; i += 1) {
      const salve = couloir(rand, CENTRE, diff);
      expect(salve.length).toBe(3);
      const base = salve[0].gapY;
      for (const g of salve) {
        expect(Math.abs(g.gapY - base)).toBeLessThanOrEqual(20);
        expect(g.gapH).toBe(Math.max(CONFIG.GAP_FLOOR, diff.gapMin - 15));
        expect(g.spacing).toBeCloseTo(Math.max(160, diff.spacing * 0.9), 5);
      }
    }
  });

  it('chicane : 4-5 portes, spacing réduit ≥ 160', () => {
    const rand = mulberry32(5);
    const diff = difficultyForLevel(12);
    for (let i = 0; i < 100; i += 1) {
      const salve = chicane(rand, CENTRE, diff);
      expect(salve.length).toBeGreaterThanOrEqual(4);
      expect(salve.length).toBeLessThanOrEqual(5);
      for (const g of salve) expect(g.spacing).toBeCloseTo(Math.max(160, diff.spacing * 0.85), 5);
    }
  });
});

describe('nextSalve — sélection par tier', () => {
  it('tier 1 : uniquement des salves douces (flow)', () => {
    const rand = mulberry32(6);
    const diff = difficultyForLevel(1);
    for (let i = 0; i < 50; i += 1) {
      let prev = CENTRE;
      for (const g of nextSalve(rand, prev, diff)) {
        expect(Math.abs(g.gapY - prev)).toBeLessThanOrEqual(0.35 * Math.max(diff.deltaUp, diff.deltaDown) + 1e-9);
        prev = g.gapY;
      }
    }
  });

  it('les pools par tier ajoutent chacun leur nouveauté', () => {
    expect(POOLS.length).toBe(5);
    expect(POOLS[0]).toEqual([flow]);
    expect(POOLS[1]).toEqual([flow, escalier]);
    expect(POOLS[2]).toEqual([flow, escalier, zigzag]);
    expect(POOLS[3]).toEqual([flow, escalier, zigzag, couloir]);
    expect(POOLS[4]).toEqual([flow, escalier, zigzag, couloir, chicane]);
  });

  it('le motif le plus récent du tier pèse double (sélection au 1er tirage)', () => {
    // rand stub : le 1er appel pilote la sélection, la suite génère le motif.
    const seq = (premier) => {
      let done = false;
      const suite = mulberry32(11);
      return () => (done ? suite() : ((done = true), premier));
    };
    const diff = difficultyForLevel(3); // tier 2, pool pondéré [flow, escalier, escalier]
    // index 0 (rand < 1/3) -> flow : deltas doux
    const sFlow = nextSalve(seq(0.1), CENTRE, diff);
    let prev = CENTRE;
    for (const g of sFlow) {
      expect(Math.abs(g.gapY - prev)).toBeLessThanOrEqual(0.35 * Math.max(diff.deltaUp, diff.deltaDown) + 1e-9);
      prev = g.gapY;
    }
    // index 1 et 2 (les DEUX tiers hauts du tirage) -> escalier : 4 portes monotones
    for (const premier of [0.5, 0.9]) {
      const salve = nextSalve(seq(premier), CENTRE, diff);
      expect(salve.length).toBe(4);
      const d1 = salve[0].gapY - CENTRE;
      const d2 = salve[1].gapY - salve[0].gapY;
      expect(d1 * d2).toBeGreaterThan(0); // monotone = signature escalier
    }
  });

  it('déterminisme : même seed → mêmes salves', () => {
    const diff = difficultyForLevel(10);
    const a = [];
    const b = [];
    const ra = mulberry32(9);
    const rb = mulberry32(9);
    for (let i = 0; i < 20; i += 1) {
      a.push(nextSalve(ra, CENTRE, diff));
      b.push(nextSalve(rb, CENTRE, diff));
    }
    expect(a).toEqual(b);
  });
});

describe('invariant de jouabilité', () => {
  it('aucun couple de portes consécutives n\'excède les capacités physiques brutes', () => {
    const rand = mulberry32(42);
    for (let level = 1; level <= 20; level += 1) {
      const diff = difficultyForLevel(level);
      let prev = CONFIG.HEIGHT / 2;
      for (let s = 0; s < 200; s += 1) {
        for (const g of nextSalve(rand, prev, diff)) {
          const t = g.spacing / diff.scrollSpeed;
          const upCap = CONFIG.THRUST * t;
          const downCap = CONFIG.MAX_FALL * t - CONFIG.MAX_FALL ** 2 / (2 * CONFIG.GRAVITY);
          const d = g.gapY - prev;
          if (d < 0) expect(-d).toBeLessThanOrEqual(upCap);
          else expect(d).toBeLessThanOrEqual(downCap);
          prev = g.gapY;
        }
      }
    }
  });
});
