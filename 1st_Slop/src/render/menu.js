import { CONFIG } from '../config.js';
import { drawButtons } from './buttons.js';

export function renderMenu(ctx, world, assets) {
  // Logo — centered near the top, kept at native aspect (max width 260)
  const logo = assets['ui-logo'];
  const logoW = Math.min(260, logo.width);
  const logoH = logo.height * (logoW / logo.width);
  ctx.drawImage(logo, Math.round((CONFIG.WIDTH - logoW) / 2), CONFIG.MENU_LOGO_Y, logoW, logoH);

  // Idle robot — bobs vertically using menuTick (advances every frame)
  const robot = assets.robot;
  const bob = Math.sin(world.menuTick / 18) * 6;
  const size = 44;
  ctx.drawImage(
    robot,
    Math.round((CONFIG.WIDTH - size) / 2),
    Math.round(CONFIG.MENU_ROBOT_Y + bob),
    size, size,
  );

  // Buttons (shared state-sprite selection)
  drawButtons(ctx, world.menu, assets);

  // Best level
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`Best: niveau ${world.score.bestLevel}`, CONFIG.WIDTH / 2, CONFIG.MENU_BEST_Y);
}
