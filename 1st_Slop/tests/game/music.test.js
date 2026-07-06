import { describe, it, expect } from 'vitest';
import { musicFor, isLooping, BG_MUSIC } from '../../src/game/music.js';
import { States } from '../../src/engine/state.js';

describe('musicFor', () => {
  it('joue la piste BG_MUSIC[bgSet] en PLAY, PAUSE et LEVEL_COMPLETE', () => {
    for (const s of [States.PLAY, States.PAUSE, States.LEVEL_COMPLETE]) {
      expect(musicFor(s, 0)).toBe('music-0');
      expect(musicFor(s, 2)).toBe('music-2');
    }
  });

  it('joue music-menu au MENU et en SAVECODE', () => {
    expect(musicFor(States.MENU, 1)).toBe('music-menu');
    expect(musicFor(States.SAVECODE, 1)).toBe('music-menu');
  });

  it('OPTIONS garde la musique du contexte d\'ouverture', () => {
    expect(musicFor(States.OPTIONS, 1, 'menu')).toBe('music-menu');
    expect(musicFor(States.OPTIONS, 1, 'pause')).toBe('music-1');
    expect(musicFor(States.OPTIONS, 1)).toBe('music-menu'); // défaut
  });

  it('joue le jingle au GAMEOVER', () => {
    expect(musicFor(States.GAMEOVER, 1)).toBe('jingle-gameover');
  });

  it('retourne null pour un état inconnu', () => {
    expect(musicFor('nope', 0)).toBe(null);
  });

  it('mappe les nouveaux décors sur les pistes d\'intérim (table BG_MUSIC)', () => {
    expect(musicFor(States.PLAY, 3)).toBe('music-1'); // tempête -> l'énergique
    expect(musicFor(States.PLAY, 4)).toBe('music-2'); // orbite -> la mystérieuse
    expect(musicFor(States.OPTIONS, 3, 'pause')).toBe('music-1');
    expect(BG_MUSIC).toEqual(['music-0', 'music-1', 'music-2', 'music-1', 'music-2']);
  });
});

describe('isLooping', () => {
  it('seul le jingle ne boucle pas', () => {
    expect(isLooping('jingle-gameover')).toBe(false);
    expect(isLooping('music-0')).toBe(true);
    expect(isLooping('music-menu')).toBe(true);
    expect(isLooping(null)).toBe(true);
  });
});
