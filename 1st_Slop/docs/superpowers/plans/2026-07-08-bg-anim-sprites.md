# Backgrounds animés en sprites — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chaque décor a 1-2 éléments peints animés en vraies frames de sprites (fumées, enseigne, soleil, éclairs, atmosphère), même qualité sur les 5 décors.

**Architecture:** Patchs de frames (crops animés des fonds) dessinés en espace image à l'étape 1a du renderer, ancrage identique au halo torchère (offset + repli tuile). Production : PixelLab `animate-with-text-v3` sur crops ≤256px, masquage local pngjs (zéro fourmillement), bouclage jugé sur GIF de préview. Cas spécial tempête : éclairs effacés du PNG + sprites de frappe synchro avec l'événement foudre. Spec : `docs/superpowers/specs/2026-07-08-bg-anim-sprites-design.md`.

**Tech Stack:** Vanilla JS + Canvas 2D, Vitest, PixelLab REST v2 (`scripts/pixellab.mjs`), outils pngjs dans `C:/Setup/Projects/Game/Slop/.claude/tools/` (durables, non trackés), smoke Playwright (import `file:///C:/Users/pattyn/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`).

## Global Constraints

- Branche `feat/bg-anim` depuis main ≥ `932e2f1`, worktree isolé (skill superpowers:using-git-worktrees). Chemins relatifs ci-dessous = depuis `<worktree>/1st_Slop`.
- **Égalité de qualité (demande Jael, non négociable)** : les 5 décors reçoivent le même soin ; gate visuel PAR décor, un décor en retrait bloque le merge.
- PixelLab : clé dans `.env` ; `animate-with-text-v3` = entrée ≤256×256, frames PAIRES 4-16, budget `w×h×frames ≤ 524288` ; l'endpoint est GÉNÉRATIF → toujours masquer localement. Noter le coût réel en crédits du premier appel `animate` (balance avant/après) dans le ledger.
- Tailles natives des fonds : `bg-far-0` = **304×538**, `bg-far-1..4` = 320×576. Le runtime calcule l'échelle depuis l'asset (`CONFIG.WIDTH / img.width`), jamais de constante.
- Zéro dépendance runtime ajoutée. Style : code + commentaires français, modules purs, commits conventionnels français.
- Serveur de test : `npx vite --port 5199 --strictPort` depuis `<worktree>/1st_Slop`.
- Jugement visuel intermédiaire (planches contact, GIFs, captures) = l'agent ; gates en jeu = Jael.

---

### Task 1: Commandes `animate` et `balance` dans le client PixelLab

**Files:**
- Modify: `scripts/pixellab.mjs` (ajouter deux commandes après `edit`, étendre l'usage)

**Interfaces:**
- Consumes: pattern existant `pollJob`/`saveJobImages`/`parseArgs` du fichier.
- Produces: `node scripts/pixellab.mjs animate --input PATH --action "..." --frames N --out-dir DIR --name NAME [--seed N]` → sauve `NAME-0.png … NAME-(N-1).png` ; `node scripts/pixellab.mjs balance` → affiche les crédits restants.

- [ ] **Step 1: Implémenter `animate` et `balance`**

Dans `scripts/pixellab.mjs`, après la fonction `edit` :

```js
async function animate(args, key) {
  const inputBuf = readFileSync(join(PROJECT_ROOT, args.input));
  const { width, height } = pngSize(inputBuf);
  const frames = Number(args.frames || 8);
  if (frames % 2 !== 0 || frames < 4 || frames > 16) throw new Error('frames doit être pair, entre 4 et 16');
  if (width > 256 || height > 256) throw new Error(`entrée ${width}x${height} > 256x256`);
  if (width * height * frames > 524288) throw new Error(`budget pixels dépassé: ${width * height * frames} > 524288`);
  const body = {
    first_frame: { image: { type: 'base64', base64: inputBuf.toString('base64'), format: 'png' }, width, height },
    action: args.action,
    frame_count: frames,
  };
  if (args.seed) body.seed = Number(args.seed);

  console.log(`POST animate-with-text-v3  ${width}x${height}  ${frames} frames`);
  console.log(`  "${args.action}"`);
  const res = await fetch(`${API}/animate-with-text-v3`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`animate failed: ${res.status} ${await res.text()}`);
  const { background_job_id: jobId } = await res.json();
  console.log(`  job ${jobId} — polling…`);
  const job = await pollJob(key, jobId);
  saveJobImages(job, args);
}

async function balance(key) {
  const res = await fetch(`${API}/balance`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`balance failed: ${res.status} ${await res.text()}`);
  console.log(JSON.stringify(await res.json()));
}
```

Note : si l'API répond 400 sur la forme de `first_frame`, son message d'erreur est explicite — repli exact à essayer : `first_frame: { type: 'base64', base64: …, format: 'png' }` (sans l'enveloppe `{image, width, height}`). Adapter selon le message, pas au hasard.

Brancher dans le dispatch (après le bloc `edit`) :

```js
} else if (cmd === 'animate') {
  animate(args, key).catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
  });
} else if (cmd === 'balance') {
  balance(key).catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
  });
```

Et compléter l'usage :

```js
  console.error('       pixellab.mjs animate --input PATH --action "..." --frames N(pair 4-16) --out-dir DIR --name NAME [--seed N]');
  console.error('       pixellab.mjs balance');
```

- [ ] **Step 2: Vérifier la validation locale (sans dépenser de crédits)**

Run: `node scripts/pixellab.mjs animate --input assets/bg-far-1.png --action "test" --frames 8`
Expected: `ERROR: entrée 320x576 > 256x256` (la garde locale rejette avant tout appel réseau)

Run: `node scripts/pixellab.mjs balance`
Expected: JSON avec le solde (attendu ~1880 ; le noter dans le ledger)

- [ ] **Step 3: Commit**

```bash
git add scripts/pixellab.mjs
git commit -m "feat(scripts): commandes animate (animate-with-text-v3) et balance du client PixelLab"
```

---

### Task 2: Outils de production crop / masque / GIF (durables, hors repo)

**Files:**
- Create: `C:/Setup/Projects/Game/Slop/.claude/tools/bganim-crop.mjs`
- Create: `C:/Setup/Projects/Game/Slop/.claude/tools/bganim-mask.mjs`
- Create: `C:/Setup/Projects/Game/Slop/.claude/tools/bganim-gif.mjs`
- (réutiliser `contact-sheet.mjs` et `crop-zoom.mjs` existants dans ce dossier)

**Interfaces:**
- Consumes: pngjs déjà installé dans `Slop/.claude/tools/node_modules` ; gifenc à installer (`npm i gifenc` dans ce dossier).
- Produces: CLI `bganim-crop.mjs <png> <out> <x> <y> <w> <h>` ; `bganim-mask.mjs <origCrop> <framesDir> <outDir> <r,g,b-seuils…>` (voir code) ; `bganim-gif.mjs <framesDir> <out.gif> <msParFrame> [--pingpong]`.

- [ ] **Step 1: Installer gifenc et écrire les 3 outils**

```bash
cd C:/Setup/Projects/Game/Slop/.claude/tools && npm i gifenc
```

`bganim-crop.mjs` — extrait un rectangle natif :

```js
// Crop natif : node bganim-crop.mjs <png> <out.png> <x> <y> <w> <h>
import fs from 'node:fs';
import { PNG } from 'pngjs';

const [, , fin, fout, X, Y, W, H] = process.argv;
const src = PNG.sync.read(fs.readFileSync(fin));
const [x0, y0, w, h] = [+X, +Y, +W, +H];
const out = new PNG({ width: w, height: h });
for (let y = 0; y < h; y += 1) {
  for (let x = 0; x < w; x += 1) {
    const si = ((y0 + y) * src.width + (x0 + x)) * 4;
    const di = (y * w + x) * 4;
    for (let c = 0; c < 4; c += 1) out.data[di + c] = src.data[si + c];
  }
}
fs.writeFileSync(fout, PNG.sync.write(out));
console.log(`ok ${fout} (${w}x${h})`);
```

`bganim-mask.mjs` — compose chaque frame animée avec le crop d'origine : les pixels animés ne sont gardés QUE dans/près du masque de l'élément, le reste = pixels d'origine au pixel près. Le prédicat de l'élément est passé en JSON :

```js
// Masquage local anti-fourmillement.
// node bganim-mask.mjs <origCrop.png> <framesDir> <outDir> '<predicatJSON>'
// Deux modes de prédicat "pixel élément" :
//   {"mode":"channel","channel":"g","min":145,"d0":80,"d1":25,...}
//     -> canal dominant : v[channel]>=min, écarts >d0/>d1 vs les 2 autres
//        canaux (ordre r,g,b sans channel). Vert fumée: channel g;
//        enseigne rose: channel r; soleil orange: channel r.
//   {"mode":"bright","rMin":200,"gMin":180,"bMin":230,...}
//     -> pixels clairs (éclairs blanc-violet).
// Champs communs : "dilate" (px autour du masque d'origine toujours animés),
// "reach" (px max du masque où un pixel-élément DE LA FRAME est gardé).
// Un pixel est gardé animé si: dans dilate(masqueOrigine)
//   ou: pixel-élément dans la frame ET à <= reach px du masque d'origine.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const [, , origPath, framesDir, outDir, predJson] = process.argv;
const P = JSON.parse(predJson);
const orig = PNG.sync.read(fs.readFileSync(origPath));
const { width: w, height: h } = orig;

const isElem = (data, i) => {
  const v = { r: data[i], g: data[i + 1], b: data[i + 2] };
  if (P.mode === 'bright') return v.r >= P.rMin && v.g >= P.gMin && v.b >= P.bMin;
  const others = ['r', 'g', 'b'].filter((c) => c !== P.channel);
  return v[P.channel] >= P.min
    && v[P.channel] - v[others[0]] > P.d0
    && v[P.channel] - v[others[1]] > P.d1;
};
const maskOrig = new Uint8Array(w * h);
for (let i = 0; i < w * h; i += 1) if (isElem(orig.data, i * 4)) maskOrig[i] = 1;

// carte de distance grossière (chebyshev, suffisant à ces tailles)
function within(mask, x, y, d) {
  for (let dy = -d; dy <= d; dy += 1) {
    for (let dx = -d; dx <= d; dx += 1) {
      const nx = x + dx; const ny = y + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[ny * w + nx]) return true;
    }
  }
  return false;
}

fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(framesDir).filter((n) => n.endsWith('.png')).sort()) {
  const frame = PNG.sync.read(fs.readFileSync(path.join(framesDir, f)));
  if (frame.width !== w || frame.height !== h) throw new Error(`${f}: ${frame.width}x${frame.height} != ${w}x${h}`);
  const out = new PNG({ width: w, height: h });
  orig.data.copy(out.data); // base = origine
  let kept = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      const keep = within(maskOrig, x, y, P.dilate)
        || (isElem(frame.data, i * 4) && within(maskOrig, x, y, P.reach));
      if (keep) {
        for (let c = 0; c < 4; c += 1) out.data[i * 4 + c] = frame.data[i * 4 + c];
        kept += 1;
      }
    }
  }
  fs.writeFileSync(path.join(outDir, f), PNG.sync.write(out));
  console.log(`${f}: ${kept} px animés gardés / ${w * h}`);
}
```

`bganim-gif.mjs` — préview animée (gifenc) :

```js
// node bganim-gif.mjs <framesDir> <out.gif> <msParFrame> [--pingpong]
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import gifencPkg from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = gifencPkg;
const [, , dir, out, ms, pp] = process.argv;
let files = fs.readdirSync(dir).filter((n) => n.endsWith('.png')).sort();
if (pp === '--pingpong') files = files.concat(files.slice(1, -1).reverse());
const gif = GIFEncoder();
for (const f of files) {
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  const rgba = new Uint8Array(png.data);
  const palette = quantize(rgba, 256);
  gif.writeFrame(applyPalette(rgba, palette), png.width, png.height, { palette, delay: +ms });
}
gif.finish();
fs.writeFileSync(out, gif.bytes());
console.log(`ok ${out} (${files.length} frames à ${ms} ms)`);
```

- [ ] **Step 2: Vérifier la chaîne sur un cas neutre**

```bash
cd <worktree>/1st_Slop
node C:/Setup/Projects/Game/Slop/.claude/tools/bganim-crop.mjs assets/bg-far-1.png %TEMP%/test-crop.png 0 190 96 128
node C:/Setup/Projects/Game/Slop/.claude/tools/bganim-gif.mjs <dossier contenant test-crop.png> %TEMP%/test.gif 120
```

Expected: `ok … (96x128)` puis `ok … (1 frames à 120 ms)` ; ouvrir le GIF (Read) = le crop du panache gauche, non corrompu.

- [ ] **Step 3: Pas de commit repo** (outils durables hors repo) — noter leur existence dans le ledger.

---

### Task 3: Production pilote — fumées vertes du décor 1 (2 panaches)

**Files:**
- Create: `assets/bg-anim/bg1-fumee-g-{0..N-1}.png` (crop natif 96×128 à (0,190))
- Create: `assets/bg-anim/bg1-fumee-d-{0..N-1}.png` (crop natif 60×100 à (260,240))

**Interfaces:**
- Consumes: Task 1 (`animate`, `balance`), Task 2 (outils). Zones issues de l'analyse pixel (bases des panaches : gauche native (65,306), droite (288,289)).
- Produces: frames finales dans `assets/bg-anim/`, nommage `<clé>-<i>.png` — la clé (`bg1-fumee-g`, `bg1-fumee-d`) est celle de la table `BG_ANIM` (Task 4) et de la map d'assets.

- [ ] **Step 1: Crops d'origine**

```bash
node C:/Setup/Projects/Game/Slop/.claude/tools/bganim-crop.mjs assets/bg-far-1.png <scratch>/bg1-g/orig.png 0 190 96 128
node C:/Setup/Projects/Game/Slop/.claude/tools/bganim-crop.mjs assets/bg-far-1.png <scratch>/bg1-d/orig.png 260 240 60 100
```

Vérifier (Read sur chaque crop) : le panache ENTIER + sa bouche de cheminée sont dans le cadre, avec ≥8 px de marge autour de la fumée.

- [ ] **Step 2: Balance avant, puis animate (1 appel par panache)**

```bash
node scripts/pixellab.mjs balance
node scripts/pixellab.mjs animate --input <scratch>/bg1-g/orig.png \
  --action "green toxic smoke rising from the chimney and drifting slowly, seamless ambient loop, buildings and sky perfectly static" \
  --frames 8 --seed 42 --out-dir <scratch>/bg1-g/raw --name f
node scripts/pixellab.mjs animate --input <scratch>/bg1-d/orig.png \
  --action "green toxic smoke rising from the chimney and drifting slowly, seamless ambient loop, buildings and sky perfectly static" \
  --frames 8 --seed 42 --out-dir <scratch>/bg1-d/raw --name f
node scripts/pixellab.mjs balance
```

Expected: 8 PNG par panache, `PNG ✓` partout. **Noter le coût réel (balance avant−après) dans le ledger** — si un appel dépasse ~40 crédits, prévenir Jael avant de continuer la production de masse.

- [ ] **Step 3: Masquage local**

```bash
node C:/Setup/Projects/Game/Slop/.claude/tools/bganim-mask.mjs <scratch>/bg1-g/orig.png <scratch>/bg1-g/raw <scratch>/bg1-g/masked '{"mode":"channel","channel":"g","min":145,"d0":80,"d1":25,"dilate":2,"reach":12}'
node C:/Setup/Projects/Game/Slop/.claude/tools/bganim-mask.mjs <scratch>/bg1-d/orig.png <scratch>/bg1-d/raw <scratch>/bg1-d/masked '{"mode":"channel","channel":"g","min":145,"d0":80,"d1":25,"dilate":2,"reach":12}'
```

Expected: chaque frame garde quelques centaines/milliers de px animés (pas 0, pas la totalité). Si ~0 px gardés : l'animate a désaturé les verts → élargir le prédicat (`min` 120) OU régénérer avec `--seed` différent.

- [ ] **Step 4: Bouclage — juger et choisir les frames**

```bash
node C:/Setup/Projects/Game/Slop/.claude/tools/bganim-gif.mjs <scratch>/bg1-g/masked <scratch>/bg1-g/loop.gif 120
node C:/Setup/Projects/Game/Slop/.claude/tools/bganim-gif.mjs <scratch>/bg1-g/masked <scratch>/bg1-g/loop-pp.gif 120 --pingpong
```

(idem pour bg1-d). Regarder les 2 GIFs (Read) et choisir : boucle directe si frame 7→0 se raccorde, sinon ping-pong (les frames finales sont alors 0..7,6..1 = 14 fichiers — renuméroter en conséquence), sinon sous-ensemble qui se raccorde (minimum 4 frames). Critère spec : **aucune coupure visible à l'œil sur 10 s** ; la fumée doit ONDULER (pas juste scintiller). Itérer (seed, action, prédicat) jusqu'à satisfaction — c'est le cœur du boulot accepté par Jael.

- [ ] **Step 5: Installer les frames retenues et committer**

Copier les frames retenues (renumérotées 0..N-1 dans l'ordre de lecture) :

```bash
mkdir assets/bg-anim
# exemple boucle directe 8 frames :
cp <scratch>/bg1-g/masked/f-0.png assets/bg-anim/bg1-fumee-g-0.png   # … jusqu'à -7
cp <scratch>/bg1-d/masked/f-0.png assets/bg-anim/bg1-fumee-d-0.png   # … idem
git add assets/bg-anim
git commit -m "feat(assets): frames de fumée verte animée du décor industriel (2 panaches, boucle validée sur GIF)"
```

Garder dans le ledger : N retenu par panache + mode (direct/ping-pong) — Task 4 en a besoin pour la table.

---

### Task 4: Runtime `render/bganim.js` + chargement + branchement renderer (pilote décor 1)

**Files:**
- Create: `src/render/bganim.js`
- Modify: `src/render/renderer.js` (import + appel étape 1a)
- Modify: `src/main.js` (chargement des frames par glob)
- Test: `tests/render/bganim.test.js`

**Interfaces:**
- Consumes: `world.bgSet`, `world.menuTick` (s'incrémente dans TOUS les états), `world.layers[0].offset`, assets images (`assets['bg-far-N']` pour l'échelle, `assets['<clé>-<i>']` pour les frames), Task 3 (frames commitées).
- Produces: `renderBgAnim(ctx, world, assets, table = BG_ANIM)` ; `frameIndex(tick, elem) -> int` ; table exportée `BG_ANIM[set] = [{ key, x, y, n, period, phase }]` (x/y en pixels NATIFS de l'asset du set).

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `tests/render/bganim.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { renderBgAnim, frameIndex, BG_ANIM } from '../../src/render/bganim.js';
import { CONFIG } from '../../src/config.js';

function fakeCtx() {
  const calls = [];
  return { calls, drawImage: (...a) => calls.push(a) };
}

// Asset factice : l'échelle runtime se calcule depuis bg-far (320x576 -> x1.125)
const fakeAssets = {
  'bg-far-1': { width: 320, height: 576 },
  'elem-0': { width: 96, height: 128 },
  'elem-1': { width: 96, height: 128 },
};
const elem = { key: 'elem', x: 0, y: 190, n: 2, period: 8, phase: 0 };
const table = [[], [elem], [], [], []];

function worldWith(tick, offset = 0) {
  return { bgSet: 1, menuTick: tick, layers: [{ offset }] };
}

describe('frameIndex', () => {
  it('avance d une frame toutes les period ticks, modulo n', () => {
    expect(frameIndex(0, elem)).toBe(0);
    expect(frameIndex(7, elem)).toBe(0);
    expect(frameIndex(8, elem)).toBe(1);
    expect(frameIndex(16, elem)).toBe(0);
  });

  it('phase décale le départ', () => {
    expect(frameIndex(0, { ...elem, phase: 1 })).toBe(1);
  });
});

describe('renderBgAnim', () => {
  it('ne dessine rien pour un décor sans éléments', () => {
    const ctx = fakeCtx();
    renderBgAnim(ctx, { ...worldWith(0), bgSet: 0 }, fakeAssets, table);
    expect(ctx.calls.length).toBe(0);
  });

  it('dessine la frame courante à la position image mise à l échelle', () => {
    const ctx = fakeCtx();
    renderBgAnim(ctx, worldWith(8), fakeAssets, table);
    expect(ctx.calls.length).toBe(1);
    const [img, dx, dy, dw, dh] = ctx.calls[0];
    expect(img).toBe(fakeAssets['elem-1']); // tick 8 -> frame 1
    expect(dx).toBeCloseTo(0, 5);           // x natif 0, offset 0
    expect(dy).toBeCloseTo(190 * (643 / 576) - 3, 3);
    expect(dw).toBeCloseTo(96 * (360 / 320), 3);
    expect(dh).toBeCloseTo(128 * (643 / 576), 3);
  });

  it('suit le défilement du fond (offset) et se replie sur la tuile visible', () => {
    const ctx = fakeCtx();
    renderBgAnim(ctx, worldWith(0, 50), fakeAssets, table);
    expect(ctx.calls[0][1]).toBeCloseTo(((0 - 50) % 360 + 360) % 360, 3); // 310
    // patch à cheval sur le joint droit -> deuxième copie décalée d une largeur d écran
    expect(ctx.calls.length).toBe(2);
    expect(ctx.calls[1][1]).toBeCloseTo(310 - 360, 3);
  });

  it('la table réelle est cohérente (clés uniques, n>=4 pair ou table vide, period>0)', () => {
    const keys = new Set();
    for (const list of BG_ANIM) {
      for (const e of list) {
        expect(keys.has(e.key)).toBe(false);
        keys.add(e.key);
        expect(e.n).toBeGreaterThanOrEqual(4);
        expect(e.period).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Vérifier qu'ils échouent**

Run: `npx vitest run tests/render/bganim.test.js`
Expected: FAIL — `Cannot find module '../../src/render/bganim.js'`

- [ ] **Step 3: Implémenter le module**

Créer `src/render/bganim.js` :

```js
import { CONFIG } from '../config.js';

// Éléments de fond animés par décor — coordonnées en pixels NATIFS de
// l'asset bg-far du set (les tailles varient : bg-far-0 fait 304×538).
// n frames jouées en boucle, une toutes les `period` ticks (60/s),
// `phase` (en frames) désynchronise les éléments entre eux.
// Renseigné décor par décor au fil des batchs de production.
export const BG_ANIM = [
  [], // 0 urbain — batch décor 0
  [
    { key: 'bg1-fumee-g', x: 0, y: 190, n: 8, period: 8, phase: 0 },
    { key: 'bg1-fumee-d', x: 260, y: 240, n: 8, period: 8, phase: 3 },
  ],
  [], // 2 coucher de soleil
  [], // 3 tempête (éclairs = sprites d'événement, pas de boucle ici)
  [], // 4 orbite
];

export function frameIndex(tick, elem) {
  return Math.floor(tick / elem.period + elem.phase) % elem.n;
}

// Dessine les patchs animés par-dessus le fond lointain (étape 1a du
// renderer) : même transformation que le fond (échelle asset -> 360×643,
// décalé du parallaxe, replié sur la tuile visible).
export function renderBgAnim(ctx, world, assets, table = BG_ANIM) {
  const elems = table[world.bgSet];
  if (!elems.length) return;
  const bg = assets['bg-far-' + world.bgSet];
  const kx = CONFIG.WIDTH / bg.width;
  const ky = (CONFIG.HEIGHT + 3) / bg.height;
  const farOff = world.layers[0].offset % CONFIG.WIDTH;
  for (const elem of elems) {
    const frame = assets[elem.key + '-' + frameIndex(world.menuTick, elem)];
    const dw = frame.width * kx;
    const dh = frame.height * ky;
    const dy = elem.y * ky - 3;
    const sx = (((elem.x * kx - farOff) % CONFIG.WIDTH) + CONFIG.WIDTH) % CONFIG.WIDTH;
    ctx.drawImage(frame, sx, dy, dw, dh);
    if (sx + dw > CONFIG.WIDTH) ctx.drawImage(frame, sx - CONFIG.WIDTH, dy, dw, dh);
  }
}
```

Ajuster `n`/`phase` de la table selon les frames réellement retenues en Task 3 (ledger). Si les tests de position échouent sur un ky : la constante 643 vient du renderer (`CONFIG.HEIGHT + 3`, fond dessiné à y=-3) — ne pas la changer, corriger le test seulement s'il ne dit pas ça.

- [ ] **Step 4: Brancher renderer + chargement**

Dans `src/render/renderer.js` — import puis appel entre l'étape 1 (far) et 1b (événements) :

```js
import { renderBgAnim } from './bganim.js';
```

```js
  // 1a. Éléments de fond animés (fumées, enseigne, soleil, atmosphère) —
  // par-dessus le fond lointain, sous les événements et le premier plan.
  renderBgAnim(ctx, world, assets);
```

Dans `src/main.js`, juste avant `const imagesPromise = loadImages({` :

```js
// Frames des éléments de fond animés : assets/bg-anim/<clé>-<i>.png,
// la clé d'asset est le nom de fichier sans extension.
const bgAnimUrls = import.meta.glob('../assets/bg-anim/*.png', { eager: true, query: '?url', import: 'default' });
const bgAnimMap = Object.fromEntries(
  Object.entries(bgAnimUrls).map(([p, url]) => [p.split('/').pop().replace('.png', ''), url]),
);
```

et étaler dans la map de `loadImages` (première ligne du littéral) :

```js
const imagesPromise = loadImages({
  ...bgAnimMap,
  robot: robotUrl,
```

- [ ] **Step 5: Vérifier que tout passe**

Run: `npx vitest run`
Expected: PASS — 329 existants + les nouveaux, 0 échec

- [ ] **Step 6: Vérification visuelle en jeu (agent) puis commit**

Lancer le serveur, jouer niveau 3 en Playwright (réutiliser le pilotage boucle fermée de `Slop/.claude/smokes/bgevents-smoke.mjs`), 4 captures espacées de 500 ms : les panaches ONDULENT (les captures diffèrent dans la zone des panaches), suivent le défilement, halo torchère toujours visible dessous, zéro erreur console.

```bash
git add src/render/bganim.js src/render/renderer.js src/main.js tests/render/bganim.test.js
git commit -m "feat(render): couche d'éléments de fond animés (bganim) — pilote fumées du décor industriel"
```

**→ GATE JAEL PILOTE (bloquant)** : fumée verte en jeu au niveau 3 (Ctrl+F5 sur :5199 lancé depuis le worktree). Valide le pipeline avant la production des 4 autres décors.

---

### Task 5: Décor 0 (urbain nuit) — enseigne néon + vapeur de toit

**Files:**
- Create: `assets/bg-anim/bg0-enseigne-{0..N-1}.png`, `assets/bg-anim/bg0-vapeur-{0..N-1}.png`
- Modify: `src/render/bganim.js` (table `BG_ANIM[0]`)

**Interfaces:**
- Consumes: pipeline Tasks 1-3 (mêmes commandes), `crop-zoom.mjs`/`sample-px.mjs` pour l'inventaire.
- Produces: `BG_ANIM[0]` rempli — le runtime de Task 4 dessine sans autre changement de code.

- [ ] **Step 1: Inventaire visuel zoomé.** ATTENTION : bg-far-0 fait **304×538**. Lire l'asset (Read), zoomer les zones candidates (`crop-zoom.mjs`), choisir : 1 enseigne néon bien visible + 1 fumée/vapeur de toit (si pas de vapeur exploitable, 2e enseigne d'une autre couleur). Échantillonner les couleurs de chaque élément (`sample-px.mjs`) et construire le prédicat `mode:"channel"` correspondant (enseigne rose → `"channel":"r"`, valeurs `min`/`d0`/`d1` déduites des échantillons). Noter crops + prédicats dans le ledger.
- [ ] **Step 2: Production pipeline** (crop → animate → masque → GIF → choix). Actions suggérées : enseigne « neon sign flickering and buzzing, letters blinking on and off, everything else static » ; vapeur « thin steam rising from rooftop vent, slow ambient loop, buildings static ». Budget pixels ≤524288 par appel.
- [ ] **Step 3: Installer les frames, remplir `BG_ANIM[0]`** (x/y natifs du crop, n/period/phase — period 6-10 selon le rendu, phases décalées). `npx vitest run` (le test de cohérence de table couvre la nouvelle entrée). Vérif visuelle en jeu niveau 1 (4 captures espacées : l'enseigne clignote, la vapeur monte, **le patch suit le défilement** — bg-far-0 scrolle à 0.25 comme le 1).
- [ ] **Step 4: Commit**

```bash
git add assets/bg-anim src/render/bganim.js
git commit -m "feat(assets): décor urbain animé — enseigne néon + vapeur de toit"
```

---

### Task 6: Décor 2 (coucher de soleil) — shimmer du soleil

**Files:**
- Create: `assets/bg-anim/bg2-soleil-{0..N-1}.png`
- Modify: `src/render/bganim.js` (table `BG_ANIM[2]`)

**Interfaces:** identiques à Task 5 (pipeline standard, fond STATIQUE — offset toujours 0, le test d'ancrage ne change pas).

- [ ] **Step 1: Inventaire.** Localiser le soleil (Read + `crop-zoom.mjs` sur bg-far-2, 320×576 ; il est au centre-bas de la skyline). Crop ≤256×256 englobant disque + halo. Échantillonner les oranges/jaunes pour le prédicat (channel r).
- [ ] **Step 2: Production.** Action : « sun glow shimmering softly, heat haze rays pulsing, skyline and sky perfectly static ». Masque channel r (rMin ~200). Le disque doit rester ROND et fixe — seuls halo/rayons vivent ; si l'animate déforme le disque, réduire `reach` à 6 pour ne garder que la périphérie animée.
- [ ] **Step 3: Installer frames + `BG_ANIM[2]`, `npx vitest run`, vérif en jeu niveau 5** (4 captures : le halo respire, le disque ne bouge pas, les oiseaux de bg-events passent devant sans clash).
- [ ] **Step 4: Commit**

```bash
git add assets/bg-anim src/render/bganim.js
git commit -m "feat(assets): décor coucher de soleil animé — shimmer du soleil"
```

---

### Task 7: Décor 4 (orbite) — arc d'atmosphère qui pulse

**Files:**
- Create: `assets/bg-anim/bg4-atmo-{0..N-1}.png`
- Modify: `src/render/bganim.js` (table `BG_ANIM[4]`)

**Interfaces:** identiques à Task 5 (fond statique).

- [ ] **Step 1: Inventaire.** Localiser l'arc d'atmosphère diagonal (Read + `crop-zoom.mjs` sur bg-far-4). L'arc est GRAND : si le crop dépasse 256 de côté, le découper en 2 segments (2 éléments `bg4-atmo-a`/`bg4-atmo-b`, phases décalées) OU réduire frames à 6 pour tenir le budget pixels. Échantillonner les bleus/cyans du prédicat.
- [ ] **Step 2: Production.** Action : « atmospheric glow arc pulsing gently like aurora, stars and planet perfectly static ». Si le résultat seul semble faible au GIF, ajouter le 2e élément optionnel de la spec (feux clignotants de la station — petit crop, prédicat sur la couleur des feux).
- [ ] **Step 3: Installer frames + `BG_ANIM[4]`, `npx vitest run`, vérif en jeu niveau 10** (4 captures : l'arc respire, l'étoile filante de bg-events reste lisible par-dessus).
- [ ] **Step 4: Commit**

```bash
git add assets/bg-anim src/render/bganim.js
git commit -m "feat(assets): décor orbite animé — arc d'atmosphère pulsant"
```

---

### Task 8: Décor 3 (tempête) — éclairs en sprites synchro foudre

**Files:**
- Modify: `assets/bg-far-3.png` (remplacé par la version SANS éclairs figés)
- Create: `assets/bg-anim/bg3-eclair-{0,1,2}.png` (sprites transparents ~96×288)
- Modify: `src/game/bgevents.js` (`EVENTS[3]` gagne `bolt`, `boltX`)
- Modify: `src/render/bgevents.js` (`drawFoudre` dessine le sprite ; `renderBgEvents` gagne `assets`)
- Modify: `src/render/renderer.js` (passe `assets` à `renderBgEvents`)
- Test: `tests/game/bgevents.test.js`, `tests/render/bgevents.test.js`

**Interfaces:**
- Consumes: événement foudre existant (`kind:'foudre'`, `dur:0.5`, `foudreAlpha`), pipeline PixelLab.
- Produces: `renderBgEvents(ctx, world, assets)` (3e param NOUVEAU, rétro-compatible : sans assets ou sans sprite, seul le voile est dessiné) ; événement foudre enrichi `{ bolt: 0|1|2, boltX: 30..230 }`.

- [ ] **Step 1: Tests qui échouent (logique).** Dans `tests/game/bgevents.test.js`, compléter le test de déclenchement foudre :

```js
  it('foudre : tire la forme et la position de l éclair au déclenchement', () => {
    const ev = createBgEvents();
    resetBgEvents(ev, 3);
    updateBgEvents(ev, 2, 3, zero);
    expect(ev.event).toMatchObject({ kind: 'foudre', bolt: 0, boltX: 30 });
    const ev2 = createBgEvents();
    resetBgEvents(ev2, 3);
    updateBgEvents(ev2, 2, 3, half);
    expect(ev2.event.bolt).toBe(1);       // floor(0.5*3)
    expect(ev2.event.boltX).toBe(130);    // 30 + 0.5*200
  });
```

Dans `tests/render/bgevents.test.js`, ajouter (et adapter `worldWith` si besoin — il a déjà `layers`) :

```js
  it('foudre : dessine le sprite d éclair tiré, puis le voile par-dessus', () => {
    const ctx = fakeCtx();
    ctx.drawImage = (...a) => ctx.calls.push(['img', ...a]);
    const assets = { 'bg3-eclair-1': { width: 96, height: 288 } };
    renderBgEvents(ctx, worldWith({ kind: 'foudre', t: 0, dur: 0.5, bolt: 1, boltX: 130 }), assets);
    expect(ctx.calls.length).toBe(2);
    expect(ctx.calls[0][0]).toBe('img');
    expect(ctx.calls[0][2]).toBe(130); // dx = boltX
    expect(ctx.calls[1]).toEqual([0, 0, CONFIG.WIDTH, CONFIG.HEIGHT]); // voile après
  });

  it('foudre sans assets : seul le voile (rétro-compatible)', () => {
    const ctx = fakeCtx();
    renderBgEvents(ctx, worldWith({ kind: 'foudre', t: 0, dur: 0.5, bolt: 0, boltX: 30 }));
    expect(ctx.calls.length).toBe(1);
  });
```

Run: `npx vitest run tests/game/bgevents.test.js tests/render/bgevents.test.js` — Expected: FAIL (bolt/boltX absents, drawFoudre ignore assets).

- [ ] **Step 2: Implémenter.** `src/game/bgevents.js`, entrée foudre de `EVENTS` :

```js
  (rand) => ({ kind: 'foudre', dur: 0.5, bolt: Math.floor(rand() * 3), boltX: 30 + rand() * 200 }),
```

`src/render/bgevents.js` :

```js
function drawFoudre(ctx, e, assets) {
  // L'éclair (sprite tiré au déclenchement) déchire le ciel, le voile
  // plafonné passe par-dessus — les portes restent lisibles.
  const a = foudreAlpha(e);
  const bolt = assets && assets['bg3-eclair-' + e.bolt];
  if (bolt) {
    ctx.globalAlpha = Math.min(1, a / 0.35);
    ctx.drawImage(bolt, Math.round(e.boltX), 0);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = `rgba(210,225,255,${a.toFixed(3)})`;
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
}

export function renderBgEvents(ctx, world, assets) {
  const e = world.bgEvents.event;
  if (!e) return;
  if (e.kind === 'foudre') drawFoudre(ctx, e, assets);
  …
}
```

`src/render/renderer.js` : `renderBgEvents(ctx, world, assets);`

Run: `npx vitest run` — Expected: PASS (suite complète).

- [ ] **Step 3: Produire les sprites d'éclair.** `pixellab.mjs generate` ×1 : `--description "single vertical lightning bolt strike, branching, white core with violet glow, pixel art, transparent background, no clouds, no scenery" --size 96x288 --no-bg true --out-dir <scratch>/bolts --name eclair` (96×288 → 4 candidats). Choisir 3 formes distinctes, vérifier fond transparent (coins alpha 0 via `sample-px.mjs`), copier vers `assets/bg-anim/bg3-eclair-{0,1,2}.png`.

- [ ] **Step 4: Effacer les éclairs figés du fond.** Échantillonner d'abord les pixels d'éclair de `assets/bg-far-3.png` (`sample-px.mjs` sur les zones blanches-violettes) et noter le prédicat. Puis :

```bash
node scripts/pixellab.mjs edit --input assets/bg-far-3.png --no-bg false --out-dir <scratch>/bg3 --name clean \
  --description "remove all lightning bolts from the sky, keep clouds buildings rain and every other pixel exactly identical, dark purple storm sky"
```

L'edit est génératif : **réparation locale obligatoire** — composite final = original PARTOUT sauf dans le masque des pixels d'éclair (détectés sur l'ORIGINAL), où l'on prend la version éditée. C'est exactement `bganim-mask.mjs` avec l'édité comme unique « frame » :

```bash
node C:/Setup/Projects/Game/Slop/.claude/tools/bganim-mask.mjs assets/bg-far-3.png <scratch>/bg3 <scratch>/bg3-final '{"mode":"bright","rMin":200,"gMin":180,"bMin":230,"dilate":3,"reach":0}'
```

(valeurs `rMin/gMin/bMin` à caler sur l'échantillonnage du début de l'étape). Vérifier au Read : plus d'éclairs figés, tout le reste identique au pixel près. Remplacer `assets/bg-far-3.png` par le composite.

- [ ] **Step 5: Vérif visuelle en jeu niveau 7** (pilotage boucle fermée, captures pendant la frappe à ~2 s) : ciel SANS éclair figé entre les frappes ; pendant la frappe = flash + sprite d'éclair visible, portes lisibles. `npx vitest run` une dernière fois.

- [ ] **Step 6: Commit**

```bash
git add assets/bg-far-3.png assets/bg-anim src/game/bgevents.js src/render/bgevents.js src/render/renderer.js tests/
git commit -m "feat(bgevents): la foudre frappe en sprites — éclairs retirés du fond, dessinés pendant l'événement"
```

---

### Task 9: Smoke durable + polish + gate final

**Files:**
- Create: `C:/Setup/Projects/Game/Slop/.claude/smokes/bganim-smoke.mjs` (hors repo)
- Modify (si polish): constantes `period`/`phase` de `src/render/bganim.js`

**Interfaces:**
- Consumes: serveur :5199 (worktree), codes de niveau via `jetpackbot.bestLevel` (1/3/5/7/10), pilotage boucle fermée de `bgevents-smoke.mjs`.
- Produces: preuve automatisée que chaque décor anime (5 scénarios), captures pour le gate final Jael.

- [ ] **Step 1: Écrire le smoke.** Copier la structure de `bgevents-smoke.mjs` (Math.random=0, boucle fermée, arg [scenario]) avec l'assertion suivante : intercepter `drawImage` et enregistrer, par élément, l'ENSEMBLE des sources dessinées dont l'URL contient `bg-anim/<clé>` (les frames Vite gardent leur nom de fichier dans `img.src`). Après 3 s de jeu :
  - décors 0/1/2/4 : chaque clé du décor a dessiné **≥ 2 frames distinctes** (l'animation tourne) — et pour 0/1, la position dx du même élément DÉCROÎT entre deux échantillons (suit le défilement) ;
  - décor 3 : `bg3-eclair-*` dessiné pendant la fenêtre de frappe (2,0-2,5 s) et PAS en dehors ;
  - zéro erreur console/page sur les 5 scénarios.
- [ ] **Step 2: Lancer les 5 scénarios, corriger ce qui choque.** Sortie attendue : `ZERO console/page errors` + assertions OK. Juger aussi les captures : cohérence des vitesses (une fumée trop frénétique ou une enseigne trop lente = ajuster `period`/`phase`, relancer vitest + smoke).
- [ ] **Step 3: Commit final (si polish)**

```bash
git add src/render/bganim.js
git commit -m "polish(bganim): calibrage des périodes et phases d'animation"
```

- [ ] **Step 4: GATE FINAL JAEL (bloquant)** : les 5 décors en jeu, critère d'égalité de la spec — chaque décor vit au même niveau de qualité, boucles sans coupure visible sur 10 s. Puis merge via superpowers:finishing-a-development-branch (`--no-ff`, push seulement si demandé).
