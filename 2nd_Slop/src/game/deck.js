// Moteur de deck : sélectionne la prochaine carte selon l'état du règne.
// Une carte est éligible si son ère correspond, ses conditions (flags/jauges)
// sont remplies, et — si `unique` — qu'elle n'a pas déjà été vue.
import { hasFlag } from './flags.js';

/** L'ère de la carte correspond-elle à l'ère courante ? (absente = toutes ères) */
function eraMatches(card, era) {
  if (card.era == null) return true;
  if (Array.isArray(card.era)) return card.era.includes(era);
  return card.era === era;
}

/** Les conditions `requires` de la carte sont-elles satisfaites ? */
function requiresMet(card, gauges, flags) {
  const r = card.requires;
  if (!r) return true;
  if (r.allFlags && !r.allFlags.every((f) => hasFlag(flags, f))) return false;
  if (r.anyFlags && !r.anyFlags.some((f) => hasFlag(flags, f))) return false;
  if (r.noneFlags && r.noneFlags.some((f) => hasFlag(flags, f))) return false;
  if (r.gauge) {
    for (const [key, [min, max]] of Object.entries(r.gauge)) {
      if (gauges[key] < min || gauges[key] > max) return false;
    }
  }
  return true;
}

/** Une carte est-elle jouable dans le contexte donné ? */
export function isEligible(card, ctx) {
  const { gauges, flags, era, seen } = ctx;
  if (card.unique && seen && seen.has(card.id)) return false;
  if (!eraMatches(card, era)) return false;
  return requiresMet(card, gauges, flags);
}

/** Toutes les cartes jouables dans le contexte. */
export function eligibleCards(cards, ctx) {
  return cards.filter((c) => isEligible(c, ctx));
}

/**
 * Choisit la prochaine carte.
 * - Si `ctx.forcedNext` pointe une carte existante et éligible, elle est jouée
 *   (chaînes de quêtes via `next`).
 * - Les cartes de `ctx.recent` (jouées récemment) sont écartées, sauf si le
 *   pool serait vide — le non-blocage prime sur l'anti-répétition.
 * - Sinon, tirage pondéré par `weight` parmi les cartes éligibles.
 * @param {Function} rng - fonction () => [0,1). Défaut: Math.random.
 * @returns la carte choisie, ou null si aucune n'est éligible.
 */
export function pickCard(cards, ctx, rng = Math.random) {
  if (ctx.forcedNext) {
    const forced = cards.find((c) => c.id === ctx.forcedNext);
    if (forced && isEligible(forced, { ...ctx, forcedNext: null })) return forced;
  }
  let pool = eligibleCards(cards, ctx);
  if (ctx.recent?.length) {
    const fresh = pool.filter((c) => !ctx.recent.includes(c.id));
    if (fresh.length > 0) pool = fresh;
  }
  if (pool.length === 0) return null;

  const total = pool.reduce((s, c) => s + (c.weight ?? 1), 0);
  let roll = rng() * total;
  for (const c of pool) {
    roll -= c.weight ?? 1;
    if (roll < 0) return c;
  }
  return pool[pool.length - 1]; // garde-fou d'arrondi
}
