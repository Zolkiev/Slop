// Jauges du royaume : état pur, application d'effets bornée, détection de mort.
import { GAUGE_KEYS, GAUGE_MIN, GAUGE_MAX, GAUGE_START, GAUGES, AVALON_DECLIN } from '../config.js';

const clamp = (v) => Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, v));

/** Crée un jeu de jauges (toutes à GAUGE_START par défaut). */
export function createGauges(initial = {}) {
  const g = {};
  for (const key of GAUGE_KEYS) {
    g[key] = clamp(initial[key] ?? GAUGE_START);
  }
  return g;
}

/**
 * Applique des effets `{foi:+5, couronne:-10, ...}` et renvoie de NOUVELLES
 * jauges bornées 0..100. N'altère jamais l'objet d'entrée.
 */
export function applyEffects(gauges, effects = {}) {
  const next = { ...gauges };
  for (const key of GAUGE_KEYS) {
    if (effects[key]) next[key] = clamp(next[key] + effects[key]);
  }
  return next;
}

/**
 * Le Déclin d'Avalon : érode les 4 jauges de `n` points et renvoie de NOUVELLES
 * jauges bornées 0..100. N'altère jamais l'objet d'entrée.
 * Peut tuer — c'est le but : l'épilogue doit se conclure.
 */
export function applyDeclin(gauges, n = AVALON_DECLIN) {
  const next = { ...gauges };
  for (const key of GAUGE_KEYS) next[key] = clamp(next[key] - n);
  return next;
}

/**
 * Renvoie la première mort déclenchée (jauge à 0 ou à 100), ou null.
 * L'ordre suit GAUGES pour un résultat déterministe.
 * @returns {{key:string, side:'empty'|'full', cause:string}|null}
 */
export function checkDeath(gauges) {
  for (const g of GAUGES) {
    const v = gauges[g.key];
    if (v <= GAUGE_MIN) return { key: g.key, side: 'empty', cause: g.empty };
    if (v >= GAUGE_MAX) return { key: g.key, side: 'full', cause: g.full };
  }
  return null;
}
