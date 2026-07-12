// Rendu des 4 jauges du royaume : lancettes de vitrail (verre coloré serti
// de plomb, filet d'or) + animations — remplissage lissé, glow doré quand la
// jauge monte, flash rouge quand elle descend, liseré pulsant près d'une mort.
import { GAUGES, GAUGE_MAX } from '../config.js';
import { gaugeIcon } from '../engine/assets.js';

const ICON_SIZE = 26;
const FLASH_MS = 700;

const COLORS = {
  foi: '#e8c96a',
  magie: '#9a6ae8',
  chevalerie: '#6aa8e8',
  couronne: '#e86a6a',
};

const LEAD = '#0e0b14';
const GLASS_EMPTY = '#1a1524';
const GOLD = 'rgba(201,162,39,0.55)';

// État d'animation par jauge : valeur affichée (lissée) + flash en cours.
// Module-level : drawGauges est appelé chaque frame, pas besoin de dt.
const anim = new Map();

// Lancette gothique : colonne étroite terminée en pointe.
function lancetPath(ctx, x, y, w, h) {
  const rise = w * 0.9; // hauteur de la pointe
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + rise);
  ctx.quadraticCurveTo(x, y + rise * 0.2, x + w / 2, y);
  ctx.quadraticCurveTo(x + w, y + rise * 0.2, x + w, y + rise);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

// Petit losange (aperçu d'impact pendant le drag).
function diamond(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s, y);
  ctx.closePath();
}

/**
 * Dessine la rangée de jauges en haut de l'écran.
 * `previewEffects` (optionnel) : effets du choix prévisualisé — un losange
 * s'affiche au-dessus des jauges impactées (gros losange si |effet| > 8).
 */
export function drawGauges(ctx, gauges, W, previewEffects = null) {
  const now = performance.now();
  const n = GAUGES.length;
  const slot = W / n;
  const barW = 16;
  const barH = 54;
  const top = 32;

  for (let i = 0; i < n; i++) {
    const g = GAUGES[i];
    const cx = slot * i + slot / 2;
    const target = gauges[g.key];

    // suivi d'animation : lissage du remplissage + déclenchement du flash
    let a = anim.get(g.key);
    if (!a) {
      a = { shown: target, target, flashUntil: 0, dir: 0 };
      anim.set(g.key, a);
    }
    if (target !== a.target) {
      a.dir = Math.sign(target - a.target);
      a.flashUntil = now + FLASH_MS;
      a.target = target;
    }
    a.shown += (a.target - a.shown) * 0.15;
    if (Math.abs(a.target - a.shown) < 0.05) a.shown = a.target;
    const flash = Math.max(0, (a.flashUntil - now) / FLASH_MS); // 1 -> 0

    // icône vitrail (fallback : emoji tant que l'image n'est pas chargée)
    const icon = gaugeIcon(g.key);
    if (icon) {
      const smoothing = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(icon, cx - ICON_SIZE / 2, top - 16 - ICON_SIZE / 2, ICON_SIZE, ICON_SIZE);
      ctx.imageSmoothingEnabled = smoothing;
    } else {
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(g.icon, cx, top - 16);
    }

    const x = cx - barW / 2;

    // verre vide (fond sombre de la lancette)
    lancetPath(ctx, x, top, barW, barH);
    ctx.fillStyle = GLASS_EMPTY;
    ctx.fill();

    // remplissage : verre coloré (du bas vers le haut), clippé à la lancette
    const h = (barH - 2) * (a.shown / GAUGE_MAX);
    ctx.save();
    lancetPath(ctx, x, top, barW, barH);
    ctx.clip();
    if (flash > 0) {
      ctx.shadowColor = a.dir > 0 ? '#ffe9a0' : '#ff4444';
      ctx.shadowBlur = 14 * flash;
    }
    ctx.fillStyle = COLORS[g.key];
    ctx.fillRect(x, top + barH - h, barW, h);
    // reflet du verre : fine bande claire sur le bord gauche du remplissage
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x + 2, top + barH - h, 3, h);
    ctx.restore();

    // sertissage : plomb épais + filet d'or
    lancetPath(ctx, x, top, barW, barH);
    ctx.strokeStyle = LEAD;
    ctx.lineWidth = 3;
    ctx.stroke();
    lancetPath(ctx, x - 2.5, top - 2.5, barW + 5, barH + 5);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1;
    ctx.stroke();

    // écho du flash sur le sertissage
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.9;
      lancetPath(ctx, x - 2.5, top - 2.5, barW + 5, barH + 5);
      ctx.strokeStyle = a.dir > 0 ? '#ffe9a0' : '#ff4444';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // liseré pulsant quand la jauge frôle une mort (vide ou trop pleine)
    if (target <= 15 || target >= 85) {
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(now / 140);
      lancetPath(ctx, x - 4, top - 4, barW + 8, barH + 8);
      ctx.strokeStyle = '#ff5555';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // aperçu d'impact : losange au-dessus de l'icône
    const impact = previewEffects?.[g.key];
    if (impact) {
      const s = Math.abs(impact) > 8 ? 6 : 4;
      diamond(ctx, cx, top - 38, s);
      ctx.fillStyle = '#f5f0e6';
      ctx.fill();
      ctx.strokeStyle = LEAD;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}
