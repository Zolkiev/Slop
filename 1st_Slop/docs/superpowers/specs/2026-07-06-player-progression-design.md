# Progression joueur — hangar de skins (design)

**Date :** 2026-07-06
**Statut :** validé en autonome (game-feel délégué par Jael — gate en jeu
avant merge)
**Sous-projet :** 4 de la roadmap (dernier). S'empile sur `feat/theme-music`
— branche `feat/player-progression`.

## Objectif

La progression se voit sur le robot : atteindre un nouveau monde débloque le
skin assorti. Un écran « hangar » accessible depuis le menu permet de
choisir son robot parmi les skins débloqués.

## Concept

5 skins, un par monde, déblocage indexé sur les seuils de tiers existants
(`CONFIG.PATTERN_TIERS = [1, 3, 5, 7, 10]`, comparés à `bestLevel`) :

| # | id | Nom | Monde | Seuil (bestLevel ≥) | Accent (flamme/particules) |
|---|----|-----|-------|--------------------|---------------------------|
| 0 | proto | PROTO | nuit urbaine | 1 (toujours) | `#3ef0ff` (cyan actuel) |
| 1 | forge | FORGE | industriel | 3 | `#ff9a3e` (orange rouille) |
| 2 | venin | VENIN | toxique | 5 | `#7dff3e` (vert acide) |
| 3 | orage | ORAGE | tempête néon | 7 | `#c93eff` (violet) |
| 4 | nova | NOVA | orbite | 10 | `#fff7d6` (blanc doré) |

Atteindre le monde = posséder son robot : aucune nouvelle constante de
seuil, `PATTERN_TIERS` est la source unique.

## UX

- **Menu principal** : 5e bouton `ROBOTS` inséré entre CONTINUE et OPTIONS.
  Le layout passe à `MENU_BTN: { x: 80, w: 200, h: 56, y0: 320, gap: 62 }`
  (dernier bouton à y 568-624, dans le canvas 640).
- **Écran SKINS (hangar)** : nouvel état `SKINS` (transitions MENU↔SKINS,
  Escape = retour). Contenu :
  - Titre `ROBOTS` (police boutons, comme les autres écrans).
  - Aperçu central : sprite idle du slot courant agrandi ×3 (192 px), au-
    dessus du décor parallaxe vivant (comme le menu). Skin verrouillé =
    sprite en silhouette noire (dessin via canvas hors-écran + composite
    `source-in`) + libellé `NIVEAU X` requis.
  - Nom du skin sous l'aperçu ; flèches `<` `>` de part et d'autre.
  - Navigation : ←/→ change de slot (réutilise `onAdjust` des options),
    boucle 4→0. Deux boutons partagés (`drawButton`) : `CHOISIR` (disabled
    si verrouillé ; label `ACTUEL` disabled si déjà sélectionné) et
    `RETOUR`. ↑/↓ + Enter/Espace, souris/tap, tout comme les autres menus.
  - À l'ouverture, le slot affiché est le skin sélectionné.
- **En jeu** : le robot utilise les sprites du skin sélectionné ; la flamme
  du réacteur et les particules prennent la couleur accent du skin
  (remplace le `#3ef0ff` codé en dur du renderer).

## Déblocage & persistance

- `skinUnlocked(i, bestLevel)` = `i === 0 || bestLevel >=
  CONFIG.PATTERN_TIERS[i]` — PROTO est toujours débloqué : un nouveau
  joueur a `bestLevel = 0` (< seuil 1) et doit quand même posséder son
  robot de départ.
- Sélection persistée en localStorage `jetpackbot.skin` (préférence
  d'appareil, comme les volumes — PAS dans le code de sauvegarde ; le
  déblocage se recalcule de `bestLevel`, qui EST dans le save).
- Garde au chargement : valeur absente/invalide/hors bornes/verrouillée
  pour le `bestLevel` courant → skin 0. (Cas réel : localStorage copié ou
  save restauré par code sur un autre appareil.)

## Architecture

- **`src/game/skins.js`** (nouveau, logique pure) : `SKINS` (table id/nom/
  accent), `skinUnlocked(i, bestLevel)`, `spriteKey(skin)` (`'robot'` pour
  0, `` `robot-s${skin}` `` sinon — préfixe des 3 clés sprites),
  `loadSkin(storage, bestLevel)`, `saveSkin(storage, skin)`.
- **`src/game/menu.js`** : `createSkinsMenu(unlocked, current, slot)` →
  boutons CHOISIR/RETOUR via `build` + géométrie `CONFIG.SKINS_BTN` ;
  bouton `robots` ajouté à `createMenu`.
- **`src/game/world.js`** : `world.skin` (chargé au `createWorld`),
  `world.skinsScreen = { slot }`, routage : activation menu `robots` →
  SKINS, `adjustSkins(world, dir)` (←/→), `press`/`navMenu`/`escapeAction`
  étendus à l'état SKINS, activation `choose` → `saveSkin` + `world.skin`,
  `back`/Escape → MENU.
- **`src/engine/state.js`** : état `SKINS` + transitions `MENU→SKINS`,
  `SKINS→MENU`.
- **`src/render/skins.js`** (nouveau) : écran hangar (titre, aperçu ×3 ou
  silhouette, nom/niveau requis, flèches, boutons partagés).
- **`src/render/renderer.js`** : sprites robot via `spriteKey(world.skin)` ;
  `#3ef0ff` (particules ligne ~63, flamme lignes ~100-103) remplacé par
  `SKINS[world.skin].accent`.
- **`src/game/music.js`** : `musicFor(SKINS) → 'music-menu'` (l'écran fait
  partie du menu ; ajout à `MENU_STATES`).
- **`src/config.js`** : `MENU_BTN` resserré (ci-dessus) + `SKINS_BTN`
  (géométrie des 2 boutons du hangar) + `SKINS_PREVIEW_Y` etc.
- **`src/main.js`** : imports + map des 12 nouveaux sprites.

## Assets (PixelLab)

12 sprites 64×64 : 4 skins × 3 poses (`robot-s{1..4}.png`,
`robot-s{1..4}-thrust-{0,1}.png`), générés par `pixellab.mjs edit` à partir
des 3 sprites existants (recoloration : même silhouette, même pose, palette
du thème). QC visuel contrôleur (cohérence de silhouette, lisibilité sur
fonds sombres, pas d'artefacts) ; candidats tracés dans `assets/preview/`.
Direction par skin :
- FORGE : carrosserie orange rouille, accents rouges, visée « métal chaud ».
- VENIN : vert acide, accents jaunes, visée « hazmat ».
- ORAGE : violet électrique, accents magenta, visée « supercellule ».
- NOVA : blanc cassé, accents dorés, visée « combinaison spatiale ».

## Décisions & rejets

- **Skin auto par monde (sans choix)** : rejeté — la roadmap demande un
  menu dédié et des skins « débloquables » ; le choix est la récompense.
- **Palette swap à l'exécution (filtre canvas)** : rejeté — qualité pixel
  art non garantie, et 12 sprites PixelLab restent bon marché.
- **Skin dans le code de sauvegarde** : rejeté — préférence d'appareil
  (convention volumes) ; le save v2 reste un chantier séparé.
- **Écran de « paliers » séparé (liste des récompenses)** : rejeté (YAGNI)
  — le hangar montre déjà verrouillé/déverrouillé + niveau requis, c'est la
  vue de progression.

## Tests (TDD)

- `tests/game/skins.test.js` : seuils (`skinUnlocked` aux frontières 1/3/5/
  7/10, bestLevel 2 → seul PROTO+rien, 10 → tout), `spriteKey` (0 →
  `robot`, 3 → `robot-s3`), `loadSkin` (absent → 0, `'2'` avec bestLevel 5
  → 2, `'4'` avec bestLevel 5 → 0, `'zorg'`/`'-1'`/`'9'` → 0),
  `saveSkin`/`loadSkin` aller-retour.
- `tests/game/menu.test.js` : `createMenu` a 5 boutons, `robots` en
  position 2, toujours enabled ; `createSkinsMenu` (CHOISIR disabled si
  verrouillé, label ACTUEL si sélectionné).
- `tests/game/world.test.js` : menu `robots` → SKINS ; ←/→ boucle les
  slots ; CHOISIR sur slot débloqué → `world.skin` + persistance + état
  inchangé (reste en SKINS, label devient ACTUEL) ; Escape/RETOUR → MENU ;
  CHOISIR verrouillé inactif ; `createWorld` charge le skin persisté.
- `tests/game/music.test.js` : `musicFor(SKINS) === 'music-menu'`.
- `tests/render/` : renderer utilise `robot-s2*` quand `world.skin = 2` et
  l'accent du skin pour particules/flamme (fixture recordingCtx existante).
- `npm test && npm run build` verts.

## Vérification finale

- Playwright : menu 5 boutons (rien ne déborde), hangar navigable au
  clavier, silhouette sur skin verrouillé, sélection persistée après
  reload, robot recoloré en jeu + flamme accent, zéro erreur console.
- **Gate Jael en jeu avant merge** (avec les gates décors + musiques —
  même session de jeu, le serveur :5199 sert la branche stackée).
