import { describe, it, expect } from 'vitest';
import { createWorld, press, navMenu, escapeAction, resetRun, startLevel, updateWorld } from '../../src/game/world.js';
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

  describe('bgSet selection (décor persistant)', () => {
    it('resetRun ne touche plus bgSet', () => {
      const w = createWorld(fakeStorage());
      w.bgSet = 1;
      w.rand = () => 0.99;
      resetRun(w);
      expect(w.bgSet).toBe(1);
    });

    it('startLevel même niveau garde le décor', () => {
      const w = createWorld(fakeStorage());
      w.level = 3;
      w.bgSet = 1;
      w.rand = () => 0.99;
      startLevel(w, 3);
      expect(w.bgSet).toBe(1);
    });

    it('startLevel niveau différent retire le décor via world.rand', () => {
      const w = createWorld(fakeStorage());
      w.level = 1;
      w.bgSet = 1;
      w.rand = () => 0.99;
      startLevel(w, 2);
      expect(w.bgSet).toBe(CONFIG.BG_SET_COUNT - 1);
      w.rand = () => 0;
      startLevel(w, 3);
      expect(w.bgSet).toBe(0);
    });

    it('bgSet reste dans [0, BG_SET_COUNT) pour tout tirage', () => {
      const w = createWorld(fakeStorage());
      for (const val of [0, 0.33, 0.66, 0.99]) {
        w.rand = () => val;
        startLevel(w, w.level + 1);
        expect(w.bgSet).toBeGreaterThanOrEqual(0);
        expect(w.bgSet).toBeLessThan(CONFIG.BG_SET_COUNT);
      }
    });

    it('restart depuis la PAUSE garde le décor', () => {
      const w = createWorld(fakeStorage());
      press(w); // -> PLAY (niveau 1)
      w.bgSet = 2;
      escapeAction(w); // PAUSE
      const b = w.pause.buttons[1]; // restart
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.PLAY);
      expect(w.bgSet).toBe(2);
    });

    it('restart depuis le GAMEOVER garde le décor', () => {
      const w = createWorld(fakeStorage());
      press(w);
      w.bgSet = 2;
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      const b = w.gameover.buttons[0]; // restart
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.PLAY);
      expect(w.bgSet).toBe(2);
    });

    it('NEW GAME après une mort au niveau 3 retire le décor', () => {
      const w = createWorld(fakeStorage());
      press(w);
      w.level = 3;
      w.bgSet = 1;
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      escapeAction(w); // GAMEOVER -> MENU
      w.rand = () => 0.99;
      const b = w.menu.buttons[0]; // newgame
      press(w, { x: b.x + 1, y: b.y + 1 }); // startLevel(1), 1 !== 3 -> reroll
      expect(w.bgSet).toBe(CONFIG.BG_SET_COUNT - 1);
    });
  });

  describe('menu routing', () => {
    it('press avec pointer sur New Game démarre le niveau 1', () => {
      const w = createWorld(fakeStorage());
      const b = w.menu.buttons[0];
      press(w, { x: b.x + b.w / 2, y: b.y + b.h / 2 });
      expect(w.sm.get()).toBe(States.PLAY);
      expect(w.level).toBe(1);
    });

    it('press avec pointer sur Continue (stub disabled) reste au MENU', () => {
      const w = createWorld(fakeStorage());
      const b = w.menu.buttons[1];
      press(w, { x: b.x + b.w / 2, y: b.y + b.h / 2 });
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('press clavier (sans pointer) active le focus et démarre', () => {
      const w = createWorld(fakeStorage());
      press(w);
      expect(w.sm.get()).toBe(States.PLAY);
    });

    it('press dans le vide au MENU ne fait rien', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: 0, y: 0 });
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('navMenu ne change pas d\'état et est no-op hors MENU', () => {
      const w = createWorld(fakeStorage());
      navMenu(w, 1);
      expect(w.sm.get()).toBe(States.MENU);
      press(w); // -> PLAY
      navMenu(w, 1); // no-op en PLAY
      expect(w.sm.get()).toBe(States.PLAY);
    });

    it('menuTick s\'incrémente à chaque updateWorld, même au MENU', () => {
      const w = createWorld(fakeStorage());
      updateWorld(w, 1 / 60);
      updateWorld(w, 1 / 60);
      expect(w.menuTick).toBe(2);
    });
  });

  describe('pause & gameover-menu routing', () => {
    it('press en PLAY sur l\'icône ⏸ passe en PAUSE', () => {
      const w = createWorld(fakeStorage());
      press(w); // -> PLAY
      const pi = CONFIG.PAUSE_ICON;
      press(w, { x: pi.x + 1, y: pi.y + 1 });
      expect(w.sm.get()).toBe(States.PAUSE);
    });

    it('press en PLAY ailleurs pousse (reste PLAY)', () => {
      const w = createWorld(fakeStorage());
      press(w);
      press(w, { x: 10, y: 300 });
      expect(w.sm.get()).toBe(States.PLAY);
    });

    it('escapeAction bascule PLAY<->PAUSE', () => {
      const w = createWorld(fakeStorage());
      press(w);
      escapeAction(w);
      expect(w.sm.get()).toBe(States.PAUSE);
      escapeAction(w);
      expect(w.sm.get()).toBe(States.PLAY);
    });

    it('pause: resume (clavier) -> PLAY', () => {
      const w = createWorld(fakeStorage());
      press(w); escapeAction(w); // PAUSE, focus resume
      press(w); // no pointer -> activate(resume)
      expect(w.sm.get()).toBe(States.PLAY);
    });

    it('pause: restart -> PLAY, même niveau, gates=0', () => {
      const w = createWorld(fakeStorage());
      press(w); w.level = 4; w.gatesThisLevel = 6; escapeAction(w); // PAUSE
      const b = w.pause.buttons[1]; // restart
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.PLAY);
      expect(w.level).toBe(4);
      expect(w.gatesThisLevel).toBe(0);
    });

    it('pause: menu -> MENU', () => {
      const w = createWorld(fakeStorage());
      press(w); escapeAction(w);
      const b = w.pause.buttons[2]; // menu
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('pause: clic Options (disabled) reste PAUSE', () => {
      const w = createWorld(fakeStorage());
      press(w); escapeAction(w);
      const b = w.pause.buttons[3]; // options disabled
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.PAUSE);
    });

    it('navMenu agit en PAUSE', () => {
      const w = createWorld(fakeStorage());
      press(w); escapeAction(w);
      const before = w.pause.focus;
      navMenu(w, 1);
      expect(w.pause.focus).not.toBe(before);
    });

    it('gel en PAUSE: le robot n\'avance pas', () => {
      const w = createWorld(fakeStorage());
      press(w);
      updateWorld(w, 1 / 60);
      escapeAction(w); // PAUSE
      const y = w.robot.y;
      updateWorld(w, 1 / 60);
      updateWorld(w, 1 / 60);
      expect(w.robot.y).toBe(y);
    });

    it('gameover: clic sur le bouton MENU -> MENU', () => {
      const w = createWorld(fakeStorage());
      press(w);
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      expect(w.sm.get()).toBe(States.GAMEOVER);
      const b = w.gameover.buttons[1]; // menu
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('gameover: clic hors boutons = no-op (reste GAMEOVER)', () => {
      const w = createWorld(fakeStorage());
      press(w);
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      press(w, { x: 10, y: 10 });
      expect(w.sm.get()).toBe(States.GAMEOVER);
    });

    it('gameover: clic RECOMMENCER -> PLAY, même niveau, gates=0', () => {
      const w = createWorld(fakeStorage());
      press(w);
      w.level = 3;
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      const b = w.gameover.buttons[0]; // restart
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.PLAY);
      expect(w.level).toBe(3);
      expect(w.gatesThisLevel).toBe(0);
    });

    it('navMenu agit en GAMEOVER', () => {
      const w = createWorld(fakeStorage());
      press(w);
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      const before = w.gameover.focus;
      navMenu(w, 1);
      expect(w.gameover.focus).not.toBe(before);
    });

    it('gameover: le focus revient sur RECOMMENCER à chaque nouvelle mort', () => {
      const w = createWorld(fakeStorage());
      press(w);
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      navMenu(w, 1); // focus -> menu
      const b = w.gameover.buttons[0]; // restart
      press(w, { x: b.x + 1, y: b.y + 1 }); // -> PLAY
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      expect(w.gameover.buttons[w.gameover.focus].id).toBe('restart');
    });

    it('escapeAction en GAMEOVER -> MENU', () => {
      const w = createWorld(fakeStorage());
      press(w);
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      escapeAction(w);
      expect(w.sm.get()).toBe(States.MENU);
    });
  });
});
