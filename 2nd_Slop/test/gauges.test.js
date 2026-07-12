import { describe, it, expect } from 'vitest';
import { createGauges, applyEffects, checkDeath } from '../src/game/gauges.js';
import { GAUGE_KEYS, GAUGE_START } from '../src/config.js';

describe('gauges', () => {
  it('crée les 4 jauges à la valeur de départ', () => {
    const g = createGauges();
    expect(Object.keys(g).sort()).toEqual([...GAUGE_KEYS].sort());
    for (const k of GAUGE_KEYS) expect(g[k]).toBe(GAUGE_START);
  });

  it('accepte des valeurs de départ (dynastie) et les borne', () => {
    const g = createGauges({ foi: 200, magie: -5 });
    expect(g.foi).toBe(100);
    expect(g.magie).toBe(0);
  });

  it('applyEffects borne 0..100 et n’altère pas l’entrée', () => {
    const g = createGauges({ foi: 95 });
    const next = applyEffects(g, { foi: +20, couronne: -80 });
    expect(next.foi).toBe(100);
    expect(next.couronne).toBe(0);
    expect(g.foi).toBe(95); // immuable
  });

  it('checkDeath détecte le vide et le trop-plein, sinon null', () => {
    expect(checkDeath(createGauges())).toBeNull();
    expect(checkDeath(createGauges({ chevalerie: 0 }))).toMatchObject({
      key: 'chevalerie',
      side: 'empty',
    });
    expect(checkDeath(createGauges({ foi: 100 }))).toMatchObject({
      key: 'foi',
      side: 'full',
    });
  });
});
