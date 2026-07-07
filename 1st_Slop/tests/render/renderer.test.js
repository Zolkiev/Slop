import { describe, it, expect, vi } from 'vitest';
import { renderWorld } from '../../src/render/renderer.js';
import { createWorld, press } from '../../src/game/world.js';
import { States } from '../../src/engine/state.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } };
}

function fakeCtx() {
  return {
    drawn: [], texts: [], fillStyles: [], _font: '10px x',
    drawImage(img, ...rest) { this.drawn.push({ img, rest }); },
    fillRect: vi.fn(), strokeRect: vi.fn(), translate: vi.fn(),
    fillText(t) { this.texts.push(t); },
    measureText(t) { return { width: t.length * parseInt(this._font, 10) }; },
    save: vi.fn(), restore: vi.fn(),
    set fillStyle(v) { this.fillStyles.push(v); }, get fillStyle() { return ''; },
    set strokeStyle(_) {}, get strokeStyle() { return ''; },
    set lineWidth(_) {}, get lineWidth() { return 1; },
    set font(v) { this._font = v; }, get font() { return this._font; },
    set textAlign(_) {}, get textAlign() { return ''; },
    set textBaseline(_) {}, get textBaseline() { return ''; },
    set globalAlpha(_) {}, get globalAlpha() { return 1; },
  };
}

function fakeAssets() {
  const keys = ['bg-far-0', 'bg-near-0', 'obstacle',
    'robot', 'robot-thrust-0', 'robot-thrust-1',
    'robot-s2', 'robot-s2-thrust-0', 'robot-s2-thrust-1',
    'btn-plate', 'btn-plate-focus'];
  return Object.fromEntries(keys.map((k) => [k, { key: k, width: 64, height: 64 }]));
}

function playWorldWithSkin(skin) {
  const w = createWorld(fakeStorage());
  press(w); // MENU -> PLAY (focus NEW GAME)
  w.bgSet = 0;
  w.skin = skin;
  return w;
}

describe('renderWorld — skin en jeu', () => {
  it('chute: sprite idle du skin (robot-s2), pas le robot de base', () => {
    const w = playWorldWithSkin(2);
    w.robot.vy = 100;
    const ctx = fakeCtx();
    renderWorld(ctx, w, fakeAssets());
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(keys).toContain('robot-s2');
    expect(keys).not.toContain('robot');
  });

  it('montée: frame thrust du skin (robot-s2-thrust-0 au tick 0)', () => {
    const w = playWorldWithSkin(2);
    w.robot.vy = -100;
    const ctx = fakeCtx();
    renderWorld(ctx, w, fakeAssets());
    expect(ctx.drawn.map((d) => d.img.key)).toContain('robot-s2-thrust-0');
  });

  it('particules réacteur à la couleur accent du skin', () => {
    const w = playWorldWithSkin(2);
    w.particles.particles.push({ x: 10, y: 10, life: 0.5, maxLife: 1 });
    const ctx = fakeCtx();
    renderWorld(ctx, w, fakeAssets());
    expect(ctx.fillStyles).toContain('#7dff3e'); // accent VENIN
  });

  it('skin 0: sprites historiques (robot)', () => {
    const w = playWorldWithSkin(0);
    w.robot.vy = 100;
    const ctx = fakeCtx();
    renderWorld(ctx, w, fakeAssets());
    expect(ctx.drawn.map((d) => d.img.key)).toContain('robot');
  });
});

describe('renderWorld — écran CONFIRM', () => {
  it('le robot est masqué comme sur les autres écrans de menu', () => {
    const w = createWorld(fakeStorage());
    w.bgSet = 0;
    w.score.level = 5; // partie entamée -> NEW GAME demande confirmation
    press(w); // MENU -> CONFIRM (focus NEW GAME)
    const ctx = fakeCtx();
    renderWorld(ctx, w, fakeAssets());
    const keys = ctx.drawn.map((d) => d.img.key);
    expect(w.sm.get()).toBe(States.CONFIRM);
    expect(keys).not.toContain('robot');
    expect(ctx.texts).toContain('REPARTIR AU NIVEAU 1 ?');
  });
});
