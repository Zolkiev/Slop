// Rendu de la carte en jeu : plaque façon vitrail (plomb sombre, filets d'or,
// fenêtre en arche gothique pour le portrait), orateur, dilemme, labels de choix,
// inclinaison pendant le drag et envol à la validation.
// Référence de style : docs/DESIGN.md §10 (carte showcase vitrail).
import { wrapText, drawLines } from './text.js';
import { TITLE, TEXT } from './fonts.js';

export const CARD_W = 340;
export const CARD_H = 460;
const PORTRAIT_W = 148; // fenêtre en arche : largeur
const PORTRAIT_H = 164; // fenêtre en arche : hauteur totale (pointe comprise)

// Palette vitrail
const LEAD = '#0e0b14'; // plomb (contours)
const PLATE = '#1d1826'; // fond de plaque
const GOLD = '#c9a227'; // filets d'or
const IVORY = '#e8dcc4'; // texte
const GLASS_RED = '#7e2230';
const GLASS_BLUE = '#2b4a7a';
const GLASS_VIOLET = '#4d3370';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Arche gothique en ogive : rectangle dont le haut se termine en pointe.
// La pointe affleure exactement `top` (le rayon en découle).
function archPath(ctx, cx, top, w, h) {
  const rise = h * 0.5; // hauteur de l'ogive au-dessus de la naissance des arcs
  const r = (rise * rise + (w * w) / 4) / w; // pointe à `top` pile
  const springY = top + rise;
  const a = Math.acos((r - w / 2) / r);
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, top + h);
  ctx.lineTo(cx - w / 2, springY);
  ctx.arc(cx - w / 2 + r, springY, r, Math.PI, Math.PI + a, false);
  ctx.arc(cx + w / 2 - r, springY, r, -a, 0, false);
  ctx.lineTo(cx + w / 2, top + h);
  ctx.closePath();
}

// Petit losange de verre serti de plomb (accents de coins).
function glassDiamond(ctx, x, y, s, color) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = LEAD;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Dessine la carte.
 * @param {object} opts
 *   card          — la carte à afficher
 *   portrait      — Image du portrait de l'orateur (ou null : médaillon dessiné)
 *   plate         — Image de plaque vitrail pleine carte (ou null : plaque unie)
 *   dx            — décalage horizontal du drag (0 au repos)
 *   previewSide   — 'left' | 'right' | null (label de choix affiché)
 *   centerX, centerY — position logique du centre de la carte
 */
export function drawCard(ctx, { card, portrait = null, plate = null, dx = 0, previewSide = null, centerX, centerY }) {
  const tilt = (dx / 300) * 0.18; // légère rotation façon Reigns

  ctx.save();
  ctx.translate(centerX + dx, centerY);
  ctx.rotate(tilt);

  // plaque : verrière générée si dispo, sinon plomb uni
  roundRect(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
  if (plate) {
    ctx.save();
    ctx.clip();
    const smoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(plate, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
    ctx.imageSmoothingEnabled = smoothing;
    ctx.restore();
    roundRect(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
  } else {
    ctx.fillStyle = PLATE;
    ctx.fill();
  }
  ctx.strokeStyle = LEAD;
  ctx.lineWidth = 5;
  ctx.stroke();
  roundRect(ctx, -CARD_W / 2 + 7, -CARD_H / 2 + 7, CARD_W - 14, CARD_H - 14, 6);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (!plate) {
    // losanges de verre aux quatre coins (la verrière générée a ses ornements)
    glassDiamond(ctx, -CARD_W / 2 + 22, -CARD_H / 2 + 22, 7, GLASS_RED);
    glassDiamond(ctx, CARD_W / 2 - 22, -CARD_H / 2 + 22, 7, GLASS_VIOLET);
    glassDiamond(ctx, -CARD_W / 2 + 22, CARD_H / 2 - 22, 7, GLASS_VIOLET);
    glassDiamond(ctx, CARD_W / 2 - 22, CARD_H / 2 - 22, 7, GLASS_RED);
  }

  // fenêtre du portrait en arche gothique
  const pTop = -CARD_H / 2 + 24;
  if (portrait) {
    ctx.save();
    archPath(ctx, 0, pTop, PORTRAIT_W, PORTRAIT_H);
    ctx.clip();
    // pixel-art : mise à l'échelle sans lissage ; image carrée calée en bas de l'arche
    const smoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    const s = Math.max(PORTRAIT_W, PORTRAIT_H);
    ctx.drawImage(portrait, -s / 2, pTop + PORTRAIT_H - s, s, s);
    ctx.imageSmoothingEnabled = smoothing;
    ctx.restore();
  } else {
    // fallback : halo doré et initiale de l'orateur dans l'arche
    ctx.save();
    archPath(ctx, 0, pTop, PORTRAIT_W, PORTRAIT_H);
    ctx.clip();
    const halo = ctx.createRadialGradient(0, pTop + PORTRAIT_H * 0.55, 8, 0, pTop + PORTRAIT_H * 0.55, PORTRAIT_W * 0.7);
    halo.addColorStop(0, '#6b5320');
    halo.addColorStop(1, '#241c30');
    ctx.fillStyle = halo;
    ctx.fillRect(-PORTRAIT_W / 2, pTop, PORTRAIT_W, PORTRAIT_H);
    ctx.fillStyle = GOLD;
    ctx.font = `700 52px ${TITLE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // initiale du dernier mot (« Une fée » -> F, pas l'article)
    ctx.fillText(card.speaker.split(' ').pop()[0].toUpperCase(), 0, pTop + PORTRAIT_H * 0.58);
    ctx.restore();
  }
  // sertissage de l'arche : gros plomb + filet d'or
  archPath(ctx, 0, pTop, PORTRAIT_W, PORTRAIT_H);
  ctx.strokeStyle = LEAD;
  ctx.lineWidth = 5;
  ctx.stroke();
  archPath(ctx, 0, pTop - 5, PORTRAIT_W + 10, PORTRAIT_H + 8);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // texte du dilemme (sur voile de plomb si verrière), centré verticalement
  // entre le bas de l'arche et le bandeau du nom
  ctx.font = `400 18px ${TEXT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapText(ctx, card.text, CARD_W - 48);
  const zoneMid = (pTop + PORTRAIT_H + (CARD_H / 2 - 50)) / 2;
  const firstLineY = zoneMid - ((lines.length - 1) * 23) / 2;
  if (plate) {
    roundRect(ctx, -CARD_W / 2 + 14, firstLineY - 22, CARD_W - 28, lines.length * 23 + 22, 8);
    ctx.fillStyle = 'rgba(14,11,20,0.72)';
    ctx.fill();
  }
  ctx.fillStyle = IVORY;
  drawLines(ctx, lines, 0, firstLineY, 23);

  // bandeau orateur en bas : voile de plomb, texte d'or surligné d'un trait de plomb
  if (plate) {
    roundRect(ctx, -CARD_W / 2 + 5, CARD_H / 2 - 49, CARD_W - 10, 44, 6);
    ctx.fillStyle = 'rgba(14,11,20,0.72)';
    ctx.fill();
  }
  ctx.strokeStyle = LEAD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-CARD_W / 2 + 30, CARD_H / 2 - 50);
  ctx.lineTo(CARD_W / 2 - 30, CARD_H / 2 - 50);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.font = `700 19px ${TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.speaker.toUpperCase(), 0, CARD_H / 2 - 27);

  // label du choix prévisualisé : pan de verre serti, au-dessus du bandeau du nom
  if (previewSide) {
    const choice = card[previewSide];
    const alpha = Math.min(1, Math.abs(dx) / 70);
    ctx.globalAlpha = alpha;
    roundRect(ctx, -CARD_W / 2 + 24, CARD_H / 2 - 126, CARD_W - 48, 44, 6);
    ctx.fillStyle = previewSide === 'left' ? GLASS_RED : GLASS_BLUE;
    ctx.fill();
    ctx.strokeStyle = LEAD;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = IVORY;
    ctx.font = `700 17px ${TEXT}`;
    ctx.fillText(choice.label, 0, CARD_H / 2 - 104);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // indications ← → au repos
  if (!previewSide && dx === 0) {
    ctx.fillStyle = 'rgba(201,162,39,0.4)';
    ctx.font = `400 26px ${TEXT}`;
    ctx.textAlign = 'center';
    ctx.fillText('‹', centerX - CARD_W / 2 - 24, centerY);
    ctx.fillText('›', centerX + CARD_W / 2 + 24, centerY);
  }
}
