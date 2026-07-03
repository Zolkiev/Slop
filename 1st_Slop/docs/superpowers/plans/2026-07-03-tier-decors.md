# Tier Decors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le décor devient une progression liée aux tiers de difficulté : 2 nouveaux mondes PixelLab (tempête néon tier 4, orbite tier 5), mapping déterministe tier→décor, musique d'intérim par table.

**Architecture:** `startLevel` fixe `world.bgSet = diff.tier − 1` (le reroll aléatoire disparaît, le menu garde sa vitrine aléatoire) ; `music.js` mappe décor→piste via une table `BG_MUSIC` ; 2 paires d'assets `bg-far/near-{3,4}` générées via `scripts/pixellab.mjs` au format des existantes.

**Tech Stack:** Vanilla JS (ES modules), Vitest, PixelLab API v2 (`scripts/pixellab.mjs`, clé dans `.env`), `scripts/crop-borders.mjs`.

**Spec:** `docs/superpowers/specs/2026-07-03-tier-decors-design.md`

## Global Constraints

- Tout le code/commentaires en français, style du dépôt.
- Mapping : tier 1→bgSet 0 (nuit urbaine), 2→1 (industriel), 3→2 (toxique), 4→3 (tempête néon), 5→4 (orbite). `CONFIG.BG_SET_COUNT: 5`.
- Musique intérim : `BG_MUSIC = ['music-0', 'music-1', 'music-2', 'music-1', 'music-2']` (sera remplacée au sous-projet 3).
- Formats assets : far ≈ 320×576 RGBA opaque (plein écran étiré), near = 320×180 RGBA avec transparence au-dessus des silhouettes (bande de premier plan).
- Cohérence visuelle : palette sombre cyberpunk des 3 mondes existants ; les fonds ne doivent pas concurrencer la lisibilité des obstacles (colonnes vert-gris) ni du robot (cyan).
- Baseline de la branche : 246 tests verts.

---

### Task 1: Logique — bgSet par tier + table musique d'intérim

**Files:**
- Modify: `src/config.js:18` (`BG_SET_COUNT: 3` → `5`)
- Modify: `src/game/world.js:62-72` (startLevel : reroll → tier)
- Modify: `src/game/music.js` (table BG_MUSIC)
- Test: `tests/game/world.test.js:192-230` (describe `bgSet selection` réécrit), `tests/game/music.test.js` (ajouts)

**Interfaces:**
- Consumes: `difficultyForLevel(level).tier` (1..5, déjà retourné par `src/game/level.js`).
- Produces: `world.bgSet = diff.tier − 1` posé par `startLevel` ; `musicFor(state, bgSet, optionsReturn)` inchangé de signature mais mappé via `BG_MUSIC` (exporté pour les tests). Task 4 s'appuie sur bgSet ∈ [0, 4].

- [ ] **Step 1: Écrire les tests (rouge)**

Dans `tests/game/world.test.js`, remplacer intégralement le describe `bgSet selection (décor persistant)` (lignes ~192-230) par :

```js
  describe('bgSet par tier (décor = progression)', () => {
    it('startLevel fixe le décor du tier', () => {
      const w = createWorld(fakeStorage());
      for (const [level, bg] of [[1, 0], [2, 0], [3, 1], [5, 2], [7, 3], [9, 3], [10, 4], [100, 4]]) {
        startLevel(w, level);
        expect(w.bgSet).toBe(bg);
      }
    });

    it('resetRun ne touche pas bgSet', () => {
      const w = createWorld(fakeStorage());
      startLevel(w, 7);
      resetRun(w);
      expect(w.bgSet).toBe(3);
    });

    it('le menu (createWorld) tire un décor dans [0, BG_SET_COUNT)', () => {
      // createWorld utilise Math.random : on vérifie seulement la borne
      for (let i = 0; i < 20; i += 1) {
        const w = createWorld(fakeStorage());
        expect(w.bgSet).toBeGreaterThanOrEqual(0);
        expect(w.bgSet).toBeLessThan(CONFIG.BG_SET_COUNT);
      }
    });
  });
```

Dans `tests/game/music.test.js`, ajouter dans le describe `musicFor` :

```js
  it('mappe les nouveaux décors sur les pistes d\'intérim (table BG_MUSIC)', () => {
    expect(musicFor(States.PLAY, 3)).toBe('music-1'); // tempête -> l'énergique
    expect(musicFor(States.PLAY, 4)).toBe('music-2'); // orbite -> la mystérieuse
    expect(musicFor(States.OPTIONS, 3, 'pause')).toBe('music-1');
    expect(BG_MUSIC).toEqual(['music-0', 'music-1', 'music-2', 'music-1', 'music-2']);
  });
```

et compléter l'import : `import { musicFor, isLooping, BG_MUSIC } from '../../src/game/music.js';`

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/game/world.test.js tests/game/music.test.js`
Expected: FAIL — bgSet suit encore l'aléatoire, `BG_MUSIC` non exporté, `musicFor(PLAY, 3)` renvoie `'music-3'`.

- [ ] **Step 3: Implémentation**

`src/config.js` ligne 18 : `BG_SET_COUNT: 5,` (le commentaire du bloc reste).

`src/game/world.js`, dans `startLevel`, remplacer :

```js
  if (level !== world.level) {
    world.bgSet = Math.floor(world.rand() * CONFIG.BG_SET_COUNT);
  }
```

par :

```js
  world.bgSet = diff.tier - 1; // le décor raconte la progression (1 monde par tier)
```

(`diff` est déjà calculé en tête de `startLevel`. Le tirage aléatoire de `createWorld` — vitrine du menu — ne change pas.)

`src/game/music.js` : ajouter la table et l'utiliser aux deux endroits qui construisent `music-${bgSet}` :

```js
// Piste par décor. Intérim pour les tiers 4-5 (tempête/orbite) : réutilise
// les pistes existantes en attendant leurs musiques dédiées (sous-projet 3).
export const BG_MUSIC = ['music-0', 'music-1', 'music-2', 'music-1', 'music-2'];
```

et dans `musicFor` : `if (GAME_STATES.has(state)) return BG_MUSIC[bgSet];` puis
`return optionsReturn === 'pause' ? BG_MUSIC[bgSet] : 'music-menu';`

- [ ] **Step 4: Vérifier le vert + non-régression**

Run: `npx vitest run tests/game/world.test.js tests/game/music.test.js` puis `npm test`
Expected: PASS partout (≈248 tests).

- [ ] **Step 5: Commit**

```bash
git add src/config.js src/game/world.js src/game/music.js tests/game/world.test.js tests/game/music.test.js
git commit -m "feat(decor): bgSet déterministe par tier + table musique d'intérim BG_MUSIC"
```

---

### Task 2: Assets tempête néon (`bg-far-3`, `bg-near-3`)

**Files:**
- Create: `assets/bg-far-3.png` (≈320×576, opaque), `assets/bg-near-3.png` (320×180, transparent au-dessus des silhouettes)
- Create: `assets/preview/bg3-*` (candidats non retenus, pour trace)

**Interfaces:**
- Consumes: `scripts/pixellab.mjs` (`generate --description ... --size WxH --no-bg true|false --seed N --out-dir D --name X`), `scripts/crop-borders.mjs` (`<file> [--apply]`), clé `PIXELLAB_API_KEY` dans `.env`.
- Produces: les 2 PNG que Task 4 importe. Noms EXACTS : `bg-far-3.png`, `bg-near-3.png`.

- [ ] **Step 1: Générer 3 candidats far (1 image par appel à cette taille)**

```bash
node scripts/pixellab.mjs generate --description "pixel art game background, tops of dark skyscrapers in a violent night thunderstorm, purple and magenta storm sky torn by bright lightning bolts, heavy rain curtains, tall skyline silhouettes with a few neon signs, cyberpunk, dark moody palette, portrait orientation" --size 320x576 --no-bg false --seed 401 --out-dir assets/preview --name bg3-far-a
node scripts/pixellab.mjs generate --description "pixel art game background, tops of dark skyscrapers in a violent night thunderstorm, purple and magenta storm sky torn by bright lightning bolts, heavy rain curtains, tall skyline silhouettes with a few neon signs, cyberpunk, dark moody palette, portrait orientation" --size 320x576 --no-bg false --seed 402 --out-dir assets/preview --name bg3-far-b
node scripts/pixellab.mjs generate --description "pixel art game background, tops of dark skyscrapers in a violent night thunderstorm, purple and magenta storm sky torn by bright lightning bolts, heavy rain curtains, tall skyline silhouettes with a few neon signs, cyberpunk, dark moody palette, portrait orientation" --size 320x576 --no-bg false --seed 403 --out-dir assets/preview --name bg3-far-c
```

- [ ] **Step 2: Générer 3 candidats near**

```bash
node scripts/pixellab.mjs generate --description "pixel art game foreground strip, dark rooftop silhouettes with antennas, air vents, water towers and glowing neon signs under heavy rain, cyberpunk night storm, mostly black shapes anchored to the bottom edge, transparent sky above the silhouettes" --size 320x180 --no-bg true --seed 411 --out-dir assets/preview --name bg3-near-a
node scripts/pixellab.mjs generate --description "pixel art game foreground strip, dark rooftop silhouettes with antennas, air vents, water towers and glowing neon signs under heavy rain, cyberpunk night storm, mostly black shapes anchored to the bottom edge, transparent sky above the silhouettes" --size 320x180 --no-bg true --seed 412 --out-dir assets/preview --name bg3-near-b
node scripts/pixellab.mjs generate --description "pixel art game foreground strip, dark rooftop silhouettes with antennas, air vents, water towers and glowing neon signs under heavy rain, cyberpunk night storm, mostly black shapes anchored to the bottom edge, transparent sky above the silhouettes" --size 320x180 --no-bg true --seed 413 --out-dir assets/preview --name bg3-near-c
```

- [ ] **Step 3: Sélectionner visuellement**

Ouvrir (Read) chaque candidat et les 3 mondes existants (`assets/bg-far-0.png`, `assets/bg-far-2.png` pour référence de palette). Critères, dans l'ordre :
1. Palette sombre cohérente avec les mondes existants (pas de pastel, pas de blanc dominant).
2. Lisibilité gameplay : le centre de l'image reste calme (pas de gros contrastes qui masqueraient portes vert-gris et robot cyan).
3. Identité tempête : éclairs et pluie lisibles, ciel violet/magenta.
4. Near : silhouettes bien ancrées en bas, transparence propre au-dessus.

Si aucun candidat ne passe les critères 1-2, régénérer avec la description ajustée (assombrir : ajouter "very dark, low contrast center") et de nouveaux seeds 404+/414+ — max 2 vagues avant de report DONE_WITH_CONCERNS.

- [ ] **Step 4: Vérifier les bordures et finaliser**

```bash
node scripts/crop-borders.mjs assets/preview/<candidat-far-retenu>.png
node scripts/crop-borders.mjs assets/preview/<candidat-near-retenu>.png
```

Si des bordures sont détectées : relancer avec `--apply`. Puis copier les retenus :

```bash
cp assets/preview/<candidat-far-retenu>.png assets/bg-far-3.png
cp assets/preview/<candidat-near-retenu>.png assets/bg-near-3.png
node -e "const fs=require('fs'); for (const f of ['bg-far-3','bg-near-3']) { const b=fs.readFileSync('assets/'+f+'.png'); console.log(f, b.readUInt32BE(16)+'x'+b.readUInt32BE(20), 'colorType', b[25]); }"
```

Expected: far ≈ 320×576 (±10 % toléré, le renderer étire), near 320×180, colorType 6 (RGBA).

- [ ] **Step 5: Commit**

```bash
git add assets/bg-far-3.png assets/bg-near-3.png assets/preview/
git commit -m "feat(assets): décor tier 4 — tempête néon (bg-far-3, bg-near-3)"
```

---

### Task 3: Assets orbite (`bg-far-4`, `bg-near-4`)

**Files:**
- Create: `assets/bg-far-4.png` (≈320×576, opaque), `assets/bg-near-4.png` (320×180, transparent)
- Create: `assets/preview/bg4-*` (candidats)

**Interfaces:**
- Consumes: identique à Task 2 (pixellab.mjs, crop-borders.mjs, .env).
- Produces: les 2 PNG que Task 4 importe. Noms EXACTS : `bg-far-4.png`, `bg-near-4.png`.

- [ ] **Step 1: Générer 3 candidats far**

```bash
node scripts/pixellab.mjs generate --description "pixel art game background, view from low earth orbit at night, deep black starfield at the top, thin glowing blue atmosphere arc and tiny city lights on the dark earth surface at the bottom, a small distant space station, sci-fi cyberpunk, very dark palette, portrait orientation" --size 320x576 --no-bg false --seed 501 --out-dir assets/preview --name bg4-far-a
node scripts/pixellab.mjs generate --description "pixel art game background, view from low earth orbit at night, deep black starfield at the top, thin glowing blue atmosphere arc and tiny city lights on the dark earth surface at the bottom, a small distant space station, sci-fi cyberpunk, very dark palette, portrait orientation" --size 320x576 --no-bg false --seed 502 --out-dir assets/preview --name bg4-far-b
node scripts/pixellab.mjs generate --description "pixel art game background, view from low earth orbit at night, deep black starfield at the top, thin glowing blue atmosphere arc and tiny city lights on the dark earth surface at the bottom, a small distant space station, sci-fi cyberpunk, very dark palette, portrait orientation" --size 320x576 --no-bg false --seed 503 --out-dir assets/preview --name bg4-far-c
```

- [ ] **Step 2: Générer 3 candidats near**

```bash
node scripts/pixellab.mjs generate --description "pixel art game foreground strip, dark orbital station superstructure silhouettes, solar panel arrays, antennas and small floating debris, metallic shapes anchored to the bottom edge with a few cyan warning lights, sci-fi, transparent space above the silhouettes" --size 320x180 --no-bg true --seed 511 --out-dir assets/preview --name bg4-near-a
node scripts/pixellab.mjs generate --description "pixel art game foreground strip, dark orbital station superstructure silhouettes, solar panel arrays, antennas and small floating debris, metallic shapes anchored to the bottom edge with a few cyan warning lights, sci-fi, transparent space above the silhouettes" --size 320x180 --no-bg true --seed 512 --out-dir assets/preview --name bg4-near-b
node scripts/pixellab.mjs generate --description "pixel art game foreground strip, dark orbital station superstructure silhouettes, solar panel arrays, antennas and small floating debris, metallic shapes anchored to the bottom edge with a few cyan warning lights, sci-fi, transparent space above the silhouettes" --size 320x180 --no-bg true --seed 513 --out-dir assets/preview --name bg4-near-c
```

- [ ] **Step 3: Sélectionner visuellement**

Mêmes critères que Task 2 (palette sombre, centre calme, near ancré en bas avec transparence propre), identité orbite : étoiles + arc d'atmosphère + ville en bas. L'ensemble doit être le monde le PLUS sombre des cinq (climax spatial). Même règle de régénération (max 2 vagues, seeds 504+/514+).

- [ ] **Step 4: Vérifier les bordures et finaliser**

```bash
node scripts/crop-borders.mjs assets/preview/<candidat-far-retenu>.png
node scripts/crop-borders.mjs assets/preview/<candidat-near-retenu>.png
cp assets/preview/<candidat-far-retenu>.png assets/bg-far-4.png
cp assets/preview/<candidat-near-retenu>.png assets/bg-near-4.png
node -e "const fs=require('fs'); for (const f of ['bg-far-4','bg-near-4']) { const b=fs.readFileSync('assets/'+f+'.png'); console.log(f, b.readUInt32BE(16)+'x'+b.readUInt32BE(20), 'colorType', b[25]); }"
```

Expected: far ≈ 320×576, near 320×180, colorType 6.

- [ ] **Step 5: Commit**

```bash
git add assets/bg-far-4.png assets/bg-near-4.png assets/preview/
git commit -m "feat(assets): décor tier 5 — orbite (bg-far-4, bg-near-4)"
```

---

### Task 4: Câblage `main.js`

**Files:**
- Modify: `src/main.js:19-24` (imports) et `src/main.js:110-115` (map assets)

**Interfaces:**
- Consumes: `assets/bg-far-{3,4}.png`, `assets/bg-near-{3,4}.png` (Tasks 2-3) ; le renderer lit `assets['bg-far-' + world.bgSet]` / `'bg-near-' + world.bgSet` (aucun changement renderer).
- Produces: rien (feuille).

- [ ] **Step 1: Brancher les 4 nouveaux fonds**

Après `import bgFar2 …` (ligne ~21) et `import bgNear2 …` (ligne ~24) respectivement :

```js
import bgFar3 from '../assets/bg-far-3.png';
import bgFar4 from '../assets/bg-far-4.png';
```

```js
import bgNear3 from '../assets/bg-near-3.png';
import bgNear4 from '../assets/bg-near-4.png';
```

Dans la map d'assets (lignes ~110-115), compléter :

```js
  'bg-far-3': bgFar3,
  'bg-far-4': bgFar4,
  'bg-near-3': bgNear3,
  'bg-near-4': bgNear4,
```

- [ ] **Step 2: Vérifier tests + build**

Run: `npm test && npm run build`
Expected: suite PASS, build Vite OK (les 4 PNG résolus comme assets).

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat(main): décors tempête et orbite branchés (bg 3-4)"
```

---

### Task 5: Vérification finale (gate visuel)

**Files:** aucun (vérification, exécutée par le contrôleur).

- [ ] **Step 1: Suite complète + build**

Run: `npm test && npm run build`
Expected: tous les tests PASS, build OK.

- [ ] **Step 2: Vérification visuelle Playwright**

Lancer `npx vite --port 5199 --strictPort` et capturer en jeu :
- Niveau 1 (NEW GAME) : nuit urbaine (régression zéro).
- Niveau 7 via save injecté (`jetpackbot.bestLevel = 7`, CONTINUE) : tempête néon, obstacles lisibles.
- Niveau 10 via save injecté (`jetpackbot.bestLevel = 10`, CONTINUE) : orbite, obstacles lisibles.
- Zéro erreur JS/console.

- [ ] **Step 3: Gate final — Jael juge en jeu**

Critères (spec) : cohérence de style avec les 3 mondes existants, lisibilité du gameplay, effet « waouh » du passage tier 3→4→5. **Pas de merge sans son OK.**
