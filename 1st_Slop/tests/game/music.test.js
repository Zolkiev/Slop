import { describe, it, expect } from 'vitest';
import { musicFor } from '../../src/game/music.js';
import { States } from '../../src/engine/state.js';

describe('musicFor', () => {
  it('joue music-<bgSet> en PLAY, PAUSE et LEVEL_COMPLETE', () => {
    for (const s of [States.PLAY, States.PAUSE, States.LEVEL_COMPLETE]) {
      expect(musicFor(s, 0)).toBe('music-0');
      expect(musicFor(s, 2)).toBe('music-2');
    }
  });

  it('silence au MENU, GAMEOVER, SAVECODE et OPTIONS', () => {
    for (const s of [States.MENU, States.GAMEOVER, States.SAVECODE, States.OPTIONS]) {
      expect(musicFor(s, 1)).toBe(null);
    }
  });
});
