# Logres — Comment le jeu fonctionne, de bout en bout

> Doc de référence : la boucle de jeu, les jauges, la mort, et **comment les
> quêtes se déclenchent, réussissent ou échouent**. À lire avant d'écrire des
> cartes. Complète `DESIGN.md` (la vision) par le « comment ça tourne » (la
> mécanique réelle, telle qu'implémentée dans `src/game/`).

## 0. L'idée en une phrase

Il n'y a **pas de victoire**. Tu ne « finis » pas Logres : tu **survives** le
plus longtemps. Chaque carte est un dilemme, chaque choix pousse des jauges, et
tu meurs dès qu'une jauge touche le fond ou le plafond. Les « quêtes » ne sont
pas des missions avec un écran « QUÊTE RÉUSSIE » — ce sont des **fils narratifs
émergents** qui se tissent au fil du règne selon tes choix. « Réussir » une
quête = l'avoir amenée vers sa bonne branche sans que ton règne s'effondre en
route.

---

## 1. Le tour de jeu (la boucle)

Un « tour » = une carte jouée. Un tour = **+1 an** de règne.

```
┌─────────────────────────────────────────────────────────────┐
│  draw()   → le deck choisit LA prochaine carte (voir §3)     │
│  aperçu   → tu amorces le swipe : les jauges impactées       │
│             s'illuminent (feedback AVANT de valider)          │
│  choose() → tu relâches à gauche ou à droite :               │
│             1. applyEffects  → les jauges bougent (bornées)   │
│             2. applyFlags    → la mémoire de quête se met à jour│
│             3. years += 1    → l'âge du règne avance          │
│             4. era update    → change d'ère si seuil franchi  │
│             5. checkDeath    → une jauge à 0 ou 100 ? → mort  │
│                (une relique peut annuler, §7)                 │
└─────────────────────────────────────────────────────────────┘
        ▲                                                  │
        └──────────────── vivant ? on retire ─────────────┘
```

Source : `src/game/reign.js` (`draw`, `choose`). Aucune autre action existe —
une seule mécanique, gauche/droite. C'est l'ADN Slop.

---

## 2. Les 4 jauges & la mort thématique

Quatre jauges, chacune de **0 à 100**, départ à **50**. Un choix modifie 1 à 3
jauges. Elles sont **bornées** : on ne descend jamais sous 0 ni au-dessus de 100
(`gauges.js:clamp`).

| Jauge | À **0** | À **100** |
|---|---|---|
| **Foi** ✝️ | Excommunié, tu meurs seul | L'Inquisition te brûle (théocratie) |
| **Magie** 🔮 | La magie s'éteint, Merlin t'abandonne | Les fées d'Avalon t'emportent |
| **Chevalerie** ⚔️ | La Table se disperse, les Saxons déferlent | Un champion trop adulé t'usurpe |
| **Couronne** 👑 | Les barons se soulèvent | Tyran, le peuple te renverse |

**La mort est toujours thématique** : le message dépend de la jauge fautive et
du côté (vide/plein). Un roi ne « perd » pas ses PV — il meurt d'un **excès** ou
d'un **manque** politique. C'est ça qui rend chaque fin lisible et partageable.

L'axe **Foi ⚔ Magie** est le cœur : monter l'un fait souvent descendre l'autre.
Rester en vie = **jongler**, jamais laisser une jauge filer vers un bord.

Source : `config.js` (`GAUGES`, messages de mort) + `gauges.js` (`checkDeath`).

---

## 3. Comment le deck choisit la prochaine carte

À chaque `draw()`, le moteur (`deck.js:pickCard`) filtre puis tire :

1. **Carte forcée ?** Si le choix précédent a posé un `next`, cette carte passe
   en priorité (si elle est encore éligible). *En pratique on l'utilise peu — nos
   quêtes sont émergentes, §5.*
2. **Éligibilité** — une carte est jouable si :
   - son **ère** correspond (`era` peut être une seule ère ou un tableau
     `['graal','chute']` ; absente = toutes ères) ;
   - ses **conditions `requires`** sont remplies (flags posés/absents + plages
     de jauges) ;
   - si elle est **`unique`**, elle n'a pas déjà été vue ce règne.
3. **Anti-répétition** — les `RECENT_LIMIT` (6) dernières cartes sont écartées…
   **sauf** si le pool deviendrait vide (le non-blocage prime toujours).
4. **Tirage pondéré** — parmi les cartes restantes, tirage au sort proportionnel
   au `weight` de chaque carte (poids élevé = apparaît plus souvent / plus tôt).

**Invariant clé** : à tout état atteignable, il existe **≥ 1 carte jouable**.
Garanti par les cartes `common` (toutes ères, sans condition) et les `filler`.
Les tests Vitest le vérifient sur tous les états atteignables.

---

## 4. Les flags : la mémoire des quêtes

Un **flag** est un marqueur posé par un choix, qui reste jusqu'à la fin du règne.
C'est **toute** la mémoire du jeu — pas de variables cachées, pas de PNJ avec des
fiches. « Le monde se souvient » = des flags conditionnent les cartes futures.

```js
// un choix qui pose un flag
right: { label: 'Ouvrir la porte', effects: { magie: +8, foi: -8 },
         flags: ['mordred.concu'] }

// une carte qui n'apparaît QUE si ce flag est posé (une ère plus tard)
requires: { allFlags: ['mordred.concu'] }
```

Trois types de conditions sur `requires` :
- `allFlags` — tous ces flags doivent être posés,
- `anyFlags` — au moins un,
- `noneFlags` — aucun (sert les branches « tant que X n'est pas arrivé »).
- `gauge: { chevalerie: [0, 30] }` — la jauge doit être dans cette plage.

Un flag peut aussi être un **compteur** (`['saxons.raid', 1]` incrémente) —
utile pour « après 3 raids, l'invasion ». Source : `flags.js`.

---

## 5. Anatomie d'une quête émergente

Une quête n'est **pas** un objet spécial dans le code. C'est un **motif** :
plusieurs cartes reliées par une chaîne de flags, réparties sur les ères.

```
   CROCHET                SUITE(S) DIFFÉRÉE(S)            DÉNOUEMENT
   (ère précoce)          (ères suivantes)               (ère tardive)
   ┌──────────┐           ┌──────────┐                   ┌──────────┐
   │ pose un  │  flag →   │ requires │  flag →  …  →     │ requires │
   │  flag    │──────────▶│ le flag  │──────────────────▶│ les flags│
   └──────────┘           └────┬─────┘                   └────┬─────┘
                               │ branche selon                │ gros deltas
                          tes jauges / autres flags      de jauge → issue
```

- **Déclenchement** : le crochet est une carte normale du deck. Tu ne « lances »
  pas la quête ; elle **arrive** quand sa carte-crochet est tirée, et démarre
  seulement si tu prends **le côté qui pose le flag**. L'autre côté = la quête ne
  s'ouvre jamais (ou s'ouvre autrement).
- **Progression différée** : chaque beat suivant est taguté sur une **ère
  ultérieure** et exige le flag du beat précédent. L'ordre est donc garanti par
  la dépendance de flags ; le `weight` + l'anti-répétition l'étalent → ça
  **ressort quand tu ne t'y attends plus**, entre d'autres cartes. Très Reigns.
- **Branches** : un beat peut avoir plusieurs versions selon `anyFlags` /
  `noneFlags` / `gauge`. Exemple : si tu as banni Mordred **et** que ta
  chevalerie est basse, le climax est plus mortel.
- **Saillance** : les beats de la colonne vertébrale (Mordred) ont un `weight`
  élevé et chevauchent 2 ères pour ne pas être ratés dans un règne court.

### Ce que « réussite » et « échec » veulent dire ici

Il n'y a **pas de score de quête**. Une quête peut se terminer de 4 façons :

| Issue | Ce qui se passe |
|---|---|
| **Réussite** | Tu as guidé la quête vers sa bonne branche (bons flags + jauges en zone sûre). Récompense = un flag positif, une relique, un bonus de jauge, ou une mort évitée plus tard. |
| **Échec narratif** | Tu as pris les mauvaises branches : la quête se dénoue mal (perte de relique, jauge plombée, ennemi créé). Le règne **continue**, mais affaibli. |
| **Échec fatal** | Le dénouement envoie une jauge au bord ; tu **meurs** de la quête (mort thématique). |
| **Non-résolue** | Ton règne s'achève (autre cause) avant que la quête n'atteigne son dénouement. Elle reste en suspens — la prochaine partie la rejouera peut-être autrement. |

Autrement dit : **« réussir une quête » n'est jamais le but en soi**. Le but est
de survivre ; les quêtes sont les leviers (et les pièges) qui font monter ou
plonger tes jauges sur le long terme. Une quête réussie t'arme pour plus tard ;
une quête ratée te rapproche d'une mort thématique.

---

## 6. Exemple complet : l'arc de Mordred, de la conception à Camlann

La colonne vertébrale tragique. Elle traverse les 5 ères. `[E]` = existe déjà,
`[P]` = planifié dans cette passe de contenu.

```
ÈRE 1 — La Roche                    ÈRE 2 — Camelot
┌─────────────────────────────┐     ┌──────────────────────────────┐
│ roche.morgane.nuit  [E]     │     │ camelot.mordred.enfant  [P]  │
│ Morgane, la nuit…           │     │ requires: mordred.concu      │
│  ▸ Ouvrir → mordred.concu   │────▶│  ▸ L'élever → mordred.eleve  │
│  ▸ Renvoyer → (arc fermé)   │     │  ▸ L'éloigner→ mordred.banni │
└─────────────────────────────┘     └──────────────┬───────────────┘
                                                    │
ÈRE 3 — Le Graal                    ÈRE 4 — La Chute│
┌─────────────────────────────┐     ┌──────────────▼───────────────┐
│ graal.mordred.chevalier [P] │     │ chute.mordred.trahison  [P]  │
│ requires: mordred.eleve     │     │ requires: mordred.ennemi     │
│           OU mordred.banni  │────▶│  (régence pendant ton absence,│
│  ▸ L'adouber → mordred.     │     │   il expose l'affaire, révolte)│
│    heritier                 │     │        │                      │
│  ▸ Le tenir en défiance →   │     │        ▼                      │
│    mordred.ennemi           │     │ chute.camlann  [P]           │
└─────────────────────────────┘     │ requires: mordred.ennemi     │
                                     │ effects: chevalerie -40      │
                                     │  → mort « champion t'usurpe » │
                                     │  SAUF si Fourreau porté (§7)  │
                                     └──────────────────────────────┘
```

**Les chemins possibles :**

- **Tu renvoies Morgane** (ère 1) → l'arc ne s'ouvre jamais. Mordred n'existe
  pas pour ce règne. Tu as fermé la porte à la tragédie (mais perdu de la
  Magie sur le moment).
- **Conçu → élevé → adoubé héritier** → *réussite* : Mordred te succède
  loyalement. À ta mort, la **dynastie** continue par lui (méta, §8). Pas de
  Camlann.
- **Conçu → banni → tenu en défiance** (`mordred.ennemi`) → *échec fatal* : à
  l'ère de la Chute, `chute.camlann` t'inflige −40 en Chevalerie. Si elle
  tombe à 0 → mort « la Table se disperse, un champion t'usurpe ». **Sauf** si
  tu portes encore le Fourreau : il boit le coup, tu survis de justesse à 15,
  et le Fourreau part en cendres.
- **Ton règne meurt avant l'ère 4** (Foi à 0, révolte, peu importe) →
  l'arc reste *non-résolu*. La prochaine partie le rejouera peut-être autrement.

**Entrelacs** : `chute.mordred.trahison` gagne en violence si l'affaire
Lancelot/Guenièvre a fracturé la Table (`anyFlags: ['lancelot.banni']`) et si le
Graal a vidé Camelot de ses chevaliers. Quatre fils, un nœud coulant — voir
`DESIGN.md §4` et le spec de contenu.

---

## 7. Les reliques : des règles qui changent

Deux reliques, acquises **par des cartes** (donc via flags), qui modifient le
moteur tant que tu les « portes » (flag d'acquisition posé **et** flag de perte
absent). Source : `relics.js`.

| Relique | Acquise par | Effet | Perdue par |
|---|---|---|---|
| **Excalibur** 🗡️ | `relique.excalibur` (Dame du Lac, ère 1) | Tout **gain** de Chevalerie est **majoré de +2** | `excalibur.rendue` (au lac, ère 5) |
| **Le Fourreau** 🛡️ | `relique.fourreau` (Dame du Lac, ère 1) | **Annule une seule mort** : la jauge fatale revient à 15 (ou 85), au bord du gouffre, puis le Fourreau se consume | `fourreau.perdu` (volé par Morgane) |

Le Fourreau est le seul « filet » du jeu, et il est **à usage unique**. Le perdre
(quête Excalibur/Fourreau) avant la Chute, c'est retirer le filet pile avant le
grand saut. C'est un vrai enjeu narratif, pas juste un bonus.

---

## 8. Le méta : ères, dynastie, sauvegarde

- **Ères** (`config.js:ERAS`) — l'ère avance avec l'âge du règne, pas avec tes
  choix : Roche (0–8 ans), Camelot (8–20), Graal (20–32), Chute (32–44),
  Avalon (44+). Chaque ère a son décor, sa musique et son paquet de cartes.
  Survivre longtemps = **traverser toute la légende**.
- **Dynastie** (`dynasty.js`) — à ta mort, la lignée peut continuer. Ton
  **record d'années** débloque des **rois de départ** avec des jauges de départ
  déséquilibrées : Uther le Conquérant (Chevalerie forte) à 15 ans de record,
  Constantin le Pieux (Foi forte) à 30, Morgane la Reine-Fée (Magie forte) à 45.
  C'est l'équivalent des robots débloquables de Jetpack Bot.
- **Sauvegarde** — tout en local, plus un code rétro `LG1-XXX` (et lien
  `…#save=LG1-XXX`) qui restaure la progression sans compte ni serveur. Distingue
  **partie en cours** et **record**.

---

## 9. Donc, « gagner » à Logres, c'est quoi ?

Il n'y a pas d'écran de victoire. « Bien jouer », c'est :

1. **Durer** — traverser les 5 ères, battre ton record d'années.
2. **Tenir tes quêtes** — amener les grands arcs vers leurs bonnes branches
   (héritier loyal, Graal atteint, reine pardonnée) sans laisser une jauge filer.
3. **Faire durer la lignée** — mourir en léguant un héritier, débloquer les
   départs, allonger la dynastie Pendragon.

Le jeu est une **boucle courte, rejouable à l'infini** : chaque règne raconte une
version différente de la légende, selon les portes que tu ouvres et celles que tu
claques.
