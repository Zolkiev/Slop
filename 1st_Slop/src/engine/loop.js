export function computeSteps(accumulator, frameDt, fixedDt, maxSteps = 5) {
  let acc = accumulator + frameDt;
  let steps = 0;
  while (acc >= fixedDt && steps < maxSteps) {
    acc -= fixedDt;
    steps += 1;
  }
  return { steps, accumulator: acc };
}

export function createLoop({ update, render, fixedDt }) {
  let accumulator = 0;
  let last = 0;
  let rafId = 0;
  let running = false;

  function frame(now) {
    if (!running) return;
    const frameDt = Math.min((now - last) / 1000, 0.25); // clamp anti gros lag
    last = now;
    const stepped = computeSteps(accumulator, frameDt, fixedDt);
    for (let i = 0; i < stepped.steps; i += 1) update(fixedDt);
    accumulator = stepped.accumulator;
    render();
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
}
