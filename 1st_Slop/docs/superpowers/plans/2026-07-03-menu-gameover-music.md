# Menu Music + Game-Over Jingle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Boucle « chill mais énergique » au menu principal + jingle de défaite one-shot au game over, via le canal musique déclaratif existant.

**Architecture:** `musicFor(state, bgSet, optionsReturn)` couvre désormais tous les états (menu → `music-menu`, game over → `jingle-gameover` non bouclé) ; `setMusic(key, loop)` apprend le flag de boucle ; les deux pistes sont rendues offline par `scripts/music.mjs` avec les instruments existants.

**Tech Stack:** Vanilla JS (ES modules), Vitest, générateur WAV zéro-dépendance (`scripts/music.mjs`), Vite.

**Spec:** `docs/superpowers/specs/2026-07-03-menu-gameover-music-design.md`

## Global Constraints

- Tout le code/commentaires en français, style du dépôt (voir fichiers existants).
- WAV : 16-bit PCM mono 22050 Hz, PRNG seedé (reproductible), boucles bar-aligned sans fade.
- `music-menu` : ~100 BPM, 16 mesures A/B, chill mais énergique, PAS de kick 4-on-the-floor, hats légers.
- `jingle-gameover` : ~2,5 s, one-shot descendant, démarre sur une note tenue (le `sfx-crash` doit rester lisible), résolu (pas de suspension).
- Les tests existants (219) doivent continuer à passer, sauf ceux explicitement mis à jour ici.

---

### Task 1: Nouvelle table d'états de `musicFor` + `isLooping`

**Files:**
- Modify: `src/game/music.js` (7 lignes, réécriture complète)
- Test: `tests/game/music.test.js` (remplace le test « silence »)

**Interfaces:**
- Consumes: `States` de `src/engine/state.js` (MENU, PLAY, GAMEOVER, LEVEL_COMPLETE, PAUSE, SAVECODE, OPTIONS).
- Produces: `musicFor(state, bgSet, optionsReturn = 'menu') -> string | null` et `isLooping(key) -> boolean`. Task 4 (main.js) consomme les deux. Clés produites : `music-{0,1,2}`, `music-menu`, `jingle-gameover`.

- [ ] **Step 1: Écrire les tests (rouge)**

Remplacer intégralement `tests/game/music.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { musicFor, isLooping } from '../../src/game/music.js';
import { States } from '../../src/engine/state.js';

describe('musicFor', () => {
  it('joue music-<bgSet> en PLAY, PAUSE et LEVEL_COMPLETE', () => {
    for (const s of [States.PLAY, States.PAUSE, States.LEVEL_COMPLETE]) {
      expect(musicFor(s, 0)).toBe('music-0');
      expect(musicFor(s, 2)).toBe('music-2');
    }
  });

  it('joue music-menu au MENU et en SAVECODE', () => {
    expect(musicFor(States.MENU, 1)).toBe('music-menu');
    expect(musicFor(States.SAVECODE, 1)).toBe('music-menu');
  });

  it('OPTIONS garde la musique du contexte d\'ouverture', () => {
    expect(musicFor(States.OPTIONS, 1, 'menu')).toBe('music-menu');
    expect(musicFor(States.OPTIONS, 1, 'pause')).toBe('music-1');
    expect(musicFor(States.OPTIONS, 1)).toBe('music-menu'); // défaut
  });

  it('joue le jingle au GAMEOVER', () => {
    expect(musicFor(States.GAMEOVER, 1)).toBe('jingle-gameover');
  });
});

describe('isLooping', () => {
  it('seul le jingle ne boucle pas', () => {
    expect(isLooping('jingle-gameover')).toBe(false);
    expect(isLooping('music-0')).toBe(true);
    expect(isLooping('music-menu')).toBe(true);
    expect(isLooping(null)).toBe(true);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/game/music.test.js`
Expected: FAIL — `isLooping` non exporté, `music-menu`/`jingle-gameover` non retournés (l'actuel renvoie `null`).

- [ ] **Step 3: Implémentation minimale**

Remplacer intégralement `src/game/music.js` :

```js
import { States } from '../engine/state.js';

const GAME_STATES = new Set([States.PLAY, States.PAUSE, States.LEVEL_COMPLETE]);
const MENU_STATES = new Set([States.MENU, States.SAVECODE]);

export function musicFor(state, bgSet, optionsReturn = 'menu') {
  if (GAME_STATES.has(state)) return `music-${bgSet}`;
  if (MENU_STATES.has(state)) return 'music-menu';
  if (state === States.OPTIONS) {
    return optionsReturn === 'pause' ? `music-${bgSet}` : 'music-menu';
  }
  if (state === States.GAMEOVER) return 'jingle-gameover';
  return null;
}

// Le jingle joue une fois puis silence ; tout le reste boucle.
export function isLooping(key) {
  return key !== 'jingle-gameover';
}
```

- [ ] **Step 4: Vérifier le vert + non-régression**

Run: `npx vitest run tests/game/music.test.js` puis `npm test`
Expected: music.test.js PASS ; suite complète PASS (aucun autre test n'appelle `musicFor`).

- [ ] **Step 5: Commit**

```bash
git add src/game/music.js tests/game/music.test.js
git commit -m "feat(music): table d'états complète — menu, options contextuelles, jingle game over"
```

---

### Task 2: Flag de boucle sur `setMusic`

**Files:**
- Modify: `src/engine/audio.js:42-56` (signature et corps de `setMusic`)
- Test: `tests/engine/audio.test.js` (ajouts dans le describe `audio volumes & music`)

**Interfaces:**
- Consumes: rien de nouveau.
- Produces: `setMusic(key, loop = true)` — même sémantique qu'avant (dédup par clé, stop de l'ancienne piste, gain musique), mais `clip.loop = loop`. Task 4 le consomme avec `isLooping(key)`.

- [ ] **Step 1: Écrire les tests (rouge)**

Ajouter à la fin du describe `audio volumes & music` de `tests/engine/audio.test.js` (le helper `trackFake()` existe déjà dans ce fichier) :

```js
  it('setMusic(key, false) joue la piste sans boucler', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'jingle-gameover': 'j.wav' }, FakeAudio);
    audio.setMusic('jingle-gameover', false);
    expect(instances[0].play).toHaveBeenCalled();
    expect(instances[0].loop).toBe(false);
  });

  it('setMusic même clé non bouclée ne redémarre pas le clip (dédup par frame)', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'jingle-gameover': 'j.wav' }, FakeAudio);
    audio.setMusic('jingle-gameover', false);
    audio.setMusic('jingle-gameover', false);
    expect(instances[0].play).toHaveBeenCalledTimes(1);
  });

  it('setMusic boucle par défaut', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-menu': 'm.wav' }, FakeAudio);
    audio.setMusic('music-menu');
    expect(instances[0].loop).toBe(true);
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/engine/audio.test.js`
Expected: FAIL — `loop` vaut `true` en dur, le premier nouveau test échoue (`expect(false)` reçoit `true`).

- [ ] **Step 3: Implémentation minimale**

Dans `src/engine/audio.js`, remplacer `setMusic(key) {` par `setMusic(key, loop = true) {` et `clip.loop = true;` par `clip.loop = loop;`. Rien d'autre ne change.

- [ ] **Step 4: Vérifier le vert + non-régression**

Run: `npx vitest run tests/engine/audio.test.js` puis `npm test`
Expected: PASS partout (l'appel existant `setMusic(key)` garde `loop = true` par défaut).

- [ ] **Step 5: Commit**

```bash
git add src/engine/audio.js tests/engine/audio.test.js
git commit -m "feat(audio): setMusic accepte un flag de boucle (jingles one-shot)"
```

---

### Task 3: Génération des deux pistes (`scripts/music.mjs`)

**Files:**
- Modify: `scripts/music.mjs` (deux définitions de piste + entrées dans `tracks`, avant `mkdirSync`)
- Create: `assets/music-menu.wav`, `assets/jingle-gameover.wav` (générés)

**Interfaces:**
- Consumes: le renderer existant (`render`, `toWav`, voix `{ wave, vol, decay, sustain, vibrato, slide, note }`).
- Produces: les deux fichiers WAV que Task 4 importe (`../assets/music-menu.wav`, `../assets/jingle-gameover.wav`).

- [ ] **Step 1: Ajouter la piste menu**

Insérer après la définition de `music2` (ligne ~225) :

```js
// --- music-menu : menu principal — chill mais énergique, Do majeur, 100 BPM, 16 mesures ---
// A : hook lead pulse25 lumineux sur C / G / Am / F, arpège en croches, basse aux temps,
// percussions minimales (kick temps 1, hats légers) — pas de 4-on-the-floor.
// B : hook à l'octave adouci, arpège en doubles-croches, soft snare sur 3.
const PROGM = [
  { root: 48, iv: [0, 4, 7, 12] },  // C
  { root: 55, iv: [0, 4, 7, 12] },  // G
  { root: 57, iv: [0, 3, 7, 12] },  // Am
  { root: 53, iv: [0, 4, 7, 12] },  // F
];
const ARPM = [0, 2, 1, 3, 2, 1, 2, 0];
// Hook de 4 mesures (clé = pas 0..15) — question (C, G) / réponse (Am, F qui ramène vers C).
const LEADM = [
  { 0: { m: 72, v: 1.0 }, 4: { m: 76, v: 0.8 }, 8: { m: 79, v: 0.9 }, 12: { m: 76, v: 0.7 } },
  { 0: { m: 74, v: 1.0 }, 6: { m: 71, v: 0.8 }, 10: { m: 67, v: 0.8 } },
  { 0: { m: 72, v: 1.0 }, 4: { m: 69, v: 0.8 }, 8: { m: 76, v: 0.9 }, 12: { m: 74, v: 0.7 } },
  { 0: { m: 72, v: 0.9 }, 6: { m: 69, v: 0.8 }, 10: { m: 65, v: 0.7 }, 12: { m: 67, v: 0.8 } },
];
const musicMenu = {
  bpm: 100,
  bars: 16,
  seed: 100,
  voices: [
    { wave: 'pulse25', vol: 0.13, decay: 4, sustain: 3, vibrato: { rate: 5, depth: 0.25 },
      note: (bar, step) => {
        const hit = LEADM[bar % 4][step];
        if (!hit) return null;
        return bar < 8 ? hit : { m: hit.m + 12, v: hit.v * 0.75 };
      } },
    { wave: 'square', vol: 0.06, decay: 8,
      note: (bar, step) => {
        if (bar < 8 && step % 2 === 1) return null; // croches en A, 16es en B
        const c = PROGM[bar % 4];
        return { m: c.root + c.iv[ARPM[step % 8]] + 12, v: 0.85 };
      } },
    { wave: 'triangle', vol: 0.18, decay: 3, sustain: 3,
      note: (bar, step) => (step % 4 === 0
        ? { m: PROGM[bar % 4].root - 12, v: step === 0 ? 1 : 0.8 }
        : null) },
    { wave: 'triangle', vol: 0.26, decay: 14, slide: -12, // kick doux, temps 1 seulement
      note: (bar, step) => (step === 0 ? 45 : null) },
  ],
  noise: [
    { vol: 0.06, decay: 26, sustain: 1.5, hit: (bar, step) => bar >= 8 && step === 8 }, // soft snare, section B
    { vol: 0.02, decay: 60, hit: (bar, step) => step % 4 === 2 },                       // hats légers
  ],
};
```

- [ ] **Step 2: Ajouter le jingle game over**

Insérer juste après `musicMenu` :

```js
// --- jingle-gameover : sting de défaite one-shot, La mineur, ~2.6 s ---
// Démarre sur une note tenue (laisse le sfx-crash lisible), descente A-F-D,
// résolution sur un La grave qui tombe (slide). PAS une boucle : joué une fois
// via setMusic(key, false), silence ensuite.
const jingleGameover = {
  bpm: 92,
  bars: 1,
  seed: 13,
  voices: [
    { wave: 'pulse25', vol: 0.15, decay: 2.5, sustain: 4, vibrato: { rate: 4, depth: 0.3 },
      note: (bar, step) => ({
        0: { m: 69, v: 1.0 }, 4: { m: 65, v: 0.9 }, 8: { m: 62, v: 0.85 },
      })[step] ?? null },
    { wave: 'triangle', vol: 0.22, decay: 1.2, sustain: 4, slide: -2, // chute finale
      note: (bar, step) => (step === 12 ? { m: 57, v: 1.0 } : null) },
    { wave: 'triangle', vol: 0.16, decay: 1.5, sustain: 16, // drone grave sous tout le sting
      note: (bar, step) => (step === 0 ? 45 : null) },
  ],
  noise: [],
};
```

- [ ] **Step 3: Enregistrer les pistes et générer**

Remplacer la ligne `const tracks = { 'music-0': music0, 'music-1': music1, 'music-2': music2 };` par :

```js
const tracks = {
  'music-0': music0, 'music-1': music1, 'music-2': music2,
  'music-menu': musicMenu, 'jingle-gameover': jingleGameover,
};
```

Run: `node scripts/music.mjs`
Expected: 5 lignes `wrote …` dont `music-menu.wav (38.4s, 100 BPM, 16 bars)` et `jingle-gameover.wav (2.6s, 92 BPM, 1 bars)`.

- [ ] **Step 4: Vérifier la reproductibilité et la durée**

```bash
node scripts/music.mjs && sha1sum assets/music-menu.wav assets/jingle-gameover.wav > /tmp/h1
node scripts/music.mjs && sha1sum assets/music-menu.wav assets/jingle-gameover.wav | diff /tmp/h1 -
```

Expected: diff vide (hashes identiques). `npm test` toujours PASS (aucun test ne lit les wav).

- [ ] **Step 5: Écoute de contrôle (implémenteur)**

Ouvrir les deux WAV (ex. `start assets/music-menu.wav`) et vérifier : le menu tient la répétition sans agresser, le jingle dure ~2,6 s et se résout vers le grave. Ajuster uniquement les `vol` si un canal écrase les autres (pas de refonte de composition — la validation musicale finale appartient à Jael, Task 5).

- [ ] **Step 6: Commit**

```bash
git add scripts/music.mjs assets/music-menu.wav assets/jingle-gameover.wav
git commit -m "feat(music): piste menu chill-énergique 100 BPM + jingle game over 2.6s"
```

---

### Task 4: Câblage `main.js`

**Files:**
- Modify: `src/main.js:6` (import), `src/main.js:32-34` (imports wav), `src/main.js:67-70` (sources audio), `src/main.js:145` (sélection par frame)

**Interfaces:**
- Consumes: `musicFor(state, bgSet, optionsReturn)` et `isLooping(key)` (Task 1), `setMusic(key, loop)` (Task 2), les WAV de Task 3. `world.optionsReturn` existe déjà (`src/game/world.js:31`, valeurs `'menu'` | `'pause'`).
- Produces: rien (feuille).

- [ ] **Step 1: Brancher les nouvelles pistes**

Ligne 6 :

```js
import { musicFor, isLooping } from './game/music.js';
```

Après la ligne 34 (`import music2Url …`) :

```js
import musicMenuUrl from '../assets/music-menu.wav';
import jingleGameoverUrl from '../assets/jingle-gameover.wav';
```

Sources audio (lignes 67-70) :

```js
const audio = createAudio({
  thrust: thrustUrl, score: scoreUrl, crash: crashUrl,
  'music-0': music0Url, 'music-1': music1Url, 'music-2': music2Url,
  'music-menu': musicMenuUrl, 'jingle-gameover': jingleGameoverUrl,
});
```

Ligne 145, remplacer `audio.setMusic(musicFor(world.sm.get(), world.bgSet));` par :

```js
      const musicKey = musicFor(world.sm.get(), world.bgSet, world.optionsReturn);
      audio.setMusic(musicKey, isLooping(musicKey));
```

- [ ] **Step 2: Vérifier tests + build**

Run: `npm test && npm run build`
Expected: suite PASS, build Vite OK (les deux wav sont résolus comme assets).

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat(main): musique menu + jingle game over branchés sur le canal musique"
```

---

### Task 5: Vérification finale (gate d'écoute)

**Files:** aucun (vérification).

- [ ] **Step 1: Suite complète + build**

Run: `npm test && npm run build`
Expected: tous les tests PASS, build OK.

- [ ] **Step 2: Vérification manuelle en jeu**

Lancer `npx vite --port 5199 --strictPort` et vérifier au navigateur :
- MENU : `music-menu` joue en boucle (après le premier input utilisateur — autoplay policy).
- MENU → OPTIONS : la musique menu continue sans coupure.
- PLAY : bascule sur `music-{bgSet}` ; PAUSE → OPTIONS : la musique de jeu continue (fix du silence).
- Crash : le `sfx-crash` reste audible, le jingle joue UNE fois, silence ensuite.
- REJOUER immédiat pendant le jingle : la musique de jeu reprend proprement.
- Volume MUSIQUE à 0 dans OPTIONS : jingle et pistes muets, SFX intacts.

- [ ] **Step 3: Gate final — écoute par Jael**

Critères (spec) : le menu donne envie de jouer et tient la répétition ; le jingle ponctue la mort sans masquer le crash ni lasser en retry rapide ; transitions propres menu→jeu→mort→retry. **Pas de merge sans son OK.**
