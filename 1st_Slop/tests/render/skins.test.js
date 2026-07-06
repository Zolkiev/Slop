import { describe, it, expect, vi } from 'vitest';
import { renderSkins } from '../../src/render/skins.js';
import { createSkinsMenu } from '../../src/game/menu.js';
import { CONFIG } from '../../src/config.js';

function fakeCtx() {
  return {
    drawn: [], texts: [], fillStyles: [], _font: '10px x',
    drawImage(img, ...rest) { this.drawn.push({ img, rest }); },
    fillRect: vi.fn(),
    fillText(t) { this.texts.push(t); },
    measureText(t) { return { width: t.length * parseInt(this._font, 10) }; },
    save: vi.fn(), restore: vi.fn(),
    set fillStyle(v) { this.fillStyles.push(v); }, get fillStyle() { return ''; },
    set font(v) { this._font = v; }, get font() { return this._font; },
    set textAlign(_) {}, get textAlign() { return ''; },
    set textBaseline(_) {}, get textBaseline() { return ''; },
    set globalAlpha(_) {}, get globalAlpha() { return 1; },
  };
}

// Canvas hors-écran factice : enregistre les opérations de la silhouette.
function fakeOffscreen() {
  const ops = [];
  const octx = {
    clearRect: (...a) => ops.push(['clearRect', ...a]),
    drawImage: () => ops.push(['drawImage']),
    fillRect: (...a) => ops.push(['fillRect', ...a]),
    set globalCompositeOperation(v) { ops.push(['gco', v]); },
    get globalCompositeOperation() { return ''; },
    set fillStyle(v) { ops.push(['fillStyle', v]); }, get fillStyle() { return ''; },
  };
  return { width: 0, height: 0, isFakeCanvas: true, ops, getContext: () => octx };
}

function fakeAssets() {
  const keys = ['robot', 'robot-s1', 'robot-s2', 'robot-s3', 'robot-s4', 'btn-plate', 'btn-plate-focus'];
  return Object.fromEntries(keys.map((k) => [k, { key: k, width: 64, height: 64 }]));
}

function worldWith(slot, bestLevel, skin = 0) {
  const unlocked = bestLevel >= CONFIG.PATTERN_TIERS[slot];
  return {
    skin,
    score: { bestLevel },
    skinsScreen: { slot, menu: createSkinsMenu(unlocked, skin, slot) },
  };
}

describe('renderSkins', () => {
  it('slot débloqué: titre, sprite du slot ×3 (robot-s2), nom en couleur accent', () => {
    const ctx = fakeCtx();
    renderSkins(ctx, worldWith(2, 5), fakeAssets(), fakeOffscreen);
    expect(ctx.texts).toEqual(expect.arrayContaining(['ROBOTS', 'VENIN']));
    const P = CONFIG.SKINS_PREVIEW;
    const preview = ctx.drawn.find((d) => d.img.key === 'robot-s2');
    expect(preview.rest).toEqual([P.x, P.y, P.size, P.size]);
    expect(ctx.fillStyles).toContain('#7dff3e'); // accent VENIN
  });

  it('slot verrouillé: silhouette via canvas hors-écran (source-in) + NIVEAU requis', () => {
    const ctx = fakeCtx();
    const off = fakeOffscreen();
    renderSkins(ctx, worldWith(4, 5), fakeAssets(), () => off);
    // le sprite passe par le canvas hors-écran, pas directement sur l'écran
    expect(ctx.drawn.some((d) => d.img.isFakeCanvas)).toBe(true);
    expect(ctx.drawn.some((d) => d.img.key === 'robot-s4')).toBe(false);
    expect(off.ops).toEqual(expect.arrayContaining([['gco', 'source-in']]));
    expect(ctx.texts).toContain('NIVEAU 10');
    expect(ctx.texts).not.toContain('NOVA');
  });

  it('flèches < > et boutons partagés dessinés', () => {
    const ctx = fakeCtx();
    renderSkins(ctx, worldWith(1, 5), fakeAssets(), fakeOffscreen);
    expect(ctx.texts).toEqual(expect.arrayContaining(['<', '>', 'CHOISIR', 'RETOUR']));
    expect(ctx.drawn.some((d) => d.img.key === 'btn-plate' || d.img.key === 'btn-plate-focus')).toBe(true);
  });
});
