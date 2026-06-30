import { CONFIG } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#0a0a14';
ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
ctx.fillStyle = '#00e5ff';
ctx.font = '16px system-ui';
ctx.textAlign = 'center';
ctx.fillText('Jetpack Bot', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);
