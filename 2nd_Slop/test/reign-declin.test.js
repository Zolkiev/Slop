import { describe, it, expect } from 'vitest';
import { choose } from '../src/game/reign.js';
import { createFlags, setFlag } from '../src/game/flags.js';
import { AVALON_DECLIN, GAUGES } from '../src/config.js';

// Règne minimal avec une carte déjà présentée.
function reignAvec(era, years, gauges, card) {
  return {
    years,
    era,
    gauges: { foi: 50, magie: 50, chevalerie: 50, couronne: 50, ...gauges },
    flags: createFlags(),
    current: card,
    next: null,
    dead: null,
    miracle: null,
    combat: null,
  };
}

const carteNeutre = {
  id: 'test.neutre',
  era: 'avalon',
  speaker: 'Merlin',
  text: 'test',
  left: { label: 'a', effects: {} },
  right: { label: 'b', effects: {} },
};

describe('Le Déclin dans reign.choose()', () => {
  it('un tour joué en Avalon érode les 4 jauges', () => {
    const r = choose(reignAvec('avalon', 50, {}, carteNeutre), 'left');
    expect(r.gauges).toEqual({
      foi: 50 - AVALON_DECLIN,
      magie: 50 - AVALON_DECLIN,
      chevalerie: 50 - AVALON_DECLIN,
      couronne: 50 - AVALON_DECLIN,
    });
  });

  it('aucune autre ère n’érode', () => {
    for (const era of ['roche', 'camelot', 'graal', 'chute']) {
      const r = choose(reignAvec(era, 10, {}, { ...carteNeutre, era }), 'left');
      expect(r.gauges, `ère ${era}`).toEqual({ foi: 50, magie: 50, chevalerie: 50, couronne: 50 });
    }
  });

  it('le déclin s’applique APRÈS les effets de la carte', () => {
    const carte = { ...carteNeutre, left: { label: 'a', effects: { foi: +10 } } };
    const r = choose(reignAvec('avalon', 50, {}, carte), 'left');
    expect(r.gauges.foi).toBe(50 + 10 - AVALON_DECLIN);
  });

  it('le déclin peut tuer, avec le texte d’Avalon', () => {
    const carte = { ...carteNeutre, left: { label: 'a', effects: {} } };
    const r = choose(reignAvec('avalon', 50, { foi: 2 }, carte), 'left');
    expect(r.dead).not.toBeNull();
    expect(r.dead.key).toBe('foi');
    expect(r.dead.cause).toBe(GAUGES.find((g) => g.key === 'foi').avalonEmpty);
  });

  // Le bug de bord de la spec §3.1 : la carte jouée appartenait à la Chute.
  it('la bascule an 43 → 44 n’érode pas et garde le texte de la Chute', () => {
    const carte = { ...carteNeutre, era: 'chute', left: { label: 'a', effects: { foi: -50 } } };
    const r = choose(reignAvec('chute', 43, { foi: 2 }, carte), 'left');
    expect(r.era).toBe('avalon'); // on vient d'entrer dans l'ère
    expect(r.gauges.magie).toBe(50); // pas de déclin sur le tour de bascule
    expect(r.dead.cause).toBe(GAUGES.find((g) => g.key === 'foi').empty); // texte Chute
  });

  it('le Fourreau boit une mort par déclin (non-régression)', () => {
    const r0 = reignAvec('avalon', 50, { foi: 2 }, carteNeutre);
    setFlag(r0.flags, 'relique.fourreau');
    const r = choose(r0, 'left');
    expect(r.dead).toBeNull();
    expect(r.gauges.foi).toBe(15); // RESCUE_EMPTY
    expect(r.miracle).toBeTruthy();
  });
});
