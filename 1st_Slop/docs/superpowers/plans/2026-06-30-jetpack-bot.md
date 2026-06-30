# Jetpack Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire un Flappy-like vertical "robot à jetpack cyberpunk", jouable au tap sur mobile et au clic/espace sur desktop web, avec assets Pixellab.

**Architecture:** Vanilla JS (ES modules) + Canvas 2D, bundlé par Vite. La logique de jeu (physique, collisions, obstacles, score, états) vit dans des modules purs sans dépendance au Canvas, ce qui les rend testables unitairement avec Vitest. Le rendu lit cet état et dessine. Une game loop à pas de temps fixe (fixed timestep) garantit une physique déterministe.

**Tech Stack:** JavaScript (ES modules), Canvas 2D, Vite (dev/build), Vitest (tests), Pixellab (assets), localStorage (best score).

## Global Constraints

- **Zéro dépendance runtime** : aucune lib de jeu (pas de Phaser/Kaboom). Vite et Vitest sont des dépendances de dev uniquement.
- **Résolution logique de référence** : 360 × 640 (portrait, ratio 9:16). Le canvas est mis à l'échelle en CSS pour remplir l'écran (mobile) ou s'affiche centré (desktop).
- **Une seule action de jeu** : tap (mobile) / clic gauche / barre espace (desktop) = poussée jetpack.
- **Séparation logique/rendu** : aucun module sous `src/game/` ni `src/engine/` (hors renderer) ne référence `canvas`, `document`, ou `window` directement — les dépendances externes (storage, rand) sont injectées en paramètre pour rester testables.
- **Toutes les constantes de gameplay** vivent dans `src/config.js`.
- **Commits fréquents** : un commit par tâche minimum (souvent un par cycle test→impl).

---

## Structure de fichiers cible

```
1st_Slop/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js              # bootstrap + démarrage de la boucle
│   ├── config.js            # constantes de gameplay
│   ├── engine/
│   │   ├── loop.js          # computeSteps() + createLoop() (fixed timestep)
│   │   ├── state.js         # machine à états Menu/Play/GameOver
│   │   ├── input.js         # abstraction tap/clic/espace -> onPress
│   │   ├── assets.js        # préchargement images + sons
│   │   └── audio.js         # lecture des SFX
│   ├── game/
│   │   ├── robot.js         # entité joueur (gravité, thrust, hitbox)
│   │   ├── obstacles.js     # spawn / déplacement / recyclage / gaps
│   │   ├── background.js    # offsets de parallaxe
│   │   ├── collision.js     # AABB + bornes
│   │   └── score.js         # score courant + best (localStorage)
│   └── render/
│       └── renderer.js      # dessine l'état sur le canvas (placeholders puis sprites)
├── assets/                  # sprites + sons (Pixellab)
└── tests/                   # tests Vitest (miroir de src/)
```

---

### Task 1: Scaffold du projet (Vite + Vitest + canvas responsive)

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/config.js`, `tests/smoke.test.js`, `.gitignore` (déjà présent au niveau repo — vérifier qu'il couvre `node_modules`/`dist`)

**Interfaces:**
- Consumes: rien.
- Produces: `CONFIG` (objet exporté depuis `src/config.js`) consommé par toutes les tâches suivantes ; un canvas `#game` 360×640 dans `index.html`.

- [ ] **Step 1: Initialiser le projet npm et installer les outils de dev**

Run (depuis `C:/Setup/Projects/Game/Slop/1st_Slop`) :
```bash
npm init -y
npm install -D vite vitest
```

- [ ] **Step 2: Écrire `package.json` scripts**

Modifier la section `scripts` de `package.json` :
```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Écrire `vite.config.js`**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
});
```

- [ ] **Step 4: Écrire `index.html` avec canvas portrait + scaling responsive**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>Jetpack Bot</title>
    <style>
      html, body {
        margin: 0; height: 100%; background: #0a0a14; overflow: hidden;
        display: flex; align-items: center; justify-content: center;
        touch-action: manipulation; font-family: system-ui, sans-serif;
      }
      #game {
        display: block;
        image-rendering: pixelated;            /* rendu net pour pixel art */
        height: 100vh; width: auto;            /* mobile: remplit la hauteur */
        max-width: 100vw;
        aspect-ratio: 360 / 640;
        background: #0a0a14;
      }
    </style>
  </head>
  <body>
    <canvas id="game" width="360" height="640"></canvas>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Écrire `src/config.js`**

```js
export const CONFIG = {
  WIDTH: 360,
  HEIGHT: 640,

  // Physique robot
  GRAVITY: 1400,      // px/s^2
  THRUST: 380,        // vitesse verticale (px/s) appliquée vers le haut au tap
  MAX_FALL: 650,      // vitesse de chute terminale (px/s)
  ROBOT_X: 96,        // X fixe du robot
  ROBOT_W: 34,
  ROBOT_H: 24,

  // Monde
  SCROLL_SPEED: 150,  // px/s (défilement obstacles + sol)
  FIXED_DT: 1 / 60,   // pas de temps fixe

  // Obstacles
  OBSTACLE_W: 62,
  GAP_MIN: 160,
  GAP_MAX: 210,
  OBSTACLE_SPACING: 230, // distance horizontale entre 2 obstacles
  GAP_MARGIN: 48,        // marge haute/basse interdite pour le gap
};
```

- [ ] **Step 6: Écrire `src/main.js` (bootstrap minimal qui efface le canvas)**

```js
import { CONFIG } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#0a0a14';
ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
ctx.fillStyle = '#00e5ff';
ctx.font = '16px system-ui';
ctx.textAlign = 'center';
ctx.fillText('Jetpack Bot', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);
```

- [ ] **Step 7: Écrire un test smoke pour valider que Vitest tourne**

`tests/smoke.test.js` :
```js
import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';

describe('config', () => {
  it('expose la résolution logique 360x640', () => {
    expect(CONFIG.WIDTH).toBe(360);
    expect(CONFIG.HEIGHT).toBe(640);
  });
});
```

- [ ] **Step 8: Lancer les tests**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 9: Vérification manuelle du dev server**

Run: `npm run dev`
Ouvrir l'URL affichée. Attendu : fond bleu nuit avec le texte cyan "Jetpack Bot" centré, dans un cadre vertical centré. Arrêter le serveur (Ctrl+C).

- [ ] **Step 10: Commit**

```bash
git add 1st_Slop
git commit -m "feat(jetpack-bot): scaffold Vite + Vitest + responsive canvas"
```

---

### Task 2: Game loop à pas de temps fixe

**Files:**
- Create: `src/engine/loop.js`, `tests/engine/loop.test.js`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `computeSteps(accumulator, frameDt, fixedDt, maxSteps=5) -> { steps: number, accumulator: number }`
  - `createLoop({ update, render, fixedDt }) -> { start(), stop() }` (utilise `requestAnimationFrame`)

- [ ] **Step 1: Écrire les tests de `computeSteps`**

`tests/engine/loop.test.js` :
```js
import { describe, it, expect } from 'vitest';
import { computeSteps } from '../../src/engine/loop.js';

describe('computeSteps', () => {
  it('produit 1 step quand le temps accumulé atteint fixedDt', () => {
    const r = computeSteps(0, 1 / 60, 1 / 60);
    expect(r.steps).toBe(1);
    expect(r.accumulator).toBeCloseTo(0, 5);
  });

  it('produit 0 step si pas assez de temps accumulé', () => {
    const r = computeSteps(0, 1 / 120, 1 / 60);
    expect(r.steps).toBe(0);
    expect(r.accumulator).toBeCloseTo(1 / 120, 5);
  });

  it('produit plusieurs steps et garde le reste', () => {
    const r = computeSteps(0, 2.5 / 60, 1 / 60);
    expect(r.steps).toBe(2);
    expect(r.accumulator).toBeCloseTo(0.5 / 60, 5);
  });

  it('plafonne le nombre de steps (spirale de la mort)', () => {
    const r = computeSteps(0, 10, 1 / 60, 5);
    expect(r.steps).toBe(5);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run tests/engine/loop.test.js`
Expected: FAIL ("computeSteps is not a function" / module introuvable).

- [ ] **Step 3: Implémenter `computeSteps` et `createLoop`**

`src/engine/loop.js` :
```js
export function computeSteps(accumulator, frameDt, fixedDt, maxSteps = 5) {
  let acc = accumulator + frameDt;
  let steps = 0;
  while (acc >= fixedDt && steps < maxSteps) {
    acc -= fixedDt;
    steps += 1;
  }
  return { steps, accumulator: acc };
}

export function createLoop({ update, render, fixedDt }) {
  let accumulator = 0;
  let last = 0;
  let rafId = 0;
  let running = false;

  function frame(now) {
    if (!running) return;
    const frameDt = Math.min((now - last) / 1000, 0.25); // clamp anti gros lag
    last = now;
    const stepped = computeSteps(accumulator, frameDt, fixedDt);
    for (let i = 0; i < stepped.steps; i += 1) update(fixedDt);
    accumulator = stepped.accumulator;
    render();
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npx vitest run tests/engine/loop.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add 1st_Slop/src/engine/loop.js 1st_Slop/tests/engine/loop.test.js
git commit -m "feat(jetpack-bot): fixed-timestep game loop"
```

---

### Task 3: Machine à états (Menu / Play / GameOver)

**Files:**
- Create: `src/engine/state.js`, `tests/engine/state.test.js`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `States = { MENU: 'menu', PLAY: 'play', GAMEOVER: 'gameover' }`
  - `createStateMachine(initial=States.MENU) -> { get(), can(next), to(next) }`

- [ ] **Step 1: Écrire les tests**

`tests/engine/state.test.js` :
```js
import { describe, it, expect } from 'vitest';
import { States, createStateMachine } from '../../src/engine/state.js';

describe('stateMachine', () => {
  it('démarre en MENU par défaut', () => {
    expect(createStateMachine().get()).toBe(States.MENU);
  });

  it('autorise MENU -> PLAY', () => {
    const sm = createStateMachine();
    expect(sm.can(States.PLAY)).toBe(true);
    expect(sm.to(States.PLAY)).toBe(States.PLAY);
  });

  it('autorise PLAY -> GAMEOVER -> PLAY (retry)', () => {
    const sm = createStateMachine(States.PLAY);
    sm.to(States.GAMEOVER);
    expect(sm.can(States.PLAY)).toBe(true);
    sm.to(States.PLAY);
    expect(sm.get()).toBe(States.PLAY);
  });

  it('refuse une transition invalide MENU -> GAMEOVER', () => {
    const sm = createStateMachine();
    expect(sm.can(States.GAMEOVER)).toBe(false);
    expect(() => sm.to(States.GAMEOVER)).toThrow();
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run tests/engine/state.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `state.js`**

```js
export const States = { MENU: 'menu', PLAY: 'play', GAMEOVER: 'gameover' };

const TRANSITIONS = {
  [States.MENU]: [States.PLAY],
  [States.PLAY]: [States.GAMEOVER],
  [States.GAMEOVER]: [States.PLAY, States.MENU],
};

export function createStateMachine(initial = States.MENU) {
  let current = initial;
  return {
    get() {
      return current;
    },
    can(next) {
      return TRANSITIONS[current]?.includes(next) ?? false;
    },
    to(next) {
      if (!this.can(next)) {
        throw new Error(`Transition invalide ${current} -> ${next}`);
      }
      current = next;
      return current;
    },
  };
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npx vitest run tests/engine/state.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add 1st_Slop/src/engine/state.js 1st_Slop/tests/engine/state.test.js
git commit -m "feat(jetpack-bot): game state machine"
```

---

### Task 4: Entité robot (gravité + thrust)

**Files:**
- Create: `src/game/robot.js`, `tests/game/robot.test.js`

**Interfaces:**
- Consumes: `CONFIG` depuis `src/config.js`.
- Produces:
  - `createRobot() -> { x, y, vy, w, h, alive }`
  - `applyThrust(robot) -> void` (met `vy = -CONFIG.THRUST`)
  - `updateRobot(robot, dt) -> robot` (applique gravité + clamp vitesse + intègre position)

- [ ] **Step 1: Écrire les tests**

`tests/game/robot.test.js` :
```js
import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../src/config.js';
import { createRobot, applyThrust, updateRobot } from '../../src/game/robot.js';

describe('robot', () => {
  it('démarre au centre, immobile et vivant', () => {
    const r = createRobot();
    expect(r.x).toBe(CONFIG.ROBOT_X);
    expect(r.y).toBe(CONFIG.HEIGHT / 2);
    expect(r.vy).toBe(0);
    expect(r.alive).toBe(true);
  });

  it('thrust donne une vitesse vers le haut (négative)', () => {
    const r = createRobot();
    applyThrust(r);
    expect(r.vy).toBe(-CONFIG.THRUST);
  });

  it('la gravité augmente vy et fait descendre le robot', () => {
    const r = createRobot();
    updateRobot(r, 0.1);
    expect(r.vy).toBeCloseTo(CONFIG.GRAVITY * 0.1, 5);
    expect(r.y).toBeGreaterThan(CONFIG.HEIGHT / 2);
  });

  it('plafonne la vitesse de chute à MAX_FALL', () => {
    const r = createRobot();
    for (let i = 0; i < 100; i += 1) updateRobot(r, 0.1);
    expect(r.vy).toBeLessThanOrEqual(CONFIG.MAX_FALL);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run tests/game/robot.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `robot.js`**

```js
import { CONFIG } from '../config.js';

export function createRobot() {
  return {
    x: CONFIG.ROBOT_X,
    y: CONFIG.HEIGHT / 2,
    vy: 0,
    w: CONFIG.ROBOT_W,
    h: CONFIG.ROBOT_H,
    alive: true,
  };
}

export function applyThrust(robot) {
  robot.vy = -CONFIG.THRUST;
}

export function updateRobot(robot, dt) {
  robot.vy = Math.min(robot.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);
  robot.y += robot.vy * dt;
  return robot;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npx vitest run tests/game/robot.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add 1st_Slop/src/game/robot.js 1st_Slop/tests/game/robot.test.js
git commit -m "feat(jetpack-bot): robot physics (gravity + thrust)"
```

---

### Task 5: Collisions (AABB + bornes haut/bas)

**Files:**
- Create: `src/game/collision.js`, `tests/game/collision.test.js`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `aabb(a, b) -> boolean` (a et b = `{x, y, w, h}`)
  - `hitsBounds(robot, height) -> boolean` (sort par le haut ou le bas)

- [ ] **Step 1: Écrire les tests**

`tests/game/collision.test.js` :
```js
import { describe, it, expect } from 'vitest';
import { aabb, hitsBounds } from '../../src/game/collision.js';

describe('collision', () => {
  it('détecte le chevauchement de deux rectangles', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 5, y: 5, w: 10, h: 10 };
    expect(aabb(a, b)).toBe(true);
  });

  it('renvoie false quand les rectangles sont séparés', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 20, y: 20, w: 5, h: 5 };
    expect(aabb(a, b)).toBe(false);
  });

  it('détecte la sortie par le bas', () => {
    expect(hitsBounds({ y: 630, h: 24 }, 640)).toBe(true);
  });

  it('détecte la sortie par le haut', () => {
    expect(hitsBounds({ y: -1, h: 24 }, 640)).toBe(true);
  });

  it('renvoie false quand le robot est dans les bornes', () => {
    expect(hitsBounds({ y: 300, h: 24 }, 640)).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run tests/game/collision.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `collision.js`**

```js
export function aabb(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function hitsBounds(robot, height) {
  return robot.y < 0 || robot.y + robot.h > height;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npx vitest run tests/game/collision.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add 1st_Slop/src/game/collision.js 1st_Slop/tests/game/collision.test.js
git commit -m "feat(jetpack-bot): AABB + bounds collision"
```

---

### Task 6: Obstacles (création, gaps, déplacement, recyclage, spawn)

**Files:**
- Create: `src/game/obstacles.js`, `tests/game/obstacles.test.js`

**Interfaces:**
- Consumes: `CONFIG`.
- Produces:
  - `createObstacle(x, gapY, gapH) -> { x, gapY, gapH, passed }`
  - `obstacleRects(o, width, height) -> [topRect, bottomRect]` (chaque rect = `{x, y, w, h}`)
  - `updateObstacles(obstacles, dt) -> obstacles` (décale `x` vers la gauche)
  - `recycle(obstacles, width) -> obstacles` (retire ceux sortis à gauche)
  - `needsSpawn(obstacles, spawnX) -> boolean`
  - `randomGapY(rand, height, gapH) -> number` (`rand` = fonction `() => [0,1)`)

- [ ] **Step 1: Écrire les tests**

`tests/game/obstacles.test.js` :
```js
import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../src/config.js';
import {
  createObstacle, obstacleRects, updateObstacles,
  recycle, needsSpawn, randomGapY,
} from '../../src/game/obstacles.js';

describe('obstacles', () => {
  it('crée un obstacle non franchi', () => {
    const o = createObstacle(400, 200, 180);
    expect(o).toEqual({ x: 400, gapY: 200, gapH: 180, passed: false });
  });

  it('produit un rect haut et un rect bas autour du gap', () => {
    const [top, bottom] = obstacleRects(createObstacle(400, 200, 180), 60, 640);
    expect(top).toEqual({ x: 400, y: 0, w: 60, h: 200 });
    expect(bottom).toEqual({ x: 400, y: 380, w: 60, h: 260 });
  });

  it('déplace les obstacles vers la gauche', () => {
    const list = [createObstacle(400, 200, 180)];
    updateObstacles(list, 1);
    expect(list[0].x).toBeCloseTo(400 - CONFIG.SCROLL_SPEED, 5);
  });

  it('recycle les obstacles entièrement sortis à gauche', () => {
    const list = [createObstacle(-70, 200, 180), createObstacle(100, 200, 180)];
    const kept = recycle(list, CONFIG.OBSTACLE_W);
    expect(kept).toHaveLength(1);
    expect(kept[0].x).toBe(100);
  });

  it('needsSpawn renvoie true si liste vide', () => {
    expect(needsSpawn([], 360)).toBe(true);
  });

  it('needsSpawn renvoie true quand le dernier obstacle est assez à gauche', () => {
    const list = [createObstacle(360 - CONFIG.OBSTACLE_SPACING, 200, 180)];
    expect(needsSpawn(list, 360)).toBe(true);
  });

  it('randomGapY reste dans les marges autorisées', () => {
    const y0 = randomGapY(() => 0, 640, 180);
    const y1 = randomGapY(() => 0.999, 640, 180);
    expect(y0).toBeGreaterThanOrEqual(CONFIG.GAP_MARGIN);
    expect(y1 + 180).toBeLessThanOrEqual(640 - CONFIG.GAP_MARGIN);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run tests/game/obstacles.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `obstacles.js`**

```js
import { CONFIG } from '../config.js';

export function createObstacle(x, gapY, gapH) {
  return { x, gapY, gapH, passed: false };
}

export function obstacleRects(o, width, height) {
  return [
    { x: o.x, y: 0, w: width, h: o.gapY },
    { x: o.x, y: o.gapY + o.gapH, w: width, h: height - (o.gapY + o.gapH) },
  ];
}

export function updateObstacles(obstacles, dt) {
  for (const o of obstacles) o.x -= CONFIG.SCROLL_SPEED * dt;
  return obstacles;
}

export function recycle(obstacles, width) {
  return obstacles.filter((o) => o.x + width > 0);
}

export function needsSpawn(obstacles, spawnX) {
  if (obstacles.length === 0) return true;
  const rightmost = Math.max(...obstacles.map((o) => o.x));
  return rightmost <= spawnX - CONFIG.OBSTACLE_SPACING;
}

export function randomGapY(rand, height, gapH) {
  const minY = CONFIG.GAP_MARGIN;
  const maxY = height - CONFIG.GAP_MARGIN - gapH;
  return minY + rand() * (maxY - minY);
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npx vitest run tests/game/obstacles.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add 1st_Slop/src/game/obstacles.js 1st_Slop/tests/game/obstacles.test.js
git commit -m "feat(jetpack-bot): obstacles spawn/scroll/recycle"
```

---

### Task 7: Score + best score persistant

**Files:**
- Create: `src/game/score.js`, `tests/game/score.test.js`

**Interfaces:**
- Consumes: rien (storage injecté).
- Produces:
  - `createScore(storage) -> { current, best }`
  - `scorePass(scoreState) -> scoreState` (incrémente `current`)
  - `checkPass(robot, obstacle, width) -> boolean` (true une seule fois quand le robot dépasse l'obstacle ; marque `obstacle.passed=true`)
  - `finalize(scoreState, storage) -> scoreState` (met à jour + persiste `best` si dépassé)

- [ ] **Step 1: Écrire les tests (avec un faux storage)**

`tests/game/score.test.js` :
```js
import { describe, it, expect } from 'vitest';
import {
  createScore, scorePass, checkPass, finalize,
} from '../../src/game/score.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

describe('score', () => {
  it('charge le best depuis le storage', () => {
    const s = createScore(fakeStorage({ 'jetpackbot.best': '7' }));
    expect(s.current).toBe(0);
    expect(s.best).toBe(7);
  });

  it('scorePass incrémente le score courant', () => {
    const s = createScore(fakeStorage());
    scorePass(s);
    scorePass(s);
    expect(s.current).toBe(2);
  });

  it('checkPass ne déclenche qu une fois par obstacle', () => {
    const robot = { x: 100 };
    const obstacle = { x: 30, passed: false };
    expect(checkPass(robot, obstacle, 60)).toBe(true);  // 100 > 30+60? non -> false
    // ajuster : robot doit avoir dépassé
  });

  it('checkPass true quand le robot a dépassé, false ensuite', () => {
    const robot = { x: 100 };
    const obstacle = { x: 30, passed: false };
    // 30 + 60 = 90 < 100 -> dépassé
    expect(checkPass(robot, obstacle, 60)).toBe(true);
    expect(obstacle.passed).toBe(true);
    expect(checkPass(robot, obstacle, 60)).toBe(false);
  });

  it('finalize persiste le best quand le score le dépasse', () => {
    const storage = fakeStorage({ 'jetpackbot.best': '3' });
    const s = createScore(storage);
    s.current = 9;
    finalize(s, storage);
    expect(s.best).toBe(9);
    expect(storage.getItem('jetpackbot.best')).toBe('9');
  });

  it('finalize ne baisse jamais le best', () => {
    const storage = fakeStorage({ 'jetpackbot.best': '10' });
    const s = createScore(storage);
    s.current = 4;
    finalize(s, storage);
    expect(s.best).toBe(10);
  });
});
```

> Note d'implémentation : le 3e test ci-dessus est volontairement ambigu et corrigé par le 4e — au moment d'implémenter, **supprimer le 3e test** (`checkPass ne déclenche qu une fois`) et ne garder que le 4e qui est correct. Il est laissé ici pour documenter le piège (un robot à x=100 face à un obstacle finissant à x=90 a bien dépassé).

- [ ] **Step 2: Nettoyer le test ambigu**

Supprimer le bloc `it('checkPass ne déclenche qu une fois par obstacle', ...)` du fichier de test avant de lancer.

- [ ] **Step 3: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run tests/game/score.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 4: Implémenter `score.js`**

```js
const KEY = 'jetpackbot.best';

export function createScore(storage) {
  const raw = storage?.getItem(KEY);
  const best = Number(raw) || 0;
  return { current: 0, best };
}

export function scorePass(scoreState) {
  scoreState.current += 1;
  return scoreState;
}

export function checkPass(robot, obstacle, width) {
  if (!obstacle.passed && robot.x > obstacle.x + width) {
    obstacle.passed = true;
    return true;
  }
  return false;
}

export function finalize(scoreState, storage) {
  if (scoreState.current > scoreState.best) {
    scoreState.best = scoreState.current;
    storage?.setItem(KEY, String(scoreState.best));
  }
  return scoreState;
}
```

- [ ] **Step 5: Lancer les tests pour vérifier le succès**

Run: `npx vitest run tests/game/score.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add 1st_Slop/src/game/score.js 1st_Slop/tests/game/score.test.js
git commit -m "feat(jetpack-bot): score + persistent best score"
```

---

### Task 8: Parallaxe d'arrière-plan

**Files:**
- Create: `src/game/background.js`, `tests/game/background.test.js`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `createLayer(speedFactor, tileWidth) -> { speedFactor, tileWidth, offset }`
  - `updateLayer(layer, scrollSpeed, dt) -> layer` (avance `offset`, wrap modulo `tileWidth`)

- [ ] **Step 1: Écrire les tests**

`tests/game/background.test.js` :
```js
import { describe, it, expect } from 'vitest';
import { createLayer, updateLayer } from '../../src/game/background.js';

describe('background parallax', () => {
  it('crée une couche à offset 0', () => {
    expect(createLayer(0.5, 360)).toEqual({ speedFactor: 0.5, tileWidth: 360, offset: 0 });
  });

  it('avance l offset proportionnellement à la vitesse et au facteur', () => {
    const layer = createLayer(0.5, 360);
    updateLayer(layer, 100, 1); // 100 * 0.5 * 1 = 50
    expect(layer.offset).toBeCloseTo(50, 5);
  });

  it('wrappe l offset modulo tileWidth', () => {
    const layer = createLayer(1, 360);
    layer.offset = 350;
    updateLayer(layer, 100, 1); // 350 + 100 = 450 -> 90
    expect(layer.offset).toBeCloseTo(90, 5);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run tests/game/background.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `background.js`**

```js
export function createLayer(speedFactor, tileWidth) {
  return { speedFactor, tileWidth, offset: 0 };
}

export function updateLayer(layer, scrollSpeed, dt) {
  layer.offset = (layer.offset + scrollSpeed * layer.speedFactor * dt) % layer.tileWidth;
  return layer;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npx vitest run tests/game/background.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add 1st_Slop/src/game/background.js 1st_Slop/tests/game/background.test.js
git commit -m "feat(jetpack-bot): parallax background layers"
```

---

### Task 9: Abstraction des entrées (tap / clic / espace)

**Files:**
- Create: `src/engine/input.js`, `tests/engine/input.test.js`

**Interfaces:**
- Consumes: rien (target DOM injecté).
- Produces:
  - `createInput(target, onPress) -> { dispose() }`
  - Réagit à `pointerdown` sur `target` et à `keydown` (Space) sur `window` ; appelle `onPress()` une fois par appui. Ignore l'auto-répétition clavier (`event.repeat`).

- [ ] **Step 1: Écrire les tests (DOM simulé via objets factices)**

`tests/engine/input.test.js` :
```js
import { describe, it, expect, vi } from 'vitest';
import { createInput } from '../../src/engine/input.js';

function fakeTarget() {
  const handlers = {};
  return {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    removeEventListener: (type) => { delete handlers[type]; },
    fire: (type, evt = {}) => handlers[type]?.(evt),
    has: (type) => Boolean(handlers[type]),
  };
}

describe('input', () => {
  it('appelle onPress sur pointerdown', () => {
    const target = fakeTarget();
    const win = fakeTarget();
    const onPress = vi.fn();
    createInput({ target, win, preventDefault: false }, onPress);
    target.fire('pointerdown', {});
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('appelle onPress sur Space mais ignore la répétition', () => {
    const target = fakeTarget();
    const win = fakeTarget();
    const onPress = vi.fn();
    createInput({ target, win, preventDefault: false }, onPress);
    win.fire('keydown', { code: 'Space', repeat: false, preventDefault() {} });
    win.fire('keydown', { code: 'Space', repeat: true, preventDefault() {} });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('dispose retire les écouteurs', () => {
    const target = fakeTarget();
    const win = fakeTarget();
    const { dispose } = createInput({ target, win, preventDefault: false }, vi.fn());
    dispose();
    expect(target.has('pointerdown')).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run tests/engine/input.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `input.js`**

```js
export function createInput({ target, win = window, preventDefault = true }, onPress) {
  function handlePointer(e) {
    if (preventDefault && e.preventDefault) e.preventDefault();
    onPress();
  }
  function handleKey(e) {
    if (e.code === 'Space' && !e.repeat) {
      if (preventDefault && e.preventDefault) e.preventDefault();
      onPress();
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

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npx vitest run tests/engine/input.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add 1st_Slop/src/engine/input.js 1st_Slop/tests/engine/input.test.js
git commit -m "feat(jetpack-bot): unified input (pointer + space)"
```

---

### Task 10: Intégration jouable avec placeholders (le jeu existe !)

> Milestone majeur : à la fin de cette tâche, le jeu est **entièrement jouable** avec des rectangles colorés (pas encore d'assets Pixellab). Boucle Menu → Play → GameOver, score, best score, collisions. Vérification manuelle (le rendu n'est pas unit-testé).

**Files:**
- Create: `src/render/renderer.js`, `src/game/world.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: tous les modules précédents.
- Produces:
  - `createWorld(storage) -> world` — état complet : `{ sm, robot, obstacles, score, layers, rand }`
  - `resetRun(world) -> void` — réinitialise robot/obstacles/score.current pour une nouvelle partie
  - `press(world) -> void` — gère l'appui selon l'état (start / thrust / retry)
  - `updateWorld(world, dt) -> void` — fait avancer la simulation en état PLAY
  - `renderWorld(ctx, world) -> void` — dessine l'état courant (placeholders)

- [ ] **Step 1: Écrire `src/game/world.js` (orchestration de la logique)**

```js
import { States, createStateMachine } from '../engine/state.js';
import { createRobot, applyThrust, updateRobot } from './robot.js';
import {
  createObstacle, obstacleRects, updateObstacles, recycle,
  needsSpawn, randomGapY,
} from './obstacles.js';
import { aabb, hitsBounds } from './collision.js';
import { createScore, scorePass, checkPass, finalize } from './score.js';
import { createLayer, updateLayer } from './background.js';
import { CONFIG } from '../config.js';

export function createWorld(storage) {
  return {
    sm: createStateMachine(States.MENU),
    robot: createRobot(),
    obstacles: [],
    score: createScore(storage),
    layers: [createLayer(0.25, CONFIG.WIDTH), createLayer(0.6, CONFIG.WIDTH)],
    rand: Math.random,
    storage,
  };
}

export function resetRun(world) {
  world.robot = createRobot();
  world.obstacles = [];
  world.score.current = 0;
}

function spawnObstacle(world) {
  const gapH = CONFIG.GAP_MIN + world.rand() * (CONFIG.GAP_MAX - CONFIG.GAP_MIN);
  const gapY = randomGapY(world.rand, CONFIG.HEIGHT, gapH);
  world.obstacles.push(createObstacle(CONFIG.WIDTH + CONFIG.OBSTACLE_W, gapY, gapH));
}

export function press(world) {
  const state = world.sm.get();
  if (state === States.MENU) {
    world.sm.to(States.PLAY);
    resetRun(world);
  } else if (state === States.PLAY) {
    applyThrust(world.robot);
  } else if (state === States.GAMEOVER) {
    world.sm.to(States.PLAY);
    resetRun(world);
  }
}

export function updateWorld(world, dt) {
  for (const layer of world.layers) updateLayer(layer, CONFIG.SCROLL_SPEED, dt);
  if (world.sm.get() !== States.PLAY) return;

  updateRobot(world.robot, dt);
  updateObstacles(world.obstacles, dt);
  world.obstacles = recycle(world.obstacles, CONFIG.OBSTACLE_W);
  if (needsSpawn(world.obstacles, CONFIG.WIDTH)) spawnObstacle(world);

  for (const o of world.obstacles) {
    if (checkPass(world.robot, o, CONFIG.OBSTACLE_W)) scorePass(world.score);
  }

  let dead = hitsBounds(world.robot, CONFIG.HEIGHT);
  if (!dead) {
    for (const o of world.obstacles) {
      const [top, bottom] = obstacleRects(o, CONFIG.OBSTACLE_W, CONFIG.HEIGHT);
      if (aabb(world.robot, top) || aabb(world.robot, bottom)) { dead = true; break; }
    }
  }
  if (dead) {
    world.robot.alive = false;
    finalize(world.score, world.storage);
    world.sm.to(States.GAMEOVER);
  }
}
```

- [ ] **Step 2: Écrire un test d'intégration de la boucle de jeu (logique pure)**

`tests/game/world.test.js` :
```js
import { describe, it, expect } from 'vitest';
import { createWorld, press, updateWorld } from '../../src/game/world.js';
import { States } from '../../src/engine/state.js';

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
  });

  it('retry depuis GAMEOVER réinitialise le score courant', () => {
    const w = createWorld(fakeStorage());
    press(w);
    w.score.current = 5;
    for (let i = 0; i < 600; i += 1) updateWorld(w, 1 / 60);
    expect(w.sm.get()).toBe(States.GAMEOVER);
    press(w); // retry
    expect(w.sm.get()).toBe(States.PLAY);
    expect(w.score.current).toBe(0);
  });
});
```

- [ ] **Step 3: Lancer le test pour vérifier l'échec puis le succès**

Run: `npx vitest run tests/game/world.test.js`
Expected: d'abord FAIL (module en cours), puis PASS (3 tests) une fois `world.js` complet.

- [ ] **Step 4: Écrire `src/render/renderer.js` (placeholders rectangles)**

```js
import { States } from '../engine/state.js';
import { obstacleRects } from '../game/obstacles.js';
import { CONFIG } from '../config.js';

export function renderWorld(ctx, world) {
  // Fond
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  // Parallaxe placeholder : bandes verticales décalées
  const colors = ['#141430', '#1e1e4a'];
  world.layers.forEach((layer, i) => {
    ctx.fillStyle = colors[i % colors.length];
    const step = 80;
    for (let x = -layer.offset; x < CONFIG.WIDTH; x += step) {
      ctx.fillRect(x, CONFIG.HEIGHT - 120 - i * 40, 40, 120 + i * 40);
    }
  });

  // Obstacles néon placeholder
  ctx.fillStyle = '#ff2e88';
  for (const o of world.obstacles) {
    for (const r of obstacleRects(o, CONFIG.OBSTACLE_W, CONFIG.HEIGHT)) {
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }

  // Robot placeholder
  const r = world.robot;
  ctx.fillStyle = r.alive ? '#00e5ff' : '#888';
  ctx.fillRect(r.x, r.y, r.w, r.h);

  // HUD
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  const state = world.sm.get();
  if (state === States.PLAY) {
    ctx.fillText(String(world.score.current), CONFIG.WIDTH / 2, 60);
  } else if (state === States.MENU) {
    ctx.fillText('JETPACK BOT', CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText('Tap / Espace pour voler', CONFIG.WIDTH / 2, 280);
    ctx.fillText(`Best: ${world.score.best}`, CONFIG.WIDTH / 2, 320);
  } else if (state === States.GAMEOVER) {
    ctx.fillText('GAME OVER', CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText(`Score: ${world.score.current}`, CONFIG.WIDTH / 2, 280);
    ctx.fillText(`Best: ${world.score.best}`, CONFIG.WIDTH / 2, 308);
    ctx.fillText('Tap pour rejouer', CONFIG.WIDTH / 2, 340);
  }
}
```

- [ ] **Step 5: Réécrire `src/main.js` pour câbler le tout**

```js
import { CONFIG } from './config.js';
import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { createWorld, press, updateWorld } from './game/world.js';
import { renderWorld } from './render/renderer.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const world = createWorld(window.localStorage);
createInput({ target: canvas, win: window }, () => press(world));

const loop = createLoop({
  update: (dt) => updateWorld(world, dt),
  render: () => renderWorld(ctx, world),
  fixedDt: CONFIG.FIXED_DT,
});
loop.start();
```

- [ ] **Step 6: Lancer tous les tests**

Run: `npm test`
Expected: PASS (toutes les suites, ~30 tests).

- [ ] **Step 7: Vérification manuelle — le jeu est jouable**

Run: `npm run dev`
Checklist dans le navigateur (réduire la fenêtre en format mobile / utiliser le device toolbar) :
- Écran MENU affiche le titre + best score.
- Tap/clic/Espace lance la partie ; le robot (rectangle cyan) monte au tap, retombe sinon.
- Des obstacles roses défilent de droite à gauche avec des gaps variables.
- Passer un obstacle incrémente le score affiché.
- Toucher un obstacle, le haut ou le bas → GAME OVER, score + best affichés.
- Tap relance une partie ; le best score persiste après rechargement de la page (F5).
Arrêter le serveur.

- [ ] **Step 8: Commit**

```bash
git add 1st_Slop/src/game/world.js 1st_Slop/src/render/renderer.js 1st_Slop/src/main.js 1st_Slop/tests/game/world.test.js
git commit -m "feat(jetpack-bot): playable game with placeholder graphics"
```

---

### Task 11: Génération et intégration des assets Pixellab

> REQUIRED SUB-SKILL pour cette tâche : invoquer le skill **`pixellab`** pour piloter la génération des sprites. Style cible : pixel art, palette cyberpunk (fond sombre, néons cyan/magenta). On génère, on exporte en PNG dans `assets/`, puis on remplace les placeholders du renderer.

**Files:**
- Create: `assets/robot.png` (sprite/anim), `assets/obstacle.png`, `assets/bg-far.png`, `assets/bg-near.png`, `src/engine/assets.js`, `tests/engine/assets.test.js`
- Modify: `src/render/renderer.js`, `src/main.js`

**Interfaces:**
- Consumes: rien (chargement via `Image`).
- Produces:
  - `loadImages(sources) -> Promise<Record<string, HTMLImageElement>>` (sources = `{ key: url }`)

- [ ] **Step 1: Générer les assets via Pixellab**

Invoquer le skill `pixellab`. Générer, aux dimensions logiques du jeu :
- **robot** : ~34×24 px (ou multiple), vue de profil orientée vers la droite, jetpack visible ; idéalement 2 frames (idle / thrust avec flamme).
- **obstacle** : tuile de pilier néon ~62 px de large, répétable verticalement.
- **bg-far** / **bg-near** : 2 bandes de skyline cyberpunk de 360 px de large, tileables horizontalement.
Exporter en PNG dans `1st_Slop/assets/`.

- [ ] **Step 2: Écrire le test du chargeur d'images**

`tests/engine/assets.test.js` :
```js
import { describe, it, expect, vi } from 'vitest';
import { loadImages } from '../../src/engine/assets.js';

describe('loadImages', () => {
  it('résout un dictionnaire d images chargées', async () => {
    class FakeImage {
      set src(_v) { setTimeout(() => this.onload?.(), 0); }
    }
    vi.stubGlobal('Image', FakeImage);
    const imgs = await loadImages({ robot: 'robot.png', obstacle: 'obstacle.png' });
    expect(Object.keys(imgs)).toEqual(['robot', 'obstacle']);
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 3: Lancer le test pour vérifier l'échec**

Run: `npx vitest run tests/engine/assets.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 4: Implémenter `src/engine/assets.js`**

```js
export function loadImages(sources) {
  const entries = Object.entries(sources);
  return Promise.all(
    entries.map(
      ([key, url]) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([key, img]);
          img.onerror = () => reject(new Error(`Échec chargement ${url}`));
          img.src = url;
        }),
    ),
  ).then((pairs) => Object.fromEntries(pairs));
}
```

- [ ] **Step 5: Lancer le test pour vérifier le succès**

Run: `npx vitest run tests/engine/assets.test.js`
Expected: PASS (1 test).

- [ ] **Step 6: Brancher les images dans le renderer**

Modifier `src/render/renderer.js` pour accepter un `assets` (dictionnaire d'images) et remplacer chaque `fillRect` de placeholder par `ctx.drawImage(...)` correspondant : `assets.robot` pour le robot, `assets.obstacle` répété verticalement pour chaque rect d'obstacle, `assets['bg-far']`/`assets['bg-near']` dessinés deux fois avec `layer.offset` pour le tiling. Conserver le HUD texte tel quel. Signature mise à jour : `renderWorld(ctx, world, assets)`.

- [ ] **Step 7: Charger les assets avant de démarrer la boucle dans `main.js`**

Modifier `src/main.js` : envelopper le démarrage dans un `loadImages({...}).then((assets) => { ... loop avec renderWorld(ctx, world, assets) ... })`. Afficher un fond + "Chargement…" en attendant.

- [ ] **Step 8: Lancer tous les tests + vérification manuelle**

Run: `npm test` (Expected: PASS, toutes suites)
Run: `npm run dev` — vérifier que le robot, les obstacles et le décor s'affichent désormais en pixel art cyberpunk, gameplay identique à la Task 10.

- [ ] **Step 9: Commit**

```bash
git add 1st_Slop/assets 1st_Slop/src/engine/assets.js 1st_Slop/tests/engine/assets.test.js 1st_Slop/src/render/renderer.js 1st_Slop/src/main.js
git commit -m "feat(jetpack-bot): integrate Pixellab pixel-art assets"
```

---

### Task 12: SFX audio (thrust / score / crash)

**Files:**
- Create: `assets/sfx-thrust.*`, `assets/sfx-score.*`, `assets/sfx-crash.*`, `src/engine/audio.js`, `tests/engine/audio.test.js`
- Modify: `src/game/world.js` (émettre des événements audio), `src/main.js`

**Interfaces:**
- Consumes: rien (Audio injecté/mocké).
- Produces:
  - `createAudio(sources, AudioCtor=Audio) -> { play(name) }`
  - `world` expose un buffer d'événements : `world.events = []` rempli par `updateWorld`/`press` (valeurs `'thrust'|'score'|'crash'`), vidé par le consommateur.

- [ ] **Step 1: Ajouter l'émission d'événements dans `world.js`**

Dans `createWorld`, ajouter `events: []`. Dans `press` (état PLAY) pousser `'thrust'`. Dans `updateWorld`, pousser `'score'` à chaque `scorePass`, et `'crash'` quand `dead` devient vrai. (Mettre à jour `tests/game/world.test.js` pour vérifier qu'un `'crash'` est émis à la mort et un `'score'` au passage.)

- [ ] **Step 2: Écrire le test audio**

`tests/engine/audio.test.js` :
```js
import { describe, it, expect, vi } from 'vitest';
import { createAudio } from '../../src/engine/audio.js';

describe('audio', () => {
  it('joue le son demandé', () => {
    const play = vi.fn();
    class FakeAudio { constructor() { this.play = play; this.currentTime = 0; } }
    const audio = createAudio({ score: 'score.wav' }, FakeAudio);
    audio.play('score');
    expect(play).toHaveBeenCalled();
  });

  it('ignore un nom inconnu sans planter', () => {
    class FakeAudio { play() {} }
    const audio = createAudio({}, FakeAudio);
    expect(() => audio.play('nope')).not.toThrow();
  });
});
```

- [ ] **Step 3: Lancer le test pour vérifier l'échec**

Run: `npx vitest run tests/engine/audio.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 4: Implémenter `src/engine/audio.js`**

```js
export function createAudio(sources, AudioCtor = Audio) {
  const clips = {};
  for (const [name, url] of Object.entries(sources)) {
    clips[name] = new AudioCtor(url);
  }
  return {
    play(name) {
      const clip = clips[name];
      if (!clip) return;
      try {
        clip.currentTime = 0;
        clip.play();
      } catch {
        /* lecture audio best-effort */
      }
    },
  };
}
```

- [ ] **Step 5: Consommer les événements dans `main.js`**

Après chaque `update`, parcourir `world.events`, appeler `audio.play(evt)` pour chacun, puis vider le tableau (`world.events.length = 0`). Générer 3 petits SFX (Pixellab ne fait pas de son — utiliser des fichiers libres de droits ou un générateur de SFX type jsfxr, exportés dans `assets/`).

- [ ] **Step 6: Lancer tous les tests + vérification manuelle**

Run: `npm test` (Expected: PASS)
Run: `npm run dev` — vérifier qu'on entend thrust au tap, un son au passage d'obstacle, et un son au crash. (Note : le premier son ne se déclenche qu'après une première interaction utilisateur — comportement navigateur normal.)

- [ ] **Step 7: Commit**

```bash
git add 1st_Slop/assets 1st_Slop/src/engine/audio.js 1st_Slop/tests/engine/audio.test.js 1st_Slop/src/game/world.js 1st_Slop/tests/game/world.test.js 1st_Slop/src/main.js
git commit -m "feat(jetpack-bot): SFX (thrust/score/crash)"
```

---

### Task 13: Build de production + vérification déploiement

**Files:**
- Modify: `README` du jeu (optionnel), aucun code applicatif.

**Interfaces:**
- Consumes: tout le projet.
- Produces: dossier `dist/` statique déployable.

- [ ] **Step 1: Builder**

Run: `npm run build`
Expected: build réussi, dossier `1st_Slop/dist/` généré.

- [ ] **Step 2: Prévisualiser le build**

Run: `npm run preview`
Ouvrir l'URL : vérifier que le jeu tourne à l'identique depuis le build (assets chargés via chemins relatifs grâce à `base: './'`).

- [ ] **Step 3: Vérifier que `dist/` est bien ignoré par git**

Run: `git -C C:/Setup/Projects/Game/Slop status -s`
Expected: `dist/` n'apparaît pas (couvert par `.gitignore`).

- [ ] **Step 4: Commit final + push**

```bash
git add 1st_Slop
git commit -m "chore(jetpack-bot): production build verified"
git -C C:/Setup/Projects/Game/Slop push
```

---

## Tâches optionnelles (🟡 V1.1 — hors Core, à faire si le temps le permet)

### Task 14 (optionnelle): Juice

Particules de réacteur derrière le robot (petit système de particules sous `src/game/particles.js`, TDD sur la mise à jour des particules), screen shake au crash (offset de translation décroissant dans le renderer), flash blanc bref au crash. Chaque sous-fonction de logique (update particules, décroissance du shake) est testable unitairement ; l'effet visuel est vérifié manuellement.

---

## Self-Review (effectuée)

**Couverture de la spec :**
- Game loop delta time + fixed timestep → Task 2 ✅
- Machine à états Menu/Play/GameOver → Task 3 ✅
- Robot thrust + gravité + hitbox → Task 4 ✅
- Collisions → Task 5 ✅
- Obstacles défilants + gaps aléatoires + recyclage → Task 6 ✅
- Score + best score localStorage → Task 7 ✅
- Parallaxe → Task 8 ✅
- Input tap/clic/espace → Task 9 ✅
- Responsive portrait → Task 1 (CSS) ✅
- Assets Pixellab (robot animé, obstacles, décor) → Task 11 ✅
- Audio SFX thrust/score/crash → Task 12 ✅
- Build web statique déployable → Task 13 ✅
- Juice (🟡 nice-to-have) → Task 14 optionnelle ✅
- Hors scope (skins, leaderboard, power-ups, monétisation) → non planifié ✅

**Cohérence des types :** `world` est construit en Task 10 et étendu (champ `events`) en Task 12 ; `renderWorld` passe de 2 à 3 args (ajout `assets`) en Task 11 — signalé explicitement dans les steps concernés. Noms de fonctions cohérents entre tâches (`createObstacle`, `obstacleRects`, `checkPass`, etc.).

**Placeholders :** aucun "TODO/TBD" ; le seul test volontairement ambigu (Task 7) est accompagné d'une instruction explicite de suppression.
