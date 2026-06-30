import { States, createStateMachine } from '../engine/state.js';
import { createRobot, applyThrust, updateRobot } from './robot.js';
import {
  createObstacle, obstacleRects, updateObstacles, recycle,
  needsSpawn, randomGapY,
} from './obstacles.js';
import { aabb, hitsBounds } from './collision.js';
import { createScore, scorePass, checkPass, finalize } from './score.js';
import { createLayer, updateLayer } from './background.js';
import { createParticleField, spawnReactor, updateParticles } from './particles.js';
import { createAmbiance, updateAmbiance } from './ambiance.js';
import { CONFIG } from '../config.js';

export function createWorld(storage) {
  return {
    sm: createStateMachine(States.MENU),
    robot: createRobot(),
    obstacles: [],
    score: createScore(storage),
    layers: [createLayer(0.25, CONFIG.WIDTH), createLayer(0.6, CONFIG.WIDTH)],
    rand: Math.random,
    bgSet: Math.floor(Math.random() * CONFIG.BG_SET_COUNT),
    storage,
    events: [],
    tick: 0,
    particles: createParticleField(),
    ambiance: createAmbiance(Math.random, 40, CONFIG.WIDTH, CONFIG.HEIGHT),
  };
}

export function resetRun(world) {
  world.robot = createRobot();
  world.obstacles = [];
  world.score.current = 0;
  world.bgSet = Math.floor(world.rand() * CONFIG.BG_SET_COUNT);
}

function spawnObstacle(world) {
  const gapH = CONFIG.GAP_MIN + world.rand() * (CONFIG.GAP_MAX - CONFIG.GAP_MIN);
  const gapY = randomGapY(world.rand, CONFIG.HEIGHT, gapH);
  world.obstacles.push(createObstacle(CONFIG.WIDTH + CONFIG.OBSTACLE_W, gapY, gapH));
}

export function press(world) {
  const state = world.sm.get();
  if (state === States.MENU) {
    world.sm.to(States.PLAY);
    resetRun(world);
  } else if (state === States.PLAY) {
    applyThrust(world.robot);
    world.events.push('thrust');
  } else if (state === States.GAMEOVER) {
    world.sm.to(States.PLAY);
    resetRun(world);
  }
}

export function updateWorld(world, dt) {
  for (const layer of world.layers) updateLayer(layer, CONFIG.SCROLL_SPEED, dt);
  updateAmbiance(world.ambiance, dt, CONFIG.WIDTH, CONFIG.HEIGHT);
  if (world.sm.get() !== States.PLAY) return;
  world.tick += 1;

  if (world.robot.vy < 0) spawnReactor(world.particles, world.robot, world.rand);
  updateParticles(world.particles, dt);

  updateRobot(world.robot, dt);
  updateObstacles(world.obstacles, dt);
  world.obstacles = recycle(world.obstacles, CONFIG.OBSTACLE_W);
  if (needsSpawn(world.obstacles, CONFIG.WIDTH)) spawnObstacle(world);

  for (const o of world.obstacles) {
    if (checkPass(world.robot, o, CONFIG.OBSTACLE_W)) {
      scorePass(world.score);
      world.events.push('score');
    }
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
    world.robot.alive = false;
    finalize(world.score, world.storage);
    world.sm.to(States.GAMEOVER);
  }
}
