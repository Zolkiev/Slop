import { describe, it, expect } from 'vitest';
import {
  createSwipe,
  dragStart,
  dragMove,
  dragEnd,
  previewSide,
  SWIPE_COMMIT,
  SWIPE_PREVIEW,
} from '../src/game/swipe.js';

describe('swipe', () => {
  it('sous le seuil de validation, le relâcher n’engage rien', () => {
    const s = createSwipe();
    dragStart(s);
    dragMove(s, SWIPE_COMMIT - 1);
    expect(dragEnd(s)).toBeNull();
    expect(s.dx).toBe(0); // la carte revient au centre
  });

  it('au-delà du seuil, valide le côté du drag', () => {
    const s = createSwipe();
    dragStart(s);
    dragMove(s, -SWIPE_COMMIT);
    expect(dragEnd(s)).toBe('left');

    dragStart(s);
    dragMove(s, SWIPE_COMMIT + 30);
    expect(dragEnd(s)).toBe('right');
  });

  it('previewSide respecte la zone morte', () => {
    const s = createSwipe();
    dragStart(s);
    dragMove(s, SWIPE_PREVIEW - 1);
    expect(previewSide(s)).toBeNull();
    dragMove(s, SWIPE_PREVIEW);
    expect(previewSide(s)).toBe('right');
    dragMove(s, -SWIPE_PREVIEW);
    expect(previewSide(s)).toBe('left');
  });

  it('ignore les mouvements hors drag actif', () => {
    const s = createSwipe();
    dragMove(s, 100);
    expect(s.dx).toBe(0);
    expect(previewSide(s)).toBeNull();
    expect(dragEnd(s)).toBeNull();
  });
});
