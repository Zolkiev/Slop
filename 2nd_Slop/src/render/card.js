// Rendu de la carte en jeu : plaque centrale, orateur, dilemme, labels de choix,
// inclinaison pendant le drag et envol à la validation.
import { wrapText, drawLines } from './text.js';

export const CARD_W = 340;
export const CARD_H = 420;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Dessine la carte.
 * @param {object} opts
 *   card          — la carte à afficher
 *   dx            — décalage horizontal du drag (0 au repos)
 *   previewSide   — 'left' | 'right' | null (label de choix affiché)
 *   centerX, centerY — position logique du centre de la carte
 */
export function drawCard(ctx, { card, dx = 0, previewSide = null, centerX, centerY }) {
  const tilt = (dx / 300) * 0.18; // légère rotation façon Reigns

  ctx.save();
  ctx.translate(centerX + dx, centerY);
  ctx.rotate(tilt);

  // plaque
  roundRect(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
  ctx.fillStyle = '#f5f0e6';
  ctx.fill();
  ctx.strokeStyle = '#3a3050';
  ctx.lineWidth = 3;
  ctx.stroke();

  // bandeau orateur
  roundRect(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, 54, 14);
  ctx.fillStyle = '#3a3050';
  ctx.fill();
  ctx.fillStyle = '#f5f0e6';
  ctx.font = 'bold 20px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.speaker.toUpperCase(), 0, -CARD_H / 2 + 28);

  // texte du dilemme
  ctx.fillStyle = '#2a2438';
  ctx.font = '17px serif';
  const lines = wrapText(ctx, card.text, CARD_W - 48);
  drawLines(ctx, lines, 0, -CARD_H / 2 + 92, 24);

  // label du choix prévisualisé
  if (previewSide) {
    const choice = card[previewSide];
    const alpha = Math.min(1, Math.abs(dx) / 70);
    ctx.globalAlpha = alpha;
    roundRect(ctx, -CARD_W / 2 + 24, CARD_H / 2 - 72, CARD_W - 48, 44, 10);
    ctx.fillStyle = previewSide === 'left' ? '#8a3f3f' : '#3f6a8a';
    ctx.fill();
    ctx.fillStyle = '#f5f0e6';
    ctx.font = 'bold 16px serif';
    ctx.fillText(choice.label, 0, CARD_H / 2 - 50);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // indications ← → au repos
  if (!previewSide && dx === 0) {
    ctx.fillStyle = 'rgba(245,240,230,0.35)';
    ctx.font = '26px serif';
    ctx.textAlign = 'center';
    ctx.fillText('‹', centerX - CARD_W / 2 - 24, centerY);
    ctx.fillText('›', centerX + CARD_W / 2 + 24, centerY);
  }
}
