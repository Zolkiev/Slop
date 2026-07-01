# Jetpack Bot — Pause & retour menu (+ fix logo) (Design)

**Date:** 2026-07-01
**Statut:** Validé (design) — prêt pour le plan d'implémentation
**Dossier projet:** `Slop/1st_Slop/`
**Dépend de:** Menu d'intro & UI (`2026-07-01-intro-menu-ui-design.md`)

## Objectif

Corriger deux problèmes remontés après le merge du menu d'intro :

1. **Aucune navigation depuis le jeu.** Une fois en `PLAY`, rien ne permet de
   mettre en pause ni de revenir au menu principal. On ajoute un état **PAUSE**
   (bouton ⏸ HUD + touche Échap) avec un overlay à 4 actions, et on câble enfin
   le retour au menu depuis **game over**.
2. **Logo tronqué.** Le sprite `ui-logo.png` généré contient un petit robot
   décoratif coupé au bord haut-gauche. On régénère le logo proprement.

## Décisions de design (validées)

- **Déclencheur pause** : bouton **⏸ cliquable** dans le HUD (haut-droite, marche
  tap mobile + desktop) **ET** touche **Échap**.
- **Overlay PAUSE — 4 boutons** : **Reprendre**, **Recommencer** (le niveau
  courant), **Menu principal**, **Options** (stub grisé, activé plus tard avec le
  sous-projet audio, comme sur le menu principal).
- **Menu principal depuis PAUSE** : abandonne le run en cours (retour à l'écran
  titre). Le `bestLevel` reste persisté (déjà géré).
- **Game over → menu** : on câble `GAMEOVER → MENU` (transition déjà autorisée
  mais jamais déclenchée) via un bouton **Menu** tappable + Échap ; un tap ailleurs
  = retry (comportement actuel conservé).
- **Icône ⏸** : **dessinée au canvas** (2 barres dans un carré arrondi néon), pas
  un sprite — fiable et nette à petite taille.
- **Boutons pause** : **full-PixelLab** (cohérence avec le menu d'intro).
- **Gel en PAUSE** : `updateWorld` gèle le gameplay (early-return, comme les
  autres états non-PLAY) ; la scène figée reste visible sous un voile sombre.

## Machine à états — `src/engine/state.js`

Ajout de l'état `PAUSE`. Transitions :

```
MENU            --press New Game-->        PLAY
PLAY            --N portes-->              LEVEL_COMPLETE
PLAY            --crash-->                 GAMEOVER
PLAY            --⏸ / Échap-->             PAUSE
PAUSE           --Reprendre / Échap-->     PLAY
PAUSE           --Recommencer-->           PLAY (startLevel niveau courant)
PAUSE           --Menu principal-->        MENU
LEVEL_COMPLETE  --press-->                 PLAY
GAMEOVER        --press (retry)-->         PLAY
GAMEOVER        --Menu / Échap-->          MENU
```

`TRANSITIONS` mis à jour : `PLAY: [GAMEOVER, LEVEL_COMPLETE, PAUSE]`,
`PAUSE: [PLAY, MENU]`. `GAMEOVER: [PLAY, MENU]` existe déjà.

## Réutilisation de l'infra menu — `src/game/menu.js`

Les helpers `hitTest/moveFocus/activate/focusedId` sont **génériques** (ils
opèrent sur `{buttons, focus}`) → on les réutilise tels quels pour l'overlay pause.

Nouveau `createPauseMenu()` → `{buttons, focus}` avec 4 boutons dans l'ordre :
- `resume` (enabled), `restart` (enabled), `menu` (enabled), `options` (disabled).
- `focus` initial sur le premier enabled (`resume`).
- Géométrie depuis `CONFIG.PAUSE_BTN` (pile de 4, centrée).

## Intégration — `src/game/world.js`

État ajouté à `world` :
- `pause: createPauseMenu()`.
- On **réutilise `world.menuTick`** (incrémenté chaque frame) pour l'anim de focus
  de l'overlay pause — pas de nouveau champ.

Routage — `press(world, pointer)` par état :
- **PLAY** : si `pointer` touche le rect de l'icône ⏸ (`CONFIG.PAUSE_ICON`) →
  `sm.to(PAUSE)`. Sinon poussée (`applyThrust` + event `thrust`) — inchangé. Un
  press clavier (Espace, sans pointer) reste une poussée.
- **PAUSE** : `id = pointer ? hitTest(world.pause,…) : activate(world.pause)`, puis
  dispatch :
  - `resume` → `sm.to(PLAY)`.
  - `restart` → `startLevel(world, world.level)` + `sm.to(PLAY)`.
  - `menu` → `sm.to(MENU)`.
  - `options` / `null` → no-op.
- **GAMEOVER** : si `pointer` touche le rect du bouton Menu
  (`CONFIG.GAMEOVER_MENU_BTN`) → `sm.to(MENU)`. Sinon retry
  (`startLevel(world, world.level)` + `sm.to(PLAY)`) — comportement actuel.
- **MENU / LEVEL_COMPLETE** : inchangés.

Nouvel export `escapeAction(world)` (lié à la touche Échap) :
- `PLAY` → `sm.to(PAUSE)` ; `PAUSE` → `sm.to(PLAY)` ; `GAMEOVER` → `sm.to(MENU)` ;
  sinon no-op.

`navMenu(world, dir)` étendu : agit en `MENU` (sur `world.menu`) **et** en `PAUSE`
(sur `world.pause`).

`updateWorld` : le gel existant (`if (sm.get() !== PLAY) return;` après les
couches/parallax) couvre déjà PAUSE → le gameplay est figé, le parallax continue
de défiler en fond (léger mouvement d'ambiance, acceptable). `menuTick` continue
de s'incrémenter (première ligne).

## Input — `src/engine/input.js`

- Ajoute la touche **Escape** (`e.code === 'Escape'`, sans repeat) → nouveau
  callback `onEscape()`.
- `main.js` branche `onEscape` → `escapeAction(world)`.
- Le bouton ⏸ HUD et le bouton Menu de game over passent par le `press(pointer)`
  existant (hit-test dans `world.js`) — pas de nouveau chemin d'input.

## Assets

**Boutons pause (PixelLab, 200×56, palette synthwave)** — 6 nouveaux sprites :

| Fichier | Label | État |
|---|---|---|
| `btn-resume.png` / `btn-resume-focus.png` | REPRENDRE | normal / focus |
| `btn-restart.png` / `btn-restart-focus.png` | RECOMMENCER | normal / focus |
| `btn-menu.png` / `btn-menu-focus.png` | MENU | normal / focus |

- **Options en pause** réutilise `btn-options-disabled.png` (existant).
- **Bouton Menu de game over** réutilise `btn-menu.png` / `btn-menu-focus.png`.
- Risque : **RECOMMENCER** (11 lettres) peut être serré à 200×56 → on *probe*
  d'abord ; **fallback label REJOUER** si illisible (décidé à la vérif visuelle).

**Logo** : régénérer `ui-logo.png` avec une description sans personnage/robot
décoratif (« logo texte seul, pas de mascotte »), re-crop des marges, vérif
visuelle. Remplace le fichier existant.

**Icône ⏸** : aucun asset — dessinée au canvas dans le HUD.

## Rendu — `src/render/`

- **`renderer.js`** :
  - Branche `PLAY` (HUD) : dessine l'icône ⏸ au canvas (haut-droite, rect
    `CONFIG.PAUSE_ICON`).
  - Branche `PAUSE` : délègue à `renderPause(ctx, world, assets)`.
  - Branche `GAMEOVER` : ajoute le bouton Menu (sprite `btn-menu` au rect
    `CONFIG.GAMEOVER_MENU_BTN`) en plus du texte existant.
  - La section-4 robot reste dessinée hors MENU → en PAUSE le robot figé reste
    visible (voulu).
- **`src/render/menu.js`** ou nouveau **`src/render/pause.js`** : `renderPause` —
  voile `rgba(10,10,20,0.7)` plein écran, titre « PAUSE », puis les 4 boutons via
  la même sélection de sprite d'état que `renderMenu` (disabled → `btn-*-disabled`,
  focus → `btn-*-focus`, sinon `btn-*`). Décision d'implémentation : factoriser la
  sélection de sprite + le dessin d'une pile de boutons en un helper partagé entre
  `renderMenu` et `renderPause` (DRY), plutôt que dupliquer.

## Constantes — `src/config.js`

| Constante | Rôle | Valeur |
|---|---|---|
| `PAUSE_BTN` | Géométrie pile 4 boutons pause | `{ x:80, w:200, h:56, y0:230, gap:72 }` |
| `PAUSE_TITLE_Y` | Y du titre « PAUSE » | `170` |
| `PAUSE_ICON` | Rect de l'icône ⏸ HUD (hit-test + dessin) | `{ x:324, y:16, w:24, h:24 }` |
| `GAMEOVER_MENU_BTN` | Rect du bouton Menu en game over | `{ x:80, y:384, w:200, h:56 }` |

## Tests

`tests/game/menu.test.js` (étendu) :
- `createPauseMenu` : 4 boutons ordonnés `['resume','restart','menu','options']` ;
  resume/restart/menu enabled, options disabled ; focus initial sur `resume`.
- `moveFocus` sur le pause menu saute `options` (disabled).

`tests/game/world.test.js` (étendu) :
- `press` en PLAY sur le rect ⏸ → `PAUSE` ; ailleurs → poussée (toujours PLAY).
- `escapeAction` : PLAY→PAUSE, PAUSE→PLAY, GAMEOVER→MENU, no-op ailleurs.
- `press` en PAUSE : resume→PLAY ; restart→PLAY + `level` inchangé +
  `gatesThisLevel===0` ; menu→MENU ; clic sur Options (disabled)→reste PAUSE.
- `press` en GAMEOVER sur le rect du bouton Menu → MENU ; ailleurs → retry (PLAY).
- `navMenu` agit en PAUSE (déplace `world.pause.focus`).
- Gel : `updateWorld` en PAUSE n'avance pas le robot (position inchangée).

`tests/render/` : test fake-ctx pour `renderPause` — sélection de sprite d'état
(resume focus → `btn-resume-focus`, options → `btn-options-disabled`).

## Hors scope (plus tard)

- Écran **Options** réel (volumes SFX/musique) — active le bouton Options du menu
  ET de la pause. Sous-projet audio.
- **Save system** (bouton Continue du menu principal).
- SFX de survol/clic de bouton (dépend de l'audio).
