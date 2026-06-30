import { CONFIG } from './config.js';
import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { createWorld, press, updateWorld } from './game/world.js';
import { renderWorld } from './render/renderer.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const world = createWorld(window.localStorage);
createInput({ target: canvas, win: window }, () => press(world));

const loop = createLoop({
  update: (dt) => updateWorld(world, dt),
  render: () => renderWorld(ctx, world),
  fixedDt: CONFIG.FIXED_DT,
});
loop.start();
