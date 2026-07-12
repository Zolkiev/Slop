// Flags : mémoire des chaînes de quêtes. Un flag est posé par un choix et
// conditionne l'apparition future de cartes. Support de compteurs simples.

/** Crée un magasin de flags vide. */
export function createFlags() {
  return { set: new Set(), counts: {} };
}

/** Pose un flag (ou l'incrémente si `by` est fourni, en le traitant en compteur). */
export function setFlag(flags, name, by = null) {
  if (by === null) {
    flags.set.add(name);
  } else {
    flags.counts[name] = (flags.counts[name] ?? 0) + by;
  }
  return flags;
}

/** Vrai si le flag est posé (ou si son compteur est > 0). */
export function hasFlag(flags, name) {
  return flags.set.has(name) || (flags.counts[name] ?? 0) > 0;
}

/** Valeur d'un compteur (0 si absent). */
export function flagCount(flags, name) {
  return flags.counts[name] ?? 0;
}

/**
 * Applique la liste de flags posés par un choix.
 * Chaque entrée est soit `"nom"` (pose), soit `["nom", n]` (compteur += n).
 */
export function applyFlags(flags, list = []) {
  for (const entry of list) {
    if (Array.isArray(entry)) setFlag(flags, entry[0], entry[1]);
    else setFlag(flags, entry);
  }
  return flags;
}
