import { CONFIG } from '../config.js';

// Un événement signature par décor (spec 2026-07-06-bg-events-design).
// Cadence : un déclenchement toutes les 6-12 s, un seul actif à la fois.
const DELAY_MIN = 6;
const DELAY_RANGE = 6;

// Bouches de cheminées sur bg-far-1, en ESPACE IMAGE (canvas 360×643) —
// repérées aux bases des panaches verts de l'asset natif ; le renderer
// convertit en espace écran au dessin (le fond défile, le halo suit).
const TORCH_SPOTS = [
  { x: 73, y: 339 }, { x: 324, y: 320 },
];

// Générateur de params par décor. Durées courtes = événement ponctuel ;
// les oiseaux traversent lentement (leur durée EST la traversée).
const EVENTS = [
  (rand) => ({ kind: 'rafale', dur: 1.2 }),
  (rand) => ({ kind: 'torchere', dur: 2.5, spot: TORCH_SPOTS[Math.floor(rand() * TORCH_SPOTS.length)] }),
  (rand) => ({ kind: 'oiseaux', dur: 9, baseY: 150 + rand() * 110, dir: rand() < 0.5 ? 1 : -1 }),
  (rand) => ({ kind: 'foudre', dur: 0.5 }),
  (rand) => ({
    kind: 'etoile', dur: 0.7,
    x0: 40 + rand() * 200, y0: 30 + rand() * 150,
    vx: 260 + rand() * 80, vy: 110 + rand() * 50,
  }),
];

function drawDelay(rand) {
  return DELAY_MIN + rand() * DELAY_RANGE;
}

export function createBgEvents(rand) {
  return { timer: drawDelay(rand), event: null };
}

export function resetBgEvents(ev, rand) {
  ev.event = null;
  ev.timer = drawDelay(rand);
}

export function updateBgEvents(ev, dt, bgSet, rand) {
  if (ev.event) {
    ev.event.t += dt;
    if (ev.event.t >= ev.event.dur) {
      ev.event = null;
      ev.timer = drawDelay(rand);
    }
    return;
  }
  ev.timer -= dt;
  if (ev.timer <= 0) {
    ev.event = { t: 0, ...EVENTS[bgSet](rand) };
  }
}

// Flash foudre : double pulse (attaque instantanée, retombée rapide,
// second coup plus faible), plafonné à 0.35 — les portes restent lisibles.
export function foudreAlpha(event) {
  const p1 = Math.max(0, 1 - event.t / 0.18);
  const p2 = event.t < 0.24 ? 0 : Math.max(0, 1 - (event.t - 0.24) / 0.2);
  return 0.35 * p1 + 0.22 * p2;
}

// Rafale néon : un front balaie l'écran de gauche à droite, les fenêtres
// twinkle proches du front passent à pleine intensité (renderer étape 2a).
export function rafaleAlpha(ev, x) {
  const e = ev.event;
  if (!e || e.kind !== 'rafale') return 0;
  const front = (e.t / e.dur) * (CONFIG.WIDTH + 80) - 40;
  const d = Math.abs(x - front);
  return d < 40 ? 1 - d / 40 : 0;
}
