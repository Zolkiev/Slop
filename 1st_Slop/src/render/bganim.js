import { CONFIG } from '../config.js';

// Éléments de fond animés par décor — coordonnées en pixels NATIFS de
// l'asset bg-far du set (les tailles varient : bg-far-0 fait 304×538).
// n frames jouées en boucle, une toutes les `period` ticks (60/s),
// `phase` (en frames) désynchronise les éléments entre eux.
// Renseigné décor par décor au fil des batchs de production.
export const BG_ANIM = [
  [], // 0 urbain — batch décor 0
  [
    // n=16 : Task 3 a livré 16 frames par panache (boucle ping-pong déjà
    // dépliée dans la numérotation 0..15, jouer en boucle simple suffit).
    { key: 'bg1-fumee-g', x: 0, y: 190, n: 16, period: 8, phase: 0 },
    { key: 'bg1-fumee-d', x: 260, y: 240, n: 16, period: 8, phase: 3 },
  ],
  [], // 2 coucher de soleil
  [], // 3 tempête (éclairs = sprites d'événement, pas de boucle ici)
  [], // 4 orbite
];

export function frameIndex(tick, elem) {
  return Math.floor(tick / elem.period + elem.phase) % elem.n;
}

// Dessine les patchs animés par-dessus le fond lointain (étape 1a du
// renderer) : même transformation que le fond (échelle asset -> 360×643,
// décalé du parallaxe, replié sur la tuile visible).
export function renderBgAnim(ctx, world, assets, table = BG_ANIM) {
  const elems = table[world.bgSet];
  if (!elems.length) return;
  const bg = assets['bg-far-' + world.bgSet];
  const kx = CONFIG.WIDTH / bg.width;
  const ky = (CONFIG.HEIGHT + 3) / bg.height;
  const farOff = world.layers[0].offset % CONFIG.WIDTH;
  for (const elem of elems) {
    const frame = assets[elem.key + '-' + frameIndex(world.menuTick, elem)];
    const dw = frame.width * kx;
    const dh = frame.height * ky;
    const dy = elem.y * ky - 3;
    const sx = (((elem.x * kx - farOff) % CONFIG.WIDTH) + CONFIG.WIDTH) % CONFIG.WIDTH;
    ctx.drawImage(frame, sx, dy, dw, dh);
    if (sx + dw > CONFIG.WIDTH) ctx.drawImage(frame, sx - CONFIG.WIDTH, dy, dw, dh);
  }
}
