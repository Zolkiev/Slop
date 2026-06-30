export function createAmbiance(rand, count, width, height) {
  const drops = [];
  for (let i = 0; i < count; i++) {
    drops.push({
      x: rand() * width,
      y: rand() * height,
      vx: -(10 + rand() * 20),
      vy: 60 + rand() * 60,
      len: 4 + rand() * 6,
    });
  }
  return { drops };
}

export function updateAmbiance(field, dt, width, height) {
  for (const d of field.drops) {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (d.y > height) {
      d.y -= height;
      d.x = ((d.x % width) + width) % width;
    }
    if (d.x < 0) {
      d.x += width;
    }
  }
}
