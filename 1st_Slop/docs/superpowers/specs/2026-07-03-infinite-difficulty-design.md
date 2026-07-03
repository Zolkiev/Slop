# Difficulté infinie — portes croissantes + motifs par tiers — Design

**Date :** 2026-07-03
**Statut :** validé par Jael (« Ça me va » — plafond 30 et détails délégués)

## Objectif

Aujourd'hui la difficulté plafonne vers le niveau 13 (vitesse au max, gap au
plancher) et chaque niveau se ressemble : 10 portes placées au hasard uniforme,
indépendantes. On veut : **des niveaux plus longs** (objectif croissant) et
**des portes de plus en plus dures à passer** via des motifs reconnaissables
qui se débloquent par tranches de niveaux — le joueur doit *sentir* le
niveau 5 différent du niveau 3, pas juste « plus rapide ».

Approche retenue (B) : scaling continu étendu + **pool de motifs par tiers**.
Écartées : scaling continu seul (pas de sensation de nouveauté), générateur à
budget de difficulté (overkill pour un flappy-like, inéquilibrable à l'oreille).

Les tiers posés ici serviront de socle aux sous-projets suivants (décors par
tier, musiques par thème, paliers de skins).

## Portes par niveau (`gateGoalForLevel`)

`min(GATES_BASE + GATES_STEP × (niveau−1), GATES_CAP)` avec GATES_BASE 10,
GATES_STEP 5, **GATES_CAP 30** → 10, 15, 20, 25, 30, 30… (plafond atteint au
niveau 5). Choix game-feel : mourir à la porte 28/30 motive, 28/55 fait
rage-quit. Le HUD affiche déjà `portes/objectif` — aucun changement de rendu.

## Scaling continu (`difficultyForLevel` étendu)

Existant conservé : vitesse 150 + 12/nv (cap 300), gapMin 160 − 6/nv
(plancher 110), gapMax = gapMin + 50. Nouveaux axes (n = niveau − 1) :

- **Espacement** : `SPACING_BASE 230 − SPACING_STEP 5 × n`, plancher
  `SPACING_FLOOR 175` (atteint nv 12). Moins de temps de réaction.
- **Capacités physiques par niveau** (bornes pour les motifs, calculées — pas
  des constantes magiques) : temps entre portes `t = spacing / scrollSpeed`
  (1,53 s au nv 1 → 0,58 s au taquet), d'où :
  - `deltaUp = SAFETY_UP 0.55 × THRUST × t` (~320 px nv 1 → ~122 px au taquet)
  - `deltaDown = SAFETY_DOWN 0.6 × (MAX_FALL × t − MAX_FALL² / (2 × GRAVITY))`
    (~510 px nv 1 → ~135 px au taquet)
  Asymétrique exprès : monter est la contrainte, descendre pardonne plus.

`difficultyForLevel(level)` retourne désormais
`{ scrollSpeed, gapMin, gapMax, spacing, deltaUp, deltaDown, tier }`.
`tierForLevel(level)` : 1 (nv 1-2), 2 (nv 3-4), 3 (nv 5-6), 4 (nv 7-9),
5 (nv 10+).

## Motifs (`src/game/patterns.js`, nouveau module pur)

Un **motif** = fonction pure `(rand, prevGapY, diff) → salve` où une salve est
une liste de 3 à 5 portes `{ gapY, gapH, spacing }`. Les deltas s'expriment en
fractions des capacités `deltaUp`/`deltaDown` du niveau — un motif est donc
automatiquement calibré à la vitesse courante. Tout `gapY` est clampé à
`[GAP_MARGIN, HEIGHT − GAP_MARGIN − gapH]` ; si le clamp casse la direction
d'un zigzag, elle est miroitée (jamais de porte hors écran, jamais de motif
dégénéré).

| Motif | Salve | Comportement | Débloqué au tier |
|---|---|---|---|
| FLOW | 3-5 | marche aléatoire douce, delta ≤ 0.35 × capacité directionnelle | 1 |
| ESCALIER | 4 | montée OU descente monotone, pas de 0.5-0.7 × capacité | 2 |
| ZIGZAG | 4 | alternance haut/bas forcée, amplitude 0.6-1.0 × capacité | 3 |
| COULOIR | 3 | même hauteur (±10 px), gapH réduit à max(GAP_FLOOR, gapMin−15), spacing ×0.9 | 4 |
| CHICANE | 4-5 | zigzag ample 0.7-1.0 × capacité + spacing ×0.85 (jamais < 160 px absolu) | 5 |

**Sélection** : `nextSalve(rand, prevGapY, diff)` tire un motif dans le pool
du tier, le motif le plus récent du tier pesant double (le joueur rencontre la
nouveauté souvent). Tirage seedé via le `world.rand` existant (runs
reproductibles à seed égal).

**Ré-entrée douce** : la première salve après un début/retry de niveau est
toujours FLOW, ancrée sur `HEIGHT/2` (position de spawn du robot).

## Intégration (`world.js`, `obstacles.js`, `config.js`)

- `world.patternQueue` (file de portes) + `world.nextSpacing` : `spawnObstacle`
  dépile la porte suivante ; file vide → `nextSalve(...)` la remplit avec
  `prevGapY` = gapY de la dernière porte spawné.
- `needsSpawn(obstacles, spawnX, spacing)` : le spacing devient un paramètre
  (celui porté par la prochaine porte) au lieu du CONFIG fixe.
- `startLevel`/`resetRun` vident la file (le retry régénère des salves).
- `randomGapY` n'est plus utilisé par le spawn (les motifs décident) — supprimé
  si plus aucun appelant.
- Nouvelles clés CONFIG : `GATES_BASE 10, GATES_STEP 5, GATES_CAP 30,
  SPACING_BASE 230, SPACING_STEP 5, SPACING_FLOOR 175, SAFETY_UP 0.55,
  SAFETY_DOWN 0.6, PATTERN_TIERS [1, 3, 5, 7, 10]` (GATES_PER_LEVEL supprimée).

Aucun changement : rendu, HUD (déjà `gatesThisLevel/gateGoalForLevel`), save
(bestLevel), musiques, états.

## Hors périmètre

- Nouveaux types d'obstacles (portes mobiles, doubles murs) — futur si les
  motifs ne suffisent pas.
- Décors/musiques par tier, paliers de skins → sous-projets 2-4.
- Rééquilibrage de la physique du robot (GRAVITY/THRUST intouchés).

## Vérification

- TDD sur : `gateGoalForLevel` (10/15/…/30 plafonné), `difficultyForLevel`
  étendu (spacing plancher, deltas décroissants avec la vitesse, tiers),
  chaque motif (bornes écran, deltas ≤ capacités directionnelles, tailles de
  salve, COULOIR ≥ GAP_FLOOR, CHICANE ≥ 160 px, miroir de clamp), sélection
  (pool par tier, poids double du plus récent, déterminisme seedé),
  intégration world (file consommée, retry vide la file, première salve FLOW).
- **Test de jouabilité systémique** : pour chaque niveau 1..20, générer 200
  salves et vérifier qu'aucun couple de portes consécutives n'excède les
  capacités physiques du niveau (le garde-fou est un invariant, pas une
  intention).
- `npm test` + build + vérif Playwright : screenshots en jeu (motifs qui
  s'enchaînent sans trou ni chevauchement, portes dans l'écran) et HUD qui
  affiche bien `/10` au niveau 1 (l'objectif croissant se lit dans le HUD).
- **Gate final : Jael joue** — critères : niveau 1-2 plus lisible qu'avant
  (fini les sauts brutaux du hasard uniforme), sensation de nouveauté aux
  niveaux 3/5/7/10, aucun passage impossible ressenti.
