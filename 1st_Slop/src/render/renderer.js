import { States } from '../engine/state.js';
import { obstacleRects } from '../game/obstacles.js';
import { CONFIG } from '../config.js';

export function renderWorld(ctx, world) {
  // Fond
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  // Parallaxe placeholder : bandes verticales décalées
  const colors = ['#141430', '#1e1e4a'];
  world.layers.forEach((layer, i) => {
    ctx.fillStyle = colors[i % colors.length];
    const step = 80;
    for (let x = -layer.offset; x < CONFIG.WIDTH; x += step) {
      ctx.fillRect(x, CONFIG.HEIGHT - 120 - i * 40, 40, 120 + i * 40);
    }
  });

  // Obstacles néon placeholder
  ctx.fillStyle = '#ff2e88';
  for (const o of world.obstacles) {
    for (const r of obstacleRects(o, CONFIG.OBSTACLE_W, CONFIG.HEIGHT)) {
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }

  // Robot placeholder
  const r = world.robot;
  ctx.fillStyle = r.alive ? '#00e5ff' : '#888';
  ctx.fillRect(r.x, r.y, r.w, r.h);

  // HUD
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
