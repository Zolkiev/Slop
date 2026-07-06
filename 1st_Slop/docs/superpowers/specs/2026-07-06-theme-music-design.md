# Musiques par thème — tempête néon & orbite (design)

**Date :** 2026-07-06
**Statut :** validé en autonome (game-feel délégué par Jael — gate d'écoute
avant merge, comme pour les pistes précédentes)
**Sous-projet :** 3 de la roadmap (après les décors par tier, avant la
progression/skins). S'empile sur `feat/tier-decors` (consomme `BG_MUSIC` et
les bgSet 3-4) — branche `feat/theme-music`.

## Objectif

Remplacer la musique d'intérim des tiers 4-5 par deux pistes dédiées :
`music-3` (tempête néon) et `music-4` (orbite). Chaque monde a alors sa piste
propre, et la montée des tiers s'entend autant qu'elle se voit.

## Contexte

- `BG_MUSIC = ['music-0', 'music-1', 'music-2', 'music-1', 'music-2']` —
  l'intérim posé par le sous-projet décors. `musicFor` est déjà entièrement
  piloté par cette table ; seules les données changent.
- Générateur : `scripts/music.mjs`, zéro dépendance, renderer déclaratif
  (voices/noise, 16 pas par mesure, vibrato/slide/vélocité, PRNG mulberry32
  seedé → WAV reproductibles byte-identiques). PCM 16 bits mono 22050 Hz,
  boucles calées sur les mesures.
- Palette existante : music-0 urbaine (La mineur, 96 BPM, synthwave groove),
  music-1 industrielle (Mi phrygien, 118 BPM, la plus pêchue), music-2
  toxique (Ré dorien, 84 BPM, posée), music-menu (Do majeur, 100 BPM).

## Direction musicale (arbitrages game-feel)

### `music-3` — tempête néon (tier 4, niveaux 7-9)

La piste la plus agressive du jeu : le tier 4 est celui où la difficulté
mord, la musique doit mordre aussi.

- **La mineur harmonique, 128 BPM, 16 mesures A/B, seed 128.** Plus rapide
  que l'industrielle (118) ; le sol# de la mineure harmonique apporte le
  drame de l'orage, couleur nettement distincte du phrygien de music-1.
- Riff lead pulse25 syncopé et incisif ; basse martelée ; kick
  4-on-the-floor ; hats en doubles-croches (urgence).
- Signature « éclairs » : runs d'arpèges descendants rapides ponctuels
  (1-2 par section), écho des éclairs du décor.
- Section B : riff à l'octave + stabs, comme les pistes existantes.

### `music-4` — orbite (tier 5, niveaux 10+)

Le climax par l'atmosphère, pas par la vitesse : l'espace est le monde le
plus sombre des cinq, la musique est la plus sombre des cinq.

- **Do mineur, 72 BPM, 16 mesures A/B, seed 72.** Le tempo le plus lent du
  jeu, mais un arpège en doubles-croches constant en dessous (télémétrie,
  scintillement d'étoiles) maintient la tension du tier 5 — feel half-time,
  urgence sous-jacente.
- Drone grave tenu (comme music-2 mais plus sombre) ; lead triangle lent à
  large vibrato, phrases espacées ; kick sourd temps 1 ; percussions quasi
  absentes (ticks/shimmer clairsemés).
- Section B : contre-chant en quintes au-dessus du lead (convention
  music-2).

## Architecture

1. **`scripts/music.mjs`** : deux définitions de pistes (`music3`, `music4`)
   au format déclaratif existant, ajoutées au registre `tracks`. Relancer le
   script régénère TOUT ; les seeds garantissent que music-0/1/2/menu/jingle
   restent byte-identiques (propriété de non-régression vérifiable par hash
   avant/après).
2. **`assets/music-3.wav`, `assets/music-4.wav`** : sorties du script
   (~1-2 Mo chacune, cohérent avec l'existant).
3. **`src/game/music.js`** : `BG_MUSIC = ['music-0', 'music-1', 'music-2',
   'music-3', 'music-4']` + commentaire d'intérim remplacé par le mapping
   définitif. Aucun autre changement — `musicFor`/`isLooping` sont déjà
   pilotés par la table.
4. **`src/main.js`** : 2 imports WAV + 2 entrées dans la map d'assets
   (`'music-3'`, `'music-4'`), à côté des musiques existantes.

## Décisions & rejets

- **Pas de garde de bornes sur `BG_MUSIC[bgSet]`** (minor hérité, re-tranché
  ici) : les deux seuls producteurs de bgSet sont bornés par construction
  (`tier − 1` avec tier ∈ [1,5] ; `Math.floor(random × BG_SET_COUNT)`). Une
  garde défendrait un état impossible.
- **Pas d'externalisation des données de pistes** (JSON + loader générique) :
  sur-ingénierie, le format déclaratif inline est lisible et testé par
  l'usage.
- **16 mesures, pas plus** : les boucles existantes (~40 s) ne lassent pas en
  jeu ; des pistes plus longues coûteraient du poids d'asset sans gain
  prouvé.
- **Hors scope (backlog inchangé)** : préécoute du slider MUSIQUE en OPTIONS,
  fade entre pistes, jingle LEVEL_COMPLETE, test de régression du générateur.

## Tests (TDD)

- `tests/game/music.test.js` : la table exacte
  `BG_MUSIC === ['music-0', 'music-1', 'music-2', 'music-3', 'music-4']` ;
  `musicFor(PLAY, 3) === 'music-3'`, `musicFor(PLAY, 4) === 'music-4'` ;
  `musicFor(OPTIONS, 4, 'pause') === 'music-4'` ; bgSet 0-2 inchangés ;
  `isLooping('music-3')` et `isLooping('music-4')` vrais.
- Non-régression générateur (vérification de tâche, pas un test committé) :
  hash des 5 WAV existants identique avant/après régénération.
- `npm test && npm run build` verts ; les 2 WAV résolus par Vite.

## Vérification finale

- Smoke Playwright avec patch `window.Audio` (réutiliser l'approche
  `music-smoke.mjs` : vérifier que la clé jouée en PLAY au niveau 7 est
  `music-3`, au niveau 10 `music-4`, boucle active, et `--autoplay-policy=
  user-gesture-required` pour le piège autoplay).
- **Gate d'écoute Jael avant merge** (précédent : chaque livraison musicale a
  été validée à l'oreille). Les deux gates (décors + musiques) peuvent être
  jugés dans la même session de jeu.
