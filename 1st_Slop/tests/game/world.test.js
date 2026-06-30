import { describe, it, expect } from 'vitest';
import { createWorld, press, updateWorld } from '../../src/game/world.js';
import { States } from '../../src/engine/state.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } };
}

describe('world', () => {
  it('passe de MENU à PLAY au premier press', () => {
    const w = createWorld(fakeStorage());
    expect(w.sm.get()).toBe(States.MENU);
    press(w);
    expect(w.sm.get()).toBe(States.PLAY);
  });

  it('le robot finit par mourir si on ne fait rien (chute)', () => {
    const w = createWorld(fakeStorage());
    press(w); // start
    for (let i = 0; i < 600; i += 1) updateWorld(w, 1 / 60);
    expect(w.sm.get()).toBe(States.GAMEOVER);
  });

  it('retry depuis GAMEOVER réinitialise le score courant', () => {
    const w = createWorld(fakeStorage());
    press(w);
    w.score.current = 5;
    for (let i = 0; i < 600; i += 1) updateWorld(w, 1 / 60);
    expect(w.sm.get()).toBe(States.GAMEOVER);
    press(w); // retry
    expect(w.sm.get()).toBe(States.PLAY);
    expect(w.score.current).toBe(0);
  });
});
