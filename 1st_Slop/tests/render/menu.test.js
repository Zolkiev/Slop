import { describe, it, expect, vi } from 'vitest';
import { renderMenu } from '../../src/render/menu.js';
import { createMenu } from '../../src/game/menu.js';

function fakeCtx() {
  return {
    drawn: [], texts: [], _font: '10px x',
    drawImage(img, ...rest) { this.drawn.push({ img, rest }); },
    fillRect: vi.fn(),
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
  const keys = ['ui-logo', 'robot', 'robot-s2', 'btn-plate', 'btn-plate-focus'];
  return Object.fromEntries(keys.map((k) => [k, { key: k }]));
}

function worldWith(menu, skin = 0) {
  return { menu, menuTick: 0, skin, score: { bestLevel: 3 } };
}

describe('renderMenu', () => {
  it('dessine le logo et le robot', () => {
    const ctx = fakeCtx();
    renderMenu(ctx, worldWith(createMenu()), fakeAssets());
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('ui-logo');
    expect(keys).toContain('robot');
  });

  it('New Game focus -> plate focus ; les labels sont dessinés', () => {
    const ctx = fakeCtx();
    renderMenu(ctx, worldWith(createMenu()), fakeAssets());
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('btn-plate-focus'); // newgame focused
    expect(keys).toContain('btn-plate');       // continue/options disabled
    expect(ctx.texts).toEqual(expect.arrayContaining(['NEW GAME', 'CONTINUE', 'OPTIONS']));
  });

  it('le robot du menu porte le skin sélectionné', () => {
    const ctx = fakeCtx();
    renderMenu(ctx, worldWith(createMenu(), 2), fakeAssets());
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('robot-s2');
    expect(keys).not.toContain('robot');
  });

  it('un seul bouton focus -> une seule plate focus', () => {
    const ctx = fakeCtx();
    renderMenu(ctx, worldWith(createMenu()), fakeAssets());
    const focusPlates = ctx.drawn.filter((d) => d.img.key === 'btn-plate-focus');
    expect(focusPlates.length).toBe(1);
  });
});
