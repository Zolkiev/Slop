import { describe, it, expect } from 'vitest';
import { fitFontSize } from '../../src/render/buttons.js';

/** Fake ctx whose measureText width = charCount * fontSize * 1.0. */
function measuringCtx() {
  return {
    _font: '10px x',
    set font(v) { this._font = v; },
    get font() { return this._font; },
    measureText(t) { return { width: t.length * parseInt(this._font, 10) }; },
  };
}

describe('fitFontSize', () => {
  it('rétrécit pour tenir dans la largeur', () => {
    const ctx = measuringCtx();
    // 'RECOMMENCER' = 11 chars, maxWidth 168 -> largest size with 11*size<=168 is 15
    expect(fitFontSize(ctx, 'RECOMMENCER', 168, 18, 8)).toBe(15);
  });

  it('garde la taille max si ça tient déjà', () => {
    const ctx = measuringCtx();
    // 'MENU' = 4 chars, 4*18=72 <= 168 -> 18
    expect(fitFontSize(ctx, 'MENU', 168, 18, 8)).toBe(18);
  });

  it('clamp à la taille min si rien ne tient', () => {
    const ctx = measuringCtx();
    // 40 chars never fit -> minSize
    expect(fitFontSize(ctx, 'X'.repeat(40), 168, 18, 8)).toBe(8);
  });
});
