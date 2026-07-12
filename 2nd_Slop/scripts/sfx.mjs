#!/usr/bin/env node
// Synthèse des effets sonores de Logres — zéro dépendance (recette 1st_Slop).
// 16-bit PCM, mono, 22050 Hz. Sortie : assets/sfx/.
//   node scripts/sfx.mjs
//
// Palette « vitrail » : verre, cloches, carillons. PRNG déterministe pour des
// assets reproductibles.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'assets', 'sfx');
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

const dur = (sec) => Math.floor(RATE * sec);

// verre : désintégration de la carte — pluie de tintements aigus + souffle
// granuleux qui s'éteint (éclats qui retombent).
function verre() {
  const len = dur(0.65);
  const out = new Float32Array(len);
  const rand = mulberry32(77);
  // ~18 pings de verre étalés sur la vague
  for (let p = 0; p < 18; p += 1) {
    const start = Math.floor(rand() * len * 0.5);
    const freq = 1800 + rand() * 3200;
    const vol = 0.1 + rand() * 0.14;
    const plen = dur(0.05 + rand() * 0.09);
    for (let i = 0; i < plen && start + i < len; i += 1) {
      const t = i / RATE;
      out[start + i] += Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 60) * vol;
    }
  }
  // souffle granuleux (poussière), décroissant
  for (let i = 0; i < len; i += 1) {
    const t = i / RATE;
    out[i] += (rand() * 2 - 1) * 0.12 * Math.exp(-t * 7);
  }
  return out;
}

// tick : micro-clic quand la carte franchit le seuil d'aperçu pendant le drag.
function tick() {
  const len = dur(0.045);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i += 1) {
    const t = i / RATE;
    out[i] = Math.sin(2 * Math.PI * 850 * t) * Math.exp(-t * 90) * 0.35;
  }
  return out;
}

// glas : cloche grave de fin de règne — partiels inharmoniques de cloche,
// longue résonance, un seul coup.
function glas() {
  const len = dur(1.6);
  const out = new Float32Array(len);
  const partials = [
    [110, 1.0, 2.2],
    [110 * 2.0, 0.55, 3.2],
    [110 * 2.76, 0.4, 3.8], // tierce mineure de cloche
    [110 * 4.07, 0.22, 5.0],
    [110 * 5.43, 0.12, 6.5],
  ];
  for (let i = 0; i < len; i += 1) {
    const t = i / RATE;
    let s = 0;
    for (const [f, v, d] of partials) s += Math.sin(2 * Math.PI * f * t) * v * Math.exp(-t * d);
    // attaque métallique brève
    s += (Math.random() * 2 - 1) * 0.15 * Math.exp(-t * 80);
    out[i] = s * 0.4;
  }
  return out;
}

// sacre : carillon ascendant (ré - la - ré) au début d'un règne.
function sacre() {
  const len = dur(0.8);
  const out = new Float32Array(len);
  const notes = [
    [293.66, 0.0], // D4
    [440.0, 0.16], // A4
    [587.33, 0.32], // D5
  ];
  for (const [freq, at] of notes) {
    const start = dur(at);
    for (let i = 0; start + i < len; i += 1) {
      const t = i / RATE;
      const env = Math.exp(-t * 5);
      out[start + i] +=
        (Math.sin(2 * Math.PI * freq * t) * 0.28 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.1) * env;
    }
  }
  return out;
}

// miracle : scintillement aigu (relique, événement béni).
function miracle() {
  const len = dur(0.55);
  const out = new Float32Array(len);
  const notes = [1174.66, 1567.98, 2093.0, 2793.83]; // D6 G6 C7 F7 — shimmer
  notes.forEach((freq, k) => {
    const start = dur(k * 0.07);
    for (let i = 0; start + i < len; i += 1) {
      const t = i / RATE;
      out[start + i] += Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 9) * 0.16;
    }
  });
  return out;
}

mkdirSync(OUT, { recursive: true });
const sounds = { verre, tick, glas, sacre, miracle };
for (const [name, fn] of Object.entries(sounds)) {
  const file = join(OUT, `${name}.wav`);
  writeFileSync(file, toWav(fn()));
  console.log('OK', file);
}
