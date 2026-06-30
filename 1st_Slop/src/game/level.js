import { CONFIG } from '../config.js';

export function gateGoalForLevel(level) {
  return CONFIG.GATES_PER_LEVEL;
}

export function difficultyForLevel(level) {
  const n = Math.max(1, level) - 1;
  const scrollSpeed = Math.min(CONFIG.SPEED_BASE + n * CONFIG.SPEED_STEP, CONFIG.SPEED_MAX);
  const gapMin = Math.max(CONFIG.GAP_BASE - n * CONFIG.GAP_SHRINK, CONFIG.GAP_FLOOR);
  const gapMax = gapMin + CONFIG.GAP_RANGE;
  return { scrollSpeed, gapMin, gapMax };
}
