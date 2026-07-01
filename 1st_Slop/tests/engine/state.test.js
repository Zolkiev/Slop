import { describe, it, expect } from 'vitest';
import { States, createStateMachine } from '../../src/engine/state.js';

describe('stateMachine', () => {
  it('démarre en MENU par défaut', () => {
    expect(createStateMachine().get()).toBe(States.MENU);
  });

  it('autorise MENU -> PLAY', () => {
    const sm = createStateMachine();
    expect(sm.can(States.PLAY)).toBe(true);
    expect(sm.to(States.PLAY)).toBe(States.PLAY);
  });

  it('autorise PLAY -> GAMEOVER -> PLAY (retry)', () => {
    const sm = createStateMachine(States.PLAY);
    sm.to(States.GAMEOVER);
    expect(sm.can(States.PLAY)).toBe(true);
    sm.to(States.PLAY);
    expect(sm.get()).toBe(States.PLAY);
  });

  it('refuse une transition invalide MENU -> GAMEOVER', () => {
    const sm = createStateMachine();
    expect(sm.can(States.GAMEOVER)).toBe(false);
    expect(() => sm.to(States.GAMEOVER)).toThrow();
  });

  it('autorise PLAY -> LEVEL_COMPLETE -> PLAY', () => {
    const sm = createStateMachine(States.PLAY);
    expect(sm.can(States.LEVEL_COMPLETE)).toBe(true);
    sm.to(States.LEVEL_COMPLETE);
    expect(sm.can(States.PLAY)).toBe(true);
    sm.to(States.PLAY);
    expect(sm.get()).toBe(States.PLAY);
  });

  it('PLAY peut aller en PAUSE', () => {
    const sm = createStateMachine(States.PLAY);
    expect(sm.can(States.PAUSE)).toBe(true);
  });

  it('PAUSE peut revenir en PLAY et aller au MENU', () => {
    const sm = createStateMachine(States.PAUSE);
    expect(sm.can(States.PLAY)).toBe(true);
    expect(sm.can(States.MENU)).toBe(true);
  });

  it('PAUSE ne peut pas aller en GAMEOVER', () => {
    const sm = createStateMachine(States.PAUSE);
    expect(sm.can(States.GAMEOVER)).toBe(false);
  });
});
