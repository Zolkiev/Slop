import { describe, it, expect, vi } from 'vitest';
import { renderPause } from '../../src/render/pause.js';
import { createPauseMenu } from '../../src/game/menu.js';

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
  const keys = ['btn-plate', 'btn-plate-focus'];
  return Object.fromEntries(keys.map((k) => [k, { key: k }]));
}

describe('renderPause', () => {
  it('resume focus -> une plate focus ; les 4 labels dessinés', () => {
    const ctx = fakeCtx();
    const world = { pause: createPauseMenu(), menuTick: 0 };
    renderPause(ctx, world, fakeAssets());
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys.filter((k) => k === 'btn-plate-focus').length).toBe(1);
    expect(ctx.texts).toEqual(['PAUSE', 'REPRENDRE', 'RECOMMENCER', 'MENU', 'OPTIONS']);
  });
});
