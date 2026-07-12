// Utilitaires texte Canvas : césure en lignes selon une largeur max.

/** Découpe `text` en lignes tenant dans `maxWidth` avec la fonte courante du ctx. */
export function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const probe = line ? `${line} ${word}` : word;
    if (ctx.measureText(probe).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Dessine des lignes centrées à partir de `y`, espacées de `lineHeight`. */
export function drawLines(ctx, lines, x, y, lineHeight) {
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}
