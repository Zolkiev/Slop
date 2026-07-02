# Options (SFX/Music Volumes) + Ambient Music Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the greyed OPTIONS buttons (main menu + pause) to a new OPTIONS screen with separate 0–10 SFX and music volume bars, and add three script-synthesized chiptune loops — one per decor set (`bgSet`) — that play during gameplay.

**Architecture:** A zero-dep node script (`scripts/music.mjs`, same family as `sfx.mjs`) renders three WAV loops. `src/engine/audio.js` gains two volume channels and an idempotent `setMusic(key|null)`. The world stays pure: `main.js` derives the desired track each frame via `musicFor(state, bgSet)` and reacts to `volsfx`/`volmusic` events for persistence/feedback. A new `States.OPTIONS` (reachable from MENU and PAUSE, returning to its origin) hosts pure `src/game/options.js` logic rendered by `src/render/options.js`.

**Tech Stack:** Vanilla JS (ES modules), Canvas 2D, HTMLAudio, Vitest (node env). Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-07-02-options-music-design.md`

## Global Constraints

- Zero runtime dependencies (vanilla JS + Canvas 2D + HTMLAudio only).
- Game logic pure and DOM-free in `src/game/`; rendering in `src/render/`; DOM only in `src/ui/` and `main.js`.
- Test names in French. Run `npx vitest run` from `1st_Slop/`; all green after every task.
- Volumes are device preferences: localStorage keys `jetpackbot.volSfx` / `jetpackbot.volMusic`, integer steps 0..10, default **7**. NOT in the save code.
- Music maps to decor: track `music-<n>` ↔ `bgSet n` (3 tracks). Plays in PLAY/PAUSE/LEVEL_COMPLETE; silent in MENU/SAVECODE/GAMEOVER/OPTIONS-from-menu (OPTIONS from pause keeps the music playing — state PAUSE is left, but see `musicFor`: OPTIONS is NOT a music state, so entering options from pause silences music; this is accepted: consistent single rule).
- UI copy UPPERCASE French: title `OPTIONS`, rows `SFX` / `MUSIQUE`, button `RETOUR`.
- Events: `volsfx` (SFX volume changed → persist + apply + play `score` blip) and `volmusic` (persist + apply). All other events still reach `audio.play`.
- ArrowLeft/ArrowRight adjust WITH key-repeat allowed (no `!e.repeat` guard).
- The game-input gate from the save system stays: all input callbacks in `main.js` are gated on `!codeInput.isOpen()`.

---

### Task 1: Music generation script + 3 WAV assets

**Files:**
- Create: `scripts/music.mjs`
- Create (generated): `assets/music-0.wav`, `assets/music-1.wav`, `assets/music-2.wav`

**Interfaces:**
- Consumes: nothing (standalone node script; WAV encoder duplicated from `scripts/sfx.mjs`'s format: 16-bit PCM mono 22050 Hz — scripts are one-shot generators, small duplication accepted like `sfx.mjs`).
- Produces: three loopable WAV files, ~20–26 s each, loaded by Task 8's `main.js` imports. Track moods: `music-0` calm urban night (90 BPM, A minor), `music-1` tense industrial (112 BPM, E phrygian), `music-2` floating toxic zone (76 BPM, D dorian).

- [ ] **Step 1: Write the script**

Create `scripts/music.mjs`:

```js
#!/usr/bin/env node
// Synthesize three chiptune ambient loops for Jetpack Bot — zero dependencies.
// One track per decor set (bgSet). 16-bit PCM, mono, 22050 Hz. Outputs to assets/.
//   node scripts/music.mjs
// Loops are bar-aligned: total length = bars * 16 steps exactly, no fade-out,
// so `loop = true` playback wraps cleanly.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'assets');
const RATE = 22050;

function toWav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const square = (ph) => ((ph % 1) < 0.5 ? 1 : -1);
const triangle = (ph) => { const p = ph % 1; return p < 0.5 ? 4 * p - 1 : 3 - 4 * p; };
const WAVES = { square, triangle };

// Pattern renderer. A track is:
// { bpm, bars, voices: [{ wave, vol, decay, sustain?, note(bar, step) -> midi|null }],
//   noise: [{ vol, decay, hit(bar, step) -> boolean }] }
// 16 steps (16th notes) per bar.
function render(track) {
  const stepLen = Math.round((60 / track.bpm / 4) * RATE);
  const total = stepLen * 16 * track.bars;
  const out = new Float32Array(total);
  for (let bar = 0; bar < track.bars; bar += 1) {
    for (let step = 0; step < 16; step += 1) {
      const start = (bar * 16 + step) * stepLen;
      for (const v of track.voices) {
        const midi = v.note(bar, step);
        if (midi == null) continue;
        const f = midiFreq(midi);
        const wave = WAVES[v.wave];
        const len = Math.min(Math.round(stepLen * (v.sustain ?? 1)), total - start);
        for (let i = 0; i < len; i += 1) {
          const t = i / RATE;
          out[start + i] += wave(f * t) * Math.exp(-t * v.decay) * v.vol;
        }
      }
      for (const nz of track.noise ?? []) {
        if (!nz.hit(bar, step)) continue;
        const len = Math.min(Math.round(stepLen * 0.5), total - start);
        for (let i = 0; i < len; i += 1) {
          const t = i / RATE;
          out[start + i] += (Math.random() * 2 - 1) * Math.exp(-t * nz.decay) * nz.vol;
        }
      }
    }
  }
  for (let i = 0; i < total; i += 1) out[i] = Math.tanh(out[i]); // soft clip
  return out;
}

// --- music-0 : nuit urbaine — synthwave calme, La mineur, 90 BPM, 8 mesures ---
// Progression Am / F / C / G (racines midi), arpège up-down, basse ronde, hats doux.
const PROG0 = [
  { root: 57, iv: [0, 3, 7, 12] },  // Am
  { root: 53, iv: [0, 4, 7, 12] },  // F
  { root: 48, iv: [0, 4, 7, 12] },  // C
  { root: 55, iv: [0, 4, 7, 12] },  // G
];
const ARP0 = [0, 1, 2, 3, 2, 1, 0, 2];
const music0 = {
  bpm: 90,
  bars: 8,
  voices: [
    { wave: 'square', vol: 0.11, decay: 9,
      note: (bar, step) => { const c = PROG0[bar % 4]; return c.root + c.iv[ARP0[step % 8]]; } },
    { wave: 'triangle', vol: 0.22, decay: 3, sustain: 6,
      note: (bar, step) => (step === 0 || step === 8 ? PROG0[bar % 4].root - 12 : null) },
  ],
  noise: [
    { vol: 0.035, decay: 45, hit: (bar, step) => step % 4 === 2 },
  ],
};

// --- music-1 : industriel — tendu, Mi phrygien, 112 BPM, 10 mesures ---
// Basse martelée en croches, stabs clairsemés, kick triangle grave, hats métalliques.
const ROOTS1 = [40, 40, 41, 38, 40, 40, 43, 41, 40, 38]; // E E F D E E G F E D
const music1 = {
  bpm: 112,
  bars: 10,
  voices: [
    { wave: 'square', vol: 0.16, decay: 7,
      note: (bar, step) => (step % 2 === 0 ? ROOTS1[bar] + (step === 6 || step === 14 ? 12 : 0) : null) },
    { wave: 'square', vol: 0.08, decay: 12,
      note: (bar, step) => (step === 4 || step === 12 ? ROOTS1[bar] + 19 : null) },
    { wave: 'triangle', vol: 0.3, decay: 18,
      note: (bar, step) => (step === 0 || step === 8 ? ROOTS1[bar] - 12 : null) },
  ],
  noise: [
    { vol: 0.05, decay: 55, hit: (bar, step) => step % 2 === 1 },
  ],
};

// --- music-2 : zone toxique — mystérieux, Ré dorien, 76 BPM, 8 mesures ---
// Arpège triangle flottant (intervalles ouverts), drone de basse, shimmer rare.
const NOTES2 = [50, 57, 62, 64, 69]; // D3 A3 D4 E4 A4
const SEQ2 = [0, 1, 2, 3, 4, 3, 2, 1];
const DRONE2 = [38, 38, 41, 36]; // D2 D2 F2 C2
const music2 = {
  bpm: 76,
  bars: 8,
  voices: [
    { wave: 'triangle', vol: 0.13, decay: 4, sustain: 2,
      note: (bar, step) => (step % 2 === 0 ? NOTES2[SEQ2[(step / 2) % 8]] : null) },
    { wave: 'triangle', vol: 0.17, decay: 1.2, sustain: 14,
      note: (bar, step) => (step === 0 ? DRONE2[bar % 4] : null) },
  ],
  noise: [
    { vol: 0.02, decay: 25, hit: (bar, step) => step === 12 && bar % 2 === 1 },
  ],
};

mkdirSync(ASSETS, { recursive: true });
const tracks = { 'music-0': music0, 'music-1': music1, 'music-2': music2 };
for (const [name, track] of Object.entries(tracks)) {
  const samples = render(track);
  writeFileSync(join(ASSETS, `${name}.wav`), toWav(samples));
  console.log(`wrote ${name}.wav  (${(samples.length / RATE).toFixed(1)}s, ${track.bpm} BPM, ${track.bars} bars)`);
}
```

- [ ] **Step 2: Generate and sanity-check the assets**

Run: `node scripts/music.mjs`
Expected output: three `wrote music-N.wav (...)` lines — durations ≈ 21.3s, 21.4s, 25.3s.
Check: `node -e "const fs=require('fs');for(const n of [0,1,2]){const b=fs.readFileSync('assets/music-'+n+'.wav');console.log(n, b.length, b.toString('ascii',0,4), b.toString('ascii',8,12));}"`
Expected: each file starts with `RIFF` + `WAVE`, sizes roughly 0.9–1.2 MB.

- [ ] **Step 3: Run the suite (unchanged) and commit**

Run: `npx vitest run`
Expected: all tests PASS (nothing wired yet).

```bash
git add scripts/music.mjs assets/music-0.wav assets/music-1.wav assets/music-2.wav
git commit -m "assets(music): three chiptune ambient loops, one per decor set"
```

---

### Task 2: Settings module (`settings.js`)

**Files:**
- Create: `src/game/settings.js`
- Test: `tests/game/settings.test.js`

**Interfaces:**
- Consumes: a `storage` (localStorage-like, `getItem`/`setItem`).
- Produces: `loadSettings(storage) → { sfx: number, music: number }` (integers 0..10, default 7, invalid → default); `saveSettings(settings, storage)` persists `jetpackbot.volSfx`/`jetpackbot.volMusic`; `volumeToGain(step) → step / 10`. Tasks 6 and 8 rely on these names.

- [ ] **Step 1: Write the failing tests**

Create `tests/game/settings.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { loadSettings, saveSettings, volumeToGain } from '../../src/game/settings.js';

function fakeStorage(init = {}) {
  const d = { ...init };
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); }, data: d };
}

describe('settings', () => {
  it('défauts à 7/7 sans storage ou storage vide', () => {
    expect(loadSettings(undefined)).toEqual({ sfx: 7, music: 7 });
    expect(loadSettings(fakeStorage())).toEqual({ sfx: 7, music: 7 });
  });

  it('round-trip save/load', () => {
    const storage = fakeStorage();
    saveSettings({ sfx: 3, music: 10 }, storage);
    expect(loadSettings(storage)).toEqual({ sfx: 3, music: 10 });
    expect(storage.getItem('jetpackbot.volSfx')).toBe('3');
    expect(storage.getItem('jetpackbot.volMusic')).toBe('10');
  });

  it('clamp 0..10 et arrondi entier au chargement', () => {
    const storage = fakeStorage({ 'jetpackbot.volSfx': '15', 'jetpackbot.volMusic': '4.6' });
    expect(loadSettings(storage)).toEqual({ sfx: 10, music: 5 });
  });

  it('valeurs corrompues -> défaut', () => {
    const storage = fakeStorage({ 'jetpackbot.volSfx': 'abc', 'jetpackbot.volMusic': '-2' });
    expect(loadSettings(storage)).toEqual({ sfx: 7, music: 0 });
  });

  it('saveSettings tolère un storage absent', () => {
    expect(() => saveSettings({ sfx: 1, music: 1 }, undefined)).not.toThrow();
  });

  it('volumeToGain: 0 -> 0, 7 -> 0.7, 10 -> 1', () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(7)).toBeCloseTo(0.7);
    expect(volumeToGain(10)).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/game/settings.test.js`
Expected: FAIL — cannot resolve `../../src/game/settings.js`.

- [ ] **Step 3: Write the implementation**

Create `src/game/settings.js`:

```js
// Préférences d'appareil (volumes) — localStorage uniquement, PAS dans le code de sauvegarde.
const KEY_SFX = 'jetpackbot.volSfx';
const KEY_MUSIC = 'jetpackbot.volMusic';
const DEFAULT = 7;

function readStep(storage, key) {
  const raw = storage?.getItem(key);
  const n = Number(raw);
  if (raw === null || raw === undefined || Number.isNaN(n)) return DEFAULT;
  return Math.max(0, Math.min(10, Math.round(n)));
}

export function loadSettings(storage) {
  return { sfx: readStep(storage, KEY_SFX), music: readStep(storage, KEY_MUSIC) };
}

export function saveSettings(settings, storage) {
  storage?.setItem(KEY_SFX, String(settings.sfx));
  storage?.setItem(KEY_MUSIC, String(settings.music));
}

export function volumeToGain(step) {
  return step / 10;
}
```

Note on the corrupted-values test: `'-2'` is a number → clamps to 0 (not default); `'abc'` is NaN → default 7. The test encodes exactly that.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/settings.js tests/game/settings.test.js
git commit -m "feat(options): settings module — volume steps 0..10, localStorage persistence"
```

---

### Task 3: Audio engine — volume channels + `setMusic`

**Files:**
- Modify: `src/engine/audio.js`
- Test: `tests/engine/audio.test.js`

**Interfaces:**
- Consumes: existing `createAudio(sources, AudioCtor = Audio)` and its `clips` map.
- Produces: on the returned object — `setSfxVolume(v)` (v ∈ [0,1], applied to every SFX `play()`), `setMusicVolume(v)` (applied to the current and future music clips), `setMusic(key | null)` (idempotent: same key → no-op; new key → stop current, start new with `loop = true` at music volume; `null`/unknown key → stop current). `play(name)` keeps its exact behaviour plus volume application. Task 8 calls all of these.

- [ ] **Step 1: Write the failing tests**

Add to `tests/engine/audio.test.js` (keep the 3 existing tests; the FakeAudio below is richer):

```js
function trackFake() {
  const instances = [];
  class FakeAudio {
    constructor(url) {
      this.url = url;
      this.currentTime = 0;
      this.volume = 1;
      this.loop = false;
      this.playing = false;
      this.play = vi.fn(() => { this.playing = true; });
      this.pause = vi.fn(() => { this.playing = false; });
      instances.push(this);
    }
  }
  return { FakeAudio, instances };
}

describe('audio volumes & music', () => {
  it('setSfxVolume s\'applique au play() des SFX', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ score: 's.wav' }, FakeAudio);
    audio.setSfxVolume(0.3);
    audio.play('score');
    expect(instances[0].volume).toBeCloseTo(0.3);
  });

  it('setMusic lance la piste en boucle au volume musique courant', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-0': 'm0.wav' }, FakeAudio);
    audio.setMusicVolume(0.5);
    audio.setMusic('music-0');
    const clip = instances[0];
    expect(clip.loop).toBe(true);
    expect(clip.volume).toBeCloseTo(0.5);
    expect(clip.play).toHaveBeenCalledTimes(1);
  });

  it('setMusic même clé = no-op (la boucle continue)', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-0': 'm0.wav' }, FakeAudio);
    audio.setMusic('music-0');
    audio.setMusic('music-0');
    expect(instances[0].play).toHaveBeenCalledTimes(1);
  });

  it('setMusic nouvelle clé stoppe l\'ancienne et lance la nouvelle', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-0': 'm0.wav', 'music-1': 'm1.wav' }, FakeAudio);
    audio.setMusic('music-0');
    audio.setMusic('music-1');
    const [m0, m1] = instances;
    expect(m0.pause).toHaveBeenCalled();
    expect(m0.currentTime).toBe(0);
    expect(m1.play).toHaveBeenCalledTimes(1);
  });

  it('setMusic(null) stoppe la piste courante', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-0': 'm0.wav' }, FakeAudio);
    audio.setMusic('music-0');
    audio.setMusic(null);
    expect(instances[0].pause).toHaveBeenCalled();
  });

  it('setMusicVolume s\'applique à la piste en cours', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-0': 'm0.wav' }, FakeAudio);
    audio.setMusic('music-0');
    audio.setMusicVolume(0.2);
    expect(instances[0].volume).toBeCloseTo(0.2);
  });

  it('setMusic clé inconnue = stop sans planter', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-0': 'm0.wav' }, FakeAudio);
    audio.setMusic('music-0');
    expect(() => audio.setMusic('music-9')).not.toThrow();
    expect(instances[0].pause).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/audio.test.js`
Expected: FAIL — `audio.setSfxVolume is not a function`.

- [ ] **Step 3: Write the implementation**

Replace the body of `src/engine/audio.js` with:

```js
export function createAudio(sources, AudioCtor = Audio) {
  const clips = {};
  for (const [name, url] of Object.entries(sources)) {
    clips[name] = new AudioCtor(url);
  }
  let sfxGain = 1;
  let musicGain = 1;
  let musicKey = null;

  function stopMusic() {
    const clip = clips[musicKey];
    if (clip) {
      try {
        clip.pause();
        clip.currentTime = 0;
      } catch { /* best-effort */ }
    }
    musicKey = null;
  }

  return {
    play(name) {
      const clip = clips[name];
      if (!clip) return;
      try {
        clip.volume = sfxGain;
        clip.currentTime = 0;
        const p = clip.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        /* lecture audio best-effort */
      }
    },
    setSfxVolume(v) {
      sfxGain = v;
    },
    setMusicVolume(v) {
      musicGain = v;
      const clip = clips[musicKey];
      if (clip) clip.volume = v;
    },
    setMusic(key) {
      if (key === musicKey) return;
      stopMusic();
      const clip = clips[key];
      if (!clip) return; // null ou clé inconnue -> silence
      musicKey = key;
      try {
        clip.loop = true;
        clip.volume = musicGain;
        const p = clip.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        /* lecture audio best-effort */
      }
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS (the 3 pre-existing audio tests must stay green — `play` still swallows rejections and unknown names).

- [ ] **Step 5: Commit**

```bash
git add src/engine/audio.js tests/engine/audio.test.js
git commit -m "feat(audio): sfx/music volume channels + idempotent looping setMusic"
```

---

### Task 4: Track selection (`music.js`)

**Files:**
- Create: `src/game/music.js`
- Test: `tests/game/music.test.js`

**Interfaces:**
- Consumes: `States` from `src/engine/state.js`.
- Produces: `musicFor(state, bgSet) → 'music-<bgSet>' | null` — track key when `state` ∈ {PLAY, PAUSE, LEVEL_COMPLETE}, else `null`. Task 8 calls it every frame.

- [ ] **Step 1: Write the failing tests**

Create `tests/game/music.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { musicFor } from '../../src/game/music.js';
import { States } from '../../src/engine/state.js';

describe('musicFor', () => {
  it('joue music-<bgSet> en PLAY, PAUSE et LEVEL_COMPLETE', () => {
    for (const s of [States.PLAY, States.PAUSE, States.LEVEL_COMPLETE]) {
      expect(musicFor(s, 0)).toBe('music-0');
      expect(musicFor(s, 2)).toBe('music-2');
    }
  });

  it('silence au MENU, GAMEOVER, SAVECODE et OPTIONS', () => {
    for (const s of [States.MENU, States.GAMEOVER, States.SAVECODE, States.OPTIONS]) {
      expect(musicFor(s, 1)).toBe(null);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/game/music.test.js`
Expected: FAIL — cannot resolve `../../src/game/music.js`. (Note: `States.OPTIONS` is `undefined` until Task 5 — the `null`-silence test still passes once the module exists because `MUSIC_STATES` won't contain `undefined`; the test is order-safe.)

- [ ] **Step 3: Write the implementation**

Create `src/game/music.js`:

```js
import { States } from '../engine/state.js';

const MUSIC_STATES = new Set([States.PLAY, States.PAUSE, States.LEVEL_COMPLETE]);

export function musicFor(state, bgSet) {
  return MUSIC_STATES.has(state) ? `music-${bgSet}` : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/music.js tests/game/music.test.js
git commit -m "feat(music): pure track selection per state and decor set"
```

---

### Task 5: OPTIONS state, enabled buttons, config, options logic

**Files:**
- Modify: `src/engine/state.js`
- Modify: `src/game/menu.js` (enable `options` in `createMenu` and `createPauseMenu`)
- Modify: `src/config.js` (add `OPTIONS_*` block)
- Create: `src/game/options.js`
- Test: `tests/engine/state.test.js`, `tests/game/menu.test.js`, `tests/game/options.test.js`

**Interfaces:**
- Consumes: private `build` factory (menu.js), `loadSettings`-shaped `{ sfx, music }` object.
- Produces:
  - `States.OPTIONS = 'options'`; transitions `MENU → [PLAY, SAVECODE, OPTIONS]`, `PAUSE → [PLAY, MENU, OPTIONS]`, `OPTIONS → [MENU, PAUSE]`.
  - `createMenu`/`createPauseMenu`: `options` button now `enabled: true` (all other buttons unchanged).
  - `CONFIG.OPTIONS_TITLE_Y: 140`, `CONFIG.OPTIONS_ROWS: { x: 28, y0: 240, gap: 84, segW: 24, segGap: 4, segH: 28, count: 11 }`, `CONFIG.OPTIONS_LABEL_DY: -16`, `CONFIG.OPTIONS_BTN: { x: 80, y: 440, w: 200, h: 56 }`.
  - `createOptions(settings) → { rows: [{id:'sfx', label:'SFX', value}, {id:'music', label:'MUSIQUE', value}], focus: 0 }` (focus 0=SFX, 1=MUSIQUE, 2=RETOUR).
  - `moveOptionsFocus(opt, dir)` — wrap 0→1→2→0 (and reverse).
  - `adjust(opt, dir) → 'sfx' | 'music' | null` — ±1 clamped 0..10 on the focused row; returns the row id when the value changed, `null` otherwise (incl. focus on RETOUR).
  - `barHitTest(opt, x, y) → { id, value } | null` — segment k of row r maps to value k (0..10).
  - Task 6 consumes all of these; Task 7 renders the object.

- [ ] **Step 1: Update existing tests + write failing tests**

`tests/engine/state.test.js` — add:

```js
  it('MENU <-> OPTIONS et PAUSE <-> OPTIONS ; OPTIONS ne va pas en PLAY', () => {
    const sm = createStateMachine();
    expect(sm.can(States.OPTIONS)).toBe(true);
    sm.to(States.OPTIONS);
    expect(sm.can(States.PLAY)).toBe(false);
    expect(sm.can(States.MENU)).toBe(true);
    expect(sm.can(States.PAUSE)).toBe(true);
    const sm2 = createStateMachine(States.PAUSE);
    expect(sm2.can(States.OPTIONS)).toBe(true);
  });
```

`tests/game/menu.test.js`:

Replace `createMenu: 4 boutons ordonnés, continue/options disabled par défaut, focus newgame` with:

```js
  it('createMenu: 4 boutons ordonnés, continue disabled par défaut, options/code enabled', () => {
    const m = createMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['newgame', 'continue', 'options', 'code']);
    expect(m.buttons.map((b) => b.enabled)).toEqual([true, false, true, true]);
    expect(focusedId(m)).toBe('newgame');
  });
```

Replace `moveFocus saute continue/options (disabled) et va sur code` with:

```js
  it('moveFocus saute continue (disabled) et va sur options', () => {
    const m = createMenu();
    moveFocus(m, 1);
    expect(focusedId(m)).toBe('options');
    moveFocus(m, -1);
    expect(focusedId(m)).toBe('newgame');
  });
```

Replace `createPauseMenu: 4 boutons ordonnés, resume/restart/menu enabled, options disabled, focus resume` with:

```js
  it('createPauseMenu: 4 boutons ordonnés, tous enabled, focus resume', () => {
    const m = createPauseMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['resume', 'restart', 'menu', 'options']);
    expect(m.buttons.every((b) => b.enabled)).toBe(true);
    expect(focusedId(m)).toBe('resume');
  });
```

Replace `moveFocus sur le pause menu saute options (disabled)` with:

```js
  it('moveFocus sur le pause menu parcourt les 4 boutons', () => {
    const m = createPauseMenu();
    m.focus = 2; // menu
    moveFocus(m, 1);
    expect(focusedId(m)).toBe('options');
    moveFocus(m, 1);
    expect(focusedId(m)).toBe('resume');
  });
```

Create `tests/game/options.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createOptions, moveOptionsFocus, adjust, barHitTest } from '../../src/game/options.js';
import { CONFIG } from '../../src/config.js';

describe('options screen state', () => {
  it('createOptions copie les valeurs des settings, focus sur SFX', () => {
    const opt = createOptions({ sfx: 3, music: 9 });
    expect(opt.rows.map((r) => r.id)).toEqual(['sfx', 'music']);
    expect(opt.rows.map((r) => r.label)).toEqual(['SFX', 'MUSIQUE']);
    expect(opt.rows.map((r) => r.value)).toEqual([3, 9]);
    expect(opt.focus).toBe(0);
  });

  it('moveOptionsFocus wrap 0->1->2->0 et inverse', () => {
    const opt = createOptions({ sfx: 7, music: 7 });
    moveOptionsFocus(opt, 1); expect(opt.focus).toBe(1);
    moveOptionsFocus(opt, 1); expect(opt.focus).toBe(2);
    moveOptionsFocus(opt, 1); expect(opt.focus).toBe(0);
    moveOptionsFocus(opt, -1); expect(opt.focus).toBe(2);
  });

  it('adjust ±1 clampé, renvoie l\'id au changement, null sinon', () => {
    const opt = createOptions({ sfx: 10, music: 0 });
    expect(adjust(opt, 1)).toBe(null); // sfx déjà à 10
    expect(adjust(opt, -1)).toBe('sfx');
    expect(opt.rows[0].value).toBe(9);
    opt.focus = 1;
    expect(adjust(opt, -1)).toBe(null); // music déjà à 0
    expect(adjust(opt, 1)).toBe('music');
    opt.focus = 2;
    expect(adjust(opt, 1)).toBe(null); // RETOUR: no-op
  });

  it('barHitTest: segment k -> valeur k, hors zone -> null', () => {
    const opt = createOptions({ sfx: 7, music: 7 });
    const R = CONFIG.OPTIONS_ROWS;
    const segX = (k) => R.x + k * (R.segW + R.segGap) + 1;
    expect(barHitTest(opt, segX(0), R.y0 + 1)).toEqual({ id: 'sfx', value: 0 });
    expect(barHitTest(opt, segX(10), R.y0 + 1)).toEqual({ id: 'sfx', value: 10 });
    expect(barHitTest(opt, segX(5), R.y0 + R.gap + 1)).toEqual({ id: 'music', value: 5 });
    // dans l'inter-segment -> null
    expect(barHitTest(opt, R.x + R.segW + 1, R.y0 + 1)).toBe(null);
    // hors des lignes -> null
    expect(barHitTest(opt, segX(0), R.y0 + R.segH + 5)).toBe(null);
    expect(barHitTest(opt, 0, 0)).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/state.test.js tests/game/menu.test.js tests/game/options.test.js`
Expected: FAIL — `States.OPTIONS` undefined; menu enabled arrays differ; `src/game/options.js` missing.

- [ ] **Step 3: Write the implementation**

`src/engine/state.js`:

```js
export const States = {
  MENU: 'menu', PLAY: 'play', GAMEOVER: 'gameover', LEVEL_COMPLETE: 'levelcomplete',
  PAUSE: 'pause', SAVECODE: 'savecode', OPTIONS: 'options',
};

const TRANSITIONS = {
  [States.MENU]: [States.PLAY, States.SAVECODE, States.OPTIONS],
  [States.PLAY]: [States.GAMEOVER, States.LEVEL_COMPLETE, States.PAUSE],
  [States.GAMEOVER]: [States.PLAY, States.MENU],
  [States.LEVEL_COMPLETE]: [States.PLAY],
  [States.PAUSE]: [States.PLAY, States.MENU, States.OPTIONS],
  [States.SAVECODE]: [States.MENU],
  [States.OPTIONS]: [States.MENU, States.PAUSE],
};
```

`src/game/menu.js` — in `createMenu`, the options def becomes `{ id: 'options', label: 'OPTIONS', enabled: true }`; in `createPauseMenu`, same change.

`src/config.js` — below the `SAVECODE_MSG_Y` line, add:

```js
  // Écran Options
  OPTIONS_TITLE_Y: 140,
  OPTIONS_ROWS: { x: 28, y0: 240, gap: 84, segW: 24, segGap: 4, segH: 28, count: 11 },
  OPTIONS_LABEL_DY: -16,
  OPTIONS_BTN: { x: 80, y: 440, w: 200, h: 56 },
```

Create `src/game/options.js`:

```js
import { CONFIG } from '../config.js';

// focus: 0 = ligne SFX, 1 = ligne MUSIQUE, 2 = bouton RETOUR
export function createOptions(settings) {
  return {
    rows: [
      { id: 'sfx', label: 'SFX', value: settings.sfx },
      { id: 'music', label: 'MUSIQUE', value: settings.music },
    ],
    focus: 0,
  };
}

export function moveOptionsFocus(opt, dir) {
  opt.focus = (opt.focus + dir + 3) % 3;
}

export function adjust(opt, dir) {
  if (opt.focus > 1) return null;
  const row = opt.rows[opt.focus];
  const next = Math.max(0, Math.min(10, row.value + dir));
  if (next === row.value) return null;
  row.value = next;
  return row.id;
}

export function barHitTest(opt, x, y) {
  const R = CONFIG.OPTIONS_ROWS;
  for (let r = 0; r < opt.rows.length; r += 1) {
    const top = R.y0 + r * R.gap;
    if (y < top || y >= top + R.segH) continue;
    const dx = x - R.x;
    if (dx < 0) return null;
    const k = Math.floor(dx / (R.segW + R.segGap));
    if (k >= R.count) return null;
    if (dx - k * (R.segW + R.segGap) >= R.segW) return null; // dans l'espace inter-segment
    return { id: opt.rows[r].id, value: k };
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS. Watch for collateral: `tests/game/world.test.js` has `pause: clic Options (disabled) reste PAUSE` — it will now FAIL because options is enabled but the PAUSE branch treats `'options'` as no-op, so hitTest returns `'options'`… `press` still no-ops on it (only `resume`/`restart`/`menu` are handled), so the test still passes unchanged. Verify this in the run; do NOT change world.js in this task (Task 6 wires it).

- [ ] **Step 5: Commit**

```bash
git add src/engine/state.js src/game/menu.js src/config.js src/game/options.js tests/engine/state.test.js tests/game/menu.test.js tests/game/options.test.js
git commit -m "feat(options): OPTIONS state, enabled buttons, pure options-screen logic"
```

---

### Task 6: World wiring — open/close, adjust, volume events

**Files:**
- Modify: `src/game/world.js`
- Test: `tests/game/world.test.js`

**Interfaces:**
- Consumes: `createOptions`/`moveOptionsFocus`/`adjust`/`barHitTest` (Task 5), `loadSettings` (Task 2), `States.OPTIONS`, existing `toMenu`/`inRect`/`hitTest`/`activate`.
- Produces:
  - `world.settings` (loaded in `createWorld` via `loadSettings(storage)`).
  - `world.options` (created on open), `world.optionsReturn` (`'menu'` | `'pause'`).
  - `press` MENU branch: `id === 'options'` → open options (return `'menu'`). PAUSE branch: `id === 'options'` → open options (return `'pause'`).
  - `press` OPTIONS branch: pointer → `barHitTest` (set value + sync) else RETOUR rect → close; keyboard → close only when focus is RETOUR (2).
  - `adjustAction(world, dir)` — new export; in OPTIONS, `adjust` + sync.
  - Sync = update `world.settings` from rows + push event `'volsfx'` or `'volmusic'`.
  - `navMenu`/`escapeAction` handle OPTIONS (`moveOptionsFocus` / close).
  - Close: return to `'pause'` → `sm.to(States.PAUSE)`; return to `'menu'` → `toMenu(world)`.
  - Task 8 consumes `adjustAction` and the two events.

- [ ] **Step 1: Update existing test + write failing tests**

In `tests/game/world.test.js`, replace the test `pause: clic Options (disabled) reste PAUSE` with:

```js
    it('pause: clic Options ouvre OPTIONS (retour pause)', () => {
      const w = createWorld(fakeStorage());
      press(w); escapeAction(w);
      const b = w.pause.buttons[3]; // options
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.OPTIONS);
      expect(w.optionsReturn).toBe('pause');
    });
```

Add a new describe block (import `adjustAction` from world.js and `CONFIG` is already imported):

```js
  describe('options routing', () => {
    it('menu: clic OPTIONS ouvre l\'écran avec les settings courants', () => {
      const w = createWorld(fakeStorage());
      const b = w.menu.buttons[2]; // options
      press(w, { x: b.x + 1, y: b.y + 1 });
      expect(w.sm.get()).toBe(States.OPTIONS);
      expect(w.optionsReturn).toBe('menu');
      expect(w.options.rows[0].value).toBe(w.settings.sfx);
    });

    it('OPTIONS: RETOUR (clic) revient à l\'origine menu', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[2].x + 1, y: w.menu.buttons[2].y + 1 });
      const r = CONFIG.OPTIONS_BTN;
      press(w, { x: r.x + 1, y: r.y + 1 });
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('OPTIONS depuis la pause: Escape revient en PAUSE, partie gelée', () => {
      const w = createWorld(fakeStorage());
      press(w); // PLAY
      updateWorld(w, 1 / 60);
      escapeAction(w); // PAUSE
      const y = w.robot.y;
      const b = w.pause.buttons[3];
      press(w, { x: b.x + 1, y: b.y + 1 }); // OPTIONS
      updateWorld(w, 1 / 60);
      updateWorld(w, 1 / 60);
      expect(w.robot.y).toBe(y); // gelé en OPTIONS
      escapeAction(w);
      expect(w.sm.get()).toBe(States.PAUSE);
      expect(w.robot.y).toBe(y); // toujours gelé
    });

    it('adjustAction change la valeur focusée, met à jour settings et pousse volsfx', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[2].x + 1, y: w.menu.buttons[2].y + 1 });
      const before = w.settings.sfx;
      adjustAction(w, -1);
      expect(w.options.rows[0].value).toBe(before - 1);
      expect(w.settings.sfx).toBe(before - 1);
      expect(w.events).toContain('volsfx');
    });

    it('adjustAction sur la ligne MUSIQUE pousse volmusic', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[2].x + 1, y: w.menu.buttons[2].y + 1 });
      navMenu(w, 1); // focus MUSIQUE
      adjustAction(w, 1);
      expect(w.events).toContain('volmusic');
      expect(w.settings.music).toBe(8);
    });

    it('adjustAction hors OPTIONS = no-op', () => {
      const w = createWorld(fakeStorage());
      adjustAction(w, 1);
      expect(w.events).toEqual([]);
      expect(w.sm.get()).toBe(States.MENU);
    });

    it('clic sur un segment règle la valeur et pousse l\'event', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[2].x + 1, y: w.menu.buttons[2].y + 1 });
      const R = CONFIG.OPTIONS_ROWS;
      press(w, { x: R.x + 2 * (R.segW + R.segGap) + 1, y: R.y0 + R.gap + 1 }); // music -> 2
      expect(w.settings.music).toBe(2);
      expect(w.events).toContain('volmusic');
    });

    it('clic sur un segment de la valeur courante ne pousse pas d\'event', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[2].x + 1, y: w.menu.buttons[2].y + 1 });
      const R = CONFIG.OPTIONS_ROWS;
      const cur = w.settings.sfx;
      press(w, { x: R.x + cur * (R.segW + R.segGap) + 1, y: R.y0 + 1 });
      expect(w.events).toEqual([]);
    });

    it('nav clavier: haut/bas change le focus, Enter sur RETOUR ferme', () => {
      const w = createWorld(fakeStorage());
      press(w, { x: w.menu.buttons[2].x + 1, y: w.menu.buttons[2].y + 1 });
      navMenu(w, -1); // wrap -> RETOUR (2)
      expect(w.options.focus).toBe(2);
      press(w); // activation clavier
      expect(w.sm.get()).toBe(States.MENU);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/game/world.test.js`
Expected: FAIL — `w.optionsReturn` undefined, `adjustAction` not exported, OPTIONS state never reached.

- [ ] **Step 3: Write the implementation**

In `src/game/world.js`:

1. Imports:

```js
import { createOptions, moveOptionsFocus, adjust, barHitTest } from './options.js';
import { loadSettings } from './settings.js';
```

2. `createWorld` — add fields (below `savecode:`):

```js
    settings: loadSettings(storage),
    options: null,
    optionsReturn: 'menu',
```

3. Helpers (below `toMenu`):

```js
function openOptions(world, from) {
  world.options = createOptions(world.settings);
  world.optionsReturn = from;
  world.sm.to(States.OPTIONS);
}

function closeOptions(world) {
  if (world.optionsReturn === 'pause') world.sm.to(States.PAUSE);
  else toMenu(world);
}

function syncVolume(world, id) {
  world.settings = { sfx: world.options.rows[0].value, music: world.options.rows[1].value };
  world.events.push(id === 'sfx' ? 'volsfx' : 'volmusic');
}
```

4. `press` MENU branch — add before the `'code'` case:

```js
    } else if (id === 'options') {
      openOptions(world, 'menu');
```

(The trailing comment becomes `// null → no-op`.)

5. `press` PAUSE branch — add after the `'menu'` case:

```js
    } else if (id === 'options') {
      openOptions(world, 'pause');
```

6. `press` — add an OPTIONS branch (after the SAVECODE branch):

```js
  } else if (state === States.OPTIONS) {
    if (pointer) {
      const hit = barHitTest(world.options, pointer.x, pointer.y);
      if (hit) {
        const idx = world.options.rows.findIndex((r) => r.id === hit.id);
        world.options.focus = idx;
        if (world.options.rows[idx].value !== hit.value) {
          world.options.rows[idx].value = hit.value;
          syncVolume(world, hit.id);
        }
      } else if (inRect(CONFIG.OPTIONS_BTN, pointer.x, pointer.y)) {
        closeOptions(world);
      }
    } else if (world.options.focus === 2) {
      closeOptions(world);
    }
  }
```

7. `navMenu` / `escapeAction` — add OPTIONS branches:

```js
  else if (s === States.OPTIONS) moveOptionsFocus(world.options, dir);
```

```js
  else if (s === States.OPTIONS) closeOptions(world);
```

8. New export (below `submitSaveCode`):

```js
export function adjustAction(world, dir) {
  if (world.sm.get() !== States.OPTIONS) return;
  const id = adjust(world.options, dir);
  if (id) syncVolume(world, id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/world.js tests/game/world.test.js
git commit -m "feat(options): world routing — open/close from menu and pause, adjust, volume events"
```

---

### Task 7: OPTIONS rendering

**Files:**
- Create: `src/render/options.js`
- Modify: `src/render/renderer.js` (import + dispatch + hide robot in OPTIONS)
- Test: `tests/render/options.test.js`

**Interfaces:**
- Consumes: `world.options` shape from Task 5/6, `drawButton` from `src/render/buttons.js`, `CONFIG.OPTIONS_*`.
- Produces: `renderOptions(ctx, world, assets)`; renderer dispatches on `States.OPTIONS`; robot hidden in OPTIONS (like MENU/SAVECODE — the veil covers a full-screen UI).

- [ ] **Step 1: Write the failing tests**

Create `tests/render/options.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { renderOptions } from '../../src/render/options.js';
import { createOptions } from '../../src/game/options.js';

function fakeCtx() {
  return {
    drawn: [], texts: [], rects: [], _font: '10px x',
    drawImage(img, ...rest) { this.drawn.push({ img, rest }); },
    fillRect(x, y, w, h) { this.rects.push({ x, y, w, h }); },
    fillText(t) { this.texts.push(t); },
    measureText(t) { return { width: t.length * parseInt(this._font, 10) }; },
    save: vi.fn(), restore: vi.fn(),
    set fillStyle(_) {}, get fillStyle() { return ''; },
    set font(v) { this._font = v; }, get font() { return this._font; },
    set textAlign(_) {}, get textAlign() { return ''; },
    set textBaseline(_) {}, get textBaseline() { return ''; },
    set globalAlpha(_) {}, get globalAlpha() { return 1; },
  };
}

function fakeAssets() {
  const keys = ['btn-plate', 'btn-plate-focus'];
  return Object.fromEntries(keys.map((k) => [k, { key: k }]));
}

describe('renderOptions', () => {
  it('titre, labels des lignes et RETOUR dessinés', () => {
    const ctx = fakeCtx();
    const world = { options: createOptions({ sfx: 7, music: 7 }) };
    renderOptions(ctx, world, fakeAssets());
    expect(ctx.texts[0]).toBe('OPTIONS');
    expect(ctx.texts).toEqual(expect.arrayContaining(['SFX', 'MUSIQUE', 'RETOUR']));
  });

  it('dessine 22 segments (2 lignes x 11) + le voile', () => {
    const ctx = fakeCtx();
    const world = { options: createOptions({ sfx: 5, music: 0 }) };
    renderOptions(ctx, world, fakeAssets());
    // 1 voile plein écran + 22 segments
    expect(ctx.rects.length).toBe(23);
  });

  it('focus RETOUR -> plate focus', () => {
    const ctx = fakeCtx();
    const world = { options: createOptions({ sfx: 7, music: 7 }) };
    world.options.focus = 2;
    renderOptions(ctx, world, fakeAssets());
    expect(ctx.drawn.some((d) => d.img.key === 'btn-plate-focus')).toBe(true);
  });

  it('focus ligne -> plate normale pour RETOUR', () => {
    const ctx = fakeCtx();
    const world = { options: createOptions({ sfx: 7, music: 7 }) };
    renderOptions(ctx, world, fakeAssets());
    expect(ctx.drawn.some((d) => d.img.key === 'btn-plate-focus')).toBe(false);
    expect(ctx.drawn.some((d) => d.img.key === 'btn-plate')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/render/options.test.js`
Expected: FAIL — cannot resolve `../../src/render/options.js`.

- [ ] **Step 3: Write the implementation**

Create `src/render/options.js`:

```js
import { CONFIG } from '../config.js';
import { drawButton } from './buttons.js';

export function renderOptions(ctx, world, assets) {
  // Voile sombre (comme la pause)
  ctx.fillStyle = 'rgba(10,10,20,0.7)';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('OPTIONS', CONFIG.WIDTH / 2, CONFIG.OPTIONS_TITLE_Y);

  const opt = world.options;
  const R = CONFIG.OPTIONS_ROWS;
  for (let r = 0; r < opt.rows.length; r += 1) {
    const row = opt.rows[r];
    const top = R.y0 + r * R.gap;
    const focused = opt.focus === r;

    ctx.font = `12px ${CONFIG.BTN_FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = focused ? '#3ef0ff' : '#ffffff';
    ctx.fillText(row.label, R.x, top + CONFIG.OPTIONS_LABEL_DY);

    for (let k = 0; k < R.count; k += 1) {
      ctx.fillStyle = k <= row.value
        ? (focused ? '#3ef0ff' : '#2bb8c4')
        : 'rgba(62,240,255,0.15)';
      ctx.fillRect(R.x + k * (R.segW + R.segGap), top, R.segW, R.segH);
    }
  }

  drawButton(ctx, CONFIG.OPTIONS_BTN, 'RETOUR', opt.focus === 2 ? 'focus' : 'normal', assets);
}
```

(Segment 0 is always filled since values are 0..10 and `0 <= value` — it reads as "mute = one dim notch at 0", which is intended.)

`src/render/renderer.js`:

1. Import: `import { renderOptions } from './options.js';`
2. Robot-hide condition gains OPTIONS:

```js
  if (hudState !== States.MENU && hudState !== States.SAVECODE && hudState !== States.OPTIONS) {
```

3. Dispatch branch after the SAVECODE branch:

```js
  } else if (state === States.OPTIONS) {
    renderOptions(ctx, world, assets);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/options.js src/render/renderer.js tests/render/options.test.js
git commit -m "feat(render): OPTIONS screen — segmented volume bars + shared RETOUR button"
```

---

### Task 8: Input `onAdjust` + `main.js` wiring

**Files:**
- Modify: `src/engine/input.js`
- Modify: `src/main.js`
- Test: `tests/engine/input.test.js`

**Interfaces:**
- Consumes: `adjustAction` (Task 6), `musicFor` (Task 4), `loadSettings`/`saveSettings`/`volumeToGain` (Task 2), audio channels (Task 3), music WAVs (Task 1), existing `codeInput` gate.
- Produces: `createInput({...}, onPress, onNav, onEscape, onAdjust)` — ArrowLeft/ArrowRight → `onAdjust(-1/+1)`, key-repeat ALLOWED. `main.js`: settings boot, `volsfx`/`volmusic` handling, per-frame `setMusic`.

- [ ] **Step 1: Write the failing test**

Add to `tests/engine/input.test.js`:

```js
  it('ArrowLeft/ArrowRight appellent onAdjust avec -1 / +1, répétition acceptée', () => {
    const target = fakeTarget();
    const win = fakeTarget();
    const onAdjust = vi.fn();
    createInput({ target, win, preventDefault: false }, vi.fn(), vi.fn(), vi.fn(), onAdjust);
    win.fire('keydown', { code: 'ArrowLeft', repeat: false });
    win.fire('keydown', { code: 'ArrowRight', repeat: true }); // repeat OK
    expect(onAdjust).toHaveBeenNthCalledWith(1, -1);
    expect(onAdjust).toHaveBeenNthCalledWith(2, 1);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/input.test.js`
Expected: FAIL — `onAdjust` never called.

- [ ] **Step 3: Write the implementation**

`src/engine/input.js` — signature gains a 5th callback:

```js
export function createInput({ target, win = window, preventDefault = true }, onPress, onNav = () => {}, onEscape = () => {}, onAdjust = () => {}) {
```

In `handleKey`, add before the closing brace (after the Escape branch):

```js
    } else if (e.code === 'ArrowLeft') {
      if (preventDefault && e.preventDefault) e.preventDefault();
      onAdjust(-1);
    } else if (e.code === 'ArrowRight') {
      if (preventDefault && e.preventDefault) e.preventDefault();
      onAdjust(1);
    }
```

(No `!e.repeat` guard — holding the key sweeps the bar.)

`src/main.js`:

1. Imports — extend:

```js
import { createWorld, press, navMenu, escapeAction, updateWorld, submitSaveCode, adjustAction } from './game/world.js';
import { saveSettings, volumeToGain } from './game/settings.js';
import { musicFor } from './game/music.js';
import music0Url from '../assets/music-0.wav';
import music1Url from '../assets/music-1.wav';
import music2Url from '../assets/music-2.wav';
```

2. `createAudio` sources gain the tracks:

```js
const audio = createAudio({
  thrust: thrustUrl, score: scoreUrl, crash: crashUrl,
  'music-0': music0Url, 'music-1': music1Url, 'music-2': music2Url,
});
```

3. After the `const world = createWorld(...)` line, apply boot volumes:

```js
audio.setSfxVolume(volumeToGain(world.settings.sfx));
audio.setMusicVolume(volumeToGain(world.settings.music));
```

(`world.settings` already comes from `loadSettings(storage)` inside `createWorld` — main.js does not import `loadSettings`.)

4. `createInput` gains the gated 5th callback:

```js
createInput(
  { target: canvas, win: window },
  (pointer) => { if (!codeInput.isOpen()) press(world, pointer); },
  (dir) => { if (!codeInput.isOpen()) navMenu(world, dir); },
  () => { if (!codeInput.isOpen()) escapeAction(world); },
  (dir) => { if (!codeInput.isOpen()) adjustAction(world, dir); },
);
```

5. In the update loop's event bridge, add two cases before the final `else`:

```js
        } else if (evt === 'volsfx') {
          saveSettings(world.settings, window.localStorage);
          audio.setSfxVolume(volumeToGain(world.settings.sfx));
          audio.play('score'); // feedback immédiat au nouveau volume
        } else if (evt === 'volmusic') {
          saveSettings(world.settings, window.localStorage);
          audio.setMusicVolume(volumeToGain(world.settings.music));
```

6. After the `world.events.length = 0;` line, add the per-frame music sync:

```js
      audio.setMusic(musicFor(world.sm.get(), world.bgSet));
```

- [ ] **Step 4: Verify suite and build**

Run: `npx vitest run`
Expected: all tests PASS.
Run: `npx vite build`
Expected: build succeeds (the three WAVs are bundled as assets).

- [ ] **Step 5: Commit**

```bash
git add src/engine/input.js src/main.js tests/engine/input.test.js
git commit -m "feat(options): arrow-key adjust input + main wiring (volumes, music per frame)"
```

---

### Task 9: Visual + audio verification (Playwright)

**Files:**
- None modified (verification only; screenshots go to the scratchpad, not the repo).

Playwright is importable from `file:///C:/Setup/Projects/Game/Slop/1st_Slop/node_modules/playwright/index.mjs` (browsers cached).

- [ ] **Step 1: Options screen from menu (fresh profile)**

Start `npx vite --port 5199 --strictPort` (background). Fresh context:
- Menu: OPTIONS now lit. Click OPTIONS → screen with title OPTIONS, rows SFX/MUSIQUE at 7/10 filled segments (8 of 11 lit: indices 0..7), RETOUR button.
- Click segment 3 of SFX row → bar updates; a blip plays (assert no page errors).
- ArrowDown to MUSIQUE, ArrowLeft twice → 5. ArrowDown → RETOUR focused (plate focus), Enter → menu.
- Reload → OPTIONS again → values persisted (3 and 5).

- [ ] **Step 2: Music playback + per-decor switch**

Evaluate in page: find the playing audio element state via `page.evaluate(() => { /* no direct handle */ })` is not possible (Audio objects aren't in DOM) — instead assert behaviourally: NEW GAME → wait 1s → `page.evaluate(() => navigator.userActivation?.hasBeenActive)` is true and no console errors; screenshot HUD. For the switch: use the pause → MENU → CODE flow to enter a level-9 save (`JB1-909`), CONTINUE, and confirm no errors while the level-9 track (bgSet may differ) starts. Music correctness is ultimately confirmed by Jael's manual listen (Step 4).

- [ ] **Step 3: Options from pause + freeze**

NEW GAME → Escape (pause) → click OPTIONS → screen shows over frozen scene; screenshot; adjust MUSIC volume with ArrowRight (live volume change, no errors); Escape → back to PAUSE (screenshot: pause overlay intact); REPRENDRE → play continues.

- [ ] **Step 4: Report + manual listen**

Kill the server. Report screenshots/findings. Ask Jael to run `npx vite` and listen to the three tracks in-game (or `node scripts/music.mjs` output opened directly) before merge — the merge waits on his ear check.
