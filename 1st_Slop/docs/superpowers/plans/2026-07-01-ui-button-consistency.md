# UI Button Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ~15 label-baked button sprites with one reusable neon plate (normal + focus) drawn under canvas-rendered pixel-font labels, so every menu / pause / game-over button shares a single consistent visual language across all states.

**Architecture:** A single `drawButton(ctx, rect, label, state, assets)` primitive draws the state's plate sprite and centers an auto-fit pixel-font label on top. `drawButtons` derives each button's state (`normal`/`focus`/`disabled`) from the existing `enabled`+focus model and delegates to `drawButton`. Disabled buttons reuse the normal plate at reduced alpha. A `FontFace`-based loader gates the render loop on the pixel font.

**Tech Stack:** Vanilla JS, Canvas 2D, Vite, Vitest. Zero runtime deps. Assets via PixelLab (`scripts/pixellab.mjs`). Font: Press Start 2P (SIL OFL, static `.ttf` asset).

## Global Constraints

- **Palette (synthwave):** cyan `#3ef0ff`, magenta `#ff2e88`, dark base `#0a0a14`.
- **Canvas:** 360×640, `imageSmoothingEnabled = false`.
- **No new runtime dependencies.** The font is a static asset, not an npm dep. Pure-logic modules unit-tested; rendering checked via fake-ctx recording `drawImage`/`fillText` + final Playwright visual verification.
- **All buttons are 200×56** (`CONFIG.MENU_BTN`, `CONFIG.PAUSE_BTN`, `CONFIG.GAMEOVER_MENU_BTN`). One plate sprite serves all.
- **Button data model unchanged:** `menu.js`/`pause.js` expose `{ buttons: [{ id, label, enabled, x, y, w, h }], focus }`. Restart label stays `RECOMMENCER` (canvas auto-fit renders it without cramping).
- **French labels:** `REPRENDRE`, `RECOMMENCER`, `MENU`, `OPTIONS`, plus menu `NEW GAME`/`CONTINUE`/`OPTIONS`.
- **The app is not runnable until Task 6** (code references `btn-plate` before `main.js` loads it); `npm test` stays green throughout via fake assets.

---

### Task 1: Font loader

**Files:**
- Create: `src/engine/font.js`
- Test: `tests/engine/font.test.js`

**Interfaces:**
- Produces: `loadFont(family, url, deps?) → Promise<void>`, where `deps = { FontFaceCtor = FontFace, fontset = document.fonts }` (injectable for tests). Constructs `new FontFaceCtor(family, `url(${url})`)`, calls `.load()`, adds the resolved face to `fontset`, resolves when ready.

- [ ] **Step 1: Write the failing test — `tests/engine/font.test.js`**

```javascript
import { describe, it, expect, vi } from 'vitest';
import { loadFont } from '../../src/engine/font.js';

describe('loadFont', () => {
  it('charge la font et l\'ajoute au fontset', async () => {
    const loaded = { name: 'face' };
    const load = vi.fn().mockResolvedValue(loaded);
    const FontFaceCtor = vi.fn().mockImplementation((family, src) => ({ family, src, load }));
    const fontset = { add: vi.fn() };

    await loadFont('PressStart2P', '/x.ttf', { FontFaceCtor, fontset });

    expect(FontFaceCtor).toHaveBeenCalledWith('PressStart2P', 'url(/x.ttf)');
    expect(load).toHaveBeenCalledTimes(1);
    expect(fontset.add).toHaveBeenCalledWith(loaded);
  });

  it('rejette si le chargement échoue', async () => {
    const load = vi.fn().mockRejectedValue(new Error('boom'));
    const FontFaceCtor = vi.fn().mockImplementation(() => ({ load }));
    const fontset = { add: vi.fn() };
    await expect(loadFont('X', '/x.ttf', { FontFaceCtor, fontset })).rejects.toThrow('boom');
    expect(fontset.add).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- font`
Expected: FAIL — `Cannot find module '../../src/engine/font.js'`.

- [ ] **Step 3: Create `src/engine/font.js`**

```javascript
// Loads a font via the FontFace API and registers it so canvas can use it.
// deps are injectable for unit testing (no real DOM needed).
export function loadFont(family, url, deps = {}) {
  const FontFaceCtor = deps.FontFaceCtor || FontFace;
  const fontset = deps.fontset || document.fonts;
  const face = new FontFaceCtor(family, `url(${url})`);
  return face.load().then((loaded) => {
    fontset.add(loaded);
  });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- font`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/font.js tests/engine/font.test.js
git commit -m "feat(font): FontFace loader (injectable deps)"
```

---

### Task 2: Config constants + `fitFontSize` helper

**Files:**
- Modify: `src/config.js`
- Modify: `src/render/buttons.js`
- Test: `tests/render/buttons.test.js` (new)

**Interfaces:**
- Consumes: `CONFIG.BTN_FONT_FAMILY`, `CONFIG.BTN_FONT_MAX`, `CONFIG.BTN_FONT_MIN`.
- Produces: `fitFontSize(ctx, text, maxWidth, maxSize, minSize) → number` — largest integer size in `[minSize, maxSize]` whose `ctx.measureText(text).width ≤ maxWidth`; returns `minSize` if none fit. Sets `ctx.font` while measuring.

- [ ] **Step 1: Add constants to `src/config.js`**

Add inside `CONFIG` (after the `GAMEOVER_MENU_BTN` line):

```javascript
  // Button text (canvas-drawn labels over shared plate)
  BTN_FONT_FAMILY: 'PressStart2P',
  BTN_FONT_MAX: 18,
  BTN_FONT_MIN: 8,
  BTN_TEXT_PAD: 16,
  BTN_DISABLED_ALPHA: 0.4,
  BTN_TEXT: '#ffffff',
  BTN_TEXT_DISABLED: '#8a94a6',
```

- [ ] **Step 2: Write the failing test — `tests/render/buttons.test.js`**

```javascript
import { describe, it, expect } from 'vitest';
import { fitFontSize } from '../../src/render/buttons.js';

/** Fake ctx whose measureText width = charCount * fontSize * 1.0. */
function measuringCtx() {
  return {
    _font: '10px x',
    set font(v) { this._font = v; },
    get font() { return this._font; },
    measureText(t) { return { width: t.length * parseInt(this._font, 10) }; },
  };
}

describe('fitFontSize', () => {
  it('rétrécit pour tenir dans la largeur', () => {
    const ctx = measuringCtx();
    // 'RECOMMENCER' = 11 chars, maxWidth 168 -> largest size with 11*size<=168 is 15
    expect(fitFontSize(ctx, 'RECOMMENCER', 168, 18, 8)).toBe(15);
  });

  it('garde la taille max si ça tient déjà', () => {
    const ctx = measuringCtx();
    // 'MENU' = 4 chars, 4*18=72 <= 168 -> 18
    expect(fitFontSize(ctx, 'MENU', 168, 18, 8)).toBe(18);
  });

  it('clamp à la taille min si rien ne tient', () => {
    const ctx = measuringCtx();
    // 40 chars never fit -> minSize
    expect(fitFontSize(ctx, 'X'.repeat(40), 168, 18, 8)).toBe(8);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- render/buttons`
Expected: FAIL — `fitFontSize` not exported.

- [ ] **Step 4: Edit `src/render/buttons.js` — add the import + `fitFontSize`**

At the top, add the config import (keep the existing `focusedId` import):

```javascript
import { focusedId } from '../game/menu.js';
import { CONFIG } from '../config.js';
```

Add the helper (leave the existing `spriteKey`/`drawButtons` in place for now — Task 3 replaces them):

```javascript
export function fitFontSize(ctx, text, maxWidth, maxSize, minSize) {
  for (let size = maxSize; size > minSize; size -= 1) {
    ctx.font = `${size}px ${CONFIG.BTN_FONT_FAMILY}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  return minSize;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- render/buttons`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/config.js src/render/buttons.js tests/render/buttons.test.js
git commit -m "feat(buttons): BTN config + fitFontSize auto-fit helper"
```

---

### Task 3: `drawButton` primitive + rewrite `drawButtons`

**Files:**
- Modify: `src/render/buttons.js`
- Test: `tests/render/buttons.test.js`

**Interfaces:**
- Consumes: `fitFontSize`, `focusedId`, `CONFIG.BTN_*`.
- Produces:
  - `plateKey(state) → 'btn-plate-focus' | 'btn-plate'` (`'btn-plate-focus'` only when `state === 'focus'`).
  - `drawButton(ctx, rect, label, state, assets) → void` — `state ∈ {'normal','focus','disabled'}`. Draws the state plate (disabled → normal plate at `BTN_DISABLED_ALPHA`) then a centered auto-fit label (`BTN_TEXT`, or `BTN_TEXT_DISABLED` when disabled).
  - `drawButtons(ctx, menuObj, assets) → void` — for each button derives state from `enabled`+focus and calls `drawButton`. Unchanged public signature.

- [ ] **Step 1: Append failing tests to `tests/render/buttons.test.js`**

Add to the imports:

```javascript
import { fitFontSize, plateKey, drawButton, drawButtons } from '../../src/render/buttons.js';
import { createPauseMenu } from '../../src/game/menu.js';
import { vi } from 'vitest';
```

Add a recording fake ctx + tests:

```javascript
function recordingCtx() {
  return {
    drawn: [], texts: [], alphas: [], fills: [],
    _font: '10px x', _alpha: 1,
    drawImage(img, ...rest) { this.drawn.push({ img, rest, alpha: this._alpha }); },
    fillText(t, x, y) { this.texts.push({ t, x, y }); },
    measureText(t) { return { width: t.length * parseInt(this._font, 10) }; },
    save() {}, restore() { this._alpha = 1; },
    set font(v) { this._font = v; }, get font() { return this._font; },
    set globalAlpha(v) { this._alpha = v; }, get globalAlpha() { return this._alpha; },
    set fillStyle(v) { this.fills.push(v); }, get fillStyle() { return ''; },
    set textAlign(_) {}, get textAlign() { return ''; },
    set textBaseline(_) {}, get textBaseline() { return ''; },
  };
}

const plateAssets = () => ({ 'btn-plate': { key: 'btn-plate' }, 'btn-plate-focus': { key: 'btn-plate-focus' } });

describe('plateKey', () => {
  it('focus -> btn-plate-focus, sinon btn-plate', () => {
    expect(plateKey('focus')).toBe('btn-plate-focus');
    expect(plateKey('normal')).toBe('btn-plate');
    expect(plateKey('disabled')).toBe('btn-plate');
  });
});

describe('drawButton', () => {
  it('normal: plate normale + label blanc', () => {
    const ctx = recordingCtx();
    drawButton(ctx, { x: 0, y: 0, w: 200, h: 56 }, 'MENU', 'normal', plateAssets());
    expect(ctx.drawn[0].img.key).toBe('btn-plate');
    expect(ctx.drawn[0].alpha).toBe(1);
    expect(ctx.texts[0].t).toBe('MENU');
    expect(ctx.fills).toContain('#ffffff');
  });

  it('focus: plate focus', () => {
    const ctx = recordingCtx();
    drawButton(ctx, { x: 0, y: 0, w: 200, h: 56 }, 'MENU', 'focus', plateAssets());
    expect(ctx.drawn[0].img.key).toBe('btn-plate-focus');
  });

  it('disabled: plate normale en alpha réduit + label gris', () => {
    const ctx = recordingCtx();
    drawButton(ctx, { x: 0, y: 0, w: 200, h: 56 }, 'OPTIONS', 'disabled', plateAssets());
    expect(ctx.drawn[0].img.key).toBe('btn-plate');
    expect(ctx.drawn[0].alpha).toBe(0.4);
    expect(ctx.fills).toContain('#8a94a6');
  });
});

describe('drawButtons', () => {
  it('resume focus -> focus plate; options disabled -> normale; tous les labels dessinés', () => {
    const ctx = recordingCtx();
    drawButtons(ctx, createPauseMenu(), plateAssets());
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys.filter((k) => k === 'btn-plate-focus').length).toBe(1); // resume only
    expect(ctx.texts.map((t) => t.t)).toEqual(['REPRENDRE', 'RECOMMENCER', 'MENU', 'OPTIONS']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- render/buttons`
Expected: FAIL — `plateKey`/`drawButton` not exported.

- [ ] **Step 3: Rewrite `src/render/buttons.js`**

Replace the whole file body (keep `fitFontSize` from Task 2):

```javascript
import { focusedId } from '../game/menu.js';
import { CONFIG } from '../config.js';

export function fitFontSize(ctx, text, maxWidth, maxSize, minSize) {
  for (let size = maxSize; size > minSize; size -= 1) {
    ctx.font = `${size}px ${CONFIG.BTN_FONT_FAMILY}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  return minSize;
}

export function plateKey(state) {
  return state === 'focus' ? 'btn-plate-focus' : 'btn-plate';
}

export function drawButton(ctx, rect, label, state, assets) {
  ctx.save();
  if (state === 'disabled') ctx.globalAlpha = CONFIG.BTN_DISABLED_ALPHA;
  ctx.drawImage(assets[plateKey(state)], rect.x, rect.y, rect.w, rect.h);

  const size = fitFontSize(ctx, label, rect.w - CONFIG.BTN_TEXT_PAD * 2, CONFIG.BTN_FONT_MAX, CONFIG.BTN_FONT_MIN);
  ctx.font = `${size}px ${CONFIG.BTN_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = state === 'disabled' ? CONFIG.BTN_TEXT_DISABLED : CONFIG.BTN_TEXT;
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}

export function drawButtons(ctx, menuObj, assets) {
  const focused = focusedId(menuObj);
  for (const b of menuObj.buttons) {
    const state = !b.enabled ? 'disabled' : (b.id === focused ? 'focus' : 'normal');
    drawButton(ctx, b, b.label, state, assets);
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- render/buttons`
Expected: PASS (fitFontSize 3 + plateKey 1 + drawButton 3 + drawButtons 1).

- [ ] **Step 5: Commit**

```bash
git add src/render/buttons.js tests/render/buttons.test.js
git commit -m "feat(buttons): drawButton primitive + plate-based drawButtons"
```

---

### Task 4: Update call sites + existing render tests

**Files:**
- Modify: `src/render/renderer.js`
- Modify: `tests/render/menu.test.js`
- Modify: `tests/render/pause.test.js`

**Interfaces:**
- Consumes: `drawButton` (renderer game-over button), `drawButtons` (menu/pause, unchanged).

- [ ] **Step 1: Edit `src/render/renderer.js` — game-over button via `drawButton`**

Add the import next to `renderPause`:

```javascript
import { drawButton } from './buttons.js';
```

In the `GAMEOVER` branch, replace:

```javascript
    const gb = CONFIG.GAMEOVER_MENU_BTN;
    ctx.drawImage(assets['btn-menu'], gb.x, gb.y, gb.w, gb.h);
```

with:

```javascript
    drawButton(ctx, CONFIG.GAMEOVER_MENU_BTN, 'MENU', 'normal', assets);
```

- [ ] **Step 2: Rewrite `tests/render/menu.test.js` fake ctx/assets + expectations**

Replace the file with:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { renderMenu } from '../../src/render/menu.js';
import { createMenu } from '../../src/game/menu.js';

function fakeCtx() {
  return {
    drawn: [], texts: [], _font: '10px x',
    drawImage(img, ...rest) { this.drawn.push({ img, rest }); },
    fillRect: vi.fn(),
    fillText(t) { this.texts.push(t); },
    measureText(t) { return { width: t.length * parseInt(this._font, 10) }; },
    save: vi.fn(), restore: vi.fn(),
    set fillStyle(_) {}, get fillStyle() { return ''; },
    set font(v) { this._font = v; }, get font() { return this._font; },
    set textAlign(_) {}, get textAlign() { return ''; },
    set textBaseline(_) {}, get textBaseline() { return ''; },
    set globalAlpha(_) {}, get globalAlpha() { return 1; },
  };
}

function fakeAssets() {
  const keys = ['ui-logo', 'robot', 'btn-plate', 'btn-plate-focus'];
  return Object.fromEntries(keys.map((k) => [k, { key: k }]));
}

function worldWith(menu) {
  return { menu, menuTick: 0, score: { bestLevel: 3 } };
}

describe('renderMenu', () => {
  it('dessine le logo et le robot', () => {
    const ctx = fakeCtx();
    renderMenu(ctx, worldWith(createMenu()), fakeAssets());
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('ui-logo');
    expect(keys).toContain('robot');
  });

  it('New Game focus -> plate focus ; les labels sont dessinés', () => {
    const ctx = fakeCtx();
    renderMenu(ctx, worldWith(createMenu()), fakeAssets());
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('btn-plate-focus'); // newgame focused
    expect(keys).toContain('btn-plate');       // continue/options disabled
    expect(ctx.texts).toEqual(expect.arrayContaining(['NEW GAME', 'CONTINUE', 'OPTIONS']));
  });

  it('un seul bouton focus -> une seule plate focus', () => {
    const ctx = fakeCtx();
    renderMenu(ctx, worldWith(createMenu()), fakeAssets());
    const focusPlates = ctx.drawn.filter((d) => d.img.key === 'btn-plate-focus');
    expect(focusPlates.length).toBe(1);
  });
});
```

- [ ] **Step 3: Rewrite `tests/render/pause.test.js` fake ctx/assets + expectations**

Replace the file with:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { renderPause } from '../../src/render/pause.js';
import { createPauseMenu } from '../../src/game/menu.js';

function fakeCtx() {
  return {
    drawn: [], texts: [], _font: '10px x',
    drawImage(img, ...rest) { this.drawn.push({ img, rest }); },
    fillRect: vi.fn(),
    fillText(t) { this.texts.push(t); },
    measureText(t) { return { width: t.length * parseInt(this._font, 10) }; },
    save: vi.fn(), restore: vi.fn(),
    set fillStyle(_) {}, get fillStyle() { return ''; },
    set font(v) { this._font = v; }, get font() { return this._font; },
    set textAlign(_) {}, get textAlign() { return ''; },
    set textBaseline(_) {}, get textBaseline() { return ''; },
    set globalAlpha(_) {}, get globalAlpha() { return 1; },
  };
}

function fakeAssets() {
  const keys = ['btn-plate', 'btn-plate-focus'];
  return Object.fromEntries(keys.map((k) => [k, { key: k }]));
}

describe('renderPause', () => {
  it('resume focus -> une plate focus ; les 4 labels dessinés', () => {
    const ctx = fakeCtx();
    const world = { pause: createPauseMenu(), menuTick: 0 };
    renderPause(ctx, world, fakeAssets());
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys.filter((k) => k === 'btn-plate-focus').length).toBe(1);
    expect(ctx.texts).toEqual(['PAUSE', 'REPRENDRE', 'RECOMMENCER', 'MENU', 'OPTIONS']);
  });
});
```

(Note: `renderPause` draws the `'PAUSE'` title via `fillText` before the buttons, so it is first in `texts`.)

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: PASS — all suites green (font, buttons, menu, pause render, world, state, input, etc.). The app is not yet runnable (Task 6 wires assets), but no test builds/runs it.

- [ ] **Step 5: Commit**

```bash
git add src/render/renderer.js tests/render/menu.test.js tests/render/pause.test.js
git commit -m "refactor(render): route all buttons through drawButton"
```

---

### Task 5: Generate the plate sprites + fetch the font; remove old sprites

**Files:**
- Create (generated): `assets/btn-plate.png`, `assets/btn-plate-focus.png`
- Create (fetched): `assets/PressStart2P-Regular.ttf`
- Delete: the 15 old label-baked button sprites (see list below)

No unit test; verified by eye and by Task 6/7. Plates are 200×56 (>170px → single candidate each). Do not crop the plates.

- [ ] **Step 1: Generate the 2 empty plates (normal + focus)**

```bash
node scripts/pixellab.mjs generate --description "pixel art UI button plate, horizontal rounded rectangle, glowing cyan neon border, dark navy fill, EMPTY with no text, centered, transparent background" --size 200x56 --no-bg true --out-dir assets/preview --name btn-plate --seed 21

node scripts/pixellab.mjs generate --description "pixel art UI button plate, horizontal rounded rectangle, bright glowing cyan neon border with strong inner glow, selected highlighted state, dark navy fill, EMPTY with no text, centered, transparent background" --size 200x56 --no-bg true --out-dir assets/preview --name btn-plate-focus --seed 21
```

- [ ] **Step 2: Visual review + select**

Open `assets/preview/btn-plate-0.png` and `assets/preview/btn-plate-focus-0.png`. Check: both are empty (no baked text/glyphs), share the same rounded-rectangle shape, and the focus plate is clearly brighter (stronger border/glow) than the normal plate. If either has stray text or the pair's shapes differ noticeably, re-run that command with a different `--seed` (22, 23…) until acceptable.

- [ ] **Step 3: Place plates in `assets/`**

```bash
cp assets/preview/btn-plate-0.png assets/btn-plate.png
cp assets/preview/btn-plate-focus-0.png assets/btn-plate-focus.png
```

- [ ] **Step 4: Fetch the Press Start 2P font**

```bash
curl -L -o assets/PressStart2P-Regular.ttf https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf
```

Verify it is a real TrueType file (first 4 bytes `00 01 00 00`, size > 100 KB):

```bash
node -e "const b=require('fs').readFileSync('assets/PressStart2P-Regular.ttf'); console.log('bytes', b.length, 'sig', b.slice(0,4).toString('hex'));"
```

Expected: `bytes` > 100000 and `sig 00010000`. If the download failed (HTML/404, tiny size), re-fetch from the alternate URL `https://raw.githubusercontent.com/google/fonts/main/ofl/pressstart2p/PressStart2P-Regular.ttf`.

- [ ] **Step 5: Delete the old label-baked button sprites**

```bash
git rm assets/btn-newgame.png assets/btn-newgame-focus.png assets/btn-newgame-disabled.png \
  assets/btn-continue.png assets/btn-continue-focus.png assets/btn-continue-disabled.png \
  assets/btn-options.png assets/btn-options-focus.png assets/btn-options-disabled.png \
  assets/btn-resume.png assets/btn-resume-focus.png \
  assets/btn-restart.png assets/btn-restart-focus.png \
  assets/btn-menu.png assets/btn-menu-focus.png
```

- [ ] **Step 6: Commit**

```bash
git add assets/btn-plate.png assets/btn-plate-focus.png assets/PressStart2P-Regular.ttf
git commit -m "assets(ui): shared button plates + Press Start 2P font; drop label-baked sprites"
```

---

### Task 6: Wire `main.js` — load plates + font, drop old imports, build

**Files:**
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `loadImages`, `loadFont`, `btn-plate`/`btn-plate-focus` assets, the `.ttf` URL, `CONFIG.BTN_FONT_FAMILY`.

- [ ] **Step 1: Edit imports in `src/main.js`**

Remove these 15 lines:

```javascript
import btnNewgame from '../assets/btn-newgame.png';
import btnNewgameFocus from '../assets/btn-newgame-focus.png';
import btnNewgameDisabled from '../assets/btn-newgame-disabled.png';
import btnContinue from '../assets/btn-continue.png';
import btnContinueFocus from '../assets/btn-continue-focus.png';
import btnContinueDisabled from '../assets/btn-continue-disabled.png';
import btnOptions from '../assets/btn-options.png';
import btnOptionsFocus from '../assets/btn-options-focus.png';
import btnOptionsDisabled from '../assets/btn-options-disabled.png';
import btnResume from '../assets/btn-resume.png';
import btnResumeFocus from '../assets/btn-resume-focus.png';
import btnRestart from '../assets/btn-restart.png';
import btnRestartFocus from '../assets/btn-restart-focus.png';
import btnMenu from '../assets/btn-menu.png';
import btnMenuFocus from '../assets/btn-menu-focus.png';
```

Add in their place:

```javascript
import btnPlate from '../assets/btn-plate.png';
import btnPlateFocus from '../assets/btn-plate-focus.png';
import fontUrl from '../assets/PressStart2P-Regular.ttf';
```

Add the `loadFont` import to the engine imports:

```javascript
import { loadFont } from './engine/font.js';
```

- [ ] **Step 2: Replace the button keys in the `loadImages({...})` map**

Remove all `'btn-newgame'…'btn-menu-focus'` keys and add:

```javascript
  'btn-plate': btnPlate,
  'btn-plate-focus': btnPlateFocus,
```

- [ ] **Step 3: Gate the loop on images AND font**

Replace:

```javascript
loadImages({
  ...
}).then((assets) => {
```

so the `loadImages({...})` call is wrapped in `Promise.all` with the font load. Concretely, change the `.then((assets) => {` opening to consume both results — replace the line `}).then((assets) => {` with:

```javascript
});

Promise.all([imagesPromise, loadFont(CONFIG.BTN_FONT_FAMILY, fontUrl)]).then(([assets]) => {
```

and assign the `loadImages({...})` result to `const imagesPromise = loadImages({` (change the opening line from `loadImages({` to `const imagesPromise = loadImages({`). Leave the `.catch(...)` chained on the `Promise.all(...)`.

The resulting structure:

```javascript
const imagesPromise = loadImages({
  robot: robotUrl,
  // …all non-button keys…
  'btn-plate': btnPlate,
  'btn-plate-focus': btnPlateFocus,
});

Promise.all([imagesPromise, loadFont(CONFIG.BTN_FONT_FAMILY, fontUrl)]).then(([assets]) => {
  const loop = createLoop({ /* unchanged */ });
  loop.start();
}).catch((err) => {
  // …unchanged error handling…
});
```

- [ ] **Step 4: Run tests + build**

Run: `npm test`
Expected: PASS (unchanged — tests use fake assets).

Run: `npm run build`
Expected: succeeds — the 2 plate imports, the `.ttf` import, and `font.js` all resolve; no dangling `btn-*` imports remain.

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat(ui): load shared plates + pixel font, gate loop on both"
```

---

### Task 7: Visual verification

Confirm the unified buttons render correctly with legible pixel-font labels in the real browser.

**Files:** none committed (temporary hooks reverted).

- [ ] **Step 1: Add temporary debug hooks in `src/main.js`**

Inside the `Promise.all(...).then(([assets]) => {...})` callback, after `loop.start()`, add:

```javascript
  window.__world = world;
  window.__press = (p) => press(world, p);
  window.__nav = (d) => navMenu(world, d);
  window.__escape = () => escapeAction(world);
```

- [ ] **Step 2: Run dev server + drive with Playwright**

Run: `npm run dev`. Drive with Playwright (chromium already installed this project session; if not, `npm i --no-save playwright && npx playwright install chromium`). Because the Playwright script imports `playwright` from the project `node_modules`, run it from a temp file at the project root (e.g. copy to `./__verify_tmp.mjs`, run, delete). Capture (canvas-space coordinates, viewport 360×640):
- **Menu** at load → all three buttons share the same plate; NEW GAME shows the focus plate; CONTINUE/OPTIONS are dimmed (disabled); labels are legible pixel-font text.
- Start a game (`window.__press({x:180, y:368})`), then `window.__escape()` → **pause overlay**: REPRENDRE / RECOMMENCER / MENU / OPTIONS, all same plate style, REPRENDRE focused (bright plate), OPTIONS dimmed, RECOMMENCER fully legible (no cramping).
- `window.__nav(1)` twice → focus moves resume→restart→menu; the focused button is always the brightest plate.
- Resume, trigger game over (fall), screenshot → the **MENU** button uses the same plate + pixel-font label.

- [ ] **Step 3: Confirm the checks**

Verify by eye: every button (menu, pause, game-over) uses one consistent plate style; the normal→focus→disabled relationship is uniform (focus brightest, disabled dimmest); pixel-font labels are crisp and centered; no label overflows its plate.

- [ ] **Step 4: Revert the debug hooks**

Remove the four `window.__*` lines from Step 1.

Run: `npm test` and `npm run build`
Expected: still green.

- [ ] **Step 5: Commit (only if the revert changed anything)**

```bash
git add src/main.js
git commit -m "chore(ui): remove temporary debug hooks after visual verify"
```

---

## Definition of Done

- All Vitest suites pass (`npm test`), `npm run build` succeeds.
- Menu, pause, and game-over buttons all render with **one** shared plate style; focus is always the brightest state, disabled the dimmest.
- Labels are crisp pixel-font (Press Start 2P) text, centered and auto-fit (RECOMMENCER fits without cramping).
- No label-baked button sprites remain in `assets/`; only `btn-plate` + `btn-plate-focus` (+ the `.ttf`).
- No new npm runtime dependencies.

## Notes for the reviewer / merge

- Branch: `feat/ui-button-consistency`. Merge to `main` with `--no-ff` (repo convention).
- **Do not push** unless Jael asks.
- Visual verification (Task 7) required before merge.
- Font licence: Press Start 2P is SIL OFL 1.1 — redistribution in `assets/` is permitted.
