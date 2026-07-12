// Désintégration de la carte validée : la carte est capturée dans un canvas
// offscreen puis découpée en tuiles carrées (poussière de verre pixel art).
// Une vague part du bord côté swipe ; chaque tuile s'envole, retombe et
// s'estompe. La logique de jeu a déjà avancé : tout ceci n'est que visuel.
import { drawCard, CARD_W, CARD_H } from './card.js';

const TILE = 12; // côté des carrés de poussière (px logiques)
const WAVE = 0.26; // durée de la vague de désintégration (s)
const FADE = 0.5; // durée de vie d'une tuile une fois détachée (s)
const GRAVITY = 720; // px/s²

/**
 * Capture la carte telle qu'elle est à l'écran et prépare les tuiles.
 * `dx` est le décalage de drag au moment du lâcher (0 au clavier).
 */
export function createShatter({ card, portrait, plate, dx, side, centerX, centerY, viewW, viewH }) {
  const off = document.createElement('canvas');
  off.width = viewW;
  off.height = viewH;
  const octx = off.getContext('2d');
  drawCard(octx, { card, portrait, plate, dx, previewSide: side, centerX, centerY });

  // grille limitée à la boîte de la carte (marge pour l'inclinaison du drag)
  const half = CARD_W / 2 + 70;
  const x0 = Math.max(0, Math.floor((centerX + dx - half) / TILE) * TILE);
  const x1 = Math.min(viewW, centerX + dx + half);
  const y0 = Math.max(0, Math.floor((centerY - CARD_H / 2 - 70) / TILE) * TILE);
  const y1 = Math.min(viewH, centerY + CARD_H / 2 + 70);
  const data = octx.getImageData(x0, y0, x1 - x0, y1 - y0);

  const dir = side === 'left' ? -1 : 1;
  const tiles = [];
  for (let y = y0; y + TILE <= y1; y += TILE) {
    for (let x = x0; x + TILE <= x1; x += TILE) {
      // tuile vide ? (alpha du pixel central)
      const px = ((y - y0 + TILE / 2) * data.width + (x - x0 + TILE / 2)) * 4 + 3;
      if (data.data[px] === 0) continue;
      // la vague part du bord vers lequel la carte s'en va
      const across = dir > 0 ? (x1 - x) / (x1 - x0) : (x - x0) / (x1 - x0);
      tiles.push({
        sx: x, sy: y, // source dans la capture
        x, y,
        vx: dir * (240 + Math.random() * 420) + (Math.random() - 0.5) * 120,
        vy: -90 + Math.random() * 180,
        spin: Math.random() < 0.4 ? (Math.random() - 0.5) * 6 : 0,
        delay: across * WAVE + Math.random() * 0.05,
      });
    }
  }
  return { off, tiles, t: 0, duration: WAVE + 0.05 + FADE };
}

/** Avance la physique ; renvoie true quand l'animation est finie. */
export function updateShatter(sh, dt) {
  sh.t += dt;
  for (const tile of sh.tiles) {
    if (sh.t <= tile.delay) continue;
    tile.x += tile.vx * dt;
    tile.y += tile.vy * dt;
    tile.vy += GRAVITY * dt;
  }
  return sh.t >= sh.duration;
}

export function drawShatter(ctx, sh) {
  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  for (const tile of sh.tiles) {
    const local = sh.t - tile.delay;
    if (local <= 0) {
      // pas encore détachée : la tuile est toujours en place
      ctx.drawImage(sh.off, tile.sx, tile.sy, TILE, TILE, tile.sx, tile.sy, TILE, TILE);
      continue;
    }
    const alpha = 1 - local / FADE;
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha;
    if (tile.spin !== 0) {
      // légère rotation autour du centre de la tuile
      ctx.save();
      ctx.translate(tile.x + TILE / 2, tile.y + TILE / 2);
      ctx.rotate(tile.spin * local);
      ctx.drawImage(sh.off, tile.sx, tile.sy, TILE, TILE, -TILE / 2, -TILE / 2, TILE, TILE);
      ctx.restore();
    } else {
      ctx.drawImage(sh.off, tile.sx, tile.sy, TILE, TILE, tile.x, tile.y, TILE, TILE);
    }
  }
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = smoothing;
}
