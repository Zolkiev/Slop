# Skins v3 — roster à 12 + fix couleurs des recolors — Design

**Date :** 2026-07-08 · **Statut :** validé par Jael (roster +6, seuils au
niveau, approche C hybride)

## Objectif

Passer de 6 à **12 robots jouables** : 6 nouveaux skins vraiment originaux
(silhouettes distinctes, pas des recolors) débloqués aux niveaux
18/22/26/32/40/50, en industrialisant la recette VORTEX validée le 07/07.
Au passage, **corriger les incohérences de couleurs des 4 recolors existants**
(FORGE/VENIN/ORAGE/NOVA) — demande explicite de Jael : « le jetpack qui est
rouge sur le premier sprite et qui passe au bleu sur le deuxième pour
l'impulsion. Des petits détails […] qui font toute la différence. »

**Budget :** solde PixelLab = **2000 générations** (mesuré le 08/07,
`GET /v2/balance`). Prévu ≈ 96 crédits (6 appels `generate` × 16) + réserve
de 2-3 appels `edit` (~48). Plafond du sous-projet : **200 crédits**. Solde
re-vérifié après chaque appel.

## Défauts constatés sur les recolors (planche zoomée du 08/07)

| Skin | Défaut |
|---|---|
| FORGE (s1) | Aileron du jetpack + flamme pilote restés **cyan PROTO** sur l'idle ; orange/rouge sur les 2 frames thrust |
| VENIN (s2) | Flamme jaune-blanc en idle, verte en thrust-0, jaune-orange en thrust-1 |
| ORAGE (s3) | `robot-s3-thrust-0.png` a un **fond blanc opaque baké** (4096/4096 pixels opaques) → flash blanc 44px une frame sur deux en poussée |
| NOVA (s4) | Idle : aileron + flamme cyan ; thrust : ailerons dorés, flamme turquoise (t0) vs orange (t1) ; le visage diffère entre idle (visière cyan) et thrust (yeux ambre) |

PROTO et VORTEX sont sains (VORTEX = déjà fabriqué par composition locale).

## Roster (proposition — les gates planche contact restent le volant)

Seuils : `SKIN_THRESHOLDS` passe à `[1, 3, 5, 7, 10, 15, 18, 22, 26, 32, 40, 50]`.
Déblocage 100 % au **record de niveau** (décision Jael) : zéro changement au
modèle de save, le code `JB1-XXX` continue de tout capturer.

| Slot | Seuil | id / name | Concept (profil DROITE, lisible 44px) | Accent |
|---|---|---|---|---|
| 6 | 18 | `titan` / TITAN | Mécha trapu, épaules massives, carré | `#ffd23e` jaune chantier |
| 7 | 22 | `abysse` / ABYSSE | Poisson-sous-marin mécanique, hublot | `#3e6bff` bleu abyssal |
| 8 | 26 | `zenith` / ZENITH | Soucoupe volante, dôme de verre | `#3effb2` menthe |
| 9 | 32 | `ronin` / RONIN | Samouraï élancé, casque cornu | `#ff3ec8` magenta |
| 10 | 40 | `givre` / GIVRE | Robot cristallin de glace, facettes | `#bfe8ff` bleu glacier |
| 11 | 50 | `omega` / OMEGA | L'ultime — noir profond, liserés plasma | `#e0c8ff` violet plasma |

Les accents sont les seules teintes de flamme/particules ; ils doivent rester
discernables entre eux ET des 6 existants (cyan/orange/vert/violet/crème/rouge).
Un candidat retenu au gate peut réorienter nom/concept sans appel
supplémentaire.

## Fabrication des 6 nouveaux (recette VORTEX industrialisée)

1. **1 appel `generate` par skin** (64×64, fond transparent, 16 candidats,
   seed dédiée) — prompt par concept, toujours avec `side view facing right,
   clean pixel art, black outline, readable silhouette`.
2. **Planche contact par skin** (`contact-sheet.mjs`, grille 4×4 damier).
3. **Gate Jael G1 (groupé)** : les 6 planches d'un coup, pré-tri annoté
   (candidats de face / tournés à gauche / illisibles éliminés d'office).
   Jael choisit 1 candidat par skin — ou rejette un concept → on re-prompte
   ce concept seul (dans le plafond budget).
4. **Frames locales (0 crédit)** : `compose-thrust.mjs` — idle recentré sur le
   centre de masse PROTO, flamme PROTO extraite, teintée à l'accent, composée
   SOUS le corps ; corps strictement identique sur les 3 frames.
5. **Soupape (approche C)** : si la flamme jetpack générique n'a pas de sens
   pour un design retenu (pressentis : ABYSSE — bulles ?, OMEGA — traînée
   plasma ?), 1 appel `edit` max par skin concerné, dans la réserve de 2-3.
   Décision prise sur rendu réel, pas par principe.

## Fix des 4 recolors (0 crédit, local, déterministe)

Nouvel outil durable `Slop/.claude/tools/fix-recolor.mjs` (pngjs) :

1. **Idle corrigé** : remap vers l'accent du skin (teinte de l'accent,
   luminosité conservée) des pixels dépareillés du jetpack. Masque **spatial**
   guidé par PROTO : positions où `robot.png` porte le cyan du **jetpack
   uniquement** (aileron + flamme pilote, zone gauche/basse du sprite — les
   yeux et le point de torse cyan de PROTO sont EXCLUS du masque), et dont la
   teinte s'écarte de l'accent du skin. Couvre le cyan résiduel (FORGE, NOVA)
   comme la flamme jaune-blanc de VENIN, et protège les éléments légitimes
   (ex. visière de NOVA, qui reste cyan).
2. **Thrust reconstruits** : les 2 frames thrust re-fabriquées depuis l'idle
   corrigé via `compose-thrust` (flamme PROTO teintée accent). Élimine d'un
   coup les teintes dépareillées entre frames, la dérive de corps
   (visage NOVA), et le fond blanc d'ORAGE.
3. Les fichiers **gardent leurs noms** (`robot-s1*.png`…) → aucun changement
   de code ; le git diff des PNG fait foi.
4. Vérification : planche avant/après (mêmes 4 skins × 3 frames) + stats
   alpha (plus aucun pixel opaque hors silhouette) → **gate Jael G2**.

Cas limite accepté : si le masque spatial laisse quelques pixels cyan
esthétiquement discutables (anti-aliasing PixelLab), retouche manuelle au
pixel via l'outil (liste de coordonnées), documentée dans le commit.

## Intégration code

- `src/config.js` : `SKIN_THRESHOLDS` → 12 entrées (source unique, inchangé
  de rôle).
- `src/game/skins.js` : table `SKINS` +6 lignes (id/name/accent ci-dessus).
- `src/main.js` : 18 imports (+6 skins × 3 sprites) + 18 clés dans la map
  d'assets (`robot-s6`…`robot-s11` + thrusts) — `spriteKey` déjà générique.
- `src/render/skins.js` : rien (label `NIVEAU ${SKIN_THRESHOLDS[slot]}` déjà
  générique) ; le carrousel ‹ › et la nav circulaire absorbent 12 slots.
- Tests : table à 12 (ids/names/accents), frontières de TOUS les seuils
  (17/18 … 49/50), `loadSkin` garde hors-bornes, labels NIVEAU verrouillés.

## Gates & critères d'acceptation

1. **G1 — planches contact** (6 grilles) : silhouette originale lisible,
   profil droite, pas d'humanoïde générique, distincte des 11 autres robots.
2. **G2 — avant/après recolors** : aileron + flamme pilote à l'accent du skin
   sur les 3 frames, visière NOVA intacte, fond ORAGE transparent, corps
   identique idle/thrust.
3. **G3 — en jeu** (:5199, codes save fournis pour 18/22/26/32/40/50) :
   hangar navigue sur 12 slots ; chaque nouveau skin verrouillé à seuil−1
   (« NIVEAU X »), débloqué à seuil, sélection persistée ; en vol les 3 frames
   s'enchaînent sans saut, flamme/particules à l'accent, lisible sur les
   5 décors ; les 4 recolors corrigés re-validés en vol.
4. **Budget** : ≤ 200 crédits dépensés, coût réel documenté en mémoire projet.

## Vérification automatisée

Suite vitest verte à chaque tâche. Smoke Playwright durable généralisé
(`.claude/smokes/roster-smoke.mjs`) : pour chaque nouveau skin — verrouillé à
seuil−1, débloqué à seuil, sélection persistée `jetpackbot.skin`, vol avec
captures. Stats alpha des 36 sprites (aucun pixel opaque hors silhouette).

## Hors scope

- Animation du corps (rotors, cape qui flotte…) : les 3 frames partagent le
  même corps, comme tout le roster.
- Hangar en grille (utile au-delà de ~16 skins — le carrousel suffit à 12).
- Critères de déblocage non-niveau (portes cumulées, morts…) : écartés par
  Jael, la variété est dans les designs.
- Refonte des recolors en designs originaux : FORGE/VENIN/ORAGE/NOVA restent
  des variantes du robot de base, on ne corrige que leurs couleurs.
