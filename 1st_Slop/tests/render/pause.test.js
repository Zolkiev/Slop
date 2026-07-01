import { describe, it, expect, vi } from 'vitest';
import { renderPause } from '../../src/render/pause.js';
import { createPauseMenu } from '../../src/game/menu.js';

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
  const keys = [
    'btn-resume', 'btn-resume-focus', 'btn-resume-disabled',
    'btn-restart', 'btn-restart-focus', 'btn-restart-disabled',
    'btn-menu', 'btn-menu-focus', 'btn-menu-disabled',
    'btn-options', 'btn-options-focus', 'btn-options-disabled',
  ];
  return Object.fromEntries(keys.map((k) => [k, { key: k }]));
}

describe('renderPause', () => {
  it('resume focus -> btn-resume-focus ; restart/menu normal ; options disabled', () => {
    const ctx = fakeCtx();
    const assets = fakeAssets();
    const world = { pause: createPauseMenu(), menuTick: 0 };
    renderPause(ctx, world, assets);
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('btn-resume-focus');
    expect(keys).toContain('btn-restart');
    expect(keys).toContain('btn-menu');
    expect(keys).toContain('btn-options-disabled');
    expect(keys).not.toContain('btn-resume'); // resume is focused, not normal
  });
});
