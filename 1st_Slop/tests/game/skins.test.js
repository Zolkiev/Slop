import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../src/config.js';
import { SKINS, skinUnlocked, spriteKey, loadSkin, saveSkin } from '../../src/game/skins.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); } };
}

describe('skins — table', () => {
  it('12 skins, ids et noms attendus, un seuil chacun', () => {
    expect(SKINS.map((s) => s.id)).toEqual([
      'proto', 'forge', 'venin', 'orage', 'nova', 'vortex',
      'titan', 'abysse', 'zenith', 'ronin', 'givre', 'omega',
    ]);
    expect(SKINS.map((s) => s.name)).toEqual([
      'PROTO', 'FORGE', 'VENIN', 'ORAGE', 'NOVA', 'VORTEX',
      'TITAN', 'ABYSSE', 'ZENITH', 'RONIN', 'GIVRE', 'OMEGA',
    ]);
    expect(SKINS.length).toBe(CONFIG.SKIN_THRESHOLDS.length);
  });

  it('accents: un par skin, tous distincts', () => {
    expect(SKINS.map((s) => s.accent)).toEqual([
      '#3ef0ff', '#ff9a3e', '#7dff3e', '#c93eff', '#fff7d6', '#ff3e5e',
      '#ffd23e', '#3e6bff', '#3effb2', '#ff3ec8', '#bfe8ff', '#e0c8ff',
    ]);
    expect(new Set(SKINS.map((s) => s.accent)).size).toBe(12);
  });

  it('seuils: les 5 premiers = tiers de patterns, puis 15/18/22/26/32/40/50', () => {
    expect(CONFIG.SKIN_THRESHOLDS.slice(0, 5)).toEqual(CONFIG.PATTERN_TIERS);
    expect(CONFIG.SKIN_THRESHOLDS.slice(5)).toEqual([15, 18, 22, 26, 32, 40, 50]);
  });
});

describe('skinUnlocked', () => {
  it('PROTO (0) est toujours débloqué, même à record 0 (nouveau joueur)', () => {
    expect(skinUnlocked(0, 0)).toBe(true);
  });

  it('frontières de tous les seuils', () => {
    for (const [i, seuil] of CONFIG.SKIN_THRESHOLDS.entries()) {
      if (i === 0) continue; // PROTO : toujours débloqué (testé ci-dessus)
      expect(skinUnlocked(i, seuil)).toBe(true);
      expect(skinUnlocked(i, seuil - 1)).toBe(false);
    }
  });

  it('record 2: seul PROTO est débloqué', () => {
    expect(SKINS.map((_, i) => skinUnlocked(i, 2)))
      .toEqual([true, ...Array(11).fill(false)]);
  });

  it('record 15: tout jusqu à VORTEX, rien au-delà ; record 50: tout', () => {
    expect(SKINS.map((_, i) => skinUnlocked(i, 15)))
      .toEqual([...Array(6).fill(true), ...Array(6).fill(false)]);
    expect(SKINS.every((_, i) => skinUnlocked(i, 50))).toBe(true);
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

  it("gardes: 'zorg', '-1', '12', '2.5' -> 0", () => {
    for (const raw of ['zorg', '-1', '12', '2.5']) {
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
