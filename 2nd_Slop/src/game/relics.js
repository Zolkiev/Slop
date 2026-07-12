// Reliques : objets acquis par les cartes (via flags) qui changent les règles.
// Une relique est « portée » si son flag d'acquisition est posé et son flag de
// perte absent — les cartes peuvent donc la voler, la consumer ou la rendre.
import { hasFlag, setFlag } from './flags.js';

export const RELICS = [
  {
    key: 'excalibur',
    name: 'Excalibur',
    icon: '🗡️',
    flag: 'relique.excalibur',
    lostFlag: 'excalibur.rendue',
    hint: 'Les gains de Chevalerie sont majorés.',
  },
  {
    key: 'fourreau',
    name: 'Le Fourreau',
    icon: '🛡️',
    flag: 'relique.fourreau',
    lostFlag: 'fourreau.perdu',
    hint: 'Bois un coup mortel, une seule fois.',
  },
];

export function holds(flags, relic) {
  return hasFlag(flags, relic.flag) && !hasFlag(flags, relic.lostFlag);
}

export function heldRelics(flags) {
  return RELICS.filter((r) => holds(flags, r));
}

/** Excalibur galvanise la Table : tout gain de chevalerie est majoré de +2. */
export function empowerEffects(effects = {}, flags) {
  const [excalibur] = RELICS;
  if (!holds(flags, excalibur) || !(effects.chevalerie > 0)) return effects;
  return { ...effects, chevalerie: effects.chevalerie + 2 };
}

const RESCUE_EMPTY = 15;
const RESCUE_FULL = 85;

/**
 * Le Fourreau bois un coup mortel, une seule fois, puis se consume.
 * Ramène la jauge fautive en zone critique (15 ou 85) plutôt qu'à l'aise :
 * le miracle laisse le roi au bord du gouffre.
 * @returns {{gauges, message}|null} null si le Fourreau n'est pas porté.
 */
export function tryCancelDeath(gauges, death, flags) {
  const fourreau = RELICS[1];
  if (!death || !holds(flags, fourreau)) return null;
  setFlag(flags, fourreau.lostFlag); // consumé
  return {
    gauges: {
      ...gauges,
      [death.key]: death.side === 'empty' ? RESCUE_EMPTY : RESCUE_FULL,
    },
    message: "Le Fourreau a bu le coup fatal, puis s'est changé en cendres.",
  };
}
