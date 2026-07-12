// Constantes de Logres — jauges, ères, réglages de règne.
// Aucune logique ici : seulement des données pures partagées par le moteur.

export const GAUGE_MIN = 0;
export const GAUGE_MAX = 100;
export const GAUGE_START = 50;

// Les 4 jauges. `key` est l'identifiant utilisé dans les effets de carte.
// `empty` = mort quand la jauge tombe à 0 ; `full` = mort quand elle atteint 100.
export const GAUGES = [
  {
    key: 'foi',
    label: 'Foi',
    icon: '✝️',
    empty: "Le clergé t'a excommunié ; abandonné de Dieu, tu meurs seul.",
    full: "L'Église fait de Logres une théocratie ; l'Inquisition te brûle.",
  },
  {
    key: 'magie',
    label: 'Magie',
    icon: '🔮',
    empty: "La magie s'éteint sur Logres ; Merlin te tourne le dos et tu dépéris.",
    full: "Les fées d'Avalon te réclament ; Morgane t'emporte hors du monde.",
  },
  {
    key: 'chevalerie',
    label: 'Chevalerie',
    icon: '⚔️',
    empty: "La Table Ronde se disperse ; les Saxons déferlent et Logres tombe.",
    full: "Un champion trop adulé lève l'épée : le plus grand chevalier t'usurpe.",
  },
  {
    key: 'couronne',
    label: 'Couronne',
    icon: '👑',
    empty: "Les barons se soulèvent ; ta couronne roule dans la boue.",
    full: "Devenu tyran, tu es renversé par le peuple que tu écrasais.",
  },
];

export const GAUGE_KEYS = GAUGES.map((g) => g.key);

// Les 5 ères — l'arc de la légende. `until` = nombre d'années de règne avant de
// passer à l'ère suivante (null = dernière ère, dure jusqu'à la mort).
export const ERAS = [
  { id: 'roche', name: "L'Épée dans la Roche", until: 8 },
  { id: 'camelot', name: "L'Âge d'Or de Camelot", until: 20 },
  { id: 'graal', name: 'La Quête du Graal', until: 32 },
  { id: 'chute', name: 'La Chute', until: 44 },
  { id: 'avalon', name: 'Avalon', until: null },
];
