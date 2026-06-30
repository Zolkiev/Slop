const KEY = 'jetpackbot.best';

export function createScore(storage) {
  const raw = storage?.getItem(KEY);
  const best = Number(raw) || 0;
  return { current: 0, best };
}

export function scorePass(scoreState) {
  scoreState.current += 1;
  return scoreState;
}

export function checkPass(robot, obstacle, width) {
  if (!obstacle.passed && robot.x > obstacle.x + width) {
    obstacle.passed = true;
    return true;
  }
  return false;
}

export function finalize(scoreState, storage) {
  if (scoreState.current > scoreState.best) {
    scoreState.best = scoreState.current;
    storage?.setItem(KEY, String(scoreState.best));
  }
  return scoreState;
}
