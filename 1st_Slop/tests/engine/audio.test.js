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
});
