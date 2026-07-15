# Logres — Tuto, reprise de règne (CONTINUER) & polish du choix de roi

Date : 2026-07-15
Statut : approuvé

## Objectif

Trois features pour l'accueil et la persistance d'un joueur de Logres :

1. **Tuto** — coach-marks contextuels au premier règne (voix de Merlin).
2. **CONTINUER** — reprendre un règne interrompu (sérialisation de l'état de règne).
3. **Choix de roi** — polish de l'écran existant (rois verrouillés, repères, record).

Elles sont indépendantes mais convergent sur le **menu**, qui s'adapte selon
qu'un règne est en cours ou non.

## État existant (à ne pas re-construire)

- **Persistance méta** (`src/game/score.js`, clé `logres.progress`) : `best`
  (record d'années), `king` (index sélectionné), `musicVol`, `sfxVol`.
- **Code portable** `LG1-XXX` (`src/game/save.js`) : encode `{best, king}`.
- **Dynastie** (`src/game/dynasty.js`) : 4 rois débloqués par `best`
  (Arthur 0 / Uther 15 / Constantin 30 / Morgane 45).
- **Choix de roi** (`src/main.js`, `app.mode === 'menu'`) : carousel ←/→
  (`selectKing`), tap centre = `startReign()`. `startReign()` **no-op silencieux**
  si le roi est verrouillé (`isUnlocked`).
- **Reign** (`src/game/reign.js`) : `{gauges, flags:{set:Set,counts}, years, era,
  seen:Set, recent:[], next, dead, miracle, current, combat, combatResult}`.
  L'ère se dérive de `years` (`eraForYears`).
- **Abandon** (`abandonReign()`) : remet `app.reign = null`, retour menu — **destructif**.

## 1. CONTINUER — reprise d'un règne en cours

### Sérialisation

Nouveau module pur `src/game/persist-reign.js` :

- `serializeReign(reign)` → objet JSON : `{ gauges, flags:{set:[...], counts},
  years, seen:[...], recent:[...], next, currentId: reign.current?.id, king }`.
  (`era` non stockée — redérivée ; `dead`/`miracle`/`combat`/`combatResult` non
  stockés — voir cas du duel.)
- `deserializeReign(data, cards)` → reign jouable : reconstruit les `Set`, relie
  `current` par `currentId` (via `cards`), remet `era = eraForYears(years)`,
  `dead/miracle/combat/combatResult` à leur valeur initiale (null).
- Robustesse : entrée corrompue / carte introuvable / version inconnue → renvoie
  `null` (le CONTINUE est alors masqué, pas de crash).

### Autosave

Dans `src/main.js`, après chaque `choose()` laissant le joueur sur une carte
(`!reign.combat && !reign.dead`) : `saveReign(serializeReign(reign))` sur la clé
`logres.reign`. Un seul write, silencieux si stockage indispo.

### Cas du duel (simplification assumée)

On **n'écrase pas** la save pendant une Épreuve d'armes. Quitter en plein duel →
CONTINUER ramène à la carte qui a déclenché le combat (re-livré). Évite de
sérialiser l'état de `combat.js` pour un gain marginal. Documenté, extensible.

### Cycle de vie de la save de règne

- **Mort** (`endReign`) → `clearReign()`.
- **Menu depuis la pause** → la save **reste**. Le bouton pause « Abandonner »
  devient **« Menu »** (non destructif) ; `abandonReign()` ne touche plus la save.
- **NOUVEAU RÈGNE** depuis le menu (règne en cours présent) → écran de
  **confirmation** (OUI/NON, focus NON) ; OUI → `clearReign()` + `startReign()`.
- Le code `#save=`/LG1 ne restaure **que** la méta (`best`, `king`) — inchangé.

## 2. Tuto — coach-marks contextuels

- Module pur `src/game/tutorial.js` : machine à 3 étapes.
  `createTutorial()` → `{step:0, done:false}` ; `advance(tuto, event)` fait
  progresser selon l'événement (`'draw'`, `'preview'`, `'choose'`).
- Rendu `src/render/tutorial.js` : bulle parchemin + texte (voix de Merlin),
  ancrée près de la carte (étapes 1,3) ou des jauges (étape 2).
- **Déclenchement** : dans `startReign()`, si `!progress.tutoVu` → `app.tutorial =
  createTutorial()`. Sinon null.
- **Les 3 étapes** (base uniquement, ton Merlin) :
  1. 1ʳᵉ carte : « Glisse la carte, jeune roi — à gauche, ou à droite. »
     → avance sur `preview` (le joueur amorce le geste).
  2. aperçu : flèche vers les jauges, « Ton choix fait vivre ces quatre pouvoirs. »
     → avance sur `choose`.
  3. après le 1ᵉʳ choix : « Qu'une seule s'éteigne ou s'embrase, et ton règne
     s'achève. » → se ferme sur le `choose` suivant (ou un tap).
- **Fin** : `done=true` → `progress.tutoVu = true` + `saveProgress`.
- **Re-consultable** : hotspot « ? » au menu → remet `progress.tutoVu = false` +
  `saveProgress` (persisté) ; le prochain `startReign` ré-affiche donc les bulles
  puis repasse `tutoVu = true`. Mini-toast « Merlin te guidera à nouveau ».
- N'enseigne **pas** quêtes / reliques / combat.
- `progress.tutoVu` ajouté aux defaults/load/save de `score.js`.

## 3. Choix de roi — polish

Dans `src/main.js` (menu) + `src/render/renderer.js` (rendu menu) :

- **Roi verrouillé** : afficher « Scellé — règne jusqu'à l'an X pour l'éveiller »
  au lieu de « Tape pour régner ». Tap centre sur roi verrouillé → son sourd
  (`glas` à faible volume ou sfx dédié) + no-op (au lieu du silence).
- **Repères de lignée** : points ● (débloqué) / ○ (verrouillé) situant le roi
  courant ; **record d'années** affiché (rend lisible « survivre = débloquer »).
- **Persistance des déblocages** : ligne discrète « Ta lignée se souvient de tous
  les rois éveillés. »

## Flux du menu

- **Règne en cours** (`hasSavedReign()`) → primaire **CONTINUER** (+ l'an en cours),
  secondaire **NOUVEAU RÈGNE** (→ confirmation). Pas de carousel roi (on reprend
  le roi du règne).
- **Pas de règne** → menu actuel : carousel rois + « Tape pour régner » + code + « ? ».

## Tests & vérification

- **Unitaires (Vitest)** :
  - round-trip `serialize→deserialize` : reign identique (gauges, flags, years,
    seen, recent, next, current) et re-jouable via `draw`/`choose` ;
    entrée corrompue → `null`.
  - `tutorial.js` : avancement des étapes sur la séquence d'événements ; `done`.
  - `startReign` bloqué + feedback sur roi verrouillé (logique testable).
- **Vérif visuelle (puppeteer)** : 3 bulles au 1ᵉʳ règne ; quitter mid-règne →
  CONTINUER restaure jauges/an/carte ; roi verrouillé → feedback ; NOUVEAU RÈGNE
  → confirmation ; « ? » re-arme le tuto.

## Hors périmètre (YAGNI)

- Sérialisation de l'état de duel (`combat.js`).
- Tuto sur quêtes / reliques / combat.
- Refonte visuelle du menu au-delà du nécessaire.
- Save cloud / backend (backlog Supabase, cf projet Jetpack).
