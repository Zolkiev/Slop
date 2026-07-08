import { CONFIG } from '../config.js';
import { foudreAlpha } from '../game/bgevents.js';

function drawFoudre(ctx, e) {
  // Dessiné AVANT le premier plan : le ciel s'illumine, les silhouettes
  // near restent sombres (contre-jour plausible).
  ctx.fillStyle = `rgba(210,225,255,${foudreAlpha(e).toFixed(3)})`;
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
}

function drawEtoile(ctx, e) {
  const hx = e.x0 + e.vx * e.t;
  const hy = e.y0 + e.vy * e.t;
  const norm = Math.hypot(e.vx, e.vy);
  const ux = e.vx / norm;
  const uy = e.vy / norm;
  for (let i = 0; i < 7; i += 1) {
    ctx.globalAlpha = (1 - e.t / e.dur) * (1 - i / 7);
    ctx.fillStyle = i === 0 ? '#eaf6ff' : '#9fd8ff';
    ctx.fillRect(Math.round(hx - ux * i * 5), Math.round(hy - uy * i * 5), 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawOiseaux(ctx, e) {
  const speed = (CONFIG.WIDTH + 60) / e.dur; // la durée EST la traversée
  ctx.fillStyle = 'rgba(40,26,52,0.9)';
  for (let i = 0; i < 5; i += 1) {
    const x = e.dir > 0
      ? -20 + speed * e.t - i * 14
      : CONFIG.WIDTH + 20 - speed * e.t + i * 14;
    const y = e.baseY + (i % 2) * 7 - 3 + Math.sin(e.t * 2 + i) * 4;
    const flap = Math.floor(e.t * 6 + i) % 2; // battement 2 frames
    ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
    ctx.fillRect(Math.round(x) + 2, Math.round(y) - (flap ? 1 : 0), 2, 1);
    ctx.fillRect(Math.round(x) + 4, Math.round(y), 2, 1);
  }
}

function drawTorchere(ctx, e, farOffset) {
  // Le spot est en espace image (bg-far-1 défile) : conversion en espace
  // écran avec repli sur la tuile visible, pour que le halo suive sa cheminée.
  const farOff = farOffset % CONFIG.WIDTH;
  const sx = (((e.spot.x - farOff) % CONFIG.WIDTH) + CONFIG.WIDTH) % CONFIG.WIDTH;
  const env = Math.min(1, e.t / 0.4, (e.dur - e.t) / 0.4); // fondu in/out
  const pulse = 0.5 + 0.5 * Math.sin(e.t * 6);
  const base = 0.26 * env * (0.6 + 0.4 * pulse);
  ctx.fillStyle = '#7dffb0';
  for (const [r, a] of [[14, base * 0.35], [9, base * 0.6], [5, base]]) {
    ctx.globalAlpha = a;
    ctx.fillRect(sx - r, e.spot.y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

export function renderBgEvents(ctx, world) {
  const e = world.bgEvents.event;
  if (!e) return;
  if (e.kind === 'foudre') drawFoudre(ctx, e);
  else if (e.kind === 'etoile') drawEtoile(ctx, e);
  else if (e.kind === 'oiseaux') drawOiseaux(ctx, e);
  else if (e.kind === 'torchere') drawTorchere(ctx, e, world.layers[0].offset);
  // 'rafale' : boost des twinkles, rendu à l'étape 2a du renderer.
}
