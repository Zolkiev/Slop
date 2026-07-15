// Coach-marks du premier règne : 3 bulles contextuelles, voix de Merlin.
// N'enseigne que la boucle de base (geste, jauges, mort). Machine pure.

export const TUTO_STEPS = [
  { text: 'Glisse la carte, jeune roi — à gauche, ou à droite.', anchor: 'card' },
  { text: 'Ton choix fait vivre ces quatre pouvoirs.', anchor: 'gauges' },
  { text: "Qu'une seule s'éteigne ou s'embrase, et ton règne s'achève.", anchor: 'card' },
];

// Événement qui fait avancer chaque étape.
const TRIGGER = ['preview', 'choose', 'choose'];

export function createTutorial() {
  return { step: 0, done: false };
}

export function advance(tuto, event) {
  if (tuto.done) return tuto;
  if (event === TRIGGER[tuto.step]) {
    tuto.step += 1;
    if (tuto.step >= TUTO_STEPS.length) tuto.done = true;
  }
  return tuto;
}

export function currentStep(tuto) {
  return tuto.done ? null : TUTO_STEPS[tuto.step];
}
