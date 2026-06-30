export function createTwinkles(rand, count, width, height) {
  const points = [];
  for (let i = 0; i < count; i++) {
    points.push({
      x: rand() * width,
      y: rand() * height * 0.72,
      phase: rand() * Math.PI * 2,
      period: 24 + rand() * 48,
      color: ['#00e5ff', '#ff3ea5', '#ffe14d'][Math.floor(rand() * 3)],
    });
  }
  return { points };
}

export function twinkleAlpha(point, tick) {
  return 0.15 + 0.55 * (0.5 + 0.5 * Math.sin((tick / point.period) * Math.PI * 2 + point.phase));
}
