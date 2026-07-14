// Persistance de la progression : record d'années de règne + roi sélectionné
// + volumes audio choisis dans le menu pause.
// localStorage injectable pour les tests ; tout échec de stockage est silencieux.
import { KINGS } from './dynasty.js';

const KEY = 'logres.progress';

export const DEFAULT_MUSIC_VOL = 0.35;
export const DEFAULT_SFX_VOL = 0.6;

const clampVol = (v, fallback) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

function defaults() {
  return { best: 0, king: 0, musicVol: DEFAULT_MUSIC_VOL, sfxVol: DEFAULT_SFX_VOL };
}

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return defaults();
    const p = JSON.parse(raw);
    return {
      best: Math.max(0, p.best | 0),
      king: Math.min(Math.max(0, p.king | 0), KINGS.length - 1),
      musicVol: clampVol(p.musicVol, DEFAULT_MUSIC_VOL),
      sfxVol: clampVol(p.sfxVol, DEFAULT_SFX_VOL),
    };
  } catch {
    return defaults();
  }
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // stockage indisponible (navigation privée…) : la partie reste jouable
  }
}
