import { States } from '../engine/state.js';
import { obstacleRects } from '../game/obstacles.js';
import { twinkleAlpha } from '../game/twinkle.js';
import { rafaleAlpha } from '../game/bgevents.js';
import { gateGoalForLevel } from '../game/level.js';
import { CONFIG } from '../config.js';
import { renderMenu } from './menu.js';
import { renderBgAnim } from './bganim.js';
import { renderBgEvents } from './bgevents.js';
import { renderPause } from './pause.js';
import { renderConfirm } from './confirm.js';
import { renderSavecode } from './savecode.js';
import { renderOptions } from './options.js';
import { drawButtons } from './buttons.js';
import { renderSkins } from './skins.js';
import { SKINS, spriteKey } from '../game/skins.js';

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

  // 1a. Éléments de fond animés (fumées, enseigne, soleil, atmosphère) —
  // par-dessus le fond lointain, sous les événements et le premier plan.
  renderBgAnim(ctx, world, assets);

  // 1b. Événement de fond (foudre, étoile filante, oiseaux, torchère) —
  // derrière le premier plan : les silhouettes restent en contre-jour.
  renderBgEvents(ctx, world);

  // 2. Near foreground (horizontal parallax, tiled twice)
  const drawHeight = Math.round(180 * CONFIG.WIDTH / 320);
  const nearY = CONFIG.HEIGHT - drawHeight;
  const off = world.layers[1].offset % CONFIG.WIDTH;
  ctx.drawImage(assets['bg-near-' + world.bgSet], -off, nearY, CONFIG.WIDTH, drawHeight);
  ctx.drawImage(assets['bg-near-' + world.bgSet], -off + CONFIG.WIDTH, nearY, CONFIG.WIDTH, drawHeight);

  // 2a. Twinkling neon windows
  for (const point of world.twinkles.points) {
    ctx.globalAlpha = Math.max(twinkleAlpha(point, world.tick), rafaleAlpha(world.bgEvents, point.x));
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
    ctx.fillStyle = SKINS[world.skin].accent; // accent du skin (cyan pour PROTO)
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  ctx.globalAlpha = 1;

  // 4. Robot (sprites du skin sélectionné, 64×64 dessinés en 44×44)
  const hudState = world.sm.get();
  if (hudState !== States.MENU && hudState !== States.SAVECODE
      && hudState !== States.OPTIONS && hudState !== States.SKINS
      && hudState !== States.CONFIRM) {
    const r = world.robot;
    const key = spriteKey(world.skin);
    let sprite = assets[key]; // idle / chute
    if (r.alive && r.vy < 0) {
      // montée = poussée : alternance des deux frames thrust
      sprite = (Math.floor(world.tick / 6) % 2 === 0)
        ? assets[key + '-thrust-0'] : assets[key + '-thrust-1'];
    }
    const size = 44;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    ctx.drawImage(sprite, Math.round(cx - size / 2), Math.round(cy - size / 2), size, size);
  }

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

    // Pause button (⏸) — top-right
    const pi = CONFIG.PAUSE_ICON;
    ctx.fillStyle = 'rgba(10,10,20,0.5)';
    ctx.fillRect(pi.x, pi.y, pi.w, pi.h);
    ctx.strokeStyle = '#3ef0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(pi.x + 1, pi.y + 1, pi.w - 2, pi.h - 2);
    ctx.fillStyle = '#3ef0ff';
    const barW = 4, barH = 12;
    const cx = pi.x + pi.w / 2;
    const by = pi.y + (pi.h - barH) / 2;
    ctx.fillRect(cx - 5, by, barW, barH);
    ctx.fillRect(cx + 1, by, barW, barH);
  } else if (state === States.MENU) {
    renderMenu(ctx, world, assets);
  } else if (state === States.PAUSE) {
    renderPause(ctx, world, assets);
  } else if (state === States.SAVECODE) {
    renderSavecode(ctx, world, assets);
  } else if (state === States.OPTIONS) {
    renderOptions(ctx, world, assets);
  } else if (state === States.SKINS) {
    renderSkins(ctx, world, assets);
  } else if (state === States.CONFIRM) {
    renderConfirm(ctx, world, assets);
  } else if (state === States.LEVEL_COMPLETE) {
    ctx.fillText(`NIVEAU ${world.level} OK`, CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText('Tap pour continuer', CONFIG.WIDTH / 2, 280);
  } else if (state === States.GAMEOVER) {
    ctx.fillText('GAME OVER', CONFIG.WIDTH / 2, 240);
    ctx.font = '16px system-ui';
    ctx.fillText(`Niveau ${world.level}`, CONFIG.WIDTH / 2, 280);
    ctx.fillText(`Best: niveau ${world.score.record}`, CONFIG.WIDTH / 2, 308);
    drawButtons(ctx, world.gameover, assets);
  }

  // 6. White flash overlay (unshaken, drawn last)
  if (world.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (world.flash / CONFIG.FLASH_TIME) * 0.6 + ')';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }
}
