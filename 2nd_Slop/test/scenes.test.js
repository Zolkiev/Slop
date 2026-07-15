import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { SCENES } from '../src/game/scenes.js';
import { CARDS } from '../src/game/cards/index.js';

describe('inventaire des scènes', () => {
  it('chaque clé SCENES a un fichier', () => {
    for (const k of SCENES) expect(existsSync(`assets/scenes/${k}.png`), k).toBe(true);
  });
  it('chaque art: de carte est une clé SCENES connue', () => {
    for (const c of CARDS) if (c.art) expect(SCENES, c.id).toContain(c.art);
  });
  it('les 12 nouvelles scènes sont bien posées sur une carte', () => {
    const used = new Set(CARDS.filter((c) => c.art).map((c) => c.art));
    for (const k of ['sacre-arthur', 'nuit-morgane', 'excalibur-remise', 'table-ronde',
      'grand-tournoi', 'galaad-siege', 'roi-pecheur', 'graal-atteint', 'mordred-revolte',
      'table-brisee', 'excalibur-rendue', 'tombeau-arthur']) {
      expect(used, k).toContain(k);
    }
  });
});
