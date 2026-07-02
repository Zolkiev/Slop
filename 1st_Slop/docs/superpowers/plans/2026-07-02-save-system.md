# Save System (Continue + code de sauvegarde) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the CONTINUE menu button (resume at best level reached) and make progression portable beyond browser storage via a retro save code (`JB1-XXXX`, Crockford base32 + checksum) shown/entered on a new SAVECODE screen, plus a `#save=` URL restore.

**Architecture:** A pure `src/game/save.js` module encodes/decodes the save code. `applySave` in `score.js` applies a restored level with a never-regress max rule. The menu gains a 4th CODE button and `createMenu(hasSave)`; a new `SAVECODE` state (same state machine) hosts the code screen built from the existing menu factory + `drawButtons`. The only DOM addition is an isolated input overlay (`src/ui/codeinput.js`) for typing codes (mobile keyboard); `main.js` bridges world events (`codeentry`/`copycode`/`copylink`) to that overlay and the clipboard, and applies `#save=` codes at boot.

**Tech Stack:** Vanilla JS (ES modules), Canvas 2D, Vitest (node environment — no jsdom; DOM code takes an injectable `doc`). Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-07-02-save-system-design.md`

## Global Constraints

- Zero runtime dependencies (vanilla JS + Canvas 2D only).
- Game logic stays pure and DOM-free in `src/game/`; rendering in `src/render/`; the DOM overlay lives only in `src/ui/codeinput.js` and `main.js`.
- Test names in French, matching existing suites. Run `npx vitest run` from `1st_Slop/`; all green after every task.
- Save code format: `JB1-` prefix + payload (bestLevel in Crockford base32, alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ`) + 2 checksum chars. Decode tolerates lowercase, spaces, hyphens, and maps I/L→1, O→0.
- Restore rule: `max(local bestLevel, code bestLevel)` — never regress.
- Button labels UPPERCASE French: `CODE`, `COPIER`, `LIEN`, `SAISIR`, `RETOUR`.
- NEW GAME never touches the save.
- UI copy: feedback `COPIÉ !` / `LIEN COPIÉ !`, error `CODE INVALIDE`, empty state `PAS DE SAUVEGARDE`, screen title `SAUVEGARDE`.

---

### Task 1: Pure save-code module (`save.js`)

**Files:**
- Create: `src/game/save.js`
- Test: `tests/game/save.test.js`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces: `encodeSave({ bestLevel: number }) → string` (e.g. `JB1-137`), `decodeSave(raw: string) → { bestLevel: number } | null`. Task 4's `submitSaveCode` and Task 7's boot restore rely on exactly these names.

- [ ] **Step 1: Write the failing tests**

Create `tests/game/save.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { encodeSave, decodeSave } from '../../src/game/save.js';

describe('save code', () => {
  it('round-trip encode/decode pour plusieurs niveaux', () => {
    for (const bestLevel of [1, 7, 42, 1000]) {
      const code = encodeSave({ bestLevel });
      expect(code).toMatch(/^JB1-[0-9A-HJKMNP-TV-Z]+$/);
      expect(decodeSave(code)).toEqual({ bestLevel });
    }
  });

  it('la normalisation tolère minuscules, espaces et tirets', () => {
    const code = encodeSave({ bestLevel: 7 });
    const sloppy = ` ${code.toLowerCase().replace('-', ' - ')} `;
    expect(decodeSave(sloppy)).toEqual({ bestLevel: 7 });
  });

  it('mappe les caractères ambigus O->0 et I/L->1', () => {
    const code = encodeSave({ bestLevel: 7 });
    const swapped = code.replace(/0/g, 'O').replace(/1/g, 'I');
    expect(decodeSave(swapped)).toEqual({ bestLevel: 7 });
  });

  it('rejette un caractère altéré (checksum)', () => {
    const code = encodeSave({ bestLevel: 42 });
    const body = code.slice(4); // après "JB1-"
    const altered = `JB1-${body[0] === 'A' ? 'B' : 'A'}${body.slice(1)}`;
    expect(decodeSave(altered)).toBe(null);
  });

  it('rejette préfixe inconnu, version inconnue, vide, alphabet invalide, trop court', () => {
    expect(decodeSave('XX1-2345')).toBe(null);
    expect(decodeSave('JB2-2345')).toBe(null);
    expect(decodeSave('')).toBe(null);
    expect(decodeSave('JB1-@!')).toBe(null);
    expect(decodeSave('JB1-AB')).toBe(null); // 2 chars = checksum seul, payload vide
    expect(decodeSave(undefined)).toBe(null);
  });

  it('rejette bestLevel 0 (payload "0" + checksum valide)', () => {
    // Construit un code pour 0 à la main via l'encodeur puis vérifie le rejet
    const forged = encodeSave({ bestLevel: 0 });
    expect(decodeSave(forged)).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/game/save.test.js`
Expected: FAIL — cannot resolve `../../src/game/save.js`.

- [ ] **Step 3: Write the implementation**

Create `src/game/save.js`:

```js
// Code de sauvegarde rétro : JB1-<payload><checksum>
// Payload = bestLevel en base32 Crockford ; checksum 2 caractères anti-typo.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PREFIX = 'JB1';

function toBase32(n) {
  let s = '';
  do {
    s = ALPHABET[n % 32] + s;
    n = Math.floor(n / 32);
  } while (n > 0);
  return s;
}

function checksum(payload) {
  let sum = 0;
  for (let i = 0; i < payload.length; i += 1) {
    sum += (i + 1) * ALPHABET.indexOf(payload[i]);
  }
  const v = sum % 1024;
  return ALPHABET[Math.floor(v / 32)] + ALPHABET[v % 32];
}

export function encodeSave({ bestLevel }) {
  const payload = toBase32(bestLevel);
  return `${PREFIX}-${payload}${checksum(payload)}`;
}

export function decodeSave(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
  if (!cleaned.startsWith(PREFIX)) return null;
  const body = cleaned.slice(PREFIX.length);
  if (body.length < 3) return null; // payload >= 1 char + 2 chars de checksum
  const payload = body.slice(0, -2);
  for (const ch of payload) {
    if (ALPHABET.indexOf(ch) < 0) return null;
  }
  if (body.slice(-2) !== checksum(payload)) return null;
  let bestLevel = 0;
  for (const ch of payload) bestLevel = bestLevel * 32 + ALPHABET.indexOf(ch);
  if (bestLevel < 1) return null;
  return { bestLevel };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/save.js tests/game/save.test.js
git commit -m "feat(save): retro save code encode/decode (Crockford base32 + checksum)"
```

---

### Task 2: `applySave` (never-regress restore) in `score.js`

**Files:**
- Modify: `src/game/score.js`
- Test: `tests/game/score.test.js`

**Interfaces:**
- Consumes: existing `KEY = 'jetpackbot.bestLevel'` module constant and `score` shape `{ bestLevel }`.
- Produces: `applySave(score, bestLevel: number, storage) → score` — sets `score.bestLevel = max(score.bestLevel, bestLevel)`, persists via `storage.setItem` only when it changed. `finalizeLevel` is refactored to delegate to it (same behaviour as today). Tasks 4 and 7 call `applySave`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/game/score.test.js` (import `applySave` alongside the existing imports from `../../src/game/score.js`):

```js
describe('applySave', () => {
  function fakeStorage() {
    const d = {};
    return {
      getItem: (k) => d[k] ?? null,
      setItem: (k, v) => { d[k] = String(v); },
      data: d,
    };
  }

  it('prend le niveau restauré quand il est meilleur et persiste', () => {
    const storage = fakeStorage();
    const score = { bestLevel: 2 };
    applySave(score, 5, storage);
    expect(score.bestLevel).toBe(5);
    expect(storage.getItem('jetpackbot.bestLevel')).toBe('5');
  });

  it('ne régresse jamais et ne persiste pas si rien ne change', () => {
    const storage = fakeStorage();
    const score = { bestLevel: 7 };
    applySave(score, 3, storage);
    expect(score.bestLevel).toBe(7);
    expect(storage.getItem('jetpackbot.bestLevel')).toBe(null);
  });

  it('tolère un storage absent', () => {
    const score = { bestLevel: 1 };
    expect(() => applySave(score, 4, undefined)).not.toThrow();
    expect(score.bestLevel).toBe(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/game/score.test.js`
Expected: FAIL — `applySave is not a function` (import error).

- [ ] **Step 3: Write the implementation**

In `src/game/score.js`, add `applySave` and refactor `finalizeLevel` to delegate (DRY — identical semantics):

```js
export function applySave(score, bestLevel, storage) {
  if (bestLevel > score.bestLevel) {
    score.bestLevel = bestLevel;
    storage?.setItem(KEY, String(bestLevel));
  }
  return score;
}

export function finalizeLevel(score, level, storage) {
  return applySave(score, level, storage);
}
```

(The old `finalizeLevel` body is replaced by the delegation; existing tests must stay green.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/score.js tests/game/score.test.js
git commit -m "feat(save): applySave — never-regress restore, finalizeLevel delegates"
```

---

### Task 3: SAVECODE state + menu factories (CODE button, `createMenu(hasSave)`)

**Files:**
- Modify: `src/engine/state.js`
- Modify: `src/game/menu.js`
- Modify: `src/config.js:33` (`MENU_BTN`) + add `SAVECODE_BTN`
- Test: `tests/engine/state.test.js`, `tests/game/menu.test.js`

**Interfaces:**
- Consumes: private `build(defs, geom)` factory in `src/game/menu.js`.
- Produces: `States.SAVECODE = 'savecode'` with transitions `MENU → SAVECODE → MENU`. `createMenu(hasSave = false)` → 4 buttons `newgame` / `continue` (enabled: hasSave) / `options` (disabled) / `code` (enabled, label `CODE`). `createSavecodeMenu(hasSave)` → 4 buttons `copy`/`COPIER` (enabled: hasSave), `link`/`LIEN` (enabled: hasSave), `enter`/`SAISIR` (enabled), `back`/`RETOUR` (enabled). `CONFIG.MENU_BTN = { x: 80, w: 200, h: 56, y0: 330, gap: 66 }` (tightened so 4 buttons clear the Best text at y 600), `CONFIG.SAVECODE_BTN = { x: 80, w: 200, h: 56, y0: 280, gap: 66 }`. Task 4 consumes all of these.

- [ ] **Step 1: Update existing tests + write failing tests**

In `tests/engine/state.test.js`, add:

```js
  it('MENU <-> SAVECODE (aller-retour), SAVECODE ne va pas en PLAY', () => {
    const sm = createStateMachine();
    expect(sm.can(States.SAVECODE)).toBe(true);
    sm.to(States.SAVECODE);
    expect(sm.can(States.PLAY)).toBe(false);
    expect(sm.can(States.MENU)).toBe(true);
    sm.to(States.MENU);
    expect(sm.get()).toBe(States.MENU);
  });
```

In `tests/game/menu.test.js`:

Replace the test `createMenu: 3 boutons ordonnés, newgame enabled, autres disabled, focus sur newgame` with:

```js
  it('createMenu: 4 boutons ordonnés, continue/options disabled par défaut, focus newgame', () => {
    const m = createMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['newgame', 'continue', 'options', 'code']);
    expect(m.buttons.map((b) => b.enabled)).toEqual([true, false, false, true]);
    expect(m.buttons[3].label).toBe('CODE');
    expect(focusedId(m)).toBe('newgame');
  });

  it('createMenu(true): continue enabled', () => {
    const m = createMenu(true);
    expect(m.buttons[1].enabled).toBe(true);
  });
```

Replace the test `moveFocus saute les boutons disabled et reste sur le seul enabled` with:

```js
  it('moveFocus saute continue/options (disabled) et va sur code', () => {
    const m = createMenu();
    moveFocus(m, 1);
    expect(focusedId(m)).toBe('code');
    moveFocus(m, -1);
    expect(focusedId(m)).toBe('newgame');
  });
```

Replace the test `moveFocus parcourt tout quand tout est enabled` with:

```js
  it('moveFocus parcourt tout quand tout est enabled', () => {
    const m = createMenu(true);
    m.buttons.forEach((b) => { b.enabled = true; });
    expect(focusedId(m)).toBe('newgame');
    moveFocus(m, 1); expect(focusedId(m)).toBe('continue');
    moveFocus(m, 1); expect(focusedId(m)).toBe('options');
    moveFocus(m, 1); expect(focusedId(m)).toBe('code');
    moveFocus(m, 1); expect(focusedId(m)).toBe('newgame');
    moveFocus(m, -1); expect(focusedId(m)).toBe('code');
  });
```

Add (import `createSavecodeMenu` in the existing import line):

```js
  it('createSavecodeMenu(true): copier/lien/saisir/retour tous enabled, focus copier', () => {
    const m = createSavecodeMenu(true);
    expect(m.buttons.map((b) => b.id)).toEqual(['copy', 'link', 'enter', 'back']);
    expect(m.buttons.map((b) => b.label)).toEqual(['COPIER', 'LIEN', 'SAISIR', 'RETOUR']);
    expect(m.buttons.every((b) => b.enabled)).toBe(true);
    expect(focusedId(m)).toBe('copy');
  });

  it('createSavecodeMenu(false): copier/lien disabled, focus saisir', () => {
    const m = createSavecodeMenu(false);
    expect(m.buttons.map((b) => b.enabled)).toEqual([false, false, true, true]);
    expect(focusedId(m)).toBe('enter');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/state.test.js tests/game/menu.test.js`
Expected: FAIL — `States.SAVECODE` undefined; `createSavecodeMenu` not exported; createMenu still 3 buttons.

- [ ] **Step 3: Write the implementation**

`src/engine/state.js` — add the state and transitions:

```js
export const States = {
  MENU: 'menu', PLAY: 'play', GAMEOVER: 'gameover', LEVEL_COMPLETE: 'levelcomplete',
  PAUSE: 'pause', SAVECODE: 'savecode',
};

const TRANSITIONS = {
  [States.MENU]: [States.PLAY, States.SAVECODE],
  [States.PLAY]: [States.GAMEOVER, States.LEVEL_COMPLETE, States.PAUSE],
  [States.GAMEOVER]: [States.PLAY, States.MENU],
  [States.LEVEL_COMPLETE]: [States.PLAY],
  [States.PAUSE]: [States.PLAY, States.MENU],
  [States.SAVECODE]: [States.MENU],
};
```

`src/config.js` — replace `MENU_BTN` and add `SAVECODE_BTN` below `GAMEOVER_BTN`:

```js
  MENU_BTN: { x: 80, w: 200, h: 56, y0: 330, gap: 66 },
```

```js
  SAVECODE_BTN: { x: 80, w: 200, h: 56, y0: 280, gap: 66 },
```

`src/game/menu.js` — update `createMenu`, add `createSavecodeMenu`:

```js
export function createMenu(hasSave = false) {
  return build([
    { id: 'newgame', label: 'NEW GAME', enabled: true },
    { id: 'continue', label: 'CONTINUE', enabled: hasSave },
    { id: 'options', label: 'OPTIONS', enabled: false },
    { id: 'code', label: 'CODE', enabled: true },
  ], CONFIG.MENU_BTN);
}

export function createSavecodeMenu(hasSave) {
  return build([
    { id: 'copy', label: 'COPIER', enabled: hasSave },
    { id: 'link', label: 'LIEN', enabled: hasSave },
    { id: 'enter', label: 'SAISIR', enabled: true },
    { id: 'back', label: 'RETOUR', enabled: true },
  ], CONFIG.SAVECODE_BTN);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS (render/menu tests use `arrayContaining` and default `createMenu()` — unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/engine/state.js src/game/menu.js src/config.js tests/engine/state.test.js tests/game/menu.test.js
git commit -m "feat(save): SAVECODE state, CODE menu button, createMenu(hasSave), savecode menu factory"
```

---

### Task 4: Savecode screen logic + world wiring

**Files:**
- Create: `src/game/savecode.js`
- Modify: `src/game/world.js`
- Test: `tests/game/savecode.test.js`, `tests/game/world.test.js`

**Interfaces:**
- Consumes: `encodeSave`/`decodeSave` (Task 1), `applySave` (Task 2), `createMenu(hasSave)`/`createSavecodeMenu(hasSave)`/`States.SAVECODE` (Task 3).
- Produces:
  - `createSavecode(score) → { code: string | null, menu, feedbackText: string | null, feedbackUntil: number }` (`code` null when `score.bestLevel < 1`).
  - `setFeedback(sc, text, tick, duration = 90)` — sets `feedbackText`/`feedbackUntil = tick + duration`.
  - `world.savecode` (created in `createWorld`, recreated when entering SAVECODE).
  - `toMenu(world)` — recreates `world.menu = createMenu(world.score.bestLevel >= 1)` then transitions to MENU. ALL transitions to MENU go through it.
  - `press` routing: MENU `continue` → `startLevel(world, world.score.bestLevel)` + PLAY; MENU `code` → recreate `world.savecode` + SAVECODE; SAVECODE `copy`/`link` → push event `copycode`/`copylink` + feedback `COPIÉ !`/`LIEN COPIÉ !`; `enter` → push event `codeentry`; `back` → `toMenu`.
  - `navMenu` and `escapeAction` handle SAVECODE.
  - `submitSaveCode(world, text) → boolean` — decode, `applySave`, `toMenu` on success; false (no state change) on invalid.
  - Task 5 renders `world.savecode`; Task 7 calls `submitSaveCode` and consumes the three events.

- [ ] **Step 1: Write the failing tests**

Create `tests/game/savecode.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createSavecode, setFeedback } from '../../src/game/savecode.js';
import { encodeSave } from '../../src/game/save.js';
import { focusedId } from '../../src/game/menu.js';

describe('savecode screen state', () => {
  it('avec save: code encodé, copier/lien enabled, focus copier', () => {
    const sc = createSavecode({ bestLevel: 7 });
    expect(sc.code).toBe(encodeSave({ bestLevel: 7 }));
    expect(sc.menu.buttons.map((b) => b.enabled)).toEqual([true, true, true, true]);
    expect(focusedId(sc.menu)).toBe('copy');
    expect(sc.feedbackText).toBe(null);
  });

  it('sans save: code null, copier/lien disabled, focus saisir', () => {
    const sc = createSavecode({ bestLevel: 0 });
    expect(sc.code).toBe(null);
    expect(sc.menu.buttons.map((b) => b.enabled)).toEqual([false, false, true, true]);
    expect(focusedId(sc.menu)).toBe('enter');
  });

  it('setFeedback pose le texte et l\'échéance', () => {
    const sc = createSavecode({ bestLevel: 1 });
    setFeedback(sc, 'COPIÉ !', 100);
    expect(sc.feedbackText).toBe('COPIÉ !');
    expect(sc.feedbackUntil).toBe(190);
  });
});
```

Add to `tests/game/world.test.js` — import `submitSaveCode` in the world import line, `encodeSave` from `../../src/game/save.js`, then a new describe block:

```js
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
      const b = w.menu.buttons[3];
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.SAVECODE);
      expect(w.savecode.code).toBe(encodeSave({ bestLevel: 3 }));
    });

    it('SAVECODE: COPIER pousse copycode + feedback', () => {
      const w = createWorld(storageWithBest(3));
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
      const b = w.savecode.menu.buttons[0];
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.events).toContain('copycode');
      expect(w.savecode.feedbackText).toBe('COPIÉ !');
    });

    it('SAVECODE: LIEN pousse copylink, SAISIR pousse codeentry', () => {
      const w = createWorld(storageWithBest(3));
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
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
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
      const back = w.savecode.menu.buttons[3];
      press(w, { x: back.x + 1, y: back.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
      escapeAction(w);
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('navMenu agit en SAVECODE', () => {
      const w = createWorld(storageWithBest(3));
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
      const before = w.savecode.menu.focus;
      navMenu(w, 1);
      expect(w.savecode.menu.focus).not.toBe(before);
    });

    it('submitSaveCode valide: applique le max, recrée le menu, retourne au MENU', () => {
      const storage = fakeStorage();
      const w = createWorld(storage);
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
      const ok = submitSaveCode(w, encodeSave({ bestLevel: 9 }));
      expect(ok).toBe(true);
      expect(w.sm.get()).toBe(States.MENU);
      expect(w.score.bestLevel).toBe(9);
      expect(w.menu.buttons[1].enabled).toBe(true);
      expect(storage.getItem('jetpackbot.bestLevel')).toBe('9');
    });

    it('submitSaveCode invalide: false, reste en SAVECODE, score intact', () => {
      const w = createWorld(storageWithBest(4));
      press(w, { x: w.menu.buttons[3].x + 1, y: w.menu.buttons[3].y + 1 });
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/game/savecode.test.js tests/game/world.test.js`
Expected: FAIL — `src/game/savecode.js` missing; `submitSaveCode` not exported; `w.savecode` undefined; CONTINUE routing absent.

- [ ] **Step 3: Write the implementation**

Create `src/game/savecode.js`:

```js
import { createSavecodeMenu } from './menu.js';
import { encodeSave } from './save.js';

export function createSavecode(score) {
  const code = score.bestLevel >= 1 ? encodeSave({ bestLevel: score.bestLevel }) : null;
  return { code, menu: createSavecodeMenu(code !== null), feedbackText: null, feedbackUntil: 0 };
}

export function setFeedback(sc, text, tick, duration = 90) {
  sc.feedbackText = text;
  sc.feedbackUntil = tick + duration;
}
```

In `src/game/world.js`:

1. Imports — extend the existing lines:

```js
import { createScore, checkPass, finalizeLevel, applySave } from './score.js';
import { createMenu, createPauseMenu, createGameoverMenu, hitTest, activate, moveFocus, inRect } from './menu.js';
import { createSavecode, setFeedback } from './savecode.js';
import { decodeSave } from './save.js';
```

2. `createWorld` — create the score first, derive menu and savecode from it (replace the `menu:` and `score:` fields):

```js
export function createWorld(storage) {
  const score = createScore(storage);
  return {
    sm: createStateMachine(States.MENU),
    menu: createMenu(score.bestLevel >= 1),
    pause: createPauseMenu(),
    gameover: createGameoverMenu(),
    savecode: createSavecode(score),
    menuTick: 0,
    robot: createRobot(),
    obstacles: [],
    score,
    // ... (rest of the object unchanged)
  };
}
```

3. Add `toMenu` (below `startLevel`) and route ALL returns to MENU through it:

```js
export function toMenu(world) {
  world.menu = createMenu(world.score.bestLevel >= 1);
  world.sm.to(States.MENU);
}
```

Replace `world.sm.to(States.MENU);` with `toMenu(world);` in: the PAUSE `menu` branch of `press`, the GAMEOVER `menu` branch of `press`, and the GAMEOVER branch of `escapeAction`.

4. `press` MENU branch becomes:

```js
  if (state === States.MENU) {
    const id = pointer ? hitTest(world.menu, pointer.x, pointer.y) : activate(world.menu);
    if (id === 'newgame') {
      startLevel(world, 1);
      world.sm.to(States.PLAY);
    } else if (id === 'continue') {
      startLevel(world, world.score.bestLevel);
      world.sm.to(States.PLAY);
    } else if (id === 'code') {
      world.savecode = createSavecode(world.score);
      world.sm.to(States.SAVECODE);
    }
    // 'options' (stub) et null → no-op
  }
```

5. Add a SAVECODE branch to `press` (after the GAMEOVER branch):

```js
  } else if (state === States.SAVECODE) {
    const sc = world.savecode;
    const id = pointer ? hitTest(sc.menu, pointer.x, pointer.y) : activate(sc.menu);
    if (id === 'copy') {
      world.events.push('copycode');
      setFeedback(sc, 'COPIÉ !', world.menuTick);
    } else if (id === 'link') {
      world.events.push('copylink');
      setFeedback(sc, 'LIEN COPIÉ !', world.menuTick);
    } else if (id === 'enter') {
      world.events.push('codeentry');
    } else if (id === 'back') {
      toMenu(world);
    }
  }
```

6. `navMenu` and `escapeAction` gain SAVECODE branches:

```js
export function navMenu(world, dir) {
  const s = world.sm.get();
  if (s === States.MENU) moveFocus(world.menu, dir);
  else if (s === States.PAUSE) moveFocus(world.pause, dir);
  else if (s === States.GAMEOVER) moveFocus(world.gameover, dir);
  else if (s === States.SAVECODE) moveFocus(world.savecode.menu, dir);
}

export function escapeAction(world) {
  const s = world.sm.get();
  if (s === States.PLAY) world.sm.to(States.PAUSE);
  else if (s === States.PAUSE) world.sm.to(States.PLAY);
  else if (s === States.GAMEOVER) toMenu(world);
  else if (s === States.SAVECODE) toMenu(world);
}
```

7. Add `submitSaveCode` (below `escapeAction`):

```js
export function submitSaveCode(world, text) {
  const decoded = decodeSave(text);
  if (!decoded) return false;
  applySave(world.score, decoded.bestLevel, world.storage);
  toMenu(world);
  return true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/savecode.js src/game/world.js tests/game/savecode.test.js tests/game/world.test.js
git commit -m "feat(save): SAVECODE screen state, CONTINUE routing, submitSaveCode, toMenu recreation"
```

---

### Task 5: SAVECODE rendering

**Files:**
- Create: `src/render/savecode.js`
- Modify: `src/render/renderer.js` (import + SAVECODE branch + hide robot in SAVECODE)
- Modify: `src/config.js` (three Y constants)
- Test: `tests/render/savecode.test.js`

**Interfaces:**
- Consumes: `world.savecode` shape from Task 4 (`{ code, menu, feedbackText, feedbackUntil }`), `world.menuTick`, `drawButtons`/`fitFontSize` from `src/render/buttons.js`.
- Produces: `renderSavecode(ctx, world, assets)`; renderer dispatches to it on `States.SAVECODE`.

- [ ] **Step 1: Write the failing tests**

Create `tests/render/savecode.test.js` (fakes copied from the existing render test pattern):

```js
import { describe, it, expect, vi } from 'vitest';
import { renderSavecode } from '../../src/render/savecode.js';
import { createSavecode, setFeedback } from '../../src/game/savecode.js';

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

describe('renderSavecode', () => {
  it('avec save: titre, code, 4 labels de boutons', () => {
    const ctx = fakeCtx();
    const world = { savecode: createSavecode({ bestLevel: 7 }), menuTick: 0 };
    renderSavecode(ctx, world, fakeAssets());
    expect(ctx.texts[0]).toBe('SAUVEGARDE');
    expect(ctx.texts).toContain(world.savecode.code);
    expect(ctx.texts).toEqual(expect.arrayContaining(['COPIER', 'LIEN', 'SAISIR', 'RETOUR']));
  });

  it('sans save: PAS DE SAUVEGARDE affiché', () => {
    const ctx = fakeCtx();
    const world = { savecode: createSavecode({ bestLevel: 0 }), menuTick: 0 };
    renderSavecode(ctx, world, fakeAssets());
    expect(ctx.texts).toContain('PAS DE SAUVEGARDE');
  });

  it('feedback affiché tant que menuTick < feedbackUntil, puis disparaît', () => {
    const ctx1 = fakeCtx();
    const world = { savecode: createSavecode({ bestLevel: 7 }), menuTick: 10 };
    setFeedback(world.savecode, 'COPIÉ !', 10);
    renderSavecode(ctx1, world, fakeAssets());
    expect(ctx1.texts).toContain('COPIÉ !');
    const ctx2 = fakeCtx();
    world.menuTick = 200;
    renderSavecode(ctx2, world, fakeAssets());
    expect(ctx2.texts).not.toContain('COPIÉ !');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/render/savecode.test.js`
Expected: FAIL — cannot resolve `../../src/render/savecode.js`.

- [ ] **Step 3: Write the implementation**

`src/config.js` — add below `SAVECODE_BTN`:

```js
  SAVECODE_TITLE_Y: 120,
  SAVECODE_CODE_Y: 190,
  SAVECODE_MSG_Y: 235,
```

Create `src/render/savecode.js`:

```js
import { CONFIG } from '../config.js';
import { drawButtons, fitFontSize } from './buttons.js';

export function renderSavecode(ctx, world, assets) {
  // Voile sombre par-dessus le parallax (comme la pause)
  ctx.fillStyle = 'rgba(10,10,20,0.7)';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('SAUVEGARDE', CONFIG.WIDTH / 2, CONFIG.SAVECODE_TITLE_Y);

  const sc = world.savecode;
  const text = sc.code ?? 'PAS DE SAUVEGARDE';
  const size = fitFontSize(ctx, text, CONFIG.WIDTH - 40, 24, CONFIG.BTN_FONT_MIN);
  ctx.font = `${size}px ${CONFIG.BTN_FONT_FAMILY}`;
  ctx.fillStyle = sc.code ? '#3ef0ff' : '#8a94a6';
  ctx.fillText(text, CONFIG.WIDTH / 2, CONFIG.SAVECODE_CODE_Y);

  if (sc.feedbackText && world.menuTick < sc.feedbackUntil) {
    ctx.fillStyle = '#3ef0ff';
    ctx.font = '14px system-ui';
    ctx.fillText(sc.feedbackText, CONFIG.WIDTH / 2, CONFIG.SAVECODE_MSG_Y);
  }

  drawButtons(ctx, sc.menu, assets);
}
```

`src/render/renderer.js`:

1. Add the import: `import { renderSavecode } from './savecode.js';`
2. Hide the robot on the savecode screen — the robot block currently reads:

```js
  if (world.sm.get() !== States.MENU) {
```

Replace with:

```js
  const hudState = world.sm.get();
  if (hudState !== States.MENU && hudState !== States.SAVECODE) {
```

3. Add the dispatch branch after the PAUSE branch:

```js
  } else if (state === States.SAVECODE) {
    renderSavecode(ctx, world, assets);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/savecode.js src/render/renderer.js src/config.js tests/render/savecode.test.js
git commit -m "feat(render): SAVECODE screen (title, code, feedback, shared buttons)"
```

---

### Task 6: DOM code-input overlay (`ui/codeinput.js`)

**Files:**
- Create: `src/ui/codeinput.js`
- Test: `tests/ui/codeinput.test.js`

**Interfaces:**
- Consumes: an injectable `doc` (defaults to `document`; tests pass a fake).
- Produces: `createCodeInput(doc = document)` → `{ open({ value = '', message = '', onSubmit, onCancel }), close(), isOpen() }`. `onSubmit(text)` returns `true` to close, `false` to keep the overlay open showing `CODE INVALIDE`. All keydown events inside the overlay call `stopPropagation()` so the game's window listener never sees them. Task 7 wires it in `main.js`.

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/codeinput.test.js` (fake DOM — Vitest runs in node, no jsdom):

```js
import { describe, it, expect } from 'vitest';
import { createCodeInput } from '../../src/ui/codeinput.js';

function fakeElement(tag) {
  return {
    tag,
    style: {},
    children: [],
    listeners: {},
    value: '',
    textContent: '',
    focused: false,
    removed: false,
    setAttribute() {},
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    focus() { this.focused = true; },
    select() {},
    remove() { this.removed = true; },
  };
}

function fakeDoc() {
  const body = fakeElement('body');
  return {
    body,
    created: [],
    createElement(tag) {
      const el = fakeElement(tag);
      this.created.push(el);
      return el;
    },
  };
}

function find(doc, tag) {
  return doc.created.filter((e) => e.tag === tag);
}

function keyEvent(key) {
  return {
    key,
    stopped: false,
    prevented: false,
    stopPropagation() { this.stopped = true; },
    preventDefault() { this.prevented = true; },
  };
}

describe('codeinput overlay', () => {
  it('open monte l\'overlay, focus l\'input, porte message et valeur', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    ci.open({ value: 'JB1-XX', message: 'ENTRE TON CODE', onSubmit: () => true, onCancel: () => {} });
    expect(ci.isOpen()).toBe(true);
    expect(doc.body.children.length).toBe(1);
    const input = find(doc, 'input')[0];
    expect(input.value).toBe('JB1-XX');
    expect(input.focused).toBe(true);
  });

  it('Enter: submit true ferme l\'overlay', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    let got = null;
    ci.open({ onSubmit: (t) => { got = t; return true; }, onCancel: () => {} });
    const input = find(doc, 'input')[0];
    input.value = 'jb1-72';
    const e = keyEvent('Enter');
    input.listeners.keydown(e);
    expect(got).toBe('jb1-72');
    expect(ci.isOpen()).toBe(false);
    expect(e.stopped).toBe(true);
  });

  it('Enter: submit false garde l\'overlay et affiche CODE INVALIDE', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    ci.open({ onSubmit: () => false, onCancel: () => {} });
    const input = find(doc, 'input')[0];
    input.listeners.keydown(keyEvent('Enter'));
    expect(ci.isOpen()).toBe(true);
    const error = doc.created.find((e) => e.textContent === 'CODE INVALIDE');
    expect(error).toBeTruthy();
  });

  it('Escape annule et ferme', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    let cancelled = false;
    ci.open({ onSubmit: () => true, onCancel: () => { cancelled = true; } });
    const input = find(doc, 'input')[0];
    input.listeners.keydown(keyEvent('Escape'));
    expect(cancelled).toBe(true);
    expect(ci.isOpen()).toBe(false);
  });

  it('toute touche stoppe la propagation (le jeu ne la voit pas)', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    ci.open({ onSubmit: () => true, onCancel: () => {} });
    const input = find(doc, 'input')[0];
    const e = keyEvent('a');
    input.listeners.keydown(e);
    expect(e.stopped).toBe(true);
    expect(ci.isOpen()).toBe(true);
  });

  it('boutons OK / ANNULER cliquables', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    let got = null; let cancelled = false;
    ci.open({ onSubmit: (t) => { got = t; return true; }, onCancel: () => { cancelled = true; } });
    const [okBtn, cancelBtn] = find(doc, 'button');
    find(doc, 'input')[0].value = 'X';
    okBtn.listeners.click({ preventDefault() {} });
    expect(got).toBe('X');
    const ci2 = createCodeInput(doc);
    ci2.open({ onSubmit: () => true, onCancel: () => { cancelled = true; } });
    find(doc, 'button')[3].listeners.click({ preventDefault() {} });
    expect(cancelled).toBe(true);
  });

  it('rouvrir réinitialise erreur et valeur', () => {
    const doc = fakeDoc();
    const ci = createCodeInput(doc);
    ci.open({ onSubmit: () => false, onCancel: () => {} });
    const input = find(doc, 'input')[0];
    input.value = 'BAD';
    input.listeners.keydown(keyEvent('Enter')); // submit false -> erreur affichée
    input.listeners.keydown(keyEvent('Escape')); // annule, ferme
    ci.open({ onSubmit: () => true, onCancel: () => {} });
    expect(input.value).toBe('');
    // le module marque la ligne d'erreur (el.errorLine = true) pour la retrouver ici
    const errorEl = doc.created.find((e) => e.tag === 'div' && 'errorLine' in e);
    expect(errorEl.textContent).toBe('');
  });
});
```

This last test pins the reopen semantics: `open()` clears `input.value` (unless `value` is passed) and resets the error line to empty.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/ui/codeinput.test.js`
Expected: FAIL — cannot resolve `../../src/ui/codeinput.js`.

- [ ] **Step 3: Write the implementation**

Create `src/ui/codeinput.js`:

```js
// Overlay DOM isolé pour saisir/copier un code de sauvegarde.
// Seul module UI hors canvas — nécessaire pour le clavier mobile.
export function createCodeInput(doc = document) {
  let overlay = null;
  let messageEl = null;
  let input = null;
  let errorEl = null;
  let okBtn = null;
  let cancelBtn = null;
  let current = null; // { onSubmit, onCancel }

  function submit() {
    if (!current) return;
    if (current.onSubmit(input.value)) {
      close();
    } else {
      errorEl.textContent = 'CODE INVALIDE';
    }
  }

  function cancel() {
    if (!current) return;
    const cb = current.onCancel;
    close();
    cb();
  }

  function ensure() {
    if (overlay) return;
    overlay = doc.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10;display:flex;align-items:center;'
      + 'justify-content:center;background:rgba(10,10,20,0.85);';
    const box = doc.createElement('div');
    box.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;'
      + "font-family:'PressStart2P',monospace;";
    messageEl = doc.createElement('div');
    messageEl.style.cssText = 'color:#ffffff;font-size:12px;';
    input = doc.createElement('input');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    input.style.cssText = 'width:240px;padding:10px;font-family:inherit;font-size:14px;'
      + 'text-transform:uppercase;background:#0a0a14;color:#3ef0ff;border:2px solid #3ef0ff;'
      + 'outline:none;text-align:center;';
    errorEl = doc.createElement('div');
    errorEl.errorLine = true;
    errorEl.style.cssText = 'color:#ff2e88;font-size:10px;min-height:12px;';
    const row = doc.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;';
    const btnCss = 'padding:10px 18px;font-family:inherit;font-size:12px;cursor:pointer;'
      + 'background:#0a0a14;border:2px solid #3ef0ff;color:#ffffff;';
    okBtn = doc.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.cssText = btnCss;
    cancelBtn = doc.createElement('button');
    cancelBtn.textContent = 'ANNULER';
    cancelBtn.style.cssText = btnCss;

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    okBtn.addEventListener('click', (e) => { e.preventDefault(); submit(); });
    cancelBtn.addEventListener('click', (e) => { e.preventDefault(); cancel(); });

    row.appendChild(okBtn);
    row.appendChild(cancelBtn);
    box.appendChild(messageEl);
    box.appendChild(input);
    box.appendChild(errorEl);
    box.appendChild(row);
    overlay.appendChild(box);
  }

  function open({ value = '', message = '', onSubmit, onCancel = () => {} }) {
    ensure();
    current = { onSubmit, onCancel };
    messageEl.textContent = message;
    input.value = value;
    errorEl.textContent = '';
    overlay.style.display = 'flex';
    if (!overlay.mounted) {
      doc.body.appendChild(overlay);
      overlay.mounted = true;
    }
    input.focus();
    if (value) input.select();
  }

  function close() {
    if (!current) return;
    current = null;
    if (overlay) overlay.style.display = 'none';
  }

  return { open, close, isOpen: () => current !== null };
}
```

Adjust to the tests as needed — the tests are the contract (e.g. the tests create a second `createCodeInput` sharing the fake doc; each instance builds its own elements, which the `find()` index accounts for).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/codeinput.js tests/ui/codeinput.test.js
git commit -m "feat(ui): pixel-styled DOM overlay for save-code entry"
```

---

### Task 7: `main.js` wiring — URL restore, events, clipboard

**Files:**
- Modify: `src/main.js`

No unit test (entry point, no test file — project pattern). Verified by the full suite staying green, `npx vite build` succeeding, and Task 8's visual verify.

**Interfaces:**
- Consumes: `decodeSave` (Task 1), `createScore`/`applySave` (Task 2), `submitSaveCode` + events `codeentry`/`copycode`/`copylink` and `world.savecode.code` (Task 4), `createCodeInput` (Task 6).
- Produces: boot-time `#save=` restore; event bridge in the update loop.

- [ ] **Step 1: Apply the edits**

In `src/main.js`:

1. Extend imports:

```js
import { createWorld, press, navMenu, escapeAction, updateWorld, submitSaveCode } from './game/world.js';
import { decodeSave } from './game/save.js';
import { createScore, applySave } from './game/score.js';
import { createCodeInput } from './ui/codeinput.js';
```

2. Immediately BEFORE `const world = createWorld(window.localStorage);`, add the URL restore:

```js
// Restauration par lien de sauvegarde (#save=JB1-XXXX), avant la création du monde
const hashMatch = /[#&]save=([^&]+)/.exec(window.location.hash);
if (hashMatch) {
  const decoded = decodeSave(decodeURIComponent(hashMatch[1]));
  if (decoded) {
    applySave(createScore(window.localStorage), decoded.bestLevel, window.localStorage);
  } else {
    console.warn('Code de sauvegarde invalide dans l\'URL');
  }
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
```

3. After the `createInput(...)` line, add:

```js
const codeInput = createCodeInput(document);

function copyText(text) {
  const fallback = () => codeInput.open({
    value: text,
    message: 'COPIE MANUELLE (Ctrl+C)',
    onSubmit: () => true,
    onCancel: () => {},
  });
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(fallback);
  } else {
    fallback();
  }
}

function saveLink(code) {
  return `${window.location.origin}${window.location.pathname}#save=${code}`;
}
```

4. Replace the update callback's event loop (currently `for (const evt of world.events) audio.play(evt);`) with:

```js
      for (const evt of world.events) {
        if (evt === 'codeentry') {
          codeInput.open({
            message: 'ENTRE TON CODE',
            onSubmit: (text) => submitSaveCode(world, text),
            onCancel: () => {},
          });
        } else if (evt === 'copycode') {
          copyText(world.savecode.code);
        } else if (evt === 'copylink') {
          copyText(saveLink(world.savecode.code));
        } else {
          audio.play(evt);
        }
      }
```

- [ ] **Step 2: Verify suite and build**

Run: `npx vitest run`
Expected: all tests PASS.
Run: `npx vite build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat(save): wire URL #save restore, code entry overlay, clipboard copy"
```

---

### Task 8: Visual verification (Playwright)

**Files:**
- None modified (verification only; screenshots go to the scratchpad, not the repo).

Playwright is importable from the ORIGINAL checkout's `C:/Setup/Projects/Game/Slop/1st_Slop/node_modules/playwright/index.mjs` (import by absolute `file:///` URL in the verify script; browsers already cached).

- [ ] **Step 1: Start the dev server and verify the fresh-profile flow**

Start `npx vite --port 5199 --strictPort` (background). Playwright script with a fresh context (empty localStorage):
- Main menu: 4 buttons NEW GAME / CONTINUE (dimmed) / OPTIONS (dimmed) / CODE, all clear of the `Best:` text.
- Click CODE → SAVECODE screen: title SAUVEGARDE, `PAS DE SAUVEGARDE`, COPIER/LIEN dimmed, focus on SAISIR.
- Click RETOUR → back to menu.

- [ ] **Step 2: Verify the with-save flow**

Seed `localStorage['jetpackbot.bestLevel'] = '5'` (via `page.addInitScript` or evaluate + reload):
- Menu: CONTINUE lit. Click CONTINUE → HUD shows `Niveau 5`.
- Escape → pause → MENU → CODE → code `JB1-…` displayed in cyan, COPIER focused. Click COPIER → `COPIÉ !` feedback appears then fades (~1.5 s).
- Click SAISIR → DOM overlay appears; type an invalid code (`JB1-ZZZZZZ`) → `CODE INVALIDE`, overlay stays; Escape → overlay closes, still on SAVECODE.
- Click SAISIR again → type the code for level 9 (compute with the same encoder logic: run `node -e` with the alphabet/checksum snippet, or copy the displayed code from a seeded profile) → validates → back at menu.
- Reload with `#save=<code level 9>` in the URL on a FRESH profile → menu shows CONTINUE lit; URL hash cleaned; CODE screen shows the level-9 code.

- [ ] **Step 3: Keyboard nav check**

On SAVECODE: ArrowUp/ArrowDown move focus across enabled buttons, Enter activates RETOUR back to menu. While the DOM overlay is open, arrow keys/Space must NOT move game focus behind it (stopPropagation check).

- [ ] **Step 4: Report**

No commit. Report screenshots/findings to the user before merge (workflow: visual verify gates the merge).
