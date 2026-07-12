// Logique pure du geste de swipe : drag horizontal -> aperçu -> validation.
// Aucune notion de DOM ici ; l'entrée fournit des deltas en pixels logiques.

/** Déplacement (px logiques) requis pour valider un choix au relâcher. */
export const SWIPE_COMMIT = 70;
/** Zone morte sous laquelle aucun côté n'est prévisualisé. */
export const SWIPE_PREVIEW = 24;

export function createSwipe() {
  return { active: false, dx: 0 };
}

export function dragStart(swipe) {
  swipe.active = true;
  swipe.dx = 0;
}

export function dragMove(swipe, dx) {
  if (swipe.active) swipe.dx = dx;
}

/**
 * Côté prévisualisé pendant le drag ('left' | 'right' | null).
 * Sert à afficher le label du choix et l'aperçu des jauges impactées.
 */
export function previewSide(swipe) {
  if (!swipe.active || Math.abs(swipe.dx) < SWIPE_PREVIEW) return null;
  return swipe.dx < 0 ? 'left' : 'right';
}

/**
 * Termine le drag. Renvoie le côté validé ('left' | 'right') si le déplacement
 * dépasse SWIPE_COMMIT, sinon null (la carte revient au centre).
 */
export function dragEnd(swipe) {
  const committed =
    swipe.active && Math.abs(swipe.dx) >= SWIPE_COMMIT
      ? swipe.dx < 0
        ? 'left'
        : 'right'
      : null;
  swipe.active = false;
  swipe.dx = 0;
  return committed;
}
