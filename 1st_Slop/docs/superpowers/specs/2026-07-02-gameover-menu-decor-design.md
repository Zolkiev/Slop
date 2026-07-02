# Game-over menu + décor persistant au restart — Design

**Date :** 2026-07-02
**Statut :** validé par Jael

## Objectif

Deux demandes liées :

1. À la mort, l'écran game-over devient un vrai menu de niveau avec un choix
   explicite « RECOMMENCER » (rejouer le niveau courant) en plus de « MENU »,
   au lieu du bouton MENU seul + tap-anywhere-retry actuel.
2. Recommencer un niveau (depuis la pause ou le game-over) doit réutiliser le
   **même décor** — aujourd'hui `resetRun` reroll `world.bgSet` à chaque reset,
   donc le fond change à chaque restart.

## Décisions de design

- **Politique décor (choix Jael) :** nouveau tirage de `bgSet` uniquement en
  entrant dans un niveau **différent** (level up, ou NEW GAME après une mort
  au-delà du niveau 1). Restart du même niveau = décor identique. Effet bonus :
  NEW GAME conserve le décor affiché derrière le menu (continuité visuelle).
- **Boutons game-over :** RECOMMENCER + MENU (2 boutons actifs), miroir de
  l'overlay pause — même usine `build`, même `drawButtons`, même nav clavier.
- **Tap-anywhere-retry supprimé :** il avalerait les clics hors boutons. Clic
  hors bouton = no-op. Escape → MENU inchangé.

## Architecture

Approche retenue : **miroir de la pause** — réutiliser l'infrastructure menu
existante plutôt que des boutons ad-hoc ou un nouvel état de machine.

### 1. Menu game-over

- `src/game/menu.js` — `createGameoverMenu()` via `build` :
  - `restart` « RECOMMENCER » (enabled)
  - `menu` « MENU » (enabled)
  - Géométrie : nouveau `CONFIG.GAMEOVER_BTN = { x: 80, w: 200, h: 56, y0: 384, gap: 72 }`
    (RECOMMENCER prend la place du bouton MENU actuel, MENU en dessous).
  - Focus initial : RECOMMENCER.
- `src/game/world.js` :
  - `world.gameover = createGameoverMenu()` dans `createWorld`.
  - Recréé à l'entrée en GAMEOVER (au moment du crash) pour reset le focus.
  - `press()` en GAMEOVER : `hitTest`/`activate` comme la pause —
    `restart` → `startLevel(world, world.level)` + PLAY ; `menu` → MENU ;
    null → no-op.
  - `navMenu` gère aussi l'état GAMEOVER.
- `src/render/renderer.js` :
  - Conserve titre GAME OVER, « Niveau N », « Best : niveau M ».
  - Supprime « Tap pour réessayer ».
  - `drawButtons(ctx, world.gameover, assets)` remplace le `drawButton` MENU
    ad-hoc.
- `src/config.js` : `GAMEOVER_MENU_BTN` supprimé, remplacé par `GAMEOVER_BTN`.

### 2. Décor persistant

- `src/game/world.js` : le reroll de `world.bgSet` sort de `resetRun` et va
  dans `startLevel`, conditionné :
  `if (level !== world.level) world.bgSet = Math.floor(world.rand() * CONFIG.BG_SET_COUNT)`
  (avant l'affectation `world.level = level`).
- Conséquences par appelant de `startLevel` :
  - pause `restart` (même niveau) → décor conservé ;
  - gameover `restart` (même niveau) → décor conservé ;
  - LEVEL_COMPLETE (`level + 1`) → nouveau tirage ;
  - NEW GAME (`level 1`) → nouveau tirage si on était au-delà du niveau 1,
    sinon décor du menu conservé.

### 3. Nit différé soldé

`hitTest` (`src/game/menu.js`) ignore désormais les boutons `disabled` —
supprime le footgun avant le câblage futur de Continue/Options. Aucun
changement de comportement visible aujourd'hui (`press` traitait déjà ces ids
en no-op).

## Tests

Vitest (logique pure) :

- `createGameoverMenu` : 2 boutons, ids/labels/enabled, focus initial.
- `press` en GAMEOVER : clic RECOMMENCER → PLAY même niveau ; clic MENU → MENU ;
  clic hors boutons → reste en GAMEOVER ; activation clavier (activate).
- `navMenu` en GAMEOVER : flèches déplacent le focus.
- Reset du focus : mourir, naviguer vers MENU, re-mourir → focus revenu sur
  RECOMMENCER.
- Décor (rand stubé) : restart même niveau → `bgSet` inchangé ;
  `startLevel(level + 1)` → reroll ; NEW GAME depuis niveau > 1 → reroll.
- `hitTest` sur bouton disabled → null.

Puis vérification visuelle Playwright avant merge (workflow habituel) :
écran game-over avec les 2 boutons, restart conservant le décor.

## Hors périmètre

- Câblage Continue/Options (sous-projets save system / options à venir).
- Ambiance/zones par palier (idée en file — la politique décor choisie reste
  compatible).
