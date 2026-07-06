# Player Progression (Hangar de Skins) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La progression se voit sur le robot : 5 skins (un par monde) débloqués par les seuils de tiers existants, un écran « hangar » ROBOTS accessible du menu pour choisir son robot, sélection persistée en localStorage, sprites du skin + accent (particules réacteur) appliqués en jeu.

**Architecture:** Logique pure dans `src/game/skins.js` (table `SKINS`, `skinUnlocked` indexé sur `CONFIG.PATTERN_TIERS`, persistance `jetpackbot.skin` sur le modèle des volumes) ; nouvel état `SKINS` (transitions MENU↔SKINS) rendu par `src/render/skins.js` et branché dans le dispatch d'états de `src/render/renderer.js` ; le robot en jeu passe par `spriteKey(world.skin)` et les particules par `SKINS[world.skin].accent` ; 12 sprites PixelLab obtenus par recoloration des 3 sprites existants (`pixellab.mjs edit`).

**Tech Stack:** Vanilla JS (ES modules), Vitest (env node, fakes maison — pas de jsdom), PixelLab API v2 (`scripts/pixellab.mjs`, clé dans `.env`), Vite, Playwright pour la vérification visuelle.

**Spec:** docs/superpowers/specs/2026-07-06-player-progression-design.md

## Global Constraints

- Tout le code/commentaires en français, style du dépôt.
- Seuils = `CONFIG.PATTERN_TIERS` (source unique, pas de nouvelle constante).
- Persistance localStorage `jetpackbot.skin`, PAS dans le code de sauvegarde ; garde → 0.
- Sprites 64×64 RGBA, noms EXACTS `robot-s{1..4}.png` / `robot-s{1..4}-thrust-{0,1}.png`.
- Baseline : 246 tests verts.

---

### Task 1: Logique skins pure + état SKINS + musique

**Files:**
- Create: `src/game/skins.js`
- Modify: `src/engine/state.js:1-14` (état `SKINS` + transitions MENU↔SKINS)
- Modify: `src/game/music.js:4` (`MENU_STATES` + `States.SKINS`)
- Test: `tests/game/skins.test.js` (nouveau), `tests/engine/state.test.js` (ajout en fin de describe), `tests/game/music.test.js` (ajout dans le describe `musicFor`)

**Interfaces:**
- Consumes: `CONFIG.PATTERN_TIERS` (`src/config.js:78`, `[1, 3, 5, 7, 10]`), convention de persistance de `src/game/settings.js` (`storage?.getItem/setItem`, garde sur valeur invalide).
- Produces:
  - `SKINS: Array<{ id: string, name: string, accent: string }>` (5 entrées)
  - `skinUnlocked(i, bestLevel) → boolean`
  - `spriteKey(skin) → 'robot' | 'robot-s${skin}'`
  - `loadSkin(storage, bestLevel) → number` (0..4, garde complète → 0)
  - `saveSkin(storage, skin) → void` (clé `jetpackbot.skin`)
  - `States.SKINS = 'skins'` avec transitions `MENU→SKINS`, `SKINS→MENU`
  - `musicFor(States.SKINS, *) → 'music-menu'`

- [ ] **Step 1: Écrire les tests (rouge)**

Créer `tests/game/skins.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../src/config.js';
import { SKINS, skinUnlocked, spriteKey, loadSkin, saveSkin } from '../../src/game/skins.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } };
}

describe('skins — table', () => {
  it('5 skins, un par tier, ids et noms attendus', () => {
    expect(SKINS.map((s) => s.id)).toEqual(['proto', 'forge', 'venin', 'orage', 'nova']);
    expect(SKINS.map((s) => s.name)).toEqual(['PROTO', 'FORGE', 'VENIN', 'ORAGE', 'NOVA']);
    expect(SKINS.length).toBe(CONFIG.PATTERN_TIERS.length);
  });

  it('accents: cyan historique pour PROTO puis un accent par monde', () => {
    expect(SKINS.map((s) => s.accent))
      .toEqual(['#3ef0ff', '#ff9a3e', '#7dff3e', '#c93eff', '#fff7d6']);
  });
});

describe('skinUnlocked', () => {
  it('PROTO (0) est toujours débloqué, même à bestLevel 0 (nouveau joueur)', () => {
    expect(skinUnlocked(0, 0)).toBe(true);
  });

  it('frontières des seuils PATTERN_TIERS (3/5/7/10)', () => {
    for (const [i, seuil] of CONFIG.PATTERN_TIERS.entries()) {
      if (i === 0) continue; // PROTO : toujours débloqué (testé ci-dessus)
      expect(skinUnlocked(i, seuil)).toBe(true);
      expect(skinUnlocked(i, seuil - 1)).toBe(false);
    }
  });

  it('bestLevel 2: seul PROTO est débloqué', () => {
    expect([0, 1, 2, 3, 4].map((i) => skinUnlocked(i, 2)))
      .toEqual([true, false, false, false, false]);
  });

  it('bestLevel 10: tout est débloqué', () => {
    expect([0, 1, 2, 3, 4].every((i) => skinUnlocked(i, 10))).toBe(true);
  });
});

describe('spriteKey', () => {
  it('0 -> robot (sprites historiques), n -> robot-sN', () => {
    expect(spriteKey(0)).toBe('robot');
    expect(spriteKey(1)).toBe('robot-s1');
    expect(spriteKey(3)).toBe('robot-s3');
  });
});

describe('loadSkin / saveSkin (localStorage jetpackbot.skin)', () => {
  it('absent (ou storage absent) -> 0', () => {
    expect(loadSkin(fakeStorage(), 10)).toBe(0);
    expect(loadSkin(undefined, 10)).toBe(0);
  });

  it("'2' avec bestLevel 5 -> 2 (débloqué)", () => {
    const s = fakeStorage();
    s.setItem('jetpackbot.skin', '2');
    expect(loadSkin(s, 5)).toBe(2);
  });

  it("'4' avec bestLevel 5 -> 0 (verrouillé pour ce bestLevel)", () => {
    const s = fakeStorage();
    s.setItem('jetpackbot.skin', '4');
    expect(loadSkin(s, 5)).toBe(0);
  });

  it("gardes: 'zorg', '-1', '9', '2.5' -> 0", () => {
    for (const raw of ['zorg', '-1', '9', '2.5']) {
      const s = fakeStorage();
      s.setItem('jetpackbot.skin', raw);
      expect(loadSkin(s, 10)).toBe(0);
    }
  });

  it('aller-retour saveSkin/loadSkin', () => {
    const s = fakeStorage();
    saveSkin(s, 3);
    expect(s.getItem('jetpackbot.skin')).toBe('3');
    expect(loadSkin(s, 7)).toBe(3);
  });

  it('saveSkin tolère un storage absent', () => {
    expect(() => saveSkin(undefined, 1)).not.toThrow();
  });
});
```

Dans `tests/engine/state.test.js`, ajouter avant la fermeture du describe `stateMachine` (après le test `MENU <-> OPTIONS…`, ligne 73) :

```js
  it('MENU <-> SKINS (hangar), SKINS ne va pas en PLAY', () => {
    const sm = createStateMachine();
    expect(sm.can(States.SKINS)).toBe(true);
    sm.to(States.SKINS);
    expect(sm.can(States.PLAY)).toBe(false);
    expect(sm.can(States.MENU)).toBe(true);
    sm.to(States.MENU);
    expect(sm.get()).toBe(States.MENU);
  });
```

Dans `tests/game/music.test.js`, ajouter dans le describe `musicFor` (après le test `joue music-menu au MENU et en SAVECODE`, ligne 16) :

```js
  it('joue music-menu dans le hangar SKINS (écran du menu)', () => {
    expect(musicFor(States.SKINS, 2)).toBe('music-menu');
    expect(isLooping(musicFor(States.SKINS, 2))).toBe(true);
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/game/skins.test.js tests/engine/state.test.js tests/game/music.test.js`
Expected: FAIL — `src/game/skins.js` n'existe pas (erreur d'import), `States.SKINS` est `undefined` (le test state échoue sur `can(undefined)`), `musicFor(undefined, 2)` renvoie `null` ≠ `'music-menu'`.

- [ ] **Step 3: Implémentation**

Créer `src/game/skins.js` :

```js
import { CONFIG } from '../config.js';

// Un skin par monde — le déblocage est indexé sur les seuils de tiers
// existants (CONFIG.PATTERN_TIERS, source unique : atteindre le monde =
// posséder son robot). L'accent colore flamme/particules du réacteur.
export const SKINS = [
  { id: 'proto', name: 'PROTO', accent: '#3ef0ff' }, // nuit urbaine (cyan historique)
  { id: 'forge', name: 'FORGE', accent: '#ff9a3e' }, // industriel (orange rouille)
  { id: 'venin', name: 'VENIN', accent: '#7dff3e' }, // toxique (vert acide)
  { id: 'orage', name: 'ORAGE', accent: '#c93eff' }, // tempête néon (violet)
  { id: 'nova', name: 'NOVA', accent: '#fff7d6' },   // orbite (blanc doré)
];

// Préférence d'appareil (convention volumes) — PAS dans le code de sauvegarde.
const KEY_SKIN = 'jetpackbot.skin';

export function skinUnlocked(i, bestLevel) {
  // PROTO toujours débloqué : un nouveau joueur a bestLevel 0 (< seuil 1).
  return i === 0 || bestLevel >= CONFIG.PATTERN_TIERS[i];
}

// Préfixe des 3 clés sprites du skin ('robot', 'robot-thrust-0', …).
export function spriteKey(skin) {
  return skin === 0 ? 'robot' : `robot-s${skin}`;
}

// Garde complète : valeur absente/invalide/hors bornes/verrouillée pour le
// bestLevel courant -> skin 0. (Cas réel : localStorage copié ou save
// restauré par code sur un autre appareil.)
export function loadSkin(storage, bestLevel) {
  const raw = storage?.getItem(KEY_SKIN);
  const n = Number(raw);
  if (raw === null || raw === undefined || !Number.isInteger(n)) return 0;
  if (n < 0 || n >= SKINS.length) return 0;
  if (!skinUnlocked(n, bestLevel)) return 0;
  return n;
}

export function saveSkin(storage, skin) {
  storage?.setItem(KEY_SKIN, String(skin));
}
```

Dans `src/engine/state.js`, remplacer les lignes 1-14 par :

```js
export const States = {
  MENU: 'menu', PLAY: 'play', GAMEOVER: 'gameover', LEVEL_COMPLETE: 'levelcomplete',
  PAUSE: 'pause', SAVECODE: 'savecode', OPTIONS: 'options', SKINS: 'skins',
};

const TRANSITIONS = {
  [States.MENU]: [States.PLAY, States.SAVECODE, States.OPTIONS, States.SKINS],
  [States.PLAY]: [States.GAMEOVER, States.LEVEL_COMPLETE, States.PAUSE],
  [States.GAMEOVER]: [States.PLAY, States.MENU],
  [States.LEVEL_COMPLETE]: [States.PLAY],
  [States.PAUSE]: [States.PLAY, States.MENU, States.OPTIONS],
  [States.SAVECODE]: [States.MENU],
  [States.OPTIONS]: [States.MENU, States.PAUSE],
  [States.SKINS]: [States.MENU],
};
```

Dans `src/game/music.js`, remplacer la ligne 4 par :

```js
const MENU_STATES = new Set([States.MENU, States.SAVECODE, States.SKINS]);
```

- [ ] **Step 4: Vérifier le vert + non-régression**

Run: `npx vitest run tests/game/skins.test.js tests/engine/state.test.js tests/game/music.test.js` puis `npm test`
Expected: PASS partout (246 + 15 = 261 tests : 13 skins + 1 state + 1 music).

- [ ] **Step 5: Commit**

```bash
git add src/game/skins.js src/engine/state.js src/game/music.js tests/game/skins.test.js tests/engine/state.test.js tests/game/music.test.js && git commit -m "feat(skins): table SKINS + déblocage par tier + persistance jetpackbot.skin + état SKINS"
```

---

### Task 2: Menu 5 boutons + createSkinsMenu + config

**Files:**
- Modify: `src/config.js:33` (`MENU_BTN` resserré), `src/config.js:37` (`MENU_BEST_Y`), insertion d'un bloc `SKINS_*` après `OPTIONS_BTN` (ligne 52)
- Modify: `src/game/menu.js:10-17` (`createMenu` + bouton `robots`), ajout de `createSkinsMenu` après `createGameoverMenu` (ligne 42)
- Test: `tests/game/menu.test.js:5-10` et `:42-59` (réécrits), ajouts en fin de describe ; `tests/game/world.test.js` (décalage mécanique des index de boutons du menu)

**Interfaces:**
- Consumes: `build(defs, geom)` (`src/game/menu.js:3-8`), `CONFIG.MENU_BTN`, `CONFIG.SKINS_BTN`.
- Produces:
  - `createMenu(hasSave)` → 5 boutons `['newgame', 'continue', 'robots', 'options', 'code']`, `robots` (label `ROBOTS`) toujours enabled en position 2
  - `createSkinsMenu(unlocked, current, slot)` → `{ buttons: [{ id: 'choose', … }, { id: 'back', label: 'RETOUR', … }], focus }` sur la géométrie `CONFIG.SKINS_BTN` ; `choose` a `label: 'ACTUEL'` si `slot === current` (drawButton lit `label`), `enabled: unlocked && slot !== current`
  - `CONFIG.SKINS_BTN`, `CONFIG.SKINS_TITLE_Y`, `CONFIG.SKINS_PREVIEW`, `CONFIG.SKINS_NAME_Y`, `CONFIG.SKINS_ARROW` (consommés par Tasks 3 et 5)

Écart vs spec (une ligne) : `MENU_BEST_Y` passe de 600 à 636 — avec `y0: 320, gap: 62` le 5e bouton occupe 568-624 et chevaucherait le libellé « Best » resté à 600.

- [ ] **Step 1: Écrire les tests (rouge)**

Dans `tests/game/menu.test.js`, remplacer l'import (ligne 2) par :

```js
import { createMenu, createSavecodeMenu, createPauseMenu, createGameoverMenu, createSkinsMenu, hitTest, inRect, moveFocus, focusedId, activate } from '../../src/game/menu.js';
import { CONFIG } from '../../src/config.js';
```

Remplacer le test `createMenu: 4 boutons…` (lignes 5-10) par :

```js
  it('createMenu: 5 boutons ordonnés, continue disabled par défaut, le reste enabled', () => {
    const m = createMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['newgame', 'continue', 'robots', 'options', 'code']);
    expect(m.buttons.map((b) => b.label)).toEqual(['NEW GAME', 'CONTINUE', 'ROBOTS', 'OPTIONS', 'CODE']);
    expect(m.buttons.map((b) => b.enabled)).toEqual([true, false, true, true, true]);
    expect(focusedId(m)).toBe('newgame');
  });
```

Remplacer le test `moveFocus saute continue (disabled) et va sur options` (lignes 42-48) par :

```js
  it('moveFocus saute continue (disabled) et va sur robots', () => {
    const m = createMenu();
    moveFocus(m, 1);
    expect(focusedId(m)).toBe('robots');
    moveFocus(m, -1);
    expect(focusedId(m)).toBe('newgame');
  });
```

Remplacer le test `moveFocus parcourt tout quand tout est enabled` (lignes 50-59) par :

```js
  it('moveFocus parcourt tout quand tout est enabled', () => {
    const m = createMenu(true);
    expect(focusedId(m)).toBe('newgame');
    moveFocus(m, 1); expect(focusedId(m)).toBe('continue');
    moveFocus(m, 1); expect(focusedId(m)).toBe('robots');
    moveFocus(m, 1); expect(focusedId(m)).toBe('options');
    moveFocus(m, 1); expect(focusedId(m)).toBe('code');
    moveFocus(m, 1); expect(focusedId(m)).toBe('newgame');
    moveFocus(m, -1); expect(focusedId(m)).toBe('code');
  });
```

Ajouter en fin de describe `menu` (avant la fermeture, ligne 113) :

```js
  it('layout MENU_BTN resserré: y0 320, gap 62, le 5e bouton tient dans le canvas', () => {
    const m = createMenu(true);
    expect(m.buttons[0].y).toBe(320);
    expect(m.buttons[1].y - m.buttons[0].y).toBe(62);
    const last = m.buttons[4];
    expect(last.y).toBe(320 + 4 * 62); // 568
    expect(last.y + last.h).toBeLessThanOrEqual(640);
  });

  it('createSkinsMenu débloqué non courant: CHOISIR enabled + RETOUR, focus choose', () => {
    const m = createSkinsMenu(true, 0, 1);
    expect(m.buttons.map((b) => b.id)).toEqual(['choose', 'back']);
    expect(m.buttons.map((b) => b.label)).toEqual(['CHOISIR', 'RETOUR']);
    expect(m.buttons.map((b) => b.enabled)).toEqual([true, true]);
    expect(focusedId(m)).toBe('choose');
  });

  it('createSkinsMenu slot courant: label ACTUEL disabled, focus back', () => {
    const m = createSkinsMenu(true, 2, 2);
    expect(m.buttons[0].label).toBe('ACTUEL');
    expect(m.buttons[0].enabled).toBe(false);
    expect(focusedId(m)).toBe('back');
  });

  it('createSkinsMenu verrouillé: CHOISIR disabled, focus back', () => {
    const m = createSkinsMenu(false, 0, 3);
    expect(m.buttons[0].label).toBe('CHOISIR');
    expect(m.buttons[0].enabled).toBe(false);
    expect(focusedId(m)).toBe('back');
  });

  it('createSkinsMenu utilise la géométrie SKINS_BTN', () => {
    const m = createSkinsMenu(true, 0, 1);
    expect(m.buttons[0].x).toBe(CONFIG.SKINS_BTN.x);
    expect(m.buttons[0].y).toBe(CONFIG.SKINS_BTN.y0);
    expect(m.buttons[1].y).toBe(CONFIG.SKINS_BTN.y0 + CONFIG.SKINS_BTN.gap);
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/game/menu.test.js`
Expected: FAIL — `createSkinsMenu` n'est pas exporté (erreur d'import) ; après export, `createMenu` n'a que 4 boutons et `MENU_BTN.y0` vaut 330/gap 66.

- [ ] **Step 3: Implémentation**

Dans `src/config.js`, remplacer les lignes 33 et 37 :

```js
  MENU_BTN: { x: 80, w: 200, h: 56, y0: 320, gap: 62 }, // 5 boutons, dernier à 568-624
```

```js
  MENU_BEST_Y: 636, // sous le 5e bouton (568-624)
```

et insérer après `OPTIONS_BTN` (ligne 52) :

```js
  // Écran ROBOTS (hangar de skins)
  SKINS_TITLE_Y: 96,
  SKINS_PREVIEW: { x: 84, y: 150, size: 192 }, // sprite 64 agrandi ×3, centré
  SKINS_NAME_Y: 392,
  SKINS_ARROW: { w: 40, h: 60, lx: 16, rx: 304, y: 216 }, // zones tap des flèches < >
  SKINS_BTN: { x: 80, w: 200, h: 56, y0: 470, gap: 66 },  // CHOISIR / RETOUR
```

Dans `src/game/menu.js`, remplacer `createMenu` (lignes 10-17) par :

```js
export function createMenu(hasSave = false) {
  return build([
    { id: 'newgame', label: 'NEW GAME', enabled: true },
    { id: 'continue', label: 'CONTINUE', enabled: hasSave },
    { id: 'robots', label: 'ROBOTS', enabled: true },
    { id: 'options', label: 'OPTIONS', enabled: true },
    { id: 'code', label: 'CODE', enabled: true },
  ], CONFIG.MENU_BTN);
}
```

et ajouter après `createGameoverMenu` (ligne 42) :

```js
// Boutons du hangar : le libellé et l'état de `choose` dépendent du slot
// affiché (drawButton lit `label`) — le menu est recréé à chaque changement.
export function createSkinsMenu(unlocked, current, slot) {
  const actuel = slot === current;
  return build([
    { id: 'choose', label: actuel ? 'ACTUEL' : 'CHOISIR', enabled: unlocked && !actuel },
    { id: 'back', label: 'RETOUR', enabled: true },
  ], CONFIG.SKINS_BTN);
}
```

Décaler les index du menu dans `tests/game/world.test.js` (le bouton `robots` s'insère en position 2 : `options` 2→3, `code` 3→4 ; les `w.savecode.menu.buttons[...]` et `w.pause.buttons[...]` ne matchent pas le motif et ne bougent pas) :

```bash
sed -i -e 's/w\.menu\.buttons\[3\]/w.menu.buttons[4]/g' -e 's/w\.menu\.buttons\[2\]/w.menu.buttons[3]/g' tests/game/world.test.js
```

Puis vérifier le résultat (aucun `w.menu.buttons[2]` restant, le commentaire `// options` suit désormais `buttons[3]`) :

```bash
grep -n "w\.menu\.buttons\[" tests/game/world.test.js
```

- [ ] **Step 4: Vérifier le vert + non-régression**

Run: `npx vitest run tests/game/menu.test.js tests/game/world.test.js tests/render/menu.test.js` puis `npm test`
Expected: PASS partout (261 + 5 = 266 tests). Les tests render du menu passent sans modification (assertions en `arrayContaining`).

- [ ] **Step 5: Commit**

```bash
git add src/config.js src/game/menu.js tests/game/menu.test.js tests/game/world.test.js && git commit -m "feat(menu): bouton ROBOTS (5 boutons resserrés) + createSkinsMenu + géométrie hangar"
```

---

### Task 3: Routage world (ouverture, slots, sélection, retour)

**Files:**
- Modify: `src/game/world.js:16` (import menu : + `createSkinsMenu`), `:20` (nouvel import `./skins.js` juste après), `:22-56` (`createWorld` : `skin` + `skinsScreen`), après `closeOptions` (ligne 91) : helpers `skinsMenuFor`/`openSkins`/`adjustSkins`, `:122-136` (press MENU : branche `robots`), `:183-199` (nouvelle branche SKINS après OPTIONS), `:202-209` (`navMenu`), `:211-218` (`escapeAction`), `:228-232` (`adjustAction`)
- Test: `tests/game/world.test.js` (nouveau describe `skins routing (hangar)` avant la fermeture du describe `world`)

**Interfaces:**
- Consumes: `SKINS`, `skinUnlocked`, `loadSkin`, `saveSkin` (Task 1) ; `createSkinsMenu`, `CONFIG.SKINS_ARROW` (Task 2) ; `hitTest`/`activate`/`moveFocus`/`inRect` existants ; `onAdjust` de `src/engine/input.js` (déjà câblé sur `adjustAction` dans `src/main.js:91`).
- Produces:
  - `world.skin: number` (chargé au `createWorld` depuis le bestLevel persisté)
  - `world.skinsScreen: null | { slot: number, menu }` (créé à l'ouverture, comme `world.options`)
  - `adjustSkins(world, dir)` exporté (boucle 0↔4, recrée le menu du slot)
  - `press`/`navMenu`/`escapeAction`/`adjustAction` étendus à l'état SKINS

Note (interprétation spec « souris/tap, tout comme les autres menus ») : les flèches `<` `>` sont aussi des zones tap (`CONFIG.SKINS_ARROW`), sinon le changement de slot serait impossible au tactile.

- [ ] **Step 1: Écrire les tests (rouge)**

Dans `tests/game/world.test.js`, ajouter avant la fermeture du describe `world` (après le describe `options routing`) :

```js
  describe('skins routing (hangar)', () => {
    function storageWith(entries) {
      const d = { ...entries };
      return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } };
    }

    function openHangar(w) {
      const b = w.menu.buttons[2]; // robots
      press(w, { x: b.x + 1, y: b.y + 1 });
    }

    it('createWorld charge le skin persisté (débloqué)', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '5', 'jetpackbot.skin': '2' }));
      expect(w.skin).toBe(2);
    });

    it('createWorld ramène un skin verrouillé à 0', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '3', 'jetpackbot.skin': '4' }));
      expect(w.skin).toBe(0);
    });

    it('menu: clic ROBOTS ouvre le hangar sur le skin sélectionné (label ACTUEL)', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '5', 'jetpackbot.skin': '2' }));
      openHangar(w);
      expect(w.sm.get()).toBe(States.SKINS);
      expect(w.skinsScreen.slot).toBe(2);
      expect(w.skinsScreen.menu.buttons[0].label).toBe('ACTUEL');
      expect(w.skinsScreen.menu.buttons[0].enabled).toBe(false);
    });

    it('adjustAction boucle les slots 0<->4', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '10' }));
      openHangar(w);
      expect(w.skinsScreen.slot).toBe(0);
      adjustAction(w, -1);
      expect(w.skinsScreen.slot).toBe(4);
      adjustAction(w, 1);
      expect(w.skinsScreen.slot).toBe(0);
      adjustAction(w, 1);
      expect(w.skinsScreen.slot).toBe(1);
    });

    it('CHOISIR débloqué: sélectionne, persiste, reste en SKINS, label ACTUEL', () => {
      const storage = storageWith({ 'jetpackbot.bestLevel': '5' });
      const w = createWorld(storage);
      openHangar(w);
      adjustAction(w, 1); // slot 1 (FORGE, débloqué à best 5)
      expect(w.skinsScreen.menu.buttons[0].label).toBe('CHOISIR');
      press(w); // clavier : focus sur CHOISIR (premier enabled)
      expect(w.skin).toBe(1);
      expect(storage.getItem('jetpackbot.skin')).toBe('1');
      expect(w.sm.get()).toBe(States.SKINS);
      expect(w.skinsScreen.menu.buttons[0].label).toBe('ACTUEL');
      expect(w.skinsScreen.menu.buttons[0].enabled).toBe(false);
    });

    it('CHOISIR verrouillé inactif (clic = no-op, rien persisté)', () => {
      const storage = storageWith({ 'jetpackbot.bestLevel': '3' });
      const w = createWorld(storage);
      openHangar(w);
      adjustAction(w, 1); adjustAction(w, 1); // slot 2 (VENIN, verrouillé à best 3)
      const b = w.skinsScreen.menu.buttons[0];
      expect(b.enabled).toBe(false);
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.skin).toBe(0);
      expect(storage.getItem('jetpackbot.skin')).toBe(null);
      expect(w.sm.get()).toBe(States.SKINS);
    });

    it('tap sur les zones flèches < > change le slot', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '10' }));
      openHangar(w);
      const A = CONFIG.SKINS_ARROW;
      press(w, { x: A.rx + 1, y: A.y + 1 });
      expect(w.skinsScreen.slot).toBe(1);
      press(w, { x: A.lx + 1, y: A.y + 1 });
      expect(w.skinsScreen.slot).toBe(0);
    });

    it('RETOUR et Escape ramènent au MENU', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '5' }));
      openHangar(w);
      const back = w.skinsScreen.menu.buttons[1];
      press(w, { x: back.x + 1, y: back.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
      openHangar(w);
      escapeAction(w);
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('navMenu agit en SKINS', () => {
      const w = createWorld(storageWith({ 'jetpackbot.bestLevel': '5' }));
      openHangar(w);
      adjustAction(w, 1); // slot 1 : CHOISIR + RETOUR tous deux enabled
      const before = w.skinsScreen.menu.focus;
      navMenu(w, 1);
      expect(w.skinsScreen.menu.focus).not.toBe(before);
    });
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/game/world.test.js`
Expected: FAIL — `w.skin` est `undefined`, le clic ROBOTS est un no-op (l'état reste `menu`), `w.skinsScreen` est `undefined` (TypeError sur `.slot`).

- [ ] **Step 3: Implémentation**

Dans `src/game/world.js` :

1. Remplacer la ligne 16 par :

```js
import { createMenu, createPauseMenu, createGameoverMenu, createSkinsMenu, hitTest, activate, moveFocus, inRect } from './menu.js';
```

2. Ajouter après `import { loadSettings } from './settings.js';` (ligne 20) :

```js
import { SKINS, skinUnlocked, loadSkin, saveSkin } from './skins.js';
```

3. Dans `createWorld` (lignes 22-56), ajouter après `settings: loadSettings(storage),` (ligne 30) :

```js
    skin: loadSkin(storage, score.bestLevel),
    skinsScreen: null,
```

4. Ajouter après `closeOptions` (ligne 91, avant `syncVolume`) :

```js
// Hangar de skins — le menu CHOISIR/RETOUR est recréé à chaque changement
// de slot (libellé ACTUEL et enabled dépendent du slot affiché).
function skinsMenuFor(world, slot) {
  return createSkinsMenu(skinUnlocked(slot, world.score.bestLevel), world.skin, slot);
}

function openSkins(world) {
  world.skinsScreen = { slot: world.skin, menu: skinsMenuFor(world, world.skin) };
  world.sm.to(States.SKINS);
}

export function adjustSkins(world, dir) {
  const s = world.skinsScreen;
  s.slot = (s.slot + dir + SKINS.length) % SKINS.length;
  s.menu = skinsMenuFor(world, s.slot);
}
```

5. Dans `press`, branche MENU (lignes 122-136), ajouter avant la branche `options` :

```js
    } else if (id === 'robots') {
      openSkins(world);
```

(le bloc devient : `newgame` / `continue` / `code` / `robots` / `options`.)

6. Toujours dans `press`, ajouter une branche SKINS après la branche OPTIONS (après la ligne 199, avant la fermeture de la fonction) :

```js
  } else if (state === States.SKINS) {
    const sc = world.skinsScreen;
    const A = CONFIG.SKINS_ARROW;
    if (pointer && inRect({ x: A.lx, y: A.y, w: A.w, h: A.h }, pointer.x, pointer.y)) {
      adjustSkins(world, -1);
    } else if (pointer && inRect({ x: A.rx, y: A.y, w: A.w, h: A.h }, pointer.x, pointer.y)) {
      adjustSkins(world, 1);
    } else {
      const id = pointer ? hitTest(sc.menu, pointer.x, pointer.y) : activate(sc.menu);
      if (id === 'choose') {
        world.skin = sc.slot;
        saveSkin(world.storage, sc.slot);
        sc.menu = skinsMenuFor(world, sc.slot); // le libellé passe à ACTUEL
      } else if (id === 'back') {
        toMenu(world);
      }
      // null -> no-op
    }
  }
```

7. Dans `navMenu` (lignes 202-209), ajouter après la ligne SAVECODE :

```js
  else if (s === States.SKINS) moveFocus(world.skinsScreen.menu, dir);
```

8. Dans `escapeAction` (lignes 211-218), ajouter après la ligne SAVECODE :

```js
  else if (s === States.SKINS) toMenu(world);
```

9. Remplacer `adjustAction` (lignes 228-232) par :

```js
export function adjustAction(world, dir) {
  const s = world.sm.get();
  if (s === States.SKINS) { adjustSkins(world, dir); return; }
  if (s !== States.OPTIONS) return;
  const id = adjust(world.options, dir);
  if (id) syncVolume(world, id);
}
```

- [ ] **Step 4: Vérifier le vert + non-régression**

Run: `npx vitest run tests/game/world.test.js` puis `npm test`
Expected: PASS partout (266 + 9 = 275 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/world.js tests/game/world.test.js && git commit -m "feat(world): routage hangar de skins (ROBOTS, boucle de slots, sélection persistée)"
```

---

### Task 4: Assets — 12 sprites recolorés PixelLab

**Files:**
- Create: `assets/robot-s1.png`, `assets/robot-s1-thrust-0.png`, `assets/robot-s1-thrust-1.png` (idem s2, s3, s4 — 12 fichiers)
- Create: `assets/preview/robot-s*` (candidats, trace du QC)

**Interfaces:**
- Consumes: `scripts/pixellab.mjs` (`edit --input PATH --description "..." --no-bg true --seed N --out-dir D --name X`), clé `PIXELLAB_API_KEY` dans `.env`, sprites sources `assets/robot.png`, `assets/robot-thrust-0.png`, `assets/robot-thrust-1.png` (64×64 RGBA).
- Produces: les 12 PNG 64×64 colorType 6 que Task 5 importe. Noms EXACTS : `robot-s{1..4}.png`, `robot-s{1..4}-thrust-{0,1}.png`.

Note : la flamme des sprites thrust est recolorée avec le robot (les descriptions couvrent tout le sprite) — c'est voulu, elle doit matcher l'accent ; les particules du réacteur, elles, sont dessinées par le renderer (Task 5).

- [ ] **Step 1: Générer FORGE (s1) — 3 poses, seed 601**

```bash
node scripts/pixellab.mjs edit --input assets/robot.png --description "recolor this small flying robot: rust orange body panels with red accents, hot forge metal look, keep the exact same silhouette, pose and pixel style, only change the colors, recolor the robot only" --no-bg true --seed 601 --out-dir assets/preview --name robot-s1
node scripts/pixellab.mjs edit --input assets/robot-thrust-0.png --description "recolor this small flying robot: rust orange body panels with red accents, hot forge metal look, keep the exact same silhouette, pose and pixel style, only change the colors, recolor the robot only" --no-bg true --seed 601 --out-dir assets/preview --name robot-s1-thrust-0
node scripts/pixellab.mjs edit --input assets/robot-thrust-1.png --description "recolor this small flying robot: rust orange body panels with red accents, hot forge metal look, keep the exact same silhouette, pose and pixel style, only change the colors, recolor the robot only" --no-bg true --seed 601 --out-dir assets/preview --name robot-s1-thrust-1
```

- [ ] **Step 2: Générer VENIN (s2) — 3 poses, seed 621**

```bash
node scripts/pixellab.mjs edit --input assets/robot.png --description "recolor this small flying robot: acid green body panels with yellow accents, hazmat toxic look, keep the exact same silhouette, pose and pixel style, only change the colors, recolor the robot only" --no-bg true --seed 621 --out-dir assets/preview --name robot-s2
node scripts/pixellab.mjs edit --input assets/robot-thrust-0.png --description "recolor this small flying robot: acid green body panels with yellow accents, hazmat toxic look, keep the exact same silhouette, pose and pixel style, only change the colors, recolor the robot only" --no-bg true --seed 621 --out-dir assets/preview --name robot-s2-thrust-0
node scripts/pixellab.mjs edit --input assets/robot-thrust-1.png --description "recolor this small flying robot: acid green body panels with yellow accents, hazmat toxic look, keep the exact same silhouette, pose and pixel style, only change the colors, recolor the robot only" --no-bg true --seed 621 --out-dir assets/preview --name robot-s2-thrust-1
```

- [ ] **Step 3: Générer ORAGE (s3) — 3 poses, seed 641**

```bash
node scripts/pixellab.mjs edit --input assets/robot.png --description "recolor this small flying robot: electric purple body panels with magenta accents, neon storm supercell look, keep the exact same silhouette, pose and pixel style, only change the colors, recolor the robot only" --no-bg true --seed 641 --out-dir assets/preview --name robot-s3
node scripts/pixellab.mjs edit --input assets/robot-thrust-0.png --description "recolor this small flying robot: electric purple body panels with magenta accents, neon storm supercell look, keep the exact same silhouette, pose and pixel style, only change the colors, recolor the robot only" --no-bg true --seed 641 --out-dir assets/preview --name robot-s3-thrust-0
node scripts/pixellab.mjs edit --input assets/robot-thrust-1.png --description "recolor this small flying robot: electric purple body panels with magenta accents, neon storm supercell look, keep the exact same silhouette, pose and pixel style, only change the colors, recolor the robot only" --no-bg true --seed 641 --out-dir assets/preview --name robot-s3-thrust-1
```

- [ ] **Step 4: Générer NOVA (s4) — 3 poses, seed 661**

```bash
node scripts/pixellab.mjs edit --input assets/robot.png --description "recolor this small flying robot: off-white body panels with golden accents, clean space suit look, keep the exact same silhouette, pose and pixel style, only change the colors, recolor the robot only" --no-bg true --seed 661 --out-dir assets/preview --name robot-s4
node scripts/pixellab.mjs edit --input assets/robot-thrust-0.png --description "recolor this small flying robot: off-white body panels with golden accents, clean space suit look, keep the exact same silhouette, pose and pixel style, only change the colors, recolor the robot only" --no-bg true --seed 661 --out-dir assets/preview --name robot-s4-thrust-0
node scripts/pixellab.mjs edit --input assets/robot-thrust-1.png --description "recolor this small flying robot: off-white body panels with golden accents, clean space suit look, keep the exact same silhouette, pose and pixel style, only change the colors, recolor the robot only" --no-bg true --seed 661 --out-dir assets/preview --name robot-s4-thrust-1
```

- [ ] **Step 5: QC visuel (contrôleur)**

Ouvrir (Read) les 12 candidats de `assets/preview/` et les 3 originaux (`assets/robot.png`, `assets/robot-thrust-0.png`, `assets/robot-thrust-1.png`). Critères, dans l'ordre :
1. Silhouette identique à l'original (mêmes proportions, même pose — les 3 poses d'un skin doivent rester cohérentes entre elles).
2. Lisibilité sur fond sombre (le robot doit ressortir sur les 5 décors ; NOVA ne doit pas éblouir, ORAGE ne doit pas se fondre dans le décor tempête).
3. Palette du thème respectée (FORGE orange rouille/rouge, VENIN vert acide/jaune, ORAGE violet/magenta, NOVA blanc cassé/doré), pas d'artefacts ni de pixels orphelins.

Si un skin échoue : régénérer ses 3 poses avec seed+10 (611/631/651/671, mêmes descriptions) — max 2 vagues avant de report DONE_WITH_CONCERNS.

- [ ] **Step 6: Finaliser et vérifier les dimensions**

```bash
cp assets/preview/robot-s1.png assets/robot-s1.png
cp assets/preview/robot-s1-thrust-0.png assets/robot-s1-thrust-0.png
cp assets/preview/robot-s1-thrust-1.png assets/robot-s1-thrust-1.png
cp assets/preview/robot-s2.png assets/robot-s2.png
cp assets/preview/robot-s2-thrust-0.png assets/robot-s2-thrust-0.png
cp assets/preview/robot-s2-thrust-1.png assets/robot-s2-thrust-1.png
cp assets/preview/robot-s3.png assets/robot-s3.png
cp assets/preview/robot-s3-thrust-0.png assets/robot-s3-thrust-0.png
cp assets/preview/robot-s3-thrust-1.png assets/robot-s3-thrust-1.png
cp assets/preview/robot-s4.png assets/robot-s4.png
cp assets/preview/robot-s4-thrust-0.png assets/robot-s4-thrust-0.png
cp assets/preview/robot-s4-thrust-1.png assets/robot-s4-thrust-1.png
node -e "const fs=require('fs'); for (let s=1;s<=4;s++) for (const p of ['','-thrust-0','-thrust-1']) { const f='robot-s'+s+p; const b=fs.readFileSync('assets/'+f+'.png'); console.log(f, b.readUInt32BE(16)+'x'+b.readUInt32BE(20), 'colorType', b[25]); }"
```

Expected: 12 lignes, toutes `64x64 colorType 6` (RGBA, comme les originaux).

- [ ] **Step 7: Commit**

```bash
git add assets/robot-s1.png assets/robot-s1-thrust-0.png assets/robot-s1-thrust-1.png assets/robot-s2.png assets/robot-s2-thrust-0.png assets/robot-s2-thrust-1.png assets/robot-s3.png assets/robot-s3-thrust-0.png assets/robot-s3-thrust-1.png assets/robot-s4.png assets/robot-s4-thrust-0.png assets/robot-s4-thrust-1.png assets/preview/ && git commit -m "feat(assets): 4 skins robot recolorés PixelLab (12 sprites 64x64)"
```

---

### Task 5: Rendu — écran hangar + skin en jeu

**Files:**
- Create: `src/render/skins.js`
- Modify: `src/render/renderer.js:63` (accent particules), `:68-81` (sprites du skin + exclusion SKINS), `:115-116` (dispatch : branche SKINS après OPTIONS), imports lignes 1-10
- Modify: `src/main.js:15-17` (12 imports sprites après les 3 existants), `:112-130` (12 entrées dans la map `loadImages`)
- Test: `tests/render/skins.test.js` (nouveau), `tests/render/renderer.test.js` (nouveau)

**Interfaces:**
- Consumes: `SKINS`, `skinUnlocked`, `spriteKey` (Task 1) ; `CONFIG.SKINS_*` (Task 2) ; `world.skin`, `world.skinsScreen` (Task 3) ; `drawButtons` (`src/render/buttons.js:31`) ; les 12 sprites (Task 4).
- Produces: `renderSkins(ctx, world, assets, makeCanvas?)` — le 4e paramètre (fabrique de canvas hors-écran, défaut `document.createElement('canvas')`) rend la silhouette testable en env node.

Écarts vs spec (suivre le code réel) :
- Le dispatch de rendu par état vit dans `src/render/renderer.js` (lignes 109-127), pas dans `main.js` — la branche SKINS s'y ajoute.
- Il n'y a pas de « flamme » dessinée par le renderer : les lignes 100-103 sont l'icône pause (UI, reste cyan) ; la flamme visuelle vient des sprites thrust recolorés (Task 4) et l'accent du skin s'applique à la traînée de particules du réacteur (ligne 63).

- [ ] **Step 1: Écrire les tests (rouge)**

Créer `tests/render/skins.test.js` :

```js
import { describe, it, expect, vi } from 'vitest';
import { renderSkins } from '../../src/render/skins.js';
import { createSkinsMenu } from '../../src/game/menu.js';
import { CONFIG } from '../../src/config.js';

function fakeCtx() {
  return {
    drawn: [], texts: [], fillStyles: [], _font: '10px x',
    drawImage(img, ...rest) { this.drawn.push({ img, rest }); },
    fillRect: vi.fn(),
    fillText(t) { this.texts.push(t); },
    measureText(t) { return { width: t.length * parseInt(this._font, 10) }; },
    save: vi.fn(), restore: vi.fn(),
    set fillStyle(v) { this.fillStyles.push(v); }, get fillStyle() { return ''; },
    set font(v) { this._font = v; }, get font() { return this._font; },
    set textAlign(_) {}, get textAlign() { return ''; },
    set textBaseline(_) {}, get textBaseline() { return ''; },
    set globalAlpha(_) {}, get globalAlpha() { return 1; },
  };
}

// Canvas hors-écran factice : enregistre les opérations de la silhouette.
function fakeOffscreen() {
  const ops = [];
  const octx = {
    clearRect: (...a) => ops.push(['clearRect', ...a]),
    drawImage: () => ops.push(['drawImage']),
    fillRect: (...a) => ops.push(['fillRect', ...a]),
    set globalCompositeOperation(v) { ops.push(['gco', v]); },
    get globalCompositeOperation() { return ''; },
    set fillStyle(v) { ops.push(['fillStyle', v]); }, get fillStyle() { return ''; },
  };
  return { width: 0, height: 0, isFakeCanvas: true, ops, getContext: () => octx };
}

function fakeAssets() {
  const keys = ['robot', 'robot-s1', 'robot-s2', 'robot-s3', 'robot-s4', 'btn-plate', 'btn-plate-focus'];
  return Object.fromEntries(keys.map((k) => [k, { key: k, width: 64, height: 64 }]));
}

function worldWith(slot, bestLevel, skin = 0) {
  const unlocked = bestLevel >= CONFIG.PATTERN_TIERS[slot];
  return {
    skin,
    score: { bestLevel },
    skinsScreen: { slot, menu: createSkinsMenu(unlocked, skin, slot) },
  };
}

describe('renderSkins', () => {
  it('slot débloqué: titre, sprite du slot ×3 (robot-s2), nom en couleur accent', () => {
    const ctx = fakeCtx();
    renderSkins(ctx, worldWith(2, 5), fakeAssets(), fakeOffscreen);
    expect(ctx.texts).toEqual(expect.arrayContaining(['ROBOTS', 'VENIN']));
    const P = CONFIG.SKINS_PREVIEW;
    const preview = ctx.drawn.find((d) => d.img.key === 'robot-s2');
    expect(preview.rest).toEqual([P.x, P.y, P.size, P.size]);
    expect(ctx.fillStyles).toContain('#7dff3e'); // accent VENIN
  });

  it('slot verrouillé: silhouette via canvas hors-écran (source-in) + NIVEAU requis', () => {
    const ctx = fakeCtx();
    const off = fakeOffscreen();
    renderSkins(ctx, worldWith(4, 5), fakeAssets(), () => off);
    // le sprite passe par le canvas hors-écran, pas directement sur l'écran
    expect(ctx.drawn.some((d) => d.img.isFakeCanvas)).toBe(true);
    expect(ctx.drawn.some((d) => d.img.key === 'robot-s4')).toBe(false);
    expect(off.ops).toEqual(expect.arrayContaining([['gco', 'source-in']]));
    expect(ctx.texts).toContain('NIVEAU 10');
    expect(ctx.texts).not.toContain('NOVA');
  });

  it('flèches < > et boutons partagés dessinés', () => {
    const ctx = fakeCtx();
    renderSkins(ctx, worldWith(1, 5), fakeAssets(), fakeOffscreen);
    expect(ctx.texts).toEqual(expect.arrayContaining(['<', '>', 'CHOISIR', 'RETOUR']));
    expect(ctx.drawn.some((d) => d.img.key === 'btn-plate' || d.img.key === 'btn-plate-focus')).toBe(true);
  });
});
```

Créer `tests/render/renderer.test.js` :

```js
import { describe, it, expect, vi } from 'vitest';
import { renderWorld } from '../../src/render/renderer.js';
import { createWorld, press } from '../../src/game/world.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } };
}

function fakeCtx() {
  return {
    drawn: [], texts: [], fillStyles: [], _font: '10px x',
    drawImage(img, ...rest) { this.drawn.push({ img, rest }); },
    fillRect: vi.fn(), strokeRect: vi.fn(), translate: vi.fn(),
    fillText(t) { this.texts.push(t); },
    measureText(t) { return { width: t.length * parseInt(this._font, 10) }; },
    save: vi.fn(), restore: vi.fn(),
    set fillStyle(v) { this.fillStyles.push(v); }, get fillStyle() { return ''; },
    set strokeStyle(_) {}, get strokeStyle() { return ''; },
    set lineWidth(_) {}, get lineWidth() { return 1; },
    set font(v) { this._font = v; }, get font() { return this._font; },
    set textAlign(_) {}, get textAlign() { return ''; },
    set textBaseline(_) {}, get textBaseline() { return ''; },
    set globalAlpha(_) {}, get globalAlpha() { return 1; },
  };
}

function fakeAssets() {
  const keys = ['bg-far-0', 'bg-near-0', 'obstacle',
    'robot', 'robot-thrust-0', 'robot-thrust-1',
    'robot-s2', 'robot-s2-thrust-0', 'robot-s2-thrust-1',
    'btn-plate', 'btn-plate-focus'];
  return Object.fromEntries(keys.map((k) => [k, { key: k, width: 64, height: 64 }]));
}

function playWorldWithSkin(skin) {
  const w = createWorld(fakeStorage());
  press(w); // MENU -> PLAY (focus NEW GAME)
  w.bgSet = 0;
  w.skin = skin;
  return w;
}

describe('renderWorld — skin en jeu', () => {
  it('chute: sprite idle du skin (robot-s2), pas le robot de base', () => {
    const w = playWorldWithSkin(2);
    w.robot.vy = 100;
    const ctx = fakeCtx();
    renderWorld(ctx, w, fakeAssets());
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('robot-s2');
    expect(keys).not.toContain('robot');
  });

  it('montée: frame thrust du skin (robot-s2-thrust-0 au tick 0)', () => {
    const w = playWorldWithSkin(2);
    w.robot.vy = -100;
    const ctx = fakeCtx();
    renderWorld(ctx, w, fakeAssets());
    expect(ctx.drawn.map((d) => d.img.key)).toContain('robot-s2-thrust-0');
  });

  it('particules réacteur à la couleur accent du skin', () => {
    const w = playWorldWithSkin(2);
    w.particles.particles.push({ x: 10, y: 10, life: 0.5, maxLife: 1 });
    const ctx = fakeCtx();
    renderWorld(ctx, w, fakeAssets());
    expect(ctx.fillStyles).toContain('#7dff3e'); // accent VENIN
  });

  it('skin 0: sprites historiques (robot)', () => {
    const w = playWorldWithSkin(0);
    w.robot.vy = 100;
    const ctx = fakeCtx();
    renderWorld(ctx, w, fakeAssets());
    expect(ctx.drawn.map((d) => d.img.key)).toContain('robot');
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/render/skins.test.js tests/render/renderer.test.js`
Expected: FAIL — `src/render/skins.js` n'existe pas (erreur d'import) ; dans `renderer.test.js`, `robot-s2` n'est jamais dessiné (le renderer utilise `assets.robot` codé en dur) et `#7dff3e` absent des fillStyles (`#3ef0ff` codé en dur).

- [ ] **Step 3: Implémentation**

Créer `src/render/skins.js` :

```js
import { CONFIG } from '../config.js';
import { SKINS, skinUnlocked, spriteKey } from '../game/skins.js';
import { drawButtons } from './buttons.js';

// Fabrique du canvas hors-écran — injectable pour les tests (env node).
function defaultMakeCanvas() {
  return document.createElement('canvas');
}

// Silhouette noire du sprite : dessin sur canvas hors-écran puis composite
// source-in (le noir ne reste que sur les pixels opaques du sprite).
function drawSilhouette(ctx, sprite, x, y, size, makeCanvas) {
  const off = makeCanvas();
  off.width = sprite.width;
  off.height = sprite.height;
  const octx = off.getContext('2d');
  octx.clearRect(0, 0, off.width, off.height);
  octx.drawImage(sprite, 0, 0);
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = '#05060a';
  octx.fillRect(0, 0, off.width, off.height);
  octx.globalCompositeOperation = 'source-over';
  ctx.drawImage(off, x, y, size, size);
}

// Écran hangar — dessiné par-dessus le décor parallaxe vivant (comme le menu).
export function renderSkins(ctx, world, assets, makeCanvas = defaultMakeCanvas) {
  const { slot } = world.skinsScreen;
  const unlocked = skinUnlocked(slot, world.score.bestLevel);
  const P = CONFIG.SKINS_PREVIEW;
  const sprite = assets[spriteKey(slot)];

  // Titre (même style que les autres écrans)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('ROBOTS', CONFIG.WIDTH / 2, CONFIG.SKINS_TITLE_Y);

  // Aperçu ×3 — silhouette noire si verrouillé
  if (unlocked) {
    ctx.drawImage(sprite, P.x, P.y, P.size, P.size);
  } else {
    drawSilhouette(ctx, sprite, P.x, P.y, P.size, makeCanvas);
  }

  // Nom du skin (couleur accent) ou niveau requis
  ctx.font = `16px ${CONFIG.BTN_FONT_FAMILY}`;
  ctx.fillStyle = unlocked ? SKINS[slot].accent : CONFIG.BTN_TEXT_DISABLED;
  ctx.fillText(
    unlocked ? SKINS[slot].name : `NIVEAU ${CONFIG.PATTERN_TIERS[slot]}`,
    CONFIG.WIDTH / 2, CONFIG.SKINS_NAME_Y,
  );

  // Flèches < > (les zones tap correspondantes vivent dans world.press)
  const A = CONFIG.SKINS_ARROW;
  ctx.font = `24px ${CONFIG.BTN_FONT_FAMILY}`;
  ctx.fillStyle = '#3ef0ff';
  ctx.fillText('<', A.lx + A.w / 2, A.y + A.h / 2 + 8);
  ctx.fillText('>', A.rx + A.w / 2, A.y + A.h / 2 + 8);

  drawButtons(ctx, world.skinsScreen.menu, assets);
}
```

Dans `src/render/renderer.js` :

1. Ajouter aux imports (après la ligne 9 `import { renderOptions } …`) :

```js
import { renderSkins } from './skins.js';
import { SKINS, spriteKey } from '../game/skins.js';
```

2. Remplacer la ligne 63 (`ctx.fillStyle = '#3ef0ff';` du bloc 3b) par :

```js
    ctx.fillStyle = SKINS[world.skin].accent; // accent du skin (cyan pour PROTO)
```

3. Remplacer le bloc robot (lignes 68-81) par :

```js
  // 4. Robot (sprites du skin sélectionné, 64×64 dessinés en 44×44)
  const hudState = world.sm.get();
  if (hudState !== States.MENU && hudState !== States.SAVECODE
      && hudState !== States.OPTIONS && hudState !== States.SKINS) {
    const r = world.robot;
    const key = spriteKey(world.skin);
    let sprite = assets[key]; // idle / chute
    if (r.alive && r.vy < 0) {
      // montée = poussée : alternance des deux frames thrust
      sprite = (Math.floor(world.tick / 6) % 2 === 0)
        ? assets[key + '-thrust-0'] : assets[key + '-thrust-1'];
    }
    const size = 44;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    ctx.drawImage(sprite, Math.round(cx - size / 2), Math.round(cy - size / 2), size, size);
  }
```

4. Dans le dispatch d'états, ajouter après la branche OPTIONS (lignes 115-116) :

```js
  } else if (state === States.SKINS) {
    renderSkins(ctx, world, assets);
```

(L'icône pause lignes 100-103 reste cyan : c'est de l'UI, pas le robot.)

Dans `src/main.js` :

1. Ajouter après `import robotThrust1 …` (ligne 17) :

```js
import robotS1 from '../assets/robot-s1.png';
import robotS1Thrust0 from '../assets/robot-s1-thrust-0.png';
import robotS1Thrust1 from '../assets/robot-s1-thrust-1.png';
import robotS2 from '../assets/robot-s2.png';
import robotS2Thrust0 from '../assets/robot-s2-thrust-0.png';
import robotS2Thrust1 from '../assets/robot-s2-thrust-1.png';
import robotS3 from '../assets/robot-s3.png';
import robotS3Thrust0 from '../assets/robot-s3-thrust-0.png';
import robotS3Thrust1 from '../assets/robot-s3-thrust-1.png';
import robotS4 from '../assets/robot-s4.png';
import robotS4Thrust0 from '../assets/robot-s4-thrust-0.png';
import robotS4Thrust1 from '../assets/robot-s4-thrust-1.png';
```

2. Dans la map `loadImages` (lignes 112-130), ajouter après `'robot-thrust-1': robotThrust1,` :

```js
  'robot-s1': robotS1,
  'robot-s1-thrust-0': robotS1Thrust0,
  'robot-s1-thrust-1': robotS1Thrust1,
  'robot-s2': robotS2,
  'robot-s2-thrust-0': robotS2Thrust0,
  'robot-s2-thrust-1': robotS2Thrust1,
  'robot-s3': robotS3,
  'robot-s3-thrust-0': robotS3Thrust0,
  'robot-s3-thrust-1': robotS3Thrust1,
  'robot-s4': robotS4,
  'robot-s4-thrust-0': robotS4Thrust0,
  'robot-s4-thrust-1': robotS4Thrust1,
```

- [ ] **Step 4: Vérifier le vert + non-régression + build**

Run: `npx vitest run tests/render/skins.test.js tests/render/renderer.test.js` puis `npm test && npm run build`
Expected: PASS partout (275 + 7 = 282 tests), build Vite OK (les 12 PNG résolus comme assets).

- [ ] **Step 5: Commit**

```bash
git add src/render/skins.js src/render/renderer.js src/main.js tests/render/skins.test.js tests/render/renderer.test.js && git commit -m "feat(render): écran hangar ROBOTS + sprites et accent du skin en jeu"
```

---

### Task 6: Vérification finale (contrôleur)

**Files:** aucun (vérification, exécutée par le contrôleur).

- [ ] **Step 1: Suite complète + build**

Run: `npm test && npm run build`
Expected: ≈282 tests PASS (baseline 246 + ajouts Tasks 1-5), build OK.

- [ ] **Step 2: Vérification visuelle Playwright**

Lancer `npx vite --port 5199 --strictPort` et vérifier (piège autoplay connu : interagir avant d'attendre l'audio) :
- Menu principal : 5 boutons `NEW GAME / CONTINUE / ROBOTS / OPTIONS / CODE`, rien ne déborde du canvas (dernier bouton et libellé « Best » visibles).
- Clic ROBOTS : hangar navigable au clavier (←/→ boucle les 5 slots, ↑/↓ + Enter) et au tap (flèches `<` `>`), la musique menu continue.
- Avec `jetpackbot.bestLevel = 5` injecté : slots ORAGE/NOVA en silhouette noire + `NIVEAU 7` / `NIVEAU 10` ; CHOISIR inactif dessus.
- CHOISIR sur VENIN puis reload de la page : le hangar rouvre sur VENIN (sélection persistée `jetpackbot.skin`), le menu reste fonctionnel.
- En jeu avec un skin non-PROTO : robot recoloré (idle + thrust) et traînée de particules à la couleur accent du skin.
- Zéro erreur JS/console sur tout le parcours.

- [ ] **Step 3: Gate final — Jael juge en jeu**

Critères (spec) : le déblocage « atteindre le monde = posséder son robot » se ressent, lisibilité des 4 nouveaux skins sur les 5 décors, le hangar donne envie de progresser. Même session de jeu que les gates décors + musiques (le serveur :5199 sert la branche stackée). **Pas de merge sans son OK.**
