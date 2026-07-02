# Save system + Continue + code de sauvegarde — Design

**Date :** 2026-07-02
**Statut :** validé par Jael

## Objectif

Câbler le bouton **CONTINUE** du menu (stub grisé depuis l'intro-menu) et rendre
la progression **portable hors du navigateur**. Contrainte posée par Jael : hébergé
en statique (GitHub Pages/Netlify), la save ne doit pas vivre uniquement dans le
cache navigateur.

## Décisions de design

- **Persistance (choix Jael : A+B).** Sur un site statique, tout stockage
  automatique est navigateur-local. On en sort en donnant au joueur un artefact
  portable : **code de sauvegarde** rétro (A) + **lien de sauvegarde** (B, même
  encodeur dans l'URL). Pas de backend (C écarté : identité/deps/hébergement,
  surdimensionné pour un arcade solo).
- **Continue = dernier niveau atteint (choix Jael).** La save v1 se réduit à
  `bestLevel` — déjà persisté en localStorage par `score.js` (`jetpackbot.bestLevel`).
  CONTINUE démarre ce niveau, frais.
- **NEW GAME ne touche pas à la save.** Rejouer depuis le niveau 1 n'écrase pas la
  meilleure progression (trophée, pas slot).
- **Restauration = jamais de régression.** Restaurer un code/lien applique
  `max(bestLevel local, bestLevel du code)`.

## Architecture

### 1. Module de save pur — `src/game/save.js` (nouveau)

- Save v1 : `{ bestLevel }` (extensible : le code porte une version).
- `encodeSave({ bestLevel })` → code `JB1-XXXX` :
  - Préfixe `JB` + version `1` + `-`.
  - Payload : `bestLevel` en **base32 Crockford** (majuscules ; alphabet sans
    `I`, `L`, `O`, `U` — pas d'ambiguïté 0/O, 1/I).
  - Checksum : 2 caractères (somme pondérée des caractères du payload, mod 32²,
    en base32) collés au payload.
- `decodeSave(code)` → `{ bestLevel }` ou `null` :
  - Normalise avant décodage : trim, majuscules, ignore espaces/tirets internes.
  - `null` si préfixe/version inconnus, caractère hors alphabet, checksum faux,
    ou `bestLevel < 1`.
- 100 % pur, zéro DOM, testable en Vitest.

### 2. CONTINUE au menu — `src/game/menu.js`, `src/game/world.js`

- `createMenu(hasSave)` : le bouton `continue` est `enabled: hasSave`.
- `world.menu` recréé à chaque entrée en MENU (comme le gameover au crash) avec
  `hasSave = world.score.bestLevel >= 1` — reflète une restauration fraîche.
- `press()` en MENU : `continue` → `startLevel(world, world.score.bestLevel)` +
  PLAY. (Le `hitTest`/`activate` existants gèrent déjà le cas disabled.)

### 3. Écran CODE — état `SAVECODE`

- 4ᵉ bouton du menu principal : **CODE** (toujours enabled) → `States.SAVECODE`
  (nouvel état de la machine existante).
- Écran (logique `src/game/savecode.js` nouveau + rendu `src/render/savecode.js`
  nouveau, mêmes plaques/`drawButtons`) :
  - Affiche le code actuel en grand (police Press Start 2P), ou
    `PAS DE SAUVEGARDE` si `bestLevel < 1`.
  - Boutons : **COPIER** (code seul), **LIEN** (copie l'URL complète
    `<origin><path>#save=CODE`), **SAISIR**, **RETOUR** (aussi via Escape).
  - Copie via `navigator.clipboard.writeText` (fallback : sélection du code
    affichée dans l'input DOM) ; feedback `COPIÉ !` 1,5 s sur le bouton.
  - Boutons COPIER/LIEN disabled quand il n'y a pas de save.
- **Saisie** : input DOM overlay stylé pixel (module isolé `src/ui/codeinput.js`,
  nouveau) — nécessaire pour le clavier mobile ; le reste du jeu reste 100 %
  canvas. Ouvert par SAISIR : input centré sur le canvas, valide sur Enter/bouton
  OK, annule sur Escape.
  - Code valide → `applySave` (max, cf. §4) + persistance localStorage + retour
    MENU (CONTINUE allumé).
  - Code invalide → message `CODE INVALIDE` rouge sous l'input, on reste en saisie.

### 4. Application d'une save — `src/game/score.js`

- `applySave(score, bestLevel, storage)` : `score.bestLevel =
  max(score.bestLevel, bestLevel)` + persiste si changé. Utilisé par la saisie
  ET le hash d'URL. (Réutilise la mécanique de `finalizeLevel` sans dupliquer.)

### 5. Lien de sauvegarde — `main.js`

- Au boot : parse `location.hash` ; si `#save=<code>` et `decodeSave` OK →
  `applySave` avant `createWorld`… puis nettoie l'URL
  (`history.replaceState(null, '', location.pathname + location.search)`).
- Hash absent/invalide → boot normal (pas d'erreur bloquante ; log console).

## Hors périmètre

- Backend / leaderboards.
- Volumes SFX/musique dans la save (sous-projet Options ; le champ version du
  code permettra d'étendre).
- Reprise de partie en cours exacte (position, portes).

## Tests

Vitest :
- `save.js` : round-trip encode/decode (niveaux 1, 7, 42, 1000) ; checksum
  rejette un caractère altéré ; normalisation (minuscules, espaces, tirets) ;
  rejets (préfixe faux, version inconnue, alphabet invalide, vide, `bestLevel: 0`).
- `score.js` : `applySave` prend le max, persiste seulement si changé.
- `menu.js` : `createMenu(true/false)` → continue enabled/disabled ; focus.
- `world.js` : press CONTINUE (enabled) → PLAY au bestLevel ; CONTINUE disabled →
  no-op ; press CODE → SAVECODE ; routing SAVECODE (retour, saisir) ; Escape en
  SAVECODE → MENU ; menu recréé à l'entrée en MENU reflète `hasSave`.
- `savecode.js` : états de l'écran (avec/sans save, feedback copie, erreur saisie).

Playwright avant merge : écran CODE (avec et sans save), copie, saisie d'un code
valide → CONTINUE s'allume, saisie invalide → erreur, chargement avec
`#save=...` → progression restaurée.
