import { describe, it, expect } from 'vitest';
import { renderBgAnim, frameIndex, BG_ANIM } from '../../src/render/bganim.js';
import { CONFIG } from '../../src/config.js';

function fakeCtx() {
  const calls = [];
  return { calls, drawImage: (...a) => calls.push(a) };
}

// Asset factice : l'échelle runtime se calcule depuis bg-far (320x576 -> x1.125)
const fakeAssets = {
  'bg-far-1': { width: 320, height: 576 },
  'elem-0': { width: 96, height: 128 },
  'elem-1': { width: 96, height: 128 },
};
const elem = { key: 'elem', x: 0, y: 190, n: 2, period: 8, phase: 0 };
const table = [[], [elem], [], [], []];

function worldWith(tick, offset = 0) {
  return { bgSet: 1, menuTick: tick, layers: [{ offset }] };
}

describe('frameIndex', () => {
  it('avance d une frame toutes les period ticks, modulo n', () => {
    expect(frameIndex(0, elem)).toBe(0);
    expect(frameIndex(7, elem)).toBe(0);
    expect(frameIndex(8, elem)).toBe(1);
    expect(frameIndex(16, elem)).toBe(0);
  });

  it('phase décale le départ', () => {
    expect(frameIndex(0, { ...elem, phase: 1 })).toBe(1);
  });
});

describe('renderBgAnim', () => {
  it('ne dessine rien pour un décor sans éléments', () => {
    const ctx = fakeCtx();
    renderBgAnim(ctx, { ...worldWith(0), bgSet: 0 }, fakeAssets, table);
    expect(ctx.calls.length).toBe(0);
  });

  it('dessine la frame courante à la position image mise à l échelle', () => {
    const ctx = fakeCtx();
    renderBgAnim(ctx, worldWith(8), fakeAssets, table);
    expect(ctx.calls.length).toBe(1);
    const [img, dx, dy, dw, dh] = ctx.calls[0];
    expect(img).toBe(fakeAssets['elem-1']); // tick 8 -> frame 1
    expect(dx).toBeCloseTo(0, 5);           // x natif 0, offset 0
    expect(dy).toBeCloseTo(190 * (643 / 576) - 3, 3);
    expect(dw).toBeCloseTo(96 * (360 / 320), 3);
    expect(dh).toBeCloseTo(128 * (643 / 576), 3);
  });

  it('suit le défilement du fond (offset) et se replie sur la tuile visible', () => {
    const ctx = fakeCtx();
    renderBgAnim(ctx, worldWith(0, 50), fakeAssets, table);
    expect(ctx.calls[0][1]).toBeCloseTo(((0 - 50) % 360 + 360) % 360, 3); // 310
    // patch à cheval sur le joint droit -> deuxième copie décalée d une largeur d écran
    expect(ctx.calls.length).toBe(2);
    expect(ctx.calls[1][1]).toBeCloseTo(310 - 360, 3);
  });

  it('la table réelle est cohérente (clés uniques, n>=4 pair ou table vide, period>0)', () => {
    const keys = new Set();
    for (const list of BG_ANIM) {
      for (const e of list) {
        expect(keys.has(e.key)).toBe(false);
        keys.add(e.key);
        expect(e.n).toBeGreaterThanOrEqual(4);
        expect(e.period).toBeGreaterThan(0);
      }
    }
  });
});
