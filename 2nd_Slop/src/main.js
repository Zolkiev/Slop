// Bootstrap : canvas, entrées, boucle. Seul module autorisé à toucher le DOM.
import { CARDS } from './game/cards/index.js';
import { createReign, draw as drawNext, choose } from './game/reign.js';
import { createSwipe, dragStart, dragMove, dragEnd, previewSide } from './game/swipe.js';
import { KINGS, isUnlocked, lineageFlag } from './game/dynasty.js';
import { setFlag } from './game/flags.js';
import { loadProgress, saveProgress } from './game/score.js';
import { decodeSave, codeFromHash } from './game/save.js';
import {
  serializeReign, deserializeReign, saveReign, loadReign, clearReign,
} from './game/persist-reign.js';
import { startCombat } from './game/combat.js';
import { COMBATS } from './game/combats/index.js';
import { createLoop } from './engine/loop.js';
import { preload, portraitFor, cardArt, cardPlate } from './engine/assets.js';
import { render, VIEW_W, VIEW_H, MENU_UI } from './render/renderer.js';
import { PAUSE_UI, inZone, CONFIRM_UI } from './render/pause.js';
import { COMBAT_CARD_SHIFT } from './render/combat.js';
import { feminizeCard } from './render/card.js';
import { hasFlag } from './game/flags.js';
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
  choc: 'assets/sfx/choc.wav',
  ovation: 'assets/sfx/ovation.wav',
  m_menu: 'assets/music/menu.wav',
  m_roche: 'assets/music/roche.wav',
  m_camelot: 'assets/music/camelot.wav',
  m_mystique: 'assets/music/mystique.wav',
  m_sombre: 'assets/music/sombre.wav',
  m_bataille: 'assets/music/bataille.wav',
  m_fin: 'assets/music/fin.wav',
});
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
audio.setSfxVolume(progress.sfxVol);
audio.setMusicVolume(progress.musicVol);

// --- État de l'application ---
const app = {
  mode: 'menu', // 'menu' | 'options' | 'play' | 'pause' | 'dead'
  reign: null,
  swipe: createSwipe(),
  anim: null, // {card, side, dx} — carte validée en cours d'envol
  progress,
  newRecord: false, // le dernier règne a-t-il battu le record ?
  savedReign: deserializeReign(loadReign(), CARDS), // règne en cours restauré, ou null
  tutorial: null, // coach-marks du 1er règne (Tâche 9)
};

function selectKing(delta) {
  progress.king = (progress.king + delta + KINGS.length) % KINGS.length;
  saveProgress(progress);
}

function startReign() {
  const king = KINGS[progress.king];
  if (!isUnlocked(king, progress.best)) return; // lignée encore scellée
  app.reign = createReign({ gauges: king.gauges });
  setFlag(app.reign.flags, lineageFlag(king)); // les cartes d'identité se gatent dessus
  app.anim = null;
  app.newRecord = false;
  drawNext(app.reign, CARDS);
  // triche de dev (vérif visuelle) : #combat=<id> ouvre l'épreuve au 1er tour
  const forced = /#combat=([\w.]+)/.exec(window.location.hash)?.[1];
  if (forced && COMBATS[forced]) {
    startCombat(app.reign, COMBATS[forced]);
    drawNext(app.reign, CARDS);
  }
  app.mode = 'play';
  audio.play('sacre');
  autosave();
}

function continueReign() {
  if (!app.savedReign) return;
  app.reign = app.savedReign;
  app.savedReign = null;
  app.anim = null;
  app.tutorial = null;
  if (!app.reign.current) drawNext(app.reign, CARDS);
  app.mode = 'play';
}

function newReignFromMenu() {
  clearReign();
  app.savedReign = null;
  startReign();
}

// Persiste le règne à chaque frontière de carte (jamais en plein duel).
function autosave() {
  if (app.reign && !app.reign.dead && !app.reign.combat) {
    app.reign.king = progress.king;
    saveReign(serializeReign(app.reign));
  }
}

function endReign() {
  app.newRecord = app.reign.years > progress.best;
  if (app.newRecord) {
    progress.best = app.reign.years;
    saveProgress(progress);
  }
  clearReign();
  app.savedReign = null;
  app.mode = 'dead';
  audio.play('glas');
}

// `releaseDx` : position de la carte au moment du lâcher (0 au clavier),
// pour que la désintégration démarre là où la carte se trouve vraiment.
function commitChoice(side, releaseDx = 0) {
  const card = app.reign.current;
  if (!card) return;
  // La logique avance tout de suite ; la désintégration n'est que visuelle.
  // En duel, la manœuvre est dessinée plus bas : la poussière part de là.
  const shown = hasFlag(app.reign.flags, 'lignee.morgane') ? feminizeCard(card) : card;
  app.anim = {
    card,
    side,
    shatter: createShatter({
      card: shown, // la capture doit montrer le même texte que l'affichage
      portrait: cardArt(card),
      plate: cardPlate(),
      dx: releaseDx || (side === 'left' ? -40 : 40),
      side,
      centerX: VIEW_W / 2,
      centerY: VIEW_H / 2 + (app.reign.combat ? COMBAT_CARD_SHIFT : 10),
      viewW: VIEW_W,
      viewH: VIEW_H,
    }),
  };
  const wasCombat = !!app.reign.combat;
  choose(app.reign, side);
  audio.play('verre');
  if (wasCombat) audio.play('choc'); // le fer sonne sous le verre
  if (wasCombat && !app.reign.combat && app.reign.combatResult === 'win') {
    audio.play('ovation');
  }
}

// --- Pause : bascule, curseurs de volume, abandon ---
function togglePause() {
  if (app.mode === 'play') app.mode = 'pause';
  else if (app.mode === 'pause') app.mode = 'play';
}

function abandonReign() {
  // retour au menu SANS abandonner : le règne reste sauvegardé (CONTINUER)
  app.savedReign = app.reign;
  app.reign = null;
  app.anim = null;
  app.tutorial = null;
  app.mode = 'menu';
}

let sliderDrag = null; // 'music' | 'sfx' pendant un ajustement au doigt
function setVolume(key, x) {
  const zone = PAUSE_UI.sliders[key];
  const v = Math.min(1, Math.max(0, (x - zone.x) / zone.w));
  if (key === 'music') {
    progress.musicVol = v;
    audio.setMusicVolume(v);
  } else {
    progress.sfxVol = v;
    audio.setSfxVolume(v);
  }
}

// zone de curseur élargie pour le doigt (la poignée déborde de la piste)
const sliderHit = (zone) => ({ x: zone.x - 12, y: zone.y - 16, w: zone.w + 24, h: zone.h + 32 });

// --- Entrées pointeur ---
function logicalPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
}

let dragOriginX = null;
canvas.addEventListener('pointerdown', (e) => {
  audio.unlock(); // Web Audio exige un geste utilisateur ; idempotent
  const pos = logicalPos(e);
  if (app.mode === 'pause' || app.mode === 'options') {
    for (const key of ['music', 'sfx']) {
      if (inZone(sliderHit(PAUSE_UI.sliders[key]), pos.x, pos.y)) {
        sliderDrag = key;
        setVolume(key, pos.x);
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }
    return;
  }
  if (app.mode === 'play' && inZone(PAUSE_UI.pauseButton, pos.x, pos.y)) return; // géré au pointerup
  if (app.mode === 'play' && app.reign.current && !app.anim) {
    dragOriginX = e.clientX;
    dragStart(app.swipe);
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (sliderDrag) {
    setVolume(sliderDrag, logicalPos(e).x);
    return;
  }
  if (dragOriginX !== null) {
    dragMove(app.swipe, (e.clientX - dragOriginX) / scale);
  }
});
canvas.addEventListener('pointerup', (e) => {
  const pos = logicalPos(e);
  if (sliderDrag) {
    sliderDrag = null;
    saveProgress(progress); // un seul write au relâcher, pas à chaque frame
    return;
  }
  if (app.mode === 'menu' && app.savedReign) {
    if (inZone(PAUSE_UI.pauseButton, pos.x, pos.y)) { app.mode = 'options'; return; }
    if (pos.y > VIEW_H - 80) { openCodeOverlay(); return; }
    if (inZone(MENU_UI.continue, pos.x, pos.y)) { continueReign(); return; }
    if (inZone(MENU_UI.newReign, pos.x, pos.y)) { app.mode = 'confirm'; return; }
    return;
  }
  if (app.mode === 'menu') {
    if (inZone(PAUSE_UI.pauseButton, pos.x, pos.y)) {
      app.mode = 'options'; // avant la zone du code, qui couvre le même coin
      return;
    }
    if (pos.y > VIEW_H - 80) {
      openCodeOverlay();
      return;
    }
    if (pos.x < VIEW_W * 0.3) selectKing(-1);
    else if (pos.x > VIEW_W * 0.7) selectKing(+1);
    else startReign();
    return;
  }
  if (app.mode === 'confirm') {
    if (inZone(CONFIRM_UI.yes, pos.x, pos.y)) newReignFromMenu();
    else if (inZone(CONFIRM_UI.no, pos.x, pos.y)) app.mode = 'menu';
    return;
  }
  if (app.mode === 'options') {
    if (inZone(PAUSE_UI.resume, pos.x, pos.y)) app.mode = 'menu';
    return;
  }
  if (app.mode === 'pause') {
    if (inZone(PAUSE_UI.resume, pos.x, pos.y)) togglePause();
    else if (inZone(PAUSE_UI.abandon, pos.x, pos.y)) abandonReign();
    return;
  }
  if (app.mode === 'dead') {
    app.mode = 'menu';
    return;
  }
  if (app.mode === 'play' && inZone(PAUSE_UI.pauseButton, pos.x, pos.y) && dragOriginX === null) {
    togglePause();
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
  if (codeUi.root.style.display !== 'none') return; // la saisie de code a le clavier
  audio.unlock();
  if (e.code === 'Escape' && (app.mode === 'play' || app.mode === 'pause')) {
    togglePause();
    return;
  }
  if (app.mode === 'options') {
    if (e.code === 'Escape' || e.code === 'Enter') app.mode = 'menu';
    return;
  }
  if (app.mode === 'menu') {
    if (app.savedReign) {
      if (e.code === 'Space' || e.code === 'Enter') continueReign();
      return;
    }
    if (e.code === 'ArrowLeft') selectKing(-1);
    if (e.code === 'ArrowRight') selectKing(+1);
    if (e.code === 'Space' || e.code === 'Enter') startReign();
    return;
  }
  if (app.mode === 'confirm') {
    if (e.code === 'Enter' || e.code === 'Escape') app.mode = 'menu'; // défaut : Non
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

// --- Saisie de code de restauration (seul recours au DOM : clavier natif) ---
function buildCodeOverlay() {
  const root = document.createElement('div');
  root.style.cssText =
    'display:none;position:fixed;inset:0;z-index:10;background:rgba(10,8,16,0.8);' +
    'align-items:center;justify-content:center;';
  root.innerHTML = `
    <div style="background:#1a1524;border:1px solid rgba(201,162,39,0.85);
                box-shadow:0 0 0 5px #0e0b14;padding:28px;width:300px;text-align:center;
                font-family:'EB Garamond',serif;color:#f5f0e6;">
      <div style="font-family:'Cinzel',serif;font-weight:700;font-size:20px;margin-bottom:16px;">
        RESTAURER UN RÈGNE</div>
      <input type="text" placeholder="LG1-XXX" autocapitalize="characters" spellcheck="false"
             style="width:100%;box-sizing:border-box;background:#0e0b14;color:#e8c96a;
                    border:1px solid rgba(184,176,200,0.4);padding:10px;font-size:18px;
                    text-align:center;font-family:inherit;text-transform:uppercase;outline:none;">
      <div data-role="error" style="color:#ff6a6a;font-size:14px;min-height:20px;margin:8px 0;"></div>
      <button data-role="ok" style="background:rgba(201,162,39,0.18);color:#e8c96a;
              border:1.5px solid rgba(201,162,39,0.85);padding:10px 24px;font-size:16px;
              font-family:inherit;font-weight:700;cursor:pointer;">Restaurer</button>
      <button data-role="cancel" style="background:none;color:#b8b0c8;margin-left:10px;
              border:1px solid rgba(184,176,200,0.4);padding:10px 18px;font-size:15px;
              font-family:inherit;cursor:pointer;">Annuler</button>
    </div>`;
  document.body.appendChild(root);
  const input = root.querySelector('input');
  const error = root.querySelector('[data-role=error]');
  const close = () => {
    root.style.display = 'none';
  };
  root.querySelector('[data-role=cancel]').addEventListener('click', close);
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close(); // tap hors du panneau
  });
  const submit = () => {
    const restored = decodeSave(input.value);
    if (!restored) {
      error.textContent = 'Ce code ne vient pas de Logres.';
      return;
    }
    progress.best = Math.max(progress.best, restored.best);
    progress.king = restored.king;
    saveProgress(progress);
    close();
  };
  root.querySelector('[data-role=ok]').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') close();
  });
  return { root, input, error };
}
const codeUi = buildCodeOverlay();

function openCodeOverlay() {
  codeUi.input.value = '';
  codeUi.error.textContent = '';
  codeUi.root.style.display = 'flex';
  codeUi.input.focus();
}

// --- Boucle ---
let lastPreview = null; // pour le tick au franchissement du seuil d'aperçu
let lastMiracle = null; // pour ne sonner qu'à l'apparition du message

function step(dt) {
  if (app.anim && app.mode !== 'pause') {
    // désintégration : poussière de carrés, puis la suivante est piochée
    if (updateShatter(app.anim.shatter, dt)) {
      app.anim = null;
      if (app.reign.dead) endReign();
      else {
        drawNext(app.reign, CARDS);
        autosave();
      }
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
  if (app.mode === 'menu' || app.mode === 'options') audio.setMusic('m_menu');
  else if (app.mode === 'play' || app.mode === 'pause')
    audio.setMusic(app.reign.combat ? 'm_bataille' : ERA_MUSIC[app.reign.era] ?? 'm_roche');
  else if (app.mode === 'dead') audio.setMusic('m_fin', false);

  render(ctx, app);
}

createLoop(step).start();
