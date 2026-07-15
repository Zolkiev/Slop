# Slop Games

Une collection de petits jeux web **rapides et simples**, mais addictifs (« slop games »).
Chaque jeu est autonome : son propre code, ses assets (générés via
[PixelLab](https://pixellab.ai)) et son build. Un jeu, un dossier, zéro compte.

🎮 **[Jouer en ligne → zolkiev.github.io/Slop](https://zolkiev.github.io/Slop/)**

## Les jeux

### 🤖 Jetpack Bot — `1st_Slop/`

Un Flappy-like vertical : un robot à jetpack s'élève d'une mégapole cyberpunk jusqu'à
l'orbite, à travers **5 mondes**. Une seule action, des niveaux infinis.

▶️ **[Jouer](https://zolkiev.github.io/Slop/jetpack/)** · 📖 [README](1st_Slop/README.md)

### 👑 Logres — `2nd_Slop/`

Un Reigns-like arthurien : règne sur Logres carte après carte, équilibre **quatre
pouvoirs** (Église, magie, chevalerie, couronne) et traverse la légende — ou tombe.

▶️ **[Jouer](https://zolkiev.github.io/Slop/logres/)** · 📖 [README](2nd_Slop/README.md)

## Structure

```
Slop/
├── landing/     # Page hub (racine de zolkiev.github.io/Slop)
├── 1st_Slop/    # Jeu 1 — Jetpack Bot
├── 2nd_Slop/    # Jeu 2 — Logres
└── ...          # Un dossier par jeu
```

## Déploiement

GitHub Pages, automatique à chaque push sur `main` (voir
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) : la page hub est servie
à la racine, chaque jeu sous son sous-chemin (`/jetpack/`, `/logres/`).
