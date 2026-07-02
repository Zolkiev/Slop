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
