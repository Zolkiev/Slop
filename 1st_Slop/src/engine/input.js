export function createInput({ target, win = window, preventDefault = true }, onPress) {
  function handlePointer(e) {
    if (preventDefault && e.preventDefault) e.preventDefault();
    onPress();
  }
  function handleKey(e) {
    if (e.code === 'Space' && !e.repeat) {
      if (preventDefault && e.preventDefault) e.preventDefault();
      onPress();
    }
  }
  target.addEventListener('pointerdown', handlePointer);
  win.addEventListener('keydown', handleKey);
  return {
    dispose() {
      target.removeEventListener('pointerdown', handlePointer);
      win.removeEventListener('keydown', handleKey);
    },
  };
}
