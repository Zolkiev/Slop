// Bulle de coach-mark (parchemin bordé d'or, voix de Merlin). Ancrée près de la
// carte (bas) ou des jauges (haut) selon l'étape.
import { TEXT } from './fonts.js';
import { currentStep } from '../game/tutorial.js';
import { wrapText, drawLines } from './text.js';

export function drawTutorial(ctx, tuto, W, H) {
  const step = currentStep(tuto);
  if (!step) return;

  const boxW = W - 64;
  const x = 32;
  const y = step.anchor === 'gauges' ? 92 : H - 250;

  ctx.save();
  ctx.font = `italic 400 18px ${TEXT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const lines = wrapText(ctx, step.text, boxW - 40);
  const boxH = 34 + lines.length * 24;

  // parchemin
  ctx.fillStyle = 'rgba(26,21,36,0.94)';
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeStyle = 'rgba(201,162,39,0.85)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, boxW, boxH);

  // « Merlin » en cartouche
  ctx.fillStyle = '#e8c96a';
  ctx.font = `700 13px ${TEXT}`;
  ctx.fillText('MERLIN', W / 2, y + 8);

  // texte
  ctx.fillStyle = '#f5f0e6';
  ctx.font = `italic 400 18px ${TEXT}`;
  drawLines(ctx, lines, W / 2, y + 34, 24);
  ctx.restore();
}
