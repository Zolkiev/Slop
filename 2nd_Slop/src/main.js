// Bootstrap : canvas, entrées, boucle. Seul module autorisé à toucher le DOM.
import { CARDS } from './game/cards/index.js';
import { createReign, draw as drawNext, choose } from './game/reign.js';
import { createSwipe, dragStart, dragMove, dragEnd, previewSide } from './game/swipe.js';
import { KINGS, isUnlocked } from './game/dynasty.js';
import { loadProgress, saveProgress } from './game/score.js';
import { decodeSave, codeFromHash } from './game/save.js';
import { createLoop } from './engine/loop.js';
import { preload, portraitFor, cardPlate } from './engine/assets.js';
import { render, VIEW_W, VIEW_H } from './render/renderer.js';
import { loadFonts } from './render/fonts.js';
import { createShatter, updateShatter } from './render/shatter.js';
import { createAudio } from './engine/audio.js';

preload(); // portraits + décors, non bloquant (fallbacks dessinés en attendant)
loadFonts(); // Cinzel + EB Garamond, non bloquant (serif système en attendant)

// Audio best-effort : sons prêts quand ils sont prêts, jamais d'exception.
const audio = createAudio({
  verre: 'assets/sfx/verre.wav',
  tick: 'assets/sfx/tick.wav',
  glas: 'assets/sfx/glas.wav',
  sacre: 'assets/sfx/sacre.wav',
  miracle: 'assets/sfx/miracle.wav',
  m_menu: 'assets/music/menu.wav',
  m_roche: 'assets/music/roche.wav',
  m_camelot: 'assets/music/camelot.wav',
  m_mystique: 'assets/music/mystique.wav',
  m_sombre: 'assets/music/sombre.wav',
  m_fin: 'assets/music/fin.wav',
});
audio.setSfxVolume(0.6);
audio.setMusicVolume(0.35);
// une même ambiance couvre plusieurs ères (graal et avalon partagent le mystique)
const ERA_MUSIC = { roche: 'm_roche', camelot: 'm_camelot', graal: 'm_mystique', chute: 'm_sombre', avalon: 'm_mystique' };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- Mise à l'échelle : canvas logique 480x800 adapté à la fenêtre ---
let scale = 1;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${VIEW_W * scale}px`;
  canvas.style.height = `${VIEW_H * scale}px`;
  canvas.width = Math.round(VIEW_W * scale * dpr);
  canvas.height = Math.round(VIEW_H * scale * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// --- Progression : localStorage + restauration par lien #save= ---
const progress = loadProgress();
{
  const restored = decodeSave(codeFromHash(window.location.hash));
  if (restored && restored.best >= progress.best) {
    progress.best = restored.best;
    progress.king = restored.king;
    saveProgress(progress);
  }
}

// --- État de l'application ---
const app = {
  mode: 'menu', // 'menu' | 'play' | 'dead'
  reign: null,
  swipe: createSwipe(),
  anim: null, // {card, side, dx} — carte validée en cours d'envol
  progress,
  newRecord: false, // le dernier règne a-t-il battu le record ?
};

function selectKing(delta) {
  progress.king = (progress.king + delta + KINGS.length) % KINGS.length;
  saveProgress(progress);
}

function startReign() {
  const king = KINGS[progress.king];
  if (!isUnlocked(king, progress.best)) return; // lignée encore scellée
  app.reign = createReign({ gauges: king.gauges });
  app.anim = null;
  app.newRecord = false;
  drawNext(app.reign, CARDS);
  app.mode = 'play';
  audio.play('sacre');
}

function endReign() {
  app.newRecord = app.reign.years > progress.best;
  if (app.newRecord) {
    progress.best = app.reign.years;
    saveProgress(progress);
  }
  app.mode = 'dead';
  audio.play('glas');
}

// `releaseDx` : position de la carte au moment du lâcher (0 au clavier),
// pour que la désintégration démarre là où la carte se trouve vraiment.
function commitChoice(side, releaseDx = 0) {
  const card = app.reign.current;
  if (!card) return;
  // La logique avance tout de suite ; la désintégration n'est que visuelle.
  app.anim = {
    card,
    side,
    shatter: createShatter({
      card,
      portrait: portraitFor(card.speaker),
      plate: cardPlate(),
      dx: releaseDx || (side === 'left' ? -40 : 40),
      side,
      centerX: VIEW_W / 2,
      centerY: VIEW_H / 2 + 10,
      viewW: VIEW_W,
      viewH: VIEW_H,
    }),
  };
  choose(app.reign, side);
  audio.play('verre');
}

// --- Entrées pointeur ---
function logicalX(e) {
  return (e.clientX - canvas.getBoundingClientRect().left) / scale;
}

let dragOriginX = null;
canvas.addEventListener('pointerdown', (e) => {
  audio.unlock(); // Web Audio exige un geste utilisateur ; idempotent
  if (app.mode === 'play' && app.reign.current && !app.anim) {
    dragOriginX = e.clientX;
    dragStart(app.swipe);
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (dragOriginX !== null) {
    dragMove(app.swipe, (e.clientX - dragOriginX) / scale);
  }
});
canvas.addEventListener('pointerup', (e) => {
  if (app.mode === 'menu') {
    const x = logicalX(e);
    if (x < VIEW_W * 0.3) selectKing(-1);
    else if (x > VIEW_W * 0.7) selectKing(+1);
    else startReign();
    return;
  }
  if (app.mode === 'dead') {
    app.mode = 'menu';
    return;
  }
  if (dragOriginX !== null) {
    dragOriginX = null;
    const releaseDx = app.swipe.dx; // avant dragEnd, qui remet dx à zéro
    const side = dragEnd(app.swipe);
    if (side) commitChoice(side, releaseDx);
  }
});

// --- Entrées clavier (desktop) ---
window.addEventListener('keydown', (e) => {
  audio.unlock();
  if (app.mode === 'menu') {
    if (e.code === 'ArrowLeft') selectKing(-1);
    if (e.code === 'ArrowRight') selectKing(+1);
    if (e.code === 'Space' || e.code === 'Enter') startReign();
    return;
  }
  if (app.mode === 'dead') {
    if (e.code === 'Space' || e.code === 'Enter') app.mode = 'menu';
    return;
  }
  if (app.mode !== 'play' || !app.reign.current || app.anim) return;
  if (e.code === 'ArrowLeft') commitChoice('left');
  if (e.code === 'ArrowRight') commitChoice('right');
});

// --- Boucle ---
let lastPreview = null; // pour le tick au franchissement du seuil d'aperçu
let lastMiracle = null; // pour ne sonner qu'à l'apparition du message

function step(dt) {
  if (app.anim) {
    // désintégration : poussière de carrés, puis la suivante est piochée
    if (updateShatter(app.anim.shatter, dt)) {
      app.anim = null;
      if (app.reign.dead) endReign();
      else drawNext(app.reign, CARDS);
    }
  }

  // tick discret quand le drag révèle un choix
  const preview = app.mode === 'play' && !app.anim ? previewSide(app.swipe) : null;
  if (preview && preview !== lastPreview) audio.play('tick');
  lastPreview = preview;

  // scintillement quand une relique vient de sauver le règne
  const miracle = app.mode === 'play' ? app.reign?.miracle : null;
  if (miracle && miracle !== lastMiracle) audio.play('miracle');
  lastMiracle = miracle ?? null;

  // musique d'ambiance : menu, une couleur par ère, lamento à la mort
  // (setMusic déduplique et réessaie tant que le contexte n'est pas débloqué)
  if (app.mode === 'menu') audio.setMusic('m_menu');
  else if (app.mode === 'play') audio.setMusic(ERA_MUSIC[app.reign.era] ?? 'm_roche');
  else if (app.mode === 'dead') audio.setMusic('m_fin', false);

  render(ctx, app);
}

createLoop(step).start();
