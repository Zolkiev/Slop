// Registre des épreuves d'armes. Rempli par la passe de contenu combat
// (Task 3 du plan 2026-07-14-combat) : camlann, champ.clos, bataille.saxonne,
// tournoi. Les côtés de carte `combat: '<id>'` pointent ici.

export const COMBATS = {};

/** Flags posés par les issues de combat (pour l'univers des invariants). */
export function combatFlagsSetBy(combats = COMBATS) {
  const set = new Set();
  for (const def of Object.values(combats)) {
    for (const key of ['win', 'lose', 'draw']) {
      for (const f of def.outcome?.[key]?.flags ?? []) {
        set.add(Array.isArray(f) ? f[0] : f);
      }
    }
  }
  return set;
}
