// Rendu principal : dispatch par mode (menu / play / dead), décor par ère, HUD.
import { ERAS } from '../config.js';
import { KINGS, isUnlocked } from '../game/dynasty.js';
import { heldRelics } from '../game/relics.js';
import { encodeSave } from '../game/save.js';
import { portraitFor, cardArt, backgroundFor, cardPlate, relicIcon } from '../engine/assets.js';
import { TITLE, TEXT } from './fonts.js';
import { hasFlag } from '../game/flags.js';
import { drawShatter } from './shatter.js';
import { drawGauges } from './gauges.js';
import { drawCard, feminizeCard } from './card.js';
import { drawPause, drawPauseButton, drawSoundButton, drawButton, drawConfirm, CONFIRM_UI } from './pause.js';
import { drawCombatScene, COMBAT_CARD_SHIFT } from './combat.js';
import { previewSide, SWIPE_PREVIEW, SWIPE_COMMIT } from '../game/swipe.js';
import { wrapText, drawLines } from './text.js';
import { drawTutorial } from './tutorial.js';

export const VIEW_W = 480;
export const VIEW_H = 800;

// Boutons du menu affichés quand un règne est en cours (hit-test dans main.js).
export const MENU_UI = {
  continue: { x: 90, y: 500, w: 300, h: 56 },
  newReign: { x: 120, y: 572, w: 240, h: 40 },
};

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
  ctx.font = `700 58px ${TITLE}`;
  ctx.fillText('LOGRES', VIEW_W / 2, 200);
  ctx.font = `italic 400 20px ${TEXT}`;
  ctx.fillStyle = '#b8b0c8';
  ctx.fillText('Un royaume. Quatre pouvoirs. Un geste.', VIEW_W / 2, 262);

  if (progress.best > 0) {
    ctx.font = `700 20px ${TEXT}`;
    ctx.fillStyle = '#e8c96a';
    ctx.fillText(`Record : ${progress.best} ans de règne`, VIEW_W / 2, 330);
  }

  if (app.savedReign) {
    const r = app.savedReign;
    const kingName = KINGS[r.king]?.name ?? 'ARTHUR';
    ctx.fillStyle = '#b8b0c8';
    ctx.font = `400 18px ${TEXT}`;
    ctx.fillText(`${kingName} — an ${r.years} de règne`, VIEW_W / 2, 456);

    drawButton(ctx, MENU_UI.continue, 'CONTINUER', { primary: true });
    drawButton(ctx, MENU_UI.newReign, 'Nouveau règne');
  } else {
    // sélecteur de lignée (existant)
    const king = KINGS[progress.king];
    const unlocked = isUnlocked(king, progress.best);
    ctx.font = `400 26px ${TEXT}`;
    ctx.fillStyle = '#b8b0c8';
    ctx.fillText('‹', VIEW_W * 0.15, 440);
    ctx.fillText('›', VIEW_W * 0.85, 440);
    if (unlocked) {
      ctx.fillStyle = '#f5f0e6';
      ctx.font = `700 26px ${TITLE}`;
      ctx.fillText(king.name, VIEW_W / 2, 425);
      ctx.font = `400 18px ${TEXT}`;
      ctx.fillStyle = '#b8b0c8';
      ctx.fillText(king.title, VIEW_W / 2, 458);
    } else {
      ctx.fillStyle = '#6a6478';
      ctx.font = `700 26px ${TITLE}`;
      ctx.fillText('? ? ?', VIEW_W / 2, 425);
      ctx.font = `400 17px ${TEXT}`;
      ctx.fillText(`Règne ${king.unlock} ans pour éveiller cette lignée`, VIEW_W / 2, 458);
    }
    ctx.font = `700 21px ${TEXT}`;
    ctx.fillStyle = unlocked ? '#e8c96a' : '#6a6478';
    ctx.fillText('— Tape pour régner —', VIEW_W / 2, 560);
  }

  // code de sauvegarde (partage entre appareils, sans compte)
  ctx.font = `400 16px ${TEXT}`;
  ctx.fillStyle = '#8a8298';
  ctx.fillText(`CODE : ${encodeSave(progress)}`, VIEW_W / 2, VIEW_H - 60);
  ctx.font = `400 14px ${TEXT}`;
  ctx.fillText('touche le code pour restaurer une progression', VIEW_W / 2, VIEW_H - 36);
  drawSoundButton(ctx);
}

function drawRelics(ctx, flags) {
  const relics = heldRelics(flags);
  relics.forEach((r, i) => {
    const icon = relicIcon(r.key);
    if (icon) {
      const smoothing = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(icon, VIEW_W - 38, 98 + i * 30, 24, 24);
      ctx.imageSmoothingEnabled = smoothing;
    } else {
      ctx.font = '18px serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.icon, VIEW_W - 14, 110 + i * 26);
    }
  });
}

function drawMiracle(ctx, message) {
  ctx.fillStyle = 'rgba(232,201,106,0.92)';
  ctx.fillRect(0, 120, VIEW_W, 40);
  ctx.fillStyle = '#2a2438';
  ctx.font = `700 15px ${TEXT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, VIEW_W / 2, 140);
}

function drawPlay(ctx, app) {
  const { reign, swipe, anim } = app;
  drawBackground(ctx, reign.era);

  // aperçu du choix pendant le drag — l'illumination des jauges suit le geste
  const side = anim ? anim.side : previewSide(swipe);
  const card = anim ? anim.card : reign.current;
  const effects = side && card ? card[side].effects : null;
  const strength = anim
    ? 1
    : Math.min(1, (Math.abs(swipe.dx) - SWIPE_PREVIEW) / (SWIPE_COMMIT - SWIPE_PREVIEW));

  drawGauges(ctx, reign.gauges, VIEW_W, effects, Math.max(0, strength));
  drawRelics(ctx, reign.flags);
  if (reign.combat) {
    drawCombatScene(ctx, app, VIEW_W, VIEW_H, side, Math.max(0, strength));
  }
  if (reign.miracle) drawMiracle(ctx, reign.miracle);

  if (anim) {
    drawShatter(ctx, anim.shatter);
  } else if (card) {
    drawCard(ctx, {
      card: hasFlag(reign.flags, 'lignee.morgane') ? feminizeCard(card) : card,
      portrait: cardArt(card),
      plate: cardPlate(),
      dx: swipe.dx,
      previewSide: side,
      centerX: VIEW_W / 2,
      centerY: VIEW_H / 2 + (reign.combat ? COMBAT_CARD_SHIFT : 10),
    });
  }

  // HUD bas : année + ère, bouton pause
  ctx.fillStyle = '#b8b0c8';
  ctx.font = `italic 400 17px ${TEXT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`An ${reign.years} — ${eraName(reign.era)}`, VIEW_W / 2, VIEW_H - 36);
  drawPauseButton(ctx);
  if (app.tutorial) drawTutorial(ctx, app.tutorial, VIEW_W, VIEW_H);
}

function drawDead(ctx, app) {
  const { reign, progress, newRecord } = app;
  drawBackground(ctx, reign.era);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#f5f0e6';
  ctx.font = `700 36px ${TITLE}`;
  ctx.fillText('FIN DU RÈGNE', VIEW_W / 2, 200);

  ctx.font = `400 19px ${TEXT}`;
  ctx.fillStyle = '#d8d0e0';
  const lines = wrapText(ctx, reign.dead.cause, VIEW_W - 100);
  drawLines(ctx, lines, VIEW_W / 2, 280, 28);

  ctx.font = `700 22px ${TEXT}`;
  ctx.fillStyle = '#e8c96a';
  ctx.fillText(`Tu as régné ${reign.years} an${reign.years > 1 ? 's' : ''}.`, VIEW_W / 2, 420);

  if (newRecord) {
    ctx.font = `700 20px ${TEXT}`;
    ctx.fillStyle = '#f5f0e6';
    ctx.fillText('⚜ Nouveau record de la lignée ⚜', VIEW_W / 2, 462);
  } else {
    ctx.font = `400 17px ${TEXT}`;
    ctx.fillStyle = '#b8b0c8';
    ctx.fillText(`Record : ${progress.best} ans`, VIEW_W / 2, 462);
  }

  ctx.font = `400 20px ${TEXT}`;
  ctx.fillStyle = '#b8b0c8';
  ctx.fillText('— Tape pour retourner à Camelot —', VIEW_W / 2, 580);

  ctx.font = `400 16px ${TEXT}`;
  ctx.fillStyle = '#8a8298';
  ctx.fillText(`CODE : ${encodeSave(progress)}`, VIEW_W / 2, VIEW_H - 48);
}

export function render(ctx, app) {
  if (app.mode === 'menu') drawMenu(ctx, app);
  else if (app.mode === 'options') {
    drawMenu(ctx, app); // le menu reste visible sous le voile
    drawPause(ctx, app.progress, VIEW_W, VIEW_H, {
      title: 'SONS',
      resumeLabel: 'Fermer',
      showAbandon: false,
    });
  } else if (app.mode === 'play') drawPlay(ctx, app);
  else if (app.mode === 'pause') {
    drawPlay(ctx, app); // la scène reste visible sous le voile
    drawPause(ctx, app.progress, VIEW_W, VIEW_H);
  } else if (app.mode === 'dead') drawDead(ctx, app);
  else if (app.mode === 'confirm') {
    drawMenu(ctx, app);
    drawConfirm(ctx, VIEW_W, VIEW_H);
  }
}
