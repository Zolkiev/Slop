import { CONFIG } from '../config.js';

// Motifs de portes. Chaque motif est une fonction pure
// (rand, prevGapY, diff) -> salve, où une salve = [{ gapY, gapH, spacing }].
// Les deltas s'expriment en fractions des capacités physiques du niveau
// (diff.deltaUp / diff.deltaDown) : un motif est calibré à la vitesse courante.
// prevGapY = gapY de la dernière porte déjà en jeu.

function randRange(rand, min, max) {
  return min + rand() * (max - min);
}

function randGapH(rand, diff) {
  return randRange(rand, diff.gapMin, diff.gapMax);
}

function clampGapY(gapY, gapH) {
  const minY = CONFIG.GAP_MARGIN;
  const maxY = CONFIG.HEIGHT - CONFIG.GAP_MARGIN - gapH;
  return Math.max(minY, Math.min(maxY, gapY));
}

// Avance d'un delta signé (négatif = vers le haut), clampé à l'écran.
// Si le clamp écrase plus de la moitié du mouvement voulu, on miroite la
// direction : le motif reste vivant près des bords au lieu de s'y coller.
function step(prevGapY, delta, gapH) {
  const cible = prevGapY + delta;
  const clampee = clampGapY(cible, gapH);
  if (clampee !== cible && Math.abs(clampee - prevGapY) < Math.abs(delta) / 2) {
    return clampGapY(prevGapY - delta, gapH);
  }
  return clampee;
}

// Tire un delta signé : fraction [fMin, fMax] de la capacité directionnelle.
function tirerDelta(rand, up, diff, fMin, fMax) {
  const cap = up ? diff.deltaUp : diff.deltaDown;
  return (up ? -1 : 1) * randRange(rand, fMin, fMax) * cap;
}

// FLOW — marche aléatoire douce (tier 1) : deltas ≤ 0.35 × capacité.
export function flow(rand, prevGapY, diff) {
  const count = 3 + Math.floor(rand() * 3);
  const salve = [];
  let y = prevGapY;
  for (let i = 0; i < count; i += 1) {
    const gapH = randGapH(rand, diff);
    y = step(y, tirerDelta(rand, rand() < 0.5, diff, 0, 0.35), gapH);
    salve.push({ gapY: y, gapH, spacing: diff.spacing });
  }
  return salve;
}

// ESCALIER — 4 portes monotones (tier 2) : pas de 0.5-0.7 × capacité, borné
// par la place disponible (room/4) pour que l'escalier ne tape jamais le mur —
// monotonie garantie, direction = côté qui a le plus de piste.
export function escalier(rand, prevGapY, diff) {
  const roomHaut = prevGapY - CONFIG.GAP_MARGIN;
  const roomBas = CONFIG.HEIGHT - CONFIG.GAP_MARGIN - diff.gapMax - prevGapY;
  const up = roomHaut === roomBas ? rand() < 0.5 : roomHaut > roomBas;
  const room = Math.max(0, up ? roomHaut : roomBas);
  const salve = [];
  let y = prevGapY;
  for (let i = 0; i < 4; i += 1) {
    const gapH = randGapH(rand, diff);
    const cap = up ? diff.deltaUp : diff.deltaDown;
    const pas = Math.min(randRange(rand, 0.5, 0.7) * cap, room / 4);
    y = step(y, (up ? -1 : 1) * pas, gapH);
    salve.push({ gapY: y, gapH, spacing: diff.spacing });
  }
  return salve;
}

// ZIGZAG — 4 portes en alternance forcée (tier 3) : 0.6-1.0 × capacité.
export function zigzag(rand, prevGapY, diff) {
  const salve = [];
  let y = prevGapY;
  let up = rand() < 0.5;
  for (let i = 0; i < 4; i += 1) {
    const gapH = randGapH(rand, diff);
    y = step(y, tirerDelta(rand, up, diff, 0.6, 1.0), gapH);
    salve.push({ gapY: y, gapH, spacing: diff.spacing });
    up = !up;
  }
  return salve;
}

// COULOIR — 3 portes à même hauteur, gap serré, spacing réduit (tier 4).
export function couloir(rand, prevGapY, diff) {
  const gapH = Math.max(CONFIG.GAP_FLOOR, diff.gapMin - 15);
  const spacing = Math.max(160, diff.spacing * 0.9);
  const base = clampGapY(prevGapY, gapH);
  const salve = [];
  for (let i = 0; i < 3; i += 1) {
    salve.push({ gapY: clampGapY(base + randRange(rand, -10, 10), gapH), gapH, spacing });
  }
  return salve;
}

// CHICANE — zigzag ample + spacing réduit (tier 5). Les capacités sont
// calculées sur le spacing plein du niveau : avec le spacing réduit à 85 %,
// la marge SAFETY (0.55/0.6) garde le motif largement passable (~0.65 × la
// capacité brute réelle) — couvert par le test d'invariant de jouabilité.
export function chicane(rand, prevGapY, diff) {
  const count = 4 + Math.floor(rand() * 2);
  const spacing = Math.max(160, diff.spacing * 0.85);
  const salve = [];
  let y = prevGapY;
  let up = rand() < 0.5;
  for (let i = 0; i < count; i += 1) {
    const gapH = randGapH(rand, diff);
    y = step(y, tirerDelta(rand, up, diff, 0.7, 1.0), gapH);
    salve.push({ gapY: y, gapH, spacing });
    up = !up;
  }
  return salve;
}

export const POOLS = [
  [flow],
  [flow, escalier],
  [flow, escalier, zigzag],
  [flow, escalier, zigzag, couloir],
  [flow, escalier, zigzag, couloir, chicane],
];

// Tire un motif dans le pool du tier ; le plus récent pèse double pour que
// le joueur rencontre souvent la nouveauté de son palier.
export function nextSalve(rand, prevGapY, diff) {
  const pool = POOLS[Math.min(diff.tier, POOLS.length) - 1];
  const pondere = pool.length > 1 ? [...pool, pool[pool.length - 1]] : pool;
  const motif = pondere[Math.floor(rand() * pondere.length)];
  return motif(rand, prevGapY, diff);
}
