import { describe, it, expect } from 'vitest';
import { createAmbiance, updateAmbiance } from '../../src/game/ambiance.js';

const stubRand = () => 0.5;

describe('ambiance', () => {
  describe('createAmbiance', () => {
    it('creates exactly count drops', () => {
      const a = createAmbiance(stubRand, 40, 360, 640);
      expect(a.drops).toHaveLength(40);
    });

    it('all drops are within canvas bounds', () => {
      const width = 360;
      const height = 640;
      const a = createAmbiance(Math.random, 100, width, height);
      for (const d of a.drops) {
        expect(d.x).toBeGreaterThanOrEqual(0);
        expect(d.x).toBeLessThan(width);
        expect(d.y).toBeGreaterThanOrEqual(0);
        expect(d.y).toBeLessThan(height);
      }
    });

    it('drops have correct structure and plausible values', () => {
      const a = createAmbiance(stubRand, 1, 360, 640);
      const d = a.drops[0];
      expect(d).toHaveProperty('x');
      expect(d).toHaveProperty('y');
      expect(d).toHaveProperty('vx');
      expect(d).toHaveProperty('vy');
      expect(d).toHaveProperty('len');
      // With stubRand=0.5: vx = -(10 + 0.5*20) = -20, vy = 60 + 0.5*60 = 90, len = 4 + 0.5*6 = 7
      expect(d.vx).toBeCloseTo(-20, 5);
      expect(d.vy).toBeCloseTo(90, 5);
      expect(d.len).toBeCloseTo(7, 5);
    });

    it('creates zero drops when count is 0', () => {
      const a = createAmbiance(stubRand, 0, 360, 640);
      expect(a.drops).toHaveLength(0);
    });
  });

  describe('updateAmbiance', () => {
    it('moves a drop by vx*dt and vy*dt', () => {
      const a = createAmbiance(stubRand, 1, 360, 640);
      const d = a.drops[0];
      const x0 = d.x;
      const y0 = d.y;
      updateAmbiance(a, 0.1, 360, 640);
      // With stubRand=0.5: vx=-20, vy=90; x0=180, y0=320
      // After 0.1s: x=178, y=329 — still in bounds, no wrap
      expect(d.x).toBeCloseTo(x0 + d.vx * 0.1 /* already moved, get diff from post-update state */
        // d.vx stays constant, so compare directly
        , 0); // loose check — exact below
      // Re-check with a known setup
    });

    it('moves drop correctly with known values', () => {
      const a = { drops: [{ x: 100, y: 100, vx: -10, vy: 50, len: 5 }] };
      updateAmbiance(a, 1, 360, 640);
      expect(a.drops[0].x).toBeCloseTo(90, 5);
      expect(a.drops[0].y).toBeCloseTo(150, 5);
    });

    it('wraps a drop back to top when y exceeds height', () => {
      const height = 640;
      const width = 360;
      const a = { drops: [{ x: 100, y: 639, vx: -1, vy: 100, len: 5 }] };
      updateAmbiance(a, 1, width, height);
      // y = 639 + 100 = 739 > 640 → y -= 640 → y = 99
      expect(a.drops[0].y).toBeCloseTo(99, 5);
    });

    it('wraps x to positive range after vertical wrap', () => {
      const width = 360;
      const height = 640;
      // x will go negative after moving, and vertical wrap also resets x modulo width
      const a = { drops: [{ x: 5, y: 639, vx: -20, vy: 100, len: 5 }] };
      updateAmbiance(a, 1, width, height);
      // y = 739 > 640 → y -= 640; x = 5 - 20 = -15 → ((−15 % 360) + 360) % 360 = 345
      expect(a.drops[0].y).toBeCloseTo(99, 5);
      expect(a.drops[0].x).toBeCloseTo(345, 5);
    });

    it('wraps x independently when only x goes negative (no vertical wrap)', () => {
      const width = 360;
      const height = 640;
      const a = { drops: [{ x: 2, y: 100, vx: -10, vy: 1, len: 5 }] };
      updateAmbiance(a, 1, width, height);
      // x = 2 - 10 = -8 < 0 → x += 360 = 352
      expect(a.drops[0].x).toBeCloseTo(352, 5);
    });
  });
});
