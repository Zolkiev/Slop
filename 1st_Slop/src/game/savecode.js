import { createSavecodeMenu } from './menu.js';
import { encodeSave } from './save.js';

export function createSavecode(score) {
  const code = score.bestLevel >= 1 ? encodeSave({ bestLevel: score.bestLevel }) : null;
  return { code, menu: createSavecodeMenu(code !== null), feedbackText: null, feedbackUntil: 0 };
}

export function setFeedback(sc, text, tick, duration = 90) {
  sc.feedbackText = text;
  sc.feedbackUntil = tick + duration;
}
