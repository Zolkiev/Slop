import { describe, it, expect, vi } from 'vitest';
import { renderSavecode } from '../../src/render/savecode.js';
import { createSavecode, setFeedback } from '../../src/game/savecode.js';

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

describe('renderSavecode', () => {
  it('avec save: titre, code, 4 labels de boutons', () => {
    const ctx = fakeCtx();
    const world = { savecode: createSavecode({ bestLevel: 7 }), menuTick: 0 };
    renderSavecode(ctx, world, fakeAssets());
    expect(ctx.texts[0]).toBe('SAUVEGARDE');
    expect(ctx.texts).toContain(world.savecode.code);
    expect(ctx.texts).toEqual(expect.arrayContaining(['COPIER', 'LIEN', 'SAISIR', 'RETOUR']));
  });

  it('sans save: PAS DE SAUVEGARDE affiché', () => {
    const ctx = fakeCtx();
    const world = { savecode: createSavecode({ bestLevel: 0 }), menuTick: 0 };
    renderSavecode(ctx, world, fakeAssets());
    expect(ctx.texts).toContain('PAS DE SAUVEGARDE');
  });

  it('feedback affiché tant que menuTick < feedbackUntil, puis disparaît', () => {
    const ctx1 = fakeCtx();
    const world = { savecode: createSavecode({ bestLevel: 7 }), menuTick: 10 };
    setFeedback(world.savecode, 'COPIÉ !', 10);
    renderSavecode(ctx1, world, fakeAssets());
    expect(ctx1.texts).toContain('COPIÉ !');
    const ctx2 = fakeCtx();
    world.menuTick = 200;
    renderSavecode(ctx2, world, fakeAssets());
    expect(ctx2.texts).not.toContain('COPIÉ !');
  });
});
