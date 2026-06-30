import { describe, it, expect } from 'vitest';
import { createParticleField, spawnReactor, updateParticles } from '../../src/game/particles.js';

const stubRand = () => 0.5;

describe('particles', () => {
  describe('createParticleField', () => {
    it('returns an object with an empty particles array', () => {
      const field = createParticleField();
      expect(field.particles).toEqual([]);
    });
  });

  describe('spawnReactor', () => {
    it('adds count particles to the field', () => {
      const field = createParticleField();
      const robot = { x: 96, y: 300, w: 34, h: 24, vy: -100, alive: true };
      spawnReactor(field, robot, stubRand, 2);
      expect(field.particles).toHaveLength(2);
    });

    it('uses default count of 2 when count is omitted', () => {
      const field = createParticleField();
      const robot = { x: 96, y: 300, w: 34, h: 24, vy: -100, alive: true };
      spawnReactor(field, robot, stubRand);
      expect(field.particles).toHaveLength(2);
    });

    it('positions particles at the robot thruster (bottom-center)', () => {
      const field = createParticleField();
      const robot = { x: 100, y: 200, w: 40, h: 20, vy: -100, alive: true };
      // With stubRand=0.5: x = 100 + 20 + (0.5-0.5)*6 = 120, y = 200+20 = 220
      spawnReactor(field, robot, stubRand, 1);
      const p = field.particles[0];
      expect(p.x).toBeCloseTo(120, 5);
      expect(p.y).toBeCloseTo(220, 5);
    });

    it('sets maxLife equal to the initial life value', () => {
      const field = createParticleField();
      const robot = { x: 96, y: 300, w: 34, h: 24, vy: -100, alive: true };
      spawnReactor(field, robot, stubRand, 3);
      for (const p of field.particles) {
        expect(p.maxLife).toBe(p.life);
      }
    });

    it('life is within [0.35, 0.60]', () => {
      const field = createParticleField();
      const robot = { x: 96, y: 300, w: 34, h: 24, vy: -100, alive: true };
      spawnReactor(field, robot, () => 0, 1);
      expect(field.particles[0].life).toBeCloseTo(0.35, 5);
      const field2 = createParticleField();
      spawnReactor(field2, robot, () => 1, 1);
      expect(field2.particles[0].life).toBeCloseTo(0.60, 5);
    });

    it('accumulates particles across multiple calls', () => {
      const field = createParticleField();
      const robot = { x: 96, y: 300, w: 34, h: 24, vy: -100, alive: true };
      spawnReactor(field, robot, stubRand, 2);
      spawnReactor(field, robot, stubRand, 3);
      expect(field.particles).toHaveLength(5);
    });
  });

  describe('updateParticles', () => {
    it('moves a particle by vx*dt and vy*dt', () => {
      const field = createParticleField();
      const robot = { x: 100, y: 200, w: 40, h: 20, vy: -100, alive: true };
      spawnReactor(field, robot, stubRand, 1);
      const p = field.particles[0];
      const x0 = p.x;
      const y0 = p.y;
      const vx0 = p.vx;
      const vy0 = p.vy;
      const dt = 0.1;
      updateParticles(field, dt);
      expect(p.x).toBeCloseTo(x0 + vx0 * dt, 5);
      expect(p.y).toBeCloseTo(y0 + vy0 * dt, 5);
    });

    it('decrements life by dt', () => {
      const field = createParticleField();
      const robot = { x: 96, y: 300, w: 34, h: 24, vy: -100, alive: true };
      spawnReactor(field, robot, stubRand, 1);
      const lifeBefore = field.particles[0].life;
      updateParticles(field, 0.1);
      expect(field.particles[0].life).toBeCloseTo(lifeBefore - 0.1, 5);
    });

    it('removes particles whose life has reached 0', () => {
      const field = createParticleField();
      const robot = { x: 96, y: 300, w: 34, h: 24, vy: -100, alive: true };
      spawnReactor(field, robot, stubRand, 1);
      // Advance past the full lifespan
      updateParticles(field, 1.0);
      expect(field.particles).toHaveLength(0);
    });

    it('keeps particles that still have remaining life', () => {
      const field = createParticleField();
      const robot = { x: 96, y: 300, w: 34, h: 24, vy: -100, alive: true };
      spawnReactor(field, robot, stubRand, 1);
      updateParticles(field, 0.01);
      expect(field.particles).toHaveLength(1);
    });
  });
});
