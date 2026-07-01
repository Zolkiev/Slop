import { describe, it, expect, vi } from 'vitest';
import { renderMenu } from '../../src/render/menu.js';
import { createMenu } from '../../src/game/menu.js';

/** Fake ctx that records which asset object each drawImage received. */
function fakeCtx() {
  return {
    drawn: [],
    drawImage(img, ...rest) { this.drawn.push({ img, rest }); },
    fillRect: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    set fillStyle(_) {}, get fillStyle() { return ''; },
    set font(_) {}, get font() { return ''; },
    set textAlign(_) {}, get textAlign() { return ''; },
    set globalAlpha(_) {}, get globalAlpha() { return 1; },
  };
}

function fakeAssets() {
  // Each key maps to a unique sentinel object so we can assert identity.
  const keys = [
    'ui-logo', 'robot',
    'btn-newgame', 'btn-newgame-focus', 'btn-newgame-disabled',
    'btn-continue', 'btn-continue-focus', 'btn-continue-disabled',
    'btn-options', 'btn-options-focus', 'btn-options-disabled',
  ];
  return Object.fromEntries(keys.map((k) => [k, { key: k }]));
}

function worldWith(menu) {
  return { menu, menuTick: 0, score: { bestLevel: 3 } };
}

describe('renderMenu', () => {
  it('dessine le logo et le robot', () => {
    const ctx = fakeCtx();
    const assets = fakeAssets();
    renderMenu(ctx, worldWith(createMenu()), assets);
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('ui-logo');
    expect(keys).toContain('robot');
  });

  it('New Game focus → sprite focus ; Continue/Options disabled → sprite disabled', () => {
    const ctx = fakeCtx();
    const assets = fakeAssets();
    const menu = createMenu(); // focus sur newgame, continue/options disabled
    renderMenu(ctx, worldWith(menu), assets);
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('btn-newgame-focus');
    expect(keys).toContain('btn-continue-disabled');
    expect(keys).toContain('btn-options-disabled');
    // pas la variante normale/focus des stubs ce tour-ci
    expect(keys).not.toContain('btn-continue');
    expect(keys).not.toContain('btn-continue-focus');
  });

  it('bouton enabled non-focus → sprite normal', () => {
    const ctx = fakeCtx();
    const assets = fakeAssets();
    const menu = createMenu();
    menu.buttons[1].enabled = true; // continue devient enabled, mais focus reste newgame
    renderMenu(ctx, worldWith(menu), assets);
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('btn-continue'); // enabled + non focus → normal
  });
});
