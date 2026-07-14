import { describe, it, expect } from 'vitest';
import { encodeSave, decodeSave, codeFromHash } from '../src/game/save.js';
import { KINGS, isUnlocked, unlockedKings } from '../src/game/dynasty.js';
import {
  loadProgress,
  saveProgress,
  DEFAULT_MUSIC_VOL,
  DEFAULT_SFX_VOL,
} from '../src/game/score.js';

describe('save — codes LG1', () => {
  it('aller-retour fidèle pour toutes les combinaisons plausibles', () => {
    for (const best of [0, 1, 7, 15, 44, 45, 120, 1023]) {
      for (let king = 0; king < KINGS.length; king++) {
        expect(decodeSave(encodeSave({ best, king }))).toEqual({ best, king });
      }
    }
  });

  it('rejette les codes altérés ou étrangers', () => {
    const code = encodeSave({ best: 30, king: 1 });
    const corrupted = code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A');
    expect(decodeSave(corrupted)).toBeNull();
    expect(decodeSave('LG1-')).toBeNull();
    expect(decodeSave('JB1-ABC')).toBeNull(); // code de Jetpack Bot
    expect(decodeSave('n’importe quoi')).toBeNull();
  });

  it('tolère minuscules, espaces et confusions Crockford (O→0, I/L→1)', () => {
    const code = encodeSave({ best: 100, king: 2 });
    const sloppy = ` ${code.toLowerCase().replace(/0/g, 'o')} `;
    expect(decodeSave(sloppy)).toEqual({ best: 100, king: 2 });
  });

  it('codeFromHash extrait le code du lien', () => {
    expect(codeFromHash('#save=LG1-2QG')).toBe('LG1-2QG');
    expect(codeFromHash('#autre=x')).toBeNull();
    expect(codeFromHash('')).toBeNull();
  });
});

describe('dynasty — déblocages', () => {
  it('Arthur est libre, les autres se méritent', () => {
    expect(unlockedKings(0).map((k) => k.key)).toEqual(['arthur']);
    expect(unlockedKings(15).map((k) => k.key)).toEqual(['arthur', 'uther']);
    expect(unlockedKings(45)).toHaveLength(KINGS.length);
  });

  it('isUnlocked respecte le seuil exact', () => {
    const uther = KINGS[1];
    expect(isUnlocked(uther, 14)).toBe(false);
    expect(isUnlocked(uther, 15)).toBe(true);
  });
});

describe('score — persistance', () => {
  const fakeStorage = () => {
    const m = new Map();
    return {
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => m.set(k, v),
    };
  };

  const DEFAULTS = { best: 0, king: 0, musicVol: DEFAULT_MUSIC_VOL, sfxVol: DEFAULT_SFX_VOL };

  it('aller-retour et valeurs par défaut', () => {
    const storage = fakeStorage();
    expect(loadProgress(storage)).toEqual(DEFAULTS);
    saveProgress({ best: 22, king: 1, musicVol: 0.8, sfxVol: 0.1 }, storage);
    expect(loadProgress(storage)).toEqual({ best: 22, king: 1, musicVol: 0.8, sfxVol: 0.1 });
  });

  it('résiste au stockage corrompu ou absent', () => {
    const storage = fakeStorage();
    storage.setItem('logres.progress', '{pas du json');
    expect(loadProgress(storage)).toEqual(DEFAULTS);
    expect(loadProgress(undefined)).toEqual(DEFAULTS);
    expect(() => saveProgress({ best: 1, king: 0 }, undefined)).not.toThrow();
  });

  it('volumes : anciens saves sans volumes -> défauts, valeurs hors bornes ramenées', () => {
    const storage = fakeStorage();
    saveProgress({ best: 5, king: 0 }, storage); // save d'avant les réglages
    expect(loadProgress(storage)).toEqual({ best: 5, king: 0, ...{ musicVol: DEFAULT_MUSIC_VOL, sfxVol: DEFAULT_SFX_VOL } });
    saveProgress({ best: 5, king: 0, musicVol: 7, sfxVol: -2 }, storage);
    const p = loadProgress(storage);
    expect(p.musicVol).toBe(1);
    expect(p.sfxVol).toBe(0);
  });
});
