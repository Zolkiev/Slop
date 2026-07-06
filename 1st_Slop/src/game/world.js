import { States, createStateMachine } from '../engine/state.js';
import { createRobot, applyThrust, updateRobot } from './robot.js';
import {
  createObstacle, obstacleRects, updateObstacles, recycle,
  needsSpawn,
} from './obstacles.js';
import { nextSalve, flow } from './patterns.js';
import { aabb, hitsBounds } from './collision.js';
import { createScore, checkPass, finalizeLevel, applySave } from './score.js';
import { gateGoalForLevel, difficultyForLevel } from './level.js';
import { createLayer, updateLayer } from './background.js';
import { createParticleField, spawnReactor, updateParticles } from './particles.js';
import { createAmbiance, updateAmbiance } from './ambiance.js';
import { createTwinkles } from './twinkle.js';
import { CONFIG } from '../config.js';
import { createMenu, createPauseMenu, createGameoverMenu, hitTest, activate, moveFocus, inRect } from './menu.js';
import { createSavecode, setFeedback } from './savecode.js';
import { decodeSave } from './save.js';
import { createOptions, moveOptionsFocus, adjust, barHitTest } from './options.js';
import { loadSettings } from './settings.js';

export function createWorld(storage) {
  const score = createScore(storage);
  return {
    sm: createStateMachine(States.MENU),
    menu: createMenu(score.bestLevel >= 1),
    pause: createPauseMenu(),
    gameover: createGameoverMenu(),
    savecode: createSavecode(score),
    settings: loadSettings(storage),
    options: null,
    optionsReturn: 'menu',
    menuTick: 0,
    robot: createRobot(),
    obstacles: [],
    score,
    level: 1,
    gatesThisLevel: 0,
    scrollSpeed: difficultyForLevel(1).scrollSpeed,
    diff: difficultyForLevel(1),
    patternQueue: [],
    lastGapY: CONFIG.HEIGHT / 2,
    freshLevel: true,
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
  world.particles.particles = [];
  world.patternQueue = [];
  world.lastGapY = CONFIG.HEIGHT / 2;
  world.freshLevel = true;
}

export function startLevel(world, level) {
  const diff = difficultyForLevel(level);
  world.bgSet = diff.tier - 1; // le décor raconte la progression (1 monde par tier)
  world.level = level;
  world.scrollSpeed = diff.scrollSpeed;
  world.diff = diff;
  resetRun(world);
}

export function toMenu(world) {
  world.menu = createMenu(world.score.bestLevel >= 1);
  world.sm.to(States.MENU);
}

function openOptions(world, from) {
  world.options = createOptions(world.settings);
  world.optionsReturn = from;
  world.sm.to(States.OPTIONS);
}

function closeOptions(world) {
  if (world.optionsReturn === 'pause') world.sm.to(States.PAUSE);
  else toMenu(world);
}

function syncVolume(world, id) {
  world.settings = { sfx: world.options.rows[0].value, music: world.options.rows[1].value };
  world.events.push(id === 'sfx' ? 'volsfx' : 'volmusic');
}

// La file de motifs alimente le spawn : vide -> on génère une salve.
// La première salve d'un niveau (ou d'un retry) est toujours douce (flow),
// ancrée au centre — ré-entrée lisible, pas de mur surprise au spawn.
function fillQueue(world) {
  const salve = world.freshLevel
    ? flow(world.rand, CONFIG.HEIGHT / 2, world.diff)
    : nextSalve(world.rand, world.lastGapY, world.diff);
  world.freshLevel = false;
  world.patternQueue.push(...salve);
}

function upcomingGate(world) {
  if (world.patternQueue.length === 0) fillQueue(world);
  return world.patternQueue[0];
}

function spawnObstacle(world) {
  const gate = world.patternQueue.shift();
  world.lastGapY = gate.gapY;
  world.obstacles.push(createObstacle(CONFIG.WIDTH + CONFIG.OBSTACLE_W, gate.gapY, gate.gapH));
}

export function press(world, pointer) {
  const state = world.sm.get();
  if (state === States.MENU) {
    const id = pointer ? hitTest(world.menu, pointer.x, pointer.y) : activate(world.menu);
    if (id === 'newgame') {
      startLevel(world, 1);
      world.sm.to(States.PLAY);
    } else if (id === 'continue') {
      startLevel(world, world.score.bestLevel);
      world.sm.to(States.PLAY);
    } else if (id === 'code') {
      world.savecode = createSavecode(world.score);
      world.sm.to(States.SAVECODE);
    } else if (id === 'options') {
      openOptions(world, 'menu');
    }
    // null → no-op
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
      toMenu(world);
    } else if (id === 'options') {
      openOptions(world, 'pause');
    }
    // null -> no-op
  } else if (state === States.LEVEL_COMPLETE) {
    startLevel(world, world.level + 1);
    world.sm.to(States.PLAY);
  } else if (state === States.GAMEOVER) {
    const id = pointer ? hitTest(world.gameover, pointer.x, pointer.y) : activate(world.gameover);
    if (id === 'restart') {
      startLevel(world, world.level);
      world.sm.to(States.PLAY);
    } else if (id === 'menu') {
      toMenu(world);
    }
    // null -> no-op
  } else if (state === States.SAVECODE) {
    const sc = world.savecode;
    const id = pointer ? hitTest(sc.menu, pointer.x, pointer.y) : activate(sc.menu);
    if (id === 'copy') {
      world.events.push('copycode');
      setFeedback(sc, 'COPIÉ !', world.menuTick);
    } else if (id === 'link') {
      world.events.push('copylink');
      setFeedback(sc, 'LIEN COPIÉ !', world.menuTick);
    } else if (id === 'enter') {
      world.events.push('codeentry');
    } else if (id === 'back') {
      toMenu(world);
    }
  } else if (state === States.OPTIONS) {
    if (pointer) {
      const hit = barHitTest(world.options, pointer.x, pointer.y);
      if (hit) {
        const idx = world.options.rows.findIndex((r) => r.id === hit.id);
        world.options.focus = idx;
        if (world.options.rows[idx].value !== hit.value) {
          world.options.rows[idx].value = hit.value;
          syncVolume(world, hit.id);
        }
      } else if (inRect(CONFIG.OPTIONS_BTN, pointer.x, pointer.y)) {
        closeOptions(world);
      }
    } else if (world.options.focus === 2) {
      closeOptions(world);
    }
  }
}

export function navMenu(world, dir) {
  const s = world.sm.get();
  if (s === States.MENU) moveFocus(world.menu, dir);
  else if (s === States.PAUSE) moveFocus(world.pause, dir);
  else if (s === States.GAMEOVER) moveFocus(world.gameover, dir);
  else if (s === States.SAVECODE) moveFocus(world.savecode.menu, dir);
  else if (s === States.OPTIONS) moveOptionsFocus(world.options, dir);
}

export function escapeAction(world) {
  const s = world.sm.get();
  if (s === States.PLAY) world.sm.to(States.PAUSE);
  else if (s === States.PAUSE) world.sm.to(States.PLAY);
  else if (s === States.GAMEOVER) toMenu(world);
  else if (s === States.SAVECODE) toMenu(world);
  else if (s === States.OPTIONS) closeOptions(world);
}

export function submitSaveCode(world, text) {
  const decoded = decodeSave(text);
  if (!decoded) return false;
  applySave(world.score, decoded.bestLevel, world.storage);
  toMenu(world);
  return true;
}

export function adjustAction(world, dir) {
  if (world.sm.get() !== States.OPTIONS) return;
  const id = adjust(world.options, dir);
  if (id) syncVolume(world, id);
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
  if (needsSpawn(world.obstacles, CONFIG.WIDTH, upcomingGate(world).spacing)) spawnObstacle(world);

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
