# Skins v2 — VORTEX, premier robot original (pilote) — Design

**Date :** 2026-07-07 · **Statut :** validé par Jael (identité, stratégie hybride 1 appel, seuil 15)

## Objectif

Ajouter un 6e robot jouable **VORTEX** — un drone volant, première silhouette
vraiment originale (pas un recolor du robot de base) — en dépensant **au plus
3 appels PixelLab** (1 prévu ; coût en générations par appel encore inconnu,
mesuré au 1er). Le pilote valide la recette (prompt +
montage local des frames de poussée) qui servira aux robots originaux suivants.

**Contrainte dure :** solde PixelLab = 257 générations (mesuré le 07/07 via
`GET /v2/balance`, plan « Pixel Apprentice »). Chaque appel est décidé, mesuré,
et le solde est re-vérifié après.

## Identité

| Champ | Valeur |
|---|---|
| id / name | `vortex` / `VORTEX` |
| Accent | `#ff3e5e` (rouge néon — flamme + particules, seule teinte libre) |
| Design | Drone volant : corps compact arrondi, œil-lentille unique, deux rotors latéraux, tuyères vers le bas, tôle sombre + accents rouge néon |
| Déblocage | **Niveau 15** (première borne après l'orbite ; les 5 skins existants gardent leurs seuils 1/3/5/7/10) |
| Sprites | `robot-s5.png`, `robot-s5-thrust-0.png`, `robot-s5-thrust-1.png` (64×64, dessinés 44×44, hitbox inchangée 34×24) |

## Stratégie de génération (hybride, validée)

1. **UN appel** `generate-image-v2` 64×64 fond transparent → 16 candidats.
   Prompt (profil vers la **droite**, comme le robot de base — critère
   d'acceptation, un candidat tourné à gauche ou de face est éliminé) :
   > tiny flying surveillance drone robot, compact rounded body, single large
   > glowing red eye lens, two small side rotors, twin downward thruster
   > nozzles under the body, dark gunmetal hull with neon red accents,
   > side view facing right, hovering, cyberpunk, clean pixel art, black
   > outline, readable silhouette
2. **Mesure du coût** : re-check du solde immédiatement après l'appel ; le
   coût réel (1 ou 16 générations par appel) est noté dans la mémoire projet.
3. **Gate Jael n°1 — planche contact** : les 16 candidats présentés en grille,
   Jael choisit (ou rejette tout → STOP, on rediscute avant tout nouvel appel).
4. **Frames de poussée en LOCAL (0 génération)** : le corps du drone ne change
   pas de pose ; on extrait les pixels de flamme des sprites PROTO
   (`robot-thrust-0/1.png`, zone sous le jetpack), recoloration cyan→rouge
   (`#3ef0ff`→`#ff3e5e` + teintes voisines), composite sous les tuyères du
   candidat retenu. Corps strictement identique sur les 3 frames → alignement
   parfait. Outil durable : `Slop/.claude/tools/compose-thrust.mjs` (pngjs,
   hors repo du jeu — réutilisable pour les skins suivants).
5. **Fallback** (si le montage local déçoit au gate) : 1-2 appels `edit` sur
   l'idle retenu pour dériver les frames de poussée (technique éprouvée des
   recolors). Plafond absolu du pilote : 3 appels.

## Intégration code

- **Bug latent corrigé au passage** : `skinUnlocked` (`src/game/skins.js:19`)
  indexe `CONFIG.PATTERN_TIERS` (5 entrées) — un 6e skin donnerait
  `record >= undefined` → jamais débloquable. On introduit
  `CONFIG.SKIN_THRESHOLDS = [1, 3, 5, 7, 10, 15]` comme **source unique** des
  seuils de déblocage ; `skinUnlocked` bascule dessus (les 5 premiers seuils
  restent identiques à `PATTERN_TIERS`, qui garde son rôle purement gameplay).
- `SKINS` passe à 6 entrées (`skins.js`) ; `spriteKey(5)` = `robot-s5` (déjà
  générique) ; les 3 nouveaux sprites rejoignent la map d'assets (`main.js`).
- Le hangar ROBOTS itère déjà sur `SKINS` (flèches ‹ ›) — aucun changement de
  layout attendu ; silhouette verrouillée = même traitement source-in.
- Tests étendus : déblocage à 15 (pas avant), `loadSkin` garde hors-bornes avec
  6 entrées, sprites chargés, hangar navigue jusqu'au 6e.

## Gates & critères d'acceptation

1. **Planche contact** (gate Jael) : silhouette drone lisible, profil droite,
   pas d'humanoïde.
2. **En jeu** (gate Jael, :5199, code save niveau 15 généré via `encodeSave`) :
   VORTEX verrouillé au niveau 14, débloqué à 15 ; en vol les 3 frames
   s'enchaînent sans « saut » de silhouette ; flamme/particules rouges ;
   lisible sur les 5 décors (surtout orbite, le plus sombre — l'accent rouge
   doit trancher).
3. **Budget** : au plus 3 appels dépensés, coût par appel documenté.

## Hors scope (pilote)

Les robots originaux suivants (mécha trapu, sphère, fantôme…) — ils
réutiliseront la recette validée ici, chacun avec son seuil au-delà de 15.
Toute animation du corps du drone (rotors qui tournent) : les 3 frames
partagent le même corps, comme les skins existants.
