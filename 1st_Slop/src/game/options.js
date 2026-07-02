import { CONFIG } from '../config.js';

// focus: 0 = ligne SFX, 1 = ligne MUSIQUE, 2 = bouton RETOUR
export function createOptions(settings) {
  return {
    rows: [
      { id: 'sfx', label: 'SFX', value: settings.sfx },
      { id: 'music', label: 'MUSIQUE', value: settings.music },
    ],
    focus: 0,
  };
}

export function moveOptionsFocus(opt, dir) {
  opt.focus = (opt.focus + dir + 3) % 3;
}

export function adjust(opt, dir) {
  if (opt.focus > 1) return null;
  const row = opt.rows[opt.focus];
  const next = Math.max(0, Math.min(10, row.value + dir));
  if (next === row.value) return null;
  row.value = next;
  return row.id;
}

export function barHitTest(opt, x, y) {
  const R = CONFIG.OPTIONS_ROWS;
  for (let r = 0; r < opt.rows.length; r += 1) {
    const top = R.y0 + r * R.gap;
    if (y < top || y >= top + R.segH) continue;
    const dx = x - R.x;
    if (dx < 0) return null;
    const k = Math.floor(dx / (R.segW + R.segGap));
    if (k >= R.count) return null;
    if (dx - k * (R.segW + R.segGap) >= R.segW) return null; // dans l'espace inter-segment
    return { id: opt.rows[r].id, value: k };
  }
  return null;
}
