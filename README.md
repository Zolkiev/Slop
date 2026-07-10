# Slop Games

Collection de petits jeux web/mobile simples mais addictifs (« slop games »).
Chaque jeu est autonome : son propre code, ses assets (générés via [PixelLab](https://pixellab.ai)) et son déploiement.

## Structure

```
Slop/
├── _starter-template/   # Squelette réutilisable (à venir)
├── 1st_Slop/            # Jeu 1 — Jetpack Bot
└── ...                  # Un dossier par jeu
```

---

## 🤖 1er jeu — Jetpack Bot

<p align="center">
  <a href="https://zolkiev.github.io/Slop/"><b>▶️&nbsp;JOUER DANS LE NAVIGATEUR</b></a>
</p>

Un Flappy-like vertical : un robot à jetpack s'élève depuis une mégapole cyberpunk
jusqu'à l'orbite. Tape pour activer la poussée, slalome entre les tours néon, et
gravis des niveaux infinis à travers **5 mondes** — chacun avec son décor, sa
musique chiptune et son robot à débloquer.

<p align="center">
  <img src="1st_Slop/docs/screenshots/gameplay.gif" alt="Gameplay" width="240">
  <img src="1st_Slop/docs/screenshots/menu.png" alt="Menu" width="240">
  <img src="1st_Slop/docs/screenshots/tempete.png" alt="Monde tempête" width="240">
</p>
<p align="center">
  <img src="1st_Slop/docs/screenshots/skins.png" alt="Hangar des robots" width="240">
  <img src="1st_Slop/docs/screenshots/orbite.png" alt="Monde orbite" width="240">
</p>

- **Niveaux infinis** : vitesse, ouvertures, patterns d'obstacles — tout se corse.
- **5 mondes** (nuit urbaine → industriel → toxique → tempête néon → orbite),
  chacun avec sa piste de musique et son robot pilote à débloquer.
- **Sauvegarde rétro** : un code façon mot de passe (`JB1-XXX`) à copier ou
  partager en lien — ta progression voyage entre appareils sans aucun compte.
- 100 % vanilla JS + Canvas 2D, **zéro dépendance runtime**.

▶️ **Pour jouer / développer**, voir [`1st_Slop/README.md`](1st_Slop/README.md).

```bash
cd 1st_Slop
npm install
npm run dev      # serveur local
```
