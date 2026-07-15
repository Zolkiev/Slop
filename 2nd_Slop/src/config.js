// Constantes de Logres — jauges, ères, réglages de règne.
// Aucune logique ici : seulement des données pures partagées par le moteur.

export const GAUGE_MIN = 0;
export const GAUGE_MAX = 100;
export const GAUGE_START = 50;

// Avalon : érosion des 4 jauges à chaque tour joué dans l'ère (« Le Déclin »).
// Logres échappe au roi mourant. Calibré par simulation : médiane ~10 tours
// d'épilogue. Voir docs/superpowers/specs/2026-07-15-avalon-declin-design.md §3.1.
export const AVALON_DECLIN = 3;

// Les 4 jauges. `key` est l'identifiant utilisé dans les effets de carte.
// `empty` = mort quand la jauge tombe à 0 ; `full` = mort quand elle atteint 100.
// `avalonEmpty` = mort à 0 pendant l'épilogue d'Avalon : le roi ne se fait pas
// renverser, il s'éteint. Voir spec 2026-07-15-avalon-declin-design §3.2.
export const GAUGES = [
  {
    key: 'foi',
    label: 'Foi',
    icon: '✝️',
    empty: "Le clergé t'a excommunié ; abandonné de Dieu, tu meurs seul.",
    full: "L'Église fait de Logres une théocratie ; l'Inquisition te brûle.",
    avalonEmpty:
      "Le dernier prêtre a quitté ton chevet. Tu t'éteins sans viatique, sans absolution, et nul à Logres n'ose dire où s'en va ton âme.",
  },
  {
    key: 'magie',
    label: 'Magie',
    icon: '🔮',
    empty: "La magie s'éteint sur Logres ; Merlin te tourne le dos et tu dépéris.",
    full: "Les fées d'Avalon te réclament ; Morgane t'emporte hors du monde.",
    avalonEmpty:
      "La brume monte sur le lac, et la barque ne vient pas. Morgane a détourné les yeux : tu meurs homme, non roi de légende — et nulle Avalon ne te reprendra.",
  },
  {
    key: 'chevalerie',
    label: 'Chevalerie',
    icon: '⚔️',
    empty: "La Table Ronde se disperse ; les Saxons déferlent et Logres tombe.",
    full: "Un champion trop adulé lève l'épée : le plus grand chevalier t'usurpe.",
    avalonEmpty:
      "Aucun chevalier ne veille ton dernier souffle. La Table Ronde n'est plus qu'un meuble dans une salle vide, et tu t'éteins sans qu'une épée se lève.",
  },
  {
    key: 'couronne',
    label: 'Couronne',
    icon: '👑',
    empty: "Les barons se soulèvent ; ta couronne roule dans la boue.",
    full: "Devenu tyran, tu es renversé par le peuple que tu écrasais.",
    avalonEmpty:
      "La couronne a glissé de ton front avant que ton cœur ne s'arrête. Logres n'enterre pas un roi : elle range un vieil homme.",
  },
];

export const GAUGE_KEYS = GAUGES.map((g) => g.key);

// Anti-répétition : les N dernières cartes jouées sont écartées du tirage
// (sauf si le deck ne propose rien d'autre — le non-blocage prime).
export const RECENT_LIMIT = 6;

// Les 5 ères — l'arc de la légende. `until` = nombre d'années de règne avant de
// passer à l'ère suivante (null = dernière ère, dure jusqu'à la mort).
export const ERAS = [
  { id: 'roche', name: "L'Épée dans la Roche", until: 8 },
  { id: 'camelot', name: "L'Âge d'Or de Camelot", until: 20 },
  { id: 'graal', name: 'La Quête du Graal', until: 32 },
  { id: 'chute', name: 'La Chute', until: 44 },
  { id: 'avalon', name: 'Avalon', until: null },
];
