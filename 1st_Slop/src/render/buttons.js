import { focusedId } from '../game/menu.js';
import { CONFIG } from '../config.js';

export function fitFontSize(ctx, text, maxWidth, maxSize, minSize) {
  for (let size = maxSize; size > minSize; size -= 1) {
    ctx.font = `${size}px ${CONFIG.BTN_FONT_FAMILY}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  return minSize;
}

export function spriteKey(button, focused) {
  if (!button.enabled) return `btn-${button.id}-disabled`;
  if (button.id === focused) return `btn-${button.id}-focus`;
  return `btn-${button.id}`;
}

export function drawButtons(ctx, menuObj, assets) {
  const focused = focusedId(menuObj);
  for (const b of menuObj.buttons) {
    ctx.drawImage(assets[spriteKey(b, focused)], b.x, b.y, b.w, b.h);
  }
}
