import { States } from '../engine/state.js';
import { obstacleRects } from '../game/obstacles.js';
import { twinkleAlpha } from '../game/twinkle.js';
import { gateGoalForLevel } from '../game/level.js';
import { CONFIG } from '../config.js';

export function renderWorld(ctx, world, assets) {
  // 0. Dark base — fills any shake-gap edges with the background colour
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  // --- Begin shaken scene ---
  const shakeAmt = world.shake > 0 ? (world.shake / CONFIG.SHAKE_TIME) * CONFIG.SHAKE_MAX : 0;
  ctx.save();
  if (shakeAmt > 0) {
    ctx.translate(
      (Math.random() - 0.5) * 2 * shakeAmt,
      (Math.random() - 0.5) * 2 * shakeAmt,
    );
  }

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

  // 2a. Twinkling neon windows
  for (const point of world.twinkles.points) {
    ctx.globalAlpha = twinkleAlpha(point, world.tick);
    ctx.fillStyle = point.color;
    ctx.fillRect(Math.round(point.x), Math.round(point.y), 2, 2);
  }
  ctx.globalAlpha = 1;

  // 2b. Ambiance (faint drifting streaks — rain/ash)
  ctx.fillStyle = 'rgba(150,180,255,0.20)';
  for (const d of world.ambiance.drops) {
    ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, Math.round(d.len));
  }

  // 3. Obstacles
  for (const o of world.obstacles) {
    for (const r of obstacleRects(o, CONFIG.OBSTACLE_W, CONFIG.HEIGHT)) {
      ctx.drawImage(assets.obstacle, r.x, r.y, r.w, r.h);
    }
  }

  // 3b. Reactor particle trail (drawn before robot so it appears behind)
  for (const p of world.particles.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = '#3ef0ff';
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  ctx.globalAlpha = 1;

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

  // --- End shaken scene ---
  ctx.restore();

  // 5. HUD (unshaken — drawn after restore)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  const state = world.sm.get();
  if (state === States.PLAY) {
    ctx.fillText(`${world.gatesThisLevel}/${gateGoalForLevel(world.level)}`, CONFIG.WIDTH / 2, 56);
    ctx.font = '14px system-ui';
    ctx.fillText(`Niveau ${world.level}`, CONFIG.WIDTH / 2, 80);
  } else if (state === States.MENU) {
    ctx.fillText('JETPACK BOT', CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText('Tap / Espace pour voler', CONFIG.WIDTH / 2, 280);
    ctx.fillText(`Best: niveau ${world.score.bestLevel}`, CONFIG.WIDTH / 2, 320);
  } else if (state === States.LEVEL_COMPLETE) {
    ctx.fillText(`NIVEAU ${world.level} OK`, CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText('Tap pour continuer', CONFIG.WIDTH / 2, 280);
  } else if (state === States.GAMEOVER) {
    ctx.fillText('GAME OVER', CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText(`Niveau ${world.level}`, CONFIG.WIDTH / 2, 280);
    ctx.fillText(`Best: niveau ${world.score.bestLevel}`, CONFIG.WIDTH / 2, 308);
    ctx.fillText('Tap pour réessayer', CONFIG.WIDTH / 2, 340);
  }

  // 6. White flash overlay (unshaken, drawn last)
  if (world.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (world.flash / CONFIG.FLASH_TIME) * 0.6 + ')';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }
}
