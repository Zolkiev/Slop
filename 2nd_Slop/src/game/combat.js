// L'Épreuve d'armes — moteur de duel (spec : docs/superpowers/specs/
// 2026-07-14-combat-design.md). Le combat est un « sous-deck » : quand
// `reign.combat` existe, draw() pioche une manœuvre ici et choose() la résout
// ici — la boucle de jeu, le swipe et le fuzz traversent le duel sans le
// savoir. Résolution déterministe : le rng ne sert qu'à mélanger la pioche.
import { applyEffects, checkDeath } from './gauges.js';
import { applyFlags, setFlag } from './flags.js';
import { empowerEffects, tryCancelDeath, holds, RELICS } from './relics.js';
import { isEligible } from './deck.js';
import { eraForYears } from './reign.js';

const [EXCALIBUR, FOURREAU] = RELICS;
const KING = { name: 'Le Roi', speaker: 'Le Roi', isKing: true };

/** Premier champion dont les flags autorisent la venue ; à défaut, le roi. */
export function resolveChampion(def, flags, gauges = {}) {
  for (const c of def.champions ?? []) {
    if (isEligible({ requires: c.requires }, { flags, gauges })) return c;
  }
  return KING;
}

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Entre en duel : champion résolu, blasons posés, pioche mélangée sans remise. */
export function startCombat(reign, def, rng = Math.random) {
  const eligible = def.manoeuvres.filter((m) =>
    isEligible(m, { gauges: reign.gauges, flags: reign.flags, era: reign.era }));
  reign.combat = {
    def,
    champion: resolveChampion(def, reign.flags, reign.gauges),
    selfHp: def.selfHp,
    foeHp: def.foe.hp,
    round: 1,
    deck: shuffle(eligible, rng).map((m) => m.id),
    discard: [], // manœuvres jouées, recyclées si la pioche s'assèche
  };
  reign.current = null;
  return reign.combat;
}

/** Sert la prochaine manœuvre (appelé par reign.draw pendant un combat). */
export function nextManoeuvre(reign) {
  const c = reign.combat;
  if (c.deck.length === 0) {
    c.deck = c.discard;
    c.discard = [];
  }
  const id = c.deck.shift();
  c.discard.push(id);
  reign.current = c.def.manoeuvres.find((m) => m.id === id) ?? null;
  return reign.current;
}

/**
 * Ce que produirait le côté donné sur la manche courante, SANS rien muter :
 * `{ foe, self }` en variations de blasons (négatif = perte). Sert à
 * resolveManoeuvre et à l'aperçu pendant le drag (blasons qui s'illuminent).
 * Ordre : frappe (bonus de jauge, Excalibur) → l'adversaire meurt avant de
 * riposter → riposte (guard, expose si bonus raté) → second souffle (heal).
 */
export function previewRound(reign, side) {
  const c = reign.combat;
  const man = reign.current;
  if (!c || !man?.[side]) return null;
  const ch = man[side];

  const s = ch.strike;
  const bonusHit = s?.gauge != null && reign.gauges[s.gauge] >= (s.min ?? 0);
  let dmg = (s?.dmg ?? 0) + (bonusHit ? s.bonus ?? 0 : 0);
  if (dmg > 0 && s?.gauge === 'chevalerie' && holds(reign.flags, EXCALIBUR)) dmg += 1;

  if (c.foeHp - dmg <= 0) return { foe: -dmg, self: 0 }; // mort avant la riposte

  let incoming = Math.max(0, c.def.foe.atk - (ch.guard ?? 0));
  if (ch.expose && s?.gauge != null && !bonusHit) incoming += ch.expose;
  const heal = ch.heal && reign.gauges[ch.heal.gauge] >= ch.heal.min ? ch.heal.hp : 0;
  return { foe: -dmg, self: heal - incoming };
}

/** Résout une manche (appelé par reign.choose pendant un combat). */
export function resolveManoeuvre(reign, side) {
  const c = reign.combat;
  if (!reign.current) throw new Error('resolveManoeuvre() sans manœuvre présentée');
  const delta = previewRound(reign, side);
  if (!delta) throw new Error(`côté invalide: ${side}`);
  reign.miracle = null;
  reign.current = null;

  c.foeHp += delta.foe;
  if (c.foeHp <= 0) return endCombat(reign, 'win');

  c.selfHp = Math.min(c.def.selfHp, c.selfHp + delta.self);
  if (c.selfHp <= 0) return endCombat(reign, 'lose');

  c.round += 1;
  if (c.round > c.def.maxRounds) return endCombat(reign, 'draw');
  return reign;
}

/**
 * Fin de duel. Une défaite `fatal` avec le roi tue (cause dédiée) — sauf si le
 * Fourreau boit le coup (consommé, la défaite devient un simple outcome).
 * Sinon : outcome appliqué (mêmes règles qu'un choix), l'année avance d'un an.
 */
function endCombat(reign, result) {
  const { def, champion } = reign.combat;
  reign.combat = null;

  if (result === 'lose' && def.fatal && champion.isKing) {
    if (holds(reign.flags, FOURREAU)) {
      setFlag(reign.flags, FOURREAU.lostFlag); // consumé — même promesse que relics.js
    } else {
      reign.years += 1;
      reign.era = eraForYears(reign.years);
      reign.dead = { key: 'combat', side: 'duel', cause: def.deathCause };
      return reign;
    }
  }

  const out = def.outcome?.[result] ?? {};
  reign.gauges = applyEffects(reign.gauges, empowerEffects(out.effects ?? {}, reign.flags));
  applyFlags(reign.flags, out.flags ?? []);
  reign.years += 1;
  reign.era = eraForYears(reign.years);
  reign.miracle = out.text ?? null;
  reign.dead = checkDeath(reign.gauges);

  // L'outcome peut faire lâcher une jauge : le Fourreau garde sa promesse.
  if (reign.dead) {
    const saved = tryCancelDeath(reign.gauges, reign.dead, reign.flags);
    if (saved) {
      reign.gauges = saved.gauges;
      reign.dead = checkDeath(reign.gauges);
      reign.miracle = reign.dead ? null : saved.message;
    }
  }
  return reign;
}
