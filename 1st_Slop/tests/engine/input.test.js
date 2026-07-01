import { describe, it, expect, vi } from 'vitest';
import { createInput } from '../../src/engine/input.js';

function fakeTarget() {
  const handlers = {};
  return {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    removeEventListener: (type) => { delete handlers[type]; },
    fire: (type, evt = {}) => handlers[type]?.(evt),
    has: (type) => Boolean(handlers[type]),
  };
}

describe('input', () => {
  it('appelle onPress sur pointerdown', () => {
    const target = fakeTarget();
    const win = fakeTarget();
    const onPress = vi.fn();
    createInput({ target, win, preventDefault: false }, onPress);
    target.fire('pointerdown', {});
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('appelle onPress sur Space mais ignore la répétition', () => {
    const target = fakeTarget();
    const win = fakeTarget();
    const onPress = vi.fn();
    createInput({ target, win, preventDefault: false }, onPress);
    win.fire('keydown', { code: 'Space', repeat: false, preventDefault() {} });
    win.fire('keydown', { code: 'Space', repeat: true, preventDefault() {} });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('dispose retire les écouteurs', () => {
    const target = fakeTarget();
    const win = fakeTarget();
    const { dispose } = createInput({ target, win, preventDefault: false }, vi.fn());
    dispose();
    expect(target.has('pointerdown')).toBe(false);
  });

  it('passe les coordonnées canvas au onPress sur pointerdown', () => {
    const handlers = {};
    const target = {
      addEventListener: (t, fn) => { handlers[t] = fn; },
      removeEventListener: () => {},
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 360, height: 640 }),
      width: 360,
      height: 640,
    };
    const win = fakeTarget();
    const onPress = vi.fn();
    createInput({ target, win, preventDefault: false }, onPress);
    handlers.pointerdown({ clientX: 100, clientY: 120 });
    expect(onPress).toHaveBeenCalledWith({ x: 90, y: 100 });
  });

  it('ArrowUp/ArrowDown appellent onNav avec -1 / +1', () => {
    const target = fakeTarget();
    const win = fakeTarget();
    const onNav = vi.fn();
    createInput({ target, win, preventDefault: false }, vi.fn(), onNav);
    win.fire('keydown', { code: 'ArrowUp', repeat: false });
    win.fire('keydown', { code: 'ArrowDown', repeat: false });
    expect(onNav).toHaveBeenNthCalledWith(1, -1);
    expect(onNav).toHaveBeenNthCalledWith(2, 1);
  });

  it('Enter déclenche onPress sans coordonnées', () => {
    const target = fakeTarget();
    const win = fakeTarget();
    const onPress = vi.fn();
    createInput({ target, win, preventDefault: false }, onPress);
    win.fire('keydown', { code: 'Enter', repeat: false });
    expect(onPress).toHaveBeenCalledWith(undefined);
  });
});
