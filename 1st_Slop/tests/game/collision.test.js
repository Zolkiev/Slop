import { describe, it, expect } from 'vitest';
import { aabb, hitsBounds } from '../../src/game/collision.js';

describe('collision', () => {
  it('détecte le chevauchement de deux rectangles', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 5, y: 5, w: 10, h: 10 };
    expect(aabb(a, b)).toBe(true);
  });

  it('renvoie false quand les rectangles sont séparés', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 20, y: 20, w: 5, h: 5 };
    expect(aabb(a, b)).toBe(false);
  });

  it('détecte la sortie par le bas', () => {
    expect(hitsBounds({ y: 630, h: 24 }, 640)).toBe(true);
  });

  it('détecte la sortie par le haut', () => {
    expect(hitsBounds({ y: -1, h: 24 }, 640)).toBe(true);
  });

  it('renvoie false quand le robot est dans les bornes', () => {
    expect(hitsBounds({ y: 300, h: 24 }, 640)).toBe(false);
  });
});
