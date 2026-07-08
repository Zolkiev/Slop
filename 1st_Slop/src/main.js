import { CONFIG } from './config.js';
import { createLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import { createWorld, press, navMenu, escapeAction, updateWorld, submitSaveCode, adjustAction } from './game/world.js';
import { saveSettings, volumeToGain } from './game/settings.js';
import { musicFor, isLooping } from './game/music.js';
import { decodeSave } from './game/save.js';
import { createScore, saveProgress } from './game/score.js';
import { createCodeInput } from './ui/codeinput.js';
import { renderWorld } from './render/renderer.js';
import { loadImages } from './engine/assets.js';
import { createAudio } from './engine/audio.js';
import { loadFont } from './engine/font.js';

import robotUrl from '../assets/robot.png';
import robotThrust0 from '../assets/robot-thrust-0.png';
import robotThrust1 from '../assets/robot-thrust-1.png';
import robotS1 from '../assets/robot-s1.png';
import robotS1Thrust0 from '../assets/robot-s1-thrust-0.png';
import robotS1Thrust1 from '../assets/robot-s1-thrust-1.png';
import robotS2 from '../assets/robot-s2.png';
import robotS2Thrust0 from '../assets/robot-s2-thrust-0.png';
import robotS2Thrust1 from '../assets/robot-s2-thrust-1.png';
import robotS3 from '../assets/robot-s3.png';
import robotS3Thrust0 from '../assets/robot-s3-thrust-0.png';
import robotS3Thrust1 from '../assets/robot-s3-thrust-1.png';
import robotS4 from '../assets/robot-s4.png';
import robotS4Thrust0 from '../assets/robot-s4-thrust-0.png';
import robotS4Thrust1 from '../assets/robot-s4-thrust-1.png';
import robotS5 from '../assets/robot-s5.png';
import robotS5Thrust0 from '../assets/robot-s5-thrust-0.png';
import robotS5Thrust1 from '../assets/robot-s5-thrust-1.png';
import robotS6 from '../assets/robot-s6.png';
import robotS6Thrust0 from '../assets/robot-s6-thrust-0.png';
import robotS6Thrust1 from '../assets/robot-s6-thrust-1.png';
import robotS7 from '../assets/robot-s7.png';
import robotS7Thrust0 from '../assets/robot-s7-thrust-0.png';
import robotS7Thrust1 from '../assets/robot-s7-thrust-1.png';
import robotS8 from '../assets/robot-s8.png';
import robotS8Thrust0 from '../assets/robot-s8-thrust-0.png';
import robotS8Thrust1 from '../assets/robot-s8-thrust-1.png';
import robotS9 from '../assets/robot-s9.png';
import robotS9Thrust0 from '../assets/robot-s9-thrust-0.png';
import robotS9Thrust1 from '../assets/robot-s9-thrust-1.png';
import robotS10 from '../assets/robot-s10.png';
import robotS10Thrust0 from '../assets/robot-s10-thrust-0.png';
import robotS10Thrust1 from '../assets/robot-s10-thrust-1.png';
import robotS11 from '../assets/robot-s11.png';
import robotS11Thrust0 from '../assets/robot-s11-thrust-0.png';
import robotS11Thrust1 from '../assets/robot-s11-thrust-1.png';
import obstacleUrl from '../assets/obstacle.png';
import bgFar0 from '../assets/bg-far-0.png';
import bgFar1 from '../assets/bg-far-1.png';
import bgFar2 from '../assets/bg-far-2.png';
import bgFar3 from '../assets/bg-far-3.png';
import bgFar4 from '../assets/bg-far-4.png';
import bgNear0 from '../assets/bg-near-0.png';
import bgNear1 from '../assets/bg-near-1.png';
import bgNear2 from '../assets/bg-near-2.png';
import bgNear3 from '../assets/bg-near-3.png';
import bgNear4 from '../assets/bg-near-4.png';
import uiLogo from '../assets/ui-logo.png';
import btnPlate from '../assets/btn-plate.png';
import btnPlateFocus from '../assets/btn-plate-focus.png';
import fontUrl from '../assets/PressStart2P-Regular.ttf';
import thrustUrl from '../assets/sfx-thrust.wav';
import scoreUrl from '../assets/sfx-score.wav';
import crashUrl from '../assets/sfx-crash.wav';
import music0Url from '../assets/music-0.wav';
import music1Url from '../assets/music-1.wav';
import music2Url from '../assets/music-2.wav';
import music3Url from '../assets/music-3.wav';
import music4Url from '../assets/music-4.wav';
import musicMenuUrl from '../assets/music-menu.wav';
import jingleGameoverUrl from '../assets/jingle-gameover.wav';

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

// Restauration par lien de sauvegarde (#save=JB1-XXXX), avant la création du monde
const hashMatch = /[#&]save=([^&]+)/.exec(window.location.hash);
if (hashMatch) {
  let raw = hashMatch[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* encodage invalide — on tente le brut, decodeSave tranchera */
  }
  const decoded = decodeSave(raw);
  if (decoded) {
    saveProgress(createScore(window.localStorage), decoded.bestLevel, window.localStorage);
  } else {
    console.warn('Code de sauvegarde invalide dans l\'URL');
  }
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

const world = createWorld(window.localStorage);
const audio = createAudio({
  thrust: thrustUrl, score: scoreUrl, crash: crashUrl,
  'music-0': music0Url, 'music-1': music1Url, 'music-2': music2Url,
  'music-3': music3Url, 'music-4': music4Url,
  'music-menu': musicMenuUrl, 'jingle-gameover': jingleGameoverUrl,
});
audio.setSfxVolume(volumeToGain(world.settings.sfx));
audio.setMusicVolume(volumeToGain(world.settings.music));

const codeInput = createCodeInput(document);

createInput(
  { target: canvas, win: window },
  (pointer) => { if (!codeInput.isOpen()) press(world, pointer); },
  (dir) => { if (!codeInput.isOpen()) navMenu(world, dir); },
  () => { if (!codeInput.isOpen()) escapeAction(world); },
  (dir) => { if (!codeInput.isOpen()) adjustAction(world, dir); },
);

function copyText(text) {
  const fallback = () => codeInput.open({
    value: text,
    message: 'COPIE MANUELLE (Ctrl+C)',
    onSubmit: () => true,
    onCancel: () => {},
  });
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(fallback);
  } else {
    fallback();
  }
}

function saveLink(code) {
  return `${window.location.origin}${window.location.pathname}#save=${code}`;
}

const imagesPromise = loadImages({
  robot: robotUrl,
  'robot-thrust-0': robotThrust0,
  'robot-thrust-1': robotThrust1,
  'robot-s1': robotS1,
  'robot-s1-thrust-0': robotS1Thrust0,
  'robot-s1-thrust-1': robotS1Thrust1,
  'robot-s2': robotS2,
  'robot-s2-thrust-0': robotS2Thrust0,
  'robot-s2-thrust-1': robotS2Thrust1,
  'robot-s3': robotS3,
  'robot-s3-thrust-0': robotS3Thrust0,
  'robot-s3-thrust-1': robotS3Thrust1,
  'robot-s4': robotS4,
  'robot-s4-thrust-0': robotS4Thrust0,
  'robot-s4-thrust-1': robotS4Thrust1,
  'robot-s5': robotS5,
  'robot-s5-thrust-0': robotS5Thrust0,
  'robot-s5-thrust-1': robotS5Thrust1,
  'robot-s6': robotS6,
  'robot-s6-thrust-0': robotS6Thrust0,
  'robot-s6-thrust-1': robotS6Thrust1,
  'robot-s7': robotS7,
  'robot-s7-thrust-0': robotS7Thrust0,
  'robot-s7-thrust-1': robotS7Thrust1,
  'robot-s8': robotS8,
  'robot-s8-thrust-0': robotS8Thrust0,
  'robot-s8-thrust-1': robotS8Thrust1,
  'robot-s9': robotS9,
  'robot-s9-thrust-0': robotS9Thrust0,
  'robot-s9-thrust-1': robotS9Thrust1,
  'robot-s10': robotS10,
  'robot-s10-thrust-0': robotS10Thrust0,
  'robot-s10-thrust-1': robotS10Thrust1,
  'robot-s11': robotS11,
  'robot-s11-thrust-0': robotS11Thrust0,
  'robot-s11-thrust-1': robotS11Thrust1,
  obstacle: obstacleUrl,
  'bg-far-0': bgFar0,
  'bg-far-1': bgFar1,
  'bg-far-2': bgFar2,
  'bg-near-0': bgNear0,
  'bg-near-1': bgNear1,
  'bg-near-2': bgNear2,
  'bg-far-3': bgFar3,
  'bg-far-4': bgFar4,
  'bg-near-3': bgNear3,
  'bg-near-4': bgNear4,
  'ui-logo': uiLogo,
  'btn-plate': btnPlate,
  'btn-plate-focus': btnPlateFocus,
});

Promise.all([imagesPromise, loadFont(CONFIG.BTN_FONT_FAMILY, fontUrl)]).then(([assets]) => {
  const loop = createLoop({
    update: (dt) => {
      updateWorld(world, dt);
      for (const evt of world.events) {
        if (evt === 'codeentry') {
          codeInput.open({
            message: 'ENTRE TON CODE',
            onSubmit: (text) => submitSaveCode(world, text),
            onCancel: () => {},
          });
        } else if (evt === 'copycode') {
          copyText(world.savecode.code);
        } else if (evt === 'copylink') {
          copyText(saveLink(world.savecode.code));
        } else if (evt === 'volsfx') {
          saveSettings(world.settings, window.localStorage);
          audio.setSfxVolume(volumeToGain(world.settings.sfx));
          audio.play('score'); // feedback immédiat au nouveau volume
        } else if (evt === 'volmusic') {
          saveSettings(world.settings, window.localStorage);
          audio.setMusicVolume(volumeToGain(world.settings.music));
        } else {
          audio.play(evt);
        }
      }
      world.events.length = 0;
      const musicKey = musicFor(world.sm.get(), world.bgSet, world.optionsReturn);
      audio.setMusic(musicKey, isLooping(musicKey));
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
