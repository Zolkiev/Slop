import { describe, it, expect } from 'vitest';
import { createTwinkles, twinkleAlpha } from '../../src/game/twinkle.js';

describe('twinkle', () => {
  describe('createTwinkles', () => {
    it('creates exactly count points', () => {
      const t = createTwinkles(Math.random, 50, 360, 640);
      expect(t.points).toHaveLength(50);
    });

    it('all points x are in [0, width)', () => {
      const width = 360;
      const height = 640;
      const t = createTwinkles(Math.random, 100, width, height);
      for (const p of t.points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(width);
      }
    });

    it('all points y are in [0, height * 0.72)', () => {
      const width = 360;
      const height = 640;
      const t = createTwinkles(Math.random, 100, width, height);
      for (const p of t.points) {
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThan(height * 0.72);
      }
    });
  });

  describe('twinkleAlpha', () => {
    it('returns a value in [0, 1] across several ticks', () => {
      const t = createTwinkles(Math.random, 10, 360, 640);
      for (const point of t.points) {
        for (const tick of [0, 10, 30, 60, 120, 240]) {
          const alpha = twinkleAlpha(point, tick);
          expect(alpha).toBeGreaterThanOrEqual(0);
          expect(alpha).toBeLessThanOrEqual(1);
        }
      }
    });

    it('varies as tick advances (not constant)', () => {
      const point = { x: 0, y: 0, phase: 0, period: 60, color: '#00e5ff' };
      const a0 = twinkleAlpha(point, 0);
      const a15 = twinkleAlpha(point, 15);
      const a30 = twinkleAlpha(point, 30);
      // Not all three equal — the sinusoid must vary
      expect(a0 === a15 && a15 === a30).toBe(false);
    });
  });
});
