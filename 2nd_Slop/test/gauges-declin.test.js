import { describe, it, expect } from 'vitest';
import { applyDeclin } from '../src/game/gauges.js';
import { AVALON_DECLIN } from '../src/config.js';

describe('applyDeclin — l\'érosion d\'Avalon', () => {
  it('érode les 4 jauges du montant demandé', () => {
    const g = { foi: 50, magie: 40, chevalerie: 30, couronne: 20 };
    expect(applyDeclin(g, 3)).toEqual({ foi: 47, magie: 37, chevalerie: 27, couronne: 17 });
  });

  it('utilise AVALON_DECLIN par défaut', () => {
    const g = { foi: 50, magie: 50, chevalerie: 50, couronne: 50 };
    const out = applyDeclin(g);
    expect(out.foi).toBe(50 - AVALON_DECLIN);
  });

  it('borne à 0 sans jamais passer sous zéro', () => {
    const g = { foi: 2, magie: 1, chevalerie: 0, couronne: 3 };
    expect(applyDeclin(g, 5)).toEqual({ foi: 0, magie: 0, chevalerie: 0, couronne: 0 });
  });

  it('n\'altère pas l\'objet d\'entrée', () => {
    const g = { foi: 50, magie: 50, chevalerie: 50, couronne: 50 };
    applyDeclin(g, 3);
    expect(g.foi).toBe(50);
  });
});
