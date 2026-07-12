// Deck complet + utilitaires d'introspection (utilisés par les tests d'invariants).
import { roche } from './roche.js';
import { camelot } from './camelot.js';
import { graal, chute, avalon } from './lateEras.js';

export const CARDS = [...roche, ...camelot, ...graal, ...chute, ...avalon];

/** Ensemble des flags posés par au moins un choix du deck. */
export function flagsSetBy(cards = CARDS) {
  const set = new Set();
  for (const c of cards) {
    for (const side of ['left', 'right']) {
      for (const f of c[side]?.flags ?? []) {
        set.add(Array.isArray(f) ? f[0] : f);
      }
    }
  }
  return set;
}

/** Ensemble des flags lus par une condition `requires`. */
export function flagsRequiredBy(cards = CARDS) {
  const set = new Set();
  for (const c of cards) {
    const r = c.requires;
    if (!r) continue;
    for (const key of ['allFlags', 'anyFlags', 'noneFlags']) {
      for (const f of r[key] ?? []) set.add(f);
    }
  }
  return set;
}

/** Ensemble des ids de carte référencés par un `next`. */
export function nextIdsReferenced(cards = CARDS) {
  const set = new Set();
  for (const c of cards) {
    for (const side of ['left', 'right']) {
      if (c[side]?.next) set.add(c[side].next);
    }
  }
  return set;
}
