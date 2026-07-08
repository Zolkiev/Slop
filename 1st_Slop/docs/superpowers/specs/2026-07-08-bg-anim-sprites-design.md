# Backgrounds animés en sprites — Design

**Demande Jael (2026-07-08, gate bg-events)** : « SPRITES D'ANIMATION pour
TOUS les BACKGROUNDS. Faut que TOUS les niveaux soient animés avec la même
qualité. » Concrétise sa note du 06/07 (« animer les sprites de fond via
PixelLab, loop d'animation cohérente »). Les événements procéduraux
(bg-events, mergés) restent en couche par-dessus — ce projet anime les
éléments PEINTS dans les fonds, qui sont aujourd'hui figés.

## Principe

Chaque décor a **1-2 éléments signature, importants et visibles**, animés en
**vraies frames de sprites** jouées en boucle. Pas de fond entier redessiné
en N frames (fourmillement, coût) : des **patchs** — crops du fond animés —
dessinés en espace image par-dessus la zone d'origine, avec l'ancrage
image→écran validé par le fix torchère (repli de tuile, suit le défilement
des fonds 0/1, statique pour 2/3/4).

## Éléments par décor (validé Jael)

| Set | Décor | Élément(s) animé(s) |
|-----|-------|---------------------|
| 0 | Urbain nuit | Enseigne(s) néon qui clignotent + fumée/vapeur de toit (zones exactes fixées par un inventaire visuel zoomé de l'asset, première étape du batch) |
| 1 | Industriel vert | Les 2 panaches de fumée verte qui ondulent (bouches image (73,339) et (324,320)) |
| 2 | Coucher de soleil | Shimmer du soleil (rayons/reflets qui ondulent) |
| 3 | Tempête violette | Éclairs : les éclairs FIGÉS du PNG sont effacés (1 edit PixelLab) et remplacés par 2-3 sprites de frappe dessinés UNIQUEMENT pendant l'événement foudre, synchro avec le flash |
| 4 | Orbite | Arc d'atmosphère qui pulse/ondule (+ option feux de la station si l'arc seul ne suffit pas au gate) |

**Critère d'égalité (non négociable, demande explicite)** : les 5 décors
reçoivent le même soin. Gate visuel PAR DÉCOR ; un décor qui ne vit pas au
niveau des autres bloque le merge.

## Pipeline de production des frames (option A Jael, affinée)

L'endpoint PixelLab `animate` (4-16 frames paires, entrée ≤256×256) est
GÉNÉRATIF : il réinterprète l'image, les pixels hors sujet ne sont pas
stables. Garde-fou par élément :

1. **Crop** de la zone (≤256×256) depuis `bg-far-N.png` natif.
2. **`pixellab.mjs animate`** sur le crop (prompt de mouvement lent et
   ambiant, ex. « green smoke drifting upward, slow ambient loop »).
3. **Masquage local** (outils pngjs de `Slop/.claude/tools/`) : dans chaque
   frame, les pixels animés ne sont gardés QUE dans le masque de l'élément
   (détection couleur, cf. `find-plumes.mjs`) ; hors masque = pixels
   d'origine au pixel près. Zéro fourmillement autour.
4. **Bouclage** : ping-pong ou sous-ensemble de frames qui se raccordent,
   jugé sur une préview WebP (`pixellab.mjs webp`) et une planche contact.
   Critère : aucune coupure visible à l'œil sur 10 s de boucle.
5. Frames finales : `assets/bg-anim/bg{set}-{element}-{i}.png` (crops
   opaques, remplacement direct de la zone).

Cas particulier éclairs (set 3) : pas d'animate — `edit` pour effacer les
éclairs du fond + `generate` de 2-3 sprites d'éclair transparents.

**Budget** : ~8-10 appels + itérations de bouclage ≈ 250-450 crédits
(solde au 08/07 : 1880). Mesurer et noter le coût réel par appel animate.

## Architecture runtime

- **`src/render/bganim.js`** (nouveau, même famille que `render/bgevents.js`) :
  `renderBgAnim(ctx, world, assets)`, dessiné à l'étape **1a** du renderer
  (après le fond lointain, avant les événements 1b). Conversion image→écran
  identique à `drawTorchere` (offset de `world.layers[0]`, repli modulo
  WIDTH). Sélection de frame : `Math.floor(world.menuTick / period) % n`
  (`menuTick` s'incrémente dans TOUS les états — le menu vitrine vit aussi) ;
  période ~7-8 ticks ≈ 8 fps, décalage de phase par élément pour éviter la
  synchronisation mécanique.
- **Table `BG_ANIM`** (dans `bganim.js`) : par set, liste de
  `{key, x, y, frames, period, phase}` en espace image canvas (360×643).
- **Éclairs** : `EVENTS[3]` (game/bgevents.js) gagne les params du sprite
  (index de forme, x d'impact) tirés au déclenchement ; `drawFoudre`
  (render/bgevents.js, déjà branché sur l'événement et `foudreAlpha`)
  dessine le sprite d'éclair en plus du voile, pendant la frappe uniquement.
  `bg-far-3.png` remplacé par la version sans éclairs figés.
- **Chargement** : extension de la map d'assets de `main.js` (pattern
  existant).
- **Halo torchère** : conservé sous la fumée animée (lueur au pied du
  panache) ; rejugé au gate du décor 1.
- Zéro dépendance runtime ajoutée ; poids : crops ~100×120 × 6-8 frames
  × ~7 éléments — négligeable devant l'audio.

## Tests et vérification

- Vitest : sélection de frame (période/phase/modulo), position écran
  dépendante de l'offset (régression ancrage), éclair dessiné seulement
  pendant l'événement foudre, table BG_ANIM cohérente avec la map d'assets.
- Smoke Playwright durable (`Slop/.claude/smokes/`) : par décor, 2 captures
  espacées d'une demi-période → les pixels de la zone animée DIFFÈRENT
  (l'animation tourne) ; zéro erreur console.
- Gate visuel Jael PAR DÉCOR en jeu (bloquant, critère d'égalité ci-dessus).

## Ordre d'exécution

1. **Pilote : décor 1 (fumée verte)** — valide le pipeline complet
   (animate → masque → boucle → runtime). Gate Jael intermédiaire.
2. Décors 0, 2, 4 (batch, même pipeline).
3. Décor 3 (éclairs, pipeline spécifique edit+sprites).
4. Gate final tous décors + merge.

## Hors scope

Animation des premiers plans (`bg-near-*`), nouveaux événements procéduraux,
refonte des fonds existants au-delà de l'effacement des éclairs du set 3.
