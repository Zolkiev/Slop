import { States, createStateMachine } from '../engine/state.js';
import { createRobot, applyThrust, updateRobot } from './robot.js';
import {
  createObstacle, obstacleRects, updateObstacles, recycle,
  needsSpawn, randomGapY,
} from './obstacles.js';
import { aabb, hitsBounds } from './collision.js';
import { createScore, checkPass, finalizeLevel } from './score.js';
import { gateGoalForLevel, difficultyForLevel } from './level.js';
import { createLayer, updateLayer } from './background.js';
import { createParticleField, spawnReactor, updateParticles } from './particles.js';
import { createAmbiance, updateAmbiance } from './ambiance.js';
import { createTwinkles } from './twinkle.js';
import { CONFIG } from '../config.js';
import { createMenu, createPauseMenu, createGameoverMenu, hitTest, activate, moveFocus, inRect } from './menu.js';

export function createWorld(storage) {
  return {
    sm: createStateMachine(States.MENU),
    menu: createMenu(),
    pause: createPauseMenu(),
    gameover: createGameoverMenu(),
    menuTick: 0,
    robot: createRobot(),
    obstacles: [],
    score: createScore(storage),
    level: 1,
    gatesThisLevel: 0,
    scrollSpeed: difficultyForLevel(1).scrollSpeed,
    gapMin: difficultyForLevel(1).gapMin,
    gapMax: difficultyForLevel(1).gapMax,
    layers: [createLayer(0.25, CONFIG.WIDTH), createLayer(0.6, CONFIG.WIDTH)],
    rand: Math.random,
    bgSet: Math.floor(Math.random() * CONFIG.BG_SET_COUNT),
    storage,
    events: [],
    tick: 0,
    particles: createParticleField(),
    ambiance: createAmbiance(Math.random, 40, CONFIG.WIDTH, CONFIG.HEIGHT),
    twinkles: createTwinkles(Math.random, 50, CONFIG.WIDTH, CONFIG.HEIGHT),
    shake: 0,
    flash: 0,
  };
}

export function resetRun(world) {
  world.robot = createRobot();
  world.obstacles = [];
  world.gatesThisLevel = 0;
  world.bgSet = Math.floor(world.rand() * CONFIG.BG_SET_COUNT);
  world.particles.particles = [];
}

export function startLevel(world, level) {
  const diff = difficultyForLevel(level);
  world.level = level;
  world.scrollSpeed = diff.scrollSpeed;
  world.gapMin = diff.gapMin;
  world.gapMax = diff.gapMax;
  resetRun(world);
}

function spawnObstacle(world) {
  const gapH = world.gapMin + world.rand() * (world.gapMax - world.gapMin);
  const gapY = randomGapY(world.rand, CONFIG.HEIGHT, gapH);
  world.obstacles.push(createObstacle(CONFIG.WIDTH + CONFIG.OBSTACLE_W, gapY, gapH));
}

export function press(world, pointer) {
  const state = world.sm.get();
  if (state === States.MENU) {
    const id = pointer ? hitTest(world.menu, pointer.x, pointer.y) : activate(world.menu);
    if (id === 'newgame') {
      startLevel(world, 1);
      world.sm.to(States.PLAY);
    }
    // 'continue' / 'options' (stubs) and null → no-op
  } else if (state === States.PLAY) {
    if (pointer && inRect(CONFIG.PAUSE_ICON, pointer.x, pointer.y)) {
      world.sm.to(States.PAUSE);
    } else {
      applyThrust(world.robot);
      world.events.push('thrust');
    }
  } else if (state === States.PAUSE) {
    const id = pointer ? hitTest(world.pause, pointer.x, pointer.y) : activate(world.pause);
    if (id === 'resume') {
      world.sm.to(States.PLAY);
    } else if (id === 'restart') {
      startLevel(world, world.level);
      world.sm.to(States.PLAY);
    } else if (id === 'menu') {
      world.sm.to(States.MENU);
    }
    // 'options' / null -> no-op
  } else if (state === States.LEVEL_COMPLETE) {
    startLevel(world, world.level + 1);
    world.sm.to(States.PLAY);
  } else if (state === States.GAMEOVER) {
    const id = pointer ? hitTest(world.gameover, pointer.x, pointer.y) : activate(world.gameover);
    if (id === 'restart') {
      startLevel(world, world.level);
      world.sm.to(States.PLAY);
    } else if (id === 'menu') {
      world.sm.to(States.MENU);
    }
    // null -> no-op
  }
}

export function navMenu(world, dir) {
  const s = world.sm.get();
  if (s === States.MENU) moveFocus(world.menu, dir);
  else if (s === States.PAUSE) moveFocus(world.pause, dir);
  else if (s === States.GAMEOVER) moveFocus(world.gameover, dir);
}

export function escapeAction(world) {
  const s = world.sm.get();
  if (s === States.PLAY) world.sm.to(States.PAUSE);
  else if (s === States.PAUSE) world.sm.to(States.PLAY);
  else if (s === States.GAMEOVER) world.sm.to(States.MENU);
}

export function updateWorld(world, dt) {
  world.menuTick += 1;
  for (const layer of world.layers) updateLayer(layer, world.scrollSpeed, dt);
  updateAmbiance(world.ambiance, dt, CONFIG.WIDTH, CONFIG.HEIGHT);
  world.shake = Math.max(0, world.shake - dt);
  world.flash = Math.max(0, world.flash - dt);
  if (world.sm.get() !== States.PLAY) return;
  world.tick += 1;

  if (world.robot.vy < 0) spawnReactor(world.particles, world.robot, world.rand);
  updateParticles(world.particles, dt);

  updateRobot(world.robot, dt);
  updateObstacles(world.obstacles, dt, world.scrollSpeed);
  world.obstacles = recycle(world.obstacles, CONFIG.OBSTACLE_W);
  if (needsSpawn(world.obstacles, CONFIG.WIDTH)) spawnObstacle(world);

  for (const o of world.obstacles) {
    if (checkPass(world.robot, o, CONFIG.OBSTACLE_W)) {
      world.gatesThisLevel += 1;
      world.events.push('score');
    }
  }

  if (world.gatesThisLevel >= gateGoalForLevel(world.level)) {
    finalizeLevel(world.score, world.level, world.storage);
    world.events.push('levelcomplete');
    world.sm.to(States.LEVEL_COMPLETE);
    return;
  }

  let dead = hitsBounds(world.robot, CONFIG.HEIGHT);
  if (!dead) {
    for (const o of world.obstacles) {
      const [top, bottom] = obstacleRects(o, CONFIG.OBSTACLE_W, CONFIG.HEIGHT);
      if (aabb(world.robot, top) || aabb(world.robot, bottom)) { dead = true; break; }
    }
  }
  if (dead) {
    world.events.push('crash');
    world.shake = CONFIG.SHAKE_TIME;
    world.flash = CONFIG.FLASH_TIME;
    world.robot.alive = false;
    finalizeLevel(world.score, world.level, world.storage);
    world.gameover = createGameoverMenu();
    world.sm.to(States.GAMEOVER);
  }
}
