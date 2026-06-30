import { CONFIG } from './config.js';
import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { createWorld, press, updateWorld } from './game/world.js';
import { renderWorld } from './render/renderer.js';
import { loadImages } from './engine/assets.js';
import { createAudio } from './engine/audio.js';

import robotUrl from '../assets/robot.png';
import robotThrust0 from '../assets/robot-thrust-0.png';
import robotThrust1 from '../assets/robot-thrust-1.png';
import obstacleUrl from '../assets/obstacle.png';
import bgFar0 from '../assets/bg-far-0.png';
import bgFar1 from '../assets/bg-far-1.png';
import bgFar2 from '../assets/bg-far-2.png';
import bgNear0 from '../assets/bg-near-0.png';
import bgNear1 from '../assets/bg-near-1.png';
import bgNear2 from '../assets/bg-near-2.png';
import thrustUrl from '../assets/sfx-thrust.wav';
import scoreUrl from '../assets/sfx-score.wav';
import crashUrl from '../assets/sfx-crash.wav';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Show a loading frame while assets load
ctx.fillStyle = '#0a0a14';
ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
ctx.fillStyle = '#00e5ff';
ctx.font = 'bold 20px system-ui';
ctx.textAlign = 'center';
ctx.fillText('Chargement…', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);

const world = createWorld(window.localStorage);
const audio = createAudio({ thrust: thrustUrl, score: scoreUrl, crash: crashUrl });
createInput({ target: canvas, win: window }, () => press(world));

loadImages({
  robot: robotUrl,
  'robot-thrust-0': robotThrust0,
  'robot-thrust-1': robotThrust1,
  obstacle: obstacleUrl,
  'bg-far-0': bgFar0,
  'bg-far-1': bgFar1,
  'bg-far-2': bgFar2,
  'bg-near-0': bgNear0,
  'bg-near-1': bgNear1,
  'bg-near-2': bgNear2,
}).then((assets) => {
  const loop = createLoop({
    update: (dt) => {
      updateWorld(world, dt);
      for (const evt of world.events) audio.play(evt);
      world.events.length = 0;
    },
    render: () => renderWorld(ctx, world, assets),
    fixedDt: CONFIG.FIXED_DT,
  });
  loop.start();
}).catch((err) => {
  console.error('Asset loading failed:', err);
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  ctx.fillStyle = '#ff2e88';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Erreur de chargement', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);
  ctx.fillText(err.message, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 30);
});
