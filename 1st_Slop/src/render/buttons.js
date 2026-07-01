import { focusedId } from '../game/menu.js';
import { CONFIG } from '../config.js';

export function fitFontSize(ctx, text, maxWidth, maxSize, minSize) {
  for (let size = maxSize; size > minSize; size -= 1) {
    ctx.font = `${size}px ${CONFIG.BTN_FONT_FAMILY}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  return minSize;
}

export function plateKey(state) {
  return state === 'focus' ? 'btn-plate-focus' : 'btn-plate';
}

export function drawButton(ctx, rect, label, state, assets) {
  ctx.save();
  if (state === 'disabled') ctx.globalAlpha = CONFIG.BTN_DISABLED_ALPHA;
  ctx.drawImage(assets[plateKey(state)], rect.x, rect.y, rect.w, rect.h);
  if (state === 'disabled') ctx.globalAlpha = 1; // label uses grey colour alone; not double-dimmed

  const size = fitFontSize(ctx, label, rect.w - CONFIG.BTN_TEXT_PAD * 2, CONFIG.BTN_FONT_MAX, CONFIG.BTN_FONT_MIN);
  ctx.font = `${size}px ${CONFIG.BTN_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = state === 'disabled' ? CONFIG.BTN_TEXT_DISABLED : CONFIG.BTN_TEXT;
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}

export function drawButtons(ctx, menuObj, assets) {
  const focused = focusedId(menuObj);
  for (const b of menuObj.buttons) {
    const state = !b.enabled ? 'disabled' : (b.id === focused ? 'focus' : 'normal');
    drawButton(ctx, b, b.label, state, assets);
  }
}
