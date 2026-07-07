import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../src/config.js';
import { SKINS, skinUnlocked, spriteKey, loadSkin, saveSkin } from '../../src/game/skins.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } };
}

describe('skins — table', () => {
  it('5 skins, un par tier, ids et noms attendus', () => {
    expect(SKINS.map((s) => s.id)).toEqual(['proto', 'forge', 'venin', 'orage', 'nova']);
    expect(SKINS.map((s) => s.name)).toEqual(['PROTO', 'FORGE', 'VENIN', 'ORAGE', 'NOVA']);
    expect(SKINS.length).toBe(CONFIG.PATTERN_TIERS.length);
  });

  it('accents: cyan historique pour PROTO puis un accent par monde', () => {
    expect(SKINS.map((s) => s.accent))
      .toEqual(['#3ef0ff', '#ff9a3e', '#7dff3e', '#c93eff', '#fff7d6']);
  });
});

describe('skinUnlocked', () => {
  it('PROTO (0) est toujours débloqué, même à record 0 (nouveau joueur)', () => {
    expect(skinUnlocked(0, 0)).toBe(true);
  });

  it('frontières des seuils PATTERN_TIERS (3/5/7/10)', () => {
    for (const [i, seuil] of CONFIG.PATTERN_TIERS.entries()) {
      if (i === 0) continue; // PROTO : toujours débloqué (testé ci-dessus)
      expect(skinUnlocked(i, seuil)).toBe(true);
      expect(skinUnlocked(i, seuil - 1)).toBe(false);
    }
  });

  it('record 2: seul PROTO est débloqué', () => {
    expect([0, 1, 2, 3, 4].map((i) => skinUnlocked(i, 2)))
      .toEqual([true, false, false, false, false]);
  });

  it('record 10: tout est débloqué', () => {
    expect([0, 1, 2, 3, 4].every((i) => skinUnlocked(i, 10))).toBe(true);
  });
});

describe('spriteKey', () => {
  it('0 -> robot (sprites historiques), n -> robot-sN', () => {
    expect(spriteKey(0)).toBe('robot');
    expect(spriteKey(1)).toBe('robot-s1');
    expect(spriteKey(3)).toBe('robot-s3');
  });
});

describe('loadSkin / saveSkin (localStorage jetpackbot.skin)', () => {
  it('absent (ou storage absent) -> 0', () => {
    expect(loadSkin(fakeStorage(), 10)).toBe(0);
    expect(loadSkin(undefined, 10)).toBe(0);
  });

  it("'2' avec record 5 -> 2 (débloqué)", () => {
    const s = fakeStorage();
    s.setItem('jetpackbot.skin', '2');
    expect(loadSkin(s, 5)).toBe(2);
  });

  it("'4' avec record 5 -> 0 (verrouillé pour ce record)", () => {
    const s = fakeStorage();
    s.setItem('jetpackbot.skin', '4');
    expect(loadSkin(s, 5)).toBe(0);
  });

  it("gardes: 'zorg', '-1', '9', '2.5' -> 0", () => {
    for (const raw of ['zorg', '-1', '9', '2.5']) {
      const s = fakeStorage();
      s.setItem('jetpackbot.skin', raw);
      expect(loadSkin(s, 10)).toBe(0);
    }
  });

  it('aller-retour saveSkin/loadSkin', () => {
    const s = fakeStorage();
    saveSkin(s, 3);
    expect(s.getItem('jetpackbot.skin')).toBe('3');
    expect(loadSkin(s, 7)).toBe(3);
  });

  it('saveSkin tolère un storage absent', () => {
    expect(() => saveSkin(undefined, 1)).not.toThrow();
  });
});
