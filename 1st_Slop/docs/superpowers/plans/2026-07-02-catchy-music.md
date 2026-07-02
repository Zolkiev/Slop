# Catchy Music Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre les 3 boucles d'ambiance catchy (lead fredonnable, batterie chiptune, structure A/B 16 mesures) en n'étendant que le générateur `scripts/music.mjs` — zéro fichier `src/` touché.

**Architecture:** `scripts/music.mjs` gagne 4 primitives (onde pulse25, phase accumulée avec vibrato/slide, vélocité par note, PRNG seedé mulberry32), puis les 3 définitions de pistes sont réécrites une par une. Sorties inchangées : `assets/music-{0,1,2}.wav`, 16-bit PCM mono 22050 Hz, boucles bar-aligned.

**Tech Stack:** Node.js pur (script zéro dépendance), Vitest (suite existante, inchangée), Vite build, Playwright pour la vérif finale.

**Spec:** `docs/superpowers/specs/2026-07-02-catchy-music-design.md`

## Global Constraints

- **Aucun fichier de `src/` n'est modifié** — seule exception : `scripts/music.mjs` et les 3 wav régénérés.
- Les 219 tests Vitest existants doivent rester verts à chaque tâche (`npm test` depuis `1st_Slop/`).
- Boucles alignées sur la mesure : longueur totale = `bars × 16 × stepLen` exactement, pas de fade-out.
- Générateur **reproductible** : deux runs successifs de `node scripts/music.mjs` produisent des fichiers byte-identiques (PRNG seedé — plus aucun appel à `Math.random`).
- Tempos cibles (spec) : music-0 = 96 BPM, music-1 = 118 BPM, music-2 = 84 BPM ; 16 mesures chacune.
- Tous les chemins ci-dessous sont relatifs à `1st_Slop/`.

---

### Task 1: Extensions du renderer (pulse25, vibrato/slide, vélocité, PRNG seedé)

**Files:**
- Modify: `scripts/music.mjs` (lignes ~39-78 : helpers d'ondes + `render`)

**Interfaces:**
- Consumes: rien (première tâche).
- Produces: le contrat de définition de piste utilisé par les tâches 2-4 :
  - `WAVES` contient `square`, `triangle`, `pulse25`.
  - Une piste peut avoir `seed: number` (défaut 1) — seed du bruit.
  - Une voix peut avoir `vibrato: { rate: Hz, depth: demi-tons }` et/ou
    `slide: demi-tons` (glissement linéaire sur la durée de la note).
  - `note(bar, step)` retourne `null`, un midi `number`, **ou** `{ m: midi, v: vélocité }` (v défaut 1).
  - Une lane de bruit peut avoir `sustain: number` (durée en pas, défaut 0.5).

- [ ] **Step 1: Remplacer les helpers d'ondes et le renderer**

Dans `scripts/music.mjs`, remplacer le bloc allant de `const midiFreq = ...` jusqu'à la fin de la fonction `render` (inclus) par :

```js
const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const square = (ph) => ((ph % 1) < 0.5 ? 1 : -1);
const pulse25 = (ph) => ((ph % 1) < 0.25 ? 1 : -1);
const triangle = (ph) => { const p = ph % 1; return p < 0.5 ? 4 * p - 1 : 3 - 4 * p; };
const WAVES = { square, triangle, pulse25 };

// PRNG déterministe (mulberry32) — assets reproductibles, seed par piste.
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

// Pattern renderer. A track is:
// { bpm, bars, seed?, voices: [{ wave, vol, decay, sustain?, vibrato?, slide?,
//   note(bar, step) -> midi | { m, v } | null }],
//   noise: [{ vol, decay, sustain?, hit(bar, step) -> boolean }] }
// 16 steps (16th notes) per bar. La phase est accumulée échantillon par
// échantillon pour permettre vibrato (sinus) et slide (glissement linéaire).
function render(track) {
  const stepLen = Math.round((60 / track.bpm / 4) * RATE);
  const total = stepLen * 16 * track.bars;
  const out = new Float32Array(total);
  const rand = mulberry32(track.seed ?? 1);
  for (let bar = 0; bar < track.bars; bar += 1) {
    for (let step = 0; step < 16; step += 1) {
      const start = (bar * 16 + step) * stepLen;
      for (const v of track.voices) {
        const hit = v.note(bar, step);
        if (hit == null) continue;
        const midi = typeof hit === 'number' ? hit : hit.m;
        const vel = typeof hit === 'number' ? 1 : (hit.v ?? 1);
        const wave = WAVES[v.wave];
        const len = Math.min(Math.round(stepLen * (v.sustain ?? 1)), total - start);
        let phase = 0;
        for (let i = 0; i < len; i += 1) {
          const t = i / RATE;
          let m = midi;
          if (v.slide) m += v.slide * (i / len);
          if (v.vibrato) m += v.vibrato.depth * Math.sin(2 * Math.PI * v.vibrato.rate * t);
          phase += midiFreq(m) / RATE;
          out[start + i] += wave(phase) * Math.exp(-t * v.decay) * v.vol * vel;
        }
      }
      for (const nz of track.noise ?? []) {
        if (!nz.hit(bar, step)) continue;
        const len = Math.min(Math.round(stepLen * (nz.sustain ?? 0.5)), total - start);
        for (let i = 0; i < len; i += 1) {
          const t = i / RATE;
          out[start + i] += (rand() * 2 - 1) * Math.exp(-t * nz.decay) * nz.vol;
        }
      }
    }
  }
  for (let i = 0; i < total; i += 1) out[i] = Math.tanh(out[i]); // soft clip
  return out;
}
```

Ne PAS toucher aux trois définitions de pistes (`music0`/`music1`/`music2`) dans cette tâche — elles restent valides (note → number, pas de vibrato/slide, `seed` absent → défaut 1).

- [ ] **Step 2: Régénérer et vérifier que les anciennes pistes rendent toujours**

Run: `node scripts/music.mjs`
Expected (durées inchangées — seul le bruit change de réalisation) :
```
wrote music-0.wav  (21.3s, 90 BPM, 8 bars)
wrote music-1.wav  (21.4s, 112 BPM, 10 bars)
wrote music-2.wav  (25.3s, 76 BPM, 8 bars)
```

- [ ] **Step 3: Vérifier la reproductibilité**

Run (PowerShell) : `node scripts/music.mjs; $h1 = (Get-FileHash assets/music-0.wav).Hash; node scripts/music.mjs; $h2 = (Get-FileHash assets/music-0.wav).Hash; $h1 -eq $h2`
Expected: `True`

- [ ] **Step 4: Suite inchangée**

Run: `npm test`
Expected: 219 passed (aucun test ne lit les wav ni le script).

- [ ] **Step 5: Commit**

```bash
git add scripts/music.mjs assets/music-0.wav assets/music-1.wav assets/music-2.wav
git commit -m "feat(music): renderer gains pulse25, vibrato/slide, velocity, seeded noise"
```

---

### Task 2: Réécriture de music-0 (nuit urbaine — synthwave groove, 96 BPM)

**Files:**
- Modify: `scripts/music.mjs` (bloc `PROG0`/`ARP0`/`music0`)

**Interfaces:**
- Consumes: contrat de la Task 1 (`pulse25`, `vibrato`, `slide`, `{ m, v }`, `seed`, `noise.sustain`).
- Produces: `assets/music-0.wav` régénéré (~40.0 s, 96 BPM, 16 mesures).

- [ ] **Step 1: Remplacer le bloc music-0**

Remplacer le bloc commençant à `// --- music-0 : ...` (constantes `PROG0`, `ARP0` et objet `music0`) par :

```js
// --- music-0 : nuit urbaine — synthwave groove, La mineur, 96 BPM, 16 mesures ---
// A (mesures 0-7) : hook lead pulse25 en question/réponse sur Am / F / C / G,
// basse en croches, batterie discrète (kick 1/3, snare 2/4, hats).
// B (mesures 8-15) : hook à l'octave plus doux, arpège en doubles-croches.
const PROG0 = [
  { root: 57, iv: [0, 3, 7, 12] },  // Am
  { root: 53, iv: [0, 4, 7, 12] },  // F
  { root: 48, iv: [0, 4, 7, 12] },  // C
  { root: 55, iv: [0, 4, 7, 12] },  // G
];
const ARP0 = [0, 1, 2, 3, 2, 1, 0, 2];
// Hook de 4 mesures (une par accord), clé = pas 0..15. Question (Am, F) / réponse (C, G).
const LEAD0 = [
  { 0: { m: 69, v: 1.0 }, 3: { m: 72, v: 0.8 }, 6: { m: 76, v: 1.0 }, 10: { m: 74, v: 0.8 }, 12: { m: 72, v: 0.7 } },
  { 0: { m: 72, v: 1.0 }, 4: { m: 69, v: 0.8 }, 8: { m: 65, v: 0.9 }, 12: { m: 67, v: 0.7 } },
  { 0: { m: 67, v: 1.0 }, 3: { m: 72, v: 0.8 }, 6: { m: 76, v: 0.9 }, 10: { m: 74, v: 0.7 }, 12: { m: 72, v: 0.8 } },
  { 0: { m: 74, v: 1.0 }, 4: { m: 71, v: 0.8 }, 8: { m: 67, v: 0.9 }, 12: { m: 71, v: 0.7 } },
];
const music0 = {
  bpm: 96,
  bars: 16,
  seed: 96,
  voices: [
    { wave: 'pulse25', vol: 0.14, decay: 5, sustain: 3, vibrato: { rate: 5, depth: 0.3 },
      note: (bar, step) => {
        const hit = LEAD0[bar % 4][step];
        if (!hit) return null;
        return bar < 8 ? hit : { m: hit.m + 12, v: hit.v * 0.85 };
      } },
    { wave: 'square', vol: 0.07, decay: 9,
      note: (bar, step) => {
        if (bar < 8 && step % 2 === 1) return null; // croches en A, 16es en B
        const c = PROG0[bar % 4];
        return { m: c.root + c.iv[ARP0[step % 8]], v: 0.9 };
      } },
    { wave: 'triangle', vol: 0.2, decay: 4, sustain: 1.6,
      note: (bar, step) => (step % 2 === 0
        ? { m: PROG0[bar % 4].root - 12, v: step % 8 === 0 ? 1 : 0.75 }
        : null) },
    { wave: 'triangle', vol: 0.34, decay: 16, slide: -14, // kick
      note: (bar, step) => (step === 0 || step === 8 ? 45 : null) },
  ],
  noise: [
    { vol: 0.09, decay: 22, sustain: 1.5, hit: (bar, step) => step === 4 || step === 12 }, // snare
    { vol: 0.03, decay: 55, hit: (bar, step) => step % 4 === 2 },                          // hats
  ],
};
```

- [ ] **Step 2: Régénérer et vérifier**

Run: `node scripts/music.mjs`
Expected: `wrote music-0.wav  (40.0s, 96 BPM, 16 bars)` ; les lignes music-1/music-2 inchangées.

Run: `git status --porcelain assets/`
Expected: seul `assets/music-0.wav` modifié (le seed rend music-1/2 byte-identiques).

- [ ] **Step 3: Écoute de contrôle rapide**

Ouvrir `assets/music-0.wav` avec le lecteur système (`start assets\music-0.wav` sous PowerShell) et vérifier : hook audible au-dessus de l'arpège, kick/snare présents mais discrets, pas de saturation (si ça sature, baisser `vol` du kick à 0.28 et re-générer).

- [ ] **Step 4: Suite + commit**

Run: `npm test` — Expected: 219 passed.

```bash
git add scripts/music.mjs assets/music-0.wav
git commit -m "feat(music): music-0 rework — lead hook, drums, A/B 16 bars at 96 BPM"
```

---

### Task 3: Réécriture de music-1 (industriel — le plus énergique, 118 BPM)

**Files:**
- Modify: `scripts/music.mjs` (bloc `ROOTS1`/`music1`)

**Interfaces:**
- Consumes: contrat de la Task 1.
- Produces: `assets/music-1.wav` régénéré (~32.5 s, 118 BPM, 16 mesures).

- [ ] **Step 1: Remplacer le bloc music-1**

Remplacer le bloc commençant à `// --- music-1 : ...` (constante `ROOTS1` et objet `music1`) par :

```js
// --- music-1 : industriel — le plus énergique, Mi phrygien, 118 BPM, 16 mesures ---
// A : riff lead syncopé sur basse martelée, kick 4-on-the-floor, backbeat marqué.
// B : riff à l'octave, stabs doublés en syncope.
const ROOTS1 = [40, 40, 41, 38, 40, 40, 43, 41]; // E E F D E E G F (×2)
// Riff de 2 mesures (clé = pas 0..15) — syncopes sur 3/8/11/14, sixte phrygienne au sommet.
const RIFF1 = [
  { 0: { m: 64, v: 1.0 }, 3: { m: 65, v: 0.8 }, 6: { m: 64, v: 0.9 }, 8: { m: 67, v: 1.0 }, 11: { m: 65, v: 0.8 }, 14: { m: 62, v: 0.9 } },
  { 0: { m: 64, v: 1.0 }, 3: { m: 67, v: 0.8 }, 6: { m: 71, v: 1.0 }, 10: { m: 67, v: 0.8 }, 12: { m: 65, v: 0.9 }, 14: { m: 64, v: 0.7 } },
];
const music1 = {
  bpm: 118,
  bars: 16,
  seed: 118,
  voices: [
    { wave: 'pulse25', vol: 0.13, decay: 7, sustain: 2, vibrato: { rate: 6, depth: 0.25 },
      note: (bar, step) => {
        const hit = RIFF1[bar % 2][step];
        if (!hit) return null;
        return bar < 8 ? hit : { m: hit.m + 12, v: hit.v * 0.8 };
      } },
    { wave: 'square', vol: 0.15, decay: 7,
      note: (bar, step) => (step % 2 === 0
        ? { m: ROOTS1[bar % 8] + (step === 6 || step === 14 ? 12 : 0), v: step % 4 === 0 ? 1 : 0.8 }
        : null) },
    { wave: 'square', vol: 0.08, decay: 12,
      note: (bar, step) => {
        const on = step === 4 || step === 12 || (bar >= 8 && (step === 7 || step === 15));
        return on ? ROOTS1[bar % 8] + 19 : null;
      } },
    { wave: 'triangle', vol: 0.34, decay: 18, slide: -16, // kick 4-on-the-floor
      note: (bar, step) => (step % 4 === 0 ? 43 : null) },
  ],
  noise: [
    { vol: 0.1, decay: 24, sustain: 1.5, hit: (bar, step) => step === 4 || step === 12 }, // snare
    { vol: 0.045, decay: 60, hit: (bar, step) => step % 2 === 1 },                        // hats métalliques
  ],
};
```

- [ ] **Step 2: Régénérer et vérifier**

Run: `node scripts/music.mjs`
Expected: `wrote music-1.wav  (32.5s, 118 BPM, 16 bars)` ; `git status --porcelain assets/` ne montre que `music-1.wav`.

- [ ] **Step 3: Écoute de contrôle rapide**

`start assets\music-1.wav` : riff net et agressif, kick qui pousse, ça doit être la piste la plus énergique des trois. Si saturation : kick `vol` 0.28.

- [ ] **Step 4: Suite + commit**

Run: `npm test` — Expected: 219 passed.

```bash
git add scripts/music.mjs assets/music-1.wav
git commit -m "feat(music): music-1 rework — aggressive riff, 4-floor kick, A/B at 118 BPM"
```

---

### Task 4: Réécriture de music-2 (zone toxique — catchy mais mystérieux, 84 BPM)

**Files:**
- Modify: `scripts/music.mjs` (bloc `NOTES2`/`SEQ2`/`DRONE2`/`music2`)

**Interfaces:**
- Consumes: contrat de la Task 1.
- Produces: `assets/music-2.wav` régénéré (~45.7 s, 84 BPM, 16 mesures).

- [ ] **Step 1: Remplacer le bloc music-2**

Remplacer le bloc commençant à `// --- music-2 : ...` (constantes `NOTES2`, `SEQ2`, `DRONE2` et objet `music2`) par :

```js
// --- music-2 : zone toxique — catchy mais mystérieux, Ré dorien, 84 BPM, 16 mesures ---
// A : motif lead triangle+vibrato sur drone, percussions clairsemées.
// B : contre-chant pulse25 en quintes au-dessus du motif. La plus posée des trois.
const NOTES2 = [50, 57, 62, 64, 69]; // D3 A3 D4 E4 A4 — texture d'arpège conservée
const SEQ2 = [0, 1, 2, 3, 4, 3, 2, 1];
const DRONE2 = [38, 38, 41, 36]; // D2 D2 F2 C2
// Motif de 4 mesures (clé = pas 0..15) — le si (71) = sixte dorienne, la couleur de la piste.
const LEAD2 = [
  { 0: { m: 62, v: 1.0 }, 4: { m: 65, v: 0.8 }, 8: { m: 69, v: 0.9 }, 12: { m: 71, v: 0.8 } },
  { 0: { m: 69, v: 0.9 }, 6: { m: 65, v: 0.7 }, 10: { m: 62, v: 0.8 } },
  { 0: { m: 65, v: 1.0 }, 4: { m: 69, v: 0.8 }, 8: { m: 72, v: 0.9 }, 12: { m: 71, v: 0.7 } },
  { 0: { m: 69, v: 0.9 }, 8: { m: 62, v: 0.8 } },
];
const music2 = {
  bpm: 84,
  bars: 16,
  seed: 84,
  voices: [
    { wave: 'triangle', vol: 0.16, decay: 2.5, sustain: 4, vibrato: { rate: 4.5, depth: 0.35 },
      note: (bar, step) => LEAD2[bar % 4][step] ?? null },
    { wave: 'pulse25', vol: 0.06, decay: 2.5, sustain: 4, // contre-chant, section B
      note: (bar, step) => {
        if (bar < 8) return null;
        const hit = LEAD2[bar % 4][step];
        return hit ? { m: hit.m + 7, v: hit.v * 0.7 } : null;
      } },
    { wave: 'triangle', vol: 0.09, decay: 4, sustain: 2, // texture d'arpège
      note: (bar, step) => (step % 2 === 0 ? NOTES2[SEQ2[(step / 2) % 8]] : null) },
    { wave: 'triangle', vol: 0.17, decay: 1.2, sustain: 14, // drone
      note: (bar, step) => (step === 0 ? DRONE2[bar % 4] : null) },
    { wave: 'triangle', vol: 0.22, decay: 12, slide: -12, // kick doux, temps 1
      note: (bar, step) => (step === 0 ? 40 : null) },
  ],
  noise: [
    { vol: 0.05, decay: 28, sustain: 1.5, hit: (bar, step) => step === 8 && bar % 2 === 1 }, // tick
    { vol: 0.02, decay: 25, hit: (bar, step) => step === 12 && bar % 2 === 1 },              // shimmer
  ],
};
```

- [ ] **Step 2: Régénérer et vérifier**

Run: `node scripts/music.mjs`
Expected: `wrote music-2.wav  (45.7s, 84 BPM, 16 bars)` ; `git status --porcelain assets/` ne montre que `music-2.wav`.

- [ ] **Step 3: Écoute de contrôle rapide**

`start assets\music-2.wav` : motif chantant mais flottant, nettement plus posé que music-0/1, drone toujours présent, contre-chant qui n'arrive qu'à mi-boucle.

- [ ] **Step 4: Suite + commit**

Run: `npm test` — Expected: 219 passed.

```bash
git add scripts/music.mjs assets/music-2.wav
git commit -m "feat(music): music-2 rework — dorian motif + counter-line, A/B at 84 BPM"
```

---

### Task 5: Vérification finale (suite, build, Playwright, gate écoute)

**Files:**
- Aucune création/modification attendue (corrections mineures de volumes autorisées dans `scripts/music.mjs` si un problème d'écoute est détecté, avec régénération + commit `fix(music): ...`).

**Interfaces:**
- Consumes: les 3 wav des tâches 2-4.
- Produces: branche prête pour l'écoute de Jael puis le merge.

- [ ] **Step 1: Reproductibilité de bout en bout**

Run (PowerShell) : `node scripts/music.mjs; git status --porcelain assets/`
Expected: sortie vide (les 3 fichiers régénérés sont byte-identiques à ceux commités).

- [ ] **Step 2: Suite + build**

Run: `npm test` — Expected: 219 passed.
Run: `npm run build` — Expected: build Vite OK, les 3 wav dans le bundle.

- [ ] **Step 3: Vérif Playwright (comportement inchangé, nouveaux fichiers)**

Lancer `npm run dev` puis, via Playwright : NEW GAME → la musique du décor joue en PLAY et continue en PAUSE ; OPTIONS depuis la pause → musique coupée ; retour → elle repart ; GAMEOVER → coupée. C'est le même scénario que la vérif options-music (aucun comportement ne doit avoir changé, seuls les fichiers audio sont nouveaux).

- [ ] **Step 4: Gate final — écoute de Jael**

Présenter à Jael les 3 pistes (serveur dev ou fichiers directement). Critères du spec : hook mémorisable, loop propre sans clic, pas de fatigue après 2-3 boucles, identité de décor préservée. **Ne pas merger avant validation.**
