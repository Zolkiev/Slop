import { CONFIG } from '../config.js';

// Le déblocage est indexé sur CONFIG.SKIN_THRESHOLDS (source unique) :
// les 5 premiers seuils coïncident avec les entrées des mondes, la suite
// est libre (objectifs au-delà de l'orbite). L'accent colore
// flamme/particules du réacteur.
export const SKINS = [
  { id: 'proto', name: 'PROTO', accent: '#3ef0ff' }, // nuit urbaine (cyan historique)
  { id: 'forge', name: 'FORGE', accent: '#ff9a3e' }, // industriel (orange rouille)
  { id: 'venin', name: 'VENIN', accent: '#7dff3e' }, // toxique (vert acide)
  { id: 'orage', name: 'ORAGE', accent: '#c93eff' }, // tempête néon (violet)
  { id: 'nova', name: 'NOVA', accent: '#fff7d6' },   // orbite (blanc doré)
  { id: 'vortex', name: 'VORTEX', accent: '#ff3e5e' }, // drone (rouge néon, seuil 15)
  { id: 'titan', name: 'TITAN', accent: '#ffd23e' },   // mécha trapu (jaune chantier, seuil 18)
  { id: 'abysse', name: 'ABYSSE', accent: '#3e6bff' }, // poisson-sous-marin (bleu abyssal, seuil 22)
  { id: 'zenith', name: 'ZENITH', accent: '#3effb2' }, // soucoupe (menthe, seuil 26)
  { id: 'ronin', name: 'RONIN', accent: '#ff3ec8' },   // samouraï (magenta, seuil 32)
  { id: 'givre', name: 'GIVRE', accent: '#bfe8ff' },   // cristal de glace (bleu glacier, seuil 40)
  { id: 'omega', name: 'OMEGA', accent: '#e0c8ff' },   // l'ultime (violet plasma, seuil 50)
];

// Préférence d'appareil (convention volumes) — PAS dans le code de sauvegarde.
const KEY_SKIN = 'jetpackbot.skin';

export function skinUnlocked(i, record) {
  // PROTO toujours débloqué : un nouveau joueur a record 0 (< seuil 1).
  return i === 0 || record >= CONFIG.SKIN_THRESHOLDS[i];
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
