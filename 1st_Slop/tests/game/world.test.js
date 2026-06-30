import { describe, it, expect } from 'vitest';
import { createWorld, press, resetRun, updateWorld } from '../../src/game/world.js';
import { States } from '../../src/engine/state.js';
import { CONFIG } from '../../src/config.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } };
}

describe('world', () => {
  it('passe de MENU à PLAY au premier press', () => {
    const w = createWorld(fakeStorage());
    expect(w.sm.get()).toBe(States.MENU);
    press(w);
    expect(w.sm.get()).toBe(States.PLAY);
  });

  it('le robot finit par mourir si on ne fait rien (chute)', () => {
    const w = createWorld(fakeStorage());
    press(w); // start
    for (let i = 0; i < 600; i += 1) updateWorld(w, 1 / 60);
    expect(w.sm.get()).toBe(States.GAMEOVER);
    expect(w.events).toContain('crash');
  });

  it('émet un événement score au passage d\'un obstacle', () => {
    const w = createWorld(fakeStorage());
    // Fix rand so the gap (y≈228, h=185, bottom≈413) covers the robot at y≈320
    w.rand = () => 0.5;
    press(w); // start
    let scored = false;
    for (let i = 0; i < 600 && !scored; i += 1) {
      // Keep robot alive by applying thrust when it falls too low
      if (w.sm.get() === States.PLAY && w.robot.y > 370) press(w);
      updateWorld(w, 1 / 60);
      if (w.events.includes('score')) scored = true;
    }
    expect(scored).toBe(true);
  });

  it('retry depuis GAMEOVER réinitialise le score courant', () => {
    const w = createWorld(fakeStorage());
    press(w);
    w.score.current = 5;
    for (let i = 0; i < 600; i += 1) updateWorld(w, 1 / 60);
    expect(w.sm.get()).toBe(States.GAMEOVER);
    press(w); // retry
    expect(w.sm.get()).toBe(States.PLAY);
    expect(w.score.current).toBe(0);
  });

  describe('tick counter', () => {
    it('tick starts at 0', () => {
      const w = createWorld(fakeStorage());
      expect(w.tick).toBe(0);
    });

    it('updateWorld increments tick once per call while in PLAY', () => {
      const w = createWorld(fakeStorage());
      press(w); // MENU -> PLAY
      updateWorld(w, 1 / 60);
      updateWorld(w, 1 / 60);
      updateWorld(w, 1 / 60);
      expect(w.tick).toBe(3);
    });

    it('tick does not increment outside PLAY state', () => {
      const w = createWorld(fakeStorage());
      // Still in MENU
      updateWorld(w, 1 / 60);
      updateWorld(w, 1 / 60);
      expect(w.tick).toBe(0);
    });
  });

  describe('bgSet selection', () => {
    it('resetRun picks bgSet 0 when rand returns 0', () => {
      const w = createWorld(fakeStorage());
      w.rand = () => 0;
      resetRun(w);
      expect(w.bgSet).toBe(0);
    });

    it('resetRun picks bgSet BG_SET_COUNT-1 when rand returns 0.99', () => {
      const w = createWorld(fakeStorage());
      w.rand = () => 0.99;
      resetRun(w);
      expect(w.bgSet).toBe(CONFIG.BG_SET_COUNT - 1);
    });

    it('bgSet is always in range [0, BG_SET_COUNT)', () => {
      const w = createWorld(fakeStorage());
      for (const val of [0, 0.33, 0.66, 0.99]) {
        w.rand = () => val;
        resetRun(w);
        expect(w.bgSet).toBeGreaterThanOrEqual(0);
        expect(w.bgSet).toBeLessThan(CONFIG.BG_SET_COUNT);
      }
    });

    it('press from MENU picks bgSet using world.rand', () => {
      const w = createWorld(fakeStorage());
      w.rand = () => 0.99;
      press(w); // MENU -> PLAY, calls resetRun
      expect(w.bgSet).toBe(CONFIG.BG_SET_COUNT - 1);
    });
  });
});
