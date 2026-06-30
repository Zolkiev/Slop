import { CONFIG } from '../config.js';

export function createObstacle(x, gapY, gapH) {
  return { x, gapY, gapH, passed: false };
}

export function obstacleRects(o, width, height) {
  return [
    { x: o.x, y: 0, w: width, h: o.gapY },
    { x: o.x, y: o.gapY + o.gapH, w: width, h: height - (o.gapY + o.gapH) },
  ];
}

export function updateObstacles(obstacles, dt, speed = CONFIG.SCROLL_SPEED) {
  for (const o of obstacles) o.x -= speed * dt;
  return obstacles;
}

export function recycle(obstacles, width) {
  return obstacles.filter((o) => o.x + width > 0);
}

export function needsSpawn(obstacles, spawnX) {
  if (obstacles.length === 0) return true;
  const rightmost = Math.max(...obstacles.map((o) => o.x));
  return rightmost <= spawnX - CONFIG.OBSTACLE_SPACING;
}

export function randomGapY(rand, height, gapH) {
  const minY = CONFIG.GAP_MARGIN;
  const maxY = height - CONFIG.GAP_MARGIN - gapH;
  return minY + rand() * (maxY - minY);
}
