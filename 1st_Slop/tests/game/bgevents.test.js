import { describe, it, expect } from 'vitest';
import { createBgEvents, updateBgEvents, resetBgEvents, foudreAlpha, rafaleAlpha } from '../../src/game/bgevents.js';

const zero = () => 0;   // relance au min de la fourchette, params déterministes
const half = () => 0.5; // relance au milieu de la fourchette

describe('bgevents planificateur (cadence par décor — retour gate Jael)', () => {
  it('créé désarmé : armé par resetBgEvents au premier applyBgSet', () => {
    const ev = createBgEvents();
    expect(ev.event).toBe(null);
    expect(ev.timer).toBe(Infinity);
  });

  it('resetBgEvents arme le premier déclenchement rapide du décor', () => {
    const ev = createBgEvents();
    resetBgEvents(ev, 3);
    expect(ev.timer).toBe(2); // foudre : premier éclair à 2 s
    resetBgEvents(ev, 1);
    expect(ev.timer).toBeCloseTo(0.6, 5); // torchère : quasi immédiat
  });

  it('déclenche l événement du décor courant à échéance', () => {
    const ev = createBgEvents();
    resetBgEvents(ev, 3);
    updateBgEvents(ev, 2, 3, zero);
    expect(ev.event).toMatchObject({ kind: 'foudre', t: 0, dur: 0.5 });
  });

  it('chaque bgSet déclenche son kind avant 2 s', () => {
    const kinds = ['rafale', 'torchere', 'oiseaux', 'foudre', 'etoile'];
    for (let bg = 0; bg < 5; bg += 1) {
      const ev = createBgEvents();
      resetBgEvents(ev, bg);
      updateBgEvents(ev, 2, bg, zero);
      expect(ev.event.kind).toBe(kinds[bg]);
    }
  });

  it('foudre : tire la forme et la position de l éclair au déclenchement', () => {
    const ev = createBgEvents();
    resetBgEvents(ev, 3);
    updateBgEvents(ev, 2, 3, zero);
    expect(ev.event).toMatchObject({ kind: 'foudre', bolt: 0, boltX: 30 });
    const ev2 = createBgEvents();
    resetBgEvents(ev2, 3);
    updateBgEvents(ev2, 2, 3, half);
    expect(ev2.event.bolt).toBe(1);       // floor(0.5*3)
    expect(ev2.event.boltX).toBe(130);    // 30 + 0.5*200
  });

  it('un seul événement actif : pas de re-déclenchement pendant', () => {
    const ev = createBgEvents();
    resetBgEvents(ev, 3);
    updateBgEvents(ev, 2, 3, zero);
    const started = ev.event;
    updateBgEvents(ev, 0.1, 3, zero);
    expect(ev.event).toBe(started);
    expect(ev.event.t).toBeCloseTo(0.1, 5);
  });

  it('foudre : meurt à dur écoulée et se relance toutes les 5-6 s', () => {
    const ev = createBgEvents();
    resetBgEvents(ev, 3);
    updateBgEvents(ev, 2, 3, zero);
    updateBgEvents(ev, 0.5, 3, half);
    expect(ev.event).toBe(null);
    expect(ev.timer).toBe(5.5); // milieu de [5, 6]
    updateBgEvents(ev, 0.5, 3, zero);
    expect(ev.timer).toBe(5); // le timer réarmé décompte normalement
  });

  it('torchère : enchaînée en continu (la fumée verte brûle tout le temps)', () => {
    const ev = createBgEvents();
    resetBgEvents(ev, 1);
    updateBgEvents(ev, 0.6, 1, zero);
    expect(ev.event.kind).toBe('torchere');
    updateBgEvents(ev, 2.5, 1, half); // fin du cycle -> relance immédiate
    expect(ev.timer).toBe(0);
    updateBgEvents(ev, 1 / 60, 1, half);
    expect(ev.event).not.toBe(null);
    expect(ev.event.kind).toBe('torchere');
  });

  it('resetBgEvents coupe l événement en cours et repart sur le délai court', () => {
    const ev = createBgEvents();
    resetBgEvents(ev, 4);
    updateBgEvents(ev, 2, 4, zero);
    expect(ev.event).not.toBe(null);
    resetBgEvents(ev, 4);
    expect(ev.event).toBe(null);
    expect(ev.timer).toBe(2); // étoile : première à 2 s même après un restart
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
    const ev = createBgEvents();
    resetBgEvents(ev, 0);
    expect(rafaleAlpha(ev, 100)).toBe(0);
    updateBgEvents(ev, 1.5, 0, zero); // rafale démarre (dur 1.2)
    updateBgEvents(ev, 0.6, 0, zero); // t=0.6 -> front à (0.5)*(360+80)-40 = 180
    expect(rafaleAlpha(ev, 180)).toBeCloseTo(1, 2);
    expect(rafaleAlpha(ev, 300)).toBe(0);
  });
});
