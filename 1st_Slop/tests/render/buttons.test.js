import { describe, it, expect } from 'vitest';
import { fitFontSize, plateKey, drawButton, drawButtons } from '../../src/render/buttons.js';
import { createPauseMenu } from '../../src/game/menu.js';
import { vi } from 'vitest';

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

function recordingCtx() {
  return {
    drawn: [], texts: [], alphas: [], fills: [],
    _font: '10px x', _alpha: 1,
    drawImage(img, ...rest) { this.drawn.push({ img, rest, alpha: this._alpha }); },
    fillText(t, x, y) { this.texts.push({ t, x, y }); },
    measureText(t) { return { width: t.length * parseInt(this._font, 10) }; },
    save() {}, restore() { this._alpha = 1; },
    set font(v) { this._font = v; }, get font() { return this._font; },
    set globalAlpha(v) { this._alpha = v; }, get globalAlpha() { return this._alpha; },
    set fillStyle(v) { this.fills.push(v); }, get fillStyle() { return ''; },
    set textAlign(_) {}, get textAlign() { return ''; },
    set textBaseline(_) {}, get textBaseline() { return ''; },
  };
}

const plateAssets = () => ({ 'btn-plate': { key: 'btn-plate' }, 'btn-plate-focus': { key: 'btn-plate-focus' } });

describe('plateKey', () => {
  it('focus -> btn-plate-focus, sinon btn-plate', () => {
    expect(plateKey('focus')).toBe('btn-plate-focus');
    expect(plateKey('normal')).toBe('btn-plate');
    expect(plateKey('disabled')).toBe('btn-plate');
  });
});

describe('drawButton', () => {
  it('normal: plate normale + label blanc', () => {
    const ctx = recordingCtx();
    drawButton(ctx, { x: 0, y: 0, w: 200, h: 56 }, 'MENU', 'normal', plateAssets());
    expect(ctx.drawn[0].img.key).toBe('btn-plate');
    expect(ctx.drawn[0].alpha).toBe(1);
    expect(ctx.texts[0].t).toBe('MENU');
    expect(ctx.fills).toContain('#ffffff');
  });

  it('focus: plate focus', () => {
    const ctx = recordingCtx();
    drawButton(ctx, { x: 0, y: 0, w: 200, h: 56 }, 'MENU', 'focus', plateAssets());
    expect(ctx.drawn[0].img.key).toBe('btn-plate-focus');
  });

  it('disabled: plate normale en alpha réduit + label gris', () => {
    const ctx = recordingCtx();
    drawButton(ctx, { x: 0, y: 0, w: 200, h: 56 }, 'OPTIONS', 'disabled', plateAssets());
    expect(ctx.drawn[0].img.key).toBe('btn-plate');
    expect(ctx.drawn[0].alpha).toBe(0.4);
    expect(ctx.fills).toContain('#8a94a6');
  });
});

describe('drawButtons', () => {
  it('resume focus -> focus plate; options disabled -> normale; tous les labels dessinés', () => {
    const ctx = recordingCtx();
    drawButtons(ctx, createPauseMenu(), plateAssets());
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys.filter((k) => k === 'btn-plate-focus').length).toBe(1); // resume only
    expect(ctx.texts.map((t) => t.t)).toEqual(['REPRENDRE', 'RECOMMENCER', 'MENU', 'OPTIONS']);
  });
});
