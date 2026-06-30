export function createParticleField() {
  return { particles: [] };
}

export function spawnReactor(field, robot, rand, count = 2) {
  for (let i = 0; i < count; i++) {
    const life = 0.35 + rand() * 0.25;
    field.particles.push({
      x: robot.x + robot.w / 2 + (rand() - 0.5) * 6,
      y: robot.y + robot.h,
      vx: -(20 + rand() * 40),
      vy: 30 + rand() * 70,
      life,
      maxLife: life,
    });
  }
}

export function updateParticles(field, dt) {
  for (const p of field.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  field.particles = field.particles.filter((p) => p.life > 0);
}
