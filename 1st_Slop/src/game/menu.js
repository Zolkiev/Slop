import { CONFIG } from '../config.js';

function build(defs, geom) {
  const { x, w, h, y0, gap } = geom;
  const buttons = defs.map((d, i) => ({ ...d, x, y: y0 + i * gap, w, h }));
  const first = buttons.findIndex((b) => b.enabled);
  return { buttons, focus: first < 0 ? 0 : first };
}

export function createMenu(hasSave = false) {
  return build([
    { id: 'newgame', label: 'NEW GAME', enabled: true },
    { id: 'continue', label: 'CONTINUE', enabled: hasSave },
    { id: 'robots', label: 'ROBOTS', enabled: true },
    { id: 'options', label: 'OPTIONS', enabled: true },
    { id: 'code', label: 'CODE', enabled: true },
  ], CONFIG.MENU_BTN);
}

export function createSavecodeMenu(hasSave) {
  return build([
    { id: 'copy', label: 'COPIER', enabled: hasSave },
    { id: 'link', label: 'LIEN', enabled: hasSave },
    { id: 'enter', label: 'SAISIR', enabled: true },
    { id: 'back', label: 'RETOUR', enabled: true },
  ], CONFIG.SAVECODE_BTN);
}

export function createPauseMenu() {
  return build([
    { id: 'resume', label: 'REPRENDRE', enabled: true },
    { id: 'restart', label: 'RECOMMENCER', enabled: true },
    { id: 'menu', label: 'MENU', enabled: true },
    { id: 'options', label: 'OPTIONS', enabled: true },
  ], CONFIG.PAUSE_BTN);
}

export function createGameoverMenu() {
  return build([
    { id: 'restart', label: 'RECOMMENCER', enabled: true },
    { id: 'menu', label: 'MENU', enabled: true },
  ], CONFIG.GAMEOVER_BTN);
}

// Boutons du hangar : le libellé et l'état de `choose` dépendent du slot
// affiché (drawButton lit `label`) — le menu est recréé à chaque changement.
export function createSkinsMenu(unlocked, current, slot) {
  const actuel = slot === current;
  return build([
    { id: 'choose', label: actuel ? 'ACTUEL' : 'CHOISIR', enabled: unlocked && !actuel },
    { id: 'back', label: 'RETOUR', enabled: true },
  ], CONFIG.SKINS_BTN);
}

// Confirmation NEW GAME — focus initial sur NON : l'action destructrice
// (repartir au niveau 1) ne doit jamais être le défaut.
export function createConfirmMenu() {
  const m = build([
    { id: 'yes', label: 'OUI', enabled: true },
    { id: 'no', label: 'NON', enabled: true },
  ], CONFIG.CONFIRM_BTN);
  m.focus = 1;
  return m;
}

export function inRect(rect, px, py) {
  return px >= rect.x && px < rect.x + rect.w && py >= rect.y && py < rect.y + rect.h;
}

export function hitTest(menu, px, py) {
  for (const b of menu.buttons) {
    if (b.enabled && inRect(b, px, py)) return b.id;
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
