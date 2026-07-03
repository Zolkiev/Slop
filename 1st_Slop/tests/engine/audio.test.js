import { describe, it, expect, vi } from 'vitest';
import { createAudio } from '../../src/engine/audio.js';

describe('audio', () => {
  it('joue le son demandé', () => {
    const play = vi.fn();
    class FakeAudio { constructor() { this.play = play; this.currentTime = 0; } }
    const audio = createAudio({ score: 'score.wav' }, FakeAudio);
    audio.play('score');
    expect(play).toHaveBeenCalled();
  });

  it('ignore un nom inconnu sans planter', () => {
    class FakeAudio { play() {} }
    const audio = createAudio({}, FakeAudio);
    expect(() => audio.play('nope')).not.toThrow();
  });

  it('swallows a rejected play() promise without throwing', () => {
    class FakeAudio {
      constructor() {
        this.currentTime = 0;
        this.play = () => Promise.reject(new Error('blocked'));
      }
    }
    const audio = createAudio({ x: 'x.wav' }, FakeAudio);
    expect(() => audio.play('x')).not.toThrow();
  });
});

function trackFake() {
  const instances = [];
  class FakeAudio {
    constructor(url) {
      this.url = url;
      this.currentTime = 0;
      this.volume = 1;
      this.loop = false;
      this.playing = false;
      this.play = vi.fn(() => { this.playing = true; });
      this.pause = vi.fn(() => { this.playing = false; });
      instances.push(this);
    }
  }
  return { FakeAudio, instances };
}

describe('audio volumes & music', () => {
  it('setSfxVolume s\'applique au play() des SFX', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ score: 's.wav' }, FakeAudio);
    audio.setSfxVolume(0.3);
    audio.play('score');
    expect(instances[0].volume).toBeCloseTo(0.3);
  });

  it('setMusic lance la piste en boucle au volume musique courant', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-0': 'm0.wav' }, FakeAudio);
    audio.setMusicVolume(0.5);
    audio.setMusic('music-0');
    const clip = instances[0];
    expect(clip.loop).toBe(true);
    expect(clip.volume).toBeCloseTo(0.5);
    expect(clip.play).toHaveBeenCalledTimes(1);
  });

  it('setMusic même clé = no-op (la boucle continue)', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-0': 'm0.wav' }, FakeAudio);
    audio.setMusic('music-0');
    audio.setMusic('music-0');
    expect(instances[0].play).toHaveBeenCalledTimes(1);
  });

  it('setMusic nouvelle clé stoppe l\'ancienne et lance la nouvelle', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-0': 'm0.wav', 'music-1': 'm1.wav' }, FakeAudio);
    audio.setMusic('music-0');
    audio.setMusic('music-1');
    const [m0, m1] = instances;
    expect(m0.pause).toHaveBeenCalled();
    expect(m0.currentTime).toBe(0);
    expect(m1.play).toHaveBeenCalledTimes(1);
  });

  it('setMusic(null) stoppe la piste courante', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-0': 'm0.wav' }, FakeAudio);
    audio.setMusic('music-0');
    audio.setMusic(null);
    expect(instances[0].pause).toHaveBeenCalled();
  });

  it('setMusicVolume s\'applique à la piste en cours', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-0': 'm0.wav' }, FakeAudio);
    audio.setMusic('music-0');
    audio.setMusicVolume(0.2);
    expect(instances[0].volume).toBeCloseTo(0.2);
  });

  it('setMusic clé inconnue = stop sans planter', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-0': 'm0.wav' }, FakeAudio);
    audio.setMusic('music-0');
    expect(() => audio.setMusic('music-9')).not.toThrow();
    expect(instances[0].pause).toHaveBeenCalled();
  });

  it('setMusic(key, false) joue la piste sans boucler', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'jingle-gameover': 'j.wav' }, FakeAudio);
    audio.setMusic('jingle-gameover', false);
    expect(instances[0].play).toHaveBeenCalled();
    expect(instances[0].loop).toBe(false);
  });

  it('setMusic même clé non bouclée ne redémarre pas le clip (dédup par frame)', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'jingle-gameover': 'j.wav' }, FakeAudio);
    audio.setMusic('jingle-gameover', false);
    audio.setMusic('jingle-gameover', false);
    expect(instances[0].play).toHaveBeenCalledTimes(1);
  });

  it('setMusic boucle par défaut', () => {
    const { FakeAudio, instances } = trackFake();
    const audio = createAudio({ 'music-menu': 'm.wav' }, FakeAudio);
    audio.setMusic('music-menu');
    expect(instances[0].loop).toBe(true);
  });
});
