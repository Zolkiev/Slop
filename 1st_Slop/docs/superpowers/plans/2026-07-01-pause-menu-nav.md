# Pause & Menu Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PAUSE state (⏸ HUD button + Escape) with a 4-button overlay (Resume / Restart / Main Menu / Options-stub), wire Game Over → Main Menu, and regenerate the truncated logo.

**Architecture:** Reuse the generic menu helpers (`hitTest`/`moveFocus`/`activate`/`focusedId`) for a new `createPauseMenu()`. Extract a shared button-stack renderer (`src/render/buttons.js`) used by both the main menu and a new `src/render/pause.js`. World routing gains an `escapeAction` and pause/gameover-menu dispatch; input gains an Escape callback.

**Tech Stack:** Vanilla JS, Canvas 2D, Vite, Vitest. Zero runtime deps. Assets via PixelLab (`scripts/pixellab.mjs`).

## Global Constraints

- **Palette (synthwave):** cyan `#3ef0ff`, magenta `#ff2e88`, dark base `#0a0a14`.
- **Canvas:** 360×640, `imageSmoothingEnabled = false`.
- **No new runtime dependencies.** Pure-logic modules unit-tested; rendering checked via fake-ctx recording `drawImage` + final visual verification.
- **Backward compatibility:** `press(world)` with no pointer must keep working (PLAY→thrust, GAMEOVER→retry, MENU→start). Existing tests must stay green.
- **French labels** baked into sprites: `REPRENDRE`, `RECOMMENCER` (fallback `REJOUER` if illegible), `MENU`. Options stub reuses existing `btn-options-disabled`.
- **Scope:** Options is a disabled stub in both menu and pause (audio sub-project later). No real Options screen, no save wiring here.

---

### Task 1: State machine — add PAUSE

**Files:**
- Modify: `src/engine/state.js`
- Test: `tests/engine/state.test.js`

**Interfaces:**
- Produces: `States.PAUSE = 'pause'`; transitions `PLAY → PAUSE`, `PAUSE → PLAY`, `PAUSE → MENU` valid; `PAUSE → GAMEOVER` invalid.

- [ ] **Step 1: Write the failing tests (append to `tests/engine/state.test.js`)**

```javascript
  it('PLAY peut aller en PAUSE', () => {
    const sm = createStateMachine(States.PLAY);
    expect(sm.can(States.PAUSE)).toBe(true);
  });

  it('PAUSE peut revenir en PLAY et aller au MENU', () => {
    const sm = createStateMachine(States.PAUSE);
    expect(sm.can(States.PLAY)).toBe(true);
    expect(sm.can(States.MENU)).toBe(true);
  });

  it('PAUSE ne peut pas aller en GAMEOVER', () => {
    const sm = createStateMachine(States.PAUSE);
    expect(sm.can(States.GAMEOVER)).toBe(false);
  });
```

(If `createStateMachine` / `States` are not yet imported in the test file, add
`import { States, createStateMachine } from '../../src/engine/state.js';` at the top — check first; they are likely already imported.)

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- state`
Expected: FAIL — `States.PAUSE` is undefined / transitions missing.

- [ ] **Step 3: Edit `src/engine/state.js`**

Add `PAUSE` to `States` and update `TRANSITIONS`:

```javascript
export const States = {
  MENU: 'menu', PLAY: 'play', GAMEOVER: 'gameover', LEVEL_COMPLETE: 'levelcomplete',
  PAUSE: 'pause',
};

const TRANSITIONS = {
  [States.MENU]: [States.PLAY],
  [States.PLAY]: [States.GAMEOVER, States.LEVEL_COMPLETE, States.PAUSE],
  [States.GAMEOVER]: [States.PLAY, States.MENU],
  [States.LEVEL_COMPLETE]: [States.PLAY],
  [States.PAUSE]: [States.PLAY, States.MENU],
};
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- state`
Expected: PASS (existing state tests + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/engine/state.js tests/engine/state.test.js
git commit -m "feat(state): add PAUSE state + transitions"
```

---

### Task 2: Pause menu data + `inRect` + config constants

**Files:**
- Modify: `src/config.js`, `src/game/menu.js`
- Test: `tests/game/menu.test.js`

**Interfaces:**
- Consumes: `CONFIG.PAUSE_BTN`.
- Produces:
  - `createPauseMenu() → { buttons, focus }` with ids `['resume','restart','menu','options']`; resume/restart/menu enabled, options disabled; focus on first enabled (`resume`).
  - `inRect(rect, px, py) → boolean` (inclusive top-left, exclusive bottom-right).
  - `CONFIG.PAUSE_BTN`, `CONFIG.PAUSE_TITLE_Y`, `CONFIG.PAUSE_ICON`, `CONFIG.GAMEOVER_MENU_BTN`.

- [ ] **Step 1: Add constants to `src/config.js`**

Add inside `CONFIG` (after the `MENU_*` block from the previous feature):

```javascript
  // Pause overlay + HUD
  PAUSE_BTN: { x: 80, w: 200, h: 56, y0: 230, gap: 72 },
  PAUSE_TITLE_Y: 170,
  PAUSE_ICON: { x: 324, y: 16, w: 24, h: 24 },
  GAMEOVER_MENU_BTN: { x: 80, y: 384, w: 200, h: 56 },
```

- [ ] **Step 2: Write the failing tests (append to `tests/game/menu.test.js`)**

Update the import line to include the new exports:

```javascript
import { createMenu, createPauseMenu, hitTest, inRect, moveFocus, focusedId, activate } from '../../src/game/menu.js';
```

Add:

```javascript
  it('createPauseMenu: 4 boutons ordonnés, resume/restart/menu enabled, options disabled, focus resume', () => {
    const m = createPauseMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['resume', 'restart', 'menu', 'options']);
    expect(m.buttons[0].enabled).toBe(true);
    expect(m.buttons[1].enabled).toBe(true);
    expect(m.buttons[2].enabled).toBe(true);
    expect(m.buttons[3].enabled).toBe(false);
    expect(focusedId(m)).toBe('resume');
  });

  it('moveFocus sur le pause menu saute options (disabled)', () => {
    const m = createPauseMenu();
    m.focus = 2; // menu
    moveFocus(m, 1); // options disabled -> wrap to resume
    expect(focusedId(m)).toBe('resume');
  });

  it('inRect: dedans vrai, dehors faux (bord droit/bas exclusif)', () => {
    const r = { x: 10, y: 20, w: 30, h: 40 };
    expect(inRect(r, 10, 20)).toBe(true);
    expect(inRect(r, 39, 59)).toBe(true);
    expect(inRect(r, 40, 20)).toBe(false);
    expect(inRect(r, 0, 0)).toBe(false);
  });
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- menu`
Expected: FAIL — `createPauseMenu` / `inRect` not exported.

- [ ] **Step 4: Edit `src/game/menu.js`**

Refactor to share a private builder, add `createPauseMenu`, add `inRect`, and route `hitTest` through `inRect` (DRY). Full new file body:

```javascript
import { CONFIG } from '../config.js';

function build(defs, geom) {
  const { x, w, h, y0, gap } = geom;
  const buttons = defs.map((d, i) => ({ ...d, x, y: y0 + i * gap, w, h }));
  const first = buttons.findIndex((b) => b.enabled);
  return { buttons, focus: first < 0 ? 0 : first };
}

export function createMenu() {
  return build([
    { id: 'newgame', label: 'NEW GAME', enabled: true },
    { id: 'continue', label: 'CONTINUE', enabled: false },
    { id: 'options', label: 'OPTIONS', enabled: false },
  ], CONFIG.MENU_BTN);
}

export function createPauseMenu() {
  return build([
    { id: 'resume', label: 'REPRENDRE', enabled: true },
    { id: 'restart', label: 'RECOMMENCER', enabled: true },
    { id: 'menu', label: 'MENU', enabled: true },
    { id: 'options', label: 'OPTIONS', enabled: false },
  ], CONFIG.PAUSE_BTN);
}

export function inRect(rect, px, py) {
  return px >= rect.x && px < rect.x + rect.w && py >= rect.y && py < rect.y + rect.h;
}

export function hitTest(menu, px, py) {
  for (const b of menu.buttons) {
    if (inRect(b, px, py)) return b.id;
  }
  return null;
}

export function moveFocus(menu, dir) {
  const n = menu.buttons.length;
  if (!menu.buttons.some((b) => b.enabled)) return;
  let i = menu.focus;
  for (let step = 0; step < n; step += 1) {
    i = (i + dir + n) % n;
    if (menu.buttons[i].enabled) { menu.focus = i; return; }
  }
}

export function focusedId(menu) {
  return menu.buttons[menu.focus]?.id ?? null;
}

export function activate(menu) {
  const b = menu.buttons[menu.focus];
  return b && b.enabled ? b.id : null;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- menu`
Expected: PASS — the existing `createMenu`/`hitTest`/`moveFocus`/`activate` tests
still pass (behaviour unchanged) plus the 3 new tests.

- [ ] **Step 6: Commit**

```bash
git add src/config.js src/game/menu.js tests/game/menu.test.js
git commit -m "feat(menu): createPauseMenu + inRect helper + pause/HUD constants"
```

---

### Task 3: Input — Escape key

**Files:**
- Modify: `src/engine/input.js`
- Test: `tests/engine/input.test.js`

**Interfaces:**
- Produces: `createInput(opts, onPress, onNav?, onEscape?)` — `onEscape()` fires on `Escape` keydown (no repeat); defaults to a no-op.

- [ ] **Step 1: Write the failing test (append to `tests/engine/input.test.js`)**

```javascript
  it('Escape appelle onEscape', () => {
    const target = fakeTarget();
    const win = fakeTarget();
    const onEscape = vi.fn();
    createInput({ target, win, preventDefault: false }, vi.fn(), vi.fn(), onEscape);
    win.fire('keydown', { code: 'Escape', repeat: false });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- input`
Expected: FAIL — `onEscape` not invoked (4th param unused).

- [ ] **Step 3: Edit `src/engine/input.js`**

Add the `onEscape` parameter (default no-op) and an Escape branch in `handleKey`:

```javascript
export function createInput({ target, win = window, preventDefault = true }, onPress, onNav = () => {}, onEscape = () => {}) {
```

In `handleKey`, add after the ArrowDown branch:

```javascript
    } else if (e.code === 'Escape' && !e.repeat) {
      if (preventDefault && e.preventDefault) e.preventDefault();
      onEscape();
    }
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- input`
Expected: PASS (existing input tests + new Escape test).

- [ ] **Step 5: Commit**

```bash
git add src/engine/input.js tests/engine/input.test.js
git commit -m "feat(input): Escape key -> onEscape callback"
```

---

### Task 4: World routing — pause, escape, gameover-menu

**Files:**
- Modify: `src/game/world.js`
- Test: `tests/game/world.test.js`

**Interfaces:**
- Consumes: `createPauseMenu`, `hitTest`, `activate`, `moveFocus`, `inRect` from `menu.js`; `CONFIG.PAUSE_ICON`, `CONFIG.GAMEOVER_MENU_BTN`; `startLevel`.
- Produces:
  - `world.pause` (from `createPauseMenu()`).
  - `press(world, pointer)` — PLAY: pointer on `PAUSE_ICON` → PAUSE, else thrust. PAUSE: dispatch resume→PLAY / restart→startLevel(level)+PLAY / menu→MENU / options|null→no-op. GAMEOVER: pointer on `GAMEOVER_MENU_BTN` → MENU, else retry.
  - `escapeAction(world)` — PLAY→PAUSE, PAUSE→PLAY, GAMEOVER→MENU, else no-op.
  - `navMenu(world, dir)` — acts in MENU (`world.menu`) and PAUSE (`world.pause`).

- [ ] **Step 1: Write the failing tests (append to `tests/game/world.test.js`)**

Update the import to add `escapeAction`:

```javascript
import { createWorld, press, navMenu, escapeAction, resetRun, startLevel, updateWorld } from '../../src/game/world.js';
```

Add a new describe block:

```javascript
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

    it('gameover: clic sur le bouton Menu -> MENU', () => {
      const w = createWorld(fakeStorage());
      press(w);
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      expect(w.sm.get()).toBe(States.GAMEOVER);
      const b = CONFIG.GAMEOVER_MENU_BTN;
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('gameover: press ailleurs = retry (PLAY)', () => {
      const w = createWorld(fakeStorage());
      press(w);
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      press(w, { x: 10, y: 10 });
      expect(w.sm.get()).toBe(States.PLAY);
    });

    it('escapeAction en GAMEOVER -> MENU', () => {
      const w = createWorld(fakeStorage());
      press(w);
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      escapeAction(w);
      expect(w.sm.get()).toBe(States.MENU);
    });
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- world`
Expected: FAIL — `escapeAction` not exported / `world.pause` undefined / PLAY & GAMEOVER pointer branches not implemented.

- [ ] **Step 3: Edit `src/game/world.js`**

Update the menu import to add `createPauseMenu` and `inRect`:

```javascript
import { createMenu, createPauseMenu, hitTest, activate, moveFocus, inRect } from './menu.js';
```

In `createWorld`'s returned object, add after `menu: createMenu(),`:

```javascript
    pause: createPauseMenu(),
```

Replace `press` with the full routed version (PLAY & GAMEOVER changed, PAUSE added):

```javascript
export function press(world, pointer) {
  const state = world.sm.get();
  if (state === States.MENU) {
    const id = pointer ? hitTest(world.menu, pointer.x, pointer.y) : activate(world.menu);
    if (id === 'newgame') {
      startLevel(world, 1);
      world.sm.to(States.PLAY);
    }
  } else if (state === States.PLAY) {
    if (pointer && inRect(CONFIG.PAUSE_ICON, pointer.x, pointer.y)) {
      world.sm.to(States.PAUSE);
    } else {
      applyThrust(world.robot);
      world.events.push('thrust');
    }
  } else if (state === States.PAUSE) {
    const id = pointer ? hitTest(world.pause, pointer.x, pointer.y) : activate(world.pause);
    if (id === 'resume') {
      world.sm.to(States.PLAY);
    } else if (id === 'restart') {
      startLevel(world, world.level);
      world.sm.to(States.PLAY);
    } else if (id === 'menu') {
      world.sm.to(States.MENU);
    }
    // 'options' / null -> no-op
  } else if (state === States.LEVEL_COMPLETE) {
    startLevel(world, world.level + 1);
    world.sm.to(States.PLAY);
  } else if (state === States.GAMEOVER) {
    if (pointer && inRect(CONFIG.GAMEOVER_MENU_BTN, pointer.x, pointer.y)) {
      world.sm.to(States.MENU);
    } else {
      startLevel(world, world.level);
      world.sm.to(States.PLAY);
    }
  }
}

export function navMenu(world, dir) {
  const s = world.sm.get();
  if (s === States.MENU) moveFocus(world.menu, dir);
  else if (s === States.PAUSE) moveFocus(world.pause, dir);
}

export function escapeAction(world) {
  const s = world.sm.get();
  if (s === States.PLAY) world.sm.to(States.PAUSE);
  else if (s === States.PAUSE) world.sm.to(States.PLAY);
  else if (s === States.GAMEOVER) world.sm.to(States.MENU);
}
```

(The existing `navMenu` is replaced by the version above. `updateWorld` needs no
change: its existing `if (world.sm.get() !== States.PLAY) return;` already freezes
gameplay in PAUSE, and `world.menuTick += 1` still runs first.)

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- world`
Expected: PASS — new pause/gameover tests plus all pre-existing world tests (the
old MENU→PLAY, PLAY thrust, GAMEOVER retry paths are preserved).

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/world.js tests/game/world.test.js
git commit -m "feat(world): pause routing, escapeAction, gameover->menu"
```

---

### Task 5: Generate pause sprites + regenerate logo (PixelLab)

**Files:**
- Create (generated): `assets/btn-resume.png`, `assets/btn-resume-focus.png`,
  `assets/btn-restart.png`, `assets/btn-restart-focus.png`, `assets/btn-menu.png`,
  `assets/btn-menu-focus.png`
- Overwrite: `assets/ui-logo.png`
- Uses: `scripts/pixellab.mjs`, `scripts/crop-borders.mjs`.

No unit test; verified by eye and consumed by Task 6. Buttons are 200×56 (>170px →
single candidate each), drawn scaled to the button rect so exact size need only
match the ~3.6:1 aspect. Do not crop button plates. Reuse `btn-options-disabled`
(already in `assets/`) for the pause Options stub.

- [ ] **Step 1: Generate the 3 pause buttons (normal + focus each)**

```bash
node scripts/pixellab.mjs generate --description "pixel art UI button, horizontal rounded rectangle plate, glowing cyan neon border, dark navy fill, bold white pixel text 'REPRENDRE' centered, transparent background" --size 200x56 --no-bg true --out-dir assets/preview --name btn-resume --seed 11

node scripts/pixellab.mjs generate --description "pixel art UI button, horizontal rounded rectangle plate, bright glowing cyan neon border and inner glow, highlighted selected state, dark navy fill, bold white pixel text 'REPRENDRE' centered, transparent background" --size 200x56 --no-bg true --out-dir assets/preview --name btn-resume-focus --seed 11

node scripts/pixellab.mjs generate --description "pixel art UI button, horizontal rounded rectangle plate, glowing cyan neon border, dark navy fill, bold white pixel text 'RECOMMENCER' centered, transparent background" --size 200x56 --no-bg true --out-dir assets/preview --name btn-restart --seed 11

node scripts/pixellab.mjs generate --description "pixel art UI button, horizontal rounded rectangle plate, bright glowing cyan neon border and inner glow, highlighted selected state, dark navy fill, bold white pixel text 'RECOMMENCER' centered, transparent background" --size 200x56 --no-bg true --out-dir assets/preview --name btn-restart-focus --seed 11

node scripts/pixellab.mjs generate --description "pixel art UI button, horizontal rounded rectangle plate, glowing cyan neon border, dark navy fill, bold white pixel text 'MENU' centered, transparent background" --size 200x56 --no-bg true --out-dir assets/preview --name btn-menu --seed 11

node scripts/pixellab.mjs generate --description "pixel art UI button, horizontal rounded rectangle plate, bright glowing cyan neon border and inner glow, highlighted selected state, dark navy fill, bold white pixel text 'MENU' centered, transparent background" --size 200x56 --no-bg true --out-dir assets/preview --name btn-menu-focus --seed 11
```

- [ ] **Step 2: Regenerate the logo (no decorative mascot)**

```bash
node scripts/pixellab.mjs generate --description "retro synthwave arcade game logo, ONLY bold blocky pixel letters spelling JETPACK BOT on two lines, cyan and magenta neon glow, no characters no mascot no robot, clean transparent background" --size 260x88 --no-bg true --out-dir assets/preview --name ui-logo --seed 5
```

- [ ] **Step 3: Visual review + select**

Open each `assets/preview/*-0.png`. Check: button labels legible and correct; the
normal vs focus pair per button is distinct (normal vs brighter glow); the logo
reads "JETPACK BOT" with **no truncated robot/mascot** in any corner.

- **If `RECOMMENCER` is not legible** (too cramped at 200×56): re-run the two
  `btn-restart*` commands with the label changed to `REJOUER` (keep `--name
  btn-restart` / `btn-restart-focus` and `--seed 11`). The id/key stays `restart`.
- For any other illegible/off sprite, re-run its command with a different `--seed`
  (12, 13…) until acceptable.

- [ ] **Step 4: Place final sprites in `assets/`**

```bash
for f in btn-resume btn-resume-focus btn-restart btn-restart-focus btn-menu btn-menu-focus ui-logo; do
  cp "assets/preview/$f-0.png" "assets/$f.png"
done
node scripts/crop-borders.mjs assets/ui-logo.png --apply
```

- [ ] **Step 5: Commit**

```bash
git add assets/btn-resume.png assets/btn-resume-focus.png assets/btn-restart.png assets/btn-restart-focus.png assets/btn-menu.png assets/btn-menu-focus.png assets/ui-logo.png
git commit -m "assets(pause): pause button sprites + clean logo regen"
```

---

### Task 6: Render — shared button helper, pause overlay, HUD icon, gameover menu, wiring

**Files:**
- Create: `src/render/buttons.js`, `src/render/pause.js`
- Modify: `src/render/menu.js` (use shared helper), `src/render/renderer.js`, `src/main.js`
- Test: `tests/render/pause.test.js`

**Interfaces:**
- Produces:
  - `src/render/buttons.js`: `spriteKey(button, focused) → string`, `drawButtons(ctx, menuObj, assets) → void` (draws each button's state sprite at its rect).
  - `src/render/pause.js`: `renderPause(ctx, world, assets) → void` (dark veil + "PAUSE" title + `drawButtons(world.pause)`).
- Consumes: `focusedId` from `menu.js`; `CONFIG.PAUSE_TITLE_Y`, `CONFIG.PAUSE_ICON`, `CONFIG.GAMEOVER_MENU_BTN`; assets `btn-resume[-focus]`, `btn-restart[-focus]`, `btn-menu[-focus]`, `btn-options-disabled`.

- [ ] **Step 1: Write the failing test — `tests/render/pause.test.js`**

```javascript
import { describe, it, expect, vi } from 'vitest';
import { renderPause } from '../../src/render/pause.js';
import { createPauseMenu } from '../../src/game/menu.js';

function fakeCtx() {
  return {
    drawn: [],
    drawImage(img, ...rest) { this.drawn.push({ img, rest }); },
    fillRect: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    set fillStyle(_) {}, get fillStyle() { return ''; },
    set font(_) {}, get font() { return ''; },
    set textAlign(_) {}, get textAlign() { return ''; },
    set globalAlpha(_) {}, get globalAlpha() { return 1; },
  };
}

function fakeAssets() {
  const keys = [
    'btn-resume', 'btn-resume-focus', 'btn-resume-disabled',
    'btn-restart', 'btn-restart-focus', 'btn-restart-disabled',
    'btn-menu', 'btn-menu-focus', 'btn-menu-disabled',
    'btn-options', 'btn-options-focus', 'btn-options-disabled',
  ];
  return Object.fromEntries(keys.map((k) => [k, { key: k }]));
}

describe('renderPause', () => {
  it('resume focus -> btn-resume-focus ; restart/menu normal ; options disabled', () => {
    const ctx = fakeCtx();
    const assets = fakeAssets();
    const world = { pause: createPauseMenu(), menuTick: 0 };
    renderPause(ctx, world, assets);
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('btn-resume-focus');
    expect(keys).toContain('btn-restart');
    expect(keys).toContain('btn-menu');
    expect(keys).toContain('btn-options-disabled');
    expect(keys).not.toContain('btn-resume'); // resume is focused, not normal
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- render/pause`
Expected: FAIL — `Cannot find module '../../src/render/pause.js'`.

- [ ] **Step 3: Create `src/render/buttons.js`**

```javascript
import { focusedId } from '../game/menu.js';

export function spriteKey(button, focused) {
  if (!button.enabled) return `btn-${button.id}-disabled`;
  if (button.id === focused) return `btn-${button.id}-focus`;
  return `btn-${button.id}`;
}

export function drawButtons(ctx, menuObj, assets) {
  const focused = focusedId(menuObj);
  for (const b of menuObj.buttons) {
    ctx.drawImage(assets[spriteKey(b, focused)], b.x, b.y, b.w, b.h);
  }
}
```

- [ ] **Step 4: Create `src/render/pause.js`**

```javascript
import { CONFIG } from '../config.js';
import { drawButtons } from './buttons.js';

export function renderPause(ctx, world, assets) {
  // Dark veil over the frozen scene
  ctx.fillStyle = 'rgba(10,10,20,0.7)';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSE', CONFIG.WIDTH / 2, CONFIG.PAUSE_TITLE_Y);

  // Buttons (shared state-sprite selection)
  drawButtons(ctx, world.pause, assets);
}
```

- [ ] **Step 5: Refactor `src/render/menu.js` to use the shared helper**

Replace the local `spriteKey` + button loop with the shared `drawButtons`. New file:

```javascript
import { CONFIG } from '../config.js';
import { drawButtons } from './buttons.js';

export function renderMenu(ctx, world, assets) {
  // Logo — centered near the top, kept at native aspect (max width 260)
  const logo = assets['ui-logo'];
  const logoW = Math.min(260, logo.width);
  const logoH = logo.height * (logoW / logo.width);
  ctx.drawImage(logo, Math.round((CONFIG.WIDTH - logoW) / 2), CONFIG.MENU_LOGO_Y, logoW, logoH);

  // Idle robot — bobs vertically using menuTick (advances every frame)
  const robot = assets.robot;
  const bob = Math.sin(world.menuTick / 18) * 6;
  const size = 44;
  ctx.drawImage(
    robot,
    Math.round((CONFIG.WIDTH - size) / 2),
    Math.round(CONFIG.MENU_ROBOT_Y + bob),
    size, size,
  );

  // Buttons (shared state-sprite selection)
  drawButtons(ctx, world.menu, assets);

  // Best level
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`Best: niveau ${world.score.bestLevel}`, CONFIG.WIDTH / 2, CONFIG.MENU_BEST_Y);
}
```

- [ ] **Step 6: Edit `src/render/renderer.js`**

Add the import at the top (next to the `renderMenu` import):

```javascript
import { renderPause } from './pause.js';
```

**6a — Draw the ⏸ icon in the PLAY HUD.** In the `if (state === States.PLAY) {`
branch, after the `Niveau` line, add:

```javascript
    // Pause button (⏸) — top-right
    const pi = CONFIG.PAUSE_ICON;
    ctx.fillStyle = 'rgba(10,10,20,0.5)';
    ctx.fillRect(pi.x, pi.y, pi.w, pi.h);
    ctx.strokeStyle = '#3ef0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(pi.x + 1, pi.y + 1, pi.w - 2, pi.h - 2);
    ctx.fillStyle = '#3ef0ff';
    const barW = 4, barH = 12;
    const cx = pi.x + pi.w / 2;
    const by = pi.y + (pi.h - barH) / 2;
    ctx.fillRect(cx - 5, by, barW, barH);
    ctx.fillRect(cx + 1, by, barW, barH);
```

**6b — Delegate the PAUSE branch.** Add a new branch after the MENU branch:

```javascript
  } else if (state === States.PAUSE) {
    renderPause(ctx, world, assets);
```

**6c — Add the Menu button to GAMEOVER.** In the `else if (state ===
States.GAMEOVER) {` branch, after the `Tap pour réessayer` line, add:

```javascript
    const gb = CONFIG.GAMEOVER_MENU_BTN;
    ctx.drawImage(assets['btn-menu'], gb.x, gb.y, gb.w, gb.h);
```

Leave the shaken scene, the section-4 robot guard, LEVEL_COMPLETE, and the flash
overlay unchanged.

- [ ] **Step 7: Edit `src/main.js` — load sprites + wire Escape**

Add the 6 sprite imports (next to the other `btn-*` imports):

```javascript
import btnResume from '../assets/btn-resume.png';
import btnResumeFocus from '../assets/btn-resume-focus.png';
import btnRestart from '../assets/btn-restart.png';
import btnRestartFocus from '../assets/btn-restart-focus.png';
import btnMenu from '../assets/btn-menu.png';
import btnMenuFocus from '../assets/btn-menu-focus.png';
```

Add `escapeAction` to the world import:

```javascript
import { createWorld, press, navMenu, escapeAction, updateWorld } from './game/world.js';
```

Add the sprite keys to the `loadImages({ … })` map:

```javascript
  'btn-resume': btnResume,
  'btn-resume-focus': btnResumeFocus,
  'btn-restart': btnRestart,
  'btn-restart-focus': btnRestartFocus,
  'btn-menu': btnMenu,
  'btn-menu-focus': btnMenuFocus,
```

Update the `createInput` call to pass `onEscape`:

```javascript
createInput({ target: canvas, win: window }, (pointer) => press(world, pointer), (dir) => navMenu(world, dir), () => escapeAction(world));
```

- [ ] **Step 8: Run tests + build**

Run: `npm test`
Expected: PASS (all green, including the existing `tests/render/menu.test.js`
which still passes because `drawButtons` produces the same `drawImage` keys).

Run: `npm run build`
Expected: succeeds (all 6 new asset imports resolve).

- [ ] **Step 9: Commit**

```bash
git add src/render/buttons.js src/render/pause.js src/render/menu.js src/render/renderer.js src/main.js tests/render/pause.test.js
git commit -m "feat(pause): render pause overlay, ⏸ HUD icon, gameover menu button"
```

---

### Task 7: Visual verification

Confirm pause/menu navigation and the fixed logo in the real browser.

**Files:** none committed (temporary hooks reverted).

- [ ] **Step 1: Add temporary debug hooks in `src/main.js`**

Inside the `loadImages().then(...)` callback, after `loop.start()`, add:

```javascript
  window.__world = world;
  window.__press = (p) => press(world, p);
  window.__nav = (d) => navMenu(world, d);
  window.__escape = () => escapeAction(world);
```

- [ ] **Step 2: Run dev server + drive with Playwright**

Run: `npm run dev`. Drive with Playwright (install chromium on demand). Capture:
- **Menu** at load — confirm the logo has **no truncated robot** in any corner.
- Start a game (`window.__press({x:180, y:368})`), then open pause
  (`window.__escape()` and/or click the ⏸ rect `window.__press({x:336, y:28})`) →
  screenshot the **pause overlay** (4 buttons, Resume focused, Options greyed,
  frozen scene behind the veil).
- `window.__nav(1)` a few times → focus cycles resume→restart→menu (skips options).
- Resume (`window.__escape()`), then trigger game over (fall), screenshot → confirm
  the **Menu button** appears; click it (`window.__press({x:180, y:412})`) → back to menu.

- [ ] **Step 3: Confirm the checks**

Verify by eye: logo clean; ⏸ icon visible in play; pause overlay renders with
correct button states and readable labels (RESUME/RESTART/MENU or REJOUER); Escape
toggles pause; restart restarts the level; pause-menu and gameover-menu both return
to the main menu.

- [ ] **Step 4: Revert the debug hooks**

Remove the four `window.__*` lines from Step 1.

Run: `npm test` and `npm run build`
Expected: still green.

- [ ] **Step 5: Commit (only if the revert changed anything)**

```bash
git add src/main.js
git commit -m "chore(pause): remove temporary debug hooks after visual verify"
```

---

## Definition of Done

- All Vitest suites pass (`npm test`), `npm run build` succeeds.
- ⏸ HUD button + Escape open a PAUSE overlay with Resume / Restart / Main Menu
  (Options greyed); each works via mouse/tap and keyboard.
- Escape toggles PLAY↔PAUSE and exits GAMEOVER→MENU; Game Over shows a Menu button.
- Gameplay is frozen while paused; the frozen scene shows under the veil.
- The logo renders with no truncated decorative sprite.
- Main-menu behaviour (New Game, greyed Continue/Options) is unchanged.

## Notes for the reviewer / merge

- Branch: `feat/pause-menu-nav`. Merge to `main` with `--no-ff` (repo convention).
- **Do not push** unless Jael asks.
- Visual verification (Task 7) required before merge.
