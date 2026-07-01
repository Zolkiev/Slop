# Intro Menu & UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw-text `MENU` screen with a real intro menu: pixel-art logo + three interactive buttons (New Game active, Continue/Options greyed stubs), navigable by mouse/tap and keyboard.

**Architecture:** A pure-logic module `src/game/menu.js` (button data + hit-test/focus helpers, fully unit-tested) drives a dedicated renderer `src/render/menu.js`. Input is extended to carry pointer coordinates and arrow-key navigation; `world.js` routes menu presses to button actions. The live parallax scene stays as the menu backdrop.

**Tech Stack:** Vanilla JS, Canvas 2D, Vite, Vitest. Zero runtime deps. Assets via PixelLab (`scripts/pixellab.mjs`).

## Global Constraints

- **Palette (synthwave):** cyan `#3ef0ff`, magenta `#ff2e88`, dark base `#0a0a14`.
- **Canvas:** 360×640, `imageSmoothingEnabled = false` (crisp pixel art).
- **No new runtime dependencies.** Tests are pure logic (no real canvas); rendering is checked by a fake `ctx` that records `drawImage`, plus final visual verification.
- **Backward compatibility:** `press(world)` with no pointer must still work everywhere it's called today (keyboard/space path).
- **French UI copy** stays the convention (button labels are baked into sprites: `NEW GAME`, `CONTINUE`, `OPTIONS` — English arcade style is acceptable here per design; do not add on-canvas text labels).
- **Scope:** Continue and Options are disabled stubs this round (no Options screen, no save wiring).

---

### Task 1: Menu logic module (`src/game/menu.js`)

Pure, canvas-free logic: button layout + hit-test + keyboard focus.

**Files:**
- Create: `src/game/menu.js`
- Modify: `src/config.js` (add `MENU_BTN` + layout constants)
- Test: `tests/game/menu.test.js`

**Interfaces:**
- Consumes: `CONFIG.MENU_BTN` from `src/config.js`.
- Produces:
  - `createMenu() → { buttons: Array<{id,label,x,y,w,h,enabled}>, focus: number }`
    with buttons in order `['newgame','continue','options']`.
  - `hitTest(menu, px, py) → string|null` (button id under point, else null).
  - `moveFocus(menu, dir) → void` (advance `focus` by `dir` ∈ {-1,+1} to next enabled, wrap).
  - `focusedId(menu) → string|null` (id of `buttons[focus]`).
  - `activate(menu) → string|null` (focused id if enabled, else null).

- [ ] **Step 1: Add layout constants to `src/config.js`**

Add inside the `CONFIG` object (after the crash-juice block):

```javascript
  // Menu / UI layout (canvas 360×640)
  MENU_BTN: { x: 80, w: 200, h: 56, y0: 340, gap: 72 },
  MENU_LOGO_Y: 120,
  MENU_ROBOT_Y: 250,
  MENU_BEST_Y: 600,
```

- [ ] **Step 2: Write the failing tests**

Create `tests/game/menu.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { createMenu, hitTest, moveFocus, focusedId, activate } from '../../src/game/menu.js';

describe('menu', () => {
  it('createMenu: 3 boutons ordonnés, newgame enabled, autres disabled, focus sur newgame', () => {
    const m = createMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['newgame', 'continue', 'options']);
    expect(m.buttons[0].enabled).toBe(true);
    expect(m.buttons[1].enabled).toBe(false);
    expect(m.buttons[2].enabled).toBe(false);
    expect(focusedId(m)).toBe('newgame');
  });

  it('hitTest renvoie l\'id quand le point est dans le bouton', () => {
    const m = createMenu();
    const b = m.buttons[0];
    expect(hitTest(m, b.x + b.w / 2, b.y + b.h / 2)).toBe('newgame');
  });

  it('hitTest renvoie null hors de tous les boutons', () => {
    const m = createMenu();
    expect(hitTest(m, 0, 0)).toBe(null);
  });

  it('hitTest: coin haut-gauche inclusif, coin bas-droit exclusif', () => {
    const m = createMenu();
    const b = m.buttons[0];
    expect(hitTest(m, b.x, b.y)).toBe('newgame');
    expect(hitTest(m, b.x + b.w, b.y + b.h)).toBe(null);
  });

  it('moveFocus saute les boutons disabled et reste sur le seul enabled', () => {
    const m = createMenu();
    moveFocus(m, 1);
    expect(focusedId(m)).toBe('newgame');
    moveFocus(m, -1);
    expect(focusedId(m)).toBe('newgame');
  });

  it('moveFocus parcourt tout quand tout est enabled', () => {
    const m = createMenu();
    m.buttons.forEach((b) => { b.enabled = true; });
    expect(focusedId(m)).toBe('newgame');
    moveFocus(m, 1); expect(focusedId(m)).toBe('continue');
    moveFocus(m, 1); expect(focusedId(m)).toBe('options');
    moveFocus(m, 1); expect(focusedId(m)).toBe('newgame');
    moveFocus(m, -1); expect(focusedId(m)).toBe('options');
  });

  it('activate renvoie l\'id focus si enabled, sinon null', () => {
    const m = createMenu();
    expect(activate(m)).toBe('newgame');
    m.buttons[0].enabled = false;
    expect(activate(m)).toBe(null);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- menu`
Expected: FAIL — `Cannot find module '../../src/game/menu.js'`.

- [ ] **Step 4: Implement `src/game/menu.js`**

```javascript
import { CONFIG } from '../config.js';

export function createMenu() {
  const { x, w, h, y0, gap } = CONFIG.MENU_BTN;
  const defs = [
    { id: 'newgame', label: 'NEW GAME', enabled: true },
    { id: 'continue', label: 'CONTINUE', enabled: false },
    { id: 'options', label: 'OPTIONS', enabled: false },
  ];
  const buttons = defs.map((d, i) => ({ ...d, x, y: y0 + i * gap, w, h }));
  const first = buttons.findIndex((b) => b.enabled);
  return { buttons, focus: first < 0 ? 0 : first };
}

export function hitTest(menu, px, py) {
  for (const b of menu.buttons) {
    if (px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h) return b.id;
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

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- menu`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/game/menu.js src/config.js tests/game/menu.test.js
git commit -m "feat(menu): pure menu logic — layout, hit-test, keyboard focus"
```

---

### Task 2: Input — pointer coordinates + arrow navigation (`src/engine/input.js`)

Extend input to pass canvas-space `(x,y)` on pointer, and arrow keys to a nav callback. Keep space/enter → `onPress()` (no coords).

**Files:**
- Modify: `src/engine/input.js`
- Test: `tests/engine/input.test.js`

**Interfaces:**
- Produces: `createInput({ target, win, preventDefault }, onPress, onNav?)` where
  - `onPress(pointer?)` — `pointer = { x, y }` (canvas space) on pointerdown when
    the event carries `clientX` and `target.getBoundingClientRect` exists;
    `undefined` on Space/Enter or when coords can't be computed.
  - `onNav(dir)` — `dir = -1` (ArrowUp) / `+1` (ArrowDown). Defaults to a no-op.

- [ ] **Step 1: Write the failing tests (append to `tests/engine/input.test.js`)**

Add these tests inside the existing `describe('input', ...)` block:

```javascript
  it('passe les coordonnées canvas au onPress sur pointerdown', () => {
    const handlers = {};
    const target = {
      addEventListener: (t, fn) => { handlers[t] = fn; },
      removeEventListener: () => {},
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 360, height: 640 }),
      width: 360,
      height: 640,
    };
    const win = fakeTarget();
    const onPress = vi.fn();
    createInput({ target, win, preventDefault: false }, onPress);
    handlers.pointerdown({ clientX: 100, clientY: 120 });
    expect(onPress).toHaveBeenCalledWith({ x: 90, y: 100 });
  });

  it('ArrowUp/ArrowDown appellent onNav avec -1 / +1', () => {
    const target = fakeTarget();
    const win = fakeTarget();
    const onNav = vi.fn();
    createInput({ target, win, preventDefault: false }, vi.fn(), onNav);
    win.fire('keydown', { code: 'ArrowUp', repeat: false });
    win.fire('keydown', { code: 'ArrowDown', repeat: false });
    expect(onNav).toHaveBeenNthCalledWith(1, -1);
    expect(onNav).toHaveBeenNthCalledWith(2, 1);
  });

  it('Enter déclenche onPress sans coordonnées', () => {
    const target = fakeTarget();
    const win = fakeTarget();
    const onPress = vi.fn();
    createInput({ target, win, preventDefault: false }, onPress);
    win.fire('keydown', { code: 'Enter', repeat: false });
    expect(onPress).toHaveBeenCalledWith(undefined);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- input`
Expected: FAIL — `onNav` undefined / `onPress` called with `undefined` instead of `{x,y}` / Enter not handled.

- [ ] **Step 3: Rewrite `src/engine/input.js`**

```javascript
export function createInput({ target, win = window, preventDefault = true }, onPress, onNav = () => {}) {
  function pointerFromEvent(e) {
    if (typeof e.clientX !== 'number' || typeof target.getBoundingClientRect !== 'function') {
      return undefined;
    }
    const rect = target.getBoundingClientRect();
    const sx = target.width / rect.width;
    const sy = target.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function handlePointer(e) {
    if (preventDefault && e.preventDefault) e.preventDefault();
    onPress(pointerFromEvent(e));
  }

  function handleKey(e) {
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
      if (preventDefault && e.preventDefault) e.preventDefault();
      onPress();
    } else if (e.code === 'ArrowUp' && !e.repeat) {
      if (preventDefault && e.preventDefault) e.preventDefault();
      onNav(-1);
    } else if (e.code === 'ArrowDown' && !e.repeat) {
      if (preventDefault && e.preventDefault) e.preventDefault();
      onNav(1);
    }
  }

  target.addEventListener('pointerdown', handlePointer);
  win.addEventListener('keydown', handleKey);
  return {
    dispose() {
      target.removeEventListener('pointerdown', handlePointer);
      win.removeEventListener('keydown', handleKey);
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- input`
Expected: PASS (existing 3 tests + 3 new). The original `pointerdown` test fires
`{}` (no `clientX`) → `onPress(undefined)`, still called once.

- [ ] **Step 5: Commit**

```bash
git add src/engine/input.js tests/engine/input.test.js
git commit -m "feat(input): pointer coords + arrow-key nav callback"
```

---

### Task 3: World routing — menu state + press dispatch (`src/game/world.js`)

Wire menu into world: hold a `menu`, route `press` in MENU to button actions, add `navMenu`, and a `menuTick` that advances every frame (for menu animation).

**Files:**
- Modify: `src/game/world.js`
- Test: `tests/game/world.test.js`

**Interfaces:**
- Consumes: `createMenu`, `hitTest`, `activate`, `moveFocus` from `src/game/menu.js`.
- Produces:
  - `world.menu` (from `createMenu()`), `world.menuTick` (number, starts 0).
  - `press(world, pointer?)` — in MENU: `pointer` → `hitTest`, else `activate`;
    only `'newgame'` starts the game (`startLevel(world, 1)` + `PLAY`); other ids /
    null are no-ops. Non-MENU states unchanged (pointer ignored).
  - `navMenu(world, dir)` — in MENU calls `moveFocus(world.menu, dir)`; else no-op.

- [ ] **Step 1: Write the failing tests (append to `tests/game/world.test.js`)**

Add `navMenu` to the import on line 2:

```javascript
import { createWorld, press, navMenu, resetRun, startLevel, updateWorld } from '../../src/game/world.js';
```

Add a new `describe` block at the end of the top-level `describe('world', ...)`:

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- world`
Expected: FAIL — `navMenu` is not exported / `w.menu` undefined / `w.menuTick` undefined.

- [ ] **Step 3: Wire `src/game/world.js`**

Add to the imports (after the `level.js` import):

```javascript
import { createMenu, hitTest, activate, moveFocus } from './menu.js';
```

In `createWorld`'s returned object, add these two fields (e.g. right after `sm:`):

```javascript
    menu: createMenu(),
    menuTick: 0,
```

Replace the `MENU` branch of `press` with a routed dispatch, and change the
signature to accept `pointer`. The full new `press` (rest of the function is
unchanged from current):

```javascript
export function press(world, pointer) {
  const state = world.sm.get();
  if (state === States.MENU) {
    const id = pointer ? hitTest(world.menu, pointer.x, pointer.y) : activate(world.menu);
    if (id === 'newgame') {
      startLevel(world, 1);
      world.sm.to(States.PLAY);
    }
    // 'continue' / 'options' (stubs) and null → no-op
  } else if (state === States.PLAY) {
    applyThrust(world.robot);
    world.events.push('thrust');
  } else if (state === States.LEVEL_COMPLETE) {
    startLevel(world, world.level + 1);
    world.sm.to(States.PLAY);
  } else if (state === States.GAMEOVER) {
    startLevel(world, world.level);
    world.sm.to(States.PLAY);
  }
}

export function navMenu(world, dir) {
  if (world.sm.get() === States.MENU) moveFocus(world.menu, dir);
}
```

Add `world.menuTick += 1;` as the **first line** inside `updateWorld` (before the
layer loop), so it advances in every state:

```javascript
export function updateWorld(world, dt) {
  world.menuTick += 1;
  for (const layer of world.layers) updateLayer(layer, world.scrollSpeed, dt);
  // …rest unchanged
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- world`
Expected: PASS — new menu-routing tests plus all pre-existing world tests (the old
`press(w)` MENU→PLAY tests still pass via the `activate` path).

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `npm test`
Expected: PASS (all files green).

- [ ] **Step 6: Commit**

```bash
git add src/game/world.js tests/game/world.test.js
git commit -m "feat(world): route menu presses to button actions + menuTick"
```

---

### Task 4: Generate menu UI sprites (PixelLab)

Produce the 10 pixel-art sprites and place them in `assets/`. This task has no unit
test; its deliverable is verified by eye (legibility + 3 consistent states) and
consumed by Task 5.

**Files:**
- Create (generated): `assets/ui-logo.png`, `assets/btn-newgame.png`,
  `assets/btn-newgame-focus.png`, `assets/btn-newgame-disabled.png`,
  `assets/btn-continue.png`, `assets/btn-continue-focus.png`,
  `assets/btn-continue-disabled.png`, `assets/btn-options.png`,
  `assets/btn-options-focus.png`, `assets/btn-options-disabled.png`
- Uses: `scripts/pixellab.mjs` (generate), `scripts/crop-borders.mjs` (optional).

> **Note:** `renderMenu` (Task 5) draws each sprite scaled to the button rect
> (200×56) via `drawImage`, so exact output pixel size need only match the aspect
> ratio (~3.6:1 for buttons). Do **not** crop button plates (the neon plate should
> fill the rect). The logo may be cropped of transparent margin if desired.

- [ ] **Step 1: Generate the logo**

```bash
node scripts/pixellab.mjs generate \
  --description "retro synthwave arcade game logo, bold blocky pixel letters spelling JETPACK BOT on two lines, cyan and magenta neon glow, transparent background" \
  --size 260x88 --no-bg true --out-dir assets/preview --name ui-logo --seed 7
```

Saved as `assets/preview/ui-logo-0.png` (sizes >170px return a single candidate).

- [ ] **Step 2: Generate the New Game button (3 states)**

```bash
node scripts/pixellab.mjs generate --description "pixel art UI button, horizontal rounded rectangle plate, glowing cyan neon border, dark navy fill, bold white pixel text 'NEW GAME' centered, transparent background" --size 200x56 --no-bg true --out-dir assets/preview --name btn-newgame --seed 11

node scripts/pixellab.mjs generate --description "pixel art UI button, horizontal rounded rectangle plate, bright glowing cyan neon border and inner glow, highlighted selected state, dark navy fill, bold white pixel text 'NEW GAME' centered, transparent background" --size 200x56 --no-bg true --out-dir assets/preview --name btn-newgame-focus --seed 11

node scripts/pixellab.mjs generate --description "pixel art UI button, horizontal rounded rectangle plate, dim desaturated grey border, dark grey fill, greyed-out disabled state, dim grey pixel text 'NEW GAME' centered, transparent background" --size 200x56 --no-bg true --out-dir assets/preview --name btn-newgame-disabled --seed 11
```

- [ ] **Step 3: Generate the Continue button (3 states)**

Repeat Step 2's three commands, replacing `NEW GAME` → `CONTINUE` and the
`--name btn-newgame*` → `btn-continue*` (keep `--seed 11` for style consistency).

- [ ] **Step 4: Generate the Options button (3 states)**

Repeat Step 2's three commands, replacing `NEW GAME` → `OPTIONS` and the
`--name btn-newgame*` → `btn-options*` (keep `--seed 11`).

- [ ] **Step 5: Visual review + select**

Open every `assets/preview/*-0.png`. Check per sprite:
- Button label is **legible** and reads the right word.
- The three states of each button are visually distinct (bright / normal / dim)
  and share the same shape/size.

For any illegible or off-style sprite, re-run its command with a different
`--seed` (e.g. 12, 13) or a tightened `--description`. Iterate until acceptable.

- [ ] **Step 6: Place final sprites in `assets/`**

Copy each approved `assets/preview/<name>-0.png` to `assets/<name>.png`:

```bash
for f in ui-logo btn-newgame btn-newgame-focus btn-newgame-disabled \
         btn-continue btn-continue-focus btn-continue-disabled \
         btn-options btn-options-focus btn-options-disabled; do
  cp "assets/preview/$f-0.png" "assets/$f.png"
done
```

(Optional) trim transparent margin from the logo only:
`node scripts/crop-borders.mjs assets/ui-logo.png --apply`

- [ ] **Step 7: Commit**

```bash
git add assets/ui-logo.png assets/btn-*.png
git commit -m "assets(menu): PixelLab logo + 3-state button sprites"
```

---

### Task 5: Render the menu + wire it in (`src/render/menu.js`, `renderer.js`, `main.js`)

Draw the menu (logo + state-correct button sprites + idle robot + best level) and
replace the raw-text `MENU` branch. Load the new sprites.

**Files:**
- Create: `src/render/menu.js`
- Modify: `src/render/renderer.js` (delegate MENU branch), `src/main.js` (imports + wiring)
- Test: `tests/render/menu.test.js`

**Interfaces:**
- Consumes: `focusedId` from `src/game/menu.js`; `world.menu`, `world.menuTick`,
  `world.score.bestLevel`; `assets` map with keys `ui-logo`, `btn-<id>`,
  `btn-<id>-focus`, `btn-<id>-disabled`, `robot`; `CONFIG.MENU_*`.
- Produces: `renderMenu(ctx, world, assets)` — draws logo, each button with the
  sprite matching its state, an idle bobbing robot, and `Best: niveau N`. Selects
  button sprite: disabled → `btn-<id>-disabled`; focused enabled → `btn-<id>-focus`;
  else → `btn-<id>`.

- [ ] **Step 1: Write the failing test (sprite selection via fake ctx)**

Create `tests/render/menu.test.js`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { renderMenu } from '../../src/render/menu.js';
import { createMenu } from '../../src/game/menu.js';

/** Fake ctx that records which asset object each drawImage received. */
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
  // Each key maps to a unique sentinel object so we can assert identity.
  const keys = [
    'ui-logo', 'robot',
    'btn-newgame', 'btn-newgame-focus', 'btn-newgame-disabled',
    'btn-continue', 'btn-continue-focus', 'btn-continue-disabled',
    'btn-options', 'btn-options-focus', 'btn-options-disabled',
  ];
  return Object.fromEntries(keys.map((k) => [k, { key: k }]));
}

function worldWith(menu) {
  return { menu, menuTick: 0, score: { bestLevel: 3 } };
}

describe('renderMenu', () => {
  it('dessine le logo et le robot', () => {
    const ctx = fakeCtx();
    const assets = fakeAssets();
    renderMenu(ctx, worldWith(createMenu()), assets);
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('ui-logo');
    expect(keys).toContain('robot');
  });

  it('New Game focus → sprite focus ; Continue/Options disabled → sprite disabled', () => {
    const ctx = fakeCtx();
    const assets = fakeAssets();
    const menu = createMenu(); // focus sur newgame, continue/options disabled
    renderMenu(ctx, worldWith(menu), assets);
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('btn-newgame-focus');
    expect(keys).toContain('btn-continue-disabled');
    expect(keys).toContain('btn-options-disabled');
    // pas la variante normale/focus des stubs ce tour-ci
    expect(keys).not.toContain('btn-continue');
    expect(keys).not.toContain('btn-continue-focus');
  });

  it('bouton enabled non-focus → sprite normal', () => {
    const ctx = fakeCtx();
    const assets = fakeAssets();
    const menu = createMenu();
    menu.buttons[1].enabled = true; // continue devient enabled, mais focus reste newgame
    renderMenu(ctx, worldWith(menu), assets);
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('btn-continue'); // enabled + non focus → normal
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- render/menu`
Expected: FAIL — `Cannot find module '../../src/render/menu.js'`.

- [ ] **Step 3: Implement `src/render/menu.js`**

```javascript
import { CONFIG } from '../config.js';
import { focusedId } from '../game/menu.js';

function spriteKey(button, focused) {
  if (!button.enabled) return `btn-${button.id}-disabled`;
  if (button.id === focused) return `btn-${button.id}-focus`;
  return `btn-${button.id}`;
}

export function renderMenu(ctx, world, assets) {
  const { menu } = world;

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

  // Buttons — sprite chosen by state
  const focused = focusedId(menu);
  for (const b of menu.buttons) {
    ctx.drawImage(assets[spriteKey(b, focused)], b.x, b.y, b.w, b.h);
  }

  // Best level
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`Best: niveau ${world.score.bestLevel}`, CONFIG.WIDTH / 2, CONFIG.MENU_BEST_Y);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- render/menu`
Expected: PASS (3 tests).

- [ ] **Step 5: Delegate the MENU branch in `src/render/renderer.js`**

Add the import at the top:

```javascript
import { renderMenu } from './menu.js';
```

**5a — Suppress the in-scene gameplay robot while in MENU.** Section 4 currently
draws `world.robot` in every state (that's the robot visible on today's title
screen). `renderMenu` draws its own bobbing idle robot, so guard section 4 to skip
MENU and avoid a double robot. Wrap the robot-drawing block (the `const r =
world.robot;` … `ctx.drawImage(sprite, …)` lines) in:

```javascript
  if (world.sm.get() !== States.MENU) {
    const r = world.robot;
    let sprite = assets.robot; // idle / falling
    if (r.alive && r.vy < 0) {
      sprite = (Math.floor(world.tick / 6) % 2 === 0) ? assets['robot-thrust-0'] : assets['robot-thrust-1'];
    }
    const size = 44;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    ctx.drawImage(sprite, Math.round(cx - size / 2), Math.round(cy - size / 2), size, size);
  }
```

**5b — Delegate the MENU HUD branch.** Replace the `else if (state ===
States.MENU) { … }` block (the one drawing `'JETPACK BOT'` /
`'Tap / Espace pour voler'` / `Best`) with:

```javascript
  } else if (state === States.MENU) {
    renderMenu(ctx, world, assets);
```

Leave the PLAY / LEVEL_COMPLETE / GAMEOVER branches and the flash overlay unchanged.

- [ ] **Step 6: Load sprites + wire nav in `src/main.js`**

Add these imports alongside the other asset imports:

```javascript
import uiLogo from '../assets/ui-logo.png';
import btnNewgame from '../assets/btn-newgame.png';
import btnNewgameFocus from '../assets/btn-newgame-focus.png';
import btnNewgameDisabled from '../assets/btn-newgame-disabled.png';
import btnContinue from '../assets/btn-continue.png';
import btnContinueFocus from '../assets/btn-continue-focus.png';
import btnContinueDisabled from '../assets/btn-continue-disabled.png';
import btnOptions from '../assets/btn-options.png';
import btnOptionsFocus from '../assets/btn-options-focus.png';
import btnOptionsDisabled from '../assets/btn-options-disabled.png';
```

Import `navMenu` from world:

```javascript
import { createWorld, press, navMenu, updateWorld } from './game/world.js';
```

Add the sprite keys to the `loadImages({ … })` map:

```javascript
  'ui-logo': uiLogo,
  'btn-newgame': btnNewgame,
  'btn-newgame-focus': btnNewgameFocus,
  'btn-newgame-disabled': btnNewgameDisabled,
  'btn-continue': btnContinue,
  'btn-continue-focus': btnContinueFocus,
  'btn-continue-disabled': btnContinueDisabled,
  'btn-options': btnOptions,
  'btn-options-focus': btnOptionsFocus,
  'btn-options-disabled': btnOptionsDisabled,
```

Update the `createInput` call to forward the pointer and add nav:

```javascript
createInput({ target: canvas, win: window }, (pointer) => press(world, pointer), (dir) => navMenu(world, dir));
```

- [ ] **Step 7: Run the full suite + build**

Run: `npm test`
Expected: PASS (all green).

Run: `npm run build`
Expected: Vite build succeeds (confirms all 10 asset imports resolve).

- [ ] **Step 8: Commit**

```bash
git add src/render/menu.js src/render/renderer.js src/main.js tests/render/menu.test.js
git commit -m "feat(menu): render intro menu + wire input nav and sprites"
```

---

### Task 6: Visual verification

Confirm the menu looks right and is interactive in the real browser (Canvas), per
the project's visual-verify convention.

**Files:** none committed (temporary hooks reverted).

- [ ] **Step 1: Add a temporary debug hook in `src/main.js`**

Inside the `loadImages().then(...)` callback, after `loop.start()`, add:

```javascript
  window.__world = world;
  window.__press = (p) => press(world, p);
  window.__nav = (d) => navMenu(world, d);
```

- [ ] **Step 2: Run the dev server and screenshot the menu**

Run: `npm run dev` (note the local URL). Drive it with Playwright (install
chromium on demand). Capture:
- The **menu** at load (logo, three buttons, idle robot, `Best: niveau N`).
- The menu after `window.__nav(1)` a few times (focus stays on New Game — it's the
  only enabled button; the focus sprite should be visible on New Game).
- After clicking New Game's rect (or `window.__press({x:180,y:368})`) → gameplay starts.

- [ ] **Step 3: Confirm the checks**

Verify by eye: labels legible, three button states render correctly (New Game
bright/focused, Continue & Options dimmed), robot bobs, clicking New Game starts
the game, Continue/Options clicks do nothing.

- [ ] **Step 4: Revert the debug hook**

Remove the three `window.__*` lines added in Step 1.

Run: `npm test` and `npm run build`
Expected: still green.

- [ ] **Step 5: Commit (if the revert changed anything)**

```bash
git add src/main.js
git commit -m "chore(menu): remove temporary debug hooks after visual verify"
```

---

## Definition of Done

- All Vitest suites pass (`npm test`), `npm run build` succeeds.
- Menu shows pixel-art logo + 3 buttons; New Game starts the game via mouse/tap,
  Space/Enter (focus), and reads as focused; Continue/Options are dimmed no-ops.
- Arrow keys move focus among enabled buttons (only New Game this round).
- Live parallax backdrop + idle robot render behind/over the menu.
- Design's "hors scope" items (save, audio/options screen, per-theme music) are
  untouched.

## Notes for the reviewer / merge

- Branch: `feat/intro-menu-ui`. Merge to `main` with `--no-ff` (repo convention).
- **Do not push** unless Jael asks.
- Visual verification (Task 6) is required before merge.
