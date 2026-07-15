// Coach-marks du premier règne : 3 bulles contextuelles, voix de Merlin.
// N'enseigne que la boucle de base (geste, jauges, mort). Machine pure.

export const TUTO_STEPS = [
  { text: 'Glisse la carte, jeune roi — à gauche, ou à droite.', anchor: 'card' },
  { text: 'Ton choix fait vivre ces quatre pouvoirs.', anchor: 'gauges' },
  { text: "Qu'une seule s'éteigne ou s'embrase, et ton règne s'achève.", anchor: 'card' },
];

// Événement qui fait avancer les étapes 1 et 2.
const TRIGGER = ['preview', 'choose', 'choose'];

if (TRIGGER.length !== TUTO_STEPS.length) {
  throw new Error('tutorial: TRIGGER et TUTO_STEPS doivent avoir la même longueur');
}

export function createTutorial() {
  return { step: 0, done: false };
}

export function advance(tuto, event) {
  if (tuto.done) return tuto;
  // Étape 0 : le geste peut être amorcé ('preview', souris — transition des jauges
  // pendant le drag) ou validé directement ('choose', clavier — les flèches ne
  // déclenchent jamais 'preview'). Sans ça le tuto restait bloqué en boucle
  // pour les joueurs clavier. Étapes 1-2 : seul 'choose' fait avancer.
  const accepts = tuto.step === 0 ? event === 'preview' || event === 'choose' : event === TRIGGER[tuto.step];
  if (accepts) {
    tuto.step += 1;
    if (tuto.step >= TUTO_STEPS.length) tuto.done = true;
  }
  return tuto;
}

export function currentStep(tuto) {
  return tuto.done ? null : TUTO_STEPS[tuto.step];
}
