# Skins v3 — roster à 12 + fix couleurs recolors — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6 nouveaux robots originaux (TITAN/ABYSSE/ZENITH/RONIN/GIVRE/OMEGA, seuils 18/22/26/32/40/50) + correction locale des couleurs dépareillées des 4 recolors (FORGE/VENIN/ORAGE/NOVA).

**Architecture:** recette VORTEX industrialisée — 1 appel `generate` par nouveau skin, frames de poussée composées en local (`compose-thrust.mjs`) ; les recolors sont réparés par un nouvel outil local `fix-recolor.mjs` (masque spatial cyan-jetpack de PROTO) puis leurs thrusts reconstruits. Spec : `docs/superpowers/specs/2026-07-08-skins-v3-roster-design.md`.

**Tech Stack:** Vanilla JS + Canvas 2D, Vitest, PixelLab API v2 (`scripts/pixellab.mjs`), pngjs (outils dans `Slop/.claude/tools/`, `npm i pngjs` déjà fait), smoke Playwright (import `file:///C:/Users/pattyn/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`).

## Global Constraints

- Branche `feat/skins-v3-roster` depuis main (`46fa942` ou plus récent), worktree isolé (skill superpowers:using-git-worktrees).
- `.env` non tracké : le copier de `1st_Slop/.env` vers `<worktree>/1st_Slop/.env` avant la Task 3.
- **Budget PixelLab : 6 appels `generate` prévus (~96 crédits) + réserve 3 `edit` max. PLAFOND : 200 crédits.** Solde vérifié avant/après chaque appel (`GET /v2/balance`, 2000 au 08/07).
- Gates Jael BLOQUANTS : G1+G2 groupés (fin Task 3), G3 en jeu (fin Task 6). Ne pas enchaîner sans OK explicite.
- Hitbox inchangée (`ROBOT_W/H` 34×24, sprite 64×64 dessiné 44×44) ; profil vers la DROITE.
- Style : code + commentaires français, modules purs, suite verte à chaque commit, commits conventionnels français.
- Les outils pngjs vivent dans `C:/Setup/Projects/Game/Slop/.claude/tools/` (hors repo, durables) ; les smokes dans `C:/Setup/Projects/Game/Slop/.claude/smokes/` (non trackés).

---

### Task 1: Table à 12 + seuils 18/22/26/32/40/50

**Files:**
- Modify: `src/config.js:98` (SKIN_THRESHOLDS)
- Modify: `src/game/skins.js:7-14` (table SKINS)
- Test: `tests/game/skins.test.js`, `tests/render/skins.test.js`, `tests/game/world.test.js:736-743`

**Interfaces:**
- Consumes: rien de nouveau.
- Produces: `CONFIG.SKIN_THRESHOLDS = [1,3,5,7,10,15,18,22,26,32,40,50]` ; `SKINS[6..11]` = titan/abysse/zenith/ronin/givre/omega avec accents `#ffd23e #3e6bff #3effb2 #ff3ec8 #bfe8ff #e0c8ff` ; `spriteKey(6..11)` → `robot-s6`…`robot-s11` (déjà générique).

- [ ] **Step 1: Adapter les tests (échec attendu)**

Dans `tests/game/skins.test.js`, remplacer les describe `skins — table` et `skinUnlocked`, et la garde hors bornes de `loadSkin` :

```js
describe('skins — table', () => {
  it('12 skins, ids et noms attendus, un seuil chacun', () => {
    expect(SKINS.map((s) => s.id)).toEqual([
      'proto', 'forge', 'venin', 'orage', 'nova', 'vortex',
      'titan', 'abysse', 'zenith', 'ronin', 'givre', 'omega',
    ]);
    expect(SKINS.map((s) => s.name)).toEqual([
      'PROTO', 'FORGE', 'VENIN', 'ORAGE', 'NOVA', 'VORTEX',
      'TITAN', 'ABYSSE', 'ZENITH', 'RONIN', 'GIVRE', 'OMEGA',
    ]);
    expect(SKINS.length).toBe(CONFIG.SKIN_THRESHOLDS.length);
  });

  it('accents: un par skin, tous distincts', () => {
    expect(SKINS.map((s) => s.accent)).toEqual([
      '#3ef0ff', '#ff9a3e', '#7dff3e', '#c93eff', '#fff7d6', '#ff3e5e',
      '#ffd23e', '#3e6bff', '#3effb2', '#ff3ec8', '#bfe8ff', '#e0c8ff',
    ]);
    expect(new Set(SKINS.map((s) => s.accent)).size).toBe(12);
  });

  it('seuils: les 5 premiers = tiers de patterns, puis 15/18/22/26/32/40/50', () => {
    expect(CONFIG.SKIN_THRESHOLDS.slice(0, 5)).toEqual(CONFIG.PATTERN_TIERS);
    expect(CONFIG.SKIN_THRESHOLDS.slice(5)).toEqual([15, 18, 22, 26, 32, 40, 50]);
  });
});

describe('skinUnlocked', () => {
  it('PROTO (0) est toujours débloqué, même à record 0 (nouveau joueur)', () => {
    expect(skinUnlocked(0, 0)).toBe(true);
  });

  it('frontières de tous les seuils', () => {
    for (const [i, seuil] of CONFIG.SKIN_THRESHOLDS.entries()) {
      if (i === 0) continue; // PROTO : toujours débloqué (testé ci-dessus)
      expect(skinUnlocked(i, seuil)).toBe(true);
      expect(skinUnlocked(i, seuil - 1)).toBe(false);
    }
  });

  it('record 2: seul PROTO est débloqué', () => {
    expect(SKINS.map((_, i) => skinUnlocked(i, 2)))
      .toEqual([true, ...Array(11).fill(false)]);
  });

  it('record 15: tout jusqu à VORTEX, rien au-delà ; record 50: tout', () => {
    expect(SKINS.map((_, i) => skinUnlocked(i, 15)))
      .toEqual([...Array(6).fill(true), ...Array(6).fill(false)]);
    expect(SKINS.every((_, i) => skinUnlocked(i, 50))).toBe(true);
  });
});
```

Dans le describe `loadSkin / saveSkin`, la garde hors bornes (ligne 79-85) : remplacer `'9'` par `'12'` (avec 12 entrées, 9 est un slot valide — verrouillé, mais ce n'est plus le hors-bornes qu'on teste) :

```js
  it("gardes: 'zorg', '-1', '12', '2.5' -> 0", () => {
    for (const raw of ['zorg', '-1', '12', '2.5']) {
      const s = fakeStorage();
      s.setItem('jetpackbot.skin', raw);
      expect(loadSkin(s, 10)).toBe(0);
    }
  });
```

Dans `tests/render/skins.test.js` :
- `fakeAssets` (ligne 37) : étendre les clés : `const keys = ['robot', 'robot-s1', 'robot-s2', 'robot-s3', 'robot-s4', 'robot-s5', 'robot-s6', 'robot-s7', 'robot-s8', 'robot-s9', 'robot-s10', 'robot-s11', 'btn-plate', 'btn-plate-focus'];`
- Ajouter au describe `renderSkins` :

```js
  it('slot 11 (OMEGA) verrouillé à record 49: NIVEAU 50 affiché', () => {
    const ctx = fakeCtx();
    const off = fakeOffscreen();
    renderSkins(ctx, worldWith(11, 49), fakeAssets(), () => off);
    expect(ctx.texts).toContain('NIVEAU 50');
    expect(ctx.texts).not.toContain('OMEGA');
  });
```

Dans `tests/game/world.test.js`, le test de nav circulaire du hangar (lignes ~736-743) : la flèche gauche depuis le slot 0 va au DERNIER slot — remplacer `expect(w.skinsScreen.slot).toBe(5);` par `expect(w.skinsScreen.slot).toBe(11);`.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/game/skins.test.js tests/render/skins.test.js tests/game/world.test.js`
Expected: FAIL — table à 6, seuils à 6 entrées, wrap à 5.

- [ ] **Step 3: Implémenter**

1. `src/config.js:98` :

```js
  SKIN_THRESHOLDS: [1, 3, 5, 7, 10, 15, 18, 22, 26, 32, 40, 50],
```

2. `src/game/skins.js`, après la ligne vortex de la table :

```js
  { id: 'titan', name: 'TITAN', accent: '#ffd23e' },   // mécha trapu (jaune chantier, seuil 18)
  { id: 'abysse', name: 'ABYSSE', accent: '#3e6bff' }, // poisson-sous-marin (bleu abyssal, seuil 22)
  { id: 'zenith', name: 'ZENITH', accent: '#3effb2' }, // soucoupe (menthe, seuil 26)
  { id: 'ronin', name: 'RONIN', accent: '#ff3ec8' },   // samouraï (magenta, seuil 32)
  { id: 'givre', name: 'GIVRE', accent: '#bfe8ff' },   // cristal de glace (bleu glacier, seuil 40)
  { id: 'omega', name: 'OMEGA', accent: '#e0c8ff' },   // l'ultime (violet plasma, seuil 50)
```

- [ ] **Step 4: Suite complète verte**

Run: `npx vitest run`
Expected: PASS (les sprites s6-s11 n'entrent dans la map d'assets qu'en Task 5 ; d'ici là un record ≥18 afficherait un sprite manquant en hangar — acceptable sur la branche, PAS mergeable avant Task 5).

- [ ] **Step 5: Commit**

```bash
git add src/ tests/
git commit -m "feat(skins): table à 12 robots — seuils 18/22/26/32/40/50"
```

---

### Task 2: `fix-recolor.mjs` + correction des 4 recolors (0 crédit)

**Files:**
- Create: `C:/Setup/Projects/Game/Slop/.claude/tools/fix-recolor.mjs`
- Create: `C:/Setup/Projects/Game/Slop/.claude/tools/strip-sheet.mjs`
- Modify: `assets/robot-s1*.png`, `assets/robot-s2*.png`, `assets/robot-s3*.png`, `assets/robot-s4*.png` (12 PNG regénérés, mêmes noms)

**Interfaces:**
- Consumes: `assets/robot.png` (PROTO, référence du masque), `compose-thrust.mjs` (existant : `node compose-thrust.mjs <idle> <accentHex> <outDir> <outName>` — recentre l'idle sur PROTO, compose thrust-0/1 avec la flamme PROTO teintée accent).
- Produces: 12 sprites recolors cohérents (mêmes noms de fichiers → zéro changement de code) ; outils durables réutilisables.

- [ ] **Step 1: Sauvegarder l'état AVANT (pour la planche comparative)**

```powershell
$avant = "$env:TEMP\recolor-avant"; New-Item -ItemType Directory -Force $avant | Out-Null
Copy-Item assets/robot-s1*.png,assets/robot-s2*.png,assets/robot-s3*.png,assets/robot-s4*.png $avant
```

- [ ] **Step 2: Écrire `strip-sheet.mjs` (grille de sprites zoomés, générique)**

Créer `C:/Setup/Projects/Game/Slop/.claude/tools/strip-sheet.mjs` :

```js
// Grille de sprites 64x64 zoomés sur damier (juge les couleurs ET la découpe).
// Usage: node strip-sheet.mjs <out.png> <cols> <zoom> <sprite1.png> [sprite2.png ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { PNG } = createRequire(import.meta.url)('pngjs');

const [, , outPath, colsArg, zoomArg, ...files] = process.argv;
const COLS = Number(colsArg), Z = Number(zoomArg);
const CELL = 64 * Z + 12;
const rows = Math.ceil(files.length / COLS);
const sheet = new PNG({ width: CELL * COLS, height: CELL * rows });
files.forEach((f, n) => {
  const png = PNG.sync.read(readFileSync(f));
  const ox = (n % COLS) * CELL + 6, oy = (n / COLS | 0) * CELL + 6;
  for (let y = 0; y < 64 * Z; y += 1) for (let x = 0; x < 64 * Z; x += 1) {
    const si = ((y / Z | 0) * png.width + (x / Z | 0)) * 4;
    const di = ((oy + y) * sheet.width + ox + x) * 4;
    const a = png.data[si + 3];
    const check = ((x / 16 | 0) + (y / 16 | 0)) % 2 ? 55 : 75;
    sheet.data[di] = a ? png.data[si] : check;
    sheet.data[di + 1] = a ? png.data[si + 1] : check;
    sheet.data[di + 2] = a ? png.data[si + 2] : check;
    sheet.data[di + 3] = 255;
  }
});
writeFileSync(outPath, PNG.sync.write(sheet));
console.log(`${outPath} (${files.length} sprites, ${COLS} colonnes)`);
```

- [ ] **Step 3: Écrire `fix-recolor.mjs`**

Créer `C:/Setup/Projects/Game/Slop/.claude/tools/fix-recolor.mjs` :

```js
// Corrige l'idle d'un recolor : remappe vers l'accent du skin les pixels
// dépareillés du jetpack (aileron + flamme pilote). Masque spatial guidé par
// PROTO : ses pixels cyan de jetpack sont TOUS à x<32 ; ses cyans légitimes
// (bandeau x43-47, yeux x39-41/49-50, torse x42-45) sont tous à x>=39 et
// restent hors masque (protège p.ex. la visière de NOVA).
// Les frames thrust sont reconstruites ensuite par compose-thrust.mjs.
// Usage: node fix-recolor.mjs <idlePath> <accentHex> <outPath>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { PNG } = createRequire(import.meta.url)('pngjs');

const [, , idlePath, accentHex, outPath] = process.argv;
const PROTO = 'C:/Setup/Projects/Game/Slop/1st_Slop/assets/robot.png';

const load = (p) => PNG.sync.read(readFileSync(p));
// Cyan PROTO : bleu-vert saturé, rouge en retrait.
const isCyan = (d, i) => d[i + 3] > 8 && d[i + 2] > 140 && d[i + 1] > 120 && d[i] < d[i + 1] * 0.75;

// Teintes proches ? Compare les canaux normalisés par le max (indépendant de
// la luminosité) — en dessous de 0.35 on considère que c'est déjà l'accent.
function hueClose(r, g, b, r2, g2, b2) {
  const m = Math.max(r, g, b) || 1, m2 = Math.max(r2, g2, b2) || 1;
  return Math.abs(r / m - r2 / m2) + Math.abs(g / m - g2 / m2) + Math.abs(b / m - b2 / m2) < 0.35;
}

const proto = load(PROTO);
const skin = load(idlePath);
const ar = parseInt(accentHex.slice(1, 3), 16);
const ag = parseInt(accentHex.slice(3, 5), 16);
const ab = parseInt(accentHex.slice(5, 7), 16);
const amax = Math.max(ar, ag, ab) || 1;
let n = 0;
for (let y = 0; y < 64; y += 1) for (let x = 0; x < 32; x += 1) {
  const i = (y * 64 + x) * 4;
  if (!isCyan(proto.data, i)) continue;        // hors jetpack PROTO
  if (skin.data[i + 3] <= 8) continue;         // transparent chez le skin
  const r = skin.data[i], g = skin.data[i + 1], b = skin.data[i + 2];
  if (hueClose(r, g, b, ar, ag, ab)) continue; // déjà à l'accent (idempotent)
  const lum = Math.max(r, g, b) / 255;
  skin.data[i] = Math.round((ar / amax) * lum * 255);
  skin.data[i + 1] = Math.round((ag / amax) * lum * 255);
  skin.data[i + 2] = Math.round((ab / amax) * lum * 255);
  n += 1;
}
writeFileSync(outPath, PNG.sync.write(skin));
console.log(`${outPath} : ${n} pixels remappés vers ${accentHex}`);
```

- [ ] **Step 4: Corriger les 4 recolors (idle fixé, thrusts reconstruits)**

Depuis `<worktree>/1st_Slop` :

```bash
T=C:/Setup/Projects/Game/Slop/.claude/tools
node $T/fix-recolor.mjs assets/robot-s1.png "#ff9a3e" assets/robot-s1.png
node $T/compose-thrust.mjs assets/robot-s1.png "#ff9a3e" assets robot-s1
node $T/fix-recolor.mjs assets/robot-s2.png "#7dff3e" assets/robot-s2.png
node $T/compose-thrust.mjs assets/robot-s2.png "#7dff3e" assets robot-s2
node $T/fix-recolor.mjs assets/robot-s3.png "#c93eff" assets/robot-s3.png
node $T/compose-thrust.mjs assets/robot-s3.png "#c93eff" assets robot-s3
node $T/fix-recolor.mjs assets/robot-s4.png "#fff7d6" assets/robot-s4.png
node $T/compose-thrust.mjs assets/robot-s4.png "#fff7d6" assets robot-s4
```

Expected : remaps ~118 px (FORGE, NOVA : aileron + flamme cyan), ~60 px
(VENIN : flamme jaune), ~0 px (ORAGE : idle déjà à l'accent — idempotence) ;
chaque compose-thrust logge `recentrage: dx=0 dy=0` (±1 — les recolors
partagent la silhouette PROTO ; un décalage plus grand = STOP, investiguer).

- [ ] **Step 5: Vérification alpha (le fond blanc d'ORAGE doit disparaître)**

```bash
node -e "const {PNG}=require('C:/Setup/Projects/Game/Slop/.claude/tools/node_modules/pngjs');const fs=require('fs');let bad=0;for(const s of ['s1','s2','s3','s4'])for(const f of ['','-thrust-0','-thrust-1']){const p=PNG.sync.read(fs.readFileSync('assets/robot-'+s+f+'.png'));let o=0;for(let i=3;i<p.data.length;i+=4)if(p.data[i]>8)o++;console.log('robot-'+s+f,o);if(o>2500)bad++}process.exit(bad)"
```

Expected : exit 0, chaque sprite < 2500 pixels opaques (avant fix,
`robot-s3-thrust-0` était à 4096).

- [ ] **Step 6: Planche avant/après**

```powershell
$T = "C:/Setup/Projects/Game/Slop/.claude/tools"
$avant = "$env:TEMP\recolor-avant"; $out = "$env:TEMP\recolor-gate"; New-Item -ItemType Directory -Force $out | Out-Null
node $T/strip-sheet.mjs "$out/avant.png" 3 4 $avant/robot-s1.png $avant/robot-s1-thrust-0.png $avant/robot-s1-thrust-1.png $avant/robot-s2.png $avant/robot-s2-thrust-0.png $avant/robot-s2-thrust-1.png $avant/robot-s3.png $avant/robot-s3-thrust-0.png $avant/robot-s3-thrust-1.png $avant/robot-s4.png $avant/robot-s4-thrust-0.png $avant/robot-s4-thrust-1.png
node $T/strip-sheet.mjs "$out/apres.png" 3 4 assets/robot-s1.png assets/robot-s1-thrust-0.png assets/robot-s1-thrust-1.png assets/robot-s2.png assets/robot-s2-thrust-0.png assets/robot-s2-thrust-1.png assets/robot-s3.png assets/robot-s3-thrust-0.png assets/robot-s3-thrust-1.png assets/robot-s4.png assets/robot-s4-thrust-0.png assets/robot-s4-thrust-1.png
```

Examiner `apres.png` : aileron + flamme à l'accent sur les 3 frames de chaque
skin, visière NOVA toujours cyan, corps identique idle/thrust, aucun fond
opaque. Pixels cyan résiduels isolés (anti-aliasing) → retouche au pixel
documentée (spec, « cas limite ») avant de continuer.

- [ ] **Step 7: Suite verte + commit**

Run: `npx vitest run`
Expected: PASS (les recolors gardent leurs noms, rien d'autre ne bouge).

```bash
git add assets/robot-s1*.png assets/robot-s2*.png assets/robot-s3*.png assets/robot-s4*.png
git commit -m "fix(assets): recolors cohérents — jetpack à l'accent sur les 3 frames, fond blanc ORAGE supprimé"
```

---

### Task 3: Génération PixelLab — 6 appels, planches contact, GATE G1+G2 (BLOQUANT)

**Files:**
- Create: `assets/preview/titan-*.png`, `abysse-*.png`, `zenith-*.png`, `ronin-*.png`, `givre-*.png`, `omega-*.png` (16 candidats chacun) + 6 planches `assets/preview/<nom>-contact.png`

**Interfaces:**
- Consumes: `scripts/pixellab.mjs generate`, clé dans `.env` (copié — Global Constraints), `contact-sheet.mjs` (existant).
- Produces: UN candidat retenu par Jael PAR skin (noté `<nom>-<i>.png`) pour Task 4 ; coût réel documenté.

- [ ] **Step 1: Solde AVANT**

```powershell
$env_ = Get-Content .env -Raw; $key = ([regex]::Match($env_, 'PIXELLAB_API_KEY\s*=\s*(.+)')).Groups[1].Value.Trim().Trim('"').Trim("'")
(Invoke-RestMethod -Uri 'https://api.pixellab.ai/v2/balance' -Headers @{Authorization="Bearer $key"}).subscription.generations
```

Expected: `2000` (ou noter la valeur réelle).

- [ ] **Step 2: Les 6 appels (seed = 700 + seuil)**

```bash
node scripts/pixellab.mjs generate --size 64x64 --no-bg true --out-dir assets/preview --name titan --seed 718 \
  --description "squat heavy mech robot, massive broad shoulders, boxy armored torso, short thick legs, small glowing yellow visor, construction-yellow accents on dark steel hull, side view facing right, hovering, cyberpunk, clean pixel art, black outline, readable silhouette"

node scripts/pixellab.mjs generate --size 64x64 --no-bg true --out-dir assets/preview --name abysse --seed 722 \
  --description "small robotic fish submarine, rounded metal hull, round porthole window, dorsal fin, rear propeller, glowing deep-blue accents on dark teal hull, side view facing right, floating, cyberpunk, clean pixel art, black outline, readable silhouette"

node scripts/pixellab.mjs generate --size 64x64 --no-bg true --out-dir assets/preview --name zenith --seed 726 \
  --description "small flying saucer UFO robot, smooth metal disc, glass dome on top with tiny pilot light, small antenna, glowing mint-green lights around the rim, dark chrome hull, side view facing right, hovering, cyberpunk, clean pixel art, black outline, readable silhouette"

node scripts/pixellab.mjs generate --size 64x64 --no-bg true --out-dir assets/preview --name ronin --seed 732 \
  --description "slender samurai robot, horned kabuto helmet, faceless dark visor, layered armor plates, glowing magenta accents and belt sash, dark lacquered armor, side view facing right, hovering, cyberpunk, clean pixel art, black outline, readable silhouette"

node scripts/pixellab.mjs generate --size 64x64 --no-bg true --out-dir assets/preview --name givre --seed 740 \
  --description "crystalline ice robot, faceted crystal body, sharp angular shards, frosty inner glow, pale glacier-blue accents on translucent icy hull, side view facing right, hovering, cyberpunk, clean pixel art, black outline, readable silhouette"

node scripts/pixellab.mjs generate --size 64x64 --no-bg true --out-dir assets/preview --name omega --seed 750 \
  --description "supreme final-boss robot, deep black armor with glowing violet plasma trim lines, small crown-like crest, single bright eye, imposing compact silhouette, side view facing right, hovering, cyberpunk, clean pixel art, black outline, readable silhouette"
```

Expected: 96 fichiers `<nom>-0..15.png`, tous `PNG ✓`.

- [ ] **Step 3: Solde APRÈS → coût mesuré**

Même commande que Step 1. Noter `avant − après` (attendu ~96). **Si le coût
total dépasse 120 : STOP, prévenir Jael avant toute suite.**

- [ ] **Step 4: Les 6 planches contact**

```bash
for n in titan abysse zenith ronin givre omega; do node C:/Setup/Projects/Game/Slop/.claude/tools/contact-sheet.mjs assets/preview $n assets/preview/$n-contact.png; done
```

- [ ] **Step 5: Commit (candidats = trace du choix)**

```bash
git add assets/preview/
git commit -m "feat(assets): 96 candidats PixelLab pour les 6 robots v3 + planches contact"
```

- [ ] **Step 6: Pré-tri + GATE Jael G1+G2 (BLOQUANT)**

Pré-trier chaque planche (éliminer d'office et nommer : de face, tourné à
gauche, humanoïde générique, illisible à 44px, trop proche d'un des 11 autres
robots). Présenter à Jael EN UN SEUL message : les 6 planches contact
annotées (G1) + la planche avant/après des recolors de la Task 2 (G2).
Jael choisit 1 candidat par skin et valide (ou pas) les recolors corrigés.
Un concept rejeté en bloc → re-prompt de CE concept seul (1 appel, dans le
plafond) après son accord. Pas d'OK explicite → pas de Task 4.

---

### Task 4: Composition des 6 retenus (idle + 2 thrusts, 0 crédit prévu)

**Files:**
- Create: `assets/robot-s6.png` … `assets/robot-s11.png` + leurs `-thrust-0/-thrust-1` (18 PNG)

**Interfaces:**
- Consumes: les 6 candidats retenus au G1 ; `compose-thrust.mjs`.
- Produces: 18 sprites 64×64 (corps identique sur les 3 frames de chaque skin) pour la map d'assets (Task 5) : slot 6=titan, 7=abysse, 8=zenith, 9=ronin, 10=givre, 11=omega.

- [ ] **Step 1: Composer (remplacer `<i>` par le candidat retenu de chaque skin)**

```bash
T=C:/Setup/Projects/Game/Slop/.claude/tools
node $T/compose-thrust.mjs assets/preview/titan-<i>.png "#ffd23e" assets robot-s6
node $T/compose-thrust.mjs assets/preview/abysse-<i>.png "#3e6bff" assets robot-s7
node $T/compose-thrust.mjs assets/preview/zenith-<i>.png "#3effb2" assets robot-s8
node $T/compose-thrust.mjs assets/preview/ronin-<i>.png "#ff3ec8" assets robot-s9
node $T/compose-thrust.mjs assets/preview/givre-<i>.png "#bfe8ff" assets robot-s10
node $T/compose-thrust.mjs assets/preview/omega-<i>.png "#e0c8ff" assets robot-s11
```

Expected: 18 PNG ; log de recentrage par skin avec bbox comparable à PROTO
(écart > ~40 % en largeur/hauteur = lisibilité 44px en danger, le signaler).
Si un candidat retenu regarde à GAUCHE, le miroiter d'abord (précédent
VORTEX : idle « miroité recentré ») — pngjs, flip horizontal, puis composer.

- [ ] **Step 2: Vérification alpha + visuelle + décision soupape**

Stats alpha des 18 nouveaux sprites (silhouette découpée, pas de fond baké) :

```bash
node -e "const {PNG}=require('C:/Setup/Projects/Game/Slop/.claude/tools/node_modules/pngjs');const fs=require('fs');let bad=0;for(const s of ['s6','s7','s8','s9','s10','s11'])for(const f of ['','-thrust-0','-thrust-1']){const p=PNG.sync.read(fs.readFileSync('assets/robot-'+s+f+'.png'));let o=0;for(let i=3;i<p.data.length;i+=4)if(p.data[i]>8)o++;console.log('robot-'+s+f,o);if(o>2500)bad++}process.exit(bad)"
```

Expected: exit 0, chaque sprite < 2500 pixels opaques.

Planche des frames (PowerShell) :

```powershell
$T = "C:/Setup/Projects/Game/Slop/.claude/tools"
node $T/strip-sheet.mjs "$env:TEMP/v3-frames.png" 3 4 assets/robot-s6.png assets/robot-s6-thrust-0.png assets/robot-s6-thrust-1.png assets/robot-s7.png assets/robot-s7-thrust-0.png assets/robot-s7-thrust-1.png assets/robot-s8.png assets/robot-s8-thrust-0.png assets/robot-s8-thrust-1.png assets/robot-s9.png assets/robot-s9-thrust-0.png assets/robot-s9-thrust-1.png assets/robot-s10.png assets/robot-s10-thrust-0.png assets/robot-s10-thrust-1.png assets/robot-s11.png assets/robot-s11-thrust-0.png assets/robot-s11-thrust-1.png
```

Examiner : corps identique sur les 3 frames, flamme à l'accent uniquement
sous le corps, pas de pixels orphelins. Si la flamme jetpack générique
choque sur un skin (pressentis spec : ABYSSE, OMEGA) : d'abord tenter le
décalage horizontal de flamme (`shift(flame, dx, 0)` avant compose, valeur
documentée) ; en dernier recours **1 appel `edit` max par skin concerné**
(réserve de 3, plafond 200 crédits, solde mesuré avant/après) pour dériver
les 2 frames thrust du candidat retenu.

- [ ] **Step 3: Commit**

```bash
git add assets/robot-s6*.png assets/robot-s7*.png assets/robot-s8*.png assets/robot-s9*.png assets/robot-s10*.png assets/robot-s11*.png
git commit -m "feat(assets): sprites des 6 robots v3 — idles recentrés + flammes à l'accent"
```

---

### Task 5: Câblage assets + build

**Files:**
- Modify: `src/main.js:30-32` (imports, après `robotS5Thrust1`) et `src/main.js:143-145` (map `loadImages`, après `'robot-s5-thrust-1'`)

**Interfaces:**
- Consumes: les 18 PNG de Task 4 ; `spriteKey(6..11)` → `robot-s6`…`robot-s11` (existant).
- Produces: clés `robot-s6`…`robot-s11` (+ `-thrust-0/1`) dans la map d'assets.

- [ ] **Step 1: Câbler**

Dans `src/main.js`, après la ligne 32 (`import robotS5Thrust1 …`) :

```js
import robotS6 from '../assets/robot-s6.png';
import robotS6Thrust0 from '../assets/robot-s6-thrust-0.png';
import robotS6Thrust1 from '../assets/robot-s6-thrust-1.png';
import robotS7 from '../assets/robot-s7.png';
import robotS7Thrust0 from '../assets/robot-s7-thrust-0.png';
import robotS7Thrust1 from '../assets/robot-s7-thrust-1.png';
import robotS8 from '../assets/robot-s8.png';
import robotS8Thrust0 from '../assets/robot-s8-thrust-0.png';
import robotS8Thrust1 from '../assets/robot-s8-thrust-1.png';
import robotS9 from '../assets/robot-s9.png';
import robotS9Thrust0 from '../assets/robot-s9-thrust-0.png';
import robotS9Thrust1 from '../assets/robot-s9-thrust-1.png';
import robotS10 from '../assets/robot-s10.png';
import robotS10Thrust0 from '../assets/robot-s10-thrust-0.png';
import robotS10Thrust1 from '../assets/robot-s10-thrust-1.png';
import robotS11 from '../assets/robot-s11.png';
import robotS11Thrust0 from '../assets/robot-s11-thrust-0.png';
import robotS11Thrust1 from '../assets/robot-s11-thrust-1.png';
```

Dans la map `loadImages`, après `'robot-s5-thrust-1': robotS5Thrust1,` :

```js
  'robot-s6': robotS6,
  'robot-s6-thrust-0': robotS6Thrust0,
  'robot-s6-thrust-1': robotS6Thrust1,
  'robot-s7': robotS7,
  'robot-s7-thrust-0': robotS7Thrust0,
  'robot-s7-thrust-1': robotS7Thrust1,
  'robot-s8': robotS8,
  'robot-s8-thrust-0': robotS8Thrust0,
  'robot-s8-thrust-1': robotS8Thrust1,
  'robot-s9': robotS9,
  'robot-s9-thrust-0': robotS9Thrust0,
  'robot-s9-thrust-1': robotS9Thrust1,
  'robot-s10': robotS10,
  'robot-s10-thrust-0': robotS10Thrust0,
  'robot-s10-thrust-1': robotS10Thrust1,
  'robot-s11': robotS11,
  'robot-s11-thrust-0': robotS11Thrust0,
  'robot-s11-thrust-1': robotS11Thrust1,
```

- [ ] **Step 2: Suite + build**

Run: `npx vitest run && npm run build`
Expected: PASS + build Vite OK (18 nouveaux PNG dans le manifeste).

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat(skins): sprites des 6 robots v3 câblés dans la map d'assets"
```

---

### Task 6: Smoke roster + GATE Jael G3 en jeu (BLOQUANT)

**Files:**
- Create: `C:/Setup/Projects/Game/Slop/.claude/smokes/roster-smoke.mjs`

**Interfaces:**
- Consumes: serveur Vite `npx vite --port 5199 --strictPort` depuis `<worktree>/1st_Slop`.
- Produces: verdict automatisé (12 checks) + captures pour le gate G3.

- [ ] **Step 1: Écrire le smoke**

```js
// Roster v3 : chaque nouveau skin est verrouillé à seuil-1 (non sélectionnable),
// débloqué/sélectionné/persisté à seuil, et porté en vol (capture).
import { chromium } from 'file:///C:/Users/pattyn/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5199';
const OUT = process.argv[2] || '.';
const NEW_SKINS = [
  { slot: 6, seuil: 18, name: 'titan' },
  { slot: 7, seuil: 22, name: 'abysse' },
  { slot: 8, seuil: 26, name: 'zenith' },
  { slot: 9, seuil: 32, name: 'ronin' },
  { slot: 10, seuil: 40, name: 'givre' },
  { slot: 11, seuil: 50, name: 'omega' },
];
const fails = [];
const check = (label, cond) => { if (!cond) fails.push(label); console.log(`${cond ? 'OK ' : 'FAIL'} ${label}`); };
const browser = await chromium.launch();

async function session(record) {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 864 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fails.push(`pageerror: ${e.message}`));
  await page.addInitScript((lv) => localStorage.setItem('jetpackbot.bestLevel', String(lv)), record);
  await page.goto(BASE);
  await page.waitForTimeout(1800);
  return { ctx, page };
}

// Menu -> ROBOTS (2 flèches bas + Enter), puis -> slot n (n flèches droite).
async function toSlot(page, slot) {
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  for (let k = 0; k < slot; k += 1) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
}

for (const { slot, seuil, name } of NEW_SKINS) {
  // 1. seuil-1 : verrouillé
  {
    const { ctx, page } = await session(seuil - 1);
    await toSlot(page, slot);
    await page.screenshot({ path: `${OUT}/${name}-verrouille.png` }); // silhouette + NIVEAU <seuil>
    await page.keyboard.press('Enter'); // CHOISIR désactivé
    await page.waitForTimeout(300);
    const skin = await page.evaluate(() => localStorage.getItem('jetpackbot.skin'));
    check(`${name} record ${seuil - 1}: non sélectionnable`, skin !== String(slot));
    await ctx.close();
  }
  // 2. seuil : débloqué, sélection persistée, en vol
  {
    const { ctx, page } = await session(seuil);
    await toSlot(page, slot);
    await page.screenshot({ path: `${OUT}/${name}-debloque.png` });
    await page.keyboard.press('Enter'); // CHOISIR
    await page.waitForTimeout(300);
    check(`${name} record ${seuil}: sélection persistée`,
      await page.evaluate(() => localStorage.getItem('jetpackbot.skin')) === String(slot));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await page.keyboard.press('ArrowDown'); // CONTINUE
    await page.keyboard.press('Enter');
    const end = Date.now() + 1600;
    let shot = false;
    while (Date.now() < end) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(150);
      await page.keyboard.up('Space');
      await page.waitForTimeout(190);
      if (!shot && end - Date.now() < 800) { await page.screenshot({ path: `${OUT}/${name}-en-vol.png` }); shot = true; }
    }
    await ctx.close();
  }
}

await browser.close();
console.log(fails.length ? `\n${fails.length} FAIL` : '\nTOUT OK');
process.exit(fails.length ? 1 : 0);
```

- [ ] **Step 2: Lancer et juger**

Serveur : `npx vite --port 5199 --strictPort` depuis `<worktree>/1st_Slop`.
Run: `node C:/Setup/Projects/Game/Slop/.claude/smokes/roster-smoke.mjs <outdir>`
Expected: `TOUT OK` (12 checks), exit 0. Captures : verrouillé = silhouette
sombre + « NIVEAU <seuil> » ; débloqué = sprite plein + nom à l'accent ;
en vol = flamme/particules à l'accent du skin. Si la nav du smoke ne colle
pas au layout réel, corriger le SMOKE, pas le jeu.

- [ ] **Step 3: Codes save pour le gate**

```bash
node --input-type=module -e "import('./src/game/save.js').then((m) => { for (const lv of [17, 18, 22, 26, 32, 40, 50]) console.log(lv, m.encodeSave({ bestLevel: lv })); })"
```

Expected: 7 codes `JB1-…` (17 = contre-épreuve verrouillée de TITAN).

- [ ] **Step 4: GATE Jael G3 en jeu (BLOQUANT)**

Présenter à Jael : serveur :5199, les 7 codes, les captures du smoke + les
recolors corrigés à re-voir en vol (codes 3/5/7/10 déjà connus : JB1-303,
JB1-505, JB1-707, JB1-A0A). Points de la spec : hangar navigue sur 12,
frontières de déblocage, 3 frames sans saut, flamme/particules à l'accent,
lisible sur les 5 décors. OK Jael → merge `--no-ff` via
finishing-a-development-branch (pas de push sans demande) ; retouches →
itérer Task 4 (composite local) avant tout nouvel appel.
