// Orchestration d'un règne : relie jauges, flags, deck, ères et duels.
// Boucle logique : draw() présente une carte, choose() applique un côté.
// Pendant un combat (reign.combat), les deux délèguent au module combat —
// la boucle de jeu ne voit pas la différence.
import { ERAS, RECENT_LIMIT } from '../config.js';
import { createGauges, applyEffects, applyDeclin, checkDeath } from './gauges.js';
import { createFlags, applyFlags } from './flags.js';
import { pickCard } from './deck.js';
import { empowerEffects, tryCancelDeath } from './relics.js';
import { startCombat, nextManoeuvre, resolveManoeuvre } from './combat.js';
import { COMBATS } from './combats/index.js';

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
    king: initial.king ?? 0, // index de lignée (dynasty.KINGS), pour l'affichage/CONTINUE
    flags: initial.flags ?? createFlags(),
    years: 0,
    era: eraForYears(0),
    seen: new Set(),
    recent: [], // dernières cartes jouées (anti-répétition)
    next: null, // id de carte forcée (chaîne de quête)
    dead: null, // {key, side, cause} une fois mort
    miracle: null, // message quand une relique vient d'annuler une mort
    current: null, // carte présentée en attente de choix
    combat: null, // duel en cours (voir combat.js), null hors combat
    combatResult: null, // issue du dernier duel ('win'|'lose'|'draw'|'death')
  };
}

/**
 * Présente la prochaine carte. Met à jour `seen` et `current`.
 * @returns la carte, ou null si le deck est vide (ne devrait pas arriver — voir invariants).
 */
export function draw(reign, cards, rng = Math.random) {
  if (reign.combat) return nextManoeuvre(reign); // hors deck : ni seen ni recent
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
 * Un côté `combat: '<id>'` ouvre un duel à la place : ses flags sont posés
 * (dont `epreuve.<id>`), ses effets ignorés — l'issue du combat décidera, et
 * l'année n'avancera qu'à la fin du duel. `rng` mélange la pioche de manœuvres.
 * Renvoie le règne muté (même objet, pour un usage simple côté boucle).
 */
export function choose(reign, side, rng = Math.random) {
  if (reign.combat) return resolveManoeuvre(reign, side);
  const card = reign.current;
  if (!card) throw new Error('choose() sans carte présentée');
  const choice = card[side];
  if (!choice) throw new Error(`côté invalide: ${side}`);

  // L'ère de la carte qu'on vient de jouer. `reign.era` sera réécrit plus bas par
  // eraForYears() : s'en servir pour le déclin ou le texte de mort donnerait un
  // texte d'Avalon à une mort causée par une carte de la Chute (bascule an 43→44).
  const eraPlayed = reign.era;

  if (choice.combat) {
    const def = COMBATS[choice.combat];
    if (!def) throw new Error(`combat inconnu: ${choice.combat}`);
    reign.miracle = null;
    applyFlags(reign.flags, choice.flags);
    startCombat(reign, def, rng);
    return reign;
  }

  reign.miracle = null;
  reign.gauges = applyEffects(reign.gauges, empowerEffects(choice.effects, reign.flags));
  applyFlags(reign.flags, choice.flags);
  // Le Déclin : en Avalon, Logres échappe au roi mourant. Après les effets, car
  // le joueur doit pouvoir choisir la jauge qu'il défend en dernier.
  if (eraPlayed === 'avalon') reign.gauges = applyDeclin(reign.gauges);
  reign.years += 1;
  reign.era = eraForYears(reign.years);
  reign.next = choice.next ?? null;
  reign.current = null;
  reign.dead = checkDeath(reign.gauges, eraPlayed);

  // Le Fourreau peut boire le coup mortel (une seule fois).
  if (reign.dead) {
    const saved = tryCancelDeath(reign.gauges, reign.dead, reign.flags);
    if (saved) {
      reign.gauges = saved.gauges;
      // une AUTRE jauge peut avoir lâché au même tour — le miracle n'y peut rien
      reign.dead = checkDeath(reign.gauges, eraPlayed);
      reign.miracle = reign.dead ? null : saved.message;
    }
  }
  return reign;
}
