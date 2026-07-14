# Spec — L'Épreuve d'armes (système de combat de Logres)

> Design validé par Jael (2026-07-14) sur les quatre curseurs : combats **rares
> et dramatiques**, mort **aux seuls climax**, champion **selon le contexte**,
> **pur swipe** (aucune règle nouvelle à apprendre). Inspiration « Magic » :
> deux cartes qui s'affrontent, pas un moteur tactique. La boucle swipe reste
> le cœur (DESIGN §10, idée actée du 2026-07-12).

## 1. Vision

Certaines cartes narratives ne se résolvent plus en un swipe : le choix ouvre
un **duel de cartes**. La carte de l'adversaire glisse en scène face à celle de
ton champion — deux vitraux qui se toisent, chacun avec ses **blasons** (points
de vie). Chaque manche, une **carte de manœuvre** se pioche : gauche ou droite,
deux options tranchées, résolues par l'état de ton règne. En 3 à 5 swipes, le
duel est plié — victoire, défaite, ou retraite.

Le combat ne teste pas les réflexes : il **encaisse tes choix passés**.
Excalibur rendue au lac ? Tu frappes moins fort. Lancelot banni ? Il ne
répondra pas au champ clos. La Foi haute ? La prière soigne vraiment.

## 2. Principes actés (ne pas rediscuter)

1. **Rare et dramatique** : 2 à 4 combats par règne, portés par des cartes
   existantes (climax d'arcs et grands défis). Pas d'escarmouches aléatoires.
2. **Mort aux seuls climax** : un combat `fatal: true` (Camlann) peut finir le
   règne. Les autres coûtent des jauges et posent des flags (défaite,
   humiliation, champion blessé) mais ne tuent jamais directement.
3. **Champion selon le contexte** : le roi pour les duels personnels ; sinon un
   champion résolu par les flags (priorités par combat, repli sur le roi).
4. **Pur swipe** : une manœuvre = une carte à deux choix. Résolution
   **déterministe** (pas de dé) : les dégâts et les parades découlent des
   jauges et des flags. Zéro ressource à gérer, zéro règle affichée.

## 3. Modèle de résolution

### 3.1 État de combat

`reign.combat` (null hors combat) :

```js
{
  def,        // définition du combat (registre COMBATS)
  champion,   // { name, portrait, isKing } résolu à l'entrée
  selfHp,     // blasons du champion (2-4 selon le combat)
  foeHp,      // blasons de l'adversaire
  round,      // manche courante (1..maxRounds)
  deck,       // ids de manœuvres restantes (pioche sans remise, ordonnée)
  current,    // carte de manœuvre présentée
}
```

### 3.2 Manœuvres

Une manœuvre est une carte au format existant (`speaker`, `text`, `left/right`)
dont les côtés portent des **effets de combat** au lieu d'effets de jauges :

```js
{
  id: 'man.charge',
  speaker: 'Bédivère', // le second commente le duel — la voix du combat
  text: "Il baisse sa garde à chaque assaut, Sire. Une charge le briserait — ou t'ouvrirait à son fer.",
  left: {
    label: 'Charger',
    strike: { dmg: 1, gauge: 'chevalerie', min: 60, bonus: 1 }, // +1 si chevalerie ≥ 60
    expose: 1,   // l'adversaire te rend 1 blason à la manche suivante si tu rates le bonus
  },
  right: {
    label: 'Garde haute',
    guard: 1,    // absorbe 1 dégât adverse cette manche
    strike: { dmg: 0 },
  },
}
```

Vocabulaire complet des effets de manœuvre (fermé, volontairement petit) :
- `strike { dmg, gauge?, min?, bonus? }` — dégâts infligés, bonus si la jauge
  passe le seuil ;
- `guard n` — parade : absorbe n dégâts adverses cette manche ;
- `expose n` — contre-attaque adverse si le bonus de `strike` n'est pas obtenu ;
- `heal { gauge, min, hp }` — regagne des blasons si la jauge passe le seuil
  (prière, chant de guerre) ;
- `requiresFlags` / `noneFlags` — la manœuvre n'apparaît que si l'histoire le
  permet (sort de Morgane, Excalibur au poing…).

**L'adversaire frappe chaque manche** (`foe.atk`, constant et annoncé par le
texte), moins la `guard` du choix. La lisibilité vient de là : tu sais ce que
l'ennemi va faire, tu choisis quoi lui opposer.

### 3.3 Fin de combat

- `foeHp ≤ 0` → **victoire** : `outcome.win` (effets de jauges + flags).
- `selfHp ≤ 0` → **défaite** :
  - combat `fatal` et champion = roi → mort (cause dédiée). **Le Fourreau boit
    le coup** comme pour une mort de jauge (une fois, même promesse que
    `relics.js`) → défaite non mortelle à 1 blason.
  - sinon → `outcome.lose` (jauges + flags ; un champion peut y rester :
    flag `champion.tombe.<combat>`).
- `round > maxRounds` → **retraite** : `outcome.draw` (les deux camps se
  séparent, coût modéré). Garantit la terminaison.

Après le combat, les effets/flags du côté choisi sur la carte déclencheuse ne
s'appliquent PAS (le combat les remplace) ; l'année avance d'un an, comme un
swipe normal.

## 4. Les combats du lancement (4)

| id | Déclencheur (carte existante, côté) | Champion | Fatal | Adversaire |
|---|---|---|---|---|
| `camlann` | `chute.camlann.duel`, gauche « Charger Mordred » | le roi, toujours | **oui** | Mordred, atk 2, 4 blasons |
| `champ.clos` | `common.heraut.defi`, gauche « Relever le défi » | Lancelot (`lancelot.cour` sans `lancelot.banni`) > Gauvain > le roi | non | Le roi d'Outre-Humber, atk 1, 3 blasons |
| `bataille.saxonne` | `common.saxons.raid`, gauche « Lever l'ost » | le roi (à la tête de l'ost) | non | Chef de guerre saxon, atk 1, 3 blasons — manœuvres d'armée (moral = couronne) |
| `tournoi` | `camelot.tournoi.grand`, gauche « Le grand tournoi » | Perceval > Gauvain > le roi | non | Le Chevalier Noir, atk 1, 2 blasons — enjeu de prestige |

- La carte déclencheuse garde son côté droit « sans combat » (payer, refuser,
  décliner) : le combat est toujours **un choix**, jamais subi.
- `chute.camlann.duel` perd son `-30 chevalerie` forfaitaire : c'est le combat
  qui décide désormais (la note d'intensification du plan contenu reste vraie :
  Table fracturée et Camelot vidé → jauges basses → moins de bonus).
- Chaque combat a 2-3 manœuvres **dédiées** (le sort de Morgane à Camlann si
  `morgane.cour`, la charge de l'ost aux Saxons…) + un petit pool commun
  (charge / garde / feinte / prière), pioché sans remise. `maxRounds = 5`.

## 5. Présentation (render + audio)

- **Mise en scène Magic** : carte adverse en haut (format réduit, ~55 %),
  carte du champion en bas, la manœuvre au centre — c'est ELLE qu'on swipe,
  avec le même moteur (drag, labels, désintégration).
- **Blasons** : petits écus de vitrail sur chaque carte (pleins/vides). Pas de
  chiffres.
- Les **jauges restent visibles** (elles alimentent les bonus) ; l'aperçu
  or/rouge pendant le drag s'applique aux blasons en combat.
- Fond assombri + voile rouge léger ; le décor d'ère reste.
- **Audio** : piste `bataille` générée par `scripts/music.mjs` (percussions
  martiales, modal sombre — recette existante, coût nul) ; SFX `choc` (fer) et
  `ovation` (victoire) via `scripts/sfx.mjs`.
- La carte déclencheuse annonce le duel dans son texte (déjà le cas : Camlann,
  champ clos, ost).

## 6. Intégration moteur (portée du changement)

Nouveau module **`src/game/combat.js`** (logique pure, testable sans DOM) :
`startCombat(reign, def)`, `drawManoeuvre(combat, rng)`,
`resolveManoeuvre(reign, side)`, registre `COMBATS` dans
`src/game/combats/index.js` (données, comme les cartes).

Changements existants, volontairement minces :
- `reign.js` : `choose()` détecte `choice.combat` → `startCombat` au lieu de la
  résolution normale ; `reign.combat` s'ajoute à l'état.
- `main.js` / `renderer.js` : mode de rendu combat (le mode logique reste
  `play` ; `reign.combat != null` suffit), swipe routé vers `resolveManoeuvre`.
- `relics.js` : réutilisé tel quel pour le coup fatal (même contrat).
- **`deck.js`, `gauges.js`, `flags.js`, `save.js` : intouchés.**

## 7. Invariants & tests (`test/combat.test.js` + fuzz)

1. **Terminaison** : tout combat finit en ≤ `maxRounds` manches, quel que soit
   l'enchaînement de choix (fuzz dédié).
2. **Déterminisme** : même état de règne + mêmes choix → même issue.
3. **Champion** : la résolution par flags tombe toujours sur quelqu'un (repli
   roi garanti) ; jamais un champion exclu par les flags.
4. **Fatal borné** : seuls les combats `fatal` peuvent tuer, uniquement le roi,
   et le Fourreau intercepte une fois.
5. **Manœuvres jouables** : à toute manche, ≥ 1 manœuvre du deck est éligible
   (les `requiresFlags` ne peuvent pas assécher la pioche — pool commun sans
   condition).
6. **Fuzz règne entier** : le fuzz 1000 règnes existant traverse les combats
   (choix aléatoires) sans blocage ni état invalide.

## 8. Découpage en sous-lots (pour le plan d'implémentation)

1. **Tests d'abord** : `combat.test.js` (résolution, terminaison, champion,
   fatal/Fourreau) sur un combat de fixture.
2. **Moteur** : `combat.js` + registre + intégration `reign.choose`.
3. **Contenu** : les 4 combats + manœuvres communes et dédiées.
4. **Rendu** : mise en scène duel + blasons + aperçu pendant le drag.
5. **Audio** : piste `bataille`, SFX `choc`/`ovation` (⚠ verdict d'écoute Jael
   avant commit des WAV, comme pour la passe graves).
6. **Fuzz intégré + verify manuel** (jouer Camlann de bout en bout).

## 9. Critères d'acceptation

- Un règne complet rencontre 2-4 combats, tous déclenchés par un choix.
- Camlann perdu au roi sans Fourreau → mort dédiée ; avec Fourreau → survie.
- Aucun combat ne dépasse 5 manches ; aucune pioche de manœuvre vide.
- Suite Vitest verte (dont fuzz traversant les combats).
- Verify visuel : duel lisible (blasons, manœuvre swipeable, désintégration).
