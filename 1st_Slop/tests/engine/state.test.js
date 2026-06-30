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
});
