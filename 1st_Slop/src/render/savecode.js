import { CONFIG } from '../config.js';
import { drawButtons, fitFontSize } from './buttons.js';

export function renderSavecode(ctx, world, assets) {
  // Voile sombre par-dessus le parallax (comme la pause)
  ctx.fillStyle = 'rgba(10,10,20,0.7)';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('SAUVEGARDE', CONFIG.WIDTH / 2, CONFIG.SAVECODE_TITLE_Y);

  const sc = world.savecode;
  const text = sc.code ?? 'PAS DE SAUVEGARDE';
  const size = fitFontSize(ctx, text, CONFIG.WIDTH - 40, 24, CONFIG.BTN_FONT_MIN);
  ctx.font = `${size}px ${CONFIG.BTN_FONT_FAMILY}`;
  ctx.fillStyle = sc.code ? '#3ef0ff' : '#8a94a6';
  ctx.fillText(text, CONFIG.WIDTH / 2, CONFIG.SAVECODE_CODE_Y);

  if (sc.feedbackText && world.menuTick < sc.feedbackUntil) {
    ctx.fillStyle = '#3ef0ff';
    ctx.font = '14px system-ui';
    ctx.fillText(sc.feedbackText, CONFIG.WIDTH / 2, CONFIG.SAVECODE_MSG_Y);
  }

  drawButtons(ctx, sc.menu, assets);
}
