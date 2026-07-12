// Orchestration d'un règne : relie jauges, flags, deck et ères.
// Boucle logique : draw() présente une carte, choose() applique un côté.
import { ERAS, RECENT_LIMIT } from '../config.js';
import { createGauges, applyEffects, checkDeath } from './gauges.js';
import { createFlags, applyFlags } from './flags.js';
import { pickCard } from './deck.js';

/** Ère correspondant à un nombre d'années de règne. */
export function eraForYears(years) {
  for (const era of ERAS) {
    if (era.until === null || years < era.until) return era.id;
  }
  return ERAS[ERAS.length - 1].id;
}

/** Nouveau règne. `initial.gauges` permet des départs de dynastie. */
export function createReign(initial = {}) {
  return {
    gauges: createGauges(initial.gauges),
    flags: initial.flags ?? createFlags(),
    years: 0,
    era: eraForYears(0),
    seen: new Set(),
    recent: [], // dernières cartes jouées (anti-répétition)
    next: null, // id de carte forcée (chaîne de quête)
    dead: null, // {key, side, cause} une fois mort
    current: null, // carte présentée en attente de choix
  };
}

/**
 * Présente la prochaine carte. Met à jour `seen` et `current`.
 * @returns la carte, ou null si le deck est vide (ne devrait pas arriver — voir invariants).
 */
export function draw(reign, cards, rng = Math.random) {
  const card = pickCard(cards, {
    gauges: reign.gauges,
    flags: reign.flags,
    era: reign.era,
    seen: reign.seen,
    recent: reign.recent,
    forcedNext: reign.next,
  }, rng);
  reign.current = card;
  if (card) {
    reign.seen.add(card.id);
    reign.recent.push(card.id);
    if (reign.recent.length > RECENT_LIMIT) reign.recent.shift();
  }
  return card;
}

/**
 * Applique un choix (`side` = 'left' | 'right') sur la carte présentée.
 * Fait avancer les jauges, les flags, l'année et l'ère, puis teste la mort.
 * Renvoie le règne muté (même objet, pour un usage simple côté boucle).
 */
export function choose(reign, side) {
  const card = reign.current;
  if (!card) throw new Error('choose() sans carte présentée');
  const choice = card[side];
  if (!choice) throw new Error(`côté invalide: ${side}`);

  reign.gauges = applyEffects(reign.gauges, choice.effects);
  applyFlags(reign.flags, choice.flags);
  reign.years += 1;
  reign.era = eraForYears(reign.years);
  reign.next = choice.next ?? null;
  reign.current = null;
  reign.dead = checkDeath(reign.gauges);
  return reign;
}
