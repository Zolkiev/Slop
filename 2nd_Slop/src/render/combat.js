// Mise en scène des duels : voile rouge sombre, carte adverse qui te toise,
// blasons de vitrail (points de vie), champion annoncé sous la manœuvre.
// La carte de manœuvre elle-même passe par le circuit normal (drawCard).
import { drawCard } from './card.js';
import { TITLE, TEXT } from './fonts.js';
import { portraitFor, cardPlate } from '../engine/assets.js';
import { previewRound } from '../game/combat.js';

const LEAD = '#0e0b14';
const GOLD = '#c9a227';
const CREAM = '#f5f0e6';
const GLASS_FULL = '#7e2230'; // écu plein : verre rouge
const GLASS_EMPTY = '#1a1524';

/** En combat, la manœuvre descend pour laisser la scène respirer. */
export const COMBAT_CARD_SHIFT = 70;

// Écu de vitrail (blason de vie).
function shieldPath(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h * 0.55);
  ctx.quadraticCurveTo(x + w, y + h * 0.82, x + w / 2, y + h);
  ctx.quadraticCurveTo(x, y + h * 0.82, x, y + h * 0.55);
  ctx.closePath();
}

/**
 * Rangée de blasons. `delta` (négatif = perte, positif = soin) fait pulser en
 * rouge les écus sur le point de tomber, en or celui qui reviendrait.
 */
function drawShields(ctx, x, y, hp, max, delta, strength, now) {
  const pulse = strength * (0.6 + 0.4 * Math.sin(now / 160));
  for (let i = 0; i < max; i += 1) {
    const sx = x + i * 24;
    const filled = i < hp;
    const losing = delta < 0 && filled && i >= hp + delta;
    const gaining = delta > 0 && !filled && i < hp + delta;

    shieldPath(ctx, sx, y, 17, 20);
    ctx.fillStyle = filled ? GLASS_FULL : GLASS_EMPTY;
    ctx.fill();
    if (filled) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; // reflet du verre
      ctx.fillRect(sx + 2, y + 2, 3, 10);
    }
    ctx.strokeStyle = LEAD;
    ctx.lineWidth = 2;
    ctx.stroke();
    shieldPath(ctx, sx - 1.5, y - 1.5, 20, 23);
    ctx.strokeStyle = 'rgba(201,162,39,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if ((losing || gaining) && pulse > 0) {
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = losing ? '#ff4444' : '#ffe9a0';
      ctx.shadowBlur = 10;
      shieldPath(ctx, sx, y, 17, 20);
      ctx.strokeStyle = losing ? '#ff4444' : '#ffe9a0';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}

/**
 * Scène de duel, dessinée entre le décor et la carte de manœuvre.
 * `previewSideName` + `previewStrength` : aperçu pendant le drag.
 */
export function drawCombatScene(ctx, app, W, H, previewSideName, previewStrength) {
  const { reign } = app;
  const c = reign.combat;
  const now = performance.now();

  // voile de sang sur le décor
  ctx.fillStyle = 'rgba(46, 8, 12, 0.4)';
  ctx.fillRect(0, 0, W, H);

  // le nom de l'épreuve, comme un chapitre
  ctx.font = `italic 400 17px ${TEXT}`;
  ctx.fillStyle = '#d8b66a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`— ${c.def.title} —`, W / 2, 108);

  // la carte adverse te toise depuis le haut de la scène
  const s = 0.42;
  ctx.save();
  ctx.scale(s, s);
  drawCard(ctx, {
    card: { speaker: c.def.foe.name, text: '' },
    portrait: portraitFor(c.def.foe.speaker),
    plate: cardPlate(),
    dx: 0,
    previewSide: null,
    centerX: 128 / s,
    centerY: 196 / s,
    hints: false,
  });
  ctx.restore();

  // aperçu : ce que le côté prévisualisé ferait aux blasons
  const delta = previewSideName ? previewRound(reign, previewSideName) : null;

  // l'adversaire : nom + blasons à droite de sa carte
  ctx.font = `700 19px ${TITLE}`;
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'left';
  ctx.fillText(c.def.foe.name.toUpperCase(), 216, 152);
  drawShields(ctx, 216, 170, c.foeHp, c.def.foe.hp, delta ? delta.foe : 0, previewStrength, now);

  // ton champion, annoncé sous la manœuvre
  const champY = H - 66;
  ctx.font = `700 17px ${TITLE}`;
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'left';
  const label = c.champion.isKing ? 'LE ROI' : c.champion.name.toUpperCase();
  ctx.fillText(label, 70, champY);
  const nameW = ctx.measureText(label).width;
  drawShields(ctx, 70 + nameW + 14, champY - 10, c.selfHp, c.def.selfHp, delta ? delta.self : 0, previewStrength, now);
}
