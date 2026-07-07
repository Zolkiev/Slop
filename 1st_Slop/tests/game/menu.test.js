import { describe, it, expect } from 'vitest';
import { createMenu, createSavecodeMenu, createPauseMenu, createGameoverMenu, createSkinsMenu, createConfirmMenu, hitTest, inRect, moveFocus, focusedId, activate } from '../../src/game/menu.js';
import { CONFIG } from '../../src/config.js';

describe('menu', () => {
  it('createMenu: 5 boutons ordonnés, continue disabled par défaut, le reste enabled', () => {
    const m = createMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['newgame', 'continue', 'robots', 'options', 'code']);
    expect(m.buttons.map((b) => b.label)).toEqual(['NEW GAME', 'CONTINUE', 'ROBOTS', 'OPTIONS', 'CODE']);
    expect(m.buttons.map((b) => b.enabled)).toEqual([true, false, true, true, true]);
    expect(focusedId(m)).toBe('newgame');
  });

  it('createMenu(true): continue enabled', () => {
    const m = createMenu(true);
    expect(m.buttons[1].enabled).toBe(true);
  });

  it('hitTest renvoie l\'id quand le point est dans le bouton', () => {
    const m = createMenu();
    const b = m.buttons[0];
    expect(hitTest(m, b.x + b.w / 2, b.y + b.h / 2)).toBe('newgame');
  });

  it('hitTest renvoie null hors de tous les boutons', () => {
    const m = createMenu();
    expect(hitTest(m, 0, 0)).toBe(null);
  });

  it('hitTest: coin haut-gauche inclusif, coin bas-droit exclusif', () => {
    const m = createMenu();
    const b = m.buttons[0];
    expect(hitTest(m, b.x, b.y)).toBe('newgame');
    expect(hitTest(m, b.x + b.w, b.y + b.h)).toBe(null);
  });

  it('hitTest ignore les boutons disabled (renvoie null)', () => {
    const m = createMenu();
    const b = m.buttons[1]; // continue, disabled
    expect(b.enabled).toBe(false);
    expect(hitTest(m, b.x + b.w / 2, b.y + b.h / 2)).toBe(null);
  });

  it('moveFocus saute continue (disabled) et va sur robots', () => {
    const m = createMenu();
    moveFocus(m, 1);
    expect(focusedId(m)).toBe('robots');
    moveFocus(m, -1);
    expect(focusedId(m)).toBe('newgame');
  });

  it('moveFocus parcourt tout quand tout est enabled', () => {
    const m = createMenu(true);
    expect(focusedId(m)).toBe('newgame');
    moveFocus(m, 1); expect(focusedId(m)).toBe('continue');
    moveFocus(m, 1); expect(focusedId(m)).toBe('robots');
    moveFocus(m, 1); expect(focusedId(m)).toBe('options');
    moveFocus(m, 1); expect(focusedId(m)).toBe('code');
    moveFocus(m, 1); expect(focusedId(m)).toBe('newgame');
    moveFocus(m, -1); expect(focusedId(m)).toBe('code');
  });

  it('activate renvoie l\'id focus si enabled, sinon null', () => {
    const m = createMenu();
    expect(activate(m)).toBe('newgame');
    m.buttons[0].enabled = false;
    expect(activate(m)).toBe(null);
  });

  it('createPauseMenu: 4 boutons ordonnés, tous enabled, focus resume', () => {
    const m = createPauseMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['resume', 'restart', 'menu', 'options']);
    expect(m.buttons.every((b) => b.enabled)).toBe(true);
    expect(focusedId(m)).toBe('resume');
  });

  it('moveFocus sur le pause menu parcourt les 4 boutons', () => {
    const m = createPauseMenu();
    m.focus = 2; // menu
    moveFocus(m, 1);
    expect(focusedId(m)).toBe('options');
    moveFocus(m, 1);
    expect(focusedId(m)).toBe('resume');
  });

  it('inRect: dedans vrai, dehors faux (bord droit/bas exclusif)', () => {
    const r = { x: 10, y: 20, w: 30, h: 40 };
    expect(inRect(r, 10, 20)).toBe(true);
    expect(inRect(r, 39, 59)).toBe(true);
    expect(inRect(r, 40, 20)).toBe(false);
    expect(inRect(r, 0, 0)).toBe(false);
  });

  it('createGameoverMenu: restart + menu, tous enabled, focus sur restart', () => {
    const m = createGameoverMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['restart', 'menu']);
    expect(m.buttons.map((b) => b.label)).toEqual(['RECOMMENCER', 'MENU']);
    expect(m.buttons.every((b) => b.enabled)).toBe(true);
    expect(focusedId(m)).toBe('restart');
  });

  it('createSavecodeMenu(true): copier/lien/saisir/retour tous enabled, focus copier', () => {
    const m = createSavecodeMenu(true);
    expect(m.buttons.map((b) => b.id)).toEqual(['copy', 'link', 'enter', 'back']);
    expect(m.buttons.map((b) => b.label)).toEqual(['COPIER', 'LIEN', 'SAISIR', 'RETOUR']);
    expect(m.buttons.every((b) => b.enabled)).toBe(true);
    expect(focusedId(m)).toBe('copy');
  });

  it('createSavecodeMenu(false): copier/lien disabled, focus saisir', () => {
    const m = createSavecodeMenu(false);
    expect(m.buttons.map((b) => b.enabled)).toEqual([false, false, true, true]);
    expect(focusedId(m)).toBe('enter');
  });

  it('layout MENU_BTN resserré: y0 320, gap 62, le 5e bouton tient dans le canvas', () => {
    const m = createMenu(true);
    expect(m.buttons[0].y).toBe(320);
    expect(m.buttons[1].y - m.buttons[0].y).toBe(62);
    const last = m.buttons[4];
    expect(last.y).toBe(320 + 4 * 62); // 568
    expect(last.y + last.h).toBeLessThanOrEqual(640);
  });

  it('createSkinsMenu débloqué non courant: CHOISIR enabled + RETOUR, focus choose', () => {
    const m = createSkinsMenu(true, 0, 1);
    expect(m.buttons.map((b) => b.id)).toEqual(['choose', 'back']);
    expect(m.buttons.map((b) => b.label)).toEqual(['CHOISIR', 'RETOUR']);
    expect(m.buttons.map((b) => b.enabled)).toEqual([true, true]);
    expect(focusedId(m)).toBe('choose');
  });

  it('createSkinsMenu slot courant: label ACTUEL disabled, focus back', () => {
    const m = createSkinsMenu(true, 2, 2);
    expect(m.buttons[0].label).toBe('ACTUEL');
    expect(m.buttons[0].enabled).toBe(false);
    expect(focusedId(m)).toBe('back');
  });

  it('createSkinsMenu verrouillé: CHOISIR disabled, focus back', () => {
    const m = createSkinsMenu(false, 0, 3);
    expect(m.buttons[0].label).toBe('CHOISIR');
    expect(m.buttons[0].enabled).toBe(false);
    expect(focusedId(m)).toBe('back');
  });

  it('createSkinsMenu utilise la géométrie SKINS_BTN', () => {
    const m = createSkinsMenu(true, 0, 1);
    expect(m.buttons[0].x).toBe(CONFIG.SKINS_BTN.x);
    expect(m.buttons[0].y).toBe(CONFIG.SKINS_BTN.y0);
    expect(m.buttons[1].y).toBe(CONFIG.SKINS_BTN.y0 + CONFIG.SKINS_BTN.gap);
  });

  it('createConfirmMenu : OUI/NON, focus initial sur NON', () => {
    const m = createConfirmMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['yes', 'no']);
    expect(m.buttons.every((b) => b.enabled)).toBe(true);
    expect(m.focus).toBe(1);
  });
});
