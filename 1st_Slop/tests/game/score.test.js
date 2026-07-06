import { describe, it, expect } from 'vitest';
import { createScore, checkPass, saveProgress, resetProgress, applyCode } from '../../src/game/score.js';

function fakeStorage(initial = {}) {
  const d = { ...initial };
  return {
    getItem: (k) => d[k] ?? null,
    setItem: (k, v) => { d[k] = String(v); },
  };
}

describe('createScore — migration', () => {
  it('appareil vierge : level 0, record 0', () => {
    expect(createScore(fakeStorage())).toEqual({ level: 0, record: 0 });
  });

  it('save historique (bestLevel seul) : level = record', () => {
    const s = createScore(fakeStorage({ 'jetpackbot.bestLevel': '10' }));
    expect(s).toEqual({ level: 10, record: 10 });
  });

  it('les deux clés : chacune la sienne', () => {
    const s = createScore(fakeStorage({ 'jetpackbot.bestLevel': '10', 'jetpackbot.level': '2' }));
    expect(s).toEqual({ level: 2, record: 10 });
  });

  it('tolère un storage absent', () => {
    expect(createScore(undefined)).toEqual({ level: 0, record: 0 });
  });
});

describe('checkPass', () => {
  it('true quand le robot a dépassé, false ensuite', () => {
    const robot = { x: 100 };
    const obstacle = { x: 30, passed: false };
    expect(checkPass(robot, obstacle, 60)).toBe(true);
    expect(obstacle.passed).toBe(true);
    expect(checkPass(robot, obstacle, 60)).toBe(false);
  });
});

describe('saveProgress (jeu naturel + lien #save= : max sur les deux)', () => {
  it('monte level et record et persiste les deux', () => {
    const st = fakeStorage();
    const s = { level: 1, record: 1 };
    saveProgress(s, 3, st);
    expect(s).toEqual({ level: 3, record: 3 });
    expect(st.getItem('jetpackbot.level')).toBe('3');
    expect(st.getItem('jetpackbot.bestLevel')).toBe('3');
  });

  it('après un reset, le record ne bouge pas tant qu il n est pas dépassé', () => {
    const st = fakeStorage({ 'jetpackbot.bestLevel': '10', 'jetpackbot.level': '1' });
    const s = createScore(st);
    saveProgress(s, 2, st);
    expect(s).toEqual({ level: 2, record: 10 });
    expect(st.getItem('jetpackbot.bestLevel')).toBe('10');
  });

  it('ne régresse jamais et ne persiste rien si rien ne change', () => {
    const st = fakeStorage();
    const s = { level: 7, record: 10 };
    saveProgress(s, 3, st);
    expect(s).toEqual({ level: 7, record: 10 });
    expect(st.getItem('jetpackbot.level')).toBe(null);
  });

  it('tolère un storage absent', () => {
    const s = { level: 1, record: 1 };
    expect(() => saveProgress(s, 4, undefined)).not.toThrow();
    expect(s.level).toBe(4);
  });
});

describe('resetProgress (NEW GAME confirmé)', () => {
  it('level repart à 1, record intact', () => {
    const st = fakeStorage({ 'jetpackbot.bestLevel': '10', 'jetpackbot.level': '10' });
    const s = createScore(st);
    resetProgress(s, st);
    expect(s).toEqual({ level: 1, record: 10 });
    expect(st.getItem('jetpackbot.level')).toBe('1');
    expect(st.getItem('jetpackbot.bestLevel')).toBe('10');
  });
});

describe('applyCode (SAISIR : level exact, record max — skins jamais re-verrouillés)', () => {
  it('code plus bas : level régresse, record intact', () => {
    const st = fakeStorage({ 'jetpackbot.bestLevel': '14', 'jetpackbot.level': '14' });
    const s = createScore(st);
    applyCode(s, 5, st);
    expect(s).toEqual({ level: 5, record: 14 });
    expect(st.getItem('jetpackbot.level')).toBe('5');
    expect(st.getItem('jetpackbot.bestLevel')).toBe('14');
  });

  it('code plus haut : les deux montent', () => {
    const st = fakeStorage();
    const s = { level: 2, record: 2 };
    applyCode(s, 9, st);
    expect(s).toEqual({ level: 9, record: 9 });
    expect(st.getItem('jetpackbot.bestLevel')).toBe('9');
  });
});
