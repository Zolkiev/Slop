// Bootstrap : canvas, entrées, boucle. Seul module autorisé à toucher le DOM.
import { CARDS } from './game/cards/index.js';
import { createReign, draw as drawNext, choose } from './game/reign.js';
import { createSwipe, dragStart, dragMove, dragEnd } from './game/swipe.js';
import { createLoop } from './engine/loop.js';
import { render, VIEW_W, VIEW_H } from './render/renderer.js';

const ANIM_SPEED = 2600; // px/s d'envol de la carte validée

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- Mise à l'échelle : canvas logique 480x800 adapté à la fenêtre ---
let scale = 1;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${VIEW_W * scale}px`;
  canvas.style.height = `${VIEW_H * scale}px`;
  canvas.width = Math.round(VIEW_W * scale * dpr);
  canvas.height = Math.round(VIEW_H * scale * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// --- État de l'application ---
const app = {
  mode: 'menu', // 'menu' | 'play' | 'dead'
  reign: null,
  swipe: createSwipe(),
  anim: null, // {card, side, dx} — carte validée en cours d'envol
};

function startReign() {
  app.reign = createReign();
  app.anim = null;
  drawNext(app.reign, CARDS);
  app.mode = 'play';
}

function commitChoice(side) {
  const card = app.reign.current;
  if (!card) return;
  // La logique avance tout de suite ; l'envol n'est que visuel.
  app.anim = { card, side, dx: app.swipe.dx };
  choose(app.reign, side);
}

// --- Entrées pointeur ---
let dragOriginX = null;
canvas.addEventListener('pointerdown', (e) => {
  if (app.mode === 'menu' || app.mode === 'dead') return; // géré au pointerup
  if (app.mode === 'play' && app.reign.current && !app.anim) {
    dragOriginX = e.clientX;
    dragStart(app.swipe);
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (dragOriginX !== null) {
    dragMove(app.swipe, (e.clientX - dragOriginX) / scale);
  }
});
canvas.addEventListener('pointerup', () => {
  if (app.mode === 'menu' || app.mode === 'dead') {
    startReign();
    return;
  }
  if (dragOriginX !== null) {
    dragOriginX = null;
    const side = dragEnd(app.swipe);
    if (side) commitChoice(side);
  }
});

// --- Entrées clavier (desktop) ---
window.addEventListener('keydown', (e) => {
  if (app.mode === 'menu' || app.mode === 'dead') {
    if (e.code === 'Space' || e.code === 'Enter') startReign();
    return;
  }
  if (app.mode !== 'play' || !app.reign.current || app.anim) return;
  if (e.code === 'ArrowLeft') commitChoice('left');
  if (e.code === 'ArrowRight') commitChoice('right');
});

// --- Boucle ---
function step(dt) {
  if (app.anim) {
    // envol : la carte file du côté choisi, puis la suivante est piochée
    const dir = app.anim.side === 'left' ? -1 : 1;
    if (app.anim.dx === 0) app.anim.dx = dir * 40;
    app.anim.dx += dir * ANIM_SPEED * dt;
    if (Math.abs(app.anim.dx) > VIEW_W) {
      app.anim = null;
      if (app.reign.dead) app.mode = 'dead';
      else drawNext(app.reign, CARDS);
    }
  }
  render(ctx, app);
}

createLoop(step).start();
