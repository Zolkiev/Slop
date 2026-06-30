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
});
