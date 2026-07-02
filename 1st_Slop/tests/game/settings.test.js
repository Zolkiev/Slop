import { describe, it, expect } from 'vitest';
import { loadSettings, saveSettings, volumeToGain } from '../../src/game/settings.js';

function fakeStorage(init = {}) {
  const d = { ...init };
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = String(v); }, data: d };
}

describe('settings', () => {
  it('défauts à 7/7 sans storage ou storage vide', () => {
    expect(loadSettings(undefined)).toEqual({ sfx: 7, music: 7 });
    expect(loadSettings(fakeStorage())).toEqual({ sfx: 7, music: 7 });
  });

  it('round-trip save/load', () => {
    const storage = fakeStorage();
    saveSettings({ sfx: 3, music: 10 }, storage);
    expect(loadSettings(storage)).toEqual({ sfx: 3, music: 10 });
    expect(storage.getItem('jetpackbot.volSfx')).toBe('3');
    expect(storage.getItem('jetpackbot.volMusic')).toBe('10');
  });

  it('clamp 0..10 et arrondi entier au chargement', () => {
    const storage = fakeStorage({ 'jetpackbot.volSfx': '15', 'jetpackbot.volMusic': '4.6' });
    expect(loadSettings(storage)).toEqual({ sfx: 10, music: 5 });
  });

  it('valeurs corrompues -> défaut', () => {
    const storage = fakeStorage({ 'jetpackbot.volSfx': 'abc', 'jetpackbot.volMusic': '-2' });
    expect(loadSettings(storage)).toEqual({ sfx: 7, music: 0 });
  });

  it('saveSettings tolère un storage absent', () => {
    expect(() => saveSettings({ sfx: 1, music: 1 }, undefined)).not.toThrow();
  });

  it('volumeToGain: 0 -> 0, 7 -> 0.7, 10 -> 1', () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(7)).toBeCloseTo(0.7);
    expect(volumeToGain(10)).toBe(1);
  });
});
