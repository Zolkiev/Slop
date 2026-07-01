import { describe, it, expect } from 'vitest';
import { createMenu, createPauseMenu, hitTest, inRect, moveFocus, focusedId, activate } from '../../src/game/menu.js';

describe('menu', () => {
  it('createMenu: 3 boutons ordonnés, newgame enabled, autres disabled, focus sur newgame', () => {
    const m = createMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['newgame', 'continue', 'options']);
    expect(m.buttons[0].enabled).toBe(true);
    expect(m.buttons[1].enabled).toBe(false);
    expect(m.buttons[2].enabled).toBe(false);
    expect(focusedId(m)).toBe('newgame');
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

  it('moveFocus saute les boutons disabled et reste sur le seul enabled', () => {
    const m = createMenu();
    moveFocus(m, 1);
    expect(focusedId(m)).toBe('newgame');
    moveFocus(m, -1);
    expect(focusedId(m)).toBe('newgame');
  });

  it('moveFocus parcourt tout quand tout est enabled', () => {
    const m = createMenu();
    m.buttons.forEach((b) => { b.enabled = true; });
    expect(focusedId(m)).toBe('newgame');
    moveFocus(m, 1); expect(focusedId(m)).toBe('continue');
    moveFocus(m, 1); expect(focusedId(m)).toBe('options');
    moveFocus(m, 1); expect(focusedId(m)).toBe('newgame');
    moveFocus(m, -1); expect(focusedId(m)).toBe('options');
  });

  it('activate renvoie l\'id focus si enabled, sinon null', () => {
    const m = createMenu();
    expect(activate(m)).toBe('newgame');
    m.buttons[0].enabled = false;
    expect(activate(m)).toBe(null);
  });

  it('createPauseMenu: 4 boutons ordonnés, resume/restart/menu enabled, options disabled, focus resume', () => {
    const m = createPauseMenu();
    expect(m.buttons.map((b) => b.id)).toEqual(['resume', 'restart', 'menu', 'options']);
    expect(m.buttons[0].enabled).toBe(true);
    expect(m.buttons[1].enabled).toBe(true);
    expect(m.buttons[2].enabled).toBe(true);
    expect(m.buttons[3].enabled).toBe(false);
    expect(focusedId(m)).toBe('resume');
  });

  it('moveFocus sur le pause menu saute options (disabled)', () => {
    const m = createPauseMenu();
    m.focus = 2; // menu
    moveFocus(m, 1); // options disabled -> wrap to resume
    expect(focusedId(m)).toBe('resume');
  });

  it('inRect: dedans vrai, dehors faux (bord droit/bas exclusif)', () => {
    const r = { x: 10, y: 20, w: 30, h: 40 };
    expect(inRect(r, 10, 20)).toBe(true);
    expect(inRect(r, 39, 59)).toBe(true);
    expect(inRect(r, 40, 20)).toBe(false);
    expect(inRect(r, 0, 0)).toBe(false);
  });
});
