import { CONFIG } from '../config.js';
import { drawButton } from './buttons.js';

export function renderOptions(ctx, world, assets) {
  // Voile sombre (comme la pause)
  ctx.fillStyle = 'rgba(10,10,20,0.7)';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('OPTIONS', CONFIG.WIDTH / 2, CONFIG.OPTIONS_TITLE_Y);

  const opt = world.options;
  const R = CONFIG.OPTIONS_ROWS;
  for (let r = 0; r < opt.rows.length; r += 1) {
    const row = opt.rows[r];
    const top = R.y0 + r * R.gap;
    const focused = opt.focus === r;

    ctx.font = `12px ${CONFIG.BTN_FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = focused ? '#3ef0ff' : '#ffffff';
    ctx.fillText(row.label, R.x, top + CONFIG.OPTIONS_LABEL_DY);

    for (let k = 0; k < R.count; k += 1) {
      ctx.fillStyle = k <= row.value
        ? (focused ? '#3ef0ff' : '#2bb8c4')
        : 'rgba(62,240,255,0.15)';
      ctx.fillRect(R.x + k * (R.segW + R.segGap), top, R.segW, R.segH);
    }
  }

  drawButton(ctx, CONFIG.OPTIONS_BTN, 'RETOUR', opt.focus === 2 ? 'focus' : 'normal', assets);
}
