// Loads a font via the FontFace API and registers it so canvas can use it.
// deps are injectable for unit testing (no real DOM needed).
export function loadFont(family, url, deps = {}) {
  const FontFaceCtor = deps.FontFaceCtor ?? FontFace;
  const fontset = deps.fontset ?? document.fonts;
  const face = new FontFaceCtor(family, `url(${url})`);
  return face.load().then((loaded) => {
    fontset.add(loaded);
  });
}
