# Jetpack Bot

Flappy-like vertical sur le thème d'un **robot à jetpack dans une mégapole cyberpunk**.
Tape pour activer la poussée (le robot monte), relâche et la gravité le fait redescendre.
Slalome entre les obstacles néon, franchis les portes, et progresse à travers des niveaux
de plus en plus rapides.

<p align="center">
  <img src="docs/screenshots/title.png" alt="Écran titre" width="240">
  <img src="docs/screenshots/gameplay.png" alt="En jeu" width="240">
  <img src="docs/screenshots/gameover.png" alt="Game over" width="240">
</p>

## Comment jouer

- **Une seule action** : tape l'écran (mobile), clic gauche, ou barre **Espace** (desktop) pour la poussée.
- Passe entre les piliers sans les toucher ni sortir de l'écran.
- **Franchis 10 portes** pour terminer un niveau ; le niveau suivant est plus rapide avec des ouvertures plus étroites.
- **Crash** → tu rejoues le niveau en cours (pas de retour au début).
- Ton record = le **niveau max atteint**, sauvegardé dans le navigateur.

## Lancer le projet

Prérequis : Node 18+.

```bash
npm install
npm run dev        # serveur de dev (Vite) — http://localhost:5173
npm run build      # build statique déployable dans dist/
npm run preview    # prévisualise le build
npm test           # suite de tests (Vitest)
```

## Stack & architecture

100 % **vanilla JavaScript (ES modules) + Canvas 2D**, **zéro dépendance runtime**. [Vite](https://vitejs.dev) pour le dev/build, [Vitest](https://vitest.dev) pour les tests. Découpage en modules à responsabilité unique :

```
src/
├── main.js              # bootstrap + boucle de jeu
├── config.js            # constantes (physique, monde, niveaux)
├── engine/
│   ├── loop.js          # game loop à pas de temps fixe
│   ├── state.js         # machine à états (Menu/Play/LevelComplete/GameOver)
│   ├── input.js         # abstraction tap/clic/espace
│   ├── assets.js        # préchargement images
│   └── audio.js         # SFX
├── game/
│   ├── world.js         # orchestration : état de run, niveaux, collisions
│   ├── robot.js         # physique du robot
│   ├── obstacles.js     # spawn / défilement / recyclage
│   ├── level.js         # courbe de difficulté par niveau
│   ├── score.js         # détection de passage + record (bestLevel)
│   ├── collision.js     # AABB + limites
│   ├── background.js    # parallax
│   └── particles.js / ambiance.js / twinkle.js  # décor animé
└── render/
    └── renderer.js      # rendu Canvas (monde + HUD)
```

### Difficulté par niveau

La difficulté est dérivée par formule (contenu infini, aucun asset à dessiner) — voir `src/game/level.js` et les constantes dans `src/config.js` :

- **Vitesse** : `min(SPEED_BASE + (niveau-1)·SPEED_STEP, SPEED_MAX)`
- **Ouverture** : `max(GAP_BASE - (niveau-1)·GAP_SHRINK, GAP_FLOOR)`

Le niveau 1 reproduit exactement l'équilibrage d'origine ; l'équilibrage se fait en changeant ces constantes.

## Assets

Sprites et décors pixel-art générés via [PixelLab](https://pixellab.ai) (API v2) à l'aide de `scripts/pixellab.mjs` (client REST minimal sans dépendance ; commandes `generate`, `poll`, `edit`). SFX générés via `scripts/sfx.mjs`.

## Design & specs

Les documents de conception et plans d'implémentation vivent dans `docs/superpowers/` (`specs/` et `plans/`).
