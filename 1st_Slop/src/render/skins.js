import { CONFIG } from '../config.js';
import { SKINS, skinUnlocked, spriteKey } from '../game/skins.js';
import { drawButtons } from './buttons.js';

// Fabrique du canvas hors-écran — injectable pour les tests (env node).
function defaultMakeCanvas() {
  return document.createElement('canvas');
}

// Silhouette noire du sprite : dessin sur canvas hors-écran puis composite
// source-in (le noir ne reste que sur les pixels opaques du sprite).
function drawSilhouette(ctx, sprite, x, y, size, makeCanvas) {
  const off = makeCanvas();
  off.width = sprite.width;
  off.height = sprite.height;
  const octx = off.getContext('2d');
  octx.clearRect(0, 0, off.width, off.height);
  octx.drawImage(sprite, 0, 0);
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = '#05060a';
  octx.fillRect(0, 0, off.width, off.height);
  octx.globalCompositeOperation = 'source-over';
  ctx.drawImage(off, x, y, size, size);
}

// Écran hangar — dessiné par-dessus le décor parallaxe vivant (comme le menu).
export function renderSkins(ctx, world, assets, makeCanvas = defaultMakeCanvas) {
  const { slot } = world.skinsScreen;
  const unlocked = skinUnlocked(slot, world.score.bestLevel);
  const P = CONFIG.SKINS_PREVIEW;
  const sprite = assets[spriteKey(slot)];

  // Titre (même style que les autres écrans)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('ROBOTS', CONFIG.WIDTH / 2, CONFIG.SKINS_TITLE_Y);

  // Aperçu ×3 — silhouette noire si verrouillé
  if (unlocked) {
    ctx.drawImage(sprite, P.x, P.y, P.size, P.size);
  } else {
    drawSilhouette(ctx, sprite, P.x, P.y, P.size, makeCanvas);
  }

  // Nom du skin (couleur accent) ou niveau requis
  ctx.font = `16px ${CONFIG.BTN_FONT_FAMILY}`;
  ctx.fillStyle = unlocked ? SKINS[slot].accent : CONFIG.BTN_TEXT_DISABLED;
  ctx.fillText(
    unlocked ? SKINS[slot].name : `NIVEAU ${CONFIG.PATTERN_TIERS[slot]}`,
    CONFIG.WIDTH / 2, CONFIG.SKINS_NAME_Y,
  );

  // Flèches < > (les zones tap correspondantes vivent dans world.press)
  const A = CONFIG.SKINS_ARROW;
  ctx.font = `24px ${CONFIG.BTN_FONT_FAMILY}`;
  ctx.fillStyle = '#3ef0ff';
  ctx.fillText('<', A.lx + A.w / 2, A.y + A.h / 2 + 8);
  ctx.fillText('>', A.rx + A.w / 2, A.y + A.h / 2 + 8);

  drawButtons(ctx, world.skinsScreen.menu, assets);
}
