import { describe, it, expect } from 'vitest';
import { isEligible, eligibleCards, pickCard } from '../src/game/deck.js';
import { createFlags, setFlag } from '../src/game/flags.js';
import { createGauges } from '../src/game/gauges.js';

const ctx = (over = {}) => ({
  gauges: createGauges(),
  flags: createFlags(),
  era: 'roche',
  seen: new Set(),
  forcedNext: null,
  ...over,
});

describe('deck — éligibilité', () => {
  it('filtre par ère', () => {
    const card = { id: 'a', era: 'camelot', left: {}, right: {} };
    expect(isEligible(card, ctx({ era: 'roche' }))).toBe(false);
    expect(isEligible(card, ctx({ era: 'camelot' }))).toBe(true);
  });

  it('respecte allFlags / noneFlags / gauge', () => {
    const flags = createFlags();
    setFlag(flags, 'table.ronde');
    const card = {
      id: 'a',
      requires: { allFlags: ['table.ronde'], gauge: { foi: [40, 100] } },
      left: {}, right: {},
    };
    expect(isEligible(card, ctx({ flags }))).toBe(true);
    expect(isEligible(card, ctx({ flags, gauges: createGauges({ foi: 10 }) }))).toBe(false);
    expect(isEligible(card, ctx())).toBe(false); // flag manquant
  });

  it('exclut les cartes uniques déjà vues', () => {
    const card = { id: 'a', unique: true, left: {}, right: {} };
    expect(isEligible(card, ctx({ seen: new Set(['a']) }))).toBe(false);
  });
});

describe('deck — tirage', () => {
  const cards = [
    { id: 'x', weight: 1, left: {}, right: {} },
    { id: 'y', weight: 9, left: {}, right: {} },
  ];

  it('le tirage pondéré respecte les poids', () => {
    // rng juste sous 0.1 -> première carte ; juste au-dessus -> seconde
    expect(pickCard(cards, ctx(), () => 0.05).id).toBe('x');
    expect(pickCard(cards, ctx(), () => 0.5).id).toBe('y');
  });

  it('renvoie null si rien n’est éligible', () => {
    expect(pickCard([{ id: 'z', era: 'avalon', left: {}, right: {} }], ctx(), () => 0)).toBeNull();
  });

  it('forcedNext joue la carte forcée si éligible', () => {
    const forced = pickCard(cards, ctx({ forcedNext: 'y' }), () => 0);
    expect(forced.id).toBe('y');
  });
});

describe('deck — anti-répétition', () => {
  const cards = [
    { id: 'a', left: {}, right: {} },
    { id: 'b', left: {}, right: {} },
  ];

  it('écarte les cartes jouées récemment', () => {
    // rng à 0 choisirait 'a' ; 'a' en recent doit forcer 'b'
    expect(pickCard(cards, ctx({ recent: ['a'] }), () => 0).id).toBe('b');
  });

  it('re-sert une carte récente plutôt que de bloquer', () => {
    expect(pickCard(cards, ctx({ recent: ['a', 'b'] }), () => 0)).not.toBeNull();
  });

  it('forcedNext ignore le cooldown (les chaînes priment)', () => {
    expect(pickCard(cards, ctx({ recent: ['b'], forcedNext: 'b' }), () => 0).id).toBe('b');
  });
});
