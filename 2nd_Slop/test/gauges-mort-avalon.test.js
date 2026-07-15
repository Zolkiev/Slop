import { describe, it, expect } from 'vitest';
import { checkDeath } from '../src/game/gauges.js';
import { GAUGES, GAUGE_KEYS } from '../src/config.js';

const vivant = { foi: 50, magie: 50, chevalerie: 50, couronne: 50 };

describe("morts d'Avalon", () => {
  it("chaque jauge a un texte de mort propre à Avalon, distinct du texte normal", () => {
    for (const g of GAUGES) {
      expect(g.avalonEmpty, `jauge ${g.key}`).toBeTruthy();
      expect(g.avalonEmpty, `jauge ${g.key}`).not.toBe(g.empty);
    }
  });

  it("en Avalon, une jauge à vide donne le texte d'Avalon", () => {
    for (const key of GAUGE_KEYS) {
      const g = { ...vivant, [key]: 0 };
      const mort = checkDeath(g, 'avalon');
      const def = GAUGES.find((x) => x.key === key);
      expect(mort.key).toBe(key);
      expect(mort.side).toBe('empty');
      expect(mort.cause).toBe(def.avalonEmpty);
    }
  });

  it("hors Avalon, le texte normal est conservé (non-régression)", () => {
    for (const key of GAUGE_KEYS) {
      const g = { ...vivant, [key]: 0 };
      const def = GAUGES.find((x) => x.key === key);
      expect(checkDeath(g, 'chute').cause).toBe(def.empty);
      expect(checkDeath(g).cause).toBe(def.empty); // sans era: inchangé
    }
  });

  it("les morts « à plein » ignorent l'ère (texte normal même en Avalon)", () => {
    for (const key of GAUGE_KEYS) {
      const g = { ...vivant, [key]: 100 };
      const def = GAUGES.find((x) => x.key === key);
      const mort = checkDeath(g, 'avalon');
      expect(mort.side).toBe('full');
      expect(mort.cause).toBe(def.full);
    }
  });

  it('aucune mort quand toutes les jauges sont saines', () => {
    expect(checkDeath(vivant, 'avalon')).toBeNull();
  });
});
