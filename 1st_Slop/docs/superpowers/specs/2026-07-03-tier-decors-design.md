# Décors par tier — tempête néon + orbite — Design

**Date :** 2026-07-03
**Statut :** validé par Jael (« Validé » — thèmes tempête/orbite retenus)

## Objectif

Le décor devient une **progression** : fini le tirage aléatoire par niveau,
chaque tier de difficulté a son monde. Récompense visuelle synchro avec les
nouveaux motifs de portes, et socle des sous-projets 3 (musique par thème) et
4 (paliers de skins). Narration verticale : rues → usines → friches toxiques
→ toits dans la tempête → l'espace.

| Tier | Niveaux | bgSet | Décor | Statut |
|---|---|---|---|---|
| 1 | 1-2 | 0 | Nuit urbaine | existant |
| 2 | 3-4 | 1 | Industriel | existant |
| 3 | 5-6 | 2 | Zone toxique | existant |
| 4 | 7-9 | 3 | **Tempête néon** — toits de gratte-ciels dans l'orage, éclairs, pluie, ciel violet déchiré | 🆕 |
| 5 | 10+ | 4 | **Orbite** — stratosphère/espace, étoiles, ville minuscule en bas, station spatiale au loin | 🆕 |

## Mapping décor (logique)

- `startLevel` : `world.bgSet = tierForLevel(level) − 1` — déterministe. Le
  reroll aléatoire (`world.js:71` et le gating `level !== world.level`)
  disparaît. Retry = même niveau = même décor (gratuit).
- `createWorld` : le **menu** garde un décor aléatoire parmi les 5 (vitrine),
  comportement existant conservé avec `BG_SET_COUNT = 5`.
- `CONFIG.BG_SET_COUNT: 3 → 5`.

## Assets (PixelLab)

2 paires au format des existantes (le renderer étire sur 360×640, formats
cibles : far ≈ 320×576 plein écran, near = 320×180 bande de premier plan à
silhouettes) :

- `bg-far-3` / `bg-near-3` — tempête néon : ciel d'orage violet/magenta,
  éclairs, rideaux de pluie, skyline haute en contre-jour ; near = toits,
  antennes, enseignes néon sous la pluie.
- `bg-far-4` / `bg-near-4` — orbite : dégradé stratosphère→noir étoilé,
  courbure de la Terre/ville lumineuse tout en bas, station spatiale au
  loin ; near = superstructures orbitales, panneaux solaires, débris.

Pipeline : `scripts/pixellab.mjs generate` (multi-candidats) →
`scripts/crop-borders.mjs` si bordures parasites → sélection des meilleurs
candidats (cohérence de palette avec les 3 mondes existants, lisibilité :
les fonds ne doivent pas concurrencer les obstacles/robot) → gate visuel
Jael en jeu.

## Musique — table d'intérim

Les vraies pistes arrivent au sous-projet 3. En attendant, `music.js` mappe
explicitement décor→piste existante :

| bgSet | Piste intérim | Pourquoi |
|---|---|---|
| 0/1/2 | `music-{bgSet}` | inchangé |
| 3 (tempête) | `music-1` | l'énergique — colle à l'intensité tier 4 |
| 4 (orbite) | `music-2` | la mystérieuse — colle au vide spatial |

Implémentation : table `BG_MUSIC = ['music-0', 'music-1', 'music-2',
'music-1', 'music-2']` dans `music.js`, consommée par `musicFor` (remplace
les template strings `music-${bgSet}`). Le sous-projet 3 remplacera les deux
dernières entrées par `music-3`/`music-4`.

## Hors périmètre

- Nouvelles pistes musicales (sous-projet 3) ; skins (sous-projet 4).
- Obstacles thématisés par décor (idée notée pour plus tard).
- Effets animés dans les fonds (éclairs clignotants, etc.) — les fonds sont
  des PNG statiques comme les existants.

## Vérification

- TDD : `startLevel` → bgSet par tier (niveaux 1/3/5/7/10/100) ; `musicFor`
  via la table (bgSet 3→music-1, 4→music-2, 0-2 inchangés) ; menu aléatoire
  borné à BG_SET_COUNT.
- Chargement : les 4 nouveaux PNG importés dans `main.js`, build Vite OK.
- Playwright : screenshots en jeu aux niveaux 1, 7 (tempête) et 10 (orbite)
  via codes save (`JB1-A0A` = niv 10) — décor correct, obstacles lisibles
  par-dessus, HUD OK, zéro erreur JS.
- **Gate final : Jael juge les deux nouveaux mondes en jeu** (cohérence de
  style avec les 3 existants, lisibilité du gameplay, effet « waouh » du
  passage tier 3→4→5).
