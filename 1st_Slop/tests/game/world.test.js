import { describe, it, expect } from 'vitest';
import { createWorld, press, resetRun, startLevel, updateWorld } from '../../src/game/world.js';
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

  it('retry depuis GAMEOVER rejoue le même niveau et remet la progression à 0', () => {
    const w = createWorld(fakeStorage());
    press(w);
    w.level = 3;
    w.gatesThisLevel = 5;
    for (let i = 0; i < 600; i += 1) updateWorld(w, 1 / 60);
    expect(w.sm.get()).toBe(States.GAMEOVER);
    const levelAtDeath = w.level;
    press(w); // retry
    expect(w.sm.get()).toBe(States.PLAY);
    expect(w.level).toBe(levelAtDeath);
    expect(w.gatesThisLevel).toBe(0);
  });

  it('atteindre GATES_PER_LEVEL portes passe en LEVEL_COMPLETE', () => {
    const w = createWorld(fakeStorage());
    press(w);
    w.gatesThisLevel = CONFIG.GATES_PER_LEVEL - 1;
    // obstacle déjà dépassé par le robot (x+OBSTACLE_W < ROBOT_X) mais pas encore recyclé
    w.obstacles = [{ x: 20, gapY: 0, gapH: CONFIG.HEIGHT, passed: false }];
    updateWorld(w, 1 / 60);
    expect(w.sm.get()).toBe(States.LEVEL_COMPLETE);
    expect(w.events).toContain('levelcomplete');
  });

  it('press en LEVEL_COMPLETE passe au niveau suivant et remet la progression à 0', () => {
    const w = createWorld(fakeStorage());
    press(w);
    w.level = 2;
    w.gatesThisLevel = CONFIG.GATES_PER_LEVEL;
    w.obstacles = [{ x: 20, gapY: 0, gapH: CONFIG.HEIGHT, passed: false }];
    updateWorld(w, 1 / 60); // -> LEVEL_COMPLETE
    expect(w.sm.get()).toBe(States.LEVEL_COMPLETE);
    press(w);
    expect(w.sm.get()).toBe(States.PLAY);
    expect(w.level).toBe(3);
    expect(w.gatesThisLevel).toBe(0);
  });

  it('finir un niveau met à jour bestLevel (et le persiste)', () => {
    const storage = fakeStorage();
    const w = createWorld(storage);
    press(w);
    w.level = 4;
    w.gatesThisLevel = CONFIG.GATES_PER_LEVEL;
    w.obstacles = [{ x: 20, gapY: 0, gapH: CONFIG.HEIGHT, passed: false }];
    updateWorld(w, 1 / 60);
    expect(w.score.bestLevel).toBe(4);
    expect(storage.getItem('jetpackbot.bestLevel')).toBe('4');
  });

  it('startLevel applique la difficulté du niveau', () => {
    const w = createWorld(fakeStorage());
    startLevel(w, 5);
    expect(w.level).toBe(5);
    expect(w.scrollSpeed).toBeGreaterThan(CONFIG.SCROLL_SPEED);
    expect(w.gapMin).toBeLessThan(CONFIG.GAP_MIN);
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

  describe('crash juice — shake and flash', () => {
    /** Run until death, return world stopped one tick after the killing update. */
    function runToDeath() {
      const w = createWorld(fakeStorage());
      press(w); // start
      for (let i = 0; i < 600; i++) {
        updateWorld(w, 1 / 60);
        if (w.sm.get() === States.GAMEOVER) break;
      }
      expect(w.sm.get()).toBe(States.GAMEOVER); // sanity
      return w;
    }

    it('shake and flash are positive immediately after crash', () => {
      const w = runToDeath();
      expect(w.shake).toBeGreaterThan(0);
      expect(w.flash).toBeGreaterThan(0);
    });

    it('shake and flash decrease on further updates (in GAMEOVER)', () => {
      const w = runToDeath();
      const shakeBefore = w.shake;
      const flashBefore = w.flash;
      updateWorld(w, 1 / 60);
      expect(w.shake).toBeLessThan(shakeBefore);
      expect(w.flash).toBeLessThan(flashBefore);
    });

    it('shake and flash clamp at 0 and never go negative', () => {
      const w = runToDeath();
      // Drain fully (SHAKE_TIME=0.3s → 18 ticks; run 100 to be safe)
      for (let i = 0; i < 100; i++) updateWorld(w, 1 / 60);
      expect(w.shake).toBe(0);
      expect(w.flash).toBe(0);
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
