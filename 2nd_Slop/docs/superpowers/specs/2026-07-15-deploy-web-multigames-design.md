# Déploiement web multi-jeux + refonte des READMEs

Date : 2026-07-15
Statut : approuvé

## Objectif

Déployer **Logres** (2nd_Slop) sur GitHub Pages à côté de **Jetpack Bot** (1st_Slop),
sous un même repo `Slop` (un seul site Pages), avec une page hub à la racine. Refondre
les READMEs : racine allégée (« Slop games rapides & simples »), un README riche par jeu.

## Architecture de déploiement

Le repo `Slop` sert **un seul** site Pages. Routing retenu (Option B — hub + sous-dossiers) :

```
dist/index.html   → https://zolkiev.github.io/Slop/          (page hub)
dist/jetpack/     → https://zolkiev.github.io/Slop/jetpack/  (Jetpack Bot)
dist/logres/      → https://zolkiev.github.io/Slop/logres/   (Logres)
```

Conséquence assumée : le lien `/Slop/` que les testeurs utilisent aujourd'hui affiche
désormais le hub (Jetpack à un clic), pas Jetpack directement.

### Composants

- **`landing/index.html`** (nouveau, repo root) : page hub statique, thème sobre, pitch
  « on fait des Slop games rapides & simples », 2 cartes cliquables (`jetpack/`, `logres/`).
  Copiée telle quelle à la racine de `dist/`.
- **`2nd_Slop/vite.config.js`** (nouveau) : `base: './'`, `build.outDir: 'dist'` — comme
  1st_Slop, pour fonctionner servi depuis un sous-dossier.
- **Assets runtime Logres** : le jeu charge ses assets via des chemins string au runtime
  (`assets/portraits/*.png`, musique, sfx…), donc Vite ne les bundle pas. Step de copie
  post-build dans le CI : `assets/{bg,music,portraits,sfx,ui,gen}` → `dist/logres/assets/`.

### Workflow CI (`.github/workflows/deploy.yml`)

Un job `build` qui, pour chaque jeu : `npm ci`, `vitest run`, `vite build`. Puis assemble
l'artefact Pages :
- `1st_Slop/dist/*`  → `site/jetpack/`
- `2nd_Slop/dist/*`  → `site/logres/`
- copie assets runtime → `site/logres/assets/`
- `landing/index.html` → `site/index.html`

Upload `site/` comme artefact Pages, job `deploy` inchangé.

Trigger `paths` : `1st_Slop/**`, `2nd_Slop/**`, `landing/**`, `.github/workflows/deploy.yml`.

## READMEs

- **`README.md`** (racine) : allégé. Pitch collection « Slop games rapides & simples »,
  structure du repo, une ligne + lien live par jeu. Plus de gros bloc gif à la racine.
- **`1st_Slop/README.md`** : conservé (déjà riche). Liens live `/Slop/` → `/Slop/jetpack/`.
- **`2nd_Slop/README.md`** (nouveau) : format similaire à Jetpack — pitch, screenshots,
  comment jouer, section dev.

## Screenshots Logres

Générés via `2nd_Slop/scripts/smoke-shot.mjs` (puppeteer-core) : ~3-4 captures réelles
(menu, un dilemme/carte, une fin) dans `2nd_Slop/docs/screenshots/`. Fallback : si l'outil
est trop capricieux, README sans images d'abord, captures ajoutées ensuite.

## Vérification

- `vitest run` vert pour les deux jeux.
- `vite build` OK pour les deux ; artefact assemblé localement a la bonne arborescence
  (`index.html` hub, `jetpack/index.html`, `logres/index.html`, `logres/assets/` peuplé).
- Servi en local (`npx serve site` ou équivalent) : hub charge, chaque jeu charge sans 404
  d'assets, navigation hub → jeu → retour OK.
- Screenshots présents et non vides.

## Hors périmètre

- Pas de redirection `/Slop/` → `/Slop/jetpack/` (le hub joue ce rôle).
- Pas de refonte du gameplay ni des assets des jeux.
- Leaderboard / save cloud Supabase (backlog séparé).
