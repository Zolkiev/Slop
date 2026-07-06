# Partie en cours vs record — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CONTINUE reprend la partie en cours (`level`), NEW GAME demande confirmation avant de repartir au niveau 1, le `record` (skins + code de save) ne régresse jamais.

**Architecture:** `score.js` porte le nouveau modèle `{level, record}` (deux clés localStorage, migration gratuite depuis `jetpackbot.bestLevel`). Nouvel état `CONFIRM` (state machine + menu OUI/NON + écran). Spec : `docs/superpowers/specs/2026-07-06-save-continue-design.md`.

**Tech Stack:** Vanilla JS + Canvas 2D, Vitest, smoke Playwright (import `file:///C:/Users/pattyn/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`).

## Global Constraints

- Branche `feat/save-continue` depuis main (`0c4f6fe` ou plus récent), worktree isolé (skill superpowers:using-git-worktrees).
- Clés localStorage : `jetpackbot.bestLevel` = record (clé HISTORIQUE, ne pas renommer — migration gratuite) ; `jetpackbot.level` = partie en cours (nouvelle).
- Le `record` ne régresse JAMAIS (ni NEW GAME, ni SAISIR, ni lien).
- `level` régresse UNIQUEMENT via NEW GAME confirmé (→ 1) et SAISIR un code (→ valeur exacte).
- Écran CONFIRM : focus initial sur NON (l'action destructrice n'est pas le défaut).
- Style : code + commentaires français, modules purs, suite verte à chaque commit, commits conventionnels français.

---

### Task 1: Modèle `{level, record}` dans score.js + migration des consommateurs

**Files:**
- Modify: `src/game/score.js` (réécriture des fonctions de persistance)
- Modify: `src/game/world.js`, `src/game/savecode.js`, `src/game/skins.js`, `src/main.js:79`, `src/render/renderer.js:132`, `src/render/menu.js`
- Test: `tests/game/score.test.js` (réécriture), `tests/game/world.test.js`, `tests/game/savecode.test.js`, `tests/game/skins.test.js`, `tests/render/menu.test.js`, `tests/render/renderer.test.js` (adaptations)

**Interfaces:**
- Consumes: rien de nouveau.
- Produces: `createScore(storage) -> {level, record}` ; `saveProgress(score, value, storage)` (max sur les deux, persistance conditionnelle — sert aussi au lien `#save=`) ; `resetProgress(score, storage)` (level=1, record intact) ; `applyCode(score, value, storage)` (level exact, record max). Les exports `applySave`/`restoreSave`/`finalizeLevel` et le champ `bestLevel` DISPARAISSENT.

- [ ] **Step 1: Réécrire les tests de score.js (échec attendu)**

Remplacer les describe `applySave`/`restoreSave`/`finalizeLevel` de `tests/game/score.test.js` (garder `createScore` de base + `checkPass`, adapter) :

```js
import { describe, it, expect } from 'vitest';
import { createScore, checkPass, saveProgress, resetProgress, applyCode } from '../../src/game/score.js';

function fakeStorage(initial = {}) {
  const d = { ...initial };
  return {
    getItem: (k) => d[k] ?? null,
    setItem: (k, v) => { d[k] = String(v); },
  };
}

describe('createScore — migration', () => {
  it('appareil vierge : level 0, record 0', () => {
    expect(createScore(fakeStorage())).toEqual({ level: 0, record: 0 });
  });

  it('save historique (bestLevel seul) : level = record', () => {
    const s = createScore(fakeStorage({ 'jetpackbot.bestLevel': '10' }));
    expect(s).toEqual({ level: 10, record: 10 });
  });

  it('les deux clés : chacune la sienne', () => {
    const s = createScore(fakeStorage({ 'jetpackbot.bestLevel': '10', 'jetpackbot.level': '2' }));
    expect(s).toEqual({ level: 2, record: 10 });
  });

  it('tolère un storage absent', () => {
    expect(createScore(undefined)).toEqual({ level: 0, record: 0 });
  });
});

describe('saveProgress (jeu naturel + lien #save= : max sur les deux)', () => {
  it('monte level et record et persiste les deux', () => {
    const st = fakeStorage();
    const s = { level: 1, record: 1 };
    saveProgress(s, 3, st);
    expect(s).toEqual({ level: 3, record: 3 });
    expect(st.getItem('jetpackbot.level')).toBe('3');
    expect(st.getItem('jetpackbot.bestLevel')).toBe('3');
  });

  it('après un reset, le record ne bouge pas tant qu il n est pas dépassé', () => {
    const st = fakeStorage({ 'jetpackbot.bestLevel': '10', 'jetpackbot.level': '1' });
    const s = createScore(st);
    saveProgress(s, 2, st);
    expect(s).toEqual({ level: 2, record: 10 });
    expect(st.getItem('jetpackbot.bestLevel')).toBe('10');
  });

  it('ne régresse jamais et ne persiste rien si rien ne change', () => {
    const st = fakeStorage();
    const s = { level: 7, record: 10 };
    saveProgress(s, 3, st);
    expect(s).toEqual({ level: 7, record: 10 });
    expect(st.getItem('jetpackbot.level')).toBe(null);
  });

  it('tolère un storage absent', () => {
    const s = { level: 1, record: 1 };
    expect(() => saveProgress(s, 4, undefined)).not.toThrow();
    expect(s.level).toBe(4);
  });
});

describe('resetProgress (NEW GAME confirmé)', () => {
  it('level repart à 1, record intact', () => {
    const st = fakeStorage({ 'jetpackbot.bestLevel': '10', 'jetpackbot.level': '10' });
    const s = createScore(st);
    resetProgress(s, st);
    expect(s).toEqual({ level: 1, record: 10 });
    expect(st.getItem('jetpackbot.level')).toBe('1');
    expect(st.getItem('jetpackbot.bestLevel')).toBe('10');
  });
});

describe('applyCode (SAISIR : level exact, record max — skins jamais re-verrouillés)', () => {
  it('code plus bas : level régresse, record intact', () => {
    const st = fakeStorage({ 'jetpackbot.bestLevel': '14', 'jetpackbot.level': '14' });
    const s = createScore(st);
    applyCode(s, 5, st);
    expect(s).toEqual({ level: 5, record: 14 });
    expect(st.getItem('jetpackbot.level')).toBe('5');
    expect(st.getItem('jetpackbot.bestLevel')).toBe('14');
  });

  it('code plus haut : les deux montent', () => {
    const st = fakeStorage();
    const s = { level: 2, record: 2 };
    applyCode(s, 9, st);
    expect(s).toEqual({ level: 9, record: 9 });
    expect(st.getItem('jetpackbot.bestLevel')).toBe('9');
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/game/score.test.js`
Expected: FAIL — `saveProgress` non exporté

- [ ] **Step 3: Réécrire score.js**

Remplacer tout `src/game/score.js` (garder `checkPass` tel quel) :

```js
// Deux notions (spec save-continue) : `level` = partie en cours (ce que
// CONTINUE reprend), `record` = meilleur niveau à vie (skins + code de
// save, ne régresse JAMAIS). Clé record = clé historique : migration
// gratuite des saves existantes.
const KEY_RECORD = 'jetpackbot.bestLevel';
const KEY_LEVEL = 'jetpackbot.level';

export function createScore(storage) {
  const record = Number(storage?.getItem(KEY_RECORD)) || 0;
  const level = Number(storage?.getItem(KEY_LEVEL)) || record;
  return { level, record };
}

export function checkPass(robot, obstacle, width) {
  if (!obstacle.passed && robot.x > obstacle.x + width) {
    obstacle.passed = true;
    return true;
  }
  return false;
}

function bumpRecord(score, value, storage) {
  if (value > score.record) {
    score.record = value;
    storage?.setItem(KEY_RECORD, String(value));
  }
}

// Jeu naturel (LEVEL_COMPLETE -> niveau+1, crash -> niveau) et lien
// #save= au boot : max sur les deux, jamais de régression accidentelle.
export function saveProgress(score, value, storage) {
  if (value > score.level) {
    score.level = value;
    storage?.setItem(KEY_LEVEL, String(value));
  }
  bumpRecord(score, value, storage);
  return score;
}

// NEW GAME confirmé : la partie repart à 1, le record (skins) reste acquis.
export function resetProgress(score, storage) {
  score.level = 1;
  storage?.setItem(KEY_LEVEL, '1');
  return score;
}

// SAISIR un code : geste délibéré, le code fait foi pour la partie en
// cours (même vers le bas — outil de test), le record ne fait que monter.
export function applyCode(score, value, storage) {
  score.level = value;
  storage?.setItem(KEY_LEVEL, String(value));
  bumpRecord(score, value, storage);
  return score;
}
```

- [ ] **Step 4: Migrer les consommateurs**

Règles de migration (chaque occurrence de `bestLevel` hors clé localStorage change de camp) :

| Usage | Devient |
|---|---|
| CONTINUE activé / niveau de départ | `score.level` |
| Déblocage + chargement skins | `score.record` |
| Génération du code de save (COPIER/LIEN) | `score.record` |
| Affichage « Best: niveau X » (menu, game over) | `score.record` |
| Lien `#save=` au boot | `saveProgress(...)` |
| Fin de niveau / crash | `saveProgress(...)` |

1. `src/game/world.js` :
   - Import : `import { createScore, checkPass, saveProgress, applyCode } from './score.js';` (supprimer `finalizeLevel`, `restoreSave`).
   - `createWorld` : `menu: createMenu(score.level >= 1)`, `skin: loadSkin(storage, score.record)`.
   - `toMenu` : `createMenu(world.score.level >= 1)`.
   - `press` MENU `continue` : `startLevel(world, world.score.level);`.
   - `skinsMenuFor` : `skinUnlocked(slot, world.score.record)`.
   - `submitSaveCode` : `applyCode(world.score, decoded.bestLevel, world.storage);`.
   - `updateWorld` LEVEL_COMPLETE : `saveProgress(world.score, world.level + 1, world.storage);` (quitter sur l'écran de victoire ne perd pas le niveau gagné).
   - `updateWorld` crash : `saveProgress(world.score, world.level, world.storage);`.
2. `src/game/savecode.js` : `score.record >= 1 ? encodeSave({ bestLevel: score.record }) : null` (le payload du code garde son nom `bestLevel` — format `JB1-` inchangé).
3. `src/game/skins.js` : renommer le paramètre `bestLevel` → `record` dans `skinUnlocked`/`loadSkin` + commentaires (« un nouveau joueur a record 0 »).
4. `src/main.js:79` : `saveProgress(createScore(window.localStorage), decoded.bestLevel, window.localStorage);` (adapter l'import).
5. `src/render/renderer.js:132` : `` `Best: niveau ${world.score.record}` ``.
6. `src/render/menu.js` : l'affichage « Best » du menu passe à `world.score.record` (chercher `bestLevel`).

- [ ] **Step 5: Adapter les tests consommateurs**

Dans `tests/game/world.test.js`, `tests/game/savecode.test.js`, `tests/game/skins.test.js`, `tests/render/menu.test.js`, `tests/render/renderer.test.js` : remplacer les lectures `w.score.bestLevel` selon la table du Step 4 (continue→`level`, skins/code/affichage→`record`). Les helpers `storageWithBest(n)` (clé `jetpackbot.bestLevel`) restent valides = save historique migrée. Points de vigilance :

- `submitSaveCode` vers le bas (test du 06/07) : attendre `w.score.level` régressé ET `w.score.record` INTACT (c'est le changement de sémantique voulu) ; storage : `jetpackbot.level` = code, `jetpackbot.bestLevel` inchangé.
- Ajouter au describe save de `world.test.js` :

```js
    it('CONTINUE reprend la partie en cours, pas le record (retour Jael)', () => {
      const storage = storageWithBest(10);          // vieille save niveau 10
      storage.setItem('jetpackbot.level', '2');     // partie en cours au 2
      const w = createWorld(storage);
      const b = w.menu.buttons[1];                  // CONTINUE
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.PLAY);
      expect(w.level).toBe(2);
    });

    it('mourir au niveau 2 après reset ne réveille pas le record', () => {
      const storage = storageWithBest(10);
      storage.setItem('jetpackbot.level', '2');
      const w = createWorld(storage);
      startLevel(w, 2);
      w.sm.to(States.PLAY);
      for (let i = 0; i < 600 && w.sm.get() !== States.GAMEOVER; i += 1) updateWorld(w, 1 / 60);
      expect(w.score.level).toBe(2);
      expect(w.score.record).toBe(10);
      expect(storage.getItem('jetpackbot.bestLevel')).toBe('10');
    });
```

- [ ] **Step 6: Suite complète verte**

Run: `npx vitest run`
Expected: PASS, 0 échec

- [ ] **Step 7: Commit**

```bash
git add src/ tests/
git commit -m "feat(save): partie en cours (level) séparée du record — CONTINUE adaptatif, skins sur record"
```

---

### Task 2: État CONFIRM — logique (state machine, menu OUI/NON, routage)

**Files:**
- Modify: `src/engine/state.js`, `src/game/menu.js`, `src/game/world.js`, `src/config.js`
- Test: `tests/engine/state.test.js`, `tests/game/menu.test.js`, `tests/game/world.test.js`

**Interfaces:**
- Consumes: `resetProgress` (Task 1), `build`/`hitTest`/`activate`/`moveFocus` (menu.js existant).
- Produces: `States.CONFIRM` (`'confirm'`, transitions MENU→CONFIRM, CONFIRM→PLAY|MENU) ; `createConfirmMenu()` (boutons `yes` « OUI » / `no` « NON », focus initial 1 = NON) ; `world.confirm` ; `CONFIG.CONFIRM_BTN = { x: 80, w: 200, h: 56, y0: 330, gap: 72 }`.

- [ ] **Step 1: Tests qui échouent**

`tests/engine/state.test.js` — ajouter :

```js
  it('MENU -> CONFIRM -> PLAY et CONFIRM -> MENU sont permis', () => {
    const sm = createStateMachine(States.MENU);
    sm.to(States.CONFIRM);
    expect(sm.can(States.PLAY)).toBe(true);
    expect(sm.can(States.MENU)).toBe(true);
    expect(sm.can(States.SAVECODE)).toBe(false);
  });
```

`tests/game/menu.test.js` — ajouter :

```js
  it('createConfirmMenu : OUI/NON, focus initial sur NON', () => {
    const m = createConfirmMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['yes', 'no']);
    expect(m.buttons.every((b) => b.enabled)).toBe(true);
    expect(m.focus).toBe(1);
  });
```

`tests/game/world.test.js` — nouveau describe :

```js
  describe('confirmation NEW GAME', () => {
    it('partie en cours > 1 : NEW GAME ouvre CONFIRM sans rien toucher', () => {
      const storage = storageWithBest(10);
      const w = createWorld(storage);
      const b = w.menu.buttons[0];
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.CONFIRM);
      expect(w.score.level).toBe(10);
    });

    it('OUI : level repart à 1, record intact, partie lancée au 1', () => {
      const storage = storageWithBest(10);
      const w = createWorld(storage);
      press(w, { x: w.menu.buttons[0].x + 1, y: w.menu.buttons[0].y + 1 });
      const oui = w.confirm.buttons[0];
      press(w, { x: oui.x + 1, y: oui.y + 1 });
      expect(w.sm.get()).toBe(States.PLAY);
      expect(w.level).toBe(1);
      expect(w.score).toEqual({ level: 1, record: 10 });
      expect(storage.getItem('jetpackbot.level')).toBe('1');
    });

    it('NON : retour MENU, rien ne change', () => {
      const storage = storageWithBest(10);
      const w = createWorld(storage);
      press(w, { x: w.menu.buttons[0].x + 1, y: w.menu.buttons[0].y + 1 });
      const non = w.confirm.buttons[1];
      press(w, { x: non.x + 1, y: non.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
      expect(w.score.level).toBe(10);
    });

    it('Escape depuis CONFIRM = NON', () => {
      const w = createWorld(storageWithBest(10));
      press(w, { x: w.menu.buttons[0].x + 1, y: w.menu.buttons[0].y + 1 });
      escapeAction(w);
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('clavier : nav + Enter (focus par défaut NON) ne reset pas', () => {
      const w = createWorld(storageWithBest(10));
      press(w, { x: w.menu.buttons[0].x + 1, y: w.menu.buttons[0].y + 1 });
      press(w); // activate(focus NON)
      expect(w.sm.get()).toBe(States.MENU);
      expect(w.score.level).toBe(10);
    });

    it('partie en cours à 1 (ou vierge) : pas de confirmation, direct PLAY', () => {
      const w = createWorld(fakeStorage());
      const b = w.menu.buttons[0];
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.PLAY);
      expect(w.level).toBe(1);
    });
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/engine/state.test.js tests/game/menu.test.js tests/game/world.test.js`
Expected: FAIL — `States.CONFIRM`/`createConfirmMenu` inexistants

- [ ] **Step 3: Implémenter**

1. `src/engine/state.js` : ajouter `CONFIRM: 'confirm'` dans `States` ; transitions : `[States.MENU]: [States.PLAY, States.SAVECODE, States.OPTIONS, States.SKINS, States.CONFIRM]` et `[States.CONFIRM]: [States.PLAY, States.MENU]`.
2. `src/config.js` : `CONFIRM_BTN: { x: 80, w: 200, h: 56, y0: 330, gap: 72 },` (sous les blocs de layout existants) + `CONFIRM_TITLE_Y: 200,` `CONFIRM_SUB_Y: 248,`.
3. `src/game/menu.js` :

```js
// Confirmation NEW GAME — focus initial sur NON : l'action destructrice
// (repartir au niveau 1) ne doit jamais être le défaut.
export function createConfirmMenu() {
  const m = build([
    { id: 'yes', label: 'OUI', enabled: true },
    { id: 'no', label: 'NON', enabled: true },
  ], CONFIG.CONFIRM_BTN);
  m.focus = 1;
  return m;
}
```

4. `src/game/world.js` :
   - Imports : `createConfirmMenu` (menu.js), `resetProgress` (score.js) ; champ `confirm: null` dans le littéral de `createWorld`.
   - Extraire le lancement pour ne pas dupliquer :

```js
function launchNewGame(world) {
  resetProgress(world.score, world.storage);
  startLevel(world, 1);
  world.sm.to(States.PLAY);
}
```

   - `press` MENU, cas `newgame` :

```js
    if (id === 'newgame') {
      if (world.score.level > 1) {
        world.confirm = createConfirmMenu();
        world.sm.to(States.CONFIRM);
      } else {
        launchNewGame(world);
      }
    }
```

   - `press`, nouvelle branche d'état :

```js
  } else if (state === States.CONFIRM) {
    const id = pointer ? hitTest(world.confirm, pointer.x, pointer.y) : activate(world.confirm);
    if (id === 'yes') launchNewGame(world);
    else if (id === 'no') toMenu(world);
    // null -> no-op
  }
```

   - `navMenu` : `else if (s === States.CONFIRM) moveFocus(world.confirm, dir);`.
   - `escapeAction` : `else if (s === States.CONFIRM) toMenu(world);`.

- [ ] **Step 4: Suite complète verte**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ tests/
git commit -m "feat(menu): confirmation NEW GAME — état CONFIRM, OUI/NON focus NON, reset au niveau 1"
```

---

### Task 3: Écran CONFIRM — rendu

**Files:**
- Create: `src/render/confirm.js`
- Modify: `src/render/renderer.js`
- Test: `tests/render/confirm.test.js`

**Interfaces:**
- Consumes: `world.confirm` (Task 2), `drawButtons` (`src/render/buttons.js`), `CONFIG.CONFIRM_TITLE_Y/CONFIRM_SUB_Y`.
- Produces: `renderConfirm(ctx, world, assets)` appelé par `renderer.js` quand `state === States.CONFIRM`.

- [ ] **Step 1: Test qui échoue**

Créer `tests/render/confirm.test.js` sur le modèle EXACT de `tests/render/pause.test.js` (même façon de fabriquer le ctx/assets factices — le lire d'abord) : vérifier que `renderConfirm` écrit le titre `REPARTIR AU NIVEAU 1 ?`, le sous-titre `Les robots débloqués restent`, et déclenche le dessin des 2 boutons.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/render/confirm.test.js`
Expected: FAIL — module absent

- [ ] **Step 3: Implémenter**

Créer `src/render/confirm.js` sur le modèle de `src/render/pause.js` (le lire d'abord ; mêmes polices/pattern de voile sombre s'il y en a un) :

```js
import { CONFIG } from '../config.js';
import { drawButtons } from './buttons.js';

export function renderConfirm(ctx, world, assets) {
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px system-ui'; // ALIGNER sur la police titre de pause.js
  ctx.fillText('REPARTIR AU NIVEAU 1 ?', CONFIG.WIDTH / 2, CONFIG.CONFIRM_TITLE_Y);
  ctx.font = '14px system-ui';      // idem sous-titre
  ctx.fillText('Les robots débloqués restent', CONFIG.WIDTH / 2, CONFIG.CONFIRM_SUB_Y);
  drawButtons(ctx, world.confirm, assets);
}
```

Dans `src/render/renderer.js` : import + branche `else if (state === States.CONFIRM) { renderConfirm(ctx, world, assets); }` à côté des autres états de menu.

- [ ] **Step 4: Suite verte + build**

Run: `npx vitest run && npm run build`
Expected: PASS + build Vite OK

- [ ] **Step 5: Commit**

```bash
git add src/render/ tests/render/
git commit -m "feat(render): écran de confirmation NEW GAME"
```

---

### Task 4: Smoke Playwright (parcours du retour Jael) + gate

**Files:**
- Create: `C:/Setup/Projects/Game/Slop/.claude/smokes/save-continue-smoke.mjs` (dossier des smokes durables)

**Interfaces:**
- Consumes: serveur Vite `npx vite --port 5199 --strictPort` depuis `<worktree>/1st_Slop`.
- Produces: verdict automatisé (asserts localStorage) + captures pour le gate Jael.

- [ ] **Step 1: Écrire le smoke**

```js
// Parcours du retour Jael : vieille save 10 -> NEW GAME (confirm OUI) ->
// mort au niveau 1 -> CONTINUE doit reprendre au 1 (plus jamais au 10).
// + NON ne touche à rien + SAISIR bas ne re-verrouille pas le record.
import { chromium } from 'file:///C:/Users/pattyn/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5199';
const OUT = process.argv[2] || '.';
const fails = [];
const check = (label, cond) => { if (!cond) fails.push(label); console.log(`${cond ? 'OK ' : 'FAIL'} ${label}`); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 480, height: 864 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => fails.push(`pageerror: ${e.message}`));
await page.addInitScript(() => localStorage.setItem('jetpackbot.bestLevel', '10'));
await page.goto(BASE);
await page.waitForTimeout(1800);
const ls = (k) => page.evaluate((key) => localStorage.getItem(key), k);

// 1. NEW GAME -> CONFIRM -> NON : rien ne change
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/1-confirm.png` });
await page.keyboard.press('Enter'); // focus par défaut = NON
await page.waitForTimeout(400);
check('NON laisse level à 10 (migré)', await ls('jetpackbot.level') !== '1');

// 2. NEW GAME -> OUI -> mort niveau 1 -> menu -> CONTINUE = niveau 1
await page.keyboard.press('Enter');       // CONFIRM
await page.waitForTimeout(300);
await page.keyboard.press('ArrowUp');     // focus OUI
await page.keyboard.press('Enter');       // lance niveau 1
await page.waitForTimeout(300);
check('OUI persiste level=1', await ls('jetpackbot.level') === '1');
check('record intact après OUI', await ls('jetpackbot.bestLevel') === '10');
await page.waitForTimeout(1500);          // le robot meurt seul (~0,73 s)
await page.keyboard.press('Escape');      // gameover -> menu
await page.waitForTimeout(400);
await page.keyboard.press('ArrowDown');   // CONTINUE
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/2-continue-niveau1.png` }); // HUD doit dire Niveau 1
check('CONTINUE reprend au 1', await ls('jetpackbot.level') === '1');

// 3. SAISIR JB1-505 : level 5, record toujours 10
await page.keyboard.press('Escape');      // pause
await page.waitForTimeout(200);
await page.keyboard.down('ArrowDown'); await page.keyboard.up('ArrowDown');
await page.keyboard.down('ArrowDown'); await page.keyboard.up('ArrowDown');
await page.keyboard.press('Enter');       // MENU (3e bouton de pause)
await page.waitForTimeout(400);
for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowDown'); // CODE
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); // SAISIR
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.keyboard.type('JB1-505', { delay: 40 });
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
check('code bas : level=5', await ls('jetpackbot.level') === '5');
check('code bas : record intact (skins gardés)', await ls('jetpackbot.bestLevel') === '10');

await browser.close();
console.log(fails.length ? `\n${fails.length} FAIL` : '\nTOUT OK');
process.exit(fails.length ? 1 : 0);
```

- [ ] **Step 2: Lancer et juger**

Run : `node C:/Setup/Projects/Game/Slop/.claude/smokes/save-continue-smoke.mjs <outdir>`
Expected: `TOUT OK`, exit 0 ; capture `1-confirm.png` = écran de confirmation lisible ; `2-continue-niveau1.png` = HUD « Niveau 1 ». Si la nav clavier du step 3 du smoke ne correspond pas au layout réel de la pause, corriger le SMOKE (pas le jeu) en vérifiant l'ordre des boutons dans `src/game/menu.js`.

- [ ] **Step 3: Commit + gate Jael**

```bash
git add -A
git commit -m "test(smoke): parcours save-continue de bout en bout"
```

Puis gate Jael en jeu (spec) : confirmation claire, CONTINUE adaptatif, skins intacts après code bas.
