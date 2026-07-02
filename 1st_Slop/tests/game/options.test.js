import { describe, it, expect } from 'vitest';
import { createOptions, moveOptionsFocus, adjust, barHitTest } from '../../src/game/options.js';
import { CONFIG } from '../../src/config.js';

describe('options screen state', () => {
  it('createOptions copie les valeurs des settings, focus sur SFX', () => {
    const opt = createOptions({ sfx: 3, music: 9 });
    expect(opt.rows.map((r) => r.id)).toEqual(['sfx', 'music']);
    expect(opt.rows.map((r) => r.label)).toEqual(['SFX', 'MUSIQUE']);
    expect(opt.rows.map((r) => r.value)).toEqual([3, 9]);
    expect(opt.focus).toBe(0);
  });

  it('moveOptionsFocus wrap 0->1->2->0 et inverse', () => {
    const opt = createOptions({ sfx: 7, music: 7 });
    moveOptionsFocus(opt, 1); expect(opt.focus).toBe(1);
    moveOptionsFocus(opt, 1); expect(opt.focus).toBe(2);
    moveOptionsFocus(opt, 1); expect(opt.focus).toBe(0);
    moveOptionsFocus(opt, -1); expect(opt.focus).toBe(2);
  });

  it('adjust ±1 clampé, renvoie l\'id au changement, null sinon', () => {
    const opt = createOptions({ sfx: 10, music: 0 });
    expect(adjust(opt, 1)).toBe(null); // sfx déjà à 10
    expect(adjust(opt, -1)).toBe('sfx');
    expect(opt.rows[0].value).toBe(9);
    opt.focus = 1;
    expect(adjust(opt, -1)).toBe(null); // music déjà à 0
    expect(adjust(opt, 1)).toBe('music');
    opt.focus = 2;
    expect(adjust(opt, 1)).toBe(null); // RETOUR: no-op
  });

  it('barHitTest: segment k -> valeur k, hors zone -> null', () => {
    const opt = createOptions({ sfx: 7, music: 7 });
    const R = CONFIG.OPTIONS_ROWS;
    const segX = (k) => R.x + k * (R.segW + R.segGap) + 1;
    expect(barHitTest(opt, segX(0), R.y0 + 1)).toEqual({ id: 'sfx', value: 0 });
    expect(barHitTest(opt, segX(10), R.y0 + 1)).toEqual({ id: 'sfx', value: 10 });
    expect(barHitTest(opt, segX(5), R.y0 + R.gap + 1)).toEqual({ id: 'music', value: 5 });
    // dans l'inter-segment -> null
    expect(barHitTest(opt, R.x + R.segW + 1, R.y0 + 1)).toBe(null);
    // hors des lignes -> null
    expect(barHitTest(opt, segX(0), R.y0 + R.segH + 5)).toBe(null);
    expect(barHitTest(opt, 0, 0)).toBe(null);
  });
});
