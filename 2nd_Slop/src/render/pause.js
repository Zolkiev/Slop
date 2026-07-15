// Panneau pause : plaque de plomb sombre, filet d'or, curseurs de volume en
// verre coloré (losange de vitrail en poignée). La géométrie est exportée
// (PAUSE_UI) pour le hit-testing des entrées dans main.js.
import { TITLE, TEXT } from './fonts.js';

const LEAD = '#0e0b14';
const PLATE = '#1a1524';
const GOLD = 'rgba(201,162,39,0.85)';
const GLASS = '#e8c96a';
const CREAM = '#f5f0e6';
const MUTED = '#b8b0c8';

// Géométrie logique (canvas 480x800). `pauseButton` est le bouton en jeu.
export const PAUSE_UI = {
  pauseButton: { x: 480 - 46, y: 800 - 52, w: 34, h: 34 },
  panel: { x: 60, y: 210, w: 360, h: 360 },
  sliders: {
    music: { x: 110, y: 320, w: 260, h: 14 },
    sfx: { x: 110, y: 396, w: 260, h: 14 },
  },
  resume: { x: 120, y: 452, w: 240, h: 46 },
  abandon: { x: 120, y: 514, w: 240, h: 38 },
};

function buttonPlate(ctx) {
  const b = PAUSE_UI.pauseButton;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = PLATE;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Bouton pause dessiné par-dessus le HUD de jeu (deux barres verticales). */
export function drawPauseButton(ctx) {
  const b = PAUSE_UI.pauseButton;
  ctx.save();
  buttonPlate(ctx);
  ctx.fillStyle = MUTED;
  ctx.fillRect(b.x + 11, b.y + 10, 4, 14);
  ctx.fillRect(b.x + 19, b.y + 10, 4, 14);
  ctx.restore();
}

/** Bouton sons du menu principal (même pastille, note de musique). */
export function drawSoundButton(ctx) {
  const b = PAUSE_UI.pauseButton;
  ctx.save();
  buttonPlate(ctx);
  ctx.fillStyle = MUTED;
  ctx.font = '18px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♪', b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}

function drawSlider(ctx, zone, label, value) {
  ctx.font = `700 17px ${TEXT}`;
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, zone.x, zone.y - 12);

  // piste : verre vide serti de plomb + filet d'or
  ctx.fillStyle = LEAD;
  ctx.fillRect(zone.x - 2, zone.y - 2, zone.w + 4, zone.h + 4);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  ctx.strokeRect(zone.x - 3.5, zone.y - 3.5, zone.w + 7, zone.h + 7);

  // remplissage : verre doré
  ctx.fillStyle = GLASS;
  ctx.fillRect(zone.x, zone.y, zone.w * value, zone.h);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(zone.x, zone.y, zone.w * value, 3);

  // poignée : losange de vitrail
  const hx = zone.x + zone.w * value;
  const hy = zone.y + zone.h / 2;
  ctx.beginPath();
  ctx.moveTo(hx, hy - 13);
  ctx.lineTo(hx + 9, hy);
  ctx.lineTo(hx, hy + 13);
  ctx.lineTo(hx - 9, hy);
  ctx.closePath();
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.strokeStyle = LEAD;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawButton(ctx, zone, label, { primary = false } = {}) {
  ctx.fillStyle = primary ? 'rgba(201,162,39,0.18)' : 'rgba(14,11,20,0.6)';
  ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
  ctx.strokeStyle = primary ? GOLD : 'rgba(184,176,200,0.4)';
  ctx.lineWidth = primary ? 1.5 : 1;
  ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
  ctx.font = `700 ${primary ? 20 : 16}px ${TEXT}`;
  ctx.fillStyle = primary ? GLASS : MUTED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, zone.x + zone.w / 2, zone.y + zone.h / 2 + 1);
}

/**
 * Overlay pause/options (à dessiner par-dessus la scène courante).
 * Depuis le menu principal : titre « SONS », bouton Fermer, pas d'abandon.
 */
export function drawPause(ctx, { musicVol, sfxVol }, W, H, opts = {}) {
  const { title = 'PAUSE', resumeLabel = 'Reprendre', showAbandon = true } = opts;
  ctx.fillStyle = 'rgba(10,8,16,0.72)';
  ctx.fillRect(0, 0, W, H);

  const p = PAUSE_UI.panel;
  ctx.fillStyle = PLATE;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = LEAD;
  ctx.lineWidth = 5;
  ctx.strokeRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  ctx.strokeRect(p.x + 6, p.y + 6, p.w - 12, p.h - 12);

  ctx.font = `700 30px ${TITLE}`;
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, p.x + p.w / 2, p.y + 52);

  drawSlider(ctx, PAUSE_UI.sliders.music, 'Musique', musicVol);
  drawSlider(ctx, PAUSE_UI.sliders.sfx, 'Effets', sfxVol);
  drawButton(ctx, PAUSE_UI.resume, resumeLabel, { primary: true });
  if (showAbandon) drawButton(ctx, PAUSE_UI.abandon, 'Retour au menu');
}

/** Point (x,y) dans une zone rectangulaire ? */
export function inZone(zone, x, y) {
  return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
}

export const CONFIRM_UI = {
  yes: { x: 250, y: 430, w: 130, h: 46 },
  no: { x: 100, y: 430, w: 130, h: 46 },
};

/** Confirmation « effacer le règne en cours ? » (focus par défaut : Non). */
export function drawConfirm(ctx, W, H) {
  ctx.fillStyle = 'rgba(10,8,16,0.8)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = CREAM;
  ctx.font = `700 26px ${TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Abandonner ce règne ?', W / 2, 340);
  ctx.font = `400 18px ${TEXT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('Ta progression (rois, record) reste acquise.', W / 2, 380);
  drawButton(ctx, CONFIRM_UI.yes, 'Oui');
  drawButton(ctx, CONFIRM_UI.no, 'Non', { primary: true }); // Non = focus/primaire
}
