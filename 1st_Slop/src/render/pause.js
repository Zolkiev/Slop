import { CONFIG } from '../config.js';
import { drawButtons } from './buttons.js';

export function renderPause(ctx, world, assets) {
  // Dark veil over the frozen scene
  ctx.fillStyle = 'rgba(10,10,20,0.7)';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSE', CONFIG.WIDTH / 2, CONFIG.PAUSE_TITLE_Y);

  // Buttons (shared state-sprite selection)
  drawButtons(ctx, world.pause, assets);
}
