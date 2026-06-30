import { describe, it, expect } from 'vitest';
import { computeSteps } from '../../src/engine/loop.js';

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
