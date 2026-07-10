import { CONFIG } from '../config.js';

// Un événement signature par décor (spec 2026-07-06-bg-events-design,
// cadence amendée au gate Jael du 08/07) : premier déclenchement rapide
// (visible même sur une partie courte — le restart réarme sur `first`),
// puis relance régulière tirée dans `next` à la fin de chaque événement.
// Un seul actif à la fois ; torchère : next [0,0] = enchaînée en continu.
const CADENCE = [
  { first: 1.5, next: [4, 6] },  // rafale néon
  { first: 0.6, next: [0, 0] },  // torchère (la fumée verte brûle tout le temps)
  { first: 1.5, next: [5, 8] },  // oiseaux (la traversée elle-même dure 9 s)
  { first: 2, next: [5, 6] },    // foudre (« premier à 2 s, puis toutes les 5-6 s »)
  { first: 2, next: [4, 6] },    // étoile filante
];

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
  (rand) => ({ kind: 'foudre', dur: 0.5, bolt: Math.floor(rand() * 3), boltX: 30 + rand() * 200 }),
  (rand) => ({
    kind: 'etoile', dur: 0.7,
    x0: 40 + rand() * 200, y0: 30 + rand() * 150,
    vx: 260 + rand() * 80, vy: 110 + rand() * 50,
  }),
];

export function createBgEvents() {
  // Désarmé à la création : armé par resetBgEvents au premier applyBgSet
  // (le délai dépend du décor, inconnu ici).
  return { timer: Infinity, event: null };
}

export function resetBgEvents(ev, bgSet) {
  ev.event = null;
  ev.timer = CADENCE[bgSet].first;
}

export function updateBgEvents(ev, dt, bgSet, rand) {
  if (ev.event) {
    ev.event.t += dt;
    if (ev.event.t >= ev.event.dur) {
      ev.event = null;
      const [min, max] = CADENCE[bgSet].next;
      ev.timer = min + rand() * (max - min);
    }
    return;
  }
  ev.timer -= dt;
  if (ev.timer <= 0) {
    ev.event = { t: 0, ...EVENTS[bgSet](rand) };
  }
}

// Flash foudre : double pulse (attaque instantanée, retombée rapide,
// second coup plus faible), plafonné à FOUDRE_PEAK — les portes restent
// lisibles. Exporté pour que le renderer normalise le sprite d'éclair sur
// le même pic sans dupliquer la constante.
export const FOUDRE_PEAK = 0.35;

export function foudreAlpha(event) {
  const p1 = Math.max(0, 1 - event.t / 0.18);
  const p2 = event.t < 0.24 ? 0 : Math.max(0, 1 - (event.t - 0.24) / 0.2);
  return FOUDRE_PEAK * p1 + 0.22 * p2;
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
