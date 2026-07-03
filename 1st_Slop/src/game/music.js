import { States } from '../engine/state.js';

const GAME_STATES = new Set([States.PLAY, States.PAUSE, States.LEVEL_COMPLETE]);
const MENU_STATES = new Set([States.MENU, States.SAVECODE]);

// Piste par décor. Intérim pour les tiers 4-5 (tempête/orbite) : réutilise
// les pistes existantes en attendant leurs musiques dédiées (sous-projet 3).
export const BG_MUSIC = ['music-0', 'music-1', 'music-2', 'music-1', 'music-2'];

export function musicFor(state, bgSet, optionsReturn = 'menu') {
  if (GAME_STATES.has(state)) return BG_MUSIC[bgSet];
  if (MENU_STATES.has(state)) return 'music-menu';
  if (state === States.OPTIONS) {
    return optionsReturn === 'pause' ? BG_MUSIC[bgSet] : 'music-menu';
  }
  if (state === States.GAMEOVER) return 'jingle-gameover';
  return null;
}

// Le jingle joue une fois puis silence ; tout le reste boucle.
export function isLooping(key) {
  return key !== 'jingle-gameover';
}
