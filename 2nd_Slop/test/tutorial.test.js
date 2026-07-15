import { describe, it, expect } from 'vitest';
import { createTutorial, advance, currentStep, TUTO_STEPS } from '../src/game/tutorial.js';

describe('tutoriel (coach-marks)', () => {
  it('avance étape par étape puis se termine', () => {
    const t = createTutorial();
    expect(currentStep(t)).toEqual(TUTO_STEPS[0]);      // 1re carte
    advance(t, 'preview');
    expect(currentStep(t)).toEqual(TUTO_STEPS[1]);      // aperçu → jauges
    advance(t, 'choose');
    expect(currentStep(t)).toEqual(TUTO_STEPS[2]);      // après 1er choix
    advance(t, 'choose');
    expect(t.done).toBe(true);
    expect(currentStep(t)).toBeNull();
  });

  it('avance aussi au clavier (choose direct, sans preview)', () => {
    const t = createTutorial();
    expect(currentStep(t)).toEqual(TUTO_STEPS[0]);      // 1re carte
    advance(t, 'choose');
    expect(currentStep(t)).toEqual(TUTO_STEPS[1]);      // clavier : choose direct fait avancer
    advance(t, 'choose');
    expect(currentStep(t)).toEqual(TUTO_STEPS[2]);
    advance(t, 'choose');
    expect(t.done).toBe(true);
    expect(currentStep(t)).toBeNull();
  });

  it('ignore les événements hors séquence', () => {
    const t = createTutorial();
    advance(t, 'choose'); // étape 0 : accepte choose (clavier), avance à l'étape 1
    expect(currentStep(t)).toEqual(TUTO_STEPS[1]);
    advance(t, 'preview'); // étape 1 : n'accepte que choose → ignoré
    expect(currentStep(t)).toEqual(TUTO_STEPS[1]);
    advance(t, 'inconnu'); // événement inconnu → ignoré
    expect(currentStep(t)).toEqual(TUTO_STEPS[1]);
  });

  it('a exactement 3 étapes avec ancrage', () => {
    expect(TUTO_STEPS).toHaveLength(3);
    for (const s of TUTO_STEPS) {
      expect(typeof s.text).toBe('string');
      expect(['card', 'gauges']).toContain(s.anchor);
    }
  });
});
