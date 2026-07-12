#!/usr/bin/env node
// Minimal PixelLab API v2 client for Jetpack Bot asset generation.
// Zero dependencies (Node 18+ global fetch). Reads PIXELLAB_API_KEY from .env.
//
// Usage:
//   node scripts/pixellab.mjs generate --description "..." --size 64x64 \
//        --no-bg true --out-dir assets/preview --name robot [--seed 42]
//   node scripts/pixellab.mjs animate --input assets/bg-far/bg1-fumee.png \
//        --action "smoke drifting upward" --frames 16 --out-dir assets/bg-anim \
//        --name bg1-fumee-g [--seed 42]
//   node scripts/pixellab.mjs balance
//
// Saves every returned candidate image as <out-dir>/<name>-<i>.png and verifies
// each is a real PNG. generate-image-v2 returns multiple variations for small
// sizes (≤42px→64, 43-85px→16, 86-170px→4, >170px→1).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function pngSize(buf) {
  // IHDR width/height live at bytes 16..24 in a PNG
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const API = 'https://api.pixellab.ai/v2';
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function loadKey() {
  const env = readFileSync(join(PROJECT_ROOT, '.env'), 'utf8');
  const m = env.match(/^\s*PIXELLAB_API_KEY\s*=\s*(.+?)\s*$/m);
  if (!m) throw new Error('PIXELLAB_API_KEY not found in .env');
  return m[1].replace(/^["']|["']$/g, '');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[(i += 1)] : 'true';
      out[key] = val;
    }
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollJob(key, jobId) {
  for (let attempt = 0; attempt < 210; attempt += 1) {
    await sleep(2000);
    const res = await fetch(`${API}/background-jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`poll failed: ${res.status} ${await res.text()}`);
    const job = await res.json();
    if (job.status === 'completed') return job;
    if (job.status === 'failed') throw new Error(`job failed: ${JSON.stringify(job).slice(0, 400)}`);
    process.stdout.write(`  …${job.status} (${(attempt + 1) * 2}s)\r`);
  }
  throw new Error('job did not complete within timeout');
}

function saveImage(b64, path) {
  const buf = Buffer.from(b64, 'base64');
  const isPng = buf.subarray(0, 8).equals(PNG_SIG);
  writeFileSync(path, buf);
  return { isPng, bytes: buf.length };
}

async function generate(args, key) {
  const [w, h] = (args.size || '64x64').split('x').map(Number);
  const noBg = String(args['no-bg']) !== 'false';
  const body = {
    description: args.description,
    image_size: { width: w, height: h },
    no_background: noBg,
  };
  if (args.seed) body.seed = Number(args.seed);

  console.log(`POST generate-image-v2  ${w}x${h}  no_background=${noBg}`);
  console.log(`  "${args.description}"`);
  const res = await fetch(`${API}/generate-image-v2`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`generate failed: ${res.status} ${await res.text()}`);
  const { background_job_id: jobId } = await res.json();
  console.log(`  job ${jobId} — polling…`);
  const job = await pollJob(key, jobId);

    saveJobImages(job, args);
}

function saveJobImages(job, args) {
  const images = job.last_response?.images || job.images || [];
  if (!images.length) throw new Error(`no images in response: ${JSON.stringify(job).slice(0, 400)}`);

  const outDir = join(PROJECT_ROOT, args['out-dir'] || 'assets/preview');
  mkdirSync(outDir, { recursive: true });
  const name = args.name || 'img';
  console.log(`\n${images.length} candidate(s):`);
  images.forEach((img, i) => {
    const b64 = img.base64 || img;
    const path = join(outDir, `${name}-${i}.png`);
    const { isPng, bytes } = saveImage(b64, path);
    console.log(`  ${name}-${i}.png  ${bytes}B  ${isPng ? 'PNG ✓' : '*** NOT PNG ***'}`);
  });
}

async function poll(args, key) {
  console.log(`Resuming job ${args.job} …`);
  const job = await pollJob(key, args.job);
  saveJobImages(job, args);
}

async function edit(args, key) {
  const inputBuf = readFileSync(join(PROJECT_ROOT, args.input));
  const { width, height } = pngSize(inputBuf);
  const b64 = inputBuf.toString('base64');
  const body = {
    method: 'edit_with_text',
    edit_images: [{ image: { type: 'base64', base64: b64, format: 'png' }, width, height }],
    image_size: { width, height },
    description: args.description,
    no_background: String(args['no-bg']) !== 'false',
  };
  if (args.seed) body.seed = Number(args.seed);

  console.log(`POST edit-images-v2  ${width}x${height}  edit_with_text`);
  console.log(`  "${args.description}"`);
  const res = await fetch(`${API}/edit-images-v2`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`edit failed: ${res.status} ${await res.text()}`);
  const { background_job_id: jobId } = await res.json();
  console.log(`  job ${jobId} — polling…`);
  const job = await pollJob(key, jobId);
  saveJobImages(job, args);
}

async function animate(args, key) {
  const inputBuf = readFileSync(join(PROJECT_ROOT, args.input));
  const { width, height } = pngSize(inputBuf);
  const frames = Number(args.frames || 8);
  if (frames % 2 !== 0 || frames < 4 || frames > 16) throw new Error('frames doit être pair, entre 4 et 16');
  if (width > 256 || height > 256) throw new Error(`entrée ${width}x${height} > 256x256`);
  if (width * height * frames > 524288) throw new Error(`budget pixels dépassé: ${width * height * frames} > 524288`);
  const body = {
    // NB (Task 3): l'API v3 attend first_frame à plat { type, base64, format } —
    // pas l'enveloppe { image, width, height } (confirmé par un 422 en live le 2026-07-08).
    first_frame: { type: 'base64', base64: inputBuf.toString('base64'), format: 'png' },
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

const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const key = loadKey();

if (cmd === 'generate') {
  generate(args, key).catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
  });
} else if (cmd === 'poll') {
  poll(args, key).catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
  });
} else if (cmd === 'edit') {
  edit(args, key).catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
  });
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
} else {
  console.error('usage: pixellab.mjs generate --description "..." --size WxH --no-bg true|false --out-dir DIR --name NAME [--seed N]');
  console.error('       pixellab.mjs poll --job JOB_ID --out-dir DIR --name NAME');
  console.error('       pixellab.mjs edit --input PATH --description "..." --no-bg true|false --out-dir DIR --name NAME [--seed N]');
  console.error('       pixellab.mjs animate --input PATH --action "..." --frames N(pair 4-16) --out-dir DIR --name NAME [--seed N]');
  console.error('       pixellab.mjs balance');
  process.exit(2);
}
