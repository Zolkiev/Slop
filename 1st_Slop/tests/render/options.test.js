import { describe, it, expect, vi } from 'vitest';
import { renderOptions } from '../../src/render/options.js';
import { createOptions } from '../../src/game/options.js';

function fakeCtx() {
  return {
    drawn: [], texts: [], rects: [], _font: '10px x',
    drawImage(img, ...rest) { this.drawn.push({ img, rest }); },
    fillRect(x, y, w, h) { this.rects.push({ x, y, w, h }); },
    fillText(t) { this.texts.push(t); },
    measureText(t) { return { width: t.length * parseInt(this._font, 10) }; },
    save: vi.fn(), restore: vi.fn(),
    set fillStyle(_) {}, get fillStyle() { return ''; },
    set font(v) { this._font = v; }, get font() { return this._font; },
    set textAlign(_) {}, get textAlign() { return ''; },
    set textBaseline(_) {}, get textBaseline() { return ''; },
    set globalAlpha(_) {}, get globalAlpha() { return 1; },
  };
}

function fakeAssets() {
  const keys = ['btn-plate', 'btn-plate-focus'];
  return Object.fromEntries(keys.map((k) => [k, { key: k }]));
}

describe('renderOptions', () => {
  it('titre, labels des lignes et RETOUR dessinés', () => {
    const ctx = fakeCtx();
    const world = { options: createOptions({ sfx: 7, music: 7 }) };
    renderOptions(ctx, world, fakeAssets());
    expect(ctx.texts[0]).toBe('OPTIONS');
    expect(ctx.texts).toEqual(expect.arrayContaining(['SFX', 'MUSIQUE', 'RETOUR']));
  });

  it('dessine 22 segments (2 lignes x 11) + le voile', () => {
    const ctx = fakeCtx();
    const world = { options: createOptions({ sfx: 5, music: 0 }) };
    renderOptions(ctx, world, fakeAssets());
    // 1 voile plein écran + 22 segments
    expect(ctx.rects.length).toBe(23);
  });

  it('focus RETOUR -> plate focus', () => {
    const ctx = fakeCtx();
    const world = { options: createOptions({ sfx: 7, music: 7 }) };
    world.options.focus = 2;
    renderOptions(ctx, world, fakeAssets());
    expect(ctx.drawn.some((d) => d.img.key === 'btn-plate-focus')).toBe(true);
  });

  it('focus ligne -> plate normale pour RETOUR', () => {
    const ctx = fakeCtx();
    const world = { options: createOptions({ sfx: 7, music: 7 }) };
    world.options.focus = 0; // focus sur la première ligne, pas le bouton
    renderOptions(ctx, world, fakeAssets());
    expect(ctx.drawn.some((d) => d.img.key === 'btn-plate-focus')).toBe(false);
    expect(ctx.drawn.some((d) => d.img.key === 'btn-plate')).toBe(true);
  });
});
