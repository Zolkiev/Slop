# Avalon — Le Déclin (design)

Date : 2026-07-15 · Statut : validé par Jael, prêt pour plan d'implémentation

## 1. Le problème

Avalon est l'épilogue de Logres (ère 5, an 44+). Aujourd'hui, c'est la pire ère du jeu,
et c'est la dernière chose que le joueur voit.

Mesuré sur 2000 règnes simulés (choix gauche/droite à pile ou face, RNG déterministe) :

| Mesure | Valeur |
| --- | --- |
| Règnes atteignant Avalon | 62 % |
| Tours passés en Avalon | médiane 22, p90 50, max 90 |
| **Part des 2 fillers dans les cartes Avalon vues** | **68 %** |
| Pioche vide (`pickCard` → null) | 0 (jamais) |

Deux tiers de l'épilogue sont deux cartes en alternance (`avalon.filler.excalibur`,
`avalon.filler.memoire`). Aucun crash — les fillers étant rejouables, la pioche ne
s'assèche jamais — mais la fin du jeu est une boucle.

### Cause racine (trois facteurs cumulés)

1. Les 29 cartes `common` sont taguées `ERAS_VIVANTES` (`roche,camelot,graal,chute`) :
   elles sont **exclues d'Avalon**. Les autres ères piochent dans ~35 + 29 = 64 cartes,
   Avalon dans 22.
2. Avalon est la **seule ère sans borne** : `{ id: 'avalon', until: null }` dans
   `src/config.js`. On y entre à l'an 44 et on y reste jusqu'à la mort.
3. Il n'y a que **2 cartes rejouables** dans Avalon pour combler ce temps illimité.

Les autres ères ne souffrent pas : leur fenêtre de 12 ans est largement couverte par
leurs uniques + les commons. Avalon cumule les trois handicaps.

L'exclusion des commons est un **bon choix narratif** (Arthur se meurt, on ne lui parle
plus de récoltes et de péages) — ce n'est pas le bug. Le bug est l'ère non bornée.

### Constat annexe

Le champ `filler: true` présent sur 10 cartes (2 par ère) **n'est lu par aucune logique** :
il est purement documentaire. Aucune action requise ici, mais à ne pas confondre avec un
mécanisme actif.

## 2. Le principe

**Arthur ne perd pas Logres : Logres lui échappe.**

À chaque tour passé en Avalon, les quatre jauges s'érodent d'un cran. Le roi ne peut plus
tout tenir. La mort vient d'elle-même en une dizaine de tours, et **la jauge qu'on défend
en dernier décide de la saveur de la fin**.

L'épilogue redevient ce qu'il doit être : court, mortel, et signé par le joueur.

## 3. Décisions de design

### 3.1 Le déclin

- S'applique **uniquement en Avalon**, après la résolution des effets de la carte.
- Érode les **quatre jauges** de `AVALON_DECLIN = 3` points par tour.
- Ne s'applique à **aucune autre ère** — Roche, Camelot, Graal et Chute sont inchangés.
- Borné par les mêmes bornes que les jauges (0..100) ; le déclin peut donc **tuer**.

**Ordre exact dans le tour.** `choose()` (`reign.js`) fait aujourd'hui, dans cet ordre :
effets → flags → `years += 1` → **recalcul de `reign.era`** → `checkDeath` → `tryCancelDeath`.

`reign.era` est donc **déjà réécrit** quand la mort est testée. Passer `reign.era` à
`checkDeath` provoquerait un bug de bord : à la bascule an 43 → 44, une mort causée par
une carte de **la Chute** afficherait un texte **d'Avalon**.

**Décision : `choose()` capture l'ère jouée en tête de fonction** (`const eraPlayed = reign.era;`,
avant toute mutation) et s'en sert pour les deux usages :

1. effets de la carte
2. flags du choix
3. **déclin** — si `eraPlayed === 'avalon'`
4. `years += 1` ; `reign.era = eraForYears(reign.years)`
5. `checkDeath(reign.gauges, eraPlayed)`
6. `tryCancelDeath` (inchangé)

Le déclin s'applique ainsi aux tours **joués** en Avalon (pas au tour de bascule, dont la
carte appartenait à la Chute), et le texte de mort correspond toujours à l'ère de la carte
qui l'a causée.

**Interaction avec le Fourreau (assumée).** `tryCancelDeath` annule une mort une seule
fois. Une mort par déclin sera donc absorbée par le Fourreau si le joueur le détient : il
gagne un sursis, puis le déclin le reprend au tour suivant. C'est cohérent — le Fourreau
retarde la mort d'Arthur, il ne le rend pas immortel — et aucun code n'est à toucher.

Calibration mesurée (3000 règnes par valeur, même simulation que §1) :

| Déclin | Tours en Avalon (méd / p90 / max) | Morts vide / plein |
| --- | --- | --- |
| 0 (actuel) | 22 / 50 / 90 | 6 % / 94 % |
| 2 | 15 / 23 / 32 | 100 % / 0 % |
| **3 (retenu)** | **10 / 15 / 21** | 100 % / 0 % |
| 4 | 8 / 12 / 16 | 100 % / 0 % |
| 5 | 6 / 9 / 12 | 100 % / 0 % |

`3` tient la cible « épilogue de 8-12 tours » (médiane 10) tout en gardant une queue de
distribution : un roi acharné peut s'accrocher ~20 tours. Le max passe de 90 à 21.

**Ce chiffre est une valeur de départ, pas une constante gravée.** La calibration ci-dessus
a été mesurée sur le contenu **actuel** ; les 4-6 cartes neuves de §3.3 changeront les
dynamiques de jauges. `AVALON_DECLIN` doit être **revalidé par simulation une fois le
contenu écrit**, et ajusté (probablement entre 2 et 4) si la médiane sort de 8-12. L'ordre
des tâches du plan doit donc placer la calibration finale **après** le contenu.

Réserve de méthode : la simulation choisit gauche/droite à pile ou face, alors qu'un joueur
réel pilote ses jauges et survivra sans doute plus longtemps. Les valeurs absolues sont donc
indicatives ; c'est le **classement relatif** des déclins et la part de fillers qui guident.
Le gate visuel de §7 tranche en dernier ressort.

### 3.2 Les morts d'Avalon

Le déclin tire les jauges vers 0 : **toutes les morts en Avalon deviennent des morts
« à vide »** (100 %, contre 6 % aujourd'hui). Or les textes de `GAUGES` dans `config.js`
sont écrits pour un roi **vivant et régnant** :

> « Les barons se soulèvent ; ta couronne roule dans la boue »
> « Le plus grand chevalier t'usurpe » · « L'Inquisition te brûle »

On ne renverse pas un mourant. Ces textes sonneraient faux comme fin d'agonie.

**Décision : Avalon a ses propres textes de mort « à vide ».** Quatre textes d'extinction
au lieu de quatre textes de renversement — la foi qui s'éteint, la magie qui reflue, la
Table qui se tait, la couronne qui glisse.

**Contrainte narrative à respecter :** aujourd'hui, la mort la plus fréquente en Avalon
est magie=100 → « Les fées d'Avalon te réclament ; Morgane t'emporte hors du monde »,
la fin la plus juste du jeu. Le déclin la rend injoignable. Le nouveau texte
**magie-à-vide d'Avalon doit reprendre cette charge mythique** (le reflux d'Avalon,
Morgane, la brume qui se referme) pour ne pas perdre cette fin — elle change de porte,
pas de nature.

Les textes « à plein » existants restent en place et inchangés : ils ne fireront
quasiment plus en Avalon (0 % en simulation), mais restent la mort normale des quatre
autres ères.

### 3.3 Le contenu

**4 à 6 cartes rejouables** (non `unique`) d'épilogue, pour que les ~10 tours d'Avalon ne
soient pas deux fillers en alternance.

Ton : on ne gouverne plus. On règle des comptes, on se souvient, on prépare la légende,
on refuse ou accepte de partir. Pas de dilemme de gestion du royaume — Arthur n'est plus
en état de lever un impôt.

Cible : ramener la part de fillers dans les cartes Avalon vues **sous les 40 %** (contre
68 % aujourd'hui).

## 4. Hors périmètre (explicitement)

- **Pas de nouveau type de fin dans le moteur.** `checkDeath` reste la seule autorité sur
  la mort ; on ne crée pas de fin « barque » scénarisée. (Option écartée avec Jael : plus
  belle mais demande un nouveau chemin de fin, trop de code pour le gain.)
- **Pas de génération d'art.** Aucun crédit PixelLab. Les cartes neuves réutilisent les
  portraits existants.
- **Les commons restent exclues d'Avalon.** C'est un choix, pas un bug.
- **Pas de borne `until` sur Avalon.** Le déclin borne l'ère par la mortalité, pas par le
  calendrier — c'est ce qui rend la fin jouée plutôt que subie.
- **Le champ mort `filler`** n'est pas nettoyé ici (hors sujet).
- **Les morts en duel gardent les textes existants.** `combat.js` appelle `checkDeath` de
  son côté (lignes 137 et 144) et **n'est pas modifié** : il continue d'utiliser le défaut.
  Mourir l'épée à la main est une mort *active* — « le plus grand chevalier t'usurpe » y
  est juste, « la magie reflue » ne le serait pas. C'est le paramètre `era` optionnel de
  `checkDeath` qui rend ce non-changement possible sans rien casser.

## 5. Architecture

Le déclin est un **état pur** appliqué entre deux cartes, comme les effets de jauge.

| Unité | Rôle | Dépend de |
| --- | --- | --- |
| `config.js` | `AVALON_DECLIN = 3` ; textes de mort Avalon | — |
| `gauges.js` | `applyDeclin(gauges, n)` : érode les 4 jauges, borné 0..100 | — |
| `gauges.js` | `checkDeath(gauges, era)` : choisit le texte Avalon si `era === 'avalon'` | config |
| `reign.js` | capture `eraPlayed`, applique le déclin, passe l'ère à `checkDeath` | gauges |
| `cards/lateEras.js` | 4-6 cartes rejouables d'épilogue | — |

`applyDeclin` est une fonction pure testable isolément. `checkDeath` gagne un paramètre
`era` **optionnel** (défaut : comportement actuel) — les appels existants restent valides.

## 6. Tests

- `applyDeclin` : érode les 4 jauges du bon montant ; borne à 0 ; n'altère pas l'entrée.
- `checkDeath(gauges, 'avalon')` : renvoie le texte Avalon pour chaque jauge à vide.
- `checkDeath(gauges)` sans ère : comportement inchangé (non-régression).
- `reign` : un tour en Avalon érode les jauges ; un tour dans **chaque autre ère** ne les
  érode pas.
- `reign` — **bascule an 43 → 44** (le bug de bord de §3.1) : le tour qui fait entrer en
  Avalon n'érode pas, et une mort à ce tour affiche le texte de **la Chute**, pas d'Avalon.
- `reign` : une mort par déclin est bien absorbée par le Fourreau si le joueur le détient
  (non-régression de `tryCancelDeath`).
- Contenu : les cartes Avalon neuves ne sont pas `unique` ; leurs orateurs sont mappés
  dans `PORTRAITS` (sinon fallback silencieux de domaine).
- **Gate de simulation** (script jetable, pas de test permanent) : médiane des tours
  Avalon dans 8-12, et part de fillers < 40 %.

## 7. Vérification

- Suite verte + `vite build`.
- Re-simulation 2000 règnes : médiane, p90 et part de fillers conformes à §3.1 et §3.3.
- Gate visuel Jael : une partie menée jusqu'en Avalon, lire les cartes neuves et la fin.
