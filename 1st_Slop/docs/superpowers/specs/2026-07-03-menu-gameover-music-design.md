# Musique menu + jingle game over — Design

**Date :** 2026-07-03
**Statut :** validé par Jael (vibe menu « chill mais énergique » choisie, reste délégué)

## Objectif

Deux trous dans l'habillage sonore : silence total au menu principal (première
impression du jeu) et mort sèche au game over (juste le `sfx-crash`). On ajoute :

- **`music-menu`** : boucle chill-énergique au menu — donne l'identité du jeu
  et envie d'appuyer sur JOUER, sans fatiguer si on reste sur l'écran.
- **`jingle-gameover`** : sting de défaite ~2,5 s joué **une seule fois** à la
  mort, puis silence jusqu'au retry. Une boucle serait une erreur : on reste
  2-5 s sur cet écran, en retry rapide elle deviendrait agaçante. Pattern
  arcade classique (ponctue la mort, ne punit pas le joueur qui enchaîne).

Approche retenue (B) : jingle **déclaratif via le canal musique** — `musicFor`
retourne `jingle-gameover` pour l'état GAMEOVER et `setMusic` apprend à jouer
une piste sans boucler. Conserve le modèle actuel « l'état dicte la musique,
chaque frame », respecte le volume MUSIQUE des options, aucune plomberie
d'événement. La déduplication existante (`key === musicKey`) empêche de
redémarrer le jingle à chaque frame. Alternative écartée (A) : event one-shot
type SFX à la mort — suivrait le volume SFX alors que c'est de la musique, et
créerait un second mécanisme audio musical.

## Génération (`scripts/music.mjs`)

Deux nouvelles pistes rendues avec les instruments existants (pulse25,
vibrato/slide, vélocité, PRNG seedé — mêmes contraintes : 16 steps/mesure,
soft clip tanh, 16-bit PCM mono 22050 Hz) :

| Piste | Rôle | Caractère | Tempo | Durée |
|---|---|---|---|---|
| `music-menu` | menu, boucle | chill mais énergique — motif accrocheur aéré, moins de couches que les pistes de jeu, pas de kick 4-on-the-floor, hats légers | ~100 BPM | 16 mesures A/B, loop bar-aligned |
| `jingle-gameover` | one-shot | sting descendant, démarre sur une note tenue pour laisser le `sfx-crash` lisible, chute résolue (pas de suspension) | libre | ~2,5 s, PAS une boucle |

## Sélection (`src/game/music.js`)

`musicFor(state, bgSet, optionsReturn)` — nouvelle table complète :

| État | Piste |
|---|---|
| MENU, SAVECODE | `music-menu` |
| OPTIONS (depuis menu) | `music-menu` |
| OPTIONS (depuis pause) | `music-${bgSet}` |
| PLAY, PAUSE, LEVEL_COMPLETE | `music-${bgSet}` (inchangé) |
| GAMEOVER | `jingle-gameover` (non bouclé) |

Au passage, corrige le comportement actuel : ouvrir OPTIONS depuis la pause
coupait la musique. `music.js` exporte aussi l'info « quelles clés ne bouclent
pas » (ex. `isLooping(key)` ou set exporté) pour que `main.js` n'ait pas à
connaître les noms de pistes.

## Moteur audio (`src/engine/audio.js`)

`setMusic(key, loop = true)` : le flag est appliqué au clip (`clip.loop`).
Comportement conservé pour le reste (dédup par clé, stop de l'ancienne piste,
gain musique appliqué, best-effort try/catch). Quand le jingle se termine, le
clip s'arrête naturellement — silence jusqu'au prochain changement de clé.
Cas retry rapide : GAMEOVER → PLAY change la clé, donc stop + nouvelle piste,
même si le jingle jouait encore.

## `main.js`

- Charger `music-menu.wav` et `jingle-gameover.wav` dans les sources audio.
- Passer `world.optionsReturn` à `musicFor`.

## Hors périmètre

- Jingle de LEVEL_COMPLETE (garde la musique de jeu, comportement actuel).
- Fade in/out entre pistes.
- Préécoute du slider MUSIQUE en OPTIONS (quirk connu, fix séparé si demandé).

## Vérification

- `node scripts/music.mjs` régénère les wav — reproductible (PRNG seedé).
- TDD : tests unitaires sur la nouvelle table d'états de `musicFor`
  (y compris les deux contextes d'OPTIONS) et sur le flag loop de `setMusic`.
- `npm test` + build Vite.
- **Gate final avant merge : écoute manuelle par Jael** (critères : le menu
  donne envie de jouer et tient la répétition, le jingle ponctue la mort sans
  masquer le crash ni lasser en retry rapide, transitions propres
  menu→jeu→mort→retry).
