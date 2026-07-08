import { describe, it, expect } from 'vitest';
import { renderBgEvents } from '../../src/render/bgevents.js';
import { CONFIG } from '../../src/config.js';

function fakeCtx() {
  const calls = [];
  return {
    calls,
    globalAlpha: 1,
    fillStyle: '',
    fillRect: (...a) => calls.push(a),
  };
}

function worldWith(event, farOffset = 0) {
  return { bgEvents: { timer: 6, event }, layers: [{ offset: farOffset }] };
}

describe('renderBgEvents', () => {
  it('ne dessine rien sans événement actif', () => {
    const ctx = fakeCtx();
    renderBgEvents(ctx, worldWith(null));
    expect(ctx.calls.length).toBe(0);
  });

  it('foudre : un voile plein cadre, alpha extrait de la courbe (≤ 0.35)', () => {
    const ctx = fakeCtx();
    renderBgEvents(ctx, worldWith({ kind: 'foudre', t: 0, dur: 0.5 }));
    expect(ctx.calls).toEqual([[0, 0, CONFIG.WIDTH, CONFIG.HEIGHT]]);
    const alpha = Number(ctx.fillStyle.match(/rgba\(210,225,255,(.+)\)/)[1]);
    expect(alpha).toBeCloseTo(0.35, 3);
  });

  it('étoile : tête + traînée (7 points), globalAlpha restauré à 1', () => {
    const ctx = fakeCtx();
    renderBgEvents(ctx, worldWith({ kind: 'etoile', t: 0.2, dur: 0.7, x0: 60, y0: 40, vx: 260, vy: 110 }));
    expect(ctx.calls.length).toBe(7);
    expect(ctx.globalAlpha).toBe(1);
  });

  it('oiseaux : 5 oiseaux × 3 rects', () => {
    const ctx = fakeCtx();
    renderBgEvents(ctx, worldWith({ kind: 'oiseaux', t: 1, dur: 9, baseY: 200, dir: 1 }));
    expect(ctx.calls.length).toBe(15);
  });

  it('torchère : 3 halos concentriques ancrés à l image (suivent le défilement)', () => {
    const ctx = fakeCtx();
    renderBgEvents(ctx, worldWith({ kind: 'torchere', t: 1, dur: 2.5, spot: { x: 73, y: 339 } }));
    expect(ctx.calls.length).toBe(3);
    expect(ctx.calls[0][0]).toBe(73 - 14); // offset 0 : espace image = espace écran
    expect(ctx.globalAlpha).toBe(1);

    const scrolled = fakeCtx();
    renderBgEvents(scrolled, worldWith({ kind: 'torchere', t: 1, dur: 2.5, spot: { x: 73, y: 339 } }, 50));
    expect(scrolled.calls[0][0]).toBe(73 - 50 - 14); // le halo suit sa cheminée
  });

  it('torchère : la position écran se replie modulo la largeur (fond tuilé)', () => {
    const ctx = fakeCtx();
    renderBgEvents(ctx, worldWith({ kind: 'torchere', t: 1, dur: 2.5, spot: { x: 73, y: 339 } }, 100));
    // 73 - 100 = -27 -> la cheminée visible est celle de la 2e tuile : x = 333
    expect(ctx.calls[0][0]).toBe(333 - 14);
  });

  it('rafale : no-op ici (gérée par le boost des twinkles)', () => {
    const ctx = fakeCtx();
    renderBgEvents(ctx, worldWith({ kind: 'rafale', t: 0.5, dur: 1.2 }));
    expect(ctx.calls.length).toBe(0);
  });
});
