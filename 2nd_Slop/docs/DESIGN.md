# Logres — Document de conception (v0)

> 2ᵉ jeu « Slop ». Un **Reigns-like** ambitieux dans l'univers de la **légende
> arthurienne**. Une seule action (swipe gauche/droite), mais une vraie
> profondeur RPG derrière : personnages récurrents, chaînes de quêtes, dynastie,
> reliques, ères. Web/mobile, addictif, sauvegarde sans backend.

## 1. Pitch

Tu es le souverain de **Logres**. Chaque **carte** est un personnage qui te
soumet un dilemme. Tu réponds d'un geste : **swipe / tap gauche ou droite**
(clavier ← / →, ou souris). Chaque choix fait bouger 4 jauges. Quand une jauge
tombe à **0** ou atteint son **maximum**, ton règne s'achève par une mort
thématique. Objectif : **régner le plus longtemps** et faire durer la lignée
Pendragon.

Reste fidèle à l'ADN Slop : **une mécanique**, boucle courte (2–3 min),
rejouable à l'infini, très partageable.

## 2. Les 4 jauges

L'axe **Foi ⚔ Magie** est le cœur thématique arthurien (christianisation de la
Bretagne contre l'ancien monde des fées et de Merlin). Monter l'une descend
souvent l'autre.

| Jauge | Icône | À 0 | Au max |
|---|---|---|---|
| **Foi** (l'Église) | ✝️ | Excommunié, le clergé te renie | Théocratie — l'Inquisition te dévore |
| **Magie** (Merlin, Avalon, l'ancienne foi) | 🔮 | Merlin t'abandonne, la magie s'éteint | Les fées/Morgane t'engloutissent |
| **Chevalerie** (la Table Ronde) | ⚔️ | Tes chevaliers se dispersent, invasion saxonne | Un champion trop puissant t'usurpe |
| **Couronne** (barons & peuple) | 👑 | Les barons se soulèvent | Tyran — le peuple se révolte |

- Chaque jauge affichée en 0..100 (interne), 4 crans visibles façon Reigns.
- Un choix modifie 1 à 3 jauges. L'aperçu des jauges impactées apparaît quand on
  amorce le swipe (feedback avant validation).

## 3. Contenu 100 % data-driven

Chaque **carte** est une donnée déclarative — l'écriture est séparée du code.

```
Card {
  id, era, speaker,            // personnage qui parle (portrait + nom)
  text,                        // le dilemme
  left:  { label, effects, flags?, next? },
  right: { label, effects, flags?, next? },
  requires?: { flags?, gaugeRange? },   // conditions d'apparition
  weight,                      // pondération de tirage
  unique?: bool                // ne réapparaît pas une fois jouée
}
effects = { foi?: ±n, magie?: ±n, chevalerie?: ±n, couronne?: ±n }
```

Un **moteur de deck** tire les cartes éligibles (conditions remplies) selon leur
poids. Les `flags` posés par un choix arment des cartes de suite (`next` ou
apparition conditionnelle) → **chaînes de quêtes** et conséquences différées.

### Invariants testés (Vitest)

- Jauges toujours bornées 0..100.
- À tout état atteignable, il existe toujours ≥1 carte jouable (pas de blocage).
- Toute carte `next` référencée existe ; tout flag lu est posé quelque part.
- Aucune chaîne ne peut se verrouiller dans une impasse.

## 4. Systèmes RPG

1. **Personnages récurrents à arcs** — Merlin, Morgane, Lancelot, Guenièvre,
   Mordred, Keu, Gauvain, Perceval, la Dame du Lac, les Saxons. Ils reviennent
   et « se souviennent » (via flags).
2. **Chaînes de quêtes** — décisions qui déclenchent des événements plusieurs
   cartes plus tard. Ex : l'affaire Lancelot/Guenièvre, la quête du Graal, la
   montée de Mordred.
3. **Dynastie (méta-progression)** — à la mort, l'héritier régne. On débloque
   des **départs** (rois) avec bonus. Record = plus long règne / plus longue
   lignée. (Équivalent des robots débloquables de Jetpack Bot.)
4. **Reliques** — objets qui changent les règles : Excalibur, le Fourreau
   (protège d'une mort), le Graal, la Table Ronde.
5. **Ères** — l'arc de la légende, équivalent des « 5 mondes » du 1er jeu :

   | Ère | Nom | Ambiance |
   |---|---|---|
   | 1 | L'Épée dans la Roche | ascension, légitimité fragile |
   | 2 | L'Âge d'Or de Camelot | apogée, Table Ronde |
   | 3 | La Quête du Graal | mysticisme, dispersion |
   | 4 | La Chute | trahison de Mordred, guerre civile |
   | 5 | Avalon | épilogue mythique |

   Chaque ère : décor, piste musicale et paquet de cartes propres.

## 5. Contrôles

- **Une seule action** : swipe/tap gauche ou droite (mobile), ← / → ou clic
  (desktop). Drag partiel = aperçu des jauges impactées ; relâcher = valider.
- Menus au clavier (flèches + Entrée) et à la souris/tap, comme le 1er jeu.
- Échap / bouton pause : reprendre, recommencer, options, menu.

## 6. Sauvegarde

- Tout en local (navigateur).
- Code rétro type mot de passe **`LG1-XXX`** (base32 Crockford + checksum) et
  lien direct `…#save=LG1-XXX` — restaure la progression sans compte ni backend.
- Distingue **partie en cours** et **record** (comme Jetpack Bot).

## 7. Stack & architecture (from scratch, patterns éprouvés du 1er jeu)

100 % **vanilla JS (ES modules) + Canvas 2D**, **zéro dépendance runtime**.
Vite (dev/build), Vitest (tests), Web Audio API, rendu plafonné 60 fps.

```
src/
├── main.js                 # bootstrap + boucle + restauration #save= au boot
├── config.js               # constantes (jauges, ères, layouts, audio)
├── engine/
│   ├── loop.js             # game loop
│   ├── state.js            # machine à états (Menu/Play/GameOver/Pause/Options/…)
│   ├── input.js            # swipe/drag + clavier + souris + échap
│   ├── assets.js           # préchargement portraits + décors
│   ├── audio.js            # SFX + musique (Web Audio)
│   └── font.js             # police pixel
├── game/
│   ├── reign.js            # orchestration d'un règne : jauges, mort, années
│   ├── gauges.js           # état + application d'effets + bornes
│   ├── deck.js             # tirage pondéré selon conditions
│   ├── cards/              # cartes data-driven, un fichier par ère/arc
│   ├── flags.js            # état des chaînes de quêtes
│   ├── era.js              # progression d'ère + décor/musique
│   ├── dynasty.js          # héritiers, départs débloquables
│   ├── relics.js           # reliques et leurs règles
│   ├── score.js            # règne en cours vs record, persistance
│   ├── save.js             # codes LG1-XXX
│   ├── savecode.js         # écran CODE (copier / lien / saisir)
│   ├── menu.js / options.js / settings.js
│   └── music.js
├── render/
│   ├── renderer.js         # rendu Canvas (carte, portrait, jauges, HUD)
│   ├── card.js             # carte + animation de swipe + aperçu jauges
│   ├── gauges.js           # rendu des 4 jauges
│   └── menu.js / pause.js / options.js / savecode.js / gameover.js
└── ui/
    └── codeinput.js        # overlay DOM de saisie du code
```

## 8. Assets & audio

- **Portraits** de personnages + **décors** d'ère en pixel-art via
  [PixelLab](https://pixellab.ai) (`scripts/pixellab.mjs`).
- **Musique** chiptune générée par script (`scripts/music.mjs`, WAV
  reproductible, zéro dépendance) : une piste par ère + menu + game over.
- **SFX** générés (`scripts/sfx.mjs`) : swipe, validation, mort, déblocage.

## 9. Portée v1 (« ambitieux d'emblée »)

- Les **4 jauges** + moteur de deck + morts thématiques.
- **~120–200 cartes** réparties sur les 5 ères, incluant :
  - 3–4 **chaînes de quêtes** majeures (Graal, Lancelot/Guenièvre, Mordred, Excalibur) ;
  - une douzaine de personnages récurrents.
- **Dynastie** avec 3–5 départs débloquables.
- **2–3 reliques** actives.
- Sauvegarde `LG1-XXX`, options audio, menus complets.
- Suite de tests d'invariants complète.

## 10. Questions ouvertes / à trancher plus tard

- Titre définitif (Logres ? Pendragon ? Le Trône de Logres ?).
- ~~Palette et style~~ → **décidé (2026-07-12) : design vitrail stylisé et sobre
  pour les cartes** — original, loin des Reigns-like habituels ; plomb sombre,
  verre coloré, figures hiératiques. Tests visuels à faire (cadre de carte,
  et portraits « stained glass » à comparer au lot pixel-art bust).
  **Image de référence pour TOUTES les cartes** :
  `assets/gen/portraits/carte_complete_référence.png` (carte Magic « Skwi,
  monarque douteux », variante showcase vitrail de Daniel Lieske, DMU 2022) —
  à imiter comme *style* (réseau de plombs noirs, verre saturé rouge/or/violet,
  halo rayonnant derrière la figure, cadre et bandeaux sombres intégrés au
  vitrail), pas à copier tel quel (illustration sous copyright WotC).
  **Mise en œuvre (2026-07-12, validée par Jael)** : portraits « stained
  glass » PixelLab dans une arche gothique + **plaque pleine carte générée**
  (`assets/ui/card-plate.png`, candidate retenue : verrière de cathédrale,
  alternatives dans `assets/gen/card-frame/`) ; voiles de plomb semi-opaques
  sous le texte et le nom pour la lisibilité (`render/card.js`). **Nom de
  l'orateur en bas de la carte** (demande Jael). Portraits : style
  **minimaliste façon Reigns** (grands pans plats, visage géométrique, yeux
  en fente — validé sur référence Reigns GoT) avec **fond de verre identitaire
  par personnage**, aligné sur les couleurs des jauges (Foi=ambre/or,
  Magie=violet/vert, Chevalerie=bleu/acier, Couronne=rouge/pourpre,
  peuple=tons terre) ; **halo réservé au sacré/surnaturel** (évêque, moine,
  galaad, dame du lac — soleil héraldique pour gauvain). Mapping complet dans
  `scripts/gen-assets-vitrail.sh`. Évêque : peau chaude explicite (« warm tan
  skin »), sinon le modèle le sort blafard.
- **À venir (idées Jael 2026-07-12)** :
  - décliner la plaque de carte en variantes par type/famille de carte
    (codes couleur ou motifs différents — ex. quêtes, ères, personnages
    récurrents), même pipeline que la verrière ;
  - générer des **props pour les jauges** (icônes Foi/Magie/Chevalerie/
    Couronne dans la DA vitrail, remplacer les emojis actuels) ;
  - ~~revoir la police~~ → fait (Cinzel + EB Garamond embarquées) ;
  - **système de combat lié aux choix** (idée Jael 2026-07-12) : à concevoir
    UNE FOIS les scénarios et quêtes prêts — combats simples mais avec du
    style, inspiration « Magic » (cartes qui s'affrontent, pas un moteur
    tactique) ; garder la boucle swipe au cœur.
- ~~Ton d'écriture~~ → décidé : épique avec pointe d'ironie.
- Faut-il un système d'« années » visible (âge du roi) ou juste un compteur de règne ?
- Extraire un `_starter-template` commun après ce jeu (mutualiser loop/état/audio/save) ?
```
