// Moteur audio sur la Web Audio API.
//
// Pourquoi pas HTMLAudioElement : sur iOS, `currentTime = 0; play()` à chaque
// tap janke le main thread (latence + `volume` ignoré par Apple). Web Audio
// décode une fois, joue des BufferSource one-shot sans toucher au DOM et gère
// le volume par GainNode. Le contrat public consommé par main.js est conservé :
// `play`, `setSfxVolume`, `setMusicVolume`, `setMusic`. On ajoute `unlock()`.
//
// Best-effort absolu : le jeu ne crashe JAMAIS pour de l'audio. Un fetch ou un
// décodage qui échoue laisse simplement le son silencieux, sans exception.
export function createAudio(sources, { fetchFn = fetch, createCtx } = {}) {
  const makeCtx =
    createCtx || (() => new (window.AudioContext || window.webkitAudioContext)());
  const ctx = makeCtx();

  // Deux bus de gain persistants branchés une fois sur la sortie.
  const sfxGain = ctx.createGain();
  const musicGain = ctx.createGain();
  sfxGain.connect(ctx.destination);
  musicGain.connect(ctx.destination);

  // Décodage en fond, best-effort. Une clé absente de `buffers` = son pas prêt
  // (ou en échec) -> lecture silencieuse sans exception.
  const buffers = {};
  for (const [name, url] of Object.entries(sources)) {
    Promise.resolve()
      .then(() => fetchFn(url))
      .then((res) => res.arrayBuffer())
      // decodeAudioData en forme promesse (le piège Web Audio).
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        buffers[name] = buffer;
      })
      .catch(() => {
        /* best-effort : son indisponible, on reste silencieux */
      });
  }

  let musicKey = null;
  let musicSource = null; // BufferSource active de la musique (pour la stopper)

  function stopMusic() {
    if (musicSource) {
      try {
        musicSource.stop();
        musicSource.disconnect();
      } catch {
        /* best-effort */
      }
      musicSource = null;
    }
    musicKey = null;
  }

  return {
    play(name) {
      const buffer = buffers[name];
      // Son pas prêt, ou contexte pas encore débloqué : no-op silencieux.
      if (!buffer || ctx.state !== 'running') return;
      try {
        // Les BufferSource sont one-shot : une nouvelle par lecture.
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(sfxGain);
        src.start();
      } catch {
        /* best-effort */
      }
    },

    setSfxVolume(v) {
      sfxGain.gain.value = v;
    },

    setMusicVolume(v) {
      musicGain.gain.value = v;
    },

    // main.js appelle setMusic(musicFor(...)) À CHAQUE FRAME. La dédup se fait
    // par `musicKey`. Si le démarrage est impossible (contexte pas `running` ou
    // buffer absent), `musicKey` reste null : l'appel de la frame suivante
    // réessaie. C'est ce retry par frame qui fait démarrer la musique dès que
    // le contexte est débloqué.
    setMusic(key, loop = true) {
      if (key === musicKey) return; // même piste déjà lancée -> rien à faire
      stopMusic(); // coupe l'ancienne (remet musicKey à null)
      const buffer = buffers[key];
      if (!buffer) return; // null, clé inconnue ou buffer pas prêt -> silence
      if (ctx.state !== 'running') return; // pas débloqué -> retry frame suivante
      try {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = loop;
        src.connect(musicGain);
        src.start();
        musicSource = src;
        musicKey = key;
        // Fin d'un jingle non bouclé : rien à faire. On garde musicKey pour
        // que setMusic(memeCle, false) de la frame suivante déduplique et ne
        // relance pas le jingle.
      } catch {
        stopMusic(); // échec de démarrage -> on relâche pour réessayer
      }
    },

    // À brancher sur le premier geste utilisateur (Task 2). Idempotent.
    unlock() {
      try {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        /* best-effort */
      }
    },
  };
}
