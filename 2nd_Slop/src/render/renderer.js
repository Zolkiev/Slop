// Rendu principal : dispatch par mode (menu / play / dead), décor par ère, HUD.
import { ERAS } from '../config.js';
import { drawGauges } from './gauges.js';
import { drawCard } from './card.js';
import { previewSide } from '../game/swipe.js';
import { wrapText, drawLines } from './text.js';

export const VIEW_W = 480;
export const VIEW_H = 800;

// Ambiances de fond par ère (gradient haut -> bas), en attendant les décors PixelLab.
const ERA_BG = {
  roche: ['#1c2233', '#0d0b14'],
  camelot: ['#332a1c', '#141008'],
  graal: ['#22303a', '#0b1014'],
  chute: ['#331c1c', '#140808'],
  avalon: ['#26203a', '#0e0a18'],
};

function eraName(eraId) {
  return ERAS.find((e) => e.id === eraId)?.name ?? '';
}

function drawBackground(ctx, eraId) {
  const [top, bottom] = ERA_BG[eraId] ?? ERA_BG.roche;
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawMenu(ctx) {
  drawBackground(ctx, 'roche');
  ctx.fillStyle = '#f5f0e6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px serif';
  ctx.fillText('LOGRES', VIEW_W / 2, 260);
  ctx.font = '20px serif';
  ctx.fillStyle = '#b8b0c8';
  ctx.fillText('Un royaume. Quatre pouvoirs. Un geste.', VIEW_W / 2, 330);
  ctx.font = 'bold 22px serif';
  ctx.fillStyle = '#e8c96a';
  ctx.fillText('— Tape pour régner —', VIEW_W / 2, 520);
}

function drawPlay(ctx, app) {
  const { reign, swipe, anim } = app;
  drawBackground(ctx, reign.era);

  // aperçu du choix pendant le drag
  const side = anim ? anim.side : previewSide(swipe);
  const card = anim ? anim.card : reign.current;
  const effects = side && card ? card[side].effects : null;

  drawGauges(ctx, reign.gauges, VIEW_W, effects);

  if (card) {
    const dx = anim ? anim.dx : swipe.dx;
    drawCard(ctx, {
      card,
      dx,
      previewSide: side,
      centerX: VIEW_W / 2,
      centerY: VIEW_H / 2 + 10,
    });
  }

  // HUD bas : année + ère
  ctx.fillStyle = '#b8b0c8';
  ctx.font = '16px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`An ${reign.years} — ${eraName(reign.era)}`, VIEW_W / 2, VIEW_H - 36);
}

function drawDead(ctx, app) {
  const { reign } = app;
  drawBackground(ctx, reign.era);
  ctx.fillStyle = '#f5f0e6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 40px serif';
  ctx.fillText('FIN DU RÈGNE', VIEW_W / 2, 220);

  ctx.font = '19px serif';
  ctx.fillStyle = '#d8d0e0';
  const lines = wrapText(ctx, reign.dead.cause, VIEW_W - 100);
  drawLines(ctx, lines, VIEW_W / 2, 300, 28);

  ctx.font = 'bold 24px serif';
  ctx.fillStyle = '#e8c96a';
  ctx.fillText(`Tu as régné ${reign.years} an${reign.years > 1 ? 's' : ''}.`, VIEW_W / 2, 430);

  ctx.font = '20px serif';
  ctx.fillStyle = '#b8b0c8';
  ctx.fillText('— Tape pour un nouveau règne —', VIEW_W / 2, 560);
}

export function render(ctx, app) {
  if (app.mode === 'menu') drawMenu(ctx);
  else if (app.mode === 'play') drawPlay(ctx, app);
  else if (app.mode === 'dead') drawDead(ctx, app);
}
