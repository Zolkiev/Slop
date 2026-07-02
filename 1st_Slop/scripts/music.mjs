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
