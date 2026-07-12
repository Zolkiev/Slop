// Persistance de la progression : record d'années de règne + roi sélectionné.
// localStorage injectable pour les tests ; tout échec de stockage est silencieux.
import { KINGS } from './dynasty.js';

const KEY = 'logres.progress';

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return { best: 0, king: 0 };
    const p = JSON.parse(raw);
    return {
      best: Math.max(0, p.best | 0),
      king: Math.min(Math.max(0, p.king | 0), KINGS.length - 1),
    };
  } catch {
    return { best: 0, king: 0 };
  }
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // stockage indisponible (navigation privée…) : la partie reste jouable
  }
}
