#!/usr/bin/env node
// Synthèse des musiques de Logres — zéro dépendance (moteur de patterns du
// 1st_Slop, compositions modales médiévales). 16-bit PCM, mono, 22050 Hz.
//   node scripts/music.mjs
// Boucles calées sur la mesure (bars * 16 pas exactement, pas de fade-out)
// pour un `loop = true` propre. Sortie : assets/music/.
//
// Pistes : menu (contemplatif), roche (aube mystérieuse), camelot (âge d'or),
// mystique (graal + avalon), sombre (la chute), fin (jingle de mort, non bouclé).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'assets', 'music');
const RATE = 22050;

function toWav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
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

// Rendu d'une piste (voir 1st_Slop/scripts/music.mjs pour le format).
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

// Harpe : arpège doux sur les temps. iv = intervalles de l'accord du bar.
const arpNote = (prog, arp) => (bar, step) => {
  if (step % 2 !== 0) return null;
  const c = prog[bar % prog.length];
  return { m: c.root + c.iv[arp[(step / 2) % arp.length]], v: step % 8 === 0 ? 0.9 : 0.6 };
};
// Bourdon : fondamentale + quinte tenues sur toute la mesure.
const droneNote = (prog, offset) => (bar, step) =>
  step === 0 ? { m: prog[bar % prog.length].root - 12 + offset, v: 1 } : null;

// --- menu : Ré dorien contemplatif, 66 BPM, 8 mesures ---
const P_MENU = [
  { root: 50, iv: [0, 3, 7, 12] }, // Dm
  { root: 48, iv: [0, 4, 7, 12] }, // C
  { root: 45, iv: [0, 3, 7, 12] }, // Am
  { root: 48, iv: [0, 4, 7, 12] }, // C
];
const LEAD_MENU = [
  null, null, null, null,
  { 0: { m: 74, v: 0.9 }, 6: { m: 72, v: 0.7 }, 12: { m: 69, v: 0.8 } },
  { 4: { m: 72, v: 0.8 }, 10: { m: 71, v: 0.6 } },
  { 0: { m: 69, v: 0.9 }, 8: { m: 67, v: 0.7 } },
  { 0: { m: 62, v: 0.8 } },
];
const menu = {
  bpm: 66, bars: 8, seed: 7,
  voices: [
    { wave: 'square', vol: 0.05, decay: 0.7, sustain: 16, note: droneNote(P_MENU, 0) },
    { wave: 'square', vol: 0.035, decay: 0.7, sustain: 16, note: droneNote(P_MENU, 7) },
    { wave: 'triangle', vol: 0.17, decay: 5, sustain: 2.5, note: arpNote(P_MENU, [0, 1, 2, 3, 2, 3, 1, 2]) },
    { wave: 'pulse25', vol: 0.055, decay: 3.5, sustain: 3, vibrato: { rate: 4.5, depth: 0.2 },
      note: (bar, step) => LEAD_MENU[bar % 8]?.[step] ?? null },
  ],
};

// --- roche : La éolien, aube froide et mégalithes, 72 BPM, 8 mesures ---
const P_ROCHE = [
  { root: 45, iv: [0, 3, 7] }, // Am
  { root: 45, iv: [0, 3, 7] },
  { root: 43, iv: [0, 4, 7] }, // G
  { root: 41, iv: [0, 4, 7] }, // F
];
const roche = {
  bpm: 72, bars: 8, seed: 11,
  voices: [
    { wave: 'square', vol: 0.055, decay: 0.6, sustain: 16, note: droneNote(P_ROCHE, 0) },
    { wave: 'triangle', vol: 0.15, decay: 4, sustain: 3,
      note: (bar, step) => {
        if (step !== 0 && step !== 6 && step !== 12) return null;
        const c = P_ROCHE[bar % 4];
        const pick = step === 0 ? 0 : step === 6 ? 2 : 1;
        return { m: c.root + c.iv[pick] + 12, v: step === 0 ? 0.85 : 0.55 };
      } },
    // cloche lointaine au début d'une mesure sur deux
    { wave: 'triangle', vol: 0.09, decay: 1.6, sustain: 8,
      note: (bar, step) => (step === 0 && bar % 2 === 0 ? { m: 69, v: 0.7 } : null) },
  ],
};

// --- camelot : Ré majeur lumineux, 84 BPM, 8 mesures ---
const P_CAMELOT = [
  { root: 50, iv: [0, 4, 7, 12] }, // D
  { root: 55, iv: [0, 4, 7, 12] }, // G
  { root: 57, iv: [0, 3, 7, 12] }, // Bm... (57 = A) -> A majeur
  { root: 50, iv: [0, 4, 7, 12] },
];
P_CAMELOT[2].iv = [0, 4, 7, 12]; // A majeur
const LEAD_CAMELOT = [
  { 0: { m: 74, v: 0.9 }, 4: { m: 78, v: 0.7 }, 8: { m: 81, v: 0.9 }, 14: { m: 79, v: 0.6 } },
  { 0: { m: 79, v: 0.8 }, 6: { m: 78, v: 0.6 }, 12: { m: 74, v: 0.7 } },
  { 0: { m: 76, v: 0.9 }, 4: { m: 73, v: 0.6 }, 8: { m: 69, v: 0.8 } },
  { 0: { m: 74, v: 1.0 }, 8: { m: 78, v: 0.6 } },
];
const camelot = {
  bpm: 84, bars: 8, seed: 21,
  voices: [
    { wave: 'square', vol: 0.05, decay: 0.7, sustain: 16, note: droneNote(P_CAMELOT, 0) },
    { wave: 'triangle', vol: 0.16, decay: 6, sustain: 2, note: arpNote(P_CAMELOT, [0, 1, 2, 3, 1, 2, 3, 2]) },
    { wave: 'pulse25', vol: 0.06, decay: 4, sustain: 2.5, vibrato: { rate: 5, depth: 0.25 },
      note: (bar, step) => (bar >= 4 ? LEAD_CAMELOT[bar % 4][step] ?? null : null) },
  ],
  noise: [
    // tambourin discret sur les temps forts
    { vol: 0.035, decay: 40, hit: (bar, step) => step === 0 || step === 8 },
  ],
};

// --- mystique : Mi mineur aérien (graal, avalon), 60 BPM, 8 mesures ---
const P_MYST = [
  { root: 52, iv: [0, 3, 7, 14] }, // Em(add9)
  { root: 50, iv: [0, 4, 7, 14] }, // D(add9)
  { root: 48, iv: [0, 4, 7, 11] }, // Cmaj7
  { root: 50, iv: [0, 4, 7, 14] },
];
const mystique = {
  bpm: 60, bars: 8, seed: 33,
  voices: [
    { wave: 'square', vol: 0.04, decay: 0.5, sustain: 16, note: droneNote(P_MYST, 0) },
    // scintillement haut, clairsemé
    { wave: 'triangle', vol: 0.12, decay: 3, sustain: 4,
      note: (bar, step) => {
        if (step % 4 !== 0) return null;
        const c = P_MYST[bar % 4];
        return { m: c.root + c.iv[(step / 4 + bar) % 4] + 24, v: step === 0 ? 0.7 : 0.45 };
      } },
    { wave: 'pulse25', vol: 0.04, decay: 2, sustain: 6, vibrato: { rate: 3.5, depth: 0.3 },
      note: (bar, step) => (step === 0 && bar % 4 === 0 ? { m: 76, v: 0.8 } : null) },
  ],
};

// --- sombre : Ré phrygien menaçant (la chute), 78 BPM, 8 mesures ---
const P_SOMBRE = [
  { root: 50, iv: [0, 1, 7] }, // D + seconde mineure phrygienne
  { root: 50, iv: [0, 1, 7] },
  { root: 48, iv: [0, 3, 7] }, // Cm
  { root: 46, iv: [0, 3, 7] }, // Bbm -> tension
];
const sombre = {
  bpm: 78, bars: 8, seed: 44,
  voices: [
    // bourdon pulsé en croches, grave
    { wave: 'triangle', vol: 0.19, decay: 7, sustain: 1.6,
      note: (bar, step) => (step % 2 === 0
        ? { m: P_SOMBRE[bar % 4].root - 12, v: step % 8 === 0 ? 1 : 0.7 }
        : null) },
    // seconde phrygienne qui plane
    { wave: 'square', vol: 0.045, decay: 0.8, sustain: 16,
      note: (bar, step) => (step === 0 ? { m: P_SOMBRE[bar % 4].root + 1, v: 0.8 } : null) },
    // glas sourd au début de mesure
    { wave: 'triangle', vol: 0.14, decay: 2.5, sustain: 8, slide: -0.5,
      note: (bar, step) => (step === 0 && bar % 2 === 1 ? { m: 38, v: 0.9 } : null) },
  ],
  noise: [
    { vol: 0.05, decay: 18, sustain: 1.2, hit: (bar, step) => step === 8 }, // souffle sourd
  ],
};

// --- fin : jingle de mort, lamento descendant non bouclé, 4 mesures ---
const FIN_NOTES = [
  { 0: { m: 74, v: 1.0 }, 8: { m: 72, v: 0.8 } },
  { 0: { m: 70, v: 0.9 }, 8: { m: 69, v: 0.7 } },
  { 0: { m: 65, v: 0.8 } },
  { 0: { m: 62, v: 0.9 } },
];
const fin = {
  bpm: 60, bars: 4, seed: 55,
  voices: [
    { wave: 'square', vol: 0.05, decay: 0.5, sustain: 16,
      note: (bar, step) => (step === 0 ? { m: 38, v: 1 } : null) },
    { wave: 'triangle', vol: 0.2, decay: 2, sustain: 8,
      note: (bar, step) => FIN_NOTES[bar]?.[step] ?? null },
  ],
};

mkdirSync(OUT, { recursive: true });
const tracks = { menu, roche, camelot, mystique, sombre, fin };
for (const [name, track] of Object.entries(tracks)) {
  const file = join(OUT, `${name}.wav`);
  writeFileSync(file, toWav(render(track)));
  console.log('OK', file, `${track.bars} mesures @ ${track.bpm} BPM`);
}
