import { describe, it, expect } from 'vitest';
import { computeSteps, shouldRender } from '../../src/engine/loop.js';

describe('computeSteps', () => {
  it('produit 1 step quand le temps accumulé atteint fixedDt', () => {
    const r = computeSteps(0, 1 / 60, 1 / 60);
    expect(r.steps).toBe(1);
    expect(r.accumulator).toBeCloseTo(0, 5);
  });

  it('produit 0 step si pas assez de temps accumulé', () => {
    const r = computeSteps(0, 1 / 120, 1 / 60);
    expect(r.steps).toBe(0);
    expect(r.accumulator).toBeCloseTo(1 / 120, 5);
  });

  it('produit plusieurs steps et garde le reste', () => {
    const r = computeSteps(0, 2.5 / 60, 1 / 60);
    expect(r.steps).toBe(2);
    expect(r.accumulator).toBeCloseTo(0.5 / 60, 5);
  });

  it('plafonne le nombre de steps (spirale de la mort)', () => {
    const r = computeSteps(0, 10, 1 / 60, 5);
    expect(r.steps).toBe(5);
  });
});

describe('shouldRender', () => {
  it('rend toujours au tout premier frame (lastRender = -Infinity)', () => {
    expect(shouldRender(0, -Infinity)).toBe(true);
    expect(shouldRender(16.7, -Infinity)).toBe(true);
  });

  it('rend quand l\'intervalle écoulé atteint minInterval', () => {
    expect(shouldRender(15, 0, 15)).toBe(true);
  });

  it('saute le rendu quand l\'intervalle écoulé est inférieur à minInterval', () => {
    expect(shouldRender(8.33, 0, 15)).toBe(false);
  });

  it('à 120 Hz (8,33 ms/frame), rend environ 1 frame sur 2', () => {
    const frameInterval = 8.33; // ~120 Hz
    let lastRender = -Infinity;
    let rendered = 0;
    let now = 0;
    for (let i = 0; i < 8; i += 1) {
      now += frameInterval;
      if (shouldRender(now, lastRender)) {
        rendered += 1;
        lastRender = now;
      }
    }
    // 8 frames à 120 Hz ≈ 66,64 ms écoulés → ~4 rendus à 60 Hz (1 sur 2)
    expect(rendered).toBe(4);
  });

  it('à 60 Hz (16,7 ms/frame), aucun rendu n\'est sauté', () => {
    const frameInterval = 16.7; // ~60 Hz
    let lastRender = -Infinity;
    let rendered = 0;
    let now = 0;
    for (let i = 0; i < 8; i += 1) {
      now += frameInterval;
      if (shouldRender(now, lastRender)) {
        rendered += 1;
        lastRender = now;
      }
    }
    expect(rendered).toBe(8);
  });

  it('met à jour lastRender avec le now du frame rendu (pas incrémenté de minInterval)', () => {
    // Simule une dérive : frames irrégulières, lastRender doit suivre le now réel
    let lastRender = -Infinity;
    expect(shouldRender(20, lastRender)).toBe(true);
    lastRender = 20;
    // Un frame juste après ne doit pas rendre (intervalle trop court)
    expect(shouldRender(25, lastRender)).toBe(false);
    // Mais un frame à now = lastRender + minInterval doit rendre
    expect(shouldRender(35, lastRender)).toBe(true);
  });
});
