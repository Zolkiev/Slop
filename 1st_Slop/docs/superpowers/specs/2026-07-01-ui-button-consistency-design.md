# UI Button Consistency — Design Spec

**Date:** 2026-07-01
**Status:** Approved (design), pending spec review
**Branch (planned):** `feat/ui-button-consistency`

## Problem

The menu and pause button sprites were generated independently by PixelLab, so
they don't share a visual language: plate styles differ (solid dark plate vs
corner-bracket outline vs glow-only), and the normal↔focus relationship is
inconsistent per button (one focus state even read *dimmer* than its normal
state — caught in the pause-menu visual verify). Jael flagged the set as "pas
raccord". Root cause: **each button — and each label — is a separately generated
sprite with baked-in text.**

## Goal

Every button in the game (main menu, pause overlay, game-over) shares one
consistent visual language across all states (normal / focus / disabled), so the
UI reads as a single coherent set.

## Core Approach

**One reusable empty plate + canvas-drawn label.**

Instead of ~15 label-baked sprites, use a small set of **empty** plate sprites
(no text) reused for every button. The label is drawn on top in canvas using a
pixel font. Because every button uses the exact same plate art and the same text
renderer, consistency is guaranteed by construction, not by luck.

The button data model already carries `label` fields (`menu.js` / `pause.js`) —
currently unused for rendering because text was baked into sprites. This design
puts them to use.

## Assets

- **`btn-plate.png`** — empty rounded-rectangle neon plate, 200×56, synthwave
  palette (cyan `#3ef0ff` border, dark navy `#0a0a14`-ish fill, transparent bg).
  Normal state.
- **`btn-plate-focus.png`** — same plate shape, brighter cyan border + inner
  glow. Focus/selected state.
- Both generated once via PixelLab (`scripts/pixellab.mjs`), no text. Candidates
  reviewed by eye; the pair must share the same shape and read normal-dim →
  focus-bright.
- **Disabled** state uses **no** dedicated sprite: draw `btn-plate` at reduced
  alpha (~0.4) with grey label text.
- **Remove** the now-unused label-baked sprites: `btn-newgame`,
  `btn-newgame-focus`, `btn-newgame-disabled`, `btn-continue`,
  `btn-continue-focus`, `btn-continue-disabled`, `btn-options`,
  `btn-options-focus`, `btn-options-disabled`, `btn-resume`, `btn-resume-focus`,
  `btn-restart`, `btn-restart-focus`, `btn-menu`, `btn-menu-focus`.

## Font

- **Press Start 2P** (SIL OFL 1.1, free) — the classic blocky arcade pixel font,
  matches the pixel-art logo and synthwave aesthetic.
- Fetched as a `.ttf` from the Google Fonts GitHub repo into `assets/` (a static
  asset, **not** a runtime npm dependency — the zero-runtime-deps constraint
  holds).
- Loaded via the `FontFace` API before the first render, gated alongside images.

## Components

### `src/engine/font.js` (new)
- `loadFont(family, url) → Promise<void>` — wraps `new FontFace(family, url(...))`,
  calls `.load()`, adds the result to `document.fonts`, resolves when ready.
- Isolated so `main.js` can `Promise.all([loadImages(...), loadFont(...)])` before
  starting the loop. Depends only on the DOM `FontFace` API.

### `src/render/buttons.js` (rewritten)
- **`fitFontSize(ctx, text, maxWidth, maxSize, minSize) → number`** — pure-ish
  helper: returns the largest integer font size ≤ `maxSize` (down to `minSize`)
  whose `ctx.measureText(text).width` fits within `maxWidth`. Guarantees no label
  overflows its plate regardless of length. Testable with a fake `measureText`.
- **`plateKey(button, focused) → string`** — returns `'btn-plate-focus'` when the
  button is the focused one, else `'btn-plate'` (disabled still uses `'btn-plate'`).
- **`drawButton(ctx, rect, label, state, assets)`** — the single button primitive:
  1. If `state === 'disabled'`, set `ctx.globalAlpha` (saved/restored) to the dim
     value; draw `btn-plate`. Otherwise draw the state's plate (`btn-plate` or
     `btn-plate-focus`).
  2. Set the pixel font at `fitFontSize(...)`, `textAlign='center'`,
     `textBaseline='middle'`; `fillStyle` = white (enabled) / grey (disabled);
     `fillText(label, cx, cy)` centered in the rect.
  - `state` is one of `'normal' | 'focus' | 'disabled'`.
- **`drawButtons(ctx, menuObj, assets)`** — for each button, derive its state from
  `enabled` + focus and call `drawButton`. Same public signature as today, so
  `menu.js` and `pause.js` need no change.

### `src/render/renderer.js`
- The game-over MENU button switches from
  `ctx.drawImage(assets['btn-menu'], ...)` to
  `drawButton(ctx, CONFIG.GAMEOVER_MENU_BTN, 'MENU', 'normal', assets)` — now
  unified with the rest of the set.

### `src/main.js`
- Remove the 15 label-baked sprite imports and their `loadImages` keys.
- Add imports for `btn-plate`, `btn-plate-focus`, and the font `.ttf` URL.
- Gate the loop on both images and the font:
  `Promise.all([loadImages({...}), loadFont('PressStart2P', fontUrl)]).then(([assets]) => { ... })`.

### `src/config.js`
- Add button text constants, e.g. `BTN_FONT_FAMILY: 'PressStart2P'`,
  `BTN_FONT_MAX: 18`, `BTN_FONT_MIN: 8`, `BTN_TEXT_PAD: 16`,
  `BTN_DISABLED_ALPHA: 0.4`, colours `BTN_TEXT: '#ffffff'`,
  `BTN_TEXT_DISABLED: '#8a94a6'`.

### `menu.js` / `pause.js`
- Unchanged (they already expose `buttons` with `id`/`label`/`enabled` and call
  `drawButtons`). Restart keeps label `RECOMMENCER` — canvas auto-fit renders it
  without cramping, so the earlier `REJOUER` fallback is no longer needed.

## Data Flow

`world.menu` / `world.pause` (buttons with `label`/`enabled`/rect + `focus`) →
`drawButtons` → per-button `drawButton(rect, label, state, assets)` →
plate `drawImage` + auto-fit pixel-font `fillText`. Font ensured ready at startup
via `loadFont`. No state-machine or input changes.

## Testing

- **`fitFontSize`** — pure logic: with a fake ctx whose `measureText` returns
  `text.length * size * k`, assert it shrinks to fit `maxWidth` and clamps at
  `minSize`/`maxSize`.
- **`drawButton` / `drawButtons`** — fake ctx recording `drawImage` + `fillText`:
  - focused button draws `btn-plate-focus`; others draw `btn-plate`.
  - disabled button draws `btn-plate` and sets the disabled alpha + grey text.
  - every button emits a `fillText` with its label.
- **Update existing render tests** (`tests/render/pause.test.js`,
  `tests/render/menu.test.js`): expected keys change from per-label sprites to
  `btn-plate` / `btn-plate-focus`; fake ctx must provide `measureText`,
  `textBaseline`, `globalAlpha`, `save`/`restore`.
- **Font loading** — DOM-dependent (`FontFace`); no unit test, covered by the
  Playwright visual verify.

## Out of Scope

- The logo, the ⏸ HUD icon (already canvas-drawn, consistent), gameplay, audio,
  save system, and the Options screen.
- No new npm runtime dependencies (font is a static asset).

## Verification

- All Vitest suites pass; `npm run build` succeeds.
- Playwright visual verify (real browser) before merge: menu, pause overlay
  (each button state), and game-over button all render with one consistent plate
  style and legible pixel-font labels; focus is always the brightest state.

## Merge

- Branch `feat/ui-button-consistency`, merge to `main` with `--no-ff` (repo
  convention). Do not push unless Jael asks. Visual verify required before merge.
