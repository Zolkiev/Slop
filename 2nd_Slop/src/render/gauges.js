// Rendu des 4 jauges du royaume + aperçu des impacts pendant le drag.
import { GAUGES, GAUGE_MAX } from '../config.js';

const COLORS = {
  foi: '#e8c96a',
  magie: '#9a6ae8',
  chevalerie: '#6aa8e8',
  couronne: '#e86a6a',
};

/**
 * Dessine la rangée de jauges en haut de l'écran.
 * `previewEffects` (optionnel) : effets du choix prévisualisé — un point
 * s'affiche au-dessus des jauges impactées (gros point si |effet| > 8).
 */
export function drawGauges(ctx, gauges, W, previewEffects = null) {
  const n = GAUGES.length;
  const slot = W / n;
  const barW = 10;
  const barH = 46;
  const top = 34;

  for (let i = 0; i < n; i++) {
    const g = GAUGES[i];
    const cx = slot * i + slot / 2;
    const value = gauges[g.key] / GAUGE_MAX;

    // icône
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(g.icon, cx, top - 14);

    // fond de barre
    ctx.fillStyle = '#221d30';
    ctx.fillRect(cx - barW / 2, top, barW, barH);

    // remplissage (du bas vers le haut)
    const h = Math.round(barH * value);
    ctx.fillStyle = COLORS[g.key];
    ctx.fillRect(cx - barW / 2, top + barH - h, barW, h);

    // liseré d'alerte quand la jauge frôle une mort
    if (gauges[g.key] <= 15 || gauges[g.key] >= 85) {
      ctx.strokeStyle = '#ff5555';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - barW / 2 - 2, top - 2, barW + 4, barH + 4);
    }

    // aperçu d'impact : point au-dessus de l'icône
    const impact = previewEffects?.[g.key];
    if (impact) {
      const r = Math.abs(impact) > 8 ? 5 : 3;
      ctx.fillStyle = '#f5f0e6';
      ctx.beginPath();
      ctx.arc(cx, top - 32, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
