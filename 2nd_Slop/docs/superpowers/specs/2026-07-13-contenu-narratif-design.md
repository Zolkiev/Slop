# Spec — Passe de contenu narratif de Logres (~60 → ~150 cartes)

> Design validé par Jael (2026-07-13). Cette passe **étoffe le contenu** : elle
> aboutit les 4 arcs majeurs en émergent et étoffe le deck de chaque ère.
> **Aucune génération d'image**, **aucun changement de moteur** attendu.
> Références : `docs/DESIGN.md` (vision), `docs/GAMEPLAY.md` (mécanique de bout
> en bout), `src/game/cards/*` (contenu existant).

## 1. Objectif & portée

- Passer de **~60 à ~150 cartes** (« cible confortable » de la fourchette DESIGN).
- **Profondeur d'abord** : scripter à fond **4 arcs** — Mordred, Lancelot &
  Guenièvre, la Quête du Graal, Excalibur & le Fourreau.
- Arcs **émergents / différés** : crochet précoce + suites gated par flags sur
  des ères ultérieures, dénouement branché selon les jauges. Pas de `next`
  scripté (voir `GAMEPLAY.md §5`).
- Étoffer les cartes **standalone** de chaque ère pour que le deck respire
  (~20-25 cartes éligibles à tout moment d'une ère).

### Hors-scope (explicitement)

- Génération/retouche d'assets (portraits, décors, plaques) — passe ultérieure.
- Système de combat lié aux choix — à concevoir une fois les quêtes en place.
- Variantes de plaque de carte par famille.
- Toute modification du moteur (`deck.js`, `reign.js`, `gauges.js`, `flags.js`,
  `relics.js`). *Exception conditionnelle : voir §7.*

## 2. Contraintes & invariants (doivent tenir)

1. **Jauges bornées** 0..100 (déjà garanti par `gauges.js:clamp`).
2. **Non-blocage** : à tout état atteignable, ≥1 carte jouable. Garanti par les
   cartes `common` (toutes ères vivantes, sans condition bloquante) + `filler`
   par ère. **Chaque ère doit conserver assez de cartes inconditionnelles.**
3. **Roster fermé aux portraits existants** (`portraits.js`, 26 entrées).
   - 13 nommés : Merlin, Morgane, L'Évêque, Keu, Gauvain, Lancelot, Guenièvre,
     Perceval, Mordred, La Dame du Lac, Galaad, Bédivère, Le roi Lot.
   - 13 archétypes : baron, paysan/peuple, barde, marchand, moine, ermite, fée,
     émissaire saxon, héraut, écuyer, pèlerin, conseiller, chevalier.
   - **Aucun nouveau perso nommé récurrent** sans portrait. Figures du Graal sans
     portrait (Roi Pêcheur, etc.) → « Un ermite » / « Un moine ».
4. **Intégrité des chaînes** : tout flag lu par un `requires` est posé par au
   moins un choix ; tout `next` référencé existe. (Tests `flagsRequiredBy` /
   `flagsSetBy` / `nextIdsReferenced`.)
5. **Beats d'arc `unique: true`** (jouées une fois par règne).
6. **Déferral par ère + flag** : un beat différé porte `era` = ère(s) ultérieure(s)
   + `requires` sur le flag du beat précédent. Pas de `next`.
7. **Ton** : épique avec une pointe d'ironie (déjà en place, à tenir).

## 3. Répartition cible (~60 → ~156)

À toute ère, viser ~20-25 cartes éligibles.

| Bloc | Fichier | Actuel | Cible | Net |
|---|---|---|---|---|
| Arcs (uniques, scriptés) | répartis | ~14 | ~44 | +30 |
| roche standalone | `roche.js` | 14 | ~22 | +8 |
| camelot standalone | `camelot.js` | 14 | ~26 | +12 |
| graal standalone | `lateEras.js` | 8 | ~18 | +10 |
| chute standalone | `lateEras.js` | 8 | ~18 | +10 |
| avalon standalone | `lateEras.js` | 6 | ~12 | +6 |
| common (toutes ères) | `common.js` | 10 | ~20 | +10 |
| **Total** | | **~60** | **~156** | **+96** |

*Note : les compteurs « arc » et « standalone » se chevauchent un peu (certaines
cartes existantes sont déjà des beats d'arc). Le total vise ~150-156.*

## 4. Les 4 arcs — analyse d'écart & beats à ajouter

Légende : `[E]` existe, `[+]` à ajouter. Ids/flags **réels** (existants) ou
**proposés** (nouveaux, à créer avec ces noms).

### 4.1 ⚔️ Mordred (colonne vertébrale — roche → chute/avalon)

**État actuel** : crochet en ère 1, dénouement en ère 4. **Le milieu manque** →
c'est le gros du travail. Beats existants :
- `[E] roche.morgane.nuit` → `mordred.concu` (ère 1)
- `[E] chute.mordred.revele` (requires `mordred.concu`) → `mordred.heritier` /
  `mordred.ennemi` (ère 4)
- `[E] chute.mordred.guerre` (requires `mordred.ennemi`) — Camlann, chevalerie −14

**Beats à ajouter (combler le milieu + intensifier le climax) :**
- `[+] camelot.mordred.enfant` (requires `mordred.concu`, ère camelot) —
  l'enfant grandit : l'élever à la cour → `mordred.eleve` ; l'éloigner →
  `mordred.ecarte`. *Sans ce choix, l'arc saute directement au reveal (rétro-
  compatible : `chute.mordred.revele` ne requiert que `mordred.concu`).*
- `[+] graal.mordred.chevalier` (requires `mordred.eleve` **or** `mordred.ecarte`,
  ère graal) — Mordred jeune chevalier ambitieux : le distinguer vs le brider.
  Pose `mordred.ambitieux` (nuance le reveal).
- `[+] chute.mordred.revele` **enrichir les branches** (mêmes flags de sortie)
  pour tenir compte de `mordred.eleve`/`mordred.ecarte`/`mordred.ambitieux` via
  `anyFlags` (texte + deltas variables). *Modification de contenu d'une carte
  existante, pas du moteur.*
- `[+] chute.camlann.duel` (requires `mordred.ennemi`, ère chute/avalon,
  `weight` élevé) — **le climax fatal** : gros delta chevalerie (−30 à −40).
  Intensifié si `anyFlags: ['lancelot.banni']` (Table fracturée) et/ou
  `graal.quete` (Camelot vidé). Le Fourreau peut boire le coup (`relics.js`,
  automatique). Sans Fourreau + chevalerie basse → mort « un champion t'usurpe ».

**Chemins** (voir `GAMEPLAY.md §6`) : porte fermée (renvoyer Morgane) / héritier
loyal (pas de Camlann, succession dynastique) / ennemi (Camlann fatal, sauf
Fourreau).

### 4.2 🗡️ Lancelot & Guenièvre (camelot → chute)

**État actuel** : arc dense mais **résolu trop tôt** (tout en ère 2). Beats :
- `[E] camelot.lancelot.arrive` (requires `table.ronde`) → `lancelot.cour`
- `[E] camelot.guenievre.rumeur` (requires `lancelot.cour`) → `affaire.exposee` /
  `affaire.tue`
- `[E] camelot.affaire.eclat` (requires `affaire.exposee`) → `lancelot.banni`
- `[E] camelot.guenievre.silence` (requires `affaire.tue`)
- `[E] camelot.lancelot.gloire` (requires `lancelot.cour`)
- `[E] chute.lancelot.retour` (requires `lancelot.banni`)
- `[E] chute.guenievre.couvent`

**Beats à ajouter (étirer la tension sur graal→chute + interweave Mordred) :**
- `[+] graal.lancelot.tension` (requires `lancelot.cour`, none `lancelot.banni`,
  ère graal) — la rumeur couve encore ; le champion s'illustre, la cour murmure.
- `[+] chute.affaire.mordred` (requires `affaire.tue` **and** `mordred.eleve`/
  `mordred.ecarte`, ère chute) — **interweave clé** : celui qui a fermé les yeux
  en ère 2 voit Mordred **exposer publiquement** l'affaire pour fracturer la
  cour → `affaire.exposee` + `lancelot.banni` tardif. Relie les deux arcs.
- `[+] chute.guenievre.bucher` (requires `lancelot.banni` **and** gauge foi
  élevée, ère chute) — le procès de la reine : bûcher (foi++, chevalerie−−) vs
  sauvetage par Lancelot (chevalerie+, guerre civile → nourrit Camlann).
  Pose `guenievre.bucher` / `guenievre.sauvee`.

### 4.3 🕊️ La Quête du Graal (camelot fin → graal → chute)

**État actuel** : bien amorcé, **manque un vrai dénouement**. Beats :
- `[E] camelot.graal.vision` (Perceval) → `graal.quete`
- `[E] graal.perceval.retour`, `[E] graal.galaad.siege`, `[E] graal.table.vide`,
  `[E] graal.morgane.convoitise`, `[E] graal.fausse.relique`

**Beats à ajouter (le coût et le dénouement) :**
- `[+] graal.exode` (requires `graal.quete`, ère graal, `weight` élevé) — Camelot
  se vide : bénir le grand départ (foi++, chevalerie−− fort) vs retenir la Table
  (chevalerie+, foi−−). Pose `graal.exode`.
- `[+] graal.roi.pecheur` (requires `graal.quete`, speaker « Un ermite », ère
  graal) — la terre gaste et le Roi Pêcheur : compassion vs quête pure.
- `[+] graal.galaad.atteint` (requires `graal.quete` **and** foi élevée, ère
  graal/chute) — **dénouement** : Galaad atteint le Graal et quitte ce monde
  (foi++, chevalerie−, `graal.atteint`) ; ou la quête échoue et les chevaliers
  reviennent brisés (`graal.echoue`). Les deux laissent la Table exsangue pour
  la Chute.

### 4.4 ⚜️ Excalibur & le Fourreau (roche → avalon)

**État actuel** : squelette complet, à densifier. Beats :
- `[E] roche.dame.lac` → `relique.excalibur` ; `[E] roche.fourreau` (requires
  excalibur) → `relique.fourreau`
- `[E] common.dame.lac.entretien` (requires excalibur)
- `[E] chute.fourreau.vole` (requires `relique.fourreau`, none `fourreau.perdu`)
  → `fourreau.perdu` (vol de Morgane)
- `[E] avalon.bedivere` (requires excalibur) → `excalibur.rendue`

**Beats à ajouter (avancer le vol + tisser Morgane) :**
- `[+] camelot.morgane.fourreau` (requires `relique.fourreau`, `morgane.cour`,
  none `fourreau.perdu`, ère camelot) — Morgane admire le Fourreau : premier
  avertissement (ne pose pas encore `fourreau.perdu`, arme le vol de la Chute).
- `[+] graal.excalibur.doute` (requires `relique.excalibur`, ère graal) — un
  évêque juge l'épée des fées impie : la renier tôt (foi++, `excalibur.rendue`
  anticipé) vs l'assumer (chevalerie+, foi−).
- `[+] chute.sans.fourreau` (requires `fourreau.perdu`, ère chute) — la peur au
  ventre : le roi sait qu'il n'a plus de filet (couleur narrative avant Camlann).

## 5. Cartes standalone à ajouter (par ère)

Non exhaustif — le plan/l'écriture détaillera chaque carte. **Directives :**

- **Équilibre de jauges par ère** : chaque ère doit offrir des cartes qui **font
  monter ET descendre chaque jauge**, pour qu'aucun état ne se retrouve sans
  option de récupération (soutient l'invariant de non-blocage et le fun).
- **Roster fermé** (§2.3) ; réutiliser les archétypes pour la variété
  (marchands, pèlerins, barons, fées, émissaires saxons…).
- **Ton** épique + ironie ; dilemmes courts (2-3 lignes), deux labels tranchés.
- **Thèmes par ère** (indicatifs) :
  - *roche* : légitimité, barons, Saxons naissants, vieux usages païens, Église.
  - *camelot* : apogée, Table Ronde, justice, faste, premières fêlures.
  - *graal* : mysticisme, Table qui se vide, faux prophètes, magie qui s'efface.
  - *chute* : guerre civile, famine, désertions, présages, trahisons.
  - *avalon* : épilogue mythique, mémoire, choix chrétien vs féerique.
- **common** (+10) : affaires courantes multi-ères, visiteurs récurrents.

## 6. Extension des tests d'invariants (`test/invariants.test.js`)

Étendre, pas seulement relancer :
1. **`speaker ∈ PORTRAITS`** pour toute carte (sinon fallback muet). Nouveau test.
2. **Atteignabilité d'arc** : pour chaque arc, il existe une suite de choix qui
   mène du crochet au dénouement (aucun beat orphelin : tout flag `requires` d'un
   beat est posé par un beat antérieur atteignable dans la bonne fenêtre d'ère).
3. **Équilibre par ère** : chaque ère propose, pour chaque jauge, au moins une
   carte qui la monte et une qui la baisse (garde-fou anti-impasse).
4. Conserver les tests existants (bornes, non-blocage, flags posés/lus, `next`).

## 7. Décision moteur (rappel)

**Aucun changement moteur prévu.** Le déferral par `era` (tableau) + flags
suffit. *Exception conditionnelle* : si, aux tests de jeu, un arc se sent trop
tassé À L'INTÉRIEUR d'une même ère (beats qui se bousculent), on pourra ajouter
un `requires.yearsMin` (comparaison `reign.years >= n`) dans `deck.js` —
changement minime, isolé, testable. **À ne faire que si le besoin est constaté.**

## 8. Découpage en sous-lots (pour le plan d'implémentation)

Chaque lot doit finir **vert** (Vitest passe, invariants tenus) avant le suivant :

1. **Tests d'invariants étendus d'abord** (§6) — TDD : ils cadrent tout le reste.
2. **Lot Arc Mordred** (combler le milieu + climax Camlann).
3. **Lot Arc Lancelot/Guenièvre** (étirement graal→chute + interweave Mordred).
4. **Lot Arc Graal** (exode + dénouement).
5. **Lot Arc Excalibur/Fourreau** (densification).
6. **Lot standalone roche + camelot**.
7. **Lot standalone graal + chute + avalon**.
8. **Lot common** (+10) et passe d'équilibrage final des jauges par ère.

## 9. Critères d'acceptation

- Total cartes ~150-156, réparti conforme au §3.
- Les 4 arcs ont un chemin complet crochet→dénouement atteignable et testé.
- `test/invariants.test.js` étendu et **vert** (bornes, non-blocage, flags,
  speakers, atteignabilité d'arc, équilibre par ère).
- Zéro changement moteur (ou, si §7 déclenché, un seul ajout `yearsMin` isolé et
  testé).
- Vérification de jeu : un règne long traverse les 5 ères et rencontre au moins
  un dénouement d'arc (verify manuel avant merge, selon le workflow habituel).
