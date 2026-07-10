export function computeSteps(accumulator, frameDt, fixedDt, maxSteps = 5) {
  let acc = accumulator + frameDt;
  let steps = 0;
  while (acc >= fixedDt && steps < maxSteps) {
    acc -= fixedDt;
    steps += 1;
  }
  return { steps, accumulator: acc };
}

// Plafonne le rendu à ~60 fps même quand rAF tourne plus vite (écrans 120 Hz).
// minInterval = 15 ms laisse passer un rendu à 60 Hz (16,7 ms) et saute 1 frame
// sur 2 à 120 Hz (8,33 ms). lastRender = -Infinity force le rendu du 1er frame.
export function shouldRender(now, lastRender, minInterval = 15) {
  return now - lastRender >= minInterval;
}

export function createLoop({ update, render, fixedDt }) {
  let accumulator = 0;
  let last = 0;
  let lastRender = -Infinity;
  let rafId = 0;
  let running = false;

  function frame(now) {
    if (!running) return;
    const frameDt = Math.min((now - last) / 1000, 0.25); // clamp anti gros lag
    last = now;
    const stepped = computeSteps(accumulator, frameDt, fixedDt);
    for (let i = 0; i < stepped.steps; i += 1) update(fixedDt);
    accumulator = stepped.accumulator;
    // Les updates à pas fixe tournent à chaque frame (ci-dessus) ; seul le
    // rendu est plafonné, pour ne pas faire dériver l'accumulateur.
    if (shouldRender(now, lastRender)) {
      lastRender = now;
      render();
    }
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      running = true;
      last = performance.now();
      lastRender = -Infinity;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
}
