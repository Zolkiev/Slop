import { describe, it, expect } from 'vitest';
import { createLayer, updateLayer } from '../../src/game/background.js';

describe('background parallax', () => {
  it('crée une couche à offset 0', () => {
    expect(createLayer(0.5, 360)).toEqual({ speedFactor: 0.5, tileWidth: 360, offset: 0 });
  });

  it('avance l offset proportionnellement à la vitesse et au facteur', () => {
    const layer = createLayer(0.5, 360);
    updateLayer(layer, 100, 1); // 100 * 0.5 * 1 = 50
    expect(layer.offset).toBeCloseTo(50, 5);
  });

  it('wrappe l offset modulo tileWidth', () => {
    const layer = createLayer(1, 360);
    layer.offset = 350;
    updateLayer(layer, 100, 1); // 350 + 100 = 450 -> 90
    expect(layer.offset).toBeCloseTo(90, 5);
  });
});
