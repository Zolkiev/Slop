// Familles de polices du jeu (fichiers embarqués dans assets/fonts/,
// déclarés en @font-face dans index.html — aucune dépendance réseau).
// TITLE : Cinzel, capitales romanes gravées — titres, noms, écrans.
// TEXT : EB Garamond, serif humaniste — texte courant (variable 400-700).
export const TITLE = 'Cinzel, serif';
export const TEXT = '"EB Garamond", serif';

// Le canvas ne déclenche pas le chargement des @font-face : on le force ici.
// Non bloquant — la boucle repeint chaque frame, les polices remplacent le
// serif système dès qu'elles sont prêtes.
export function loadFonts() {
  const variants = [
    `700 20px ${TITLE}`,
    `400 17px ${TEXT}`,
    `700 17px ${TEXT}`,
    `italic 400 17px ${TEXT}`,
  ];
  for (const v of variants) document.fonts?.load(v);
}
