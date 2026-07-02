import { describe, it, expect } from 'vitest';
import { encodeSave, decodeSave } from '../../src/game/save.js';

describe('save code', () => {
  it('round-trip encode/decode pour plusieurs niveaux', () => {
    for (const bestLevel of [1, 7, 42, 1000]) {
      const code = encodeSave({ bestLevel });
      expect(code).toMatch(/^JB1-[0-9A-HJKMNP-TV-Z]+$/);
      expect(decodeSave(code)).toEqual({ bestLevel });
    }
  });

  it('la normalisation tolère minuscules, espaces et tirets', () => {
    const code = encodeSave({ bestLevel: 7 });
    const sloppy = ` ${code.toLowerCase().replace('-', ' - ')} `;
    expect(decodeSave(sloppy)).toEqual({ bestLevel: 7 });
  });

  it('mappe les caractères ambigus O->0 et I/L->1', () => {
    const code = encodeSave({ bestLevel: 7 });
    const swapped = code.replace(/0/g, 'O').replace(/1/g, 'I');
    expect(decodeSave(swapped)).toEqual({ bestLevel: 7 });
  });

  it('rejette un caractère altéré (checksum)', () => {
    const code = encodeSave({ bestLevel: 42 });
    const body = code.slice(4); // après "JB1-"
    const altered = `JB1-${body[0] === 'A' ? 'B' : 'A'}${body.slice(1)}`;
    expect(decodeSave(altered)).toBe(null);
  });

  it('rejette préfixe inconnu, version inconnue, vide, alphabet invalide, trop court', () => {
    expect(decodeSave('XX1-2345')).toBe(null);
    expect(decodeSave('JB2-2345')).toBe(null);
    expect(decodeSave('')).toBe(null);
    expect(decodeSave('JB1-@!')).toBe(null);
    expect(decodeSave('JB1-AB')).toBe(null); // 2 chars = checksum seul, payload vide
    expect(decodeSave(undefined)).toBe(null);
  });

  it('rejette bestLevel 0 (payload "0" + checksum valide)', () => {
    // Construit un code pour 0 à la main via l'encodeur puis vérifie le rejet
    const forged = encodeSave({ bestLevel: 0 });
    expect(decodeSave(forged)).toBe(null);
  });
});
