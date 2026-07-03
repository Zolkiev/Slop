export function createAudio(sources, AudioCtor = Audio) {
  const clips = {};
  for (const [name, url] of Object.entries(sources)) {
    clips[name] = new AudioCtor(url);
  }
  let sfxGain = 1;
  let musicGain = 1;
  let musicKey = null;

  function stopMusic() {
    const clip = clips[musicKey];
    if (clip) {
      try {
        clip.pause();
        clip.currentTime = 0;
      } catch { /* best-effort */ }
    }
    musicKey = null;
  }

  return {
    play(name) {
      const clip = clips[name];
      if (!clip) return;
      try {
        clip.volume = sfxGain;
        clip.currentTime = 0;
        const p = clip.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        /* lecture audio best-effort */
      }
    },
    setSfxVolume(v) {
      sfxGain = v;
    },
    setMusicVolume(v) {
      musicGain = v;
      const clip = clips[musicKey];
      if (clip) clip.volume = v;
    },
    setMusic(key, loop = true) {
      if (key === musicKey) return;
      stopMusic();
      const clip = clips[key];
      if (!clip) return; // null ou clé inconnue -> silence
      musicKey = key;
      try {
        clip.loop = loop;
        clip.volume = musicGain;
        const p = clip.play();
        if (p && typeof p.catch === 'function') {
          // Politique d'autoplay des navigateurs : play() peut être rejeté
          // (ex. premier frame, aucun geste utilisateur). On libère la clé
          // pour que le prochain setMusic(key) du même frame loop réessaie
          // au lieu d'être dédupliqué pour toujours.
          p.catch(() => {
            if (musicKey === key) musicKey = null;
          });
        }
      } catch {
        // Même logique en cas d'échec synchrone de play().
        if (musicKey === key) musicKey = null;
      }
    },
  };
}
