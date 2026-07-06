import { CONFIG } from '../config.js';

// Un skin par monde — le déblocage est indexé sur les seuils de tiers
// existants (CONFIG.PATTERN_TIERS, source unique : atteindre le monde =
// posséder son robot). L'accent colore flamme/particules du réacteur.
export const SKINS = [
  { id: 'proto', name: 'PROTO', accent: '#3ef0ff' }, // nuit urbaine (cyan historique)
  { id: 'forge', name: 'FORGE', accent: '#ff9a3e' }, // industriel (orange rouille)
  { id: 'venin', name: 'VENIN', accent: '#7dff3e' }, // toxique (vert acide)
  { id: 'orage', name: 'ORAGE', accent: '#c93eff' }, // tempête néon (violet)
  { id: 'nova', name: 'NOVA', accent: '#fff7d6' },   // orbite (blanc doré)
];

// Préférence d'appareil (convention volumes) — PAS dans le code de sauvegarde.
const KEY_SKIN = 'jetpackbot.skin';

export function skinUnlocked(i, record) {
  // PROTO toujours débloqué : un nouveau joueur a record 0 (< seuil 1).
  return i === 0 || record >= CONFIG.PATTERN_TIERS[i];
}

// Préfixe des 3 clés sprites du skin ('robot', 'robot-thrust-0', …).
export function spriteKey(skin) {
  return skin === 0 ? 'robot' : `robot-s${skin}`;
}

// Garde complète : valeur absente/invalide/hors bornes/verrouillée pour le
// record courant -> skin 0. (Cas réel : localStorage copié ou save
// restauré par code sur un autre appareil.)
export function loadSkin(storage, record) {
  const raw = storage?.getItem(KEY_SKIN);
  const n = Number(raw);
  if (raw === null || raw === undefined || !Number.isInteger(n)) return 0;
  if (n < 0 || n >= SKINS.length) return 0;
  if (!skinUnlocked(n, record)) return 0;
  return n;
}

export function saveSkin(storage, skin) {
  storage?.setItem(KEY_SKIN, String(skin));
}
