import { describe, it, expect } from 'vitest';
import { gateGoalForLevel, difficultyForLevel } from '../../src/game/level.js';
import { CONFIG } from '../../src/config.js';

describe('level', () => {
  it('gateGoalForLevel renvoie GATES_PER_LEVEL', () => {
    expect(gateGoalForLevel(1)).toBe(CONFIG.GATES_PER_LEVEL);
    expect(gateGoalForLevel(9)).toBe(CONFIG.GATES_PER_LEVEL);
  });

  it('niveau 1 reproduit exactement les valeurs V1', () => {
    const d = difficultyForLevel(1);
    expect(d.scrollSpeed).toBe(CONFIG.SCROLL_SPEED);
    expect(d.gapMin).toBe(CONFIG.GAP_MIN);
    expect(d.gapMax).toBe(CONFIG.GAP_MAX);
  });

  it('la vitesse croît avec le niveau puis plafonne à SPEED_MAX', () => {
    expect(difficultyForLevel(2).scrollSpeed).toBeGreaterThan(difficultyForLevel(1).scrollSpeed);
    expect(difficultyForLevel(1000).scrollSpeed).toBe(CONFIG.SPEED_MAX);
  });

  it('le gap minimal décroît avec le niveau puis plancher à GAP_FLOOR', () => {
    expect(difficultyForLevel(2).gapMin).toBeLessThan(difficultyForLevel(1).gapMin);
    expect(difficultyForLevel(1000).gapMin).toBe(CONFIG.GAP_FLOOR);
  });
});
