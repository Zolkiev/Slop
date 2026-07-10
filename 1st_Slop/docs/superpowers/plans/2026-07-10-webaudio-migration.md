# Migration Web Audio API — Implementation Plan

**Goal:** Éliminer le lag iPhone en remplaçant `HTMLAudioElement` par la Web
Audio API (`AudioContext` + buffers décodés), et plafonner le rendu à 60 fps
sur les écrans 120 Hz.

**Diagnostic (2026-07-10) :** rendu mesuré sain en WebKit (~10 drawImage,
0,2 ms JS/frame), input `pointerdown` correct, boucle timestep fixe correcte.
Cause probable du lag : `clip.currentTime = 0; clip.play()` sur
`HTMLAudioElement` à CHAQUE tap (sfx-thrust) — seek+play janke le main thread
sur iOS (~dizaines de ms), latence 100-300 ms, et iOS **ignore `volume`**
(sliders morts sur iPhone). Aggravant : `render()` par rAF = 120 Hz sur
iPhone Pro (travail doublé).

**Architecture :** `src/engine/audio.js` réécrit sur Web Audio en conservant
EXACTEMENT l'API publique (`play`, `setSfxVolume`, `setMusicVolume`,
`setMusic`) + un nouveau `unlock()`. Graphe : sources → gain sfx / gain
musique → destination. Déblocage autoplay : `ctx.resume()` appelé dans le
geste utilisateur. Sémantique de retry conservée : si la musique ne peut pas
démarrer (contexte suspendu, buffer pas encore décodé), `musicKey` reste
null → le `musicFor` par frame de main.js réessaie (même pattern que le fix
autoplay historique).

## Global Constraints

- Branche `feat/webaudio`, worktree `Slop/.claude/worktrees/webaudio`.
  Chemins relatifs = depuis `<worktree>/1st_Slop`. Baseline : 339 tests verts.
- **API publique de `createAudio` inchangée** : main.js ne change que pour
  le câblage d'`unlock()`. Aucun changement de world/render/game.
- Zéro dépendance runtime. Code/commentaires/commits en français. TDD.
- Modules purs testables : toutes les dépendances navigateur injectables
  (`ctx` factory, `fetch`). Les tests ne créent JAMAIS de vrai AudioContext.
- Le décodage des 10 WAV (~11 Mo) se fait en tâche de fond au boot ;
  `play`/`setMusic` avant fin de décodage = no-op silencieux (best effort),
  JAMAIS d'exception.
- Volumes : `setSfxVolume`/`setMusicVolume` reçoivent 0..1 comme aujourd'hui
  et pilotent `gain.value` (marche sur iOS, contrairement à `volume`).
- Vérif finale en vrai navigateur (chromium + webkit Playwright) avec
  `--autoplay-policy=user-gesture-required` côté chromium : musique menu
  démarre après premier geste, sfx au tap, volumes appliqués, zéro erreur.
- Gate final : Jael sur SON iPhone après merge + déploiement Pages.

## Tasks

### Task 1: Réécriture Web Audio de `src/engine/audio.js` (TDD)

**Files:** Modify `src/engine/audio.js`, `tests/engine/audio.test.js`.

- Nouvelle signature : `createAudio(sources, { fetchFn = fetch, createCtx } = {})`
  — `createCtx` par défaut : `() => new (window.AudioContext || window.webkitAudioContext)()`.
- Init : contexte créé immédiatement, 2 GainNodes (sfx, musique) connectés à
  `ctx.destination` ; pour chaque source : `fetchFn(url)` → `arrayBuffer()` →
  `ctx.decodeAudioData` → buffer stocké (promesses en fond, erreurs avalées
  en best-effort, `loaded` map).
- `play(name)` : buffer prêt et ctx `running` → `createBufferSource()`,
  `connect(sfxGain)`, `start()`. Sinon no-op. (Les sources Web Audio sont
  one-shot : une nouvelle par lecture, c'est le modèle normal.)
- `setMusic(key, loop=true)` : dédup par `musicKey` identique à l'ancienne ;
  stop = `source.stop()` + déconnexion, best-effort try/catch. Démarrage
  impossible (ctx pas `running` OU buffer absent) → `musicKey = null`
  (retry par frame). Fin de piste non bouclée (jingle) : rien à faire.
- `unlock()` : `ctx.resume()` best-effort (promesse avalée). Idempotent.
- Tests : fakes `createCtx`/`fetchFn` (buffers factices, decode résolu
  contrôlable, état `suspended`/`running` pilotable). Couvrir : play avant/
  après décodage, gains appliqués, dédup setMusic, retry après suspension
  (musicKey relâché), stop de l'ancienne musique au changement, unlock
  appelle resume, aucune exception si decode échoue.

### Task 2: Câblage `unlock()` + vérif navigateur réelle

**Files:** Modify `src/main.js` (+ `src/engine/input.js` seulement si
nécessaire), smokes durables si besoin.

- Appeler `audio.unlock()` dans les handlers de geste EXISTANTS de main.js
  (le callback `onPress` est déjà déclenché par pointerdown/keydown —
  vérifier que l'appel se fait bien DANS la pile du geste ; sinon brancher
  directement sur l'événement).
- `npx vitest run` complet.
- Vérif Playwright (serveur vite :5199 depuis `<worktree>/1st_Slop`,
  chromium `--autoplay-policy=user-gesture-required` PUIS webkit) : au
  chargement pas de son ; après un clic, musique menu audible (état ctx
  `running`, source musique active) ; taps en jeu → sources sfx créées ;
  OPTIONS volume musique 0 → gain à 0. Zéro erreur console.
- Les smokes durables qui patchent `window.Audio`
  (`Slop/.claude/smokes/*.mjs`) : vérifier lesquels cassent ; adapter leur
  interception au Web Audio (patcher `AudioContext.prototype`) SANS changer
  leurs assertions de fond.

### Task 3: Plafonner le rendu à 60 fps (TDD)

**Files:** Modify `src/engine/loop.js`, `tests/engine/loop.test.js`.

- Extraire une fonction pure testable `shouldRender(now, lastRender, minInterval = 15)`
  (15 ms ≈ laisse passer 60 Hz, saute 1 frame sur 2 à 120 Hz).
- Dans `frame()` : updates fixes inchangés ; `render()` seulement si
  `shouldRender` ; `lastRender` mis à jour au rendu.
- Tests : à 120 Hz (intervalles 8,33 ms) ~1 rendu sur 2 ; à 60 Hz (16,7 ms)
  aucun rendu sauté.

### Task 4: Review finale + déploiement + gate iPhone

- Review finale de branche (fable), merge `--no-ff` vers main, push →
  déploiement Pages automatique → **GATE JAEL SUR IPHONE** (bloquant) :
  lag disparu ? sliders volume opérants ? musique OK après premier tap ?
