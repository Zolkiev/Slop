import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../src/config.js';
import {
  createObstacle, obstacleRects, updateObstacles,
  recycle, needsSpawn,
} from '../../src/game/obstacles.js';

describe('obstacles', () => {
  it('crée un obstacle non franchi', () => {
    const o = createObstacle(400, 200, 180);
    expect(o).toEqual({ x: 400, gapY: 200, gapH: 180, passed: false });
  });

  it('produit un rect haut et un rect bas autour du gap', () => {
    const [top, bottom] = obstacleRects(createObstacle(400, 200, 180), 60, 640);
    expect(top).toEqual({ x: 400, y: 0, w: 60, h: 200 });
    expect(bottom).toEqual({ x: 400, y: 380, w: 60, h: 260 });
  });

  it('déplace les obstacles vers la gauche', () => {
    const list = [createObstacle(400, 200, 180)];
    updateObstacles(list, 1);
    expect(list[0].x).toBeCloseTo(400 - CONFIG.SCROLL_SPEED, 5);
  });

  it('recycle les obstacles entièrement sortis à gauche', () => {
    const list = [createObstacle(-70, 200, 180), createObstacle(100, 200, 180)];
    const kept = recycle(list, CONFIG.OBSTACLE_W);
    expect(kept).toHaveLength(1);
    expect(kept[0].x).toBe(100);
  });

  it('needsSpawn renvoie true si liste vide', () => {
    expect(needsSpawn([], 360)).toBe(true);
  });

  it('needsSpawn renvoie true quand le dernier obstacle est assez à gauche', () => {
    const list = [createObstacle(360 - CONFIG.OBSTACLE_SPACING, 200, 180)];
    expect(needsSpawn(list, 360)).toBe(true);
  });

  it('needsSpawn respecte le spacing passé en paramètre', () => {
    const list = [createObstacle(360 - 200, 200, 180)];
    expect(needsSpawn(list, 360, 200)).toBe(true);
    expect(needsSpawn(list, 360, 210)).toBe(false);
  });

  it('utilise la vitesse fournie quand elle est précisée', () => {
    const list = [createObstacle(400, 200, 180)];
    updateObstacles(list, 1, 300);
    expect(list[0].x).toBeCloseTo(100, 5);
  });
});
