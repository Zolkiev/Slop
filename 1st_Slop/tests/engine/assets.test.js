import { describe, it, expect, vi } from 'vitest';
import { loadImages } from '../../src/engine/assets.js';

describe('loadImages', () => {
  it('résout un dictionnaire d images chargées', async () => {
    class FakeImage {
      set src(_v) { setTimeout(() => this.onload?.(), 0); }
    }
    vi.stubGlobal('Image', FakeImage);
    const imgs = await loadImages({ robot: 'robot.png', obstacle: 'obstacle.png' });
    expect(Object.keys(imgs)).toEqual(['robot', 'obstacle']);
    vi.unstubAllGlobals();
  });
});
