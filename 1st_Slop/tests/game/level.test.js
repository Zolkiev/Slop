import { describe, it, expect } from 'vitest';
import { gateGoalForLevel, tierForLevel, difficultyForLevel } from '../../src/game/level.js';
import { CONFIG } from '../../src/config.js';

describe('gateGoalForLevel', () => {
  it('croît de 5 par niveau depuis 10 puis plafonne à 30', () => {
    expect(gateGoalForLevel(1)).toBe(10);
    expect(gateGoalForLevel(2)).toBe(15);
    expect(gateGoalForLevel(4)).toBe(25);
    expect(gateGoalForLevel(5)).toBe(30);
    expect(gateGoalForLevel(6)).toBe(30);
    expect(gateGoalForLevel(100)).toBe(30);
  });
});

describe('tierForLevel', () => {
  it('suit les seuils PATTERN_TIERS', () => {
    expect(tierForLevel(1)).toBe(1);
    expect(tierForLevel(2)).toBe(1);
    expect(tierForLevel(3)).toBe(2);
    expect(tierForLevel(5)).toBe(3);
    expect(tierForLevel(7)).toBe(4);
    expect(tierForLevel(9)).toBe(4);
    expect(tierForLevel(10)).toBe(5);
    expect(tierForLevel(1000)).toBe(5);
  });
});

describe('difficultyForLevel', () => {
  it('niveau 1 reproduit exactement les valeurs V1', () => {
    const d = difficultyForLevel(1);
    expect(d.scrollSpeed).toBe(CONFIG.SCROLL_SPEED);
    expect(d.gapMin).toBe(CONFIG.GAP_MIN);
    expect(d.gapMax).toBe(CONFIG.GAP_MAX);
    expect(d.spacing).toBe(CONFIG.OBSTACLE_SPACING);
    expect(d.tier).toBe(1);
  });

  it('la vitesse croît puis plafonne, le gap décroît puis plancher', () => {
    expect(difficultyForLevel(2).scrollSpeed).toBeGreaterThan(difficultyForLevel(1).scrollSpeed);
    expect(difficultyForLevel(1000).scrollSpeed).toBe(CONFIG.SPEED_MAX);
    expect(difficultyForLevel(2).gapMin).toBeLessThan(difficultyForLevel(1).gapMin);
    expect(difficultyForLevel(1000).gapMin).toBe(CONFIG.GAP_FLOOR);
  });

  it('le spacing décroît puis plancher à SPACING_FLOOR', () => {
    expect(difficultyForLevel(2).spacing).toBeLessThan(difficultyForLevel(1).spacing);
    expect(difficultyForLevel(1000).spacing).toBe(CONFIG.SPACING_FLOOR);
  });

  it('les capacités physiques suivent t = spacing/scrollSpeed', () => {
    const d1 = difficultyForLevel(1);
    const t1 = d1.spacing / d1.scrollSpeed;
    expect(d1.deltaUp).toBeCloseTo(CONFIG.SAFETY_UP * CONFIG.THRUST * t1, 5);
    expect(d1.deltaDown).toBeCloseTo(
      CONFIG.SAFETY_DOWN * (CONFIG.MAX_FALL * t1 - CONFIG.MAX_FALL ** 2 / (2 * CONFIG.GRAVITY)), 5);
    // plus on va vite, moins on peut bouger entre deux portes
    expect(difficultyForLevel(15).deltaUp).toBeLessThan(d1.deltaUp);
    expect(difficultyForLevel(15).deltaDown).toBeLessThan(d1.deltaDown);
    // les capacités restent strictement positives au taquet
    expect(difficultyForLevel(1000).deltaUp).toBeGreaterThan(0);
    expect(difficultyForLevel(1000).deltaDown).toBeGreaterThan(0);
  });
});
