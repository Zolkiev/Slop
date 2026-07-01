import { CONFIG } from '../config.js';

function build(defs, geom) {
  const { x, w, h, y0, gap } = geom;
  const buttons = defs.map((d, i) => ({ ...d, x, y: y0 + i * gap, w, h }));
  const first = buttons.findIndex((b) => b.enabled);
  return { buttons, focus: first < 0 ? 0 : first };
}

export function createMenu() {
  return build([
    { id: 'newgame', label: 'NEW GAME', enabled: true },
    { id: 'continue', label: 'CONTINUE', enabled: false },
    { id: 'options', label: 'OPTIONS', enabled: false },
  ], CONFIG.MENU_BTN);
}

export function createPauseMenu() {
  return build([
    { id: 'resume', label: 'REPRENDRE', enabled: true },
    { id: 'restart', label: 'RECOMMENCER', enabled: true },
    { id: 'menu', label: 'MENU', enabled: true },
    { id: 'options', label: 'OPTIONS', enabled: false },
  ], CONFIG.PAUSE_BTN);
}

export function inRect(rect, px, py) {
  return px >= rect.x && px < rect.x + rect.w && py >= rect.y && py < rect.y + rect.h;
}

export function hitTest(menu, px, py) {
  for (const b of menu.buttons) {
    if (inRect(b, px, py)) return b.id;
  }
  return null;
}

export function moveFocus(menu, dir) {
  const n = menu.buttons.length;
  if (!menu.buttons.some((b) => b.enabled)) return;
  let i = menu.focus;
  for (let step = 0; step < n; step += 1) {
    i = (i + dir + n) % n;
    if (menu.buttons[i].enabled) { menu.focus = i; return; }
  }
}

export function focusedId(menu) {
  return menu.buttons[menu.focus]?.id ?? null;
}

export function activate(menu) {
  const b = menu.buttons[menu.focus];
  return b && b.enabled ? b.id : null;
}
