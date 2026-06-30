# Jetpack Bot — Niveaux & difficulté progressive (Design)

**Date:** 2026-06-30
**Statut:** Validé (design) — prêt pour le plan d'implémentation
**Dossier projet:** `Slop/1st_Slop/`
**Dépend de:** Jetpack Bot V1 (`2026-06-30-jetpack-bot-design.md`)

## Objectif

Transformer la difficulté plate de la V1 (vitesse et gaps constants) en une
**progression par niveaux discrets, infinie et de plus en plus dure**. Chaque
niveau se franchit en passant un nombre fixe de portes ; le niveau suivant est
plus rapide avec des ouvertures plus étroites. Le but est de créer la boucle
« encore un essai » : objectif court toujours visible, retry instantané sur le
mur où l'on bloque.

## Décisions de design (validées)

- **Structure** : niveaux discrets, **infinis**, difficulté montante par formule
  (aucun contenu à dessiner à la main).
- **Condition de fin de niveau** : **passer N portes** (N fixe = 10, retunable).
- **Sur crash** : on **recommence le niveau en cours** (même difficulté). Pas de
  reset global ni de système de vies.
- **Persistance** : on mémorise le **niveau max atteint** (`bestLevel`) en
  localStorage.
- **Départ** : depuis le menu, chaque session **démarre au niveau 1**. Le menu
  affiche seulement le record (`Best: niveau Y`).
- La métrique de progression principale **est le numéro de niveau** (on ne garde
  pas de score abstrait cumulé — YAGNI).

## Boucle de jeu (machine à états)

On ajoute un état `LEVEL_COMPLETE` à la machine existante
(`MENU` / `PLAY` / `GAMEOVER`).

```
MENU            --press--> PLAY (niveau 1)
PLAY            --N portes franchies--> LEVEL_COMPLETE
LEVEL_COMPLETE  --press--> PLAY (niveau +1, plus dur)
PLAY            --crash--> GAMEOVER
GAMEOVER        --press--> PLAY (MÊME niveau, rejoué)
```

Conséquence : on reste sur le niveau où l'on bloque jusqu'à le passer ; on
n'avance que sur réussite.

## Modèle de difficulté — `src/game/level.js` (nouveau)

Module **pur et testable**, sans état global. Toutes les valeurs sont dérivées du
numéro de niveau via des constantes de `config.js`.

- `gateGoalForLevel(level)` → nombre de portes à passer (constante
  `GATES_PER_LEVEL`, identique à chaque niveau pour la V1).
- `difficultyForLevel(level)` → `{ scrollSpeed, gapMin, gapMax }` :
  - **Vitesse** : `scrollSpeed = min(SPEED_BASE + (level-1) * SPEED_STEP, SPEED_MAX)`
    — monte puis plafonne pour rester jouable.
  - **Gap** : `gapMin = max(GAP_BASE - (level-1) * GAP_SHRINK, GAP_FLOOR)`, puis
    `gapMax = gapMin + GAP_RANGE`. Au niveau 1 cela donne `160` / `210`, soit
    exactement le couple V1.

Propriétés garanties (couvertes par tests) :
- `scrollSpeed` croît avec `level` puis se stabilise à `SPEED_MAX`.
- `gapMin` décroît avec `level` puis se stabilise à `GAP_FLOOR`.
- Au **niveau 1**, `scrollSpeed`, `gapMin`, `gapMax` reproduisent exactement les
  valeurs constantes de la V1 (`SCROLL_SPEED`, `GAP_MIN`, `GAP_MAX`).

## Constantes — `config.js`

Nouveaux réglages (l'équilibrage = changer ces chiffres) :

| Constante | Rôle | Valeur de départ |
|---|---|---|
| `GATES_PER_LEVEL` | Portes pour finir un niveau | `10` |
| `SPEED_BASE` | Vitesse niveau 1 (= `SCROLL_SPEED` actuel) | `150` |
| `SPEED_STEP` | Gain de vitesse par niveau | `12` |
| `SPEED_MAX` | Plafond de vitesse | `300` |
| `GAP_BASE` | Gap (min) niveau 1 (= `GAP_MIN` actuel) | `160` |
| `GAP_SHRINK` | Rétrécissement par niveau | `6` |
| `GAP_FLOOR` | Gap minimal absolu | `110` |
| `GAP_RANGE` | Étendue aléatoire au-dessus de `gapMin` (= `GAP_MAX-GAP_MIN`) | `50` |

`SCROLL_SPEED`, `GAP_MIN`, `GAP_MAX` restent (référencés ailleurs) mais le monde
utilise désormais la difficulté **courante** stockée dans `world`.

## Intégration — `src/game/world.js`

État ajouté à `world` :
- `level` (entier ≥ 1)
- `gatesThisLevel` (0..gateGoal)
- `scrollSpeed`, `gapMin`, `gapMax` (difficulté courante du niveau)

Helper `startLevel(world, level)` :
- fixe `world.level = level` et applique `difficultyForLevel(level)`.
- reset robot, obstacles, particules ; `gatesThisLevel = 0`.

Modifs de flux :
- `spawnObstacle` utilise `world.gapMin/gapMax` (au lieu de `CONFIG.GAP_*`).
- Le défilement obstacles **et** parallax utilise `world.scrollSpeed` (au lieu de
  `CONFIG.SCROLL_SPEED`).
- Dans `updateWorld`, à chaque porte franchie : `gatesThisLevel += 1` ; si
  `gatesThisLevel >= gateGoalForLevel(level)` → `sm.to(LEVEL_COMPLETE)`.
- `press(world)` :
  - `MENU` → `startLevel(world, 1)`, `sm.to(PLAY)`.
  - `PLAY` → poussée (inchangé).
  - `LEVEL_COMPLETE` → `startLevel(world, level + 1)`, `sm.to(PLAY)`.
  - `GAMEOVER` → `startLevel(world, level)` (même niveau), `sm.to(PLAY)`.
- Au crash : on `finalize` le `bestLevel` (cf. score) avant `sm.to(GAMEOVER)`.

## Persistance — `src/game/score.js`

Repurpose vers la progression par niveau :
- `createScore(storage)` lit `bestLevel` depuis localStorage (clé
  `jetpackbot.bestLevel`).
- `level` et `gatesThisLevel` vivent dans `world` (état de run, non persisté) ;
  `score` ne gère que `bestLevel` (persisté). Les champs V1 `score.current` /
  `score.best` (gates) sont retirés.
- `finalize(world, storage)` : `if (world.level > bestLevel) { bestLevel = level;
  persist }`. Appelé au crash **et** à l'entrée en `LEVEL_COMPLETE` (pour que
  finir le niveau N enregistre déjà la progression).

## HUD — `src/render/renderer.js`

- **PLAY** : `Niv X` en haut, et la progression de portes `3/10` (texte ou petite
  barre horizontale de `gatesThisLevel / goal`).
- **LEVEL_COMPLETE** : `NIVEAU X ✓` + « Tap pour continuer ». Beat de victoire
  bref ; crochet prévu pour un flash cyan / juice ultérieur (hors scope V1 niveaux).
- **GAMEOVER** : `GAME OVER`, `Niveau X`, `Best: niveau Y`, « Tap pour réessayer ».
- **MENU** : titre + `Best: niveau Y`.

## Tests

`tests/game/level.test.js` (nouveau) :
- `gateGoalForLevel` renvoie `GATES_PER_LEVEL`.
- `difficultyForLevel(1)` == valeurs V1 exactes.
- `scrollSpeed` monotone croissante puis plafonnée à `SPEED_MAX`.
- `gapMin` monotone décroissante puis plancher à `GAP_FLOOR`.

`tests/game/world.test.js` (étendu) :
- Franchir `GATES_PER_LEVEL` portes → état `LEVEL_COMPLETE`.
- `press` en `LEVEL_COMPLETE` → `PLAY`, `level` incrémenté, difficulté mise à jour,
  `gatesThisLevel` remis à 0.
- crash → `GAMEOVER` ; `press` en `GAMEOVER` → `PLAY`, **même** `level`.
- `press` en `MENU` → niveau 1.

`tests/game/score.test.js` (étendu/adapté) :
- `bestLevel` persiste le niveau max atteint (crash et level-complete).
- `bestLevel` ne régresse pas si on rejoue un niveau inférieur.

## Hors scope (plus tard)

- Portail de sortie visuel en fin de niveau (sprite dédié).
- Juice de fin de niveau (flash cyan, son de victoire).
- Variation d'ambiance/zone par palier de niveaux.
- Reprise de session au `bestLevel` plutôt que niveau 1.
- Portes par niveau croissantes (`GATES_PER_LEVEL` reste fixe en V1).
