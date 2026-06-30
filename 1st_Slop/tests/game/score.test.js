import { describe, it, expect } from 'vitest';
import { createScore, checkPass, finalizeLevel } from '../../src/game/score.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

describe('score', () => {
  it('charge le bestLevel depuis le storage', () => {
    const s = createScore(fakeStorage({ 'jetpackbot.bestLevel': '7' }));
    expect(s.bestLevel).toBe(7);
  });

  it('bestLevel vaut 0 quand rien n\'est stocké', () => {
    expect(createScore(fakeStorage()).bestLevel).toBe(0);
  });

  it('checkPass true quand le robot a dépassé, false ensuite', () => {
    const robot = { x: 100 };
    const obstacle = { x: 30, passed: false };
    expect(checkPass(robot, obstacle, 60)).toBe(true);
    expect(obstacle.passed).toBe(true);
    expect(checkPass(robot, obstacle, 60)).toBe(false);
  });

  it('finalizeLevel persiste le niveau quand il dépasse le best', () => {
    const storage = fakeStorage({ 'jetpackbot.bestLevel': '3' });
    const s = createScore(storage);
    finalizeLevel(s, 9, storage);
    expect(s.bestLevel).toBe(9);
    expect(storage.getItem('jetpackbot.bestLevel')).toBe('9');
  });

  it('finalizeLevel ne baisse jamais le best', () => {
    const storage = fakeStorage({ 'jetpackbot.bestLevel': '10' });
    const s = createScore(storage);
    finalizeLevel(s, 4, storage);
    expect(s.bestLevel).toBe(10);
  });
});
