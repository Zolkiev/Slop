import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';

describe('config', () => {
  it('expose la résolution logique 360x640', () => {
    expect(CONFIG.WIDTH).toBe(360);
    expect(CONFIG.HEIGHT).toBe(640);
  });
});
