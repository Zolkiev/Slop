# Jetpack Bot — Design (V1)

**Date:** 2026-06-30
**Statut:** Validé (design) — prêt pour le plan d'implémentation
**Dossier projet:** `Slop/1st_Slop/`

## Concept

Flappy-like vertical sur le thème **robot à jetpack dans une mégapole cyberpunk**.
Le joueur tape pour activer la poussée du jetpack (le robot monte) ; en relâchant, la
gravité le fait redescendre. Il faut slalomer entre des obstacles néon (piliers /
gratte-ciels), maximiser son score, puis recommencer après le crash.

La cohérence mécanique est volontaire : le tap = poussée jetpack est *narrativement
justifié*, ce qui rend la prise en main immédiate.

## Plateformes & format

- **Web** (mobile-first), jouable aussi sur desktop via navigateur.
- **Format portrait** (ratio ~9:16), résolution logique de référence **360×640**.
- Le canvas est mis à l'échelle pour remplir l'écran sur mobile, et affiché dans un
  cadre centré "façon téléphone" sur desktop.
- **Contrôles** : tap (mobile) / clic gauche / barre espace (desktop). Une seule action.

## Stack & architecture

- **Vanilla JavaScript (ES modules) + Canvas 2D**, zéro dépendance runtime.
- **Vite** pour le dev (serveur local rapide) et le build (sortie statique déployable).
- Découpage en modules à responsabilité unique :

```
1st_Slop/
├── index.html
├── src/
│   ├── main.js              # bootstrap + démarrage de la boucle
│   ├── engine/
│   │   ├── loop.js          # game loop (delta time fixe), fixed-update
│   │   ├── state.js         # machine à états Menu/Play/GameOver
│   │   ├── input.js         # abstraction tap/clic/espace
│   │   ├── assets.js        # préchargement images + sons
│   │   └── audio.js         # lecture des SFX
│   ├── game/
│   │   ├── robot.js         # entité joueur (gravité, thrust, hitbox, anim)
│   │   ├── obstacles.js     # spawn/déplacement/recyclage des obstacles néon
│   │   ├── background.js    # parallaxe multi-couches
│   │   ├── collision.js     # tests de collision AABB
│   │   └── score.js         # score courant + best score (localStorage)
│   └── config.js            # constantes de gameplay (gravité, thrust, gap, vitesse…)
├── assets/                  # sprites + sons (générés via Pixellab)
└── docs/
```

### Boucle de jeu

- **Game loop** basée sur le delta time, avec un pas de mise à jour fixe
  (fixed timestep) pour une physique déterministe quel que soit le framerate.
- **Machine à états** :
  - `Menu` — écran d'accueil, "tap to fly".
  - `Play` — gravité + thrust, spawn et défilement des obstacles, scoring, parallaxe.
  - `GameOver` — affiche score + best score, "tap to retry".

### Physique (modèle simple)

- Vitesse verticale du robot : `vy += gravity * dt` ; au tap : `vy = -thrust`.
- Le monde "défile" (obstacles et décor se déplacent vers la gauche à vitesse constante) ;
  le robot reste à X fixe.
- Collisions **AABB** entre la hitbox du robot et les obstacles + sol/plafond.
- Toutes les constantes regroupées dans `config.js` pour un tuning facile.

## Assets (pipeline Pixellab)

- **Robot** : sprite animé — état idle + état thrust (flamme/réacteur animé).
- **Obstacles** : piliers / gratte-ciels néon (variante haute + basse, gap aléatoire).
- **Décor** : 2–3 couches de parallaxe (skyline lointaine, bâtiments proches, ambiance).
- **Palette** cyberpunk : fond sombre, néons cyan/magenta dominants.

## Audio

- SFX simples : **thrust** (poussée), **score** (passage d'obstacle), **crash**.

## Scope

### 🟢 Core V1 (inclus)

- Game loop propre (delta time, fixed timestep) + machine à états Menu/Play/GameOver.
- Robot : thrust jetpack + gravité + hitbox.
- Obstacles néon défilants, gaps aléatoires, recyclage.
- Score + best score persistant (`localStorage`).
- 1 perso animé + décor parallaxe (assets Pixellab intégrés).
- SFX basiques (thrust, score, crash).
- Responsive mobile (tap) + desktop (clic/espace), viser 60 fps.
- Build web statique déployable.

### 🟡 Nice-to-have (V1.1 si le temps le permet)

- "Juice" : particules de réacteur, screen shake, flash au crash.
- Écran d'accueil soigné + mini-tuto "tap to fly".

### 🔴 Hors scope V1

- Skins de robots débloquables.
- Difficulté progressive avancée / power-ups.
- Leaderboard en ligne, partage social, monétisation.

## Critères de succès V1

- Jouable au tap (mobile) et clic/espace (desktop), fluide (~60 fps).
- Boucle complète Menu → Play → GameOver fonctionnelle.
- Best score persistant entre sessions.
- Rendu visuel cohérent avec les assets Pixellab intégrés.
- Build produit un dossier statique déployable sur le web.

## Notes projet

- Premier jeu de la collection `Slop`. Une fois le pipeline rodé (dev + Pixellab +
  déploiement), on extraira un `_starter-template/` réutilisable pour les jeux suivants.
- Chaque jeu reste autonome (code, assets, déploiement) dans son propre dossier.
