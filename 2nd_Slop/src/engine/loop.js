// Game loop plafonné à 60 fps (les écrans 120 Hz appellent rAF deux fois trop vite).
// `step(dt)` reçoit un delta en secondes, borné pour absorber les onglets endormis.

export function createLoop(step, { fps = 60 } = {}) {
  const frame = 1000 / fps;
  let raf = null;
  let last = 0;

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!last) {
      last = now;
      return;
    }
    const elapsed = now - last;
    if (elapsed < frame - 1) return; // saute les frames excédentaires (120 Hz -> 60)
    last = now;
    step(Math.min(elapsed, 100) / 1000);
  }

  return {
    start() {
      if (raf === null) raf = requestAnimationFrame(tick);
    },
    stop() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      last = 0;
    },
  };
}
