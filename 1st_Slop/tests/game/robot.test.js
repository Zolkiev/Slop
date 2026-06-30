import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../src/config.js';
import { createRobot, applyThrust, updateRobot } from '../../src/game/robot.js';

describe('robot', () => {
  it('démarre au centre, immobile et vivant', () => {
    const r = createRobot();
    expect(r.x).toBe(CONFIG.ROBOT_X);
    expect(r.y).toBe(CONFIG.HEIGHT / 2);
    expect(r.vy).toBe(0);
    expect(r.alive).toBe(true);
  });

  it('thrust donne une vitesse vers le haut (négative)', () => {
    const r = createRobot();
    applyThrust(r);
    expect(r.vy).toBe(-CONFIG.THRUST);
  });

  it('la gravité augmente vy et fait descendre le robot', () => {
    const r = createRobot();
    updateRobot(r, 0.1);
    expect(r.vy).toBeCloseTo(CONFIG.GRAVITY * 0.1, 5);
    expect(r.y).toBeGreaterThan(CONFIG.HEIGHT / 2);
  });

  it('plafonne la vitesse de chute à MAX_FALL', () => {
    const r = createRobot();
    for (let i = 0; i < 100; i += 1) updateRobot(r, 0.1);
    expect(r.vy).toBeLessThanOrEqual(CONFIG.MAX_FALL);
  });
});
