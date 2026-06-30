#!/usr/bin/env node
// Synthesize three tiny WAV sound effects for Jetpack Bot — zero dependencies.
// 16-bit PCM, mono, 22050 Hz. Outputs to assets/.
//   node scripts/sfx.mjs

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
  buf.writeUInt32LE(16, 16); // fmt chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

const dur = (sec) => Math.floor(RATE * sec);

// thrust: short upward whoosh — rising sine + a little noise, fast decay
function thrust() {
  const len = dur(0.18);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i += 1) {
    const t = i / RATE;
    const env = Math.exp(-t * 14);
    const freq = 220 + 600 * (i / len); // rising
    const tone = Math.sin(2 * Math.PI * freq * t);
    const noise = (Math.random() * 2 - 1) * 0.3;
    out[i] = (tone * 0.7 + noise) * env * 0.5;
  }
  return out;
}

// score: bright two-step blip (perfect-fifth-ish), quick
function score() {
  const len = dur(0.14);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i += 1) {
    const t = i / RATE;
    const env = Math.exp(-t * 10);
    const freq = i < len / 2 ? 660 : 990;
    out[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
  }
  return out;
}

// crash: noise burst + low descending tone, longer decay
function crash() {
  const len = dur(0.35);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i += 1) {
    const t = i / RATE;
    const env = Math.exp(-t * 8);
    const noise = (Math.random() * 2 - 1);
    const freq = 180 * (1 - 0.5 * (i / len)); // descending
    const tone = Math.sin(2 * Math.PI * freq * t);
    out[i] = (noise * 0.6 + tone * 0.4) * env * 0.6;
  }
  return out;
}

mkdirSync(ASSETS, { recursive: true });
const sfx = { 'sfx-thrust': thrust(), 'sfx-score': score(), 'sfx-crash': crash() };
for (const [name, samples] of Object.entries(sfx)) {
  const path = join(ASSETS, `${name}.wav`);
  writeFileSync(path, toWav(samples));
  console.log(`wrote ${name}.wav  (${samples.length} samples, ${(samples.length / RATE).toFixed(2)}s)`);
}
