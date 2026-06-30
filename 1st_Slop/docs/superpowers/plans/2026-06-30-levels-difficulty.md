# Levels & Progressive Difficulty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Jetpack Bot's flat difficulty into infinite discrete levels that get faster with tighter gaps; clear a level by passing N gates; crash restarts the current level; persist the best level reached.

**Architecture:** A new pure `level.js` module derives per-level difficulty (`scrollSpeed`, `gapMin`, `gapMax`) and the gate goal from constants in `config.js`. The state machine gains a `LEVEL_COMPLETE` state. `world.js` holds the run state (`level`, `gatesThisLevel`, current difficulty) and orchestrates transitions; `score.js` is repurposed to persist only `bestLevel`. The renderer shows level + gate progress.

**Tech Stack:** Vanilla JS (ES modules), Canvas 2D, Vitest, Vite. Zero runtime dependencies.

## Global Constraints

- **Node 18+**, zero runtime dependencies (test/build only).
- **Pure modules** (`level.js`, `score.js`) must not import DOM/canvas — keep them unit-testable.
- **Level 1 must reproduce V1 feel exactly:** `difficultyForLevel(1)` returns `scrollSpeed === CONFIG.SCROLL_SPEED` (150), `gapMin === CONFIG.GAP_MIN` (160), `gapMax === CONFIG.GAP_MAX` (210).
- **localStorage keys:** best level persisted under `jetpackbot.bestLevel`.
- Run all tests with `npm test`; build with `npm run build`. Commit after each task.
- Progression metric is the **level number**; the abstract score (`score.current`/`score.best`) is removed.

---

### Task 1: Difficulty model (`level.js`) + config constants

**Files:**
- Modify: `src/config.js` (append constants after line 30)
- Create: `src/game/level.js`
- Test: `tests/game/level.test.js`

**Interfaces:**
- Consumes: `CONFIG` from `src/config.js`.
- Produces:
  - `gateGoalForLevel(level: number) => number`
  - `difficultyForLevel(level: number) => { scrollSpeed: number, gapMin: number, gapMax: number }`

- [ ] **Step 1: Add config constants**

In `src/config.js`, add before the closing `};` (after the `FLASH_TIME` line):

```js
  // Niveaux & difficulté progressive
  GATES_PER_LEVEL: 10,
  SPEED_BASE: 150,   // vitesse niveau 1 (= SCROLL_SPEED)
  SPEED_STEP: 12,    // gain de vitesse par niveau
  SPEED_MAX: 300,    // plafond de vitesse
  GAP_BASE: 160,     // gapMin niveau 1 (= GAP_MIN)
  GAP_SHRINK: 6,     // rétrécissement du gap par niveau
  GAP_FLOOR: 110,    // gap minimal absolu
  GAP_RANGE: 50,     // étendue aléatoire au-dessus de gapMin (= GAP_MAX - GAP_MIN)
```

- [ ] **Step 2: Write the failing test**

Create `tests/game/level.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { gateGoalForLevel, difficultyForLevel } from '../../src/game/level.js';
import { CONFIG } from '../../src/config.js';

describe('level', () => {
  it('gateGoalForLevel renvoie GATES_PER_LEVEL', () => {
    expect(gateGoalForLevel(1)).toBe(CONFIG.GATES_PER_LEVEL);
    expect(gateGoalForLevel(9)).toBe(CONFIG.GATES_PER_LEVEL);
  });

  it('niveau 1 reproduit exactement les valeurs V1', () => {
    const d = difficultyForLevel(1);
    expect(d.scrollSpeed).toBe(CONFIG.SCROLL_SPEED);
    expect(d.gapMin).toBe(CONFIG.GAP_MIN);
    expect(d.gapMax).toBe(CONFIG.GAP_MAX);
  });

  it('la vitesse croît avec le niveau puis plafonne à SPEED_MAX', () => {
    expect(difficultyForLevel(2).scrollSpeed).toBeGreaterThan(difficultyForLevel(1).scrollSpeed);
    expect(difficultyForLevel(1000).scrollSpeed).toBe(CONFIG.SPEED_MAX);
  });

  it('le gap minimal décroît avec le niveau puis plancher à GAP_FLOOR', () => {
    expect(difficultyForLevel(2).gapMin).toBeLessThan(difficultyForLevel(1).gapMin);
    expect(difficultyForLevel(1000).gapMin).toBe(CONFIG.GAP_FLOOR);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- level`
Expected: FAIL — `Failed to resolve import "../../src/game/level.js"`.

- [ ] **Step 4: Write minimal implementation**

Create `src/game/level.js`:

```js
import { CONFIG } from '../config.js';

export function gateGoalForLevel(level) {
  return CONFIG.GATES_PER_LEVEL;
}

export function difficultyForLevel(level) {
  const n = Math.max(1, level) - 1;
  const scrollSpeed = Math.min(CONFIG.SPEED_BASE + n * CONFIG.SPEED_STEP, CONFIG.SPEED_MAX);
  const gapMin = Math.max(CONFIG.GAP_BASE - n * CONFIG.GAP_SHRINK, CONFIG.GAP_FLOOR);
  const gapMax = gapMin + CONFIG.GAP_RANGE;
  return { scrollSpeed, gapMin, gapMax };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- level`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/config.js src/game/level.js tests/game/level.test.js
git commit -m "feat(jetpack-bot): per-level difficulty model"
```

---

### Task 2: `LEVEL_COMPLETE` state

**Files:**
- Modify: `src/engine/state.js:1-7`
- Test: `tests/engine/state.test.js`

**Interfaces:**
- Produces: `States.LEVEL_COMPLETE === 'levelcomplete'`; transitions `PLAY → LEVEL_COMPLETE` and `LEVEL_COMPLETE → PLAY` allowed.

- [ ] **Step 1: Write the failing test**

Append inside the `describe('stateMachine', ...)` block in `tests/engine/state.test.js` (before its closing `});`):

```js
  it('autorise PLAY -> LEVEL_COMPLETE -> PLAY', () => {
    const sm = createStateMachine(States.PLAY);
    expect(sm.can(States.LEVEL_COMPLETE)).toBe(true);
    sm.to(States.LEVEL_COMPLETE);
    expect(sm.can(States.PLAY)).toBe(true);
    sm.to(States.PLAY);
    expect(sm.get()).toBe(States.PLAY);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- state`
Expected: FAIL — `sm.can(States.LEVEL_COMPLETE)` is `false` (or `States.LEVEL_COMPLETE` is `undefined`).

- [ ] **Step 3: Write minimal implementation**

Replace lines 1-7 of `src/engine/state.js` with:

```js
export const States = {
  MENU: 'menu', PLAY: 'play', GAMEOVER: 'gameover', LEVEL_COMPLETE: 'levelcomplete',
};

const TRANSITIONS = {
  [States.MENU]: [States.PLAY],
  [States.PLAY]: [States.GAMEOVER, States.LEVEL_COMPLETE],
  [States.GAMEOVER]: [States.PLAY, States.MENU],
  [States.LEVEL_COMPLETE]: [States.PLAY],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- state`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/state.js tests/engine/state.test.js
git commit -m "feat(jetpack-bot): add LEVEL_COMPLETE state"
```

---

### Task 3: Repurpose `score.js` to persist `bestLevel`

**Files:**
- Modify: `src/game/score.js` (full rewrite)
- Test: `tests/game/score.test.js` (full rewrite)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `createScore(storage) => { bestLevel: number }`
  - `checkPass(robot, obstacle, width) => boolean` (unchanged behaviour: marks `obstacle.passed`)
  - `finalizeLevel(score, level, storage) => score` (persists `level` to `jetpackbot.bestLevel` when greater)
- Removed: `scorePass`, `finalize`, `score.current`, `score.best`.

- [ ] **Step 1: Rewrite the test (failing)**

Replace the entire contents of `tests/game/score.test.js` with:

```js
import { describe, it, expect } from 'vitest';
import { createScore, checkPass, finalizeLevel } from '../../src/game/score.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

describe('score', () => {
  it('charge le bestLevel depuis le storage', () => {
    const s = createScore(fakeStorage({ 'jetpackbot.bestLevel': '7' }));
    expect(s.bestLevel).toBe(7);
  });

  it('bestLevel vaut 0 quand rien n\'est stocké', () => {
    expect(createScore(fakeStorage()).bestLevel).toBe(0);
  });

  it('checkPass true quand le robot a dépassé, false ensuite', () => {
    const robot = { x: 100 };
    const obstacle = { x: 30, passed: false };
    expect(checkPass(robot, obstacle, 60)).toBe(true);
    expect(obstacle.passed).toBe(true);
    expect(checkPass(robot, obstacle, 60)).toBe(false);
  });

  it('finalizeLevel persiste le niveau quand il dépasse le best', () => {
    const storage = fakeStorage({ 'jetpackbot.bestLevel': '3' });
    const s = createScore(storage);
    finalizeLevel(s, 9, storage);
    expect(s.bestLevel).toBe(9);
    expect(storage.getItem('jetpackbot.bestLevel')).toBe('9');
  });

  it('finalizeLevel ne baisse jamais le best', () => {
    const storage = fakeStorage({ 'jetpackbot.bestLevel': '10' });
    const s = createScore(storage);
    finalizeLevel(s, 4, storage);
    expect(s.bestLevel).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- score`
Expected: FAIL — `finalizeLevel`/`createScore().bestLevel` not defined.

- [ ] **Step 3: Rewrite the implementation**

Replace the entire contents of `src/game/score.js` with:

```js
const KEY = 'jetpackbot.bestLevel';

export function createScore(storage) {
  const bestLevel = Number(storage?.getItem(KEY)) || 0;
  return { bestLevel };
}

export function checkPass(robot, obstacle, width) {
  if (!obstacle.passed && robot.x > obstacle.x + width) {
    obstacle.passed = true;
    return true;
  }
  return false;
}

export function finalizeLevel(score, level, storage) {
  if (level > score.bestLevel) {
    score.bestLevel = level;
    storage?.setItem(KEY, String(level));
  }
  return score;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- score`
Expected: PASS (5 tests).

> Note: `npm test` (all) will still FAIL here because `world.js` and `renderer.js` import the removed `scorePass`/`finalize`. That's fixed in Tasks 5–6. Run only `npm test -- score` for this task's gate.

- [ ] **Step 5: Commit**

```bash
git add src/game/score.js tests/game/score.test.js
git commit -m "feat(jetpack-bot): persist bestLevel instead of best score"
```

---

### Task 4: Parametrize scroll speed in `updateObstacles`

**Files:**
- Modify: `src/game/obstacles.js:14-17`
- Test: `tests/game/obstacles.test.js`

**Interfaces:**
- Produces: `updateObstacles(obstacles, dt, speed = CONFIG.SCROLL_SPEED)` — moves each obstacle left by `speed * dt`. Existing 2-arg calls keep V1 behaviour.

- [ ] **Step 1: Write the failing test**

Append inside `describe('obstacles', ...)` in `tests/game/obstacles.test.js` (before its closing `});`):

```js
  it('utilise la vitesse fournie quand elle est précisée', () => {
    const list = [createObstacle(400, 200, 180)];
    updateObstacles(list, 1, 300);
    expect(list[0].x).toBeCloseTo(100, 5);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- obstacles`
Expected: FAIL — moved by `CONFIG.SCROLL_SPEED` (150) → x ≈ 250, not 100.

- [ ] **Step 3: Write minimal implementation**

Replace lines 14-17 of `src/game/obstacles.js` with:

```js
export function updateObstacles(obstacles, dt, speed = CONFIG.SCROLL_SPEED) {
  for (const o of obstacles) o.x -= speed * dt;
  return obstacles;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- obstacles`
Expected: PASS (existing + new test).

- [ ] **Step 5: Commit**

```bash
git add src/game/obstacles.js tests/game/obstacles.test.js
git commit -m "feat(jetpack-bot): allow per-call obstacle scroll speed"
```

---

### Task 5: Wire levels into `world.js`

**Files:**
- Modify: `src/game/world.js` (imports, `createWorld`, `resetRun`, add `startLevel`, `spawnObstacle`, `press`, `updateWorld`)
- Test: `tests/game/world.test.js`

**Interfaces:**
- Consumes: `difficultyForLevel`, `gateGoalForLevel` from `level.js`; `createScore`, `checkPass`, `finalizeLevel` from `score.js`; `updateObstacles(.., speed)` from `obstacles.js`; `States.LEVEL_COMPLETE`.
- Produces on `world`: `level: number`, `gatesThisLevel: number`, `scrollSpeed: number`, `gapMin: number`, `gapMax: number`; exported `startLevel(world, level)`. Emits event `'levelcomplete'` on level clear. `press` advances level on `LEVEL_COMPLETE`, replays same level on `GAMEOVER`.

- [ ] **Step 1: Write the failing tests**

In `tests/game/world.test.js`, **replace** the test `'retry depuis GAMEOVER réinitialise le score courant'` (the whole `it(...)` block, lines ~42-51) with:

```js
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
```

Then update the import line at the top of the file (line 2) to include `startLevel`:

```js
import { createWorld, press, resetRun, startLevel, updateWorld } from '../../src/game/world.js';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- world`
Expected: FAIL — `startLevel` not exported / `w.level` undefined / no `'levelcomplete'` event.

- [ ] **Step 3: Update imports in `world.js`**

Replace line 8 of `src/game/world.js`:

```js
import { createScore, checkPass, finalizeLevel } from './score.js';
```

And add immediately after it:

```js
import { gateGoalForLevel, difficultyForLevel } from './level.js';
```

- [ ] **Step 4: Add level state to `createWorld`**

In `createWorld` (the returned object), add these fields right after `score: createScore(storage),`:

```js
    level: 1,
    gatesThisLevel: 0,
    scrollSpeed: difficultyForLevel(1).scrollSpeed,
    gapMin: difficultyForLevel(1).gapMin,
    gapMax: difficultyForLevel(1).gapMax,
```

- [ ] **Step 5: Update `resetRun` and add `startLevel`**

Replace the whole `resetRun` function with:

```js
export function resetRun(world) {
  world.robot = createRobot();
  world.obstacles = [];
  world.gatesThisLevel = 0;
  world.bgSet = Math.floor(world.rand() * CONFIG.BG_SET_COUNT);
  world.particles.particles = [];
}

export function startLevel(world, level) {
  const diff = difficultyForLevel(level);
  world.level = level;
  world.scrollSpeed = diff.scrollSpeed;
  world.gapMin = diff.gapMin;
  world.gapMax = diff.gapMax;
  resetRun(world);
}
```

- [ ] **Step 6: Use per-level gaps in `spawnObstacle`**

Replace the `spawnObstacle` body's first line (the `gapH` computation) so the function reads:

```js
function spawnObstacle(world) {
  const gapH = world.gapMin + world.rand() * (world.gapMax - world.gapMin);
  const gapY = randomGapY(world.rand, CONFIG.HEIGHT, gapH);
  world.obstacles.push(createObstacle(CONFIG.WIDTH + CONFIG.OBSTACLE_W, gapY, gapH));
}
```

- [ ] **Step 7: Rewrite `press` for the new states**

Replace the whole `press` function with:

```js
export function press(world) {
  const state = world.sm.get();
  if (state === States.MENU) {
    startLevel(world, 1);
    world.sm.to(States.PLAY);
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
```

- [ ] **Step 8: Use per-level speed + gate goal + crash persistence in `updateWorld`**

In `updateWorld`:

(a) Replace the layers update line:

```js
  for (const layer of world.layers) updateLayer(layer, world.scrollSpeed, dt);
```

(b) Replace the `updateObstacles` call:

```js
  updateObstacles(world.obstacles, dt, world.scrollSpeed);
```

(c) Replace the scoring loop and add the level-complete check. The block that currently reads:

```js
  for (const o of world.obstacles) {
    if (checkPass(world.robot, o, CONFIG.OBSTACLE_W)) {
      scorePass(world.score);
      world.events.push('score');
    }
  }
```

becomes:

```js
  for (const o of world.obstacles) {
    if (checkPass(world.robot, o, CONFIG.OBSTACLE_W)) {
      world.gatesThisLevel += 1;
      world.events.push('score');
    }
  }

  if (world.gatesThisLevel >= gateGoalForLevel(world.level)) {
    finalizeLevel(world.score, world.level, world.storage);
    world.events.push('levelcomplete');
    world.sm.to(States.LEVEL_COMPLETE);
    return;
  }
```

(d) In the crash branch, replace the `finalize` call:

```js
    finalizeLevel(world.score, world.level, world.storage);
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test -- world score level obstacles state`
Expected: PASS. Then run the full suite: `npm test` → all green (renderer is not unit-tested yet but the app isn't built in tests).

- [ ] **Step 10: Commit**

```bash
git add src/game/world.js tests/game/world.test.js
git commit -m "feat(jetpack-bot): level progression, gate goal, restart-on-crash"
```

---

### Task 6: HUD for levels (`renderer.js`)

**Files:**
- Modify: `src/render/renderer.js:1-4` (imports), `src/render/renderer.js:81-95` (HUD block)

**Interfaces:**
- Consumes: `world.level`, `world.gatesThisLevel`, `world.score.bestLevel`, `gateGoalForLevel`, `States.LEVEL_COMPLETE`.

> No unit test (renderer has none in this project). Gate is `npm test` (all green) + `npm run build` + manual visual check.

- [ ] **Step 1: Add the level import**

Add after line 2 of `src/render/renderer.js`:

```js
import { gateGoalForLevel } from '../game/level.js';
```

- [ ] **Step 2: Rewrite the HUD state block**

Replace the block from `if (state === States.PLAY) {` through its closing `}` (the menu/gameover branches, currently lines ~82-95) with:

```js
  if (state === States.PLAY) {
    ctx.fillText(`${world.gatesThisLevel}/${gateGoalForLevel(world.level)}`, CONFIG.WIDTH / 2, 56);
    ctx.font = '14px system-ui';
    ctx.fillText(`Niveau ${world.level}`, CONFIG.WIDTH / 2, 80);
  } else if (state === States.MENU) {
    ctx.fillText('JETPACK BOT', CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText('Tap / Espace pour voler', CONFIG.WIDTH / 2, 280);
    ctx.fillText(`Best: niveau ${world.score.bestLevel}`, CONFIG.WIDTH / 2, 320);
  } else if (state === States.LEVEL_COMPLETE) {
    ctx.fillText(`NIVEAU ${world.level} OK`, CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText('Tap pour continuer', CONFIG.WIDTH / 2, 280);
  } else if (state === States.GAMEOVER) {
    ctx.fillText('GAME OVER', CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText(`Niveau ${world.level}`, CONFIG.WIDTH / 2, 280);
    ctx.fillText(`Best: niveau ${world.score.bestLevel}`, CONFIG.WIDTH / 2, 308);
    ctx.fillText('Tap pour réessayer', CONFIG.WIDTH / 2, 340);
  }
```

- [ ] **Step 3: Verify full suite + build**

Run: `npm test`
Expected: PASS (all suites).

Run: `npm run build`
Expected: `✓ built` with no errors.

- [ ] **Step 4: Manual visual check**

Run: `npm run dev`, open the local URL. Verify: menu shows `Best: niveau 0`; play shows `g/10` + `Niveau 1`; after 10 gates the win screen appears; tapping advances to `Niveau 2` (visibly faster, tighter gaps); crashing shows game-over with the level, and tapping replays the same level.

- [ ] **Step 5: Commit**

```bash
git add src/render/renderer.js
git commit -m "feat(jetpack-bot): HUD for level + gate progress"
```

---

## Self-Review

**Spec coverage:**
- Infinite escalating levels → Task 1 (`difficultyForLevel`, capped). ✓
- Pass-N-gates to clear → Task 1 (`gateGoalForLevel`) + Task 5 (gate counter → `LEVEL_COMPLETE`). ✓
- `LEVEL_COMPLETE` state + flow → Task 2 + Task 5 (`press`). ✓
- Crash restarts current level → Task 5 (`press` GAMEOVER branch). ✓
- Persist best level → Task 3 (`finalizeLevel`, `jetpackbot.bestLevel`) + Task 5 (called on crash and level-clear). ✓
- Start at level 1 from menu → Task 5 (`press` MENU branch). ✓
- Per-level speed/gaps applied to scroll + spawn → Task 4 + Task 5 (steps 6, 8a, 8b). ✓
- HUD (PLAY/LEVEL_COMPLETE/GAMEOVER/MENU) → Task 6. ✓
- Tests for level/world/score → Tasks 1/3/5. ✓
- Level-1 == V1 feel → Task 1 test asserts exact equality. ✓

**Placeholder scan:** none — every code step shows full code.

**Type consistency:** `difficultyForLevel` returns `{ scrollSpeed, gapMin, gapMax }` (Task 1) consumed identically in Tasks 5/6. `finalizeLevel(score, level, storage)` defined in Task 3, called with same arg order in Task 5. `gateGoalForLevel(level)` defined Task 1, used Tasks 5/6. `startLevel(world, level)` defined and exported Task 5, imported in its test. `updateObstacles(obstacles, dt, speed)` defined Task 4, called with `world.scrollSpeed` in Task 5. ✓

**Removed-symbol check:** `scorePass`/`finalize`/`score.current`/`score.best` were referenced in `world.js` (Task 5 step 8c/8d, step 3) and `renderer.js` (Task 6 step 2). Both updated. `main.js` has no score references (verified). ✓
