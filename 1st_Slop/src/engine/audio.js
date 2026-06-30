export function createAudio(sources, AudioCtor = Audio) {
  const clips = {};
  for (const [name, url] of Object.entries(sources)) {
    clips[name] = new AudioCtor(url);
  }
  return {
    play(name) {
      const clip = clips[name];
      if (!clip) return;
      try {
        clip.currentTime = 0;
        clip.play();
      } catch {
        /* lecture audio best-effort */
      }
    },
  };
}
