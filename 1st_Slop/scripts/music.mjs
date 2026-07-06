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
// Riff de 2 mesures (clé = pas 0..15) — hits 0/3/6/8/11/14 puis 0/3/6/10/12/14, sixte phrygienne au sommet.
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

mkdirSync(ASSETS, { recursive: true });
const tracks = {
  'music-0': music0, 'music-1': music1, 'music-2': music2,
  'music-3': music3, 'music-4': music4,
  'music-menu': musicMenu, 'jingle-gameover': jingleGameover,
};
for (const [name, track] of Object.entries(tracks)) {
  const samples = render(track);
  writeFileSync(join(ASSETS, `${name}.wav`), toWav(samples));
  console.log(`wrote ${name}.wav  (${(samples.length / RATE).toFixed(1)}s, ${track.bpm} BPM, ${track.bars} bars)`);
}
