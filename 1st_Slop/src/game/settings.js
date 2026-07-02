// Préférences d'appareil (volumes) — localStorage uniquement, PAS dans le code de sauvegarde.
const KEY_SFX = 'jetpackbot.volSfx';
const KEY_MUSIC = 'jetpackbot.volMusic';
const DEFAULT = 7;

function readStep(storage, key) {
  const raw = storage?.getItem(key);
  const n = Number(raw);
  if (raw === null || raw === undefined || Number.isNaN(n)) return DEFAULT;
  return Math.max(0, Math.min(10, Math.round(n)));
}

export function loadSettings(storage) {
  return { sfx: readStep(storage, KEY_SFX), music: readStep(storage, KEY_MUSIC) };
}

export function saveSettings(settings, storage) {
  storage?.setItem(KEY_SFX, String(settings.sfx));
  storage?.setItem(KEY_MUSIC, String(settings.music));
}

export function volumeToGain(step) {
  return step / 10;
}
