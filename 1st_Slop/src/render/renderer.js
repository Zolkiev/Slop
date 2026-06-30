import { States } from '../engine/state.js';
import { obstacleRects } from '../game/obstacles.js';
import { CONFIG } from '../config.js';

export function renderWorld(ctx, world, assets) {
  // 1. Far background (parallax, tiled twice)
  const farOff = world.layers[0].offset % CONFIG.WIDTH;
  ctx.drawImage(assets['bg-far-' + world.bgSet], -farOff, -3, CONFIG.WIDTH, CONFIG.HEIGHT + 3);
  ctx.drawImage(assets['bg-far-' + world.bgSet], -farOff + CONFIG.WIDTH, -3, CONFIG.WIDTH, CONFIG.HEIGHT + 3);

  // 2. Near foreground (horizontal parallax, tiled twice)
  const drawHeight = Math.round(180 * CONFIG.WIDTH / 320);
  const nearY = CONFIG.HEIGHT - drawHeight;
  const off = world.layers[1].offset % CONFIG.WIDTH;
  ctx.drawImage(assets['bg-near-' + world.bgSet], -off, nearY, CONFIG.WIDTH, drawHeight);
  ctx.drawImage(assets['bg-near-' + world.bgSet], -off + CONFIG.WIDTH, nearY, CONFIG.WIDTH, drawHeight);

  // 3. Obstacles
  for (const o of world.obstacles) {
    for (const r of obstacleRects(o, CONFIG.OBSTACLE_W, CONFIG.HEIGHT)) {
      ctx.drawImage(assets.obstacle, r.x, r.y, r.w, r.h);
    }
  }

  // 4. Robot (64×64 sprite centered on hitbox, drawn at 44×44 for crisp pixel art)
  const r = world.robot;
  let sprite = assets.robot; // idle / falling
  if (r.alive && r.vy < 0) {
    // rising = thrusting: flicker between the two thrust frames
    sprite = (Math.floor(world.tick / 6) % 2 === 0) ? assets['robot-thrust-0'] : assets['robot-thrust-1'];
  }
  const size = 44;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  ctx.drawImage(sprite, Math.round(cx - size / 2), Math.round(cy - size / 2), size, size);

  // 5. HUD (unchanged)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  const state = world.sm.get();
  if (state === States.PLAY) {
    ctx.fillText(String(world.score.current), CONFIG.WIDTH / 2, 60);
  } else if (state === States.MENU) {
    ctx.fillText('JETPACK BOT', CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText('Tap / Espace pour voler', CONFIG.WIDTH / 2, 280);
    ctx.fillText(`Best: ${world.score.best}`, CONFIG.WIDTH / 2, 320);
  } else if (state === States.GAMEOVER) {
    ctx.fillText('GAME OVER', CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText(`Score: ${world.score.current}`, CONFIG.WIDTH / 2, 280);
    ctx.fillText(`Best: ${world.score.best}`, CONFIG.WIDTH / 2, 308);
    ctx.fillText('Tap pour rejouer', CONFIG.WIDTH / 2, 340);
  }
}
