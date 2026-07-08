import { describe, it, expect } from 'vitest';
import { createBgEvents, updateBgEvents, resetBgEvents, foudreAlpha, rafaleAlpha } from '../../src/game/bgevents.js';

const zero = () => 0;   // délai minimal 6 s, params déterministes
const half = () => 0.5; // délai 9 s

describe('bgevents planificateur', () => {
  it('crée un timer dans [6, 12) et aucun événement', () => {
    expect(createBgEvents(zero).timer).toBe(6);
    expect(createBgEvents(() => 0.999).timer).toBeCloseTo(11.994, 3);
    expect(createBgEvents(zero).event).toBe(null);
  });

  it('déclenche l événement du décor courant à échéance', () => {
    const ev = createBgEvents(zero);
    updateBgEvents(ev, 6, 3, zero);
    expect(ev.event).toMatchObject({ kind: 'foudre', t: 0, dur: 0.5 });
  });

  it('chaque bgSet déclenche son kind', () => {
    const kinds = ['rafale', 'torchere', 'oiseaux', 'foudre', 'etoile'];
    for (let bg = 0; bg < 5; bg += 1) {
      const ev = createBgEvents(zero);
      updateBgEvents(ev, 6, bg, zero);
      expect(ev.event.kind).toBe(kinds[bg]);
    }
  });

  it('un seul événement actif : pas de re-déclenchement pendant', () => {
    const ev = createBgEvents(zero);
    updateBgEvents(ev, 6, 3, zero);
    const started = ev.event;
    updateBgEvents(ev, 0.1, 3, zero);
    expect(ev.event).toBe(started);
    expect(ev.event.t).toBeCloseTo(0.1, 5);
  });

  it('meurt à dur écoulée et réarme le timer', () => {
    const ev = createBgEvents(zero);
    updateBgEvents(ev, 6, 3, zero);
    updateBgEvents(ev, 0.5, 3, half);
    expect(ev.event).toBe(null);
    expect(ev.timer).toBe(9);
  });

  it('resetBgEvents coupe l événement en cours et retire un délai', () => {
    const ev = createBgEvents(zero);
    updateBgEvents(ev, 6, 4, zero);
    expect(ev.event).not.toBe(null);
    resetBgEvents(ev, half);
    expect(ev.event).toBe(null);
    expect(ev.timer).toBe(9);
  });
});

describe('courbes', () => {
  it('foudreAlpha : pic 0.35, second pulse plus faible, retombe à ~0', () => {
    expect(foudreAlpha({ t: 0 })).toBeCloseTo(0.35, 5);
    const second = foudreAlpha({ t: 0.26 });
    expect(second).toBeGreaterThan(0);
    expect(second).toBeLessThan(0.35);
    expect(foudreAlpha({ t: 0.5 })).toBeLessThanOrEqual(0.01);
  });

  it('foudreAlpha ne dépasse jamais 0.35 (portes lisibles)', () => {
    for (let t = 0; t <= 0.5; t += 0.01) {
      expect(foudreAlpha({ t })).toBeLessThanOrEqual(0.35);
    }
  });

  it('rafaleAlpha : 0 sans événement, 1 sur le front, 0 loin du front', () => {
    const ev = createBgEvents(zero);
    expect(rafaleAlpha(ev, 100)).toBe(0);
    updateBgEvents(ev, 6, 0, zero);   // rafale démarre (dur 1.2)
    updateBgEvents(ev, 0.6, 0, zero); // t=0.6 -> front à (0.5)*(360+80)-40 = 180
    expect(rafaleAlpha(ev, 180)).toBeCloseTo(1, 2);
    expect(rafaleAlpha(ev, 300)).toBe(0);
  });
});
