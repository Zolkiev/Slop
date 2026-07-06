import { CONFIG } from '../config.js';
import { drawButtons } from './buttons.js';

export function renderConfirm(ctx, world, assets) {
  // Voile sombre par-dessus le parallax (comme la pause)
  ctx.fillStyle = 'rgba(10,10,20,0.7)';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  // Titre
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('REPARTIR AU NIVEAU 1 ?', CONFIG.WIDTH / 2, CONFIG.CONFIRM_TITLE_Y);

  // Sous-titre
  ctx.font = '14px system-ui';
  ctx.fillText('Les robots débloqués restent', CONFIG.WIDTH / 2, CONFIG.CONFIRM_SUB_Y);

  // Boutons (focus initial sur NON)
  drawButtons(ctx, world.confirm, assets);
}
