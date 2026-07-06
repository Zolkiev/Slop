# Événements de fond par décor — Design

**Date :** 2026-07-06
**Statut :** validé par Jael (« ok ca me va » — approche procédurale, événements marqués)

## Objectif

Les fonds lointains sont des PNG statiques ; retour Jael après le gate
décors : « le fond avec le gros orage/éclair est beaucoup trop statique ».
Chaque décor gagne UN **événement signature** procédural — rare mais
spectaculaire — dessiné par le code par-dessus le PNG, dans la lignée de
`twinkle.js` (fenêtres néon) et `ambiance.js` (pluie/cendre). Zéro nouvel
asset (l'audio pèse déjà ~10,7 Mo), zéro dépendance.

Décision d'approche (alternatives écartées) : frames PixelLab multiples
(poids ×2-3 par décor, cohérence de scène non garantie entre générations)
et sprites overlay PixelLab (production + calibrage sur 5 palettes pour des
événements d'une demi-seconde). Le procédural pur gagne : léger, testable,
réglable finement. Option de secours si le gate visuel tempête déçoit :
UNE variante d'asset du ciel d'orage (éclairs déplacés) à permuter pendant
le flash.

## Les 5 événements signatures

| bgSet | Décor | Événement | Comportement |
|---|---|---|---|
| 0 | Nuit urbaine | **Rafale néon** | Les twinkles existants s'emballent en vague horizontale ~1 s (coupure de courant qui se propage) — réutilise `world.twinkles.points`, pas de nouveaux points |
| 1 | Industriel | **Torchère** | Halo vert qui pulse 2-3 s au sommet des cheminées — 2-3 positions fixes par rapport à l'image (constantes du module) |
| 2 | Soleil couchant | **Vol d'oiseaux** | 4-5 silhouettes « v » sombres de ~3 px, trajectoire lente légèrement ondulante devant le ciel |
| 3 | Tempête néon | **Frappe de foudre** | Double pulse lumineux plein ciel (attaque instantanée, retombée rapide, 2e pulse plus faible) — illumine les éclairs peints du PNG |
| 4 | Orbite | **Étoile filante** | Trait fin blanc-bleu en diagonale, traînée qui s'estompe, ~0,7 s |

## Cadence et lisibilité

- Un événement toutes les **6 à 12 s** (tirage uniforme via `world.rand`),
  un seul actif à la fois. Timer réarmé à la fin de l'événement.
- Actif partout où le décor est visible (PLAY, menu vitrine, pause —
  même politique d'update que `ambiance`).
- **Lisibilité gameplay non négociable** : tout est dessiné ENTRE le fond
  lointain et le premier plan (couche 2 du renderer) — jamais par-dessus
  les obstacles ou le robot. Le flash foudre est un voile plafonné
  (`rgba` alpha max ≈ 0,35, jamais de blanc plein écran) pour ne pas
  masquer les portes.
- Changement de décor (`applyBgSet`) : événement en cours coupé, timer
  relancé — pas d'étoile filante orpheline sur la tempête.

## Architecture

- **`src/game/bgevents.js`** (nouveau, pur) : `createBgEvents(rand)` →
  état `{ timer, event: null | { kind, t, durée, params } }` ;
  `updateBgEvents(ev, dt, bgSet, rand)` avance le timer, déclenche
  l'événement du décor courant, le termine. Table `EVENTS` par bgSet
  (kind, durée, générateur de params — positions, trajectoires).
  Aucun accès DOM/canvas : sérialisable et testable.
- **`src/render/bgevents.js`** (nouveau) : `renderBgEvents(ctx, world)`
  dessine l'événement actif selon `kind`. Appelé dans `renderer.js` entre
  le fond lointain (étape 1) et le premier plan (étape 2) — l'étoile
  filante et les oiseaux passent DERRIÈRE la bande near (profondeur
  gratuite), le flash éclaire le ciel sans toucher les silhouettes du
  premier plan (contre-jour plausible). Exception rafale néon : elle vit
  dans le rendu des twinkles existants (étape 2a), pas dans cette couche.
- **`world.js`** : `bgEvents: createBgEvents(rand)` dans `createWorld`,
  update à côté d'`updateAmbiance`, reset dans `applyBgSet`.
- Cas particulier rafale néon (bgSet 0) : l'événement module l'alpha des
  points twinkle existants via un facteur passé à `twinkleAlpha` ou un
  boost temporaire dans le render — à trancher au plan, sans dupliquer
  les points.

## Hors périmètre

- Sons des événements (tonnerre, etc.) — pairing naturel avec un futur
  sous-projet audio ; noter l'événement dans `world.events` dès
  maintenant si trivial, sinon rien.
- Animation des fonds near (bandes de premier plan) et des obstacles.
- Nouveaux assets (sauf option de secours tempête, décision au gate).

## Vérification

- TDD (vitest, logique pure) : cadence bornée 6-12 s ; un seul événement
  actif ; cycle de vie complet (déclenche → progresse → meurt → réarme) ;
  reset au changement de décor ; chaque bgSet déclenche le bon `kind` ;
  déterminisme avec `rand` seedé.
- Smoke Playwright : `rand` forcé pour déclencher chaque événement,
  screenshot pendant l'événement (5 décors), zéro erreur console,
  lisibilité obstacles/HUD sur le flash tempête.
- **Gate final Jael en jeu** : effet « vivant » ressenti, foudre assez
  spectaculaire, aucun événement qui gêne la lecture des portes.

## Timing d'implémentation

Après le triple gate en cours et la cascade de merge de la pile
tier-decors → theme-music → player-progression vers main. Nouvelle
branche `feat/bg-events` depuis main mergé.
