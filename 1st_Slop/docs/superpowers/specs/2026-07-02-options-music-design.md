# Options (volumes SFX/musique) + musiques d'ambiance — Design

**Date :** 2026-07-02
**Statut :** validé par Jael

## Objectif

Deux demandes liées :

1. **Écran OPTIONS** avec réglages de volume **séparés** pour les SFX et la
   musique — câble les boutons OPTIONS grisés du menu principal ET de la pause.
2. **Musiques d'ambiance** : une piste par **type de niveau**. Décision (avis
   suivi par Jael) : le « type » = le **décor** (`world.bgSet`, 3 sets), pas le
   numéro de niveau — cohérence audio-visuelle, ça scale avec `BG_SET_COUNT`,
   et la musique hérite gratuitement des règles du décor persistant (restart =
   même piste, changement de niveau = nouvelle ambiance).

## Décisions de design

- **Sourcing (choix par défaut, Jael AFK — reco suivie) : chiptune synthétisée
  par script node zéro-dépendance**, même famille que `scripts/sfx.mjs`.
  Alternatives écartées : pistes CC0 (licences, cohérence esthétique, non
  retouchable), synthèse live Web Audio (complexité, CPU).
- **Le menu principal reste silencieux** — l'ambiance démarre avec la partie.
- **La musique joue en PLAY, PAUSE et LEVEL_COMPLETE**, s'arrête en GAMEOVER
  (le crash respire dans le silence) et au MENU.
- **Volumes = préférence d'appareil** : localStorage uniquement
  (`jetpackbot.volSfx`, `jetpackbot.volMusic`), PAS dans le code de sauvegarde.
- **Autoplay** : la musique ne démarre qu'après un geste utilisateur (clic
  NEW GAME/CONTINUE) — pas de blocage navigateur.
- **Monde 100 % pur** : aucun event audio ajouté ; `main.js` observe l'état du
  monde chaque frame et en déduit la piste désirée.

## Architecture

### 1. Pistes musicales — `scripts/music.mjs` (nouveau) + 3 assets

- Script node zéro-dépendance (réutilise l'encodeur WAV de `sfx.mjs` : 16-bit
  PCM mono 22050 Hz). Compose 3 boucles de ~20-25 s **alignées sur la mesure**
  (fin = frontière de mesure, pas de fondu) pour un loop propre :
  - `music-0.wav` — nuit urbaine : synthwave calme, gamme mineure, ~90 BPM,
    arpèges doux + basse ronde.
  - `music-1.wav` — industriel : tendu, ~112 BPM, basse martelée, hats bruités.
  - `music-2.wav` — zone toxique : mystérieux, ~76 BPM, arpèges flottants,
    intervalles ouverts.
- Structure : table de notes (fréquences) par piste, voix carré/triangle +
  percussions bruit, enveloppes exponentielles — même style de code que
  `sfx.mjs`. Chaque piste ≈ 1 Mo.
- Mapping : piste `music-<n>` ↔ décor `bgSet n`.

### 2. Moteur audio — `src/engine/audio.js` (étendu)

`createAudio(sources, AudioCtor)` gagne :

- `setSfxVolume(v)` : v ∈ [0,1], appliqué (`clip.volume`) à tous les clips SFX
  existants et futurs `play()`.
- `setMusicVolume(v)` : idem pour la piste musicale en cours et les suivantes.
- `setMusic(key | null)` : `key` = nom d'un clip (ex. `music-0`).
  - Même clé que la piste courante → no-op (la boucle continue).
  - Nouvelle clé → stoppe la piste courante (pause + currentTime=0), lance la
    nouvelle avec `loop = true` et le volume musique courant.
  - `null` → stoppe la piste courante.
  - Lecture best-effort (mêmes try/catch que `play()`).
- Les pistes musicales sont déclarées dans les mêmes `sources` (chargées via
  imports Vite dans `main.js`, comme les SFX).

### 3. Sélection de piste — `src/game/music.js` (nouveau, pur)

- `musicFor(state, bgSet)` → `'music-<bgSet>'` si `state` ∈ {PLAY, PAUSE,
  LEVEL_COMPLETE}, sinon `null`.
- `main.js`, dans la boucle update : `audio.setMusic(musicFor(world.sm.get(),
  world.bgSet))` — l'idempotence de `setMusic` rend l'appel par frame gratuit.

### 4. Réglages — `src/game/settings.js` (nouveau, pur)

- Volumes stockés en **crans 0..10** (défaut **7**).
- `loadSettings(storage)` → `{ sfx, music }` (clamp 0..10, entiers ; valeurs
  invalides → défaut).
- `saveSettings(settings, storage)` → persiste `jetpackbot.volSfx` /
  `jetpackbot.volMusic`.
- `volumeToGain(cran)` → cran/10 (linéaire, suffisant ici).

### 5. Écran OPTIONS — état + logique + rendu

- `States.OPTIONS` ; transitions `MENU ↔ OPTIONS` et `PAUSE ↔ OPTIONS`.
  Retour à l'écran d'origine : `world.optionsReturn` (`'menu'` | `'pause'`)
  posé à l'ouverture ; RETOUR et Escape y renvoient (la pause reste gelée —
  OPTIONS ne touche pas à la partie en cours).
- Boutons OPTIONS du menu principal et de la pause passent `enabled: true`.
- `src/game/options.js` (nouveau, pur) : `createOptions(settings)` →
  `{ rows: [{id:'sfx', label:'SFX', value}, {id:'music', label:'MUSIQUE',
  value}], focus: 0 }` — focus 0 = ligne SFX, 1 = ligne MUSIQUE, 2 = bouton
  RETOUR (rect `CONFIG.OPTIONS_BTN`). `moveOptionsFocus(opt, dir)` (haut/bas,
  wrap 0→1→2→0) ; `adjust(opt, dir)` (±1 sur la ligne focusée, clamp 0..10,
  no-op quand le focus est sur RETOUR) ; `barHitTest(opt, x, y)` (clic sur un
  segment → `{ id, value }`, `null` hors zone).
- Routing `world.js` : `press` en OPTIONS (clic segment → set valeur ; clic/
  activation RETOUR → retour origine), `navMenu` (haut/bas), nouveau
  `adjustAction(world, dir)` (gauche/droite), `escapeAction` (retour origine).
  Chaque changement de valeur : met à jour `world.settings`, pousse l'event
  `'volumechange'` (main.js persiste + applique les gains + joue le blip
  `score` en feedback SFX).
- `src/render/options.js` (nouveau) : voile sombre (comme pause), titre
  `OPTIONS`, deux lignes label + barre segmentée 0..10 (segments pleins cyan
  `#3ef0ff` / vides gris, ligne focusée surlignée), bouton RETOUR (plaques
  partagées `drawButtons`). Géométrie dans `CONFIG` (`OPTIONS_*`).

### 6. Input — `src/engine/input.js` (étendu)

- ArrowLeft / ArrowRight → nouveau callback `onAdjust(dir)`. Contrairement aux
  autres touches, le **key-repeat est accepté** (pas de garde `!e.repeat`) pour
  balayer la barre en restant appuyé.
- `main.js` le branche sur `adjustAction(world, dir)` (gated
  `!codeInput.isOpen()` comme les autres).

### 7. Wiring `main.js`

- Charge `music-0/1/2.wav` via imports dans les `sources` audio.
- Boot : `loadSettings` → `audio.setSfxVolume/setMusicVolume`.
- Boucle : event `'volumechange'` → `saveSettings` + application des gains +
  blip feedback ; puis `audio.setMusic(musicFor(...))` chaque frame.

## Hors périmètre

- Piste musicale au menu principal (choix : silence).
- Volumes dans le code de sauvegarde (save v2 — plus tard si besoin).
- Ducking/fondu enchaîné entre pistes (switch sec acceptable, les états qui
  changent de piste passent par LEVEL_COMPLETE ou le menu).

## Tests

Vitest :
- `settings.js` : défauts, clamp, round-trip storage, valeurs corrompues,
  `volumeToGain`.
- `audio.js` : `setSfxVolume` applique aux clips ; `setMusic` lance avec
  `loop=true` + volume courant, no-op même clé, switch stoppe l'ancienne,
  `null` stoppe ; `setMusicVolume` s'applique à la piste en cours (AudioCtor
  factice injecté, comme les tests existants).
- `music.js` : `musicFor` pour chaque état × bgSet.
- `options.js` : création depuis settings, focus (wrap, lignes + retour),
  adjust (clamp, no-op sur retour), barHitTest (segments, hors zone).
- `world.js` : MENU→OPTIONS→MENU ; PAUSE→OPTIONS→PAUSE (partie gelée,
  robot immobile) ; adjust pousse `volumechange` et met à jour
  `world.settings` ; Escape ; boutons OPTIONS enabled dans menu + pause.
- `state.js` : transitions OPTIONS.

Playwright avant merge : écran OPTIONS depuis menu et pause, clic segments,
flèches gauche/droite, persistance des volumes après reload, musique audible
en jeu (présence de l'élément audio en lecture), switch de piste au changement
de niveau, arrêt au gameover. Écoute manuelle des 3 pistes par Jael au merge.
