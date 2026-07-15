// Sérialisation d'un règne en cours (pour la reprise « CONTINUER »).
// La forme de `reign` est déjà JSON-friendly (flags = {set, counts}) ;
// l'ère se redérive de `years`, on ne la stocke donc pas.
import { eraForYears } from './reign.js';
import { createFlags } from './flags.js';
import { GAUGE_KEYS } from '../config.js';

const VERSION = 1;

/** Snapshot JSON d'un règne. */
export function serializeReign(reign) {
  return {
    v: VERSION,
    gauges: { ...reign.gauges },
    king: reign.king ?? 0,
    flags: { set: [...reign.flags.set], counts: { ...reign.flags.counts } },
    years: reign.years,
    seen: [...reign.seen],
    recent: [...reign.recent],
    next: reign.next ?? null,
    currentId: reign.current ? reign.current.id : null,
  };
}

/** Reconstruit un règne jouable, ou null si le snapshot est inexploitable. */
export function deserializeReign(data, cards) {
  if (!data || typeof data !== 'object' || data.v !== VERSION) return null;
  if (
    !data.gauges ||
    typeof data.gauges !== 'object' ||
    !GAUGE_KEYS.every((key) => Number.isFinite(data.gauges[key]))
  ) {
    return null;
  }
  try {
    const flags = createFlags();
    for (const name of data.flags?.set ?? []) flags.set.add(name);
    flags.counts = { ...(data.flags?.counts ?? {}) };
    const years = data.years | 0;
    return {
      gauges: { ...data.gauges },
      king: data.king | 0,
      flags,
      years,
      era: eraForYears(years),
      seen: new Set(data.seen ?? []),
      recent: [...(data.recent ?? [])],
      next: data.next ?? null,
      dead: null,
      miracle: null,
      current: data.currentId ? cards.find((c) => c.id === data.currentId) ?? null : null,
      combat: null,
      combatResult: null,
    };
  } catch {
    return null;
  }
}
