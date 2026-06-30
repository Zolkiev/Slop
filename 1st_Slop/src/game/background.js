export function createLayer(speedFactor, tileWidth) {
  return { speedFactor, tileWidth, offset: 0 };
}

export function updateLayer(layer, scrollSpeed, dt) {
  layer.offset = (layer.offset + scrollSpeed * layer.speedFactor * dt) % layer.tileWidth;
  return layer;
}
