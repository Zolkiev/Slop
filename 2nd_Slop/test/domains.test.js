import { describe, it, expect } from 'vitest';
import { PORTRAITS } from '../src/game/portraits.js';
import { DOMAIN_BY_PORTRAIT, DOMAINS, domainFor } from '../src/game/domains.js';

describe('domaines de carte', () => {
  it('chaque personnage connu a un domaine valide', () => {
    for (const key of new Set(Object.values(PORTRAITS))) {
      expect(DOMAINS, `portrait ${key}`).toContain(DOMAIN_BY_PORTRAIT[key]);
    }
  });
  it('domainFor mappe l’orateur via son portrait', () => {
    expect(domainFor('Un baron')).toBe('couronne');
    expect(domainFor('Merlin')).toBe('magie');
    expect(domainFor('Lancelot')).toBe('chevalerie');
    expect(domainFor("L'Évêque")).toBe('foi');
    expect(domainFor('Un paysan')).toBe('peuple');
  });
  it('orateur inconnu → peuple (fallback)', () => {
    expect(domainFor('Un inconnu total')).toBe('peuple');
  });
});
