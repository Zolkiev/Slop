// Deux notions (spec save-continue) : `level` = partie en cours (ce que
// CONTINUE reprend), `record` = meilleur niveau à vie (skins + code de
// save, ne régresse JAMAIS). Clé record = clé historique : migration
// gratuite des saves existantes.
const KEY_RECORD = 'jetpackbot.bestLevel';
const KEY_LEVEL = 'jetpackbot.level';

export function createScore(storage) {
  const record = Number(storage?.getItem(KEY_RECORD)) || 0;
  const level = Number(storage?.getItem(KEY_LEVEL)) || record;
  return { level, record };
}

export function checkPass(robot, obstacle, width) {
  if (!obstacle.passed && robot.x > obstacle.x + width) {
    obstacle.passed = true;
    return true;
  }
  return false;
}

function bumpRecord(score, value, storage) {
  if (value > score.record) {
    score.record = value;
    storage?.setItem(KEY_RECORD, String(value));
  }
}

// Jeu naturel (LEVEL_COMPLETE -> niveau+1, crash -> niveau) et lien
// #save= au boot : max sur les deux, jamais de régression accidentelle.
export function saveProgress(score, value, storage) {
  if (value > score.level) {
    score.level = value;
    storage?.setItem(KEY_LEVEL, String(value));
  }
  bumpRecord(score, value, storage);
  return score;
}

// NEW GAME confirmé : la partie repart à 1, le record (skins) reste acquis.
export function resetProgress(score, storage) {
  score.level = 1;
  storage?.setItem(KEY_LEVEL, '1');
  return score;
}

// SAISIR un code : geste délibéré, le code fait foi pour la partie en
// cours (même vers le bas — outil de test), le record ne fait que monter.
export function applyCode(score, value, storage) {
  score.level = value;
  storage?.setItem(KEY_LEVEL, String(value));
  bumpRecord(score, value, storage);
  return score;
}
