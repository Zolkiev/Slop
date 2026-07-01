# Jetpack Bot — Menu d'intro & UI (Design)

**Date:** 2026-07-01
**Statut:** Validé (design) — prêt pour le plan d'implémentation
**Dossier projet:** `Slop/1st_Slop/`
**Dépend de:** Jetpack Bot V1 (`2026-06-30-jetpack-bot-design.md`), Niveaux & difficulté (`2026-06-30-levels-difficulty-design.md`)

## Objectif

Remplacer l'écran menu actuel (du **texte brut** dessiné sur le canvas dans la
branche `MENU`) par un **vrai menu d'intro** avec des assets UI pixel-art et des
**boutons interactifs** : New Game / Continue / Options. C'est la première brique
du *meta layer* (menu + save + audio) : elle pose l'échafaudage de navigation
même si Continue (save) et Options (audio) ne sont pas encore câblés.

Ce sous-projet ne construit **que** le menu et son UI. Le save system et
l'audio/options sont des sous-projets distincts, à venir.

## Décisions de design (validées)

- **Scope** : menu **complet** — les 3 boutons New Game / Continue / Options sont
  affichés. Continue et Options sont des **stubs grisés** (état `disabled`,
  non-focusables, clic = no-op) jusqu'à ce que leurs systèmes existent. Pas
  d'écran Options ce tour-ci.
- **Interaction** : **souris/tap ET clavier**. Boutons cliquables (hit-test sur
  coordonnées pointer) + navigation clavier (flèches haut/bas déplacent le focus
  sur les boutons *enabled*, Entrée/Espace active le bouton focus).
- **Assets** : **full PixelLab**, un sprite complet par bouton avec label intégré,
  en 3 états chacun (normal / focus / disabled) + un sprite logo. **Toute la
  matrice est générée maintenant** (10 sprites) pour ne plus avoir à régénérer
  quand save/audio arriveront — même si les états normal/focus de Continue/Options
  sont inutilisés ce tour.
- **Fond** : on **réutilise la scène parallax vivante** déjà rendue (ville
  cyberpunk animée) comme toile de fond du menu. Le menu se dessine par-dessus.
- **Robot idle** : le robot flotte (bob vertical léger) sur le menu, comme sur le
  titre actuel — détail d'ambiance, pas de gameplay.

## Architecture (approche retenue : module dédié + data-driven)

Deux nouveaux modules qui séparent **logique pure** (testable) et **rendu** :

### `src/game/menu.js` (nouveau — logique pure, sans canvas)

- `createMenu()` → `{ buttons, focus }`.
  - `buttons` : tableau ordonné de `{ id, label, x, y, w, h, enabled }`.
    - `newgame` (enabled: true), `continue` (enabled: false),
      `options` (enabled: false).
  - `focus` : index du bouton surligné au clavier (initialisé sur le premier
    bouton *enabled*).
- `hitTest(menu, px, py)` → `id` du bouton dont le rect contient `(px, py)`,
  sinon `null`. Ignore les bords hors rect. (N'exclut pas les disabled : le
  routage no-op est géré par l'action, cf. world.)
- `moveFocus(menu, dir)` → avance `focus` de `dir` (±1) vers le prochain bouton
  **enabled**, en sautant les disabled ; wrap circulaire. No-op s'il n'existe
  aucun bouton enabled.
- `focusedId(menu)` → `id` du bouton actuellement focus (pour le rendu du surlignage).
- `activate(menu)` → `id` du bouton focus **s'il est enabled**, sinon `null`.

Tailles/positions dérivées de constantes (cf. Layout) — pas de magie inline.

### `src/render/menu.js` (nouveau — rendu)

- `renderMenu(ctx, world, assets)` :
  1. Logo `ui-logo` centré en haut.
  2. Pour chaque bouton : choisit le sprite selon l'état —
     - `disabled` → sprite `*-disabled`,
     - sinon si `id === focusedId(menu)` → sprite `*-focus`,
     - sinon → sprite `*-normal`.
     Dessine le sprite au rect `(x, y, w, h)` du bouton.
  3. Robot idle qui bob (réutilise `assets.robot`, offset sinusoïdal sur `world.tick`).
  4. `Best: niveau N` en bas (depuis `world.score.bestLevel`).

Le fond parallax + twinkles + ambiance est déjà dessiné par `renderWorld` avant
l'appel ; `renderMenu` ne redessine pas le fond.

## Assets PixelLab

Générés via `scripts/pixellab.mjs`, palette synthwave (cyan `#3ef0ff`,
magenta `#ff2e88`, sur fond sombre `#0a0a14`). Boutons à **taille fixe identique**
(cible **200×56**) pour s'empiler proprement.

| Fichier | Rôle | État |
|---|---|---|
| `ui-logo.png` | Titre « JETPACK BOT » pixel-art | — |
| `btn-newgame.png` | Bouton New Game (label intégré) | normal |
| `btn-newgame-focus.png` | New Game surligné | focus |
| `btn-newgame-disabled.png` | New Game grisé (réserve) | disabled |
| `btn-continue.png` | Bouton Continue (label intégré) | normal |
| `btn-continue-focus.png` | Continue surligné | focus |
| `btn-continue-disabled.png` | Continue grisé | disabled |
| `btn-options.png` | Bouton Options (label intégré) | normal |
| `btn-options-focus.png` | Options surligné | focus |
| `btn-options-disabled.png` | Options grisé | disabled |

**10 sprites.** Ce tour-ci, seuls sont *affichés* : `btn-newgame` (normal),
`btn-newgame-focus` (focus), `btn-continue-disabled`, `btn-options-disabled`. Les
autres existent pour le futur (Continue actif avec save, Options actif avec audio).

> Note d'exécution : les labels intégrés en pixel-art sont fragiles. Le plan
> d'implémentation prévoira une boucle de génération + vérification visuelle des
> sprites (lisibilité du texte, cohérence des 3 états) avant de câbler le rendu.

## Input & data flow — `src/engine/input.js`

L'input actuel appelle `onPress()` sans argument (tap n'importe où / Espace). On
l'étend **sans casser le gameplay** :

- `pointerdown` : calcule la position `(x, y)` en **espace canvas** (360×640) à
  partir de `getBoundingClientRect()` et du ratio d'échelle du canvas, puis
  `onPress({ x, y })`.
- Clavier :
  - `Space` / `Enter` (sans repeat) → `onPress()` (sans coords → interprété comme
    « activer le focus » en menu ; comme « thrust/restart » en jeu).
  - `ArrowUp` → `onNav(-1)`, `ArrowDown` → `onNav(+1)` (nouveau callback, actif
    seulement en menu ; ignoré ailleurs).

`main.js` branche `onPress` → `press(world, pointer)` et `onNav` → `navMenu(world, dir)`.

### Routage — `src/game/world.js`

- `createWorld` : ajoute `menu: createMenu()`.
- `press(world, pointer)` :
  - État `MENU` :
    - si `pointer` fourni (souris/tap) → `id = hitTest(menu, pointer.x, pointer.y)`.
    - sinon (clavier Espace/Entrée) → `id = activate(menu)`.
    - dispatch sur `id` : `newgame` → `startLevel(world, 1)` + `sm.to(PLAY)` ;
      `continue` / `options` → **no-op** (stubs) ; `null` → no-op.
  - États `PLAY` / `LEVEL_COMPLETE` / `GAMEOVER` : comportement actuel **inchangé**
    (le `pointer` est ignoré).
- `navMenu(world, dir)` : si état `MENU` → `moveFocus(world.menu, dir)` ; sinon no-op.

Note : un clic souris sur un bouton **disabled** en menu ne fait rien (dispatch
no-op), mais reste distinct d'un clic dans le vide — les deux sont des no-op ici.

### Rendu — `src/render/renderer.js`

La branche `MENU` de `renderWorld` **délègue** à `renderMenu(ctx, world, assets)`
au lieu de dessiner le texte titre/instructions actuel. Les autres états (PLAY,
LEVEL_COMPLETE, GAMEOVER) sont inchangés.

### Chargement — `src/main.js`

Importe les 10 nouveaux PNG et les ajoute à l'objet passé à `loadImages` (clés
identiques aux noms de fichiers sans extension, ex. `'btn-newgame-focus'`).

## Layout (canvas 360×640)

Constantes de placement (dans `config.js` ou en tête de `menu.js`) :

- Logo : centré horizontalement, `y ≈ 120`.
- Robot idle : centré, `y ≈ 250`, bob sinusoïdal d'amplitude ~6px.
- Pile de boutons : largeur 200, centrés en X (`x = (360-200)/2 = 80`) ;
  premier bouton `y ≈ 340`, pas vertical ~72px → `340 / 412 / 484`.
- `Best: niveau N` : centré, `y ≈ 600`.

## Gestion d'erreurs

- Sprite UI manquant → `loadImages` **rejette déjà** → écran d'erreur existant de
  `main.js` (aucun nouveau chemin d'erreur à créer).
- `hitTest` hors de tout bouton → `null` → no-op propre.
- `moveFocus` sans aucun bouton enabled → no-op (pas de boucle infinie, pas de
  focus invalide).
- `activate` sur focus disabled → `null` → no-op.

## Tests (Vitest — logique pure, pas de canvas)

`tests/game/menu.test.js` (nouveau) :
- `createMenu` : 3 boutons dans l'ordre attendu ; `newgame` enabled, les 2 autres
  disabled ; `focus` initial sur `newgame`.
- `hitTest` : point au centre d'un bouton → son `id` ; point hors de tous → `null` ;
  points sur les 4 bords (inclusif/exclusif défini et testé).
- `moveFocus` : depuis `newgame`, `+1` **saute** `continue`/`options` (disabled) et
  wrap → reste sur `newgame` (seul enabled) ; comportement symétrique en `-1`.
  Cas de contrôle : si on rend tous enabled, `moveFocus` parcourt bien 0→1→2→0.
- `activate` : sur `newgame` (enabled) → `'newgame'` ; sur un disabled → `null`.

`tests/game/world.test.js` (étendu) :
- `press(world, {centre de New Game})` en `MENU` → état `PLAY`, `level === 1`.
- `press(world, {centre de Continue})` en `MENU` → reste `MENU` (no-op).
- `press(world)` (clavier, focus sur New Game) en `MENU` → `PLAY`.
- `press(world, {dans le vide})` en `MENU` → reste `MENU`.
- `navMenu(world, +1)` en `MENU` ne change pas d'état ; en `PLAY` → no-op.
- Non-régression : `press(world)` en `PLAY` fait toujours thrust ; en `GAMEOVER`
  relance le même niveau.

Vérification visuelle (hors tests auto, cf. workflow) : lancer le jeu, screenshot
du menu, valider lisibilité des labels, surlignage clavier, clic New Game → jeu.

## Hors scope (sous-projets suivants)

- **Save system** + flow New Game vs Continue (Continue reste grisé ici).
- **Audio/Options** : écran Options, volumes SFX/musique (Options reste grisé ici).
- **Musique** par thème de niveau.
- SFX de survol/clic de bouton (dépend de l'audio).
- Portail de sortie visuel, victory juice, zones d'ambiance (idées en file).
