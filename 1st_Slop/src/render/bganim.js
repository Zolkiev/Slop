import { CONFIG } from '../config.js';

// Éléments de fond animés par décor — coordonnées en pixels NATIFS de
// l'asset bg-far du set (les tailles varient : bg-far-0 fait 304×538).
// n frames jouées en boucle, une toutes les `period` ticks (60/s),
// `phase` (en frames) désynchronise les éléments entre eux.
// Renseigné décor par décor au fil des batchs de production.
export const BG_ANIM = [
  [
    // n=16 : ping-pong déjà déplié dans la numérotation 0..15 (aller f-0..f-8,
    // retour f-7..f-1), jouer en boucle simple suffit. Deux enseignes néon qui
    // clignotent (repli spec : pas de vapeur exploitable dans l'asset, 2e
    // enseigne d'une autre couleur). Périodes coprimes 7/9 -> jamais en phase.
    { key: 'bg0-enseigne-rose', x: 246, y: 225, n: 16, period: 7, phase: 0 },
    { key: 'bg0-enseigne-cyan', x: 166, y: 226, n: 16, period: 9, phase: 8 },
  ], // 0 urbain — batch décor 0
  [
    // n=16 : Task 3 a livré 16 frames par panache (boucle ping-pong déjà
    // dépliée dans la numérotation 0..15, jouer en boucle simple suffit).
    { key: 'bg1-fumee-g', x: 0, y: 190, n: 16, period: 8, phase: 0 },
    { key: 'bg1-fumee-d', x: 260, y: 240, n: 16, period: 8, phase: 3 },
  ],
  [
    // n=16 : ping-pong déjà déplié dans la numérotation 0..15 (aller f-0..f-8,
    // retour f-7..f-1), jouer en boucle simple suffit. Un seul élément : le
    // soleil couchant dont le halo/les bandes de chaleur ondulent doucement
    // pendant que le disque reste rond et fixe (masque canal g : jaune g haut
    // vs ciel rouge g bas). Fond STATIQUE (offset toujours 0). period 10 =
    // respiration lente (~2.7 s par cycle ping-pong) ; phase 0 (élément unique).
    { key: 'bg2-soleil', x: 88, y: 272, n: 16, period: 10, phase: 0 },
  ], // 2 coucher de soleil
  [], // 3 tempête (éclairs = sprites d'événement, pas de boucle ici)
  [
    // n=16 : ping-pong déjà déplié dans la numérotation 0..15 (aller f-0..f-8,
    // retour f-7..f-1), jouer en boucle simple suffit. L'arc d'atmosphère
    // traverse toute la largeur (320 px > 256 max entrée API) -> scindé en 2
    // segments abouchés à x=160 (a: gauche, b: droite), phases décalées pour un
    // souffle doux qui traverse l'arc. Re-stamp par construction : le contour de
    // la bande (E0) est identique sur les 16 frames, seules teinte/intensité
    // internes pulsent ; étoiles, station et Terre sont figées (0 px hors bande
    // ne varie). Fond STATIQUE (offset toujours 0). period 12 = respiration lente
    // (~3,2 s par cycle ping-pong). phase 2 sur b = léger décalage (onde d'aurore).
    { key: 'bg4-atmo-a', x: 0, y: 186, n: 16, period: 12, phase: 0 },
    { key: 'bg4-atmo-b', x: 160, y: 160, n: 16, period: 12, phase: 2 },
  ], // 4 orbite — batch décor 4
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
