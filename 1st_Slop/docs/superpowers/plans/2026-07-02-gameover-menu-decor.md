# Game-over Menu + Persistent Decor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the game-over screen's single MENU button + tap-anywhere-retry with a real two-button menu (RECOMMENCER / MENU, mirroring the pause overlay), and make restarting a level reuse the same background (`bgSet`) instead of rerolling it.

**Architecture:** Reuse the existing menu infrastructure end-to-end: `build()` factory in `src/game/menu.js` creates the game-over menu, `press()`/`navMenu()` in `src/game/world.js` route it exactly like the pause menu, and the shared `drawButtons()` renders it. The `bgSet` reroll moves out of `resetRun()` into `startLevel()`, gated on `level !== world.level`.

**Tech Stack:** Vanilla JS (ES modules), Canvas 2D, Vitest. Zero runtime dependencies — do not add any.

**Spec:** `docs/superpowers/specs/2026-07-02-gameover-menu-decor-design.md`

## Global Constraints

- Zero runtime dependencies (vanilla JS + Canvas 2D only).
- Game logic stays pure and DOM-free in `src/game/`; rendering in `src/render/`.
- Test names are written in French, matching the existing suites.
- Run the full suite with `npx vitest run` from the repo root (`1st_Slop/`); expect all tests green after every task.
- Button labels are UPPERCASE French: `RECOMMENCER`, `MENU`.

---

### Task 1: `hitTest` skips disabled buttons

Deferred nit being folded in: `hitTest` currently returns disabled button ids (`continue`, `options`); callers treat them as no-ops, but this is a footgun before Continue/Options get wired. Make `hitTest` return `null` for disabled buttons.

**Files:**
- Modify: `src/game/menu.js:31-36` (function `hitTest`)
- Test: `tests/game/menu.test.js`

**Interfaces:**
- Consumes: existing `inRect(rect, px, py)` from `src/game/menu.js`.
- Produces: `hitTest(menu, px, py)` → `string | null`; now only returns ids of `enabled` buttons. No caller changes needed (all callers already no-op on the disabled ids).

- [ ] **Step 1: Write the failing test**

Add to the `describe('menu', ...)` block in `tests/game/menu.test.js`:

```js
  it('hitTest ignore les boutons disabled (renvoie null)', () => {
    const m = createMenu();
    const b = m.buttons[1]; // continue, disabled
    expect(b.enabled).toBe(false);
    expect(hitTest(m, b.x + b.w / 2, b.y + b.h / 2)).toBe(null);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/menu.test.js`
Expected: FAIL — `expected 'continue' to be null`

- [ ] **Step 3: Write minimal implementation**

In `src/game/menu.js`, change `hitTest`:

```js
export function hitTest(menu, px, py) {
  for (const b of menu.buttons) {
    if (b.enabled && inRect(b, px, py)) return b.id;
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS (existing tests `pause: clic Options (disabled) reste PAUSE` and `press avec pointer sur Continue (stub disabled) reste au MENU` already expect no-op behaviour, so they stay green).

- [ ] **Step 5: Commit**

```bash
git add src/game/menu.js tests/game/menu.test.js
git commit -m "fix(menu): hitTest ignores disabled buttons"
```

---

### Task 2: `createGameoverMenu` + `CONFIG.GAMEOVER_BTN`

**Files:**
- Modify: `src/game/menu.js` (add factory next to `createPauseMenu`)
- Modify: `src/config.js:42` (replace nothing yet — ADD `GAMEOVER_BTN`; `GAMEOVER_MENU_BTN` is still used by `world.js`/`renderer.js` until Tasks 3/5)
- Test: `tests/game/menu.test.js`

**Interfaces:**
- Consumes: `build(defs, geom)` (private factory in `src/game/menu.js`), `CONFIG.GAMEOVER_BTN`.
- Produces: `createGameoverMenu()` → menu object `{ buttons: [{id:'restart', label:'RECOMMENCER', enabled:true, x,y,w,h}, {id:'menu', label:'MENU', enabled:true, x,y,w,h}], focus: 0 }`. Task 3 imports it in `world.js`.
- Produces: `CONFIG.GAMEOVER_BTN = { x: 80, w: 200, h: 56, y0: 384, gap: 72 }`.

- [ ] **Step 1: Write the failing test**

Add to `tests/game/menu.test.js` (import `createGameoverMenu` in the existing import line):

```js
  it('createGameoverMenu: restart + menu, tous enabled, focus sur restart', () => {
    const m = createGameoverMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['restart', 'menu']);
    expect(m.buttons.map((b) => b.label)).toEqual(['RECOMMENCER', 'MENU']);
    expect(m.buttons.every((b) => b.enabled)).toBe(true);
    expect(focusedId(m)).toBe('restart');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/menu.test.js`
Expected: FAIL — `createGameoverMenu is not a function` (import error).

- [ ] **Step 3: Write minimal implementation**

In `src/config.js`, below the `GAMEOVER_MENU_BTN` line, add:

```js
  GAMEOVER_BTN: { x: 80, w: 200, h: 56, y0: 384, gap: 72 },
```

In `src/game/menu.js`, below `createPauseMenu`, add:

```js
export function createGameoverMenu() {
  return build([
    { id: 'restart', label: 'RECOMMENCER', enabled: true },
    { id: 'menu', label: 'MENU', enabled: true },
  ], CONFIG.GAMEOVER_BTN);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/menu.js src/config.js tests/game/menu.test.js
git commit -m "feat(menu): createGameoverMenu (RECOMMENCER + MENU)"
```

---

### Task 3: Game-over routing in `world.js`

Replace the ad-hoc GAMEOVER handling (MENU rect + tap-anywhere-retry) with the shared menu routing. Recreate the menu on crash so focus resets to RECOMMENCER.

**Files:**
- Modify: `src/game/world.js` (imports, `createWorld`, `press`, `navMenu`, crash block in `updateWorld`)
- Test: `tests/game/world.test.js`

**Interfaces:**
- Consumes: `createGameoverMenu()` from Task 2; existing `hitTest`/`activate`/`moveFocus`/`startLevel`.
- Produces: `world.gameover` (menu object, recreated at each crash). `press(world, pointer)` in GAMEOVER: `restart` → `startLevel(world, world.level)` + PLAY; `menu` → MENU; anything else → no-op. `navMenu(world, dir)` moves game-over focus. Task 5's renderer reads `world.gameover`.

- [ ] **Step 1: Update existing tests + write failing tests**

In `tests/game/world.test.js`, inside `describe('pause & gameover-menu routing', ...)`:

Replace the test `gameover: clic sur le bouton Menu -> MENU` with:

```js
    it('gameover: clic sur le bouton MENU -> MENU', () => {
      const w = createWorld(fakeStorage());
      press(w);
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      expect(w.sm.get()).toBe(States.GAMEOVER);
      const b = w.gameover.buttons[1]; // menu
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
    });
```

Replace the test `gameover: press ailleurs = retry (PLAY)` with:

```js
    it('gameover: clic hors boutons = no-op (reste GAMEOVER)', () => {
      const w = createWorld(fakeStorage());
      press(w);
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      press(w, { x: 10, y: 10 });
      expect(w.sm.get()).toBe(States.GAMEOVER);
    });
```

Add three new tests to the same describe block:

```js
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
```

Note: the existing test `retry depuis GAMEOVER rejoue le même niveau et remet la progression à 0` uses keyboard `press(w)` — it stays green because `activate(world.gameover)` returns the focused `restart`. Leave it unchanged.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/game/world.test.js`
Expected: FAIL — `w.gameover is undefined` on the new/updated tests.

- [ ] **Step 3: Write the implementation**

In `src/game/world.js`:

1. Import `createGameoverMenu` (line 15):

```js
import { createMenu, createPauseMenu, createGameoverMenu, hitTest, activate, moveFocus, inRect } from './menu.js';
```

2. In `createWorld`, below `pause: createPauseMenu(),` add:

```js
    gameover: createGameoverMenu(),
```

3. In `press()`, replace the GAMEOVER branch (currently the `inRect(CONFIG.GAMEOVER_MENU_BTN, ...)` block):

```js
  } else if (state === States.GAMEOVER) {
    const id = pointer ? hitTest(world.gameover, pointer.x, pointer.y) : activate(world.gameover);
    if (id === 'restart') {
      startLevel(world, world.level);
      world.sm.to(States.PLAY);
    } else if (id === 'menu') {
      world.sm.to(States.MENU);
    }
    // null -> no-op
  }
```

4. In `navMenu()`, add a third branch:

```js
export function navMenu(world, dir) {
  const s = world.sm.get();
  if (s === States.MENU) moveFocus(world.menu, dir);
  else if (s === States.PAUSE) moveFocus(world.pause, dir);
  else if (s === States.GAMEOVER) moveFocus(world.gameover, dir);
}
```

5. In `updateWorld()`, in the `if (dead)` block, add the menu reset just before `world.sm.to(States.GAMEOVER);`:

```js
    world.gameover = createGameoverMenu();
```

Note: `inRect` stays imported (still used for `CONFIG.PAUSE_ICON`). `CONFIG.GAMEOVER_MENU_BTN` is no longer referenced from `world.js`; it is deleted from config in Task 5 (renderer still uses it until then).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/world.js tests/game/world.test.js
git commit -m "feat(gameover): real level menu (RECOMMENCER/MENU), drop tap-anywhere retry"
```

---

### Task 4: Persistent decor — `bgSet` reroll moves to `startLevel`

Restarting the same level must keep the same background. Reroll only when entering a *different* level.

**Files:**
- Modify: `src/game/world.js:45-60` (`resetRun`, `startLevel`)
- Test: `tests/game/world.test.js` (rewrite the `bgSet selection` describe block)

**Interfaces:**
- Consumes: existing `world.rand`, `CONFIG.BG_SET_COUNT`.
- Produces: `resetRun(world)` no longer touches `world.bgSet`. `startLevel(world, level)` rerolls `world.bgSet = Math.floor(world.rand() * CONFIG.BG_SET_COUNT)` **only** when `level !== world.level` (checked before assigning `world.level`).

- [ ] **Step 1: Rewrite the `bgSet selection` tests**

In `tests/game/world.test.js`, replace the entire `describe('bgSet selection', ...)` block with:

```js
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
```

(The old tests `resetRun picks bgSet 0/BG_SET_COUNT-1...` and `press from MENU picks bgSet using world.rand` are removed by this replacement — they encode the old reroll-on-reset behaviour.)

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/game/world.test.js`
Expected: FAIL — `resetRun ne touche plus bgSet`, `startLevel même niveau garde le décor`, and the two restart tests fail (bgSet got rerolled).

- [ ] **Step 3: Write the implementation**

In `src/game/world.js`, remove the `world.bgSet = ...` line from `resetRun` and gate the reroll in `startLevel`:

```js
export function resetRun(world) {
  world.robot = createRobot();
  world.obstacles = [];
  world.gatesThisLevel = 0;
  world.particles.particles = [];
}

export function startLevel(world, level) {
  const diff = difficultyForLevel(level);
  if (level !== world.level) {
    world.bgSet = Math.floor(world.rand() * CONFIG.BG_SET_COUNT);
  }
  world.level = level;
  world.scrollSpeed = diff.scrollSpeed;
  world.gapMin = diff.gapMin;
  world.gapMax = diff.gapMax;
  resetRun(world);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/world.js tests/game/world.test.js
git commit -m "feat(decor): keep same bgSet on level restart, reroll only on level change"
```

---

### Task 5: Renderer game-over block + config cleanup

Draw the game-over menu with the shared `drawButtons`, drop the obsolete copy and config rect. No unit test — `renderer.js` has no test file (project pattern); the Playwright visual verify covers it.

**Files:**
- Modify: `src/render/renderer.js:8,114-121` (import + GAMEOVER block)
- Modify: `src/config.js:42` (delete `GAMEOVER_MENU_BTN`)

**Interfaces:**
- Consumes: `world.gameover` from Task 3; `drawButtons(ctx, menuObj, assets)` from `src/render/buttons.js`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Update the renderer**

In `src/render/renderer.js`, change the import on line 8:

```js
import { drawButtons } from './buttons.js';
```

Replace the GAMEOVER branch:

```js
  } else if (state === States.GAMEOVER) {
    ctx.fillText('GAME OVER', CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText(`Niveau ${world.level}`, CONFIG.WIDTH / 2, 280);
    ctx.fillText(`Best: niveau ${world.score.bestLevel}`, CONFIG.WIDTH / 2, 308);
    drawButtons(ctx, world.gameover, assets);
  }
```

(The `Tap pour réessayer` line and the ad-hoc `drawButton(...MENU...)` call are deleted.)

- [ ] **Step 2: Delete the obsolete config rect**

In `src/config.js`, delete the line:

```js
  GAMEOVER_MENU_BTN: { x: 80, y: 384, w: 200, h: 56 },
```

Verify nothing references it anymore: `git grep -n GAMEOVER_MENU_BTN` → no matches.

- [ ] **Step 3: Run the full suite**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/render/renderer.js src/config.js
git commit -m "feat(render): gameover menu via shared drawButtons, drop GAMEOVER_MENU_BTN"
```

---

### Task 6: Visual verification (Playwright)

**Files:**
- None modified (verification only; screenshots go to the scratchpad, not the repo).

**Interfaces:**
- Consumes: the running game (`npx vite` dev server) + Playwright.

- [ ] **Step 1: Start the dev server and drive the game to game-over**

Start `npx vite` (background). With Playwright, load the game, click NEW GAME, let the robot fall until GAME OVER.

- [ ] **Step 2: Verify the game-over menu visually**

Screenshot the game-over screen. Check: title GAME OVER + `Niveau N` + `Best`, two plate buttons RECOMMENCER (focus = bright plate) and MENU below it, no `Tap pour réessayer` text.

- [ ] **Step 3: Verify decor persistence**

Note the background, click RECOMMENCER, screenshot in PLAY: the background must be identical. Then die again, click MENU, click NEW GAME (level 1 = same level → decor kept per policy) — confirm no crash and coherent rendering. Also verify keyboard nav: ArrowDown moves focus to MENU (plate highlight moves), Enter activates.

- [ ] **Step 4: Report**

No commit. Report screenshots/findings to the user before merge (workflow: visual verify gates the merge).
