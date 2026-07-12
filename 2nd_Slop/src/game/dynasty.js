// La lignée Pendragon : départs jouables, débloqués par le record d'années
// de règne (équivalent des robots débloquables de Jetpack Bot).

export const KINGS = [
  {
    key: 'arthur',
    name: 'ARTHUR',
    title: 'Le Roi Légitime',
    gauges: {}, // départ équilibré (50 partout)
    unlock: 0,
  },
  {
    key: 'uther',
    name: 'UTHER',
    title: 'Le Conquérant',
    gauges: { chevalerie: 65, magie: 40 },
    unlock: 15,
  },
  {
    key: 'constantin',
    name: 'CONSTANTIN',
    title: 'Le Pieux',
    gauges: { foi: 65, magie: 35 },
    unlock: 30,
  },
  {
    key: 'morgane',
    name: 'MORGANE',
    title: 'La Reine-Fée',
    gauges: { magie: 65, foi: 35 },
    unlock: 45,
  },
];

export function isUnlocked(king, best) {
  return best >= king.unlock;
}

export function unlockedKings(best) {
  return KINGS.filter((k) => isUnlocked(k, best));
}
