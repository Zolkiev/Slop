# Logres — Tuto + CONTINUER + polish choix de roi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à Logres un onboarding (coach-marks Merlin), la reprise d'un règne interrompu (CONTINUER), et le polish de l'écran de choix de roi.

**Architecture:** Trois modules purs testés en isolation (`persist-reign.js`, `tutorial.js`, + extension de `score.js`), un module de rendu (`render/tutorial.js`), et du câblage dans `src/main.js` / `src/render/renderer.js` / `src/render/pause.js`. La sérialisation d'un règne s'appuie sur la forme déjà JSON-friendly de `reign` (`flags = {set, counts}`, ère redérivée de `years`).

**Tech Stack:** Vanilla JS (ESM), Canvas 2D, Vite, Vitest. Zéro dépendance runtime.

## Global Constraints

- **Vanilla JS ESM uniquement**, zéro dépendance runtime ajoutée.
- **Canvas logique 480×800** (`VIEW_W=480`, `VIEW_H=800`).
- **Stockage injectable + échec silencieux** : toute fonction touchant `localStorage` prend `storage = globalThis.localStorage` en paramètre et n'émet jamais d'exception (try/catch → valeur de repli).
- **Copie en français**, ton médiéval (voix de Merlin pour le tuto).
- **Les modules `src/render/*` ne sont PAS unit-testés** dans ce projet (cf `test/` : uniquement de la logique). Les tâches de rendu/câblage se vérifient **visuellement** via `scripts/onboarding-smoke.mjs` (Tâche 5) ; le suite Vitest doit rester verte après chaque tâche.
- **Clés localStorage** : `logres.progress` (existante, méta), `logres.reign` (nouvelle, règne en cours).
- Le code portable `LG1-XXX` reste **méta-only** (`{best, king}`) — ne pas y toucher.

---

## File Structure

- **Create** `src/game/persist-reign.js` — sérialisation + stockage d'un règne en cours.
- **Create** `src/game/tutorial.js` — machine à états des coach-marks (pure).
- **Create** `src/render/tutorial.js` — rendu de la bulle de coach-mark.
- **Create** `test/persist-reign.test.js`, `test/tutorial.test.js`.
- **Create** `scripts/onboarding-smoke.mjs` — vérif visuelle puppeteer (tuto + CONTINUER + roi).
- **Modify** `src/game/reign.js` — `createReign` retient `king`.
- **Modify** `src/game/score.js` — champ `tutoVu` dans la progression.
- **Modify** `src/main.js` — câblage : autosave, CONTINUER, confirmation, tuto, feedback roi verrouillé, hotspot « ? ».
- **Modify** `src/render/renderer.js` — menu (CONTINUER/confirmation, points de lignée, ligne de réassurance, « ? »), dispatch du tuto.
- **Modify** `src/render/pause.js` — bouton pause « Abandonner » → « Menu » (non destructif) ; zones de la confirmation.

---

## Task 1: `reign.js` retient le roi + `persist-reign.js` (sérialisation)

**Files:**
- Modify: `src/game/reign.js` (fonction `createReign`, ~l.22-37)
- Create: `src/game/persist-reign.js`
- Test: `test/persist-reign.test.js`

**Interfaces:**
- Consumes: `createReign(initial)`, `draw(reign, cards)`, `choose(reign, side)` (`src/game/reign.js`) ; `eraForYears(years)` (`src/game/reign.js`) ; `CARDS` (`src/game/cards/index.js`, tableau de cartes `{id, era?, left, right, ...}`).
- Produces:
  - `serializeReign(reign) -> { v:1, gauges, flags:{set:string[], counts:object}, years:number, seen:string[], recent:string[], next:string|null, currentId:string|null, king:number }`
  - `deserializeReign(data, cards) -> reign | null` (null si `data` corrompu / version inconnue).

- [ ] **Step 1: Ajouter `king` à `createReign`**

Dans `src/game/reign.js`, la valeur de retour de `createReign` (l.23-36), ajouter le champ `king` juste après `gauges` :

```js
export function createReign(initial = {}) {
  return {
    gauges: createGauges(initial.gauges),
    king: initial.king ?? 0, // index de lignée (dynasty.KINGS), pour l'affichage/CONTINUE
    flags: initial.flags ?? createFlags(),
    years: 0,
    era: eraForYears(0),
    seen: new Set(),
    recent: [], // dernières cartes jouées (anti-répétition)
    next: null, // id de carte forcée (chaîne de quête)
    dead: null, // {key, side, cause} une fois mort
    miracle: null, // message quand une relique vient d'annuler une mort
    current: null, // carte présentée en attente de choix
    combat: null, // duel en cours (voir combat.js), null hors combat
    combatResult: null, // issue du dernier duel ('win'|'lose'|'draw'|'death')
  };
}
```

- [ ] **Step 2: Écrire le test de round-trip (échoue)**

Créer `test/persist-reign.test.js` :

```js
// Sérialisation d'un règne en cours : round-trip fidèle et re-jouable.
import { describe, it, expect } from 'vitest';
import { createReign, draw, choose } from '../src/game/reign.js';
import { setFlag } from '../src/game/flags.js';
import { CARDS } from '../src/game/cards/index.js';
import { serializeReign, deserializeReign } from '../src/game/persist-reign.js';

describe('serializeReign / deserializeReign', () => {
  it('préserve l’état d’un règne joué quelques tours', () => {
    const reign = createReign({ king: 2 });
    setFlag(reign.flags, 'mordred.concu');
    setFlag(reign.flags, 'saxons.raid', 2); // compteur
    draw(reign, CARDS);
    choose(reign, 'left');
    draw(reign, CARDS);

    const restored = deserializeReign(serializeReign(reign), CARDS);

    expect(restored.gauges).toEqual(reign.gauges);
    expect(restored.king).toBe(2);
    expect(restored.years).toBe(reign.years);
    expect(restored.era).toBe(reign.era);
    expect([...restored.seen]).toEqual([...reign.seen]);
    expect(restored.recent).toEqual(reign.recent);
    expect(restored.next).toBe(reign.next);
    expect([...restored.flags.set]).toEqual([...reign.flags.set]);
    expect(restored.flags.counts).toEqual(reign.flags.counts);
    expect(restored.current?.id).toBe(reign.current?.id);
  });

  it('reste jouable après restauration (draw/choose ne jettent pas)', () => {
    const reign = createReign();
    draw(reign, CARDS);
    const restored = deserializeReign(serializeReign(reign), CARDS);
    expect(() => {
      choose(restored, 'right');
      draw(restored, CARDS);
    }).not.toThrow();
  });

  it('renvoie null sur une entrée corrompue', () => {
    expect(deserializeReign(null, CARDS)).toBeNull();
    expect(deserializeReign({ v: 999 }, CARDS)).toBeNull();
    expect(deserializeReign('pas un objet', CARDS)).toBeNull();
  });
});
```

- [ ] **Step 3: Lancer le test (doit échouer)**

Run: `npx vitest run test/persist-reign.test.js`
Expected: FAIL — `serializeReign is not a function` (module absent).

- [ ] **Step 4: Implémenter la sérialisation**

Créer `src/game/persist-reign.js` (partie sérialisation ; le stockage arrive en Tâche 2) :

```js
// Sérialisation d'un règne en cours (pour la reprise « CONTINUER »).
// La forme de `reign` est déjà JSON-friendly (flags = {set, counts}) ;
// l'ère se redérive de `years`, on ne la stocke donc pas.
import { eraForYears } from './reign.js';
import { createFlags } from './flags.js';

const VERSION = 1;

/** Snapshot JSON d'un règne. */
export function serializeReign(reign) {
  return {
    v: VERSION,
    gauges: { ...reign.gauges },
    king: reign.king ?? 0,
    flags: { set: [...reign.flags.set], counts: { ...reign.flags.counts } },
    years: reign.years,
    seen: [...reign.seen],
    recent: [...reign.recent],
    next: reign.next ?? null,
    currentId: reign.current ? reign.current.id : null,
  };
}

/** Reconstruit un règne jouable, ou null si le snapshot est inexploitable. */
export function deserializeReign(data, cards) {
  if (!data || typeof data !== 'object' || data.v !== VERSION) return null;
  try {
    const flags = createFlags();
    for (const name of data.flags?.set ?? []) flags.set.add(name);
    flags.counts = { ...(data.flags?.counts ?? {}) };
    const years = data.years | 0;
    return {
      gauges: { ...data.gauges },
      king: data.king | 0,
      flags,
      years,
      era: eraForYears(years),
      seen: new Set(data.seen ?? []),
      recent: [...(data.recent ?? [])],
      next: data.next ?? null,
      dead: null,
      miracle: null,
      current: data.currentId ? cards.find((c) => c.id === data.currentId) ?? null : null,
      combat: null,
      combatResult: null,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Lancer le test (doit passer)**

Run: `npx vitest run test/persist-reign.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/game/reign.js src/game/persist-reign.js test/persist-reign.test.js
git commit -m "feat(logres): sérialisation d'un règne en cours (createReign retient king)"
```

---

## Task 2: `persist-reign.js` — stockage (save/load/clear/has)

**Files:**
- Modify: `src/game/persist-reign.js`
- Test: `test/persist-reign.test.js`

**Interfaces:**
- Produces:
  - `saveReign(snapshot, storage?) -> void` (écrit `logres.reign`, silencieux si indispo)
  - `loadReign(storage?) -> snapshot | null`
  - `clearReign(storage?) -> void`
  - `hasSavedReign(storage?) -> boolean`

- [ ] **Step 1: Écrire le test (échoue)**

Ajouter à `test/persist-reign.test.js` :

```js
import { saveReign, loadReign, clearReign, hasSavedReign } from '../src/game/persist-reign.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('stockage du règne en cours', () => {
  it('save → has → load → clear', () => {
    const s = fakeStorage();
    expect(hasSavedReign(s)).toBe(false);
    saveReign({ v: 1, years: 3 }, s);
    expect(hasSavedReign(s)).toBe(true);
    expect(loadReign(s)).toEqual({ v: 1, years: 3 });
    clearReign(s);
    expect(hasSavedReign(s)).toBe(false);
    expect(loadReign(s)).toBeNull();
  });

  it('ne jette jamais si le stockage est absent', () => {
    expect(() => saveReign({ v: 1 }, undefined)).not.toThrow();
    expect(loadReign(undefined)).toBeNull();
    expect(hasSavedReign(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer le test (doit échouer)**

Run: `npx vitest run test/persist-reign.test.js`
Expected: FAIL — `saveReign is not a function`.

- [ ] **Step 3: Implémenter le stockage**

Ajouter à la fin de `src/game/persist-reign.js` :

```js
const KEY = 'logres.reign';

export function saveReign(snapshot, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // stockage indisponible (navigation privée…) : la partie reste jouable
  }
}

export function loadReign(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearReign(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasSavedReign(storage = globalThis.localStorage) {
  return loadReign(storage) !== null;
}
```

- [ ] **Step 4: Lancer le test (doit passer)**

Run: `npx vitest run test/persist-reign.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/persist-reign.js test/persist-reign.test.js
git commit -m "feat(logres): stockage localStorage du règne en cours (logres.reign)"
```

---

## Task 3: `score.js` — champ `tutoVu`

**Files:**
- Modify: `src/game/score.js`
- Test: `test/persist-reign.test.js` (bloc dédié) ou nouveau `test/score.test.js`

**Interfaces:**
- Consumes/Produces: `loadProgress(storage?)` et `saveProgress(progress, storage?)` gagnent le champ booléen `tutoVu` (défaut `false`).

- [ ] **Step 1: Écrire le test (échoue)**

Créer `test/score.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { loadProgress, saveProgress } from '../src/game/score.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('progression : tutoVu', () => {
  it('défaut false, persiste true', () => {
    const s = fakeStorage();
    expect(loadProgress(s).tutoVu).toBe(false);
    const p = loadProgress(s);
    p.tutoVu = true;
    saveProgress(p, s);
    expect(loadProgress(s).tutoVu).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer le test (doit échouer)**

Run: `npx vitest run test/score.test.js`
Expected: FAIL — `expect(false).toBe(false)` passe mais `tutoVu` est `undefined` au 1er assert → FAIL (`undefined` !== `false`).

- [ ] **Step 3: Ajouter `tutoVu` aux defaults et au load**

Dans `src/game/score.js`, `defaults()` (l.14-16) :

```js
function defaults() {
  return { best: 0, king: 0, tutoVu: false, musicVol: DEFAULT_MUSIC_VOL, sfxVol: DEFAULT_SFX_VOL };
}
```

Et dans `loadProgress`, l'objet renvoyé (l.22-27) ajoute la ligne `tutoVu` :

```js
    return {
      best: Math.max(0, p.best | 0),
      king: Math.min(Math.max(0, p.king | 0), KINGS.length - 1),
      tutoVu: p.tutoVu === true,
      musicVol: clampVol(p.musicVol, DEFAULT_MUSIC_VOL),
      sfxVol: clampVol(p.sfxVol, DEFAULT_SFX_VOL),
    };
```

(`saveProgress` sérialise l'objet entier : rien à changer.)

- [ ] **Step 4: Lancer le test (doit passer)**

Run: `npx vitest run test/score.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/score.js test/score.test.js
git commit -m "feat(logres): progression retient tutoVu (tuto vu une fois)"
```

---

## Task 4: `tutorial.js` — machine à états des coach-marks (pure)

**Files:**
- Create: `src/game/tutorial.js`
- Test: `test/tutorial.test.js`

**Interfaces:**
- Produces:
  - `TUTO_STEPS: Array<{ text:string, anchor:'card'|'gauges' }>` (3 entrées, textes Merlin).
  - `createTutorial() -> { step:0, done:false }`
  - `advance(tuto, event) -> tuto` où `event ∈ 'preview'|'choose'`. Étape 0→1 sur `preview`, 1→2 sur `choose`, 2→done sur `choose`.
  - `currentStep(tuto) -> {text, anchor} | null` (null si `done`).

- [ ] **Step 1: Écrire le test (échoue)**

Créer `test/tutorial.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { createTutorial, advance, currentStep, TUTO_STEPS } from '../src/game/tutorial.js';

describe('tutoriel (coach-marks)', () => {
  it('avance étape par étape puis se termine', () => {
    const t = createTutorial();
    expect(currentStep(t)).toEqual(TUTO_STEPS[0]);      // 1re carte
    advance(t, 'preview');
    expect(currentStep(t)).toEqual(TUTO_STEPS[1]);      // aperçu → jauges
    advance(t, 'choose');
    expect(currentStep(t)).toEqual(TUTO_STEPS[2]);      // après 1er choix
    advance(t, 'choose');
    expect(t.done).toBe(true);
    expect(currentStep(t)).toBeNull();
  });

  it('ignore les événements hors séquence', () => {
    const t = createTutorial();
    advance(t, 'choose'); // pas encore d'aperçu → pas d'avancée
    expect(currentStep(t)).toEqual(TUTO_STEPS[0]);
  });

  it('a exactement 3 étapes avec ancrage', () => {
    expect(TUTO_STEPS).toHaveLength(3);
    for (const s of TUTO_STEPS) {
      expect(typeof s.text).toBe('string');
      expect(['card', 'gauges']).toContain(s.anchor);
    }
  });
});
```

- [ ] **Step 2: Lancer le test (doit échouer)**

Run: `npx vitest run test/tutorial.test.js`
Expected: FAIL — module absent.

- [ ] **Step 3: Implémenter la machine**

Créer `src/game/tutorial.js` :

```js
// Coach-marks du premier règne : 3 bulles contextuelles, voix de Merlin.
// N'enseigne que la boucle de base (geste, jauges, mort). Machine pure.

export const TUTO_STEPS = [
  { text: 'Glisse la carte, jeune roi — à gauche, ou à droite.', anchor: 'card' },
  { text: 'Ton choix fait vivre ces quatre pouvoirs.', anchor: 'gauges' },
  { text: "Qu'une seule s'éteigne ou s'embrase, et ton règne s'achève.", anchor: 'card' },
];

// Événement qui fait avancer chaque étape.
const TRIGGER = ['preview', 'choose', 'choose'];

export function createTutorial() {
  return { step: 0, done: false };
}

export function advance(tuto, event) {
  if (tuto.done) return tuto;
  if (event === TRIGGER[tuto.step]) {
    tuto.step += 1;
    if (tuto.step >= TUTO_STEPS.length) tuto.done = true;
  }
  return tuto;
}

export function currentStep(tuto) {
  return tuto.done ? null : TUTO_STEPS[tuto.step];
}
```

- [ ] **Step 4: Lancer le test (doit passer)**

Run: `npx vitest run test/tutorial.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Lancer toute la suite (régression)**

Run: `npx vitest run`
Expected: PASS (toutes les suites, y compris les 43 existantes).

- [ ] **Step 6: Commit**

```bash
git add src/game/tutorial.js test/tutorial.test.js
git commit -m "feat(logres): machine à états du tuto (coach-marks, voix de Merlin)"
```

---

## Task 5: `render/tutorial.js` + smoke de vérif visuelle

**Files:**
- Create: `src/render/tutorial.js`
- Create: `scripts/onboarding-smoke.mjs`

**Interfaces:**
- Consumes: `currentStep(tuto)` (`src/game/tutorial.js`), `TEXT`/`TITLE` (`src/render/fonts.js`), `wrapText`/`drawLines` (`src/render/text.js`).
- Produces: `drawTutorial(ctx, tuto, W, H)` — dessine la bulle de l'étape courante (rien si `done`).

*Pas de test unitaire (convention du projet : le rendu se vérifie visuellement).*

- [ ] **Step 1: Implémenter le rendu de la bulle**

Créer `src/render/tutorial.js` :

```js
// Bulle de coach-mark (parchemin bordé d'or, voix de Merlin). Ancrée près de la
// carte (bas) ou des jauges (haut) selon l'étape.
import { TEXT } from './fonts.js';
import { currentStep } from '../game/tutorial.js';
import { wrapText, drawLines } from './text.js';

export function drawTutorial(ctx, tuto, W, H) {
  const step = currentStep(tuto);
  if (!step) return;

  const boxW = W - 64;
  const x = 32;
  const y = step.anchor === 'gauges' ? 92 : H - 250;

  ctx.save();
  ctx.font = `italic 400 18px ${TEXT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const lines = wrapText(ctx, step.text, boxW - 40);
  const boxH = 34 + lines.length * 24;

  // parchemin
  ctx.fillStyle = 'rgba(26,21,36,0.94)';
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeStyle = 'rgba(201,162,39,0.85)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, boxW, boxH);

  // « Merlin » en cartouche
  ctx.fillStyle = '#e8c96a';
  ctx.font = `700 13px ${TEXT}`;
  ctx.fillText('MERLIN', W / 2, y + 8);

  // texte
  ctx.fillStyle = '#f5f0e6';
  ctx.font = `italic 400 18px ${TEXT}`;
  drawLines(ctx, lines, W / 2, y + 34, 24);
  ctx.restore();
}
```

- [ ] **Step 2: Créer le smoke de vérif visuelle**

Créer `scripts/onboarding-smoke.mjs` (pilote le dev server Vite ; suppose `npm run dev` déjà lancé sur :5173) :

```js
// Vérif visuelle : tuto au 1er règne, CONTINUER, feedback roi verrouillé.
// Prérequis : `npm run dev` tourne sur http://localhost:5173.
// Usage : node scripts/onboarding-smoke.mjs
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.TEMP ?? '.';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 800, deviceScaleFactor: 2 });

// localStorage vierge → tuto doit apparaître
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1400);
await page.screenshot({ path: `${OUT}/onb-menu.png` });

await page.keyboard.press('Enter'); // premier règne
await sleep(900);
await page.screenshot({ path: `${OUT}/onb-tuto-1.png` }); // bulle 1 (carte)
await page.keyboard.press('ArrowRight');
await sleep(1000);
await page.screenshot({ path: `${OUT}/onb-tuto-3.png` }); // bulle 3 après 1er choix

// quitte au menu (Échap = pause) puis vérifie CONTINUER au retour
await page.keyboard.press('Escape');
await sleep(400);
await page.screenshot({ path: `${OUT}/onb-pause.png` });
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1200);
await page.screenshot({ path: `${OUT}/onb-continue.png` }); // menu doit montrer CONTINUER

await browser.close();
console.log('OK — captures onb-*.png dans', OUT);
```

- [ ] **Step 3: Vérif visuelle**

Lancer le dev server puis le smoke :

```bash
npm run dev &           # sert http://localhost:5173
node scripts/onboarding-smoke.mjs
```

Expected : `onb-menu.png` = menu Logres. (Les captures tuto/continue seront concluantes une fois les Tâches 6-9 câblées ; à ce stade, vérifier surtout que rien ne crashe et que `drawTutorial` est importable.)

- [ ] **Step 4: Commit**

```bash
git add src/render/tutorial.js scripts/onboarding-smoke.mjs
git commit -m "feat(logres): rendu de la bulle de coach-mark + smoke onboarding"
```

---

## Task 6: `main.js` — autosave + cycle de vie de la save + « Menu » non destructif

**Files:**
- Modify: `src/main.js`
- Modify: `src/render/pause.js` (libellé du bouton)

**Interfaces:**
- Consumes: `serializeReign`, `saveReign`, `clearReign`, `loadReign`, `deserializeReign`, `hasSavedReign` (`src/game/persist-reign.js`).
- Produces: `app.savedReign` (reign restauré au boot, ou null).

*Vérif visuelle (câblage). La suite Vitest doit rester verte.*

- [ ] **Step 1: Importer le module de persistance**

Dans `src/main.js`, après la ligne d'import de `save.js` (l.8) ajouter :

```js
import {
  serializeReign, deserializeReign, saveReign, loadReign, clearReign,
} from './game/persist-reign.js';
```

- [ ] **Step 2: Restaurer un règne au boot**

Dans `src/main.js`, dans l'objet `app` (l.76-83), ajouter deux champs :

```js
const app = {
  mode: 'menu', // 'menu' | 'options' | 'play' | 'pause' | 'dead' | 'confirm'
  reign: null,
  swipe: createSwipe(),
  anim: null,
  progress,
  newRecord: false,
  savedReign: deserializeReign(loadReign(), CARDS), // règne en cours restauré, ou null
  tutorial: null, // coach-marks du 1er règne (Tâche 9)
};
```

- [ ] **Step 3: Helper `autosave()` appelé après chaque tirage (carte visible)**

L'autosave doit capturer la **carte affichée** : il faut donc l'appeler **après**
`drawNext` (quand `reign.current` est la carte visible), pas dans `commitChoice`
(où `choose()` a déjà remis `current` à null avant la pioche suivante).

Dans `src/main.js`, définir un helper juste après `startReign` (l.106) :

```js
// Persiste le règne à chaque frontière de carte (jamais en plein duel).
function autosave() {
  if (app.reign && !app.reign.dead && !app.reign.combat) {
    app.reign.king = progress.king;
    saveReign(serializeReign(app.reign));
  }
}
```

L'appeler à deux endroits — au premier tirage et après chaque pioche :

1. À la fin de `startReign` (après `audio.play('sacre');`, l.105) : `autosave();`
2. Dans la boucle `step` (l.353-361), après `drawNext(app.reign, CARDS)` :

```js
  if (app.anim && app.mode !== 'pause') {
    if (updateShatter(app.anim.shatter, dt)) {
      app.anim = null;
      if (app.reign.dead) endReign();
      else {
        drawNext(app.reign, CARDS);
        autosave();
      }
    }
  }
```

- [ ] **Step 4: Effacer la save à la mort**

Dans `endReign` (l.108-116), ajouter `clearReign();` avant `app.mode = 'dead';` :

```js
function endReign() {
  app.newRecord = app.reign.years > progress.best;
  if (app.newRecord) {
    progress.best = app.reign.years;
    saveProgress(progress);
  }
  clearReign();
  app.savedReign = null;
  app.mode = 'dead';
  audio.play('glas');
}
```

- [ ] **Step 5: « Menu » depuis la pause ne détruit plus le règne**

Dans `abandonReign` (l.156-160), garder la save et mémoriser le règne restaurable :

```js
function abandonReign() {
  // retour au menu SANS abandonner : le règne reste sauvegardé (CONTINUER)
  app.savedReign = app.reign;
  app.reign = null;
  app.anim = null;
  app.tutorial = null;
  app.mode = 'menu';
}
```

Et renommer le bouton dans `src/render/pause.js` (l.138) :

```js
  if (showAbandon) drawButton(ctx, PAUSE_UI.abandon, 'Retour au menu');
```

- [ ] **Step 6: Vérif — la suite reste verte**

Run: `npx vitest run`
Expected: PASS (aucune régression ; `main.js`/`pause.js` non testés unitairement).

- [ ] **Step 7: Vérif visuelle**

Avec `npm run dev` lancé : jouer 2-3 cartes, `Échap` → « Retour au menu », recharger la page. `loadReign()` doit renvoyer un snapshot (vérifiable en console : `localStorage.getItem('logres.reign')` non nul). Le CONTINUER visible arrive en Tâche 7.

- [ ] **Step 8: Commit**

```bash
git add src/main.js src/render/pause.js
git commit -m "feat(logres): autosave du règne + retour menu non destructif"
```

---

## Task 7: Menu CONTINUER + confirmation NOUVEAU RÈGNE

**Files:**
- Modify: `src/main.js` (entrées menu + nouveau mode `confirm`)
- Modify: `src/render/renderer.js` (rendu CONTINUER + confirmation)
- Modify: `src/render/pause.js` (zones `CONFIRM_UI`)

**Interfaces:**
- Consumes: `app.savedReign`, `clearReign` (Tâche 6).
- Produces: mode `'confirm'` ; helpers de zones `MENU_UI.continue`, `MENU_UI.newReign` (dans `renderer.js`, exportés pour le hit-test).

*Vérif visuelle.*

- [ ] **Step 1: Zones cliquables du menu (renderer.js)**

Dans `src/render/renderer.js`, en tête (après les imports), exporter la géométrie des boutons du menu quand un règne est en cours :

```js
// Boutons du menu affichés quand un règne est en cours (hit-test dans main.js).
export const MENU_UI = {
  continue: { x: 90, y: 500, w: 300, h: 56 },
  newReign: { x: 120, y: 572, w: 240, h: 40 },
};
```

- [ ] **Step 2: Rendu du menu selon règne en cours**

Dans `drawMenu` (l.53-106), englober le sélecteur de lignée + « Tape pour régner » (l.72-97) dans une condition : si `app.savedReign`, afficher CONTINUER/NOUVEAU RÈGNE à la place. Remplacer le bloc l.72-97 par :

```js
  if (app.savedReign) {
    const r = app.savedReign;
    const kingName = KINGS[r.king]?.name ?? 'ARTHUR';
    ctx.fillStyle = '#b8b0c8';
    ctx.font = `400 18px ${TEXT}`;
    ctx.fillText(`${kingName} — an ${r.years} de règne`, VIEW_W / 2, 456);

    drawButton(ctx, MENU_UI.continue, 'CONTINUER', { primary: true });
    drawButton(ctx, MENU_UI.newReign, 'Nouveau règne');
  } else {
    // sélecteur de lignée (existant)
    const king = KINGS[progress.king];
    const unlocked = isUnlocked(king, progress.best);
    ctx.font = `400 26px ${TEXT}`;
    ctx.fillStyle = '#b8b0c8';
    ctx.fillText('‹', VIEW_W * 0.15, 440);
    ctx.fillText('›', VIEW_W * 0.85, 440);
    if (unlocked) {
      ctx.fillStyle = '#f5f0e6';
      ctx.font = `700 26px ${TITLE}`;
      ctx.fillText(king.name, VIEW_W / 2, 425);
      ctx.font = `400 18px ${TEXT}`;
      ctx.fillStyle = '#b8b0c8';
      ctx.fillText(king.title, VIEW_W / 2, 458);
    } else {
      ctx.fillStyle = '#6a6478';
      ctx.font = `700 26px ${TITLE}`;
      ctx.fillText('? ? ?', VIEW_W / 2, 425);
      ctx.font = `400 17px ${TEXT}`;
      ctx.fillText(`Règne ${king.unlock} ans pour éveiller cette lignée`, VIEW_W / 2, 458);
    }
    ctx.font = `700 21px ${TEXT}`;
    ctx.fillStyle = unlocked ? '#e8c96a' : '#6a6478';
    ctx.fillText('— Tape pour régner —', VIEW_W / 2, 560);
  }
```

Ajouter l'import de `drawButton` : il est défini dans `pause.js` mais **non exporté**. Dans `src/render/pause.js`, ajouter `export` devant `function drawButton` (l.97). Puis dans `renderer.js`, l'importer : compléter l'import existant de `./pause.js` (l.12) →

```js
import { drawPause, drawPauseButton, drawSoundButton, drawButton } from './pause.js';
```

- [ ] **Step 3: Overlay de confirmation (pause.js)**

Dans `src/render/pause.js`, ajouter les zones et une fonction de rendu :

```js
export const CONFIRM_UI = {
  yes: { x: 250, y: 430, w: 130, h: 46 },
  no: { x: 100, y: 430, w: 130, h: 46 },
};

/** Confirmation « effacer le règne en cours ? » (focus par défaut : Non). */
export function drawConfirm(ctx, W, H) {
  ctx.fillStyle = 'rgba(10,8,16,0.8)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = CREAM;
  ctx.font = `700 26px ${TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Abandonner ce règne ?', W / 2, 340);
  ctx.font = `400 18px ${TEXT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('Ta progression (rois, record) reste acquise.', W / 2, 380);
  drawButton(ctx, CONFIRM_UI.yes, 'Oui');
  drawButton(ctx, CONFIRM_UI.no, 'Non', { primary: true }); // Non = focus/primaire
}
```

- [ ] **Step 4: Dispatch du rendu confirm (renderer.js)**

Dans `render` (l.216-230), ajouter une branche. Compléter l'import pause (Step 2) avec `drawConfirm` et `CONFIRM_UI`, puis :

```js
  else if (app.mode === 'confirm') {
    drawMenu(ctx, app);
    drawConfirm(ctx, VIEW_W, VIEW_H);
  }
```

- [ ] **Step 5: Entrées menu — CONTINUER / NOUVEAU RÈGNE / confirm**

Dans `src/main.js`, importer les zones : ajouter aux imports renderer (l.13) `MENU_UI` et aux imports pause (l.14) `CONFIRM_UI`. Ajouter un helper de reprise et brancher les clics.

Ajouter près de `startReign` :

```js
function continueReign() {
  if (!app.savedReign) return;
  app.reign = app.savedReign;
  app.savedReign = null;
  app.anim = null;
  app.tutorial = null;
  if (!app.reign.current) drawNext(app.reign, CARDS);
  app.mode = 'play';
}

function newReignFromMenu() {
  clearReign();
  app.savedReign = null;
  startReign();
}
```

Dans le `pointerup` du menu (l.222-235), au tout début du bloc `if (app.mode === 'menu')`, insérer la gestion du règne en cours (avant la logique du carousel) :

```js
  if (app.mode === 'menu' && app.savedReign) {
    if (inZone(PAUSE_UI.pauseButton, pos.x, pos.y)) { app.mode = 'options'; return; }
    if (pos.y > VIEW_H - 80) { openCodeOverlay(); return; }
    if (inZone(MENU_UI.continue, pos.x, pos.y)) { continueReign(); return; }
    if (inZone(MENU_UI.newReign, pos.x, pos.y)) { app.mode = 'confirm'; return; }
    return;
  }
```

Ajouter la gestion du mode `confirm` (après le bloc `if (app.mode === 'options')`, l.239) :

```js
  if (app.mode === 'confirm') {
    if (inZone(CONFIRM_UI.yes, pos.x, pos.y)) newReignFromMenu();
    else if (inZone(CONFIRM_UI.no, pos.x, pos.y)) app.mode = 'menu';
    return;
  }
```

Dans le `keydown` du menu (l.273-278) : quand un règne est en cours, Entrée/Espace = CONTINUER :

```js
  if (app.mode === 'menu') {
    if (app.savedReign) {
      if (e.code === 'Space' || e.code === 'Enter') continueReign();
      return;
    }
    if (e.code === 'ArrowLeft') selectKing(-1);
    if (e.code === 'ArrowRight') selectKing(+1);
    if (e.code === 'Space' || e.code === 'Enter') startReign();
    return;
  }
  if (app.mode === 'confirm') {
    if (e.code === 'Enter' || e.code === 'Escape') app.mode = 'menu'; // défaut : Non
    return;
  }
```

- [ ] **Step 6: Vérif — suite verte**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Vérif visuelle**

Avec `npm run dev` : jouer 2 cartes → `Échap` → « Retour au menu » → le menu montre **CONTINUER** + « Nouveau règne ». CONTINUER reprend au bon an/carte. « Nouveau règne » → confirmation → « Oui » repart à zéro (carousel de rois réapparaît), « Non » revient au menu. Recharger la page pendant un règne → CONTINUER présent.

- [ ] **Step 8: Commit**

```bash
git add src/main.js src/render/renderer.js src/render/pause.js
git commit -m "feat(logres): menu CONTINUER + confirmation Nouveau règne"
```

---

## Task 8: Câblage du tuto (déclenchement + avancement + rendu)

**Files:**
- Modify: `src/main.js`
- Modify: `src/render/renderer.js`

**Interfaces:**
- Consumes: `createTutorial`, `advance` (`src/game/tutorial.js`), `drawTutorial` (`src/render/tutorial.js`).

*Vérif visuelle.*

- [ ] **Step 1: Imports**

Dans `src/main.js` :

```js
import { createTutorial, advance } from './game/tutorial.js';
```

Dans `src/render/renderer.js` :

```js
import { drawTutorial } from './tutorial.js';
```

- [ ] **Step 2: Déclencher au premier règne**

Dans `startReign` (l.90-106), après `app.reign = createReign({ gauges: king.gauges });` remplacer par la création avec `king` et armer le tuto :

```js
  app.reign = createReign({ gauges: king.gauges, king: progress.king });
  app.tutorial = progress.tutoVu ? null : createTutorial();
```

- [ ] **Step 3: Faire avancer le tuto sur les événements**

Le tuto avance sur `preview` (le joueur amorce le geste) et `choose`.

Dans `commitChoice` (l.120-148), au début, faire avancer sur le choix et marquer vu à la fin :

```js
function commitChoice(side, releaseDx = 0) {
  const card = app.reign.current;
  if (!card) return;
  if (app.tutorial) {
    advance(app.tutorial, 'choose');
    if (app.tutorial.done) {
      progress.tutoVu = true;
      saveProgress(progress);
      app.tutorial = null;
    }
  }
  // ... reste inchangé
```

Pour l'étape « preview » : dans la boucle `step` (l.353-381), là où le tick d'aperçu est calculé (l.364-366), faire avancer le tuto au franchissement du seuil d'aperçu :

```js
  const preview = app.mode === 'play' && !app.anim ? previewSide(app.swipe) : null;
  if (preview && preview !== lastPreview) {
    audio.play('tick');
    if (app.tutorial) advance(app.tutorial, 'preview');
  }
  lastPreview = preview;
```

- [ ] **Step 4: Dessiner la bulle par-dessus le jeu**

Dans `drawPlay` (l.136-176) de `renderer.js`, tout à la fin (après `drawPauseButton(ctx)`), ajouter :

```js
  if (app.tutorial) drawTutorial(ctx, app.tutorial, VIEW_W, VIEW_H);
```

- [ ] **Step 5: Vérif — suite verte**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Vérif visuelle**

`localStorage.clear()` puis nouvelle partie : bulle 1 (« Glisse la carte… ») sur la 1re carte ; amorcer un swipe → bulle 2 près des jauges ; valider → bulle 3 ; valider encore → plus de bulle. Relancer une 2e partie → aucun tuto (tutoVu). Relancer le smoke `node scripts/onboarding-smoke.mjs` et inspecter `onb-tuto-1.png` / `onb-tuto-3.png`.

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/render/renderer.js
git commit -m "feat(logres): câblage du tuto (déclenchement, avancement, rendu)"
```

---

## Task 9: Polish choix de roi (feedback verrouillé + points + réassurance + « ? »)

**Files:**
- Modify: `src/main.js`
- Modify: `src/render/renderer.js`

**Interfaces:**
- Consumes: `KINGS`, `isUnlocked` (`src/game/dynasty.js`).
- Produces: hotspot `MENU_UI.help` (dans `renderer.js`).

*Vérif visuelle.*

- [ ] **Step 1: Feedback sonore sur roi verrouillé**

Dans `startReign` (l.90-106), la garde `if (!isUnlocked(...)) return;` devient un feedback :

```js
function startReign() {
  const king = KINGS[progress.king];
  if (!isUnlocked(king, progress.best)) {
    audio.play('glas'); // lignée scellée : refus sonore
    return;
  }
  // ... reste inchangé (création reign + tuto de la Tâche 8)
```

- [ ] **Step 2: Points de lignée + ligne de réassurance (renderer.js)**

Dans `drawMenu`, dans la branche `else` (pas de règne en cours, sélecteur affiché), après le bloc du roi, ajouter les points de lignée et la réassurance. Juste avant `ctx.fillText('— Tape pour régner —', ...)` :

```js
    // points de lignée : ● éveillé / ○ scellé
    const dotY = 500;
    const gap = 22;
    const startX = VIEW_W / 2 - ((KINGS.length - 1) * gap) / 2;
    ctx.font = `18px ${TEXT}`;
    KINGS.forEach((k, i) => {
      const on = isUnlocked(k, progress.best);
      ctx.fillStyle = i === progress.king ? '#e8c96a' : on ? '#8a8298' : '#4a4658';
      ctx.fillText(on ? '●' : '○', startX + i * gap, dotY);
    });
    ctx.font = `italic 400 14px ${TEXT}`;
    ctx.fillStyle = '#8a8298';
    ctx.fillText('Ta lignée se souvient de tous les rois éveillés.', VIEW_W / 2, 526);
```

- [ ] **Step 3: Hotspot « ? » pour revoir le tuto**

Dans `drawMenu`, ajouter le bouton « ? » (à gauche, symétrique du bouton son) et sa zone. En haut du fichier, compléter `MENU_UI` :

```js
export const MENU_UI = {
  continue: { x: 90, y: 500, w: 300, h: 56 },
  newReign: { x: 120, y: 572, w: 240, h: 40 },
  help: { x: 12, y: 800 - 52, w: 34, h: 34 },
};
```

À la fin de `drawMenu` (après `drawSoundButton(ctx)`), dessiner le « ? » :

```js
  const h = MENU_UI.help;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#1a1524';
  ctx.strokeStyle = 'rgba(201,162,39,0.85)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(h.x + h.w / 2, h.y + h.h / 2, h.w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#b8b0c8';
  ctx.font = `700 18px ${TEXT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', h.x + h.w / 2, h.y + h.h / 2 + 1);
```

- [ ] **Step 4: Câbler le « ? » (main.js)**

Dans le `pointerup`, dans le bloc menu **sans** règne en cours (l.222-235, la branche où le carousel s'affiche), avant le test du carousel `if (pos.x < VIEW_W * 0.3)`, ajouter :

```js
    if (inZone(MENU_UI.help, pos.x, pos.y)) {
      progress.tutoVu = false;
      saveProgress(progress);
      app.toast = 'Merlin te guidera à nouveau.';
      app.toastUntil = performance.now() + 2200;
      return;
    }
```

Rendu du toast : dans `drawMenu`, tout à la fin, si `app.toast` actif :

```js
  if (app.toast && performance.now() < (app.toastUntil ?? 0)) {
    ctx.fillStyle = 'rgba(201,162,39,0.92)';
    ctx.fillRect(40, 300, VIEW_W - 80, 40);
    ctx.fillStyle = '#2a2438';
    ctx.font = `700 15px ${TEXT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(app.toast, VIEW_W / 2, 320);
  }
```

(`app.toast`/`app.toastUntil` n'ont pas besoin d'init explicite : `undefined` est géré.)

- [ ] **Step 5: Vérif — suite verte**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Vérif visuelle**

Menu sans règne : cycler jusqu'à un roi scellé → « ? ? ? » + seuil affiché, taper au centre → son de refus (glas), pas de partie lancée. Points de lignée corrects (doré = courant, plein = éveillé, creux = scellé). Taper « ? » → toast « Merlin te guidera à nouveau », puis lancer une partie → le tuto réapparaît.

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/render/renderer.js
git commit -m "feat(logres): polish choix de roi (refus sonore, points de lignée, revoir le tuto)"
```

---

## Task 10: Vérification d'intégration + build

**Files:** aucune modification (vérif seule).

- [ ] **Step 1: Suite complète**

Run: `npx vitest run`
Expected: PASS (43 existantes + persist-reign + score + tutorial).

- [ ] **Step 2: Build de prod**

Run: `npx vite build`
Expected: build OK, aucune erreur.

- [ ] **Step 3: Smoke onboarding complet**

Avec `npm run dev` lancé : `node scripts/onboarding-smoke.mjs`, puis inspecter les captures `onb-*.png` : menu, tuto (bulles 1 & 3), pause « Retour au menu », menu avec CONTINUER après reload.

- [ ] **Step 4: Parcours manuel de recette**

Dans le navigateur (`localStorage.clear()` d'abord) :
1. 1er règne → 3 bulles Merlin, puis plus.
2. `Échap` → « Retour au menu » → CONTINUER visible, reprend au bon état.
3. Fermer/rouvrir l'onglet en cours de règne → CONTINUER toujours là.
4. Mourir → retour menu → plus de CONTINUER (save effacée), carousel de rois.
5. « Nouveau règne » sur un règne en cours → confirmation → Oui efface, Non garde.
6. Roi scellé → refus sonore, seuil affiché, points de lignée corrects.
7. « ? » → toast → tuto rejoué au règne suivant.

- [ ] **Step 5: Commit final (si ajustements)**

```bash
git add -A
git commit -m "test(logres): vérif d'intégration onboarding + CONTINUER + choix de roi"
```

---

## Notes de séquencement

- Tâches 1-4 = logique pure, TDD strict, indépendantes du rendu.
- Tâche 5 pose le rendu du tuto + le smoke (utilisé par 6-9).
- Tâches 6-9 = câblage (vérif visuelle) ; 7 dépend de 6, 8 dépend de 5, 9 est autonome.
- Tâche 10 = recette finale.
- Rappel `deviceScaleFactor: 2` dans le smoke pour des captures nettes ; Chrome à `C:/Program Files/Google/Chrome/Application/chrome.exe`.
