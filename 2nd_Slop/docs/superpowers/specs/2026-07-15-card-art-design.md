# Logres — Cadres de carte par domaine + scènes des moments forts

Date : 2026-07-15
Statut : approuvé (« on fait selon tes recos »)

## Objectif

Enrichir visuellement Logres, dont les 193 cartes reposent aujourd'hui sur ~29
bustes de portrait + 6 scènes dédiées et **un seul** cadre de carte. Deux chantiers :

- **A — Cadres de carte tintés par domaine** : 5 verrières pleine carte, teinte
  dominante alignée sur le domaine de jauge de l'orateur. Toutes les cartes en profitent.
- **B — Scènes des moments forts** : ~12 tableaux 128×128 pour les cartes-climax
  qui n'ont pas encore de scène.

Ordre : **A d'abord** (transforme chaque carte avec peu d'assets), puis **B**.

## État existant (à ne pas re-construire)

- **Portraits** (`src/game/portraits.js`) : map `speaker → clé de portrait` (29 clés,
  toutes présentes). Fonds de verre déjà tintés par domaine (cf `scripts/gen-assets-vitrail.sh`).
- **Scènes** (`src/game/scenes.js`) : 6 clés, chargées `assets/scenes/<clé>.png` (128×128).
  Une carte affiche sa scène via `art: '<clé>'` (sinon buste de l'orateur). Fait :
  `cerf-blanc, graal-vision, fourreau-vole, camlann, barque-avalon, bucher-reine`.
- **Cadre** (`assets/ui/card-plate.png`, ~340×460) : verrière gothique multicolore,
  chargée `ui:card-plate`, dessinée pleine carte sous le portrait (`cardPlate()` /
  `drawCard(..., plate)` dans `src/render/card.js`). Le portrait est peint par-dessus,
  clippé dans l'arche.
- **Rendu** (`src/render/card.js`) : `drawCard` reçoit `plate` (Image) ; l'arche, les
  filets d'or et le sertissage sont dessinés par code par-dessus la verrière.
- **Génération** (`scripts/pixellab.mjs` + `scripts/gen-assets-vitrail.sh`) : bases de
  style `MBASE` (portrait vitrail) / `BSTYLE` (décor). `node scripts/pixellab.mjs generate
  --description … --size … --seed … --out-dir assets/gen/… --name …`.

## Chantier A — Cadres par domaine

### Assets

5 verrières pleine carte, **même architecture gothique que l'actuelle**, teinte de
verre dominante différente. Générées de façon **cohérente** (même compo, seul le ton
change) — méthode d'implémentation (5 générations vs 1 master recoloré via les outils
pngjs locaux) tranchée au plan ; l'actuel `card-plate.png` reste le fallback neutre.

| Fichier (`assets/ui/`) | Domaine | Teinte |
|---|---|---|
| `plate-foi.png` | Foi | ambre / or |
| `plate-magie.png` | Magie | émeraude / violet |
| `plate-chevalerie.png` | Chevalerie | bleu-acier |
| `plate-couronne.png` | Couronne | pourpre / cramoisi |
| `plate-peuple.png` | Peuple / étrangers | tons terre (≈ neutre) |

### Câblage

- **Map domaine** : `src/game/domains.js` (nouveau) — `DOMAIN_BY_PORTRAIT` (clé de
  portrait → `'foi'|'magie'|'chevalerie'|'couronne'|'peuple'`) d'après le groupement de
  `gen-assets-vitrail.sh` :
  - foi : eveque, moine, galaad, ermite, pelerin
  - magie : merlin, morgane, fee, dame-lac
  - chevalerie : lancelot, gauvain, perceval, bedivere, keu, chevalier, ecuyer, chevalier-noir
  - couronne : guenievre, roi-lot, baron, conseiller, heraut, roi
  - peuple : paysan, marchand, barde, saxon, chef-saxon
  - `domainFor(speaker) = DOMAIN_BY_PORTRAIT[PORTRAITS[speaker]] ?? 'peuple'`.
- **Chargement** : `preload()` charge `ui:plate-<domaine>` pour les 5 domaines.
  `plateFor(card)` (`assets.js`) → l'image du domaine de l'orateur, fallback `ui:card-plate`.
- **Rendu** : `main.js`/`renderer.js` passent `plateFor(card)` à `drawCard` (aujourd'hui
  `cardPlate()` en dur). Aucun changement de géométrie.

### Vérification A
- Unit : `domains.js` — `domainFor` renvoie le bon domaine pour chaque orateur connu,
  `'peuple'` pour un inconnu ; tout `PORTRAITS[speaker]` a une entrée (test de couverture).
- Visuel (gate Jael + puppeteer contrôleur) : les 5 domaines affichent le bon cadre en
  jeu (une carte par domaine), lisibilité du texte/portrait préservée sur chaque teinte.

## Chantier B — Scènes des moments forts

~12 scènes 128×128, style scène/vitrail (extension de `BSTYLE`/vitrail selon le moment),
posées sur des cartes-climax **sans art existant**. Liste (IDs vérifiés ; ajustable au
câblage si un meilleur porteur existe) :

| Clé de scène | Carte | Ère | Moment |
|---|---|---|---|
| `sacre-arthur` | `roche.merlin.couronne` | Roche | Merlin couronne Arthur |
| `nuit-morgane` | `roche.morgane.nuit` | Roche | la nuit avec Morgane |
| `excalibur-remise` | `roche.dame.lac` | Roche | la Dame du Lac remet Excalibur |
| `table-ronde` | `camelot.table.ronde` | Camelot | la Table Ronde dévoilée |
| `grand-tournoi` | `camelot.tournoi.grand` | Camelot | le grand tournoi |
| `galaad-siege` | `graal.galaad.siege` | Graal | Galaad au Siège Périlleux |
| `roi-pecheur` | `graal.roi.pecheur` | Graal | le château du Roi Pêcheur |
| `graal-atteint` | `graal.galaad.atteint` | Graal | Galaad atteint le Graal |
| `mordred-revolte` | `chute.mordred.guerre` | Chute | la révolte de Mordred |
| `table-brisee` | `chute.mordred.revele` | Chute | la Table se fracture (l'affaire éclate) |
| `excalibur-rendue` | `avalon.bedivere` | Avalon | Bédivère rend Excalibur au lac |
| `tombeau-arthur` | `avalon.peuple.tombeau` | Avalon | le tombeau du roi (rex quondam rexque futurus) |

### Câblage B (par scène)
- Ajouter la clé à `SCENES` (`src/game/scenes.js`).
- Poser `art: '<clé>'` sur la carte cible.
- `cardArt(card)` charge déjà `scene:<clé>` si `art` présent (rien à changer côté moteur).

### Vérification B
- Unit : le test d'inventaire (toute clé `SCENES` a un fichier ; tout `art:` de carte
  pointe vers une clé de `SCENES`) — étend la couverture existante si présente, sinon
  l'ajoute.
- Visuel (gate Jael) : chaque nouvelle scène s'affiche sur sa carte, dans l'arche.

## Génération — approche commune

- `pixellab.mjs generate`, seed fixe par lot pour la reproductibilité, sorties d'abord
  dans `assets/gen/…` (candidats tracés), puis le retenu copié vers `assets/ui|scenes/`.
- **Estimation de crédits communiquée à Jael AVANT chaque batch** ; il garde la main sur
  le solde. Retenu = **gate visuel de Jael** (il est directeur artistique — cf baron.png).
- Si un `edit`/recolor coûte cher (leçon Jetpack : edit ≈ 40 générations), préférer
  `generate` (≈ 20) ou un recolor local pngjs (0 crédit) — tranché au plan.

## Hors périmètre (YAGNI)

- Cadres par ère ou domaine×ère (on a retenu domaine seul).
- Régénération des 29 portraits (chantier séparé si un jour souhaité).
- Animation des scènes/cadres.
- Refonte du moteur de rendu de carte (on réutilise `drawCard`/`cardArt`/`cardPlate`).

## Risques / points d'attention

- **Lisibilité** : le texte du dilemme et le nom d'orateur sont posés sur un voile de
  plomb semi-opaque quand une plaque est présente (`card.js`) — les teintes vives ne
  doivent pas casser ce contraste ; à valider au gate.
- **Cohérence des 5 cadres** : même tracery/compo entre les 5 (sinon « ça respire ») —
  d'où l'option master + recolor, à décider au plan.
- **Scène vs cadre** : une carte à scène garde son cadre de domaine (les deux se
  composent) — vérifier qu'une scène claire reste lisible dans l'arche sur cadre teinté.
