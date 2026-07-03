# Infinite Difficulty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Objectif de portes croissant (10 +5/niveau, plafond 30) et motifs de portes de plus en plus durs débloqués par tiers de niveaux, calibrés sur la physique du robot.

**Architecture:** `level.js` étend `difficultyForLevel` (spacing, capacités physiques `deltaUp`/`deltaDown`, tier) ; nouveau module pur `patterns.js` (5 motifs = fonctions `(rand, prevGapY, diff) → salve de portes {gapY, gapH, spacing}`, pool par tier) ; `world.js` consomme les salves via une file au spawn. Zéro changement de rendu.

**Tech Stack:** Vanilla JS (ES modules), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-03-infinite-difficulty-design.md`

## Global Constraints

- Tout le code/commentaires en français, style du dépôt.
- Portes : `min(10 + 5×(niveau−1), 30)`.
- Spacing : `230 − 5×(niveau−1)`, plancher 175. (Le `SPACING_BASE` de la spec EST le `OBSTACLE_SPACING` existant — DRY, pas de constante dupliquée.)
- Capacités physiques (t = spacing/scrollSpeed) : `deltaUp = 0.55 × THRUST × t`, `deltaDown = 0.6 × (MAX_FALL×t − MAX_FALL²/(2×GRAVITY))`. Asymétrique exprès.
- Tiers : niveau 1→tier 1, 3→2, 5→3, 7→4, 10→5 (seuils `PATTERN_TIERS`).
- Toute porte : `gapY ∈ [GAP_MARGIN, HEIGHT − GAP_MARGIN − gapH]`. Jamais de motif injouable : c'est un invariant testé, pas une intention.
- Spacing réduit (COULOIR/CHICANE) jamais < 160 px absolu.
- Baseline de la branche : 227 tests verts.

---

### Task 1: Config + `level.js` — objectif croissant, tiers, difficulté étendue

**Files:**
- Modify: `src/config.js:63-72` (bloc « Niveaux & difficulté progressive »)
- Modify: `src/game/level.js` (réécriture complète, 30 lignes)
- Test: `tests/game/level.test.js` (réécriture complète)
- Modify: `tests/game/world.test.js` (3 références à `CONFIG.GATES_PER_LEVEL`, lignes ~57-87)

**Interfaces:**
- Consumes: `CONFIG` (THRUST 380, MAX_FALL 650, GRAVITY 1400, OBSTACLE_SPACING 230 existants).
- Produces: `gateGoalForLevel(level) -> number` ; `tierForLevel(level) -> 1..5` ; `difficultyForLevel(level) -> { scrollSpeed, gapMin, gapMax, spacing, deltaUp, deltaDown, tier }`. Tasks 2 et 3 consomment cet objet `diff` tel quel.

- [ ] **Step 1: Écrire les tests (rouge)**

Remplacer intégralement `tests/game/level.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { gateGoalForLevel, tierForLevel, difficultyForLevel } from '../../src/game/level.js';
import { CONFIG } from '../../src/config.js';

describe('gateGoalForLevel', () => {
  it('croît de 5 par niveau depuis 10 puis plafonne à 30', () => {
    expect(gateGoalForLevel(1)).toBe(10);
    expect(gateGoalForLevel(2)).toBe(15);
    expect(gateGoalForLevel(4)).toBe(25);
    expect(gateGoalForLevel(5)).toBe(30);
    expect(gateGoalForLevel(6)).toBe(30);
    expect(gateGoalForLevel(100)).toBe(30);
  });
});

describe('tierForLevel', () => {
  it('suit les seuils PATTERN_TIERS', () => {
    expect(tierForLevel(1)).toBe(1);
    expect(tierForLevel(2)).toBe(1);
    expect(tierForLevel(3)).toBe(2);
    expect(tierForLevel(5)).toBe(3);
    expect(tierForLevel(7)).toBe(4);
    expect(tierForLevel(9)).toBe(4);
    expect(tierForLevel(10)).toBe(5);
    expect(tierForLevel(1000)).toBe(5);
  });
});

describe('difficultyForLevel', () => {
  it('niveau 1 reproduit exactement les valeurs V1', () => {
    const d = difficultyForLevel(1);
    expect(d.scrollSpeed).toBe(CONFIG.SCROLL_SPEED);
    expect(d.gapMin).toBe(CONFIG.GAP_MIN);
    expect(d.gapMax).toBe(CONFIG.GAP_MAX);
    expect(d.spacing).toBe(CONFIG.OBSTACLE_SPACING);
    expect(d.tier).toBe(1);
  });

  it('la vitesse croît puis plafonne, le gap décroît puis plancher', () => {
    expect(difficultyForLevel(2).scrollSpeed).toBeGreaterThan(difficultyForLevel(1).scrollSpeed);
    expect(difficultyForLevel(1000).scrollSpeed).toBe(CONFIG.SPEED_MAX);
    expect(difficultyForLevel(2).gapMin).toBeLessThan(difficultyForLevel(1).gapMin);
    expect(difficultyForLevel(1000).gapMin).toBe(CONFIG.GAP_FLOOR);
  });

  it('le spacing décroît puis plancher à SPACING_FLOOR', () => {
    expect(difficultyForLevel(2).spacing).toBeLessThan(difficultyForLevel(1).spacing);
    expect(difficultyForLevel(1000).spacing).toBe(CONFIG.SPACING_FLOOR);
  });

  it('les capacités physiques suivent t = spacing/scrollSpeed', () => {
    const d1 = difficultyForLevel(1);
    const t1 = d1.spacing / d1.scrollSpeed;
    expect(d1.deltaUp).toBeCloseTo(CONFIG.SAFETY_UP * CONFIG.THRUST * t1, 5);
    expect(d1.deltaDown).toBeCloseTo(
      CONFIG.SAFETY_DOWN * (CONFIG.MAX_FALL * t1 - CONFIG.MAX_FALL ** 2 / (2 * CONFIG.GRAVITY)), 5);
    // plus on va vite, moins on peut bouger entre deux portes
    expect(difficultyForLevel(15).deltaUp).toBeLessThan(d1.deltaUp);
    expect(difficultyForLevel(15).deltaDown).toBeLessThan(d1.deltaDown);
    // les capacités restent strictement positives au taquet
    expect(difficultyForLevel(1000).deltaUp).toBeGreaterThan(0);
    expect(difficultyForLevel(1000).deltaDown).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/game/level.test.js`
Expected: FAIL — `tierForLevel` non exporté, `gateGoalForLevel(2)` renvoie 10, `spacing`/`deltaUp` undefined.

- [ ] **Step 3: Implémentation**

Dans `src/config.js`, remplacer le bloc « Niveaux & difficulté progressive » (la ligne `GATES_PER_LEVEL: 10,` disparaît) :

```js
  // Niveaux & difficulté progressive
  GATES_BASE: 10,    // portes du niveau 1
  GATES_STEP: 5,     // portes en plus par niveau
  GATES_CAP: 30,     // plafond de portes par niveau
  SPEED_BASE: 150,   // vitesse niveau 1 (= SCROLL_SPEED)
  SPEED_STEP: 12,    // gain de vitesse par niveau
  SPEED_MAX: 300,    // plafond de vitesse
  GAP_BASE: 160,     // gapMin niveau 1 (= GAP_MIN)
  GAP_SHRINK: 6,     // rétrécissement du gap par niveau
  GAP_FLOOR: 110,    // gap minimal absolu
  GAP_RANGE: 50,     // étendue aléatoire au-dessus de gapMin (= GAP_MAX - GAP_MIN)
  SPACING_STEP: 5,   // resserrement horizontal par niveau (base = OBSTACLE_SPACING)
  SPACING_FLOOR: 175, // espacement minimal absolu
  SAFETY_UP: 0.55,   // marge de sécurité sur la capacité de montée entre 2 portes
  SAFETY_DOWN: 0.6,  // idem descente (plus permissive : la gravité aide)
  PATTERN_TIERS: [1, 3, 5, 7, 10], // niveaux d'entrée des tiers de motifs
```

Remplacer intégralement `src/game/level.js` :

```js
import { CONFIG } from '../config.js';

export function gateGoalForLevel(level) {
  const n = Math.max(1, level) - 1;
  return Math.min(CONFIG.GATES_BASE + n * CONFIG.GATES_STEP, CONFIG.GATES_CAP);
}

export function tierForLevel(level) {
  let tier = 0;
  for (const seuil of CONFIG.PATTERN_TIERS) {
    if (level >= seuil) tier += 1;
  }
  return Math.max(1, tier);
}

export function difficultyForLevel(level) {
  const n = Math.max(1, level) - 1;
  const scrollSpeed = Math.min(CONFIG.SPEED_BASE + n * CONFIG.SPEED_STEP, CONFIG.SPEED_MAX);
  const gapMin = Math.max(CONFIG.GAP_BASE - n * CONFIG.GAP_SHRINK, CONFIG.GAP_FLOOR);
  const gapMax = gapMin + CONFIG.GAP_RANGE;
  const spacing = Math.max(CONFIG.OBSTACLE_SPACING - n * CONFIG.SPACING_STEP, CONFIG.SPACING_FLOOR);
  // Capacités physiques entre deux portes consécutives : ce qu'un robot peut
  // monter (taps maintenus) ou descendre (chute, moins la rampe d'accélération)
  // dans le temps de trajet t. Les motifs s'expriment en fractions de ces bornes.
  const t = spacing / scrollSpeed;
  const deltaUp = CONFIG.SAFETY_UP * CONFIG.THRUST * t;
  const deltaDown = CONFIG.SAFETY_DOWN * (CONFIG.MAX_FALL * t - CONFIG.MAX_FALL ** 2 / (2 * CONFIG.GRAVITY));
  return { scrollSpeed, gapMin, gapMax, spacing, deltaUp, deltaDown, tier: tierForLevel(level) };
}
```

Dans `tests/game/world.test.js`, ajouter l'import `gateGoalForLevel` et remplacer les 3 usages de `CONFIG.GATES_PER_LEVEL` (la constante n'existe plus) :

```js
import { gateGoalForLevel } from '../../src/game/level.js';
```

- ligne ~60 : `w.gatesThisLevel = gateGoalForLevel(w.level) - 1;`
- ligne ~72 : `w.gatesThisLevel = gateGoalForLevel(w.level);`
- ligne ~87 : `w.gatesThisLevel = gateGoalForLevel(w.level);`

- [ ] **Step 4: Vérifier le vert + non-régression**

Run: `npx vitest run tests/game/level.test.js tests/game/world.test.js` puis `npm test`
Expected: PASS partout (227 tests, dont les réécrits).

- [ ] **Step 5: Commit**

```bash
git add src/config.js src/game/level.js tests/game/level.test.js tests/game/world.test.js
git commit -m "feat(level): objectif de portes croissant (cap 30), tiers, difficulté étendue (spacing + capacités physiques)"
```

---

### Task 2: Module `patterns.js` — 5 motifs + sélection par tier

**Files:**
- Create: `src/game/patterns.js`
- Test: `tests/game/patterns.test.js`

**Interfaces:**
- Consumes: `CONFIG` (HEIGHT, GAP_MARGIN, GAP_FLOOR) et l'objet `diff` de Task 1 (`{ scrollSpeed, gapMin, gapMax, spacing, deltaUp, deltaDown, tier }`).
- Produces: `nextSalve(rand, prevGapY, diff) -> [{ gapY, gapH, spacing }]` (3-5 portes), les motifs nommés exportés `flow, escalier, zigzag, couloir, chicane` (même signature) et `POOLS` (tableau des pools par tier, exporté pour les tests). Task 3 consomme `nextSalve` et `flow`.

- [ ] **Step 1: Écrire les tests (rouge)**

Créer `tests/game/patterns.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { nextSalve, POOLS, flow, escalier, zigzag, couloir, chicane } from '../../src/game/patterns.js';
import { difficultyForLevel } from '../../src/game/level.js';
import { CONFIG } from '../../src/config.js';

// PRNG seedé local (mulberry32) — tests déterministes.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CENTRE = CONFIG.HEIGHT / 2;

function assertDansLesBornes(salve) {
  for (const g of salve) {
    expect(g.gapY).toBeGreaterThanOrEqual(CONFIG.GAP_MARGIN);
    expect(g.gapY).toBeLessThanOrEqual(CONFIG.HEIGHT - CONFIG.GAP_MARGIN - g.gapH);
  }
}

describe('motifs — bornes et formes', () => {
  const MOTIFS = { flow, escalier, zigzag, couloir, chicane };
  for (const [nom, motif] of Object.entries(MOTIFS)) {
    it(`${nom} reste dans l'écran à tous les niveaux`, () => {
      const rand = mulberry32(7);
      for (const level of [1, 3, 5, 7, 10, 15, 30]) {
        const diff = difficultyForLevel(level);
        for (let i = 0; i < 50; i += 1) assertDansLesBornes(motif(rand, CENTRE, diff));
      }
    });
  }

  it('flow produit 3 à 5 portes aux deltas doux', () => {
    const rand = mulberry32(1);
    const diff = difficultyForLevel(1);
    for (let i = 0; i < 100; i += 1) {
      const salve = flow(rand, CENTRE, diff);
      expect(salve.length).toBeGreaterThanOrEqual(3);
      expect(salve.length).toBeLessThanOrEqual(5);
      let prev = CENTRE;
      for (const g of salve) {
        const d = g.gapY - prev;
        expect(Math.abs(d)).toBeLessThanOrEqual(0.35 * Math.max(diff.deltaUp, diff.deltaDown) + 1e-9);
        prev = g.gapY;
      }
    }
  });

  it('escalier : 4 portes monotones (jamais de rebond au mur)', () => {
    const rand = mulberry32(2);
    for (const level of [3, 8, 15]) {
      const diff = difficultyForLevel(level);
      for (const depart of [CENTRE, 100, 420]) {
        for (let i = 0; i < 50; i += 1) {
          const salve = escalier(rand, depart, diff);
          expect(salve.length).toBe(4);
          let prev = depart;
          let signe = 0;
          for (const g of salve) {
            const d = g.gapY - prev;
            if (signe !== 0 && d !== 0) expect(d * signe).toBeGreaterThan(0); // monotone
            if (d !== 0) signe = d;
            prev = g.gapY;
          }
        }
      }
    }
  });

  it('zigzag : directions alternées (niveau 12, loin des bords)', () => {
    const rand = mulberry32(3);
    const diff = difficultyForLevel(12);
    for (let i = 0; i < 100; i += 1) {
      const salve = zigzag(rand, CENTRE, diff);
      expect(salve.length).toBe(4);
      let prev = CENTRE;
      let prevD = 0;
      for (const g of salve) {
        const d = g.gapY - prev;
        if (prevD !== 0) expect(d * prevD).toBeLessThan(0); // signe opposé
        prev = g.gapY;
        prevD = d;
      }
    }
  });

  it('couloir : 3 portes à ±10 px, gap serré, spacing réduit ≥ 160', () => {
    const rand = mulberry32(4);
    const diff = difficultyForLevel(8);
    for (let i = 0; i < 100; i += 1) {
      const salve = couloir(rand, CENTRE, diff);
      expect(salve.length).toBe(3);
      const base = salve[0].gapY;
      for (const g of salve) {
        expect(Math.abs(g.gapY - base)).toBeLessThanOrEqual(20);
        expect(g.gapH).toBe(Math.max(CONFIG.GAP_FLOOR, diff.gapMin - 15));
        expect(g.spacing).toBeCloseTo(Math.max(160, diff.spacing * 0.9), 5);
      }
    }
  });

  it('chicane : 4-5 portes, spacing réduit ≥ 160', () => {
    const rand = mulberry32(5);
    const diff = difficultyForLevel(12);
    for (let i = 0; i < 100; i += 1) {
      const salve = chicane(rand, CENTRE, diff);
      expect(salve.length).toBeGreaterThanOrEqual(4);
      expect(salve.length).toBeLessThanOrEqual(5);
      for (const g of salve) expect(g.spacing).toBeCloseTo(Math.max(160, diff.spacing * 0.85), 5);
    }
  });
});

describe('nextSalve — sélection par tier', () => {
  it('tier 1 : uniquement des salves douces (flow)', () => {
    const rand = mulberry32(6);
    const diff = difficultyForLevel(1);
    for (let i = 0; i < 50; i += 1) {
      let prev = CENTRE;
      for (const g of nextSalve(rand, prev, diff)) {
        expect(Math.abs(g.gapY - prev)).toBeLessThanOrEqual(0.35 * Math.max(diff.deltaUp, diff.deltaDown) + 1e-9);
        prev = g.gapY;
      }
    }
  });

  it('les pools par tier ajoutent chacun leur nouveauté', () => {
    expect(POOLS.length).toBe(5);
    expect(POOLS[0]).toEqual([flow]);
    expect(POOLS[1]).toEqual([flow, escalier]);
    expect(POOLS[2]).toEqual([flow, escalier, zigzag]);
    expect(POOLS[3]).toEqual([flow, escalier, zigzag, couloir]);
    expect(POOLS[4]).toEqual([flow, escalier, zigzag, couloir, chicane]);
  });

  it('le motif le plus récent du tier pèse double (sélection au 1er tirage)', () => {
    // rand stub : le 1er appel pilote la sélection, la suite génère le motif.
    const seq = (premier) => {
      let done = false;
      const suite = mulberry32(11);
      return () => (done ? suite() : ((done = true), premier));
    };
    const diff = difficultyForLevel(3); // tier 2, pool pondéré [flow, escalier, escalier]
    // index 0 (rand < 1/3) -> flow : deltas doux
    const sFlow = nextSalve(seq(0.1), CENTRE, diff);
    let prev = CENTRE;
    for (const g of sFlow) {
      expect(Math.abs(g.gapY - prev)).toBeLessThanOrEqual(0.35 * Math.max(diff.deltaUp, diff.deltaDown) + 1e-9);
      prev = g.gapY;
    }
    // index 1 et 2 (les DEUX tiers hauts du tirage) -> escalier : 4 portes monotones
    for (const premier of [0.5, 0.9]) {
      const salve = nextSalve(seq(premier), CENTRE, diff);
      expect(salve.length).toBe(4);
      const d1 = salve[0].gapY - CENTRE;
      const d2 = salve[1].gapY - salve[0].gapY;
      expect(d1 * d2).toBeGreaterThan(0); // monotone = signature escalier
    }
  });

  it('déterminisme : même seed → mêmes salves', () => {
    const diff = difficultyForLevel(10);
    const a = [];
    const b = [];
    const ra = mulberry32(9);
    const rb = mulberry32(9);
    for (let i = 0; i < 20; i += 1) {
      a.push(nextSalve(ra, CENTRE, diff));
      b.push(nextSalve(rb, CENTRE, diff));
    }
    expect(a).toEqual(b);
  });
});

describe('invariant de jouabilité', () => {
  it('aucun couple de portes consécutives n\'excède les capacités physiques brutes', () => {
    const rand = mulberry32(42);
    for (let level = 1; level <= 20; level += 1) {
      const diff = difficultyForLevel(level);
      let prev = CONFIG.HEIGHT / 2;
      for (let s = 0; s < 200; s += 1) {
        for (const g of nextSalve(rand, prev, diff)) {
          const t = g.spacing / diff.scrollSpeed;
          const upCap = CONFIG.THRUST * t;
          const downCap = CONFIG.MAX_FALL * t - CONFIG.MAX_FALL ** 2 / (2 * CONFIG.GRAVITY);
          const d = g.gapY - prev;
          if (d < 0) expect(-d).toBeLessThanOrEqual(upCap);
          else expect(d).toBeLessThanOrEqual(downCap);
          prev = g.gapY;
        }
      }
    }
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/game/patterns.test.js`
Expected: FAIL — module `src/game/patterns.js` introuvable.

- [ ] **Step 3: Implémentation**

Créer `src/game/patterns.js` :

```js
import { CONFIG } from '../config.js';

// Motifs de portes. Chaque motif est une fonction pure
// (rand, prevGapY, diff) -> salve, où une salve = [{ gapY, gapH, spacing }].
// Les deltas s'expriment en fractions des capacités physiques du niveau
// (diff.deltaUp / diff.deltaDown) : un motif est calibré à la vitesse courante.
// prevGapY = gapY de la dernière porte déjà en jeu.

function randRange(rand, min, max) {
  return min + rand() * (max - min);
}

function randGapH(rand, diff) {
  return randRange(rand, diff.gapMin, diff.gapMax);
}

function clampGapY(gapY, gapH) {
  const minY = CONFIG.GAP_MARGIN;
  const maxY = CONFIG.HEIGHT - CONFIG.GAP_MARGIN - gapH;
  return Math.max(minY, Math.min(maxY, gapY));
}

// Avance d'un delta signé (négatif = vers le haut), clampé à l'écran.
// Si le clamp écrase plus de la moitié du mouvement voulu, on miroite la
// direction : le motif reste vivant près des bords au lieu de s'y coller.
function step(prevGapY, delta, gapH) {
  const cible = prevGapY + delta;
  const clampee = clampGapY(cible, gapH);
  if (clampee !== cible && Math.abs(clampee - prevGapY) < Math.abs(delta) / 2) {
    return clampGapY(prevGapY - delta, gapH);
  }
  return clampee;
}

// Tire un delta signé : fraction [fMin, fMax] de la capacité directionnelle.
function tirerDelta(rand, up, diff, fMin, fMax) {
  const cap = up ? diff.deltaUp : diff.deltaDown;
  return (up ? -1 : 1) * randRange(rand, fMin, fMax) * cap;
}

// FLOW — marche aléatoire douce (tier 1) : deltas ≤ 0.35 × capacité.
export function flow(rand, prevGapY, diff) {
  const count = 3 + Math.floor(rand() * 3);
  const salve = [];
  let y = prevGapY;
  for (let i = 0; i < count; i += 1) {
    const gapH = randGapH(rand, diff);
    y = step(y, tirerDelta(rand, rand() < 0.5, diff, 0, 0.35), gapH);
    salve.push({ gapY: y, gapH, spacing: diff.spacing });
  }
  return salve;
}

// ESCALIER — 4 portes monotones (tier 2) : pas de 0.5-0.7 × capacité, borné
// par la place disponible (room/4) pour que l'escalier ne tape jamais le mur —
// monotonie garantie, direction = côté qui a le plus de piste.
export function escalier(rand, prevGapY, diff) {
  const roomHaut = prevGapY - CONFIG.GAP_MARGIN;
  const roomBas = CONFIG.HEIGHT - CONFIG.GAP_MARGIN - diff.gapMax - prevGapY;
  const up = roomHaut === roomBas ? rand() < 0.5 : roomHaut > roomBas;
  const room = Math.max(0, up ? roomHaut : roomBas);
  const salve = [];
  let y = prevGapY;
  for (let i = 0; i < 4; i += 1) {
    const gapH = randGapH(rand, diff);
    const cap = up ? diff.deltaUp : diff.deltaDown;
    const pas = Math.min(randRange(rand, 0.5, 0.7) * cap, room / 4);
    y = step(y, (up ? -1 : 1) * pas, gapH);
    salve.push({ gapY: y, gapH, spacing: diff.spacing });
  }
  return salve;
}

// ZIGZAG — 4 portes en alternance forcée (tier 3) : 0.6-1.0 × capacité.
export function zigzag(rand, prevGapY, diff) {
  const salve = [];
  let y = prevGapY;
  let up = rand() < 0.5;
  for (let i = 0; i < 4; i += 1) {
    const gapH = randGapH(rand, diff);
    y = step(y, tirerDelta(rand, up, diff, 0.6, 1.0), gapH);
    salve.push({ gapY: y, gapH, spacing: diff.spacing });
    up = !up;
  }
  return salve;
}

// COULOIR — 3 portes à même hauteur, gap serré, spacing réduit (tier 4).
export function couloir(rand, prevGapY, diff) {
  const gapH = Math.max(CONFIG.GAP_FLOOR, diff.gapMin - 15);
  const spacing = Math.max(160, diff.spacing * 0.9);
  const base = clampGapY(prevGapY, gapH);
  const salve = [];
  for (let i = 0; i < 3; i += 1) {
    salve.push({ gapY: clampGapY(base + randRange(rand, -10, 10), gapH), gapH, spacing });
  }
  return salve;
}

// CHICANE — zigzag ample + spacing réduit (tier 5). Les capacités sont
// calculées sur le spacing plein du niveau : avec le spacing réduit à 85 %,
// la marge SAFETY (0.55/0.6) garde le motif largement passable (~0.65 × la
// capacité brute réelle) — couvert par le test d'invariant de jouabilité.
export function chicane(rand, prevGapY, diff) {
  const count = 4 + Math.floor(rand() * 2);
  const spacing = Math.max(160, diff.spacing * 0.85);
  const salve = [];
  let y = prevGapY;
  let up = rand() < 0.5;
  for (let i = 0; i < count; i += 1) {
    const gapH = randGapH(rand, diff);
    y = step(y, tirerDelta(rand, up, diff, 0.7, 1.0), gapH);
    salve.push({ gapY: y, gapH, spacing });
    up = !up;
  }
  return salve;
}

export const POOLS = [
  [flow],
  [flow, escalier],
  [flow, escalier, zigzag],
  [flow, escalier, zigzag, couloir],
  [flow, escalier, zigzag, couloir, chicane],
];

// Tire un motif dans le pool du tier ; le plus récent pèse double pour que
// le joueur rencontre souvent la nouveauté de son palier.
export function nextSalve(rand, prevGapY, diff) {
  const pool = POOLS[Math.min(diff.tier, POOLS.length) - 1];
  const pondere = pool.length > 1 ? [...pool, pool[pool.length - 1]] : pool;
  const motif = pondere[Math.floor(rand() * pondere.length)];
  return motif(rand, prevGapY, diff);
}
```

- [ ] **Step 4: Vérifier le vert + non-régression**

Run: `npx vitest run tests/game/patterns.test.js` puis `npm test`
Expected: PASS partout (tous les tests sont déterministes — seeds fixes ou stubs).

- [ ] **Step 5: Commit**

```bash
git add src/game/patterns.js tests/game/patterns.test.js
git commit -m "feat(patterns): 5 motifs de portes calibrés physique + sélection par tier"
```

---

### Task 3: Intégration — `world.js` consomme les salves, `obstacles.js` paramétré

**Files:**
- Modify: `src/game/world.js` (createWorld ~lignes 38-40, resetRun ~55-60, startLevel ~62-72, spawnObstacle ~95-99, updateWorld ~230)
- Modify: `src/game/obstacles.js` (`needsSpawn` paramétré, `randomGapY` supprimé)
- Test: `tests/game/obstacles.test.js` (needsSpawn avec spacing explicite, test `randomGapY` supprimé), `tests/game/world.test.js` (ajouts)

**Interfaces:**
- Consumes: `nextSalve(rand, prevGapY, diff)` et `flow(rand, prevGapY, diff)` (Task 2) ; `difficultyForLevel(level)` étendu (Task 1).
- Produces: `world.diff` (objet difficulté complet, remplace `world.gapMin`/`world.gapMax`), `world.patternQueue`, `world.lastGapY`, `world.freshLevel` ; `needsSpawn(obstacles, spawnX, spacing)` (3e paramètre obligatoire côté world, défaut `CONFIG.OBSTACLE_SPACING` conservé).

- [ ] **Step 1: Écrire les tests (rouge)**

Dans `tests/game/obstacles.test.js` : supprimer `randomGapY` de l'import (ligne 5) et le test « randomGapY reste dans les marges autorisées » (lignes ~42-46). Ajouter dans le describe existant :

```js
  it('needsSpawn respecte le spacing passé en paramètre', () => {
    const list = [createObstacle(360 - 200, 200, 180)];
    expect(needsSpawn(list, 360, 200)).toBe(true);
    expect(needsSpawn(list, 360, 210)).toBe(false);
  });
```

Dans `tests/game/world.test.js`, remplacer ligne ~99 `expect(w.gapMin).toBeLessThan(CONFIG.GAP_MIN);` par `expect(w.diff.gapMin).toBeLessThan(CONFIG.GAP_MIN);` et ajouter (import `States` déjà présent) :

```js
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
```

(`fakeStorage()` est le helper défini en haut de `tests/game/world.test.js` — l'utiliser tel quel.)

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/game/obstacles.test.js tests/game/world.test.js`
Expected: FAIL — `needsSpawn` ignore le 3e paramètre, `w.diff`/`w.patternQueue`/`w.freshLevel` undefined.

- [ ] **Step 3: Implémentation**

Dans `src/game/obstacles.js` : supprimer `randomGapY` (plus aucun appelant après cette tâche) et paramétrer `needsSpawn` :

```js
export function needsSpawn(obstacles, spawnX, spacing = CONFIG.OBSTACLE_SPACING) {
  if (obstacles.length === 0) return true;
  const rightmost = Math.max(...obstacles.map((o) => o.x));
  return rightmost <= spawnX - spacing;
}
```

Dans `src/game/world.js` :

1. Imports : retirer `randomGapY` de l'import obstacles ; ajouter `import { nextSalve, flow } from './patterns.js';`
2. `createWorld` : remplacer les 3 lignes `scrollSpeed`/`gapMin`/`gapMax` par :

```js
    scrollSpeed: difficultyForLevel(1).scrollSpeed,
    diff: difficultyForLevel(1),
    patternQueue: [],
    lastGapY: CONFIG.HEIGHT / 2,
    freshLevel: true,
```

3. `resetRun` : ajouter à la fin :

```js
  world.patternQueue = [];
  world.lastGapY = CONFIG.HEIGHT / 2;
  world.freshLevel = true;
```

4. `startLevel` : remplacer les affectations `world.scrollSpeed`/`world.gapMin`/`world.gapMax` par :

```js
  world.scrollSpeed = diff.scrollSpeed;
  world.diff = diff;
```

5. Remplacer `spawnObstacle` par :

```js
// La file de motifs alimente le spawn : vide -> on génère une salve.
// La première salve d'un niveau (ou d'un retry) est toujours douce (flow),
// ancrée au centre — ré-entrée lisible, pas de mur surprise au spawn.
function fillQueue(world) {
  const salve = world.freshLevel
    ? flow(world.rand, CONFIG.HEIGHT / 2, world.diff)
    : nextSalve(world.rand, world.lastGapY, world.diff);
  world.freshLevel = false;
  world.patternQueue.push(...salve);
}

function upcomingGate(world) {
  if (world.patternQueue.length === 0) fillQueue(world);
  return world.patternQueue[0];
}

function spawnObstacle(world) {
  const gate = world.patternQueue.shift();
  world.lastGapY = gate.gapY;
  world.obstacles.push(createObstacle(CONFIG.WIDTH + CONFIG.OBSTACLE_W, gate.gapY, gate.gapH));
}
```

6. Dans `updateWorld`, remplacer `if (needsSpawn(world.obstacles, CONFIG.WIDTH)) spawnObstacle(world);` par :

```js
  if (needsSpawn(world.obstacles, CONFIG.WIDTH, upcomingGate(world).spacing)) spawnObstacle(world);
```

(`upcomingGate` remplit la file au besoin PUIS donne le spacing de la porte à venir — l'espacement variable des motifs COULOIR/CHICANE est ainsi respecté porte par porte.)

- [ ] **Step 4: Vérifier le vert + non-régression**

Run: `npx vitest run tests/game/obstacles.test.js tests/game/world.test.js` puis `npm test && npm run build`
Expected: PASS partout, build OK. `grep -rn "randomGapY\|gapMin" src/ --include="*.js" | grep -v level.js | grep -v patterns.js` ne doit plus montrer d'usage de `world.gapMin` ni de `randomGapY`.

- [ ] **Step 5: Commit**

```bash
git add src/game/world.js src/game/obstacles.js tests/game/obstacles.test.js tests/game/world.test.js
git commit -m "feat(world): spawn piloté par la file de motifs, spacing par porte, ré-entrée douce"
```

---

### Task 4: Vérification finale (gate de jeu)

**Files:** aucun (vérification, exécutée par le contrôleur).

- [ ] **Step 1: Suite complète + build**

Run: `npm test && npm run build`
Expected: tous les tests PASS (≈237), build OK.

- [ ] **Step 2: Vérification visuelle Playwright**

Lancer `npx vite --port 5199 --strictPort` et vérifier au navigateur (script Playwright) :
- Niveau 1 : HUD affiche `0/10`, les portes s'enchaînent sans trou ni chevauchement, deltas doux.
- Injecter `localStorage jetpackbot.bestLevel = 12` avant chargement, CONTINUE → niveau 12 : HUD `0/30`, screenshots des motifs hauts tiers (zigzag/couloir/chicane visibles), toutes les portes dans l'écran.
- Aucune erreur JS/console.

- [ ] **Step 3: Gate final — Jael joue**

Critères (spec) : niveaux 1-2 plus lisibles qu'avant, sensation de nouveauté aux niveaux 3/5/7/10, aucun passage impossible ressenti, HUD croissant correct. **Pas de merge sans son OK.**
