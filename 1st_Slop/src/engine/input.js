export function createInput({ target, win = window, preventDefault = true }, onPress, onNav = () => {}) {
  function pointerFromEvent(e) {
    if (typeof e.clientX !== 'number' || typeof target.getBoundingClientRect !== 'function') {
      return undefined;
    }
    const rect = target.getBoundingClientRect();
    const sx = target.width / rect.width;
    const sy = target.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function handlePointer(e) {
    if (preventDefault && e.preventDefault) e.preventDefault();
    onPress(pointerFromEvent(e));
  }

  function handleKey(e) {
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
      if (preventDefault && e.preventDefault) e.preventDefault();
      onPress(undefined);
    } else if (e.code === 'ArrowUp' && !e.repeat) {
      if (preventDefault && e.preventDefault) e.preventDefault();
      onNav(-1);
    } else if (e.code === 'ArrowDown' && !e.repeat) {
      if (preventDefault && e.preventDefault) e.preventDefault();
      onNav(1);
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
