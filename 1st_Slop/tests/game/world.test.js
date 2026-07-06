import { describe, it, expect } from 'vitest';
import { createWorld, press, navMenu, escapeAction, resetRun, startLevel, updateWorld, submitSaveCode, adjustAction } from '../../src/game/world.js';
import { States } from '../../src/engine/state.js';
import { CONFIG } from '../../src/config.js';
import { encodeSave } from '../../src/game/save.js';
import { gateGoalForLevel } from '../../src/game/level.js';

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
    // Fix rand : la salve fraîche (flow, ancrée à HEIGHT/2) reste proche du
    // centre, dans la bande où le robot est maintenu par le thrust ci-dessous.
    w.rand = () => 0.05;
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

  it('atteindre l\'objectif de portes passe en LEVEL_COMPLETE', () => {
    const w = createWorld(fakeStorage());
    press(w);
    w.gatesThisLevel = gateGoalForLevel(w.level) - 1;
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
    w.gatesThisLevel = gateGoalForLevel(w.level);
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
    w.gatesThisLevel = gateGoalForLevel(w.level);
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
    expect(w.diff.gapMin).toBeLessThan(CONFIG.GAP_MIN);
  });

  it('les obstacles spawnen depuis la file de motifs (première salve douce ancrée au centre)', () => {
    const w = createWorld(fakeStorage());
    w.rand = () => 0.4;
    press(w, null); // NEW GAME -> PLAY
    // updateWorld jusqu'au premier spawn
    updateWorld(w, 1 / 60);
    expect(w.obstacles.length).toBeGreaterThan(0);
    const premier = w.obstacles[0];
    // première salve = flow ancré à HEIGHT/2 : delta ≤ 0.35 × max(capacités)
    const d = w.diff;
    const capMax = 0.35 * Math.max(d.deltaUp, d.deltaDown);
    expect(Math.abs(premier.gapY - 320)).toBeLessThanOrEqual(capMax + 1e-9);
    expect(w.lastGapY).toBe(premier.gapY);
  });

  it('resetRun vide la file de motifs et réarme la salve douce', () => {
    const w = createWorld(fakeStorage());
    w.rand = () => 0.4;
    press(w, null);
    updateWorld(w, 1 / 60);
    expect(w.freshLevel).toBe(false);
    resetRun(w);
    expect(w.patternQueue.length).toBe(0);
    expect(w.freshLevel).toBe(true);
    expect(w.lastGapY).toBe(320);
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

  describe('bgSet par tier (décor = progression)', () => {
    it('startLevel fixe le décor du tier', () => {
      const w = createWorld(fakeStorage());
      for (const [level, bg] of [[1, 0], [2, 0], [3, 1], [4, 1], [5, 2], [6, 2], [7, 3], [9, 3], [10, 4], [100, 4]]) {
        startLevel(w, level);
        expect(w.bgSet).toBe(bg);
      }
    });

    it('resetRun ne touche pas bgSet', () => {
      const w = createWorld(fakeStorage());
      startLevel(w, 7);
      resetRun(w);
      expect(w.bgSet).toBe(3);
    });

    it('le menu (createWorld) tire un décor dans [0, BG_SET_COUNT)', () => {
      // createWorld utilise Math.random : on vérifie seulement la borne
      for (let i = 0; i < 20; i += 1) {
        const w = createWorld(fakeStorage());
        expect(w.bgSet).toBeGreaterThanOrEqual(0);
        expect(w.bgSet).toBeLessThan(CONFIG.BG_SET_COUNT);
      }
    });

    it('restart depuis la PAUSE garde le décor', () => {
      const w = createWorld(fakeStorage());
      press(w); // -> PLAY
      startLevel(w, 7); // tier 4 -> bgSet 3
      escapeAction(w); // PAUSE
      const b = w.pause.buttons[1]; // restart
      press(w, { x: b.x + 1, y: b.y + 1 }); // startLevel(7) -> même tier
      expect(w.sm.get()).toBe(States.PLAY);
      expect(w.bgSet).toBe(3);
    });

    it('restart depuis le GAMEOVER garde le décor', () => {
      const w = createWorld(fakeStorage());
      press(w);
      startLevel(w, 7); // tier 4 -> bgSet 3
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      const b = w.gameover.buttons[0]; // restart
      press(w, { x: b.x + 1, y: b.y + 1 }); // startLevel(7) -> même tier
      expect(w.sm.get()).toBe(States.PLAY);
      expect(w.bgSet).toBe(3);
    });

    it('NEW GAME après une mort au niveau 3 revient au décor du tier 1', () => {
      const w = createWorld(fakeStorage());
      press(w);
      startLevel(w, 3); // tier 2 -> bgSet 1
      expect(w.bgSet).toBe(1);
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      escapeAction(w); // GAMEOVER -> MENU
      const b = w.menu.buttons[0]; // newgame
      press(w, { x: b.x + 1, y: b.y + 1 }); // startLevel(1) -> tier 1
      expect(w.bgSet).toBe(0);
    });
  });

  describe('parallaxe du fond lointain par décor (repères uniques = statique)', () => {
    it('startLevel applique la vitesse far du décor', () => {
      const w = createWorld(fakeStorage());
      for (const [level, speed] of [[1, 0.25], [3, 0.25], [5, 0], [7, 0], [10, 0]]) {
        startLevel(w, level);
        expect(w.layers[0].speedFactor).toBe(speed);
      }
    });

    it('startLevel remet l offset far à 0 (pas de joint gelé hors écran)', () => {
      const w = createWorld(fakeStorage());
      startLevel(w, 1); // décor scrollant
      w.sm.to(States.PLAY);
      for (let i = 0; i < 30; i += 1) updateWorld(w, 1 / 60);
      expect(w.layers[0].offset).toBeGreaterThan(0);
      startLevel(w, 10); // décor statique : l offset doit repartir de 0
      expect(w.layers[0].offset).toBe(0);
    });

    it('un décor statique ne scrolle pas pendant le jeu', () => {
      const w = createWorld(fakeStorage());
      startLevel(w, 10);
      w.sm.to(States.PLAY);
      for (let i = 0; i < 30; i += 1) updateWorld(w, 1 / 60);
      expect(w.layers[0].offset).toBe(0);
      expect(w.layers[1].offset).toBeGreaterThan(0); // le premier plan, lui, vit
    });

    it('le menu (createWorld) applique la vitesse far de son décor vitrine', () => {
      for (let i = 0; i < 20; i += 1) {
        const w = createWorld(fakeStorage());
        expect(w.layers[0].speedFactor).toBe(CONFIG.BG_FAR_SPEED[w.bgSet]);
      }
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
      // Ensure focus is on newgame before pressing to transition to PLAY
      w.menu.focus = 0;
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

    it('pause: clic Options ouvre OPTIONS (retour pause)', () => {
      const w = createWorld(fakeStorage());
      press(w); escapeAction(w);
      const b = w.pause.buttons[3]; // options
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.OPTIONS);
      expect(w.optionsReturn).toBe('pause');
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

  describe('continue & savecode routing', () => {
    function storageWithBest(level) {
      const d = { 'jetpackbot.bestLevel': String(level) };
      return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } };
    }

    it('CONTINUE enabled avec une save, démarre au bestLevel', () => {
      const w = createWorld(storageWithBest(5));
      expect(w.menu.buttons[1].enabled).toBe(true);
      const b = w.menu.buttons[1];
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.PLAY);
      expect(w.level).toBe(5);
    });

    it('CONTINUE disabled sans save (clic = no-op)', () => {
      const w = createWorld(fakeStorage());
      expect(w.menu.buttons[1].enabled).toBe(false);
      const b = w.menu.buttons[1];
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('CODE -> SAVECODE avec un écran savecode frais', () => {
      const w = createWorld(storageWithBest(3));
      const b = w.menu.buttons[4];
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.SAVECODE);
      expect(w.savecode.code).toBe(encodeSave({ bestLevel: 3 }));
    });

    it('SAVECODE: COPIER pousse copycode + feedback', () => {
      const w = createWorld(storageWithBest(3));
      press(w, { x: w.menu.buttons[4].x + 1, y: w.menu.buttons[4].y + 1 });
      const b = w.savecode.menu.buttons[0];
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.events).toContain('copycode');
      expect(w.savecode.feedbackText).toBe('COPIÉ !');
    });

    it('SAVECODE: LIEN pousse copylink, SAISIR pousse codeentry', () => {
      const w = createWorld(storageWithBest(3));
      press(w, { x: w.menu.buttons[4].x + 1, y: w.menu.buttons[4].y + 1 });
      const link = w.savecode.menu.buttons[1];
      press(w, { x: link.x + 1, y: link.y + 1 });
      expect(w.events).toContain('copylink');
      const enter = w.savecode.menu.buttons[2];
      press(w, { x: enter.x + 1, y: enter.y + 1 });
      expect(w.events).toContain('codeentry');
      expect(w.sm.get()).toBe(States.SAVECODE);
    });

    it('SAVECODE: RETOUR et Escape ramènent au MENU', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[4].x + 1, y: w.menu.buttons[4].y + 1 });
      const back = w.savecode.menu.buttons[3];
      press(w, { x: back.x + 1, y: back.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
      press(w, { x: w.menu.buttons[4].x + 1, y: w.menu.buttons[4].y + 1 });
      escapeAction(w);
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('navMenu agit en SAVECODE', () => {
      const w = createWorld(storageWithBest(3));
      press(w, { x: w.menu.buttons[4].x + 1, y: w.menu.buttons[4].y + 1 });
      const before = w.savecode.menu.focus;
      navMenu(w, 1);
      expect(w.savecode.menu.focus).not.toBe(before);
    });

    it('submitSaveCode restaure exactement, même vers le bas (saisie = geste délibéré)', () => {
      const storage = storageWithBest(14);
      const w = createWorld(storage);
      press(w, { x: w.menu.buttons[4].x + 1, y: w.menu.buttons[4].y + 1 });
      expect(submitSaveCode(w, encodeSave({ bestLevel: 7 }))).toBe(true);
      expect(w.score.bestLevel).toBe(7);
      expect(storage.getItem('jetpackbot.bestLevel')).toBe('7');
      expect(w.menu.buttons[1].enabled).toBe(true); // CONTINUER -> niveau 7
    });

    it('submitSaveCode valide: applique le code, recrée le menu, retourne au MENU', () => {
      const storage = fakeStorage();
      const w = createWorld(storage);
      press(w, { x: w.menu.buttons[4].x + 1, y: w.menu.buttons[4].y + 1 });
      const ok = submitSaveCode(w, encodeSave({ bestLevel: 9 }));
      expect(ok).toBe(true);
      expect(w.sm.get()).toBe(States.MENU);
      expect(w.score.bestLevel).toBe(9);
      expect(w.menu.buttons[1].enabled).toBe(true);
      expect(storage.getItem('jetpackbot.bestLevel')).toBe('9');
    });

    it('submitSaveCode invalide: false, reste en SAVECODE, score intact', () => {
      const w = createWorld(storageWithBest(4));
      press(w, { x: w.menu.buttons[4].x + 1, y: w.menu.buttons[4].y + 1 });
      expect(submitSaveCode(w, 'JB1-ZZZZZZ')).toBe(false);
      expect(w.sm.get()).toBe(States.SAVECODE);
      expect(w.score.bestLevel).toBe(4);
    });

    it('retour au MENU depuis la pause recrée le menu (CONTINUE reflète la save)', () => {
      const w = createWorld(fakeStorage());
      press(w); // newgame -> PLAY
      w.score.bestLevel = 2; // progression pendant la partie
      escapeAction(w); // PAUSE
      const b = w.pause.buttons[2]; // menu
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
      expect(w.menu.buttons[1].enabled).toBe(true);
    });
  });

  describe('options routing', () => {
    it('menu: clic OPTIONS ouvre l\'écran avec les settings courants', () => {
      const w = createWorld(fakeStorage());
      const b = w.menu.buttons[3]; // options
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.OPTIONS);
      expect(w.optionsReturn).toBe('menu');
      expect(w.options.rows[0].value).toBe(w.settings.sfx);
    });

    it('OPTIONS: RETOUR (clic) revient à l\'origine menu', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
      const r = CONFIG.OPTIONS_BTN;
      press(w, { x: r.x + 1, y: r.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('OPTIONS depuis la pause: Escape revient en PAUSE, partie gelée', () => {
      const w = createWorld(fakeStorage());
      press(w); // PLAY
      updateWorld(w, 1 / 60);
      escapeAction(w); // PAUSE
      const y = w.robot.y;
      const b = w.pause.buttons[3];
      press(w, { x: b.x + 1, y: b.y + 1 }); // OPTIONS
      updateWorld(w, 1 / 60);
      updateWorld(w, 1 / 60);
      expect(w.robot.y).toBe(y); // gelé en OPTIONS
      escapeAction(w);
      expect(w.sm.get()).toBe(States.PAUSE);
      expect(w.robot.y).toBe(y); // toujours gelé
    });

    it('adjustAction change la valeur focusée, met à jour settings et pousse volsfx', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
      const before = w.settings.sfx;
      adjustAction(w, -1);
      expect(w.options.rows[0].value).toBe(before - 1);
      expect(w.settings.sfx).toBe(before - 1);
      expect(w.events).toContain('volsfx');
    });

    it('adjustAction sur la ligne MUSIQUE pousse volmusic', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
      navMenu(w, 1); // focus MUSIQUE
      adjustAction(w, 1);
      expect(w.events).toContain('volmusic');
      expect(w.settings.music).toBe(8);
    });

    it('adjustAction hors OPTIONS = no-op', () => {
      const w = createWorld(fakeStorage());
      adjustAction(w, 1);
      expect(w.events).toEqual([]);
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('clic sur un segment règle la valeur et pousse l\'event', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
      const R = CONFIG.OPTIONS_ROWS;
      press(w, { x: R.x + 2 * (R.segW + R.segGap) + 1, y: R.y0 + R.gap + 1 }); // music -> 2
      expect(w.settings.music).toBe(2);
      expect(w.events).toContain('volmusic');
    });

    it('clic sur un segment de la valeur courante ne pousse pas d\'event', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
      const R = CONFIG.OPTIONS_ROWS;
      const cur = w.settings.sfx;
      press(w, { x: R.x + cur * (R.segW + R.segGap) + 1, y: R.y0 + 1 });
      expect(w.events).toEqual([]);
    });

    it('nav clavier: haut/bas change le focus, Enter sur RETOUR ferme', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
      navMenu(w, -1); // wrap -> RETOUR (2)
      expect(w.options.focus).toBe(2);
      press(w); // activation clavier
      expect(w.sm.get()).toBe(States.MENU);
    });
  });

  describe('skins routing (hangar)', () => {
    function storageWith(entries) {
      const d = { ...entries };
      return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } };
    }

    function openHangar(w) {
      const b = w.menu.buttons[2]; // robots
      press(w, { x: b.x + 1, y: b.y + 1 });
    }

    it('createWorld charge le skin persisté (débloqué)', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '5', 'jetpackbot.skin': '2' }));
      expect(w.skin).toBe(2);
    });

    it('createWorld ramène un skin verrouillé à 0', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '3', 'jetpackbot.skin': '4' }));
      expect(w.skin).toBe(0);
    });

    it('menu: clic ROBOTS ouvre le hangar sur le skin sélectionné (label ACTUEL)', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '5', 'jetpackbot.skin': '2' }));
      openHangar(w);
      expect(w.sm.get()).toBe(States.SKINS);
      expect(w.skinsScreen.slot).toBe(2);
      expect(w.skinsScreen.menu.buttons[0].label).toBe('ACTUEL');
      expect(w.skinsScreen.menu.buttons[0].enabled).toBe(false);
    });

    it('adjustAction boucle les slots 0<->4', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '10' }));
      openHangar(w);
      expect(w.skinsScreen.slot).toBe(0);
      adjustAction(w, -1);
      expect(w.skinsScreen.slot).toBe(4);
      adjustAction(w, 1);
      expect(w.skinsScreen.slot).toBe(0);
      adjustAction(w, 1);
      expect(w.skinsScreen.slot).toBe(1);
    });

    it('CHOISIR débloqué: sélectionne, persiste, reste en SKINS, label ACTUEL', () => {
      const storage = storageWith({ 'jetpackbot.bestLevel': '5' });
      const w = createWorld(storage);
      openHangar(w);
      adjustAction(w, 1); // slot 1 (FORGE, débloqué à best 5)
      expect(w.skinsScreen.menu.buttons[0].label).toBe('CHOISIR');
      press(w); // clavier : focus sur CHOISIR (premier enabled)
      expect(w.skin).toBe(1);
      expect(storage.getItem('jetpackbot.skin')).toBe('1');
      expect(w.sm.get()).toBe(States.SKINS);
      expect(w.skinsScreen.menu.buttons[0].label).toBe('ACTUEL');
      expect(w.skinsScreen.menu.buttons[0].enabled).toBe(false);
    });

    it('CHOISIR verrouillé inactif (clic = no-op, rien persisté)', () => {
      const storage = storageWith({ 'jetpackbot.bestLevel': '3' });
      const w = createWorld(storage);
      openHangar(w);
      adjustAction(w, 1); adjustAction(w, 1); // slot 2 (VENIN, verrouillé à best 3)
      const b = w.skinsScreen.menu.buttons[0];
      expect(b.enabled).toBe(false);
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.skin).toBe(0);
      expect(storage.getItem('jetpackbot.skin')).toBe(null);
      expect(w.sm.get()).toBe(States.SKINS);
    });

    it('tap sur les zones flèches < > change le slot', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '10' }));
      openHangar(w);
      const A = CONFIG.SKINS_ARROW;
      press(w, { x: A.rx + 1, y: A.y + 1 });
      expect(w.skinsScreen.slot).toBe(1);
      press(w, { x: A.lx + 1, y: A.y + 1 });
      expect(w.skinsScreen.slot).toBe(0);
    });

    it('RETOUR et Escape ramènent au MENU', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '5' }));
      openHangar(w);
      const back = w.skinsScreen.menu.buttons[1];
      press(w, { x: back.x + 1, y: back.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
      openHangar(w);
      escapeAction(w);
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('navMenu agit en SKINS', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '5' }));
      openHangar(w);
      adjustAction(w, 1); // slot 1 : CHOISIR + RETOUR tous deux enabled
      const before = w.skinsScreen.menu.focus;
      navMenu(w, 1);
      expect(w.skinsScreen.menu.focus).not.toBe(before);
    });
  });
});
