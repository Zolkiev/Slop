# Partie en cours vs record — NEW GAME confirmé, CONTINUE adaptatif — Design

**Date :** 2026-07-06
**Statut :** validé par Jael (« Oui, c'est ça » — modèle level/record, confirmation NEW GAME, skins jamais re-verrouillés)

## Problème

Retour Jael en jeu : « nouvelle partie, je passe le niveau 1, niveau 2, je
perds, menu, CONTINUE → je suis sur une save level 10 ». CONTINUE repart du
`bestLevel` (record à vie) au lieu de la partie en cours : une seule notion
stockée fait deux métiers. En plus, `restoreSave` (fix du 06/07) fait
régresser le `bestLevel` à la saisie d'un code, ce qui re-verrouillerait
les skins (déblocage indexé sur `bestLevel`).

## Modèle : deux notions

| Notion | Clé localStorage | Rôle | Régresse ? |
|---|---|---|---|
| **`level`** — partie en cours | `jetpackbot.level` (nouvelle) | Ce que CONTINUE reprend | Oui : NEW GAME confirmé (→ 1) et SAISIR un code (→ valeur du code) |
| **`record`** — meilleur niveau à vie | `jetpackbot.bestLevel` (clé conservée = migration gratuite) | Débloque les skins, génère le code de save, affiché « Best » | Jamais |

`createScore(storage)` → `{ level, record }`. Migration : `record` lu sur
la clé historique ; `level` = clé `jetpackbot.level` si présente, sinon
`record` (les joueurs existants gardent leur CONTINUE actuel).

## Comportements

- **Progrès en jeu** : `saveProgress(score, valeur, storage)` — `level` et
  `record` prennent chacun `max(actuel, valeur)`, persistés seulement s'ils
  changent. Appels : LEVEL_COMPLETE → `world.level + 1` (quitter sur
  l'écran de victoire ne perd pas le niveau gagné) ; crash → `world.level`.
  Remplace `finalizeLevel`/`applySave`.
- **CONTINUE** : activé si `level >= 1`, démarre `startLevel(score.level)`.
  Il « s'adapte » : après un NEW GAME confirmé + mort au niveau 2 → 2 ;
  sans NEW GAME → l'ancienne partie.
- **NEW GAME** : si `level > 1`, écran de confirmation (nouvel état
  `CONFIRM`, style du jeu) : titre « REPARTIR AU NIVEAU 1 ? », sous-titre
  « Les robots débloqués restent », boutons OUI / NON (focus initial NON —
  l'action destructrice ne doit pas être le défaut). OUI →
  `resetProgress(score, storage)` (`level = 1` persisté, `record` intact)
  puis `startLevel(1)` → PLAY. NON / Escape → retour MENU. Si
  `level <= 1` : pas de confirmation, direct.
- **SAISIR un code** : `applyCode(score, valeur, storage)` — `level` =
  valeur EXACTE (même vers le bas : geste délibéré, façon password rétro,
  c'est l'outil de test de Jael) ; `record` = `max` (les skins ne se
  re-verrouillent JAMAIS). Remplace `restoreSave`.
- **Lien `#save=` au boot** (`main.js`) : `max` sur les deux (un vieux
  favori ne doit ni écraser la partie en cours ni le record).
- **Code de save (COPIER/LIEN)** : encode `record` (condition d'affichage
  `record >= 1`).
- **Skins** : `skinUnlocked(i, record)` et `loadSkin(storage, record)`.
- **Affichages** : « Best: niveau X » (menu + game over) = `record`.

## Hors périmètre

- Afficher le niveau de la partie en cours sur le bouton CONTINUE (idée
  notée, à voir avec un retour visuel de Jael).
- Save v2 multi-champs (version char de `save.js`) — le code reste un seul
  nombre (`record`).
- Toute confirmation ailleurs que NEW GAME.

## Vérification

- TDD : `createScore` (migration 3 cas : vierge / historique sans `level` /
  les deux clés) ; `saveProgress` (max sur les deux, persistance
  conditionnelle) ; `resetProgress` (level=1, record intact) ; `applyCode`
  (level exact bas/haut, record max) ; boot lien (max/max) ; CONTINUE
  adaptatif ; flux CONFIRM complet (OUI/NON/Escape/nav clavier, pas de
  confirmation à level 1) ; skins sur record (code bas ne re-verrouille
  pas) ; code généré depuis record.
- Smoke Playwright : le parcours exact du retour de Jael (NEW GAME →
  niveau 1 passé → mort au 2 → CONTINUE → doit être au niveau 2, plus au
  10) + confirmation NEW GAME (OUI et NON) + skin NOVA toujours équipable
  après SAISIR JB1-505.
- Gate Jael en jeu.
