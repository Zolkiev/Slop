import { describe, it, expect } from 'vitest';
import { createSavecode, setFeedback } from '../../src/game/savecode.js';
import { encodeSave } from '../../src/game/save.js';
import { focusedId } from '../../src/game/menu.js';

describe('savecode screen state', () => {
  it('avec save: code encodé, copier/lien enabled, focus copier', () => {
    const sc = createSavecode({ record: 7 });
    expect(sc.code).toBe(encodeSave({ bestLevel: 7 }));
    expect(sc.menu.buttons.map((b) => b.enabled)).toEqual([true, true, true, true]);
    expect(focusedId(sc.menu)).toBe('copy');
    expect(sc.feedbackText).toBe(null);
  });

  it('sans save: code null, copier/lien disabled, focus saisir', () => {
    const sc = createSavecode({ record: 0 });
    expect(sc.code).toBe(null);
    expect(sc.menu.buttons.map((b) => b.enabled)).toEqual([false, false, true, true]);
    expect(focusedId(sc.menu)).toBe('enter');
  });

  it('setFeedback pose le texte et l\'échéance', () => {
    const sc = createSavecode({ record: 1 });
    setFeedback(sc, 'COPIÉ !', 100);
    expect(sc.feedbackText).toBe('COPIÉ !');
    expect(sc.feedbackUntil).toBe(190);
  });
});
