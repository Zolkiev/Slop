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

export function applySave(score, bestLevel, storage) {
  if (bestLevel > score.bestLevel) {
    score.bestLevel = bestLevel;
    storage?.setItem(KEY, String(bestLevel));
  }
  return score;
}

// Restauration explicite (SAISIR un code) : le code fait foi, même vers le
// bas — geste délibéré du joueur, façon password rétro. Le jeu naturel et le
// lien #save= passent par applySave et ne régressent jamais.
export function restoreSave(score, bestLevel, storage) {
  score.bestLevel = bestLevel;
  storage?.setItem(KEY, String(bestLevel));
  return score;
}

export function finalizeLevel(score, level, storage) {
  return applySave(score, level, storage);
}
