import { CONFIG } from '../config.js';

export function gateGoalForLevel(level) {
  const n = Math.max(1, level) - 1;
  return Math.min(CONFIG.GATES_BASE + n * CONFIG.GATES_STEP, CONFIG.GATES_CAP);
}

export function tierForLevel(level) {
  let tier = 0;
  for (const seuil of CONFIG.PATTERN_TIERS) {
    if (level >= seuil) tier += 1;
  }
  return Math.max(1, tier);
}

export function difficultyForLevel(level) {
  const n = Math.max(1, level) - 1;
  const scrollSpeed = Math.min(CONFIG.SPEED_BASE + n * CONFIG.SPEED_STEP, CONFIG.SPEED_MAX);
  const gapMin = Math.max(CONFIG.GAP_BASE - n * CONFIG.GAP_SHRINK, CONFIG.GAP_FLOOR);
  const gapMax = gapMin + CONFIG.GAP_RANGE;
  const spacing = Math.max(CONFIG.OBSTACLE_SPACING - n * CONFIG.SPACING_STEP, CONFIG.SPACING_FLOOR);
  // Capacités physiques entre deux portes consécutives : ce qu'un robot peut
  // monter (taps maintenus) ou descendre (chute, moins la rampe d'accélération)
  // dans le temps de trajet t. Les motifs s'expriment en fractions de ces bornes.
  const t = spacing / scrollSpeed;
  const deltaUp = CONFIG.SAFETY_UP * CONFIG.THRUST * t;
  const deltaDown = CONFIG.SAFETY_DOWN * (CONFIG.MAX_FALL * t - CONFIG.MAX_FALL ** 2 / (2 * CONFIG.GRAVITY));
  return { scrollSpeed, gapMin, gapMax, spacing, deltaUp, deltaDown, tier: tierForLevel(level) };
}
