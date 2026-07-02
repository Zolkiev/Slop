import { States } from '../engine/state.js';

const MUSIC_STATES = new Set([States.PLAY, States.PAUSE, States.LEVEL_COMPLETE]);

export function musicFor(state, bgSet) {
  return MUSIC_STATES.has(state) ? `music-${bgSet}` : null;
}
