// Code de sauvegarde rétro : JB1-<payload><checksum>
// Payload = bestLevel en base32 Crockford ; checksum 2 caractères anti-typo.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PREFIX = 'JB1';

function toBase32(n) {
  let s = '';
  do {
    s = ALPHABET[n % 32] + s;
    n = Math.floor(n / 32);
  } while (n > 0);
  return s;
}

function checksum(payload) {
  let sum = 0;
  for (let i = 0; i < payload.length; i += 1) {
    sum += (i + 1) * ALPHABET.indexOf(payload[i]);
  }
  const v = sum % 1024;
  return ALPHABET[Math.floor(v / 32)] + ALPHABET[v % 32];
}

export function encodeSave({ bestLevel }) {
  const payload = toBase32(bestLevel);
  return `${PREFIX}-${payload}${checksum(payload)}`;
}

export function decodeSave(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
  if (!cleaned.startsWith(PREFIX)) return null;
  const body = cleaned.slice(PREFIX.length);
  if (body.length < 3) return null; // payload >= 1 char + 2 chars de checksum
  const payload = body.slice(0, -2);
  for (const ch of payload) {
    if (ALPHABET.indexOf(ch) < 0) return null;
  }
  if (body.slice(-2) !== checksum(payload)) return null;
  let bestLevel = 0;
  for (const ch of payload) bestLevel = bestLevel * 32 + ALPHABET.indexOf(ch);
  if (bestLevel < 1) return null;
  return { bestLevel };
}
