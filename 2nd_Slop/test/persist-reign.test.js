// Sérialisation d'un règne en cours : round-trip fidèle et re-jouable.
import { describe, it, expect } from 'vitest';
import { createReign, draw, choose } from '../src/game/reign.js';
import { setFlag } from '../src/game/flags.js';
import { CARDS } from '../src/game/cards/index.js';
import { serializeReign, deserializeReign } from '../src/game/persist-reign.js';

describe('serializeReign / deserializeReign', () => {
  it('préserve l\'état d\'un règne joué quelques tours', () => {
    const reign = createReign({ king: 2 });
    setFlag(reign.flags, 'mordred.concu');
    setFlag(reign.flags, 'saxons.raid', 2); // compteur
    draw(reign, CARDS);
    choose(reign, 'left');
    draw(reign, CARDS);

    const restored = deserializeReign(serializeReign(reign), CARDS);

    expect(restored.gauges).toEqual(reign.gauges);
    expect(restored.king).toBe(2);
    expect(restored.years).toBe(reign.years);
    expect(restored.era).toBe(reign.era);
    expect([...restored.seen]).toEqual([...reign.seen]);
    expect(restored.recent).toEqual(reign.recent);
    expect(restored.next).toBe(reign.next);
    expect([...restored.flags.set]).toEqual([...reign.flags.set]);
    expect(restored.flags.counts).toEqual(reign.flags.counts);
    expect(restored.current?.id).toBe(reign.current?.id);
  });

  it('reste jouable après restauration (draw/choose ne jettent pas)', () => {
    const reign = createReign();
    draw(reign, CARDS);
    const restored = deserializeReign(serializeReign(reign), CARDS);
    expect(() => {
      choose(restored, 'right');
      draw(restored, CARDS);
    }).not.toThrow();
  });

  it('renvoie null sur une entrée corrompue', () => {
    expect(deserializeReign(null, CARDS)).toBeNull();
    expect(deserializeReign({ v: 999 }, CARDS)).toBeNull();
    expect(deserializeReign('pas un objet', CARDS)).toBeNull();
  });
});
