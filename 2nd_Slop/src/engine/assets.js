// Préchargement des images (portraits + décors). Chargement paresseux et
// tolérant : le jeu reste jouable si une image manque (fallback dessiné).
import { PORTRAITS } from '../game/portraits.js';
import { ERAS, GAUGES } from '../config.js';

const images = new Map();

function load(key, url) {
  const img = new Image();
  img.src = url;
  img.decoding = 'async';
  images.set(key, img);
}

/** Lance le chargement de tous les assets connus (non bloquant). */
export function preload() {
  for (const key of new Set(Object.values(PORTRAITS))) {
    load(`portrait:${key}`, `assets/portraits/${key}.png`);
  }
  for (const era of ERAS) {
    load(`bg:${era.id}`, `assets/bg/${era.id}.png`);
  }
  load('ui:card-plate', 'assets/ui/card-plate.png');
  for (const g of GAUGES) {
    load(`icon:${g.key}`, `assets/ui/icon-${g.key}.png`);
  }
}

/** Renvoie l'image si elle est chargée et exploitable, sinon null. */
export function get(key) {
  const img = images.get(key);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

export const portraitFor = (speaker) => get(`portrait:${PORTRAITS[speaker] ?? 'chevalier'}`);
export const backgroundFor = (eraId) => get(`bg:${eraId}`);
export const cardPlate = () => get('ui:card-plate');
export const gaugeIcon = (key) => get(`icon:${key}`);
