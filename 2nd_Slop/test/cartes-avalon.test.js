import { describe, it, expect } from 'vitest';
import { CARDS } from '../src/game/cards/index.js';
import { PORTRAITS } from '../src/game/portraits.js';
import { GAUGE_KEYS } from '../src/config.js';

const avalon = CARDS.filter((c) => c.era === 'avalon');
const rejouables = avalon.filter((c) => !c.unique);

describe("contenu d'Avalon", () => {
  it("compte au moins 7 cartes rejouables (2 fillers + 5 neuves)", () => {
    expect(rejouables.length).toBeGreaterThanOrEqual(7);
  });

  it("chaque orateur d'Avalon est mappé dans PORTRAITS (sinon cadre faux)", () => {
    for (const c of avalon) {
      expect(PORTRAITS[c.speaker], `carte ${c.id} — orateur « ${c.speaker} »`).toBeTruthy();
    }
  });

  it("les cartes rejouables offrent un vrai arbitrage entre deux jauges", () => {
    for (const c of rejouables) {
      for (const side of ['left', 'right']) {
        const eff = c[side].effects;
        const keys = Object.keys(eff);
        expect(keys.length, `${c.id}.${side}`).toBeGreaterThanOrEqual(2);
        expect(keys.some((k) => eff[k] > 0), `${c.id}.${side} — aucun gain`).toBe(true);
        expect(keys.some((k) => eff[k] < 0), `${c.id}.${side} — aucun coût`).toBe(true);
        for (const k of keys) expect(GAUGE_KEYS, `${c.id}.${side} — clé ${k}`).toContain(k);
      }
    }
  });

  it("les 4 jauges sont toutes défendables par au moins une carte rejouable", () => {
    for (const key of GAUGE_KEYS) {
      const peutMonter = rejouables.some((c) =>
        ['left', 'right'].some((s) => (c[s].effects[key] ?? 0) > 0)
      );
      expect(peutMonter, `aucune carte rejouable ne fait monter ${key}`).toBe(true);
    }
  });

  it("les identifiants sont uniques", () => {
    const ids = CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
