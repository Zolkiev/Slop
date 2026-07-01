import { CONFIG } from '../config.js';
import { focusedId } from '../game/menu.js';

function spriteKey(button, focused) {
  if (!button.enabled) return `btn-${button.id}-disabled`;
  if (button.id === focused) return `btn-${button.id}-focus`;
  return `btn-${button.id}`;
}

export function renderMenu(ctx, world, assets) {
  const { menu } = world;

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

  // Buttons — sprite chosen by state
  const focused = focusedId(menu);
  for (const b of menu.buttons) {
    ctx.drawImage(assets[spriteKey(b, focused)], b.x, b.y, b.w, b.h);
  }

  // Best level
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`Best: niveau ${world.score.bestLevel}`, CONFIG.WIDTH / 2, CONFIG.MENU_BEST_Y);
}
