# Skins v2 — VORTEX (drone pilote) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6e robot jouable VORTEX (drone volant, accent rouge `#ff3e5e`, débloqué au niveau 15) généré en 1 appel PixelLab, frames de poussée fabriquées en local.

**Architecture:** `CONFIG.SKIN_THRESHOLDS` devient la source unique des seuils de déblocage (corrige l'indexation hors-bornes de `PATTERN_TIERS` pour un 6e skin). La table `SKINS` passe à 6 ; hangar et navigation sont déjà génériques. Les assets viennent d'UN appel `generate` (16 candidats, gate Jael) + un outil local de composition des flammes. Spec : `docs/superpowers/specs/2026-07-07-skins-v2-drone-design.md`.

**Tech Stack:** Vanilla JS + Canvas 2D, Vitest, PixelLab API v2 (`scripts/pixellab.mjs`), pngjs (outil local hors repo du jeu), smoke Playwright (import `file:///C:/Users/pattyn/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`).

## Global Constraints

- Branche `feat/skins-v2-vortex` depuis main (`d9d8db0` ou plus récent), worktree isolé (skill superpowers:using-git-worktrees).
- `.env` est non tracké : le copier du repo principal (`1st_Slop/.env`) vers `<worktree>/1st_Slop/.env` avant la Task 2, sinon `pixellab.mjs` échoue.
- **Budget PixelLab : 1 appel prévu, 3 MAXIMUM.** Solde vérifié avant/après chaque appel (`GET /v2/balance`, 257 générations au 07/07). Candidats inexploitables ou coût anormal → STOP, retour à Jael.
- Les gates Jael (Task 2 planche contact, Task 5 en jeu) sont BLOQUANTS : ne pas enchaîner sans son OK explicite.
- Hitbox inchangée (`ROBOT_W/H` 34×24, sprite 64×64 dessiné 44×44) ; profil vers la DROITE.
- Style : code + commentaires français, modules purs, suite verte à chaque commit, commits conventionnels français.

---

### Task 1: Seuils dédiés `SKIN_THRESHOLDS` + VORTEX dans la table

**Files:**
- Modify: `src/config.js:94` (ajout SKIN_THRESHOLDS sous PATTERN_TIERS)
- Modify: `src/game/skins.js` (table + skinUnlocked + commentaire de tête)
- Modify: `src/render/skins.js:50` (label NIVEAU verrouillé)
- Test: `tests/game/skins.test.js`, `tests/render/skins.test.js`

**Interfaces:**
- Consumes: rien de nouveau.
- Produces: `CONFIG.SKIN_THRESHOLDS = [1, 3, 5, 7, 10, 15]` ; `SKINS[5] = { id: 'vortex', name: 'VORTEX', accent: '#ff3e5e' }` ; `skinUnlocked(i, record)` lit `SKIN_THRESHOLDS` (plus jamais `PATTERN_TIERS`).

- [ ] **Step 1: Adapter/écrire les tests (échec attendu)**

Dans `tests/game/skins.test.js`, remplacer les describe `skins — table` et `skinUnlocked` (le reste ne bouge pas — la garde `'9'` de loadSkin reste hors bornes avec 6 entrées) :

```js
describe('skins — table', () => {
  it('6 skins, ids et noms attendus, un seuil chacun', () => {
    expect(SKINS.map((s) => s.id)).toEqual(['proto', 'forge', 'venin', 'orage', 'nova', 'vortex']);
    expect(SKINS.map((s) => s.name)).toEqual(['PROTO', 'FORGE', 'VENIN', 'ORAGE', 'NOVA', 'VORTEX']);
    expect(SKINS.length).toBe(CONFIG.SKIN_THRESHOLDS.length);
  });

  it('accents: un par skin, rouge néon pour VORTEX', () => {
    expect(SKINS.map((s) => s.accent))
      .toEqual(['#3ef0ff', '#ff9a3e', '#7dff3e', '#c93eff', '#fff7d6', '#ff3e5e']);
  });

  it('les 5 premiers seuils restent ceux des tiers de patterns (mondes)', () => {
    expect(CONFIG.SKIN_THRESHOLDS.slice(0, 5)).toEqual(CONFIG.PATTERN_TIERS);
    expect(CONFIG.SKIN_THRESHOLDS[5]).toBe(15);
  });
});

describe('skinUnlocked', () => {
  it('PROTO (0) est toujours débloqué, même à record 0 (nouveau joueur)', () => {
    expect(skinUnlocked(0, 0)).toBe(true);
  });

  it('frontières de tous les seuils (3/5/7/10/15)', () => {
    for (const [i, seuil] of CONFIG.SKIN_THRESHOLDS.entries()) {
      if (i === 0) continue; // PROTO : toujours débloqué (testé ci-dessus)
      expect(skinUnlocked(i, seuil)).toBe(true);
      expect(skinUnlocked(i, seuil - 1)).toBe(false);
    }
  });

  it('record 2: seul PROTO est débloqué', () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => skinUnlocked(i, 2)))
      .toEqual([true, false, false, false, false, false]);
  });

  it('record 10: tout sauf VORTEX ; record 15: tout', () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => skinUnlocked(i, 10)))
      .toEqual([true, true, true, true, true, false]);
    expect([0, 1, 2, 3, 4, 5].every((i) => skinUnlocked(i, 15))).toBe(true);
  });
});
```

Dans `tests/render/skins.test.js` :
- `worldWith` (ligne 42) : `const unlocked = record >= CONFIG.SKIN_THRESHOLDS[slot];`
- Ajouter au describe `renderSkins` :

```js
  it('slot 5 (VORTEX) verrouillé à record 10: NIVEAU 15 affiché', () => {
    const ctx = fakeCtx();
    const off = fakeOffscreen();
    renderSkins(ctx, worldWith(5, 10), fakeAssets(), () => off);
    expect(ctx.texts).toContain('NIVEAU 15');
    expect(ctx.texts).not.toContain('VORTEX');
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/game/skins.test.js tests/render/skins.test.js`
Expected: FAIL — `SKIN_THRESHOLDS` undefined, table à 5.

- [ ] **Step 3: Implémenter**

1. `src/config.js`, sous la ligne `PATTERN_TIERS` :

```js
  // Seuils de déblocage des skins (source unique — les 5 premiers = entrées
  // des mondes, les suivants sont des objectifs au-delà de l'orbite).
  SKIN_THRESHOLDS: [1, 3, 5, 7, 10, 15],
```

2. `src/game/skins.js` :
   - Table : ajouter `{ id: 'vortex', name: 'VORTEX', accent: '#ff3e5e' }, // drone (rouge néon, seuil 15)`.
   - `skinUnlocked` : `return i === 0 || record >= CONFIG.SKIN_THRESHOLDS[i];`
   - Commentaire de tête : remplacer la mention `CONFIG.PATTERN_TIERS` par `CONFIG.SKIN_THRESHOLDS` (les 5 premiers seuils coïncident avec les mondes, la suite est libre).
3. `src/render/skins.js:50` : `` `NIVEAU ${CONFIG.SKIN_THRESHOLDS[slot]}` ``.

- [ ] **Step 4: Suite complète verte**

Run: `npx vitest run`
Expected: PASS (le jeu tourne encore sans les sprites s5 : ils n'entrent dans la map d'assets qu'en Task 4 ; d'ici là un record ≥15 afficherait un sprite manquant en hangar — acceptable sur la branche, PAS mergeable avant Task 4).

- [ ] **Step 5: Commit**

```bash
git add src/ tests/
git commit -m "feat(skins): seuils dédiés SKIN_THRESHOLDS + VORTEX (seuil 15) dans la table"
```

---

### Task 2: Génération PixelLab — 1 appel, mesure du coût, planche contact (GATE Jael)

**Files:**
- Create: `assets/preview/vortex-*.png` (16 candidats), `assets/preview/vortex-contact.png` (planche)
- Create: `C:/Setup/Projects/Game/Slop/.claude/tools/contact-sheet.mjs` (montage grille, pngjs)

**Interfaces:**
- Consumes: `scripts/pixellab.mjs generate` (existant), clé dans `.env`.
- Produces: UN candidat retenu par Jael (noté `vortex-<i>.png`) pour Task 3 ; coût réel par appel documenté.

- [ ] **Step 1: Solde AVANT (référence)**

```powershell
$env_ = Get-Content .env -Raw; $key = ([regex]::Match($env_, 'PIXELLAB_API_KEY\s*=\s*(.+)')).Groups[1].Value.Trim().Trim('"').Trim("'")
(Invoke-RestMethod -Uri 'https://api.pixellab.ai/v2/balance' -Headers @{Authorization="Bearer $key"}).subscription.generations
```

Expected: `257` (ou noter la valeur réelle).

- [ ] **Step 2: L'appel (LE SEUL PRÉVU)**

```bash
node scripts/pixellab.mjs generate --size 64x64 --no-bg true --out-dir assets/preview --name vortex --seed 707 \
  --description "tiny flying surveillance drone robot, compact rounded body, single large glowing red eye lens, two small side rotors, twin downward thruster nozzles under the body, dark gunmetal hull with neon red accents, side view facing right, hovering, cyberpunk, clean pixel art, black outline, readable silhouette"
```

Expected: 16 fichiers `vortex-0..15.png`, tous `PNG ✓`.

- [ ] **Step 3: Solde APRÈS → coût mesuré**

Même commande que Step 1. Noter `avant − après` = coût d'un appel (à reporter dans la mémoire projet et le message à Jael). **Si le coût dépasse 16 : STOP, prévenir Jael avant toute suite.**

- [ ] **Step 4: Planche contact**

Créer `C:/Setup/Projects/Game/Slop/.claude/tools/contact-sheet.mjs` (réutilise le `node_modules` du scratchpad gif-tool s'il existe encore, sinon `npm i pngjs` dans `.claude/tools/`) :

```js
// Planche contact : grille 4x4 des candidats 64x64, agrandis x3, fond damier.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { PNG } = createRequire(import.meta.url)('pngjs');

const [, , dir, name, outPath] = process.argv;
const CELL = 64 * 3 + 16; // sprite x3 + marge
const sheet = new PNG({ width: CELL * 4, height: CELL * 4 });
for (let i = 0; i < 16; i += 1) {
  const png = PNG.sync.read(readFileSync(`${dir}/${name}-${i}.png`));
  const ox = (i % 4) * CELL + 8;
  const oy = Math.floor(i / 4) * CELL + 8;
  for (let y = 0; y < 64 * 3; y += 1) {
    for (let x = 0; x < 64 * 3; x += 1) {
      const si = ((y / 3 | 0) * png.width + (x / 3 | 0)) * 4;
      const di = ((oy + y) * sheet.width + ox + x) * 4;
      const a = png.data[si + 3];
      // damier gris sous les zones transparentes pour juger la découpe
      const check = ((x / 12 | 0) + (y / 12 | 0)) % 2 ? 60 : 80;
      sheet.data[di] = a ? png.data[si] : check;
      sheet.data[di + 1] = a ? png.data[si + 1] : check;
      sheet.data[di + 2] = a ? png.data[si + 2] : check;
      sheet.data[di + 3] = 255;
    }
  }
}
writeFileSync(outPath, PNG.sync.write(sheet));
console.log(`${outPath} (grille 4x4, index ligne par ligne: 0-3 / 4-7 / 8-11 / 12-15)`);
```

Run: `node C:/Setup/Projects/Game/Slop/.claude/tools/contact-sheet.mjs assets/preview vortex assets/preview/vortex-contact.png`

- [ ] **Step 5: Pré-tri + GATE Jael (BLOQUANT)**

Examiner la planche : éliminer d'office les candidats de face, tournés à gauche, humanoïdes ou illisibles à 44px (les nommer). Présenter la planche + le pré-tri à Jael ; il choisit UN candidat (ou rejette tout → STOP, retour brainstorming prompt sans nouvel appel sans son OK).

- [ ] **Step 6: Commit (candidats + outil = trace du choix)**

```bash
git add assets/preview/vortex-*.png
git commit -m "feat(assets): 16 candidats PixelLab pour le drone VORTEX + planche contact"
```

---

### Task 3: Frames de poussée locales + idle final (0 appel PixelLab)

**Files:**
- Create: `C:/Setup/Projects/Game/Slop/.claude/tools/compose-thrust.mjs`
- Create: `assets/robot-s5.png`, `assets/robot-s5-thrust-0.png`, `assets/robot-s5-thrust-1.png`

**Interfaces:**
- Consumes: le candidat retenu en Task 2 ; `assets/robot.png`, `assets/robot-thrust-0.png`, `assets/robot-thrust-1.png` (PROTO, source des flammes).
- Produces: les 3 sprites 64×64 de VORTEX, corps strictement identique sur les 3.

- [ ] **Step 1: Écrire l'outil de composition**

Créer `C:/Setup/Projects/Game/Slop/.claude/tools/compose-thrust.mjs` :

```js
// Fabrique les 3 sprites d'un skin "corps fixe" à partir d'un idle :
// 1. recentre l'idle sur le centre de masse du PROTO (même ancrage en jeu),
// 2. extrait la flamme de PROTO = pixels de robot-thrust-N absents de robot.png,
// 3. recolore la flamme vers l'accent du skin (rotation de teinte, luminosité
//    conservée), la composite SOUS le corps (le corps ne bouge pas).
// Usage: node compose-thrust.mjs <idleCandidat> <accentHex> <outDir> <outName>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { PNG } = createRequire(import.meta.url)('pngjs');

const [, , idlePath, accentHex, outDir, outName] = process.argv;
const GAME = 'C:/Setup/Projects/Game/Slop/1st_Slop/assets';

const load = (p) => PNG.sync.read(readFileSync(p));
const save = (png, p) => { writeFileSync(p, PNG.sync.write(png)); console.log(p); };
const at = (png, x, y) => (y * png.width + x) * 4;

function bbox(png) {
  let x0 = png.width, y0 = png.height, x1 = -1, y1 = -1;
  for (let y = 0; y < png.height; y += 1) for (let x = 0; x < png.width; x += 1) {
    if (png.data[at(png, x, y) + 3] > 8) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

function shift(png, dx, dy) {
  const out = new PNG({ width: png.width, height: png.height });
  for (let y = 0; y < png.height; y += 1) for (let x = 0; x < png.width; x += 1) {
    const sx = x - dx, sy = y - dy;
    if (sx < 0 || sy < 0 || sx >= png.width || sy >= png.height) continue;
    for (let c = 0; c < 4; c += 1) out.data[at(out, x, y) + c] = png.data[at(png, sx, sy) + c];
  }
  return out;
}

// Flamme = pixels du thrust PROTO absents (ou nettement différents) de l'idle PROTO.
function extractFlame(thrust, idle) {
  const out = new PNG({ width: thrust.width, height: thrust.height });
  for (let i = 0; i < thrust.data.length; i += 4) {
    const aT = thrust.data[i + 3], aI = idle.data[i + 3];
    const diff = Math.abs(thrust.data[i] - idle.data[i]) + Math.abs(thrust.data[i + 1] - idle.data[i + 1]) + Math.abs(thrust.data[i + 2] - idle.data[i + 2]);
    if (aT > 8 && (aI <= 8 || diff > 90)) for (let c = 0; c < 4; c += 1) out.data[i + c] = thrust.data[i + c];
  }
  return out;
}

// Recoloration : garde la luminosité de chaque pixel, prend la teinte de l'accent.
function tint(png, hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b) || 1;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] <= 8) continue;
    const lum = Math.max(png.data[i], png.data[i + 1], png.data[i + 2]) / 255;
    png.data[i] = Math.round((r / max) * lum * 255);
    png.data[i + 1] = Math.round((g / max) * lum * 255);
    png.data[i + 2] = Math.round((b / max) * lum * 255);
  }
  return png;
}

function compose(body, flame) {
  const out = new PNG({ width: body.width, height: body.height });
  body.data.copy(out.data);
  for (let i = 0; i < flame.data.length; i += 4) {
    if (flame.data[i + 3] > 8 && out.data[i + 3] <= 8) for (let c = 0; c < 4; c += 1) out.data[i + c] = flame.data[i + c];
  }
  return out;
}

const protoIdle = load(`${GAME}/robot.png`);
const proto = bbox(protoIdle);
const raw = load(idlePath);
const drone = bbox(raw);
const idle = shift(raw, Math.round(proto.cx - drone.cx), Math.round(proto.cy - drone.cy));
console.log(`recentrage: dx=${Math.round(proto.cx - drone.cx)} dy=${Math.round(proto.cy - drone.cy)} | bbox drone ${drone.x1 - drone.x0 + 1}x${drone.y1 - drone.y0 + 1} vs PROTO ${proto.x1 - proto.x0 + 1}x${proto.y1 - proto.y0 + 1}`);

save(idle, `${outDir}/${outName}.png`);
for (const n of [0, 1]) {
  const flame = tint(extractFlame(load(`${GAME}/robot-thrust-${n}.png`), protoIdle), accentHex);
  save(compose(idle, flame), `${outDir}/${outName}-thrust-${n}.png`);
}
```

- [ ] **Step 2: Générer les 3 sprites**

Run (remplacer `<i>` par le candidat retenu au gate) :

```bash
node C:/Setup/Projects/Game/Slop/.claude/tools/compose-thrust.mjs assets/preview/vortex-<i>.png "#ff3e5e" assets robot-s5
```

Expected: `robot-s5.png`, `robot-s5-thrust-0.png`, `robot-s5-thrust-1.png` créés ; log de recentrage avec une bbox drone comparable à PROTO (si largeur/hauteur s'écartent de plus de ~40 % de PROTO, la lisibilité 44px est en danger — le signaler avant de continuer).

- [ ] **Step 3: Vérification visuelle (avant tout code)**

Examiner les 3 PNG (zoom) : corps identique sur les 3, flamme rouge uniquement sous le corps, pas de pixels orphelins. La flamme PROTO sort du jetpack dorsal — vérifier qu'elle tombe sous le corps du drone de façon crédible ; sinon ajuster le composite avec un décalage horizontal de la flamme (paramètre à ajouter : `shift(flame, dx, 0)` avant compose) et documenter la valeur.

- [ ] **Step 4: Commit**

```bash
git add assets/robot-s5*.png
git commit -m "feat(assets): sprites VORTEX — idle recentré + flammes PROTO recolorées rouge"
```

---

### Task 4: Câblage assets + build

**Files:**
- Modify: `src/main.js:29-30` (imports) et `src/main.js:139-140` (map `loadImages`)

**Interfaces:**
- Consumes: `assets/robot-s5*.png` (Task 3) ; `spriteKey(5)` → `'robot-s5'` (existant).
- Produces: clés `robot-s5`, `robot-s5-thrust-0`, `robot-s5-thrust-1` dans la map d'assets du jeu.

- [ ] **Step 1: Câbler**

Dans `src/main.js`, après la ligne 29 (`import robotS4Thrust1 …`) :

```js
import robotS5 from '../assets/robot-s5.png';
import robotS5Thrust0 from '../assets/robot-s5-thrust-0.png';
import robotS5Thrust1 from '../assets/robot-s5-thrust-1.png';
```

Dans la map `loadImages`, après `'robot-s4-thrust-1': robotS4Thrust1,` :

```js
  'robot-s5': robotS5,
  'robot-s5-thrust-0': robotS5Thrust0,
  'robot-s5-thrust-1': robotS5Thrust1,
```

- [ ] **Step 2: Suite + build**

Run: `npx vitest run && npm run build`
Expected: PASS + build Vite OK (les 3 nouveaux PNG dans le manifeste d'assets).

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat(skins): sprites VORTEX câblés dans la map d'assets"
```

---

### Task 5: Smoke Playwright + GATE Jael en jeu (BLOQUANT)

**Files:**
- Create: `C:/Setup/Projects/Game/Slop/.claude/smokes/vortex-smoke.mjs`

**Interfaces:**
- Consumes: serveur Vite `npx vite --port 5199 --strictPort` depuis `<worktree>/1st_Slop` ; codes save `JB1-E0E` (nv 14) et `JB1-F0F` (nv 15).
- Produces: verdict automatisé + captures pour le gate Jael.

- [ ] **Step 1: Écrire le smoke**

```js
// VORTEX : verrouillé à record 14 (NIVEAU 15 affiché), débloqué à 15,
// sélectionnable, porté en jeu (sprite s5 + accent rouge), persisté.
import { chromium } from 'file:///C:/Users/pattyn/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5199';
const OUT = process.argv[2] || '.';
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

// Menu -> ROBOTS, puis flèche gauche = dernier slot (VORTEX, nav circulaire)
async function toVortex(page) {
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); // ROBOTS
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await page.keyboard.press('ArrowLeft'); // slot 0 -> 5
  await page.waitForTimeout(400);
}

// 1. Record 14 : VORTEX verrouillé
{
  const { ctx, page } = await session(14);
  await toVortex(page);
  await page.screenshot({ path: `${OUT}/1-verrouille-14.png` }); // silhouette + NIVEAU 15 attendu
  await page.keyboard.press('Enter'); // CHOISIR est désactivé pour un slot verrouillé
  await page.waitForTimeout(300);
  const skin = await page.evaluate(() => localStorage.getItem('jetpackbot.skin'));
  check('record 14: VORTEX non sélectionnable', skin !== '5');
  await ctx.close();
}

// 2. Record 15 : débloqué, sélection, en jeu
{
  const { ctx, page } = await session(15);
  await toVortex(page);
  await page.screenshot({ path: `${OUT}/2-debloque-15.png` }); // drone plein + nom VORTEX attendu
  await page.keyboard.press('Enter'); // CHOISIR
  await page.waitForTimeout(300);
  check('record 15: sélection persistée', await page.evaluate(() => localStorage.getItem('jetpackbot.skin')) === '5');
  await page.keyboard.press('Escape'); // retour menu
  await page.waitForTimeout(400);
  await page.keyboard.press('ArrowDown'); // CONTINUE (niveau 15)
  await page.keyboard.press('Enter');
  // survie : alternance poussée/chute, capture en vol (frames thrust visibles)
  const end = Date.now() + 2600;
  let shot = false;
  while (Date.now() < end) {
    await page.keyboard.down('Space');
    await page.waitForTimeout(150);
    await page.keyboard.up('Space');
    await page.waitForTimeout(190);
    if (!shot && end - Date.now() < 1300) { await page.screenshot({ path: `${OUT}/3-en-vol.png` }); shot = true; }
  }
  await page.screenshot({ path: `${OUT}/4-en-vol-bis.png` });
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\n${fails.length} FAIL` : '\nTOUT OK');
process.exit(fails.length ? 1 : 0);
```

- [ ] **Step 2: Lancer et juger**

Serveur : `npx vite --port 5199 --strictPort` depuis `<worktree>/1st_Slop`.
Run: `node C:/Setup/Projects/Game/Slop/.claude/smokes/vortex-smoke.mjs <outdir>`
Expected: `TOUT OK`, exit 0. Captures : `1-` silhouette sombre + « NIVEAU 15 » ; `2-` drone entier + « VORTEX » ; `3-/4-` drone en vol, flamme et particules ROUGES, lisible sur le décor orbite (niveau 15 = le plus sombre). Si la nav du smoke ne colle pas au layout réel, corriger le SMOKE, pas le jeu.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(smoke): VORTEX — déblocage 15, sélection, frames en vol"
```

- [ ] **Step 4: GATE Jael en jeu (BLOQUANT)**

Codes : `JB1-E0E` (nv 14, verrouillé) puis `JB1-F0F` (nv 15, débloqué). Points de la spec : les 3 frames s'enchaînent sans saut de silhouette, flamme/particules rouges, lisible sur les 5 décors. OK Jael → merge `--no-ff` via finishing-a-development-branch (pas de push sans demande) ; retouches → itérer sur Task 3 (composite local, 0 appel) avant tout appel `edit`.
