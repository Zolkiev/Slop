import { States } from '../engine/state.js';

const GAME_STATES = new Set([States.PLAY, States.PAUSE, States.LEVEL_COMPLETE]);
const MENU_STATES = new Set([States.MENU, States.SAVECODE]);

export function musicFor(state, bgSet, optionsReturn = 'menu') {
  if (GAME_STATES.has(state)) return `music-${bgSet}`;
  if (MENU_STATES.has(state)) return 'music-menu';
  if (state === States.OPTIONS) {
    return optionsReturn === 'pause' ? `music-${bgSet}` : 'music-menu';
  }
  if (state === States.GAMEOVER) return 'jingle-gameover';
  return null;
}

// Le jingle joue une fois puis silence ; tout le reste boucle.
export function isLooping(key) {
  return key !== 'jingle-gameover';
}
