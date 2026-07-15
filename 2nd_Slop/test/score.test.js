import { describe, it, expect } from 'vitest';
import { loadProgress, saveProgress } from '../src/game/score.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('progression : tutoVu', () => {
  it('défaut false, persiste true', () => {
    const s = fakeStorage();
    expect(loadProgress(s).tutoVu).toBe(false);
    const p = loadProgress(s);
    p.tutoVu = true;
    saveProgress(p, s);
    expect(loadProgress(s).tutoVu).toBe(true);
  });
});
