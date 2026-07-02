# Musiques plus catchy — Design

**Date :** 2026-07-02
**Statut :** validé par Jael (« tout ça, fais-toi plaisir » — dosage délégué)

## Objectif

Les 3 boucles d'ambiance actuelles (`assets/music-{0,1,2}.wav`) font le job en
fond mais tournent vite en rond : arpèges clairsemés, pas de vraie mélodie,
percussions réduites à des hats. Les rendre **catchy** — mélodie lead
fredonnable, vraie batterie chiptune, moins de répétition — **sans toucher à
l'infra du jeu** : mêmes fichiers de sortie, `audio.js` / `musicFor` /
settings / mapping décor↔piste inchangés, les 219 tests ne bougent pas.

Approche retenue (B) : petites extensions du générateur `scripts/music.mjs`
puis réécriture complète des 3 pistes. Alternatives écartées : tables de notes
seules (plafond sonore trop bas : impossible de distinguer un lead d'un arpège
avec seulement square 50 % + triangle à volume constant) ; moteur tracker
complet (overkill pour 3 boucles de fond).

## Extensions du générateur (`scripts/music.mjs` uniquement)

Quatre primitives, rien d'autre :

1. **Onde `pulse25`** (carré à 25 % de duty) ajoutée à `WAVES` — timbre lead
   NES classique, immédiatement distinct de l'arpège en square 50 %.
2. **Phase accumulée + pitch dynamique** : le renderer accumule la phase
   échantillon par échantillon (`phase += fInst / RATE`) au lieu de calculer
   `wave(f * t)`. Débloque deux options de voix :
   - `vibrato: { rate, depth }` — modulation sinusoïdale du pitch (~5 Hz,
     ±0.3 demi-ton) pour faire chanter le lead ;
   - `slide: demi-tons` — glissement linéaire du pitch sur la durée de la
     note (négatif = chute) ; transforme le triangle grave en vrai kick.
3. **Vélocité par note** : `note(bar, step)` peut retourner un midi (comme
   avant) **ou** `{ m, v }` avec `v` multiplicateur de volume (défaut 1).
   Les hooks respirent au lieu d'être mitraillés à volume constant.
4. **PRNG seedé** (mulberry32, seed fixe par piste) à la place de
   `Math.random` dans les voix bruit — règle au passage le nit différé
   « assets non reproductibles ».

Le reste du contrat est conservé : 16 steps/mesure, boucles alignées sur la
mesure (pas de fondu), soft clip `tanh`, 16-bit PCM mono 22050 Hz.

## Direction musicale — les 3 pistes réécrites

Chaque piste garde son identité de décor mais passe de « nappe d'ambiance » à
« boucle de jeu » :

- **Mélodie lead fredonnable** : phrase de 2 mesures en question/réponse,
  jouée en pulse25 (ou triangle+vibrato pour la toxique), avec accents.
- **Vraie batterie chiptune** : kick (triangle grave + slide descendant),
  snare (bruit, decay moyen) sur les temps 2 et 4, hats (bruit court).
- **Structure A/B de 16 mesures** (~40 s, ~1.8 Mo par fichier, acceptable) :
  B = variation (lead à l'octave, contre-chant, tournerie enrichie) pour
  casser la répétition. Le loop reste bar-aligned.

| Piste | Décor | Caractère | Tempo | Gamme |
|---|---|---|---|---|
| `music-0` | nuit urbaine | synthwave qui groove, hook chantant sur Am/F/C/G, basse en croches, batterie discrète | 90 → **96 BPM** | La mineur |
| `music-1` | industriel | le plus énergique — riff lead agressif syncopé, basse martelée conservée, backbeat marqué | 112 → **118 BPM** | Mi phrygien |
| `music-2` | zone toxique | catchy mais mystérieux — motif triangle+vibrato sur drone, percussions clairsemées, la plus posée (contraste assumé) | 76 → **84 BPM** | Ré dorien |

Niveaux sonores globaux comparables aux pistes actuelles (le volume musique
défaut 7 reste bien dosé).

## Hors périmètre

- Tout changement côté jeu (`src/`) — aucun fichier source touché.
- Préécoute du slider MUSIQUE en OPTIONS (quirk connu, fix séparé si demandé).
- Pistes additionnelles / musique au menu principal.

## Vérification

- `node scripts/music.mjs` régénère les 3 wav — reproductible (PRNG seedé) :
  deux runs successifs produisent des fichiers identiques (à vérifier une fois
  par hash).
- `npm test` (219 tests, aucun ne lit les wav) + build Vite.
- Playwright : la musique joue en PLAY/PAUSE, coupe en OPTIONS/GAMEOVER/MENU
  (comportement inchangé, on revalide juste que les nouveaux fichiers chargent).
- **Gate final avant merge : écoute manuelle des 3 pistes par Jael**
  (critères : hook mémorisable, loop propre sans clic, pas de fatigue après
  2-3 boucles, identité de décor préservée).
