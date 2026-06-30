import { describe, it, expect } from 'vitest';
import {
  createScore, scorePass, checkPass, finalize,
} from '../../src/game/score.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

describe('score', () => {
  it('charge le best depuis le storage', () => {
    const s = createScore(fakeStorage({ 'jetpackbot.best': '7' }));
    expect(s.current).toBe(0);
    expect(s.best).toBe(7);
  });

  it('scorePass incrémente le score courant', () => {
    const s = createScore(fakeStorage());
    scorePass(s);
    scorePass(s);
    expect(s.current).toBe(2);
  });

  it('checkPass true quand le robot a dépassé, false ensuite', () => {
    const robot = { x: 100 };
    const obstacle = { x: 30, passed: false };
    // 30 + 60 = 90 < 100 -> dépassé
    expect(checkPass(robot, obstacle, 60)).toBe(true);
    expect(obstacle.passed).toBe(true);
    expect(checkPass(robot, obstacle, 60)).toBe(false);
  });

  it('finalize persiste le best quand le score le dépasse', () => {
    const storage = fakeStorage({ 'jetpackbot.best': '3' });
    const s = createScore(storage);
    s.current = 9;
    finalize(s, storage);
    expect(s.best).toBe(9);
    expect(storage.getItem('jetpackbot.best')).toBe('9');
  });

  it('finalize ne baisse jamais le best', () => {
    const storage = fakeStorage({ 'jetpackbot.best': '10' });
    const s = createScore(storage);
    s.current = 4;
    finalize(s, storage);
    expect(s.best).toBe(10);
  });
});
