# Theme Music Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deux pistes chiptune dédiées — `music-3` (tempête néon, tier 4) et `music-4` (orbite, tier 5) — remplacent l'intérim de `BG_MUSIC`.

**Architecture:** Deux définitions déclaratives ajoutées à `scripts/music.mjs` (renderer existant, seeds fixes → WAV reproductibles ; les 5 assets audio existants restent byte-identiques à la régénération) ; `BG_MUSIC` passe au mapping définitif ; `main.js` importe et mappe les 2 WAV.

**Tech Stack:** Vanilla JS (ES modules), Vitest, générateur zéro-dépendance `scripts/music.mjs` (PCM 16 bits mono 22050 Hz).

**Spec:** `docs/superpowers/specs/2026-07-06-theme-music-design.md`

## Global Constraints

- Tout le code/commentaires en français, style du dépôt.
- `BG_MUSIC = ['music-0', 'music-1', 'music-2', 'music-3', 'music-4']` (mapping définitif).
- music-3 : La mineur harmonique, 128 BPM, 16 mesures A/B, seed 128 — la plus agressive du jeu.
- music-4 : Do mineur, 72 BPM, 16 mesures A/B, seed 72 — la plus sombre, tension par l'atmosphère.
- Régénérer via `node scripts/music.mjs` ne doit PAS modifier les 5 WAV existants (`git status` propre sur `assets/music-{0,1,2}.wav`, `music-menu.wav`, `jingle-gameover.wav`).
- Pas de garde de bornes sur `BG_MUSIC[bgSet]` (producteurs bornés par construction — décision spec).
- Baseline de la branche : 246 tests verts.
- Note mi-branche : entre la Task 1 et la Task 4, `musicFor` renvoie des clés (`music-3`/`music-4`) sans asset branché — les tiers 4-5 joueraient en silence. Résolu par Task 4 ; à confirmer clos en review finale.

---

### Task 1: Logique — mapping définitif `BG_MUSIC`

**Files:**
- Modify: `src/game/music.js:6-8` (table + commentaire)
- Test: `tests/game/music.test.js:32-37` (test d'intérim remplacé), `tests/game/music.test.js:40-46` (isLooping complété)

**Interfaces:**
- Consumes: rien (table pure).
- Produces: `BG_MUSIC[3] === 'music-3'`, `BG_MUSIC[4] === 'music-4'` — les Tasks 2-4 fournissent les assets correspondants. Signatures `musicFor`/`isLooping` inchangées.

- [ ] **Step 1: Écrire les tests (rouge)**

Dans `tests/game/music.test.js`, remplacer intégralement le test `mappe les nouveaux décors sur les pistes d'intérim (table BG_MUSIC)` (lignes 32-37) par :

```js
  it('mappe chaque décor sur sa piste dédiée (table BG_MUSIC)', () => {
    expect(musicFor(States.PLAY, 3)).toBe('music-3'); // tempête néon
    expect(musicFor(States.PLAY, 4)).toBe('music-4'); // orbite
    expect(musicFor(States.OPTIONS, 4, 'pause')).toBe('music-4');
    expect(BG_MUSIC).toEqual(['music-0', 'music-1', 'music-2', 'music-3', 'music-4']);
  });
```

Dans le test `seul le jingle ne boucle pas` (lignes 41-46), ajouter après la ligne `expect(isLooping('music-0')).toBe(true);` :

```js
    expect(isLooping('music-3')).toBe(true);
    expect(isLooping('music-4')).toBe(true);
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/game/music.test.js`
Expected: FAIL — `musicFor(PLAY, 3)` renvoie `'music-1'`, la table vaut encore l'intérim.

- [ ] **Step 3: Implémentation**

Dans `src/game/music.js`, remplacer les lignes 6-8 :

```js
// Piste par décor. Intérim pour les tiers 4-5 (tempête/orbite) : réutilise
// les pistes existantes en attendant leurs musiques dédiées (sous-projet 3).
export const BG_MUSIC = ['music-0', 'music-1', 'music-2', 'music-1', 'music-2'];
```

par :

```js
// Piste par décor — mapping définitif, une musique par monde.
export const BG_MUSIC = ['music-0', 'music-1', 'music-2', 'music-3', 'music-4'];
```

- [ ] **Step 4: Vérifier le vert + non-régression**

Run: `npx vitest run tests/game/music.test.js` puis `npm test`
Expected: PASS partout (246 tests — remplacement, pas d'ajout net).

- [ ] **Step 5: Commit**

```bash
git add src/game/music.js tests/game/music.test.js
git commit -m "feat(music): mapping définitif BG_MUSIC — une piste par décor"
```

---

### Task 2: Générateur — `music-3` tempête néon

**Files:**
- Modify: `scripts/music.mjs` (définition `music3` + entrée registre `tracks`)
- Create: `assets/music-3.wav` (sortie du script, ~30 s)

**Interfaces:**
- Consumes: le renderer déclaratif de `scripts/music.mjs` (`render(track)`, format `{ bpm, bars, seed, voices: [{ wave, vol, decay, sustain?, vibrato?, slide?, note(bar, step) }], noise: [{ vol, decay, sustain?, hit(bar, step) }] }`, 16 pas par mesure, notes MIDI ou `{ m, v }`).
- Produces: `assets/music-3.wav` que Task 4 importe. Nom EXACT : `music-3.wav`.

- [ ] **Step 1: Ajouter la définition de piste**

Dans `scripts/music.mjs`, insérer après le bloc `jingleGameover` (ligne ~294, avant `mkdirSync`) :

```js
// --- music-3 : tempête néon — la plus agressive, La mineur harmonique, 128 BPM, 16 mesures ---
// A : riff lead pulse25 incisif sur Am / F / Dm / E, basse martelée, kick
// 4-on-the-floor, hats en croches. B : riff à l'octave, hats en doubles-croches.
// Signature « éclair » : run descendant rapide en fin de section (mesures 7 et 15).
const ROOTS3 = [45, 41, 38, 40]; // A2 F2 D2 E2 (Am / F / Dm / E)
// Riff de 4 mesures (clé = pas 0..15) — le sol# (68/80) = sensible de la mineure
// harmonique, la couleur de la piste ; la mesure E (bar % 4 === 3) monte en tension.
const LEAD3 = [
  { 0: { m: 69, v: 1.0 }, 3: { m: 72, v: 0.85 }, 6: { m: 76, v: 1.0 }, 10: { m: 74, v: 0.8 }, 12: { m: 76, v: 0.9 }, 14: { m: 72, v: 0.7 } },
  { 0: { m: 77, v: 1.0 }, 3: { m: 76, v: 0.8 }, 6: { m: 72, v: 0.9 }, 8: { m: 69, v: 0.85 }, 12: { m: 65, v: 0.8 } },
  { 0: { m: 74, v: 1.0 }, 3: { m: 77, v: 0.85 }, 6: { m: 81, v: 1.0 }, 10: { m: 77, v: 0.8 }, 12: { m: 74, v: 0.9 }, 14: { m: 72, v: 0.7 } },
  { 0: { m: 76, v: 1.0 }, 3: { m: 80, v: 0.9 }, 6: { m: 83, v: 1.0 }, 8: { m: 80, v: 0.9 }, 11: { m: 76, v: 0.8 }, 14: { m: 68, v: 0.9 } },
];
// Run « éclair » : descente harmonique (la sol# mi ré do la sol# mi) sur la 2e moitié.
const FLASH3 = [81, 80, 76, 74, 72, 69, 68, 64];
const music3 = {
  bpm: 128,
  bars: 16,
  seed: 128,
  voices: [
    { wave: 'pulse25', vol: 0.13, decay: 7, sustain: 2, vibrato: { rate: 6, depth: 0.25 },
      note: (bar, step) => {
        const hit = LEAD3[bar % 4][step];
        if (!hit) return null;
        return bar < 8 ? hit : { m: hit.m + 12, v: hit.v * 0.8 };
      } },
    { wave: 'square', vol: 0.09, decay: 10, sustain: 1, // éclair
      note: (bar, step) => {
        if (bar % 8 !== 7 || step < 8) return null;
        return { m: FLASH3[step - 8], v: 1 - (step - 8) * 0.07 };
      } },
    { wave: 'square', vol: 0.15, decay: 7, // basse martelée
      note: (bar, step) => (step % 2 === 0
        ? { m: ROOTS3[bar % 4] + (step === 6 || step === 14 ? 12 : 0), v: step % 4 === 0 ? 1 : 0.8 }
        : null) },
    { wave: 'square', vol: 0.07, decay: 12, // stabs
      note: (bar, step) => {
        const on = step === 4 || step === 12 || (bar >= 8 && step === 7);
        return on ? ROOTS3[bar % 4] + 19 : null;
      } },
    { wave: 'triangle', vol: 0.34, decay: 18, slide: -16, // kick 4-on-the-floor
      note: (bar, step) => (step % 4 === 0 ? 43 : null) },
  ],
  noise: [
    { vol: 0.1, decay: 24, sustain: 1.5, hit: (bar, step) => step === 4 || step === 12 }, // snare
    { vol: 0.04, decay: 65, hit: (bar, step) => (bar < 8 ? step % 2 === 1 : true) },      // hats — 16es en B
  ],
};
```

Puis dans le registre `tracks` (ligne ~297), ajouter `'music-3': music3` :

```js
const tracks = {
  'music-0': music0, 'music-1': music1, 'music-2': music2,
  'music-3': music3,
  'music-menu': musicMenu, 'jingle-gameover': jingleGameover,
};
```

- [ ] **Step 2: Générer et vérifier la non-régression**

```bash
node scripts/music.mjs
git status --porcelain assets/
```

Expected: le script logge `wrote music-3.wav  (30.0s, 128 BPM, 16 bars)` ; `git status` ne montre QUE `?? 1st_Slop/assets/music-3.wav` côté assets — les 5 WAV existants sont byte-identiques (seeds fixes). Si un WAV existant apparaît modifié : STOP, le renderer a changé de comportement — report BLOCKED.

- [ ] **Step 3: Écoute de contrôle (structure, pas goût)**

Vérifier la durée/poids : `node -e "const s=require('fs').statSync('assets/music-3.wav'); console.log(Math.round(s.size/1024), 'KiB');"`
Expected: ~1290 KiB (30 s × 22050 Hz × 2 octets + header). Le jugement esthétique appartient au gate d'écoute final (Jael).

- [ ] **Step 4: Commit**

```bash
git add scripts/music.mjs assets/music-3.wav
git commit -m "feat(music): music-3 tempête néon — Am harmonique 128 BPM, riff + runs éclair"
```

---

### Task 3: Générateur — `music-4` orbite

**Files:**
- Modify: `scripts/music.mjs` (définition `music4` + entrée registre `tracks`)
- Create: `assets/music-4.wav` (sortie du script, ~53 s)

**Interfaces:**
- Consumes: identique à Task 2 (renderer déclaratif).
- Produces: `assets/music-4.wav` que Task 4 importe. Nom EXACT : `music-4.wav`.

- [ ] **Step 1: Ajouter la définition de piste**

Dans `scripts/music.mjs`, insérer après le bloc `music3` (Task 2) :

```js
// --- music-4 : orbite — la plus sombre, Do mineur, 72 BPM, 16 mesures ---
// Climax par l'atmosphère, pas la vitesse : drone grave, lead lent à large
// vibrato, arpège « télémétrie » constant en doubles-croches (cycle de 6 pas
// qui tourne sur la mesure). A : lead seul. B : contre-chant en quintes.
const DRONE4 = [36, 36, 44, 43]; // C2 C2 Ab2 G2
// Arpège par accord de la mesure — Cm / Cm / Ab / G (si 59 = sensible vers do).
const ARP4 = [
  [60, 63, 67, 72],
  [60, 63, 67, 72],
  [56, 60, 63, 68],
  [55, 59, 62, 67],
];
const SEQ4 = [0, 1, 2, 3, 2, 1];
// Phrases lentes de 4 mesures (clé = pas 0..15), résolution si -> do en mesure 3.
const LEAD4 = [
  { 0: { m: 72, v: 1.0 }, 10: { m: 75, v: 0.8 } },
  { 4: { m: 79, v: 0.9 }, 12: { m: 77, v: 0.7 } },
  { 0: { m: 80, v: 0.9 }, 8: { m: 75, v: 0.8 } },
  { 2: { m: 74, v: 0.85 }, 8: { m: 71, v: 0.9 }, 12: { m: 72, v: 1.0 } },
];
const music4 = {
  bpm: 72,
  bars: 16,
  seed: 72,
  voices: [
    { wave: 'triangle', vol: 0.15, decay: 2, sustain: 6, vibrato: { rate: 4, depth: 0.5 },
      note: (bar, step) => LEAD4[bar % 4][step] ?? null },
    { wave: 'triangle', vol: 0.05, decay: 2, sustain: 6, // contre-chant en quintes, section B
      note: (bar, step) => {
        if (bar < 8) return null;
        const hit = LEAD4[bar % 4][step];
        return hit ? { m: hit.m + 7, v: hit.v * 0.6 } : null;
      } },
    { wave: 'pulse25', vol: 0.045, decay: 6, sustain: 0.9, // télémétrie (16es constantes)
      note: (bar, step) => ({ m: ARP4[bar % 4][SEQ4[step % 6]], v: step % 4 === 0 ? 0.9 : 0.7 }) },
    { wave: 'triangle', vol: 0.17, decay: 1.2, sustain: 14, // drone
      note: (bar, step) => (step === 0 ? DRONE4[bar % 4] : null) },
    { wave: 'triangle', vol: 0.2, decay: 10, slide: -10, // kick sourd, temps 1
      note: (bar, step) => (step === 0 ? 38 : null) },
  ],
  noise: [
    { vol: 0.04, decay: 30, sustain: 1.5, hit: (bar, step) => step === 8 && bar % 2 === 1 }, // tick
    { vol: 0.015, decay: 22, hit: (bar, step) => step === 12 && bar % 2 === 1 },             // shimmer
  ],
};
```

Puis compléter le registre `tracks` :

```js
const tracks = {
  'music-0': music0, 'music-1': music1, 'music-2': music2,
  'music-3': music3, 'music-4': music4,
  'music-menu': musicMenu, 'jingle-gameover': jingleGameover,
};
```

- [ ] **Step 2: Générer et vérifier la non-régression**

```bash
node scripts/music.mjs
git status --porcelain assets/
```

Expected: `wrote music-4.wav  (53.3s, 72 BPM, 16 bars)` ; côté assets, seul `?? 1st_Slop/assets/music-4.wav` est nouveau, `music-3.wav` n'apparaît PAS modifié (régénéré identique), les 5 WAV historiques intacts. Sinon : STOP, report BLOCKED.

- [ ] **Step 3: Vérifier le poids**

`node -e "const s=require('fs').statSync('assets/music-4.wav'); console.log(Math.round(s.size/1024), 'KiB');"`
Expected: ~2296 KiB (53,3 s — la plus longue du jeu, assumé : tempo lent, boucle calée sur les mesures).

- [ ] **Step 4: Commit**

```bash
git add scripts/music.mjs assets/music-4.wav
git commit -m "feat(music): music-4 orbite — Cm 72 BPM, drone + télémétrie en doubles-croches"
```

---

### Task 4: Câblage `main.js`

**Files:**
- Modify: `src/main.js:36-39` (imports) et `src/main.js:75-76` (map assets)

**Interfaces:**
- Consumes: `assets/music-3.wav`, `assets/music-4.wav` (Tasks 2-3) ; `audio.setMusic` lit `assets[musicFor(...)]` — aucun changement audio/renderer.
- Produces: rien (feuille).

- [ ] **Step 1: Brancher les 2 pistes**

Après `import music2Url from '../assets/music-2.wav';` (ligne ~38) :

```js
import music3Url from '../assets/music-3.wav';
import music4Url from '../assets/music-4.wav';
```

Dans la map d'assets (lignes ~75-76), remplacer :

```js
  'music-0': music0Url, 'music-1': music1Url, 'music-2': music2Url,
  'music-menu': musicMenuUrl, 'jingle-gameover': jingleGameoverUrl,
```

par :

```js
  'music-0': music0Url, 'music-1': music1Url, 'music-2': music2Url,
  'music-3': music3Url, 'music-4': music4Url,
  'music-menu': musicMenuUrl, 'jingle-gameover': jingleGameoverUrl,
```

- [ ] **Step 2: Vérifier tests + build**

Run: `npm test && npm run build`
Expected: suite PASS (246), build Vite OK — `music-3` et `music-4` listés dans les assets du build.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat(main): pistes tempête et orbite branchées (music 3-4)"
```

---

### Task 5: Vérification finale (gate audio)

**Files:** aucun (vérification, exécutée par le contrôleur).

- [ ] **Step 1: Suite complète + build**

Run: `npm test && npm run build`
Expected: tous les tests PASS, build OK.

- [ ] **Step 2: Smoke Playwright audio**

Lancer `npx vite --port 5199 --strictPort` et un script Playwright avec patch de `window.Audio` (approche `music-smoke.mjs` : intercepter les instanciations pour tracer la clé jouée) et Chromium `--autoplay-policy=user-gesture-required` (piège autoplay documenté) :
- Save niveau 7 (`jetpackbot.bestLevel = 7`), CONTINUE → la piste en PLAY est `music-3`, en boucle.
- Save niveau 10 → la piste en PLAY est `music-4`, en boucle.
- Niveau 1 (NEW GAME) → `music-0` (régression zéro).
- Zéro erreur JS/console.

- [ ] **Step 3: Gate final — Jael écoute en jeu**

Critères (spec) : identité de chaque piste (tempête mord, orbite plane), cohérence de volume avec les pistes existantes, boucles propres. **Pas de merge sans son OK** (les gates décors + musiques peuvent être jugés dans la même session de jeu).
