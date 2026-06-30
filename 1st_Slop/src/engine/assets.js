export function loadImages(sources) {
  const entries = Object.entries(sources);
  return Promise.all(
    entries.map(
      ([key, url]) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([key, img]);
          img.onerror = () => reject(new Error(`Échec chargement ${url}`));
          img.src = url;
        }),
    ),
  ).then((pairs) => Object.fromEntries(pairs));
}
