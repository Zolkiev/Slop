// Codes de sauvegarde rétro « LG1-XXX » : record + roi sélectionné encodés en
// base32 Crockford avec caractère de contrôle. Restaurables par lien #save=.
import { KINGS } from './dynasty.js';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const BEST_MAX = 1023; // 10 bits — largement au-delà d'un règne humainement atteignable
const KING_BITS = 2; // 4 rois

function checksum(body) {
  let s = 0;
  for (const ch of body) s = (s * 7 + ALPHABET.indexOf(ch)) % 32;
  return s;
}

/** Encode la progression en code `LG1-XXX`. */
export function encodeSave({ best, king }) {
  let value =
    Math.min(Math.max(0, best | 0), BEST_MAX) * (1 << KING_BITS) +
    Math.min(Math.max(0, king | 0), KINGS.length - 1);
  let body = '';
  do {
    body = ALPHABET[value % 32] + body;
    value = Math.floor(value / 32);
  } while (value > 0);
  return `LG1-${body}${ALPHABET[checksum(body)]}`;
}

/**
 * Décode un code `LG1-XXX` (tolère minuscules, espaces, et les confusions
 * Crockford O→0 / I,L→1). Renvoie `{best, king}` ou null si invalide.
 */
export function decodeSave(input) {
  const cleaned = String(input ?? '').toUpperCase().replace(/\s+/g, '');
  const m = /^LG1-(.+)$/.exec(cleaned);
  if (!m) return null;

  // normalisation Crockford sur le corps seulement (le préfixe contient un L !)
  const digits = m[1].replace(/O/g, '0').replace(/[IL]/g, '1');
  if (!/^[0-9A-HJKMNP-TV-Z]{2,}$/.test(digits)) return null;

  const body = digits.slice(0, -1);
  const check = digits.slice(-1);
  if (ALPHABET[checksum(body)] !== check) return null;

  let value = 0;
  for (const ch of body) value = value * 32 + ALPHABET.indexOf(ch);
  const king = value % (1 << KING_BITS);
  const best = Math.floor(value / (1 << KING_BITS));
  if (best > BEST_MAX || king >= KINGS.length) return null;
  return { best, king };
}

/** Lien direct de restauration pour l'URL courante. */
export function saveLink(progress, base = 'https://zolkiev.github.io/Slop/logres/') {
  return `${base}#save=${encodeSave(progress)}`;
}

/** Extrait un code d'un hash d'URL (`#save=LG1-XXX`), ou null. */
export function codeFromHash(hash) {
  const m = /#save=([^&]+)/.exec(hash ?? '');
  return m ? decodeURIComponent(m[1]) : null;
}
