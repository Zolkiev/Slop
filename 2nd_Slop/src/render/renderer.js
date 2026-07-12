// Rendu principal : dispatch par mode (menu / play / dead), décor par ère, HUD.
import { ERAS } from '../config.js';
import { KINGS, isUnlocked } from '../game/dynasty.js';
import { heldRelics } from '../game/relics.js';
import { encodeSave } from '../game/save.js';
import { portraitFor, backgroundFor } from '../engine/assets.js';
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

function drawBackground(ctx, eraId, dim = 0.35) {
  const img = backgroundFor(eraId);
  if (img) {
    // pixel-art plein cadre, sans lissage, assombri pour la lisibilité
    const smoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, VIEW_W, VIEW_H);
    ctx.imageSmoothingEnabled = smoothing;
    ctx.fillStyle = `rgba(10, 8, 16, ${dim})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return;
  }
  const [top, bottom] = ERA_BG[eraId] ?? ERA_BG.roche;
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawMenu(ctx, app) {
  const { progress } = app;
  drawBackground(ctx, 'roche');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#f5f0e6';
  ctx.font = 'bold 64px serif';
  ctx.fillText('LOGRES', VIEW_W / 2, 200);
  ctx.font = '20px serif';
  ctx.fillStyle = '#b8b0c8';
  ctx.fillText('Un royaume. Quatre pouvoirs. Un geste.', VIEW_W / 2, 262);

  if (progress.best > 0) {
    ctx.font = 'bold 20px serif';
    ctx.fillStyle = '#e8c96a';
    ctx.fillText(`Record : ${progress.best} ans de règne`, VIEW_W / 2, 330);
  }

  // sélecteur de lignée
  const king = KINGS[progress.king];
  const unlocked = isUnlocked(king, progress.best);
  ctx.font = '26px serif';
  ctx.fillStyle = '#b8b0c8';
  ctx.fillText('‹', VIEW_W * 0.15, 440);
  ctx.fillText('›', VIEW_W * 0.85, 440);

  if (unlocked) {
    ctx.fillStyle = '#f5f0e6';
    ctx.font = 'bold 30px serif';
    ctx.fillText(king.name, VIEW_W / 2, 425);
    ctx.font = '18px serif';
    ctx.fillStyle = '#b8b0c8';
    ctx.fillText(king.title, VIEW_W / 2, 458);
  } else {
    ctx.fillStyle = '#6a6478';
    ctx.font = 'bold 30px serif';
    ctx.fillText('? ? ?', VIEW_W / 2, 425);
    ctx.font = '17px serif';
    ctx.fillText(`Règne ${king.unlock} ans pour éveiller cette lignée`, VIEW_W / 2, 458);
  }

  ctx.font = 'bold 22px serif';
  ctx.fillStyle = unlocked ? '#e8c96a' : '#6a6478';
  ctx.fillText('— Tape pour régner —', VIEW_W / 2, 560);

  // code de sauvegarde (partage entre appareils, sans compte)
  ctx.font = '16px serif';
  ctx.fillStyle = '#8a8298';
  ctx.fillText(`CODE : ${encodeSave(progress)}`, VIEW_W / 2, VIEW_H - 60);
  ctx.font = '13px serif';
  ctx.fillText('ajoute #save=CODE à l’adresse du jeu pour restaurer', VIEW_W / 2, VIEW_H - 36);
}

function drawRelics(ctx, flags) {
  const relics = heldRelics(flags);
  relics.forEach((r, i) => {
    ctx.font = '18px serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(r.icon, VIEW_W - 14, 110 + i * 26);
  });
}

function drawMiracle(ctx, message) {
  ctx.fillStyle = 'rgba(232,201,106,0.92)';
  ctx.fillRect(0, 120, VIEW_W, 40);
  ctx.fillStyle = '#2a2438';
  ctx.font = 'bold 15px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, VIEW_W / 2, 140);
}

function drawPlay(ctx, app) {
  const { reign, swipe, anim } = app;
  drawBackground(ctx, reign.era);

  // aperçu du choix pendant le drag
  const side = anim ? anim.side : previewSide(swipe);
  const card = anim ? anim.card : reign.current;
  const effects = side && card ? card[side].effects : null;

  drawGauges(ctx, reign.gauges, VIEW_W, effects);
  drawRelics(ctx, reign.flags);
  if (reign.miracle) drawMiracle(ctx, reign.miracle);

  if (card) {
    const dx = anim ? anim.dx : swipe.dx;
    drawCard(ctx, {
      card,
      portrait: portraitFor(card.speaker),
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
  const { reign, progress, newRecord } = app;
  drawBackground(ctx, reign.era);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#f5f0e6';
  ctx.font = 'bold 40px serif';
  ctx.fillText('FIN DU RÈGNE', VIEW_W / 2, 200);

  ctx.font = '19px serif';
  ctx.fillStyle = '#d8d0e0';
  const lines = wrapText(ctx, reign.dead.cause, VIEW_W - 100);
  drawLines(ctx, lines, VIEW_W / 2, 280, 28);

  ctx.font = 'bold 24px serif';
  ctx.fillStyle = '#e8c96a';
  ctx.fillText(`Tu as régné ${reign.years} an${reign.years > 1 ? 's' : ''}.`, VIEW_W / 2, 420);

  if (newRecord) {
    ctx.font = 'bold 20px serif';
    ctx.fillStyle = '#f5f0e6';
    ctx.fillText('⚜ Nouveau record de la lignée ⚜', VIEW_W / 2, 462);
  } else {
    ctx.font = '17px serif';
    ctx.fillStyle = '#b8b0c8';
    ctx.fillText(`Record : ${progress.best} ans`, VIEW_W / 2, 462);
  }

  ctx.font = '20px serif';
  ctx.fillStyle = '#b8b0c8';
  ctx.fillText('— Tape pour retourner à Camelot —', VIEW_W / 2, 580);

  ctx.font = '16px serif';
  ctx.fillStyle = '#8a8298';
  ctx.fillText(`CODE : ${encodeSave(progress)}`, VIEW_W / 2, VIEW_H - 48);
}

export function render(ctx, app) {
  if (app.mode === 'menu') drawMenu(ctx, app);
  else if (app.mode === 'play') drawPlay(ctx, app);
  else if (app.mode === 'dead') drawDead(ctx, app);
}
