import { describe, it, expect, vi } from 'vitest';
import { loadFont } from '../../src/engine/font.js';

describe('loadFont', () => {
  it('charge la font et l\'ajoute au fontset', async () => {
    const loaded = { name: 'face' };
    const load = vi.fn().mockResolvedValue(loaded);
    const FontFaceCtor = vi.fn(function(family, src) {
      this.family = family;
      this.src = src;
      this.load = load;
    });
    const fontset = { add: vi.fn() };

    await loadFont('PressStart2P', '/x.ttf', { FontFaceCtor, fontset });

    expect(FontFaceCtor).toHaveBeenCalledWith('PressStart2P', 'url(/x.ttf)');
    expect(load).toHaveBeenCalledTimes(1);
    expect(fontset.add).toHaveBeenCalledWith(loaded);
  });

  it('rejette si le chargement échoue', async () => {
    const load = vi.fn().mockRejectedValue(new Error('boom'));
    const FontFaceCtor = vi.fn(function() {
      this.load = load;
    });
    const fontset = { add: vi.fn() };
    await expect(loadFont('X', '/x.ttf', { FontFaceCtor, fontset })).rejects.toThrow('boom');
    expect(fontset.add).not.toHaveBeenCalled();
  });
});
