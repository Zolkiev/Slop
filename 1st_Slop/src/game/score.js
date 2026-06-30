const KEY = 'jetpackbot.bestLevel';

export function createScore(storage) {
  const bestLevel = Number(storage?.getItem(KEY)) || 0;
  return { bestLevel };
}

export function checkPass(robot, obstacle, width) {
  if (!obstacle.passed && robot.x > obstacle.x + width) {
    obstacle.passed = true;
    return true;
  }
  return false;
}

export function finalizeLevel(score, level, storage) {
  if (level > score.bestLevel) {
    score.bestLevel = level;
    storage?.setItem(KEY, String(level));
  }
  return score;
}
