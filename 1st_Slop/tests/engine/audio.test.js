import { describe, it, expect, vi } from 'vitest';
import { createAudio } from '../../src/engine/audio.js';

// --- Fakes Web Audio ---------------------------------------------------------
// Aucun vrai AudioContext ni fetch : tout est piloté. On peut choisir l'état
// initial du contexte (suspended/running) et faire échouer decodeAudioData.

function makeGain() {
  return { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
}

function fakeEnv({ state = 'suspended', decodeOk = true } = {}) {
  const sources = []; // toutes les BufferSource créées (ordre de création)
  const gains = []; // [sfxGain, musicGain] dans l'ordre de createGain
  const ctx = {
    state,
    destination: { tag: 'destination' },
    createGain: vi.fn(() => {
      const g = makeGain();
      gains.push(g);
      return g;
    }),
    createBufferSource: vi.fn(() => {
      const src = {
        buffer: null,
        loop: false,
        onended: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      sources.push(src);
      return src;
    }),
    // Forme promesse de decodeAudioData (le piège du brief).
    decodeAudioData: vi.fn((data) =>
      decodeOk
        ? Promise.resolve({ decoded: true, data })
        : Promise.reject(new Error('decode-failed')),
    ),
    resume: vi.fn(() => {
      ctx.state = 'running';
      return Promise.resolve();
    }),
  };
  const fetchFn = vi.fn((url) =>
    Promise.resolve({ arrayBuffer: () => Promise.resolve(`ab:${url}`) }),
  );
  return { ctx, fetchFn, sources, gains, createCtx: () => ctx };
}

// Vide la file de microtâches (fetch -> arrayBuffer -> decode = 3 maillons).
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('audio Web Audio — init', () => {
  it('crée le contexte et branche 2 gains (sfx, musique) sur la destination', () => {
    const env = fakeEnv();
    createAudio({ score: 's.wav' }, env);
    expect(env.ctx.createGain).toHaveBeenCalledTimes(2);
    const [sfxGain, musicGain] = env.gains;
    expect(sfxGain.connect).toHaveBeenCalledWith(env.ctx.destination);
    expect(musicGain.connect).toHaveBeenCalledWith(env.ctx.destination);
  });

  it('fetch + décode chaque source en fond', async () => {
    const env = fakeEnv();
    createAudio({ score: 's.wav', crash: 'c.wav' }, env);
    await flush();
    expect(env.fetchFn).toHaveBeenCalledWith('s.wav');
    expect(env.fetchFn).toHaveBeenCalledWith('c.wav');
    expect(env.ctx.decodeAudioData).toHaveBeenCalledTimes(2);
  });
});

describe('audio Web Audio — play', () => {
  it('ne joue rien tant que le buffer n\'est pas décodé', async () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ score: 's.wav' }, env);
    audio.play('score'); // décodage pas encore résolu
    expect(env.ctx.createBufferSource).not.toHaveBeenCalled();
    expect(env.sources.length).toBe(0);
  });

  it('joue le son décodé quand le contexte tourne (source one-shot -> sfxGain)', async () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ score: 's.wav' }, env);
    await flush();
    audio.play('score');
    expect(env.sources.length).toBe(1);
    const src = env.sources[0];
    expect(src.buffer).toEqual({ decoded: true, data: 'ab:s.wav' });
    expect(src.connect).toHaveBeenCalledWith(env.gains[0]); // sfxGain
    expect(src.start).toHaveBeenCalledTimes(1);
  });

  it('chaque play crée une nouvelle source (one-shot)', async () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ score: 's.wav' }, env);
    await flush();
    audio.play('score');
    audio.play('score');
    expect(env.sources.length).toBe(2);
  });

  it('ne joue pas si le contexte est suspendu', async () => {
    const env = fakeEnv({ state: 'suspended' });
    const audio = createAudio({ score: 's.wav' }, env);
    await flush();
    audio.play('score');
    expect(env.ctx.createBufferSource).not.toHaveBeenCalled();
  });

  it('ignore un nom inconnu sans planter', () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({}, env);
    expect(() => audio.play('nope')).not.toThrow();
  });
});

describe('audio Web Audio — volumes', () => {
  it('setSfxVolume règle le gain sfx (node persistant)', () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ score: 's.wav' }, env);
    audio.setSfxVolume(0.3);
    expect(env.gains[0].gain.value).toBeCloseTo(0.3);
  });

  it('setMusicVolume règle le gain musique', () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ 'music-0': 'm0.wav' }, env);
    audio.setMusicVolume(0.2);
    expect(env.gains[1].gain.value).toBeCloseTo(0.2);
  });
});

describe('audio Web Audio — musique', () => {
  it('setMusic démarre la piste en boucle vers le gain musique', async () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ 'music-0': 'm0.wav' }, env);
    await flush();
    audio.setMusic('music-0');
    expect(env.sources.length).toBe(1);
    const src = env.sources[0];
    expect(src.loop).toBe(true);
    expect(src.connect).toHaveBeenCalledWith(env.gains[1]); // musicGain
    expect(src.start).toHaveBeenCalledTimes(1);
  });

  it('setMusic même clé = no-op (la boucle continue)', async () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ 'music-0': 'm0.wav' }, env);
    await flush();
    audio.setMusic('music-0');
    audio.setMusic('music-0');
    expect(env.sources.length).toBe(1);
  });

  it('setMusic nouvelle clé stoppe l\'ancienne source et démarre la nouvelle', async () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ 'music-0': 'm0.wav', 'music-1': 'm1.wav' }, env);
    await flush();
    audio.setMusic('music-0');
    audio.setMusic('music-1');
    const [s0, s1] = env.sources;
    expect(s0.stop).toHaveBeenCalledTimes(1);
    expect(s0.disconnect).toHaveBeenCalled();
    expect(s1.start).toHaveBeenCalledTimes(1);
  });

  it('setMusic(null) stoppe la piste courante', async () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ 'music-0': 'm0.wav' }, env);
    await flush();
    audio.setMusic('music-0');
    audio.setMusic(null);
    expect(env.sources[0].stop).toHaveBeenCalledTimes(1);
  });

  it('setMusic clé inconnue stoppe l\'ancienne sans planter', async () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ 'music-0': 'm0.wav' }, env);
    await flush();
    audio.setMusic('music-0');
    expect(() => audio.setMusic('music-9')).not.toThrow();
    expect(env.sources[0].stop).toHaveBeenCalledTimes(1);
  });

  it('setMusic(key, false) joue la piste sans boucler (jingle)', async () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ 'jingle-gameover': 'j.wav' }, env);
    await flush();
    audio.setMusic('jingle-gameover', false);
    expect(env.sources[0].loop).toBe(false);
    expect(env.sources[0].start).toHaveBeenCalledTimes(1);
  });

  it('setMusic même clé non bouclée ne relance pas le jingle (dédup)', async () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ 'jingle-gameover': 'j.wav' }, env);
    await flush();
    audio.setMusic('jingle-gameover', false);
    audio.setMusic('jingle-gameover', false);
    expect(env.sources.length).toBe(1);
  });
});

describe('audio Web Audio — unlock & retry', () => {
  it('setMusic ne démarre pas si le contexte est suspendu, puis réessaie une fois débloqué', async () => {
    const env = fakeEnv({ state: 'suspended' });
    const audio = createAudio({ 'music-0': 'm0.wav' }, env);
    await flush();
    // Frame N : ctx suspendu -> aucune source, musicKey doit rester relâché.
    audio.setMusic('music-0');
    expect(env.sources.length).toBe(0);
    // Débloque (comme un geste utilisateur -> unlock -> resume).
    audio.unlock();
    await flush();
    // Frame N+1 : même clé mais comme le démarrage avait échoué, on réessaie.
    audio.setMusic('music-0');
    expect(env.sources.length).toBe(1);
    expect(env.sources[0].start).toHaveBeenCalledTimes(1);
  });

  it('setMusic relâche musicKey si le buffer n\'est pas encore prêt (retry par frame)', async () => {
    const env = fakeEnv({ state: 'running' });
    const audio = createAudio({ 'music-0': 'm0.wav' }, env);
    // buffer pas décodé -> pas de démarrage
    audio.setMusic('music-0');
    expect(env.sources.length).toBe(0);
    await flush();
    // frame suivante, buffer prêt -> le même appel doit maintenant démarrer
    audio.setMusic('music-0');
    expect(env.sources.length).toBe(1);
  });

  it('unlock appelle ctx.resume et est idempotent', () => {
    const env = fakeEnv({ state: 'suspended' });
    const audio = createAudio({ score: 's.wav' }, env);
    expect(() => {
      audio.unlock();
      audio.unlock();
    }).not.toThrow();
    expect(env.ctx.resume).toHaveBeenCalledTimes(2);
  });
});

describe('audio Web Audio — best-effort (jamais de crash)', () => {
  it('un decode échoué laisse le son silencieux sans exception', async () => {
    const env = fakeEnv({ state: 'running', decodeOk: false });
    const audio = createAudio({ score: 's.wav', 'music-0': 'm0.wav' }, env);
    await flush();
    expect(() => {
      audio.play('score');
      audio.setMusic('music-0');
    }).not.toThrow();
    expect(env.ctx.createBufferSource).not.toHaveBeenCalled();
  });

  it('une erreur de fetch est avalée (aucune exception, son silencieux)', async () => {
    const env = fakeEnv({ state: 'running' });
    env.fetchFn.mockImplementation(() => Promise.reject(new Error('offline')));
    const audio = createAudio({ score: 's.wav' }, env);
    await flush();
    expect(() => audio.play('score')).not.toThrow();
    expect(env.ctx.createBufferSource).not.toHaveBeenCalled();
  });
});
