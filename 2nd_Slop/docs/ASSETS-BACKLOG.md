# Backlog d'assets PixelLab — liste et prompts prêts à tirer

> Établi le 2026-07-14. **Solde : ~290 générations** — on tire les priorités 1-2
> maintenant si besoin, le reste au renouvellement du quota. Les prompts suivent
> la recette validée par Jael (2026-07-12) : ne pas improviser dessus.

## Rappel de la recette (validée, ne pas dévier)

- **Suffixe portrait** (`MBASE` dans `scripts/gen-assets-vitrail.sh`) :
  `minimalist stained glass window portrait, flat design, large simple flat
  panes of muted colored glass, bold thick black lead outlines, simple
  geometric stylized face, narrow black slit eyes, no facial shading, very few
  details, deep muted jewel tones, hieratic bust facing viewer, edge to edge
  full bleed, no grey border, glass fills entire canvas`
- **Système couleur** : fond de verre aligné jauges — Foi=ambre/or,
  Magie=violet/vert, Chevalerie=bleu/acier, Couronne=rouge/pourpre,
  peuple=tons terre. **Halo réservé au sacré/surnaturel.**
- **Garde-fous QA** : ajouter `perfectly frontal symmetrical pose` + `two
  narrow vertical solid black slit eyes clearly visible` si un candidat sort
  de trois-quarts ou sans yeux. Évêque et peaux : `warm tan skin` explicite.
- **Coûts constatés** : portrait 128×128 ≈ 20 gén. (4 candidats/job) ; icône
  64×64 ≈ 20 gén. (16 candidats/job) ; plaque 352×480 ≈ 40 gén. ; décor
  384×640 ≈ 40-60 gén. **503 fréquents** : re-poller (`pixellab.mjs poll
  --job <id>`) avant de relancer, le job est payé à la création.
- Candidats dans `assets/gen/<lot>/`, revue via `scripts/gallery-shot.mjs`,
  vérif en jeu via `cards-proof.html` / `scripts/smoke-shot.mjs`.

---

## P0 — QA : harmoniser les yeux de 3 portraits (~60 gén.)

**Constat Jael (2026-07-14)** : `baron.png`, `gauvain.png` et `lancelot.png`
ont des yeux différents du reste du cast — ça casse l'unité. Ce sont justement
les portraits regénérés lors de la QA du 2026-07-12 avec le prompt renforcé
(`two narrow vertical solid black slit eyes clearly visible`) : le correctif
anti-« sans yeux » a produit un style d'yeux qui ne colle pas aux 23 autres.

À regénérer avec le `MBASE` standard (qui dit déjà `narrow black slit eyes`),
**sans** le renfort, en gardant `perfectly frontal symmetrical pose` :

| Fichier | Prompt (reprendre ceux de `gen-assets-vitrail.sh`) |
|---|---|
| `baron.png` | `fat scheming baron, purple velvet doublet, heavy gold chains, smug face, no halo, perfectly frontal symmetrical pose, background of plain rich purple glass panes` |
| `gauvain.png` | `proud young knight Gawain, blond hair, green and gold surcoat, large heraldic golden sun disc in the background, perfectly frontal symmetrical pose, background of green and gold glass panes` |
| `lancelot.png` | `noble knight Lancelot, long brown hair, silver armor, deep blue surcoat, no halo, perfectly frontal symmetrical pose, background of plain deep blue glass panes` |

**Critère de choix des candidats : les yeux d'abord** — comparer côte à côte
avec `keu.png`/`merlin.png` (référence du style) via `scripts/gallery-shot.mjs`
avant de brancher. Si les 4 candidats sortent encore « sans yeux », alterner le
seed (78 → 79) plutôt que de re-renforcer le prompt.

## P1 — Combat : donner un visage aux duels (~60-80 gén.)

Les adversaires des épreuves retombent aujourd'hui sur le chevalier anonyme.
Trois portraits changent tout :

| Fichier | Usage | Prompt (à préfixer, `, ${MBASE}` en suffixe) |
|---|---|---|
| `roi.png` | Le champion « LE ROI » (médaillon de duel, futur écran) | `king Arthur, noble bearded face, golden crown, regal red and gold mantle, no halo, perfectly frontal symmetrical pose, background of plain deep red and gold glass panes` |
| `chevalier-noir.png` | Adversaire du tournoi | `ominous black knight, closed black great helm with narrow visor slit, black armor, dark violet plume, no halo, background of plain charcoal and dark violet glass panes` |
| `chef-saxon.png` | Adversaire de la bataille de la côte | `fierce saxon warlord, wild blond braided hair and beard, bearskin cloak over iron scale armor, round painted war shield, no halo, background of plain cold sea grey and rust glass panes` |

- Le roi d'Outre-Humber (champ clos) : **réutiliser `roi-lot.png`** (roi rival,
  couronne de fer — parfait) en changeant le mapping, zéro génération.
- Branchement : ajouter les clés dans `src/game/portraits.js` + les `speaker`
  des adversaires dans `src/game/combats/index.js`.

## P2 — Reliques en vitrail (~20-40 gén., 16 candidats/job)

Remplacer les emojis 🗡️🛡️ de `drawRelics` (renderer.js) par des icônes 64×64
détourées, même pipeline que les icônes de jauges :

| Fichier | Prompt |
|---|---|
| `assets/ui/relic-excalibur.png` | `legendary sword Excalibur icon, upright silver blade, golden cross guard, small radiant glow, minimalist stained glass style, bold black lead outlines, flat muted jewel tones, centered on plain background` |
| `assets/ui/relic-fourreau.png` | `ornate magical scabbard icon, dark blue leather with silver runes, minimalist stained glass style, bold black lead outlines, flat muted jewel tones, centered on plain background` |

## P3 — Morts illustrées (9 vignettes, ~180 gén.)

Une vignette 128×128 sur l'écran « FIN DU RÈGNE » (à insérer dans une arche,
comme les portraits — petit changement dans `drawDead`). Nouveau suffixe scène
(`SCENE`) : `minimalist stained glass window scene, flat design, large simple
flat panes of muted colored glass, bold thick black lead outlines, hieratic
stylized figures, no facial details, deep muted jewel tones, edge to edge full
bleed, no grey border, glass fills entire canvas`.

| Fichier | Mort (config.js) | Prompt (+ `, ${SCENE}`) |
|---|---|---|
| `mort-foi-vide.png` | Excommunié, seul | `lone king kneeling before closed cathedral doors, snuffed candles, cold grey and faded amber glass` |
| `mort-foi-pleine.png` | Bûcher de l'Inquisition | `king silhouette at the stake amid stylized triangular flames, hooded figures, amber and crimson glass` |
| `mort-magie-vide.png` | La magie s'éteint | `withered king on his throne, dead bare tree, grey moon, drained pale violet and ash grey glass` |
| `mort-magie-pleine.png` | Emporté par Avalon | `king drawn into a swirling fae mist by slender hands, violet and emerald green glass` |
| `mort-chevalerie-vide.png` | Les Saxons déferlent | `broken round table, scattered swords, dragon-prowed ships on the horizon, steel blue and rust glass` |
| `mort-chevalerie-pleine.png` | Le champion usurpe | `kneeling king facing a towering knight holding a raised sword, cold blue and gold glass` |
| `mort-couronne-vide.png` | Les barons se soulèvent | `crown rolling in the mud below jeering banners and pikes, dark red and brown glass` |
| `mort-couronne-pleine.png` | Le tyran renversé | `toppled throne and torn purple banner, crowd of raised fists in silhouette, purple and fire orange glass` |
| `mort-camlann.png` | Le fer de Mordred (combat) | `two swords crossed through a broken crown on a battlefield of fallen banners at dusk, blood red and iron grey glass` |

## P4 — Plaques par famille de carte (3 × ~40-60 gén.)

Décliner `assets/ui/card-plate.png` (« plate-verriere », 352×480) — reprendre
son prompt d'origine (`assets/gen/card-frame/`) en variant matière et couleur :

| Fichier | Famille | Variation de prompt |
|---|---|---|
| `card-plate-arc.png` | Beats d'arc / quêtes (`unique: true`) | dominante **violet et or**, `richer golden tracery, small grail motif at the top` |
| `card-plate-duel.png` | Manœuvres de combat | dominante **rouge sang et acier**, `crossed swords motif at the top, sharper angular lead lines` |
| `card-plate-avalon.png` | Ère d'Avalon (épilogue) | dominante **argent et brume**, `silver mist tones, apple branch motif at the top` |

Branchement : `engine/assets.js` (`cardPlate(famille)`) + `render/card.js` et
`render/combat.js` choisissent la plaque. La verrière actuelle reste le défaut.

## P5 — Dynastie : les rois débloquables (2 × ~20 gén.)

Le sélecteur du menu est textuel ; deux portraits manquent (Arthur = `roi.png`
de P1, Morgane existe déjà) :

| Fichier | Roi | Prompt (+ `, ${MBASE}`) |
|---|---|---|
| `uther.png` | UTHER le Conquérant | `war king Uther Pendragon, black dragon helm crest, dark steel armor, red war cloak, grim scarred face, no halo, background of plain dark steel and blood red glass panes` |
| `constantin.png` | CONSTANTIN le Pieux | `pious young king, simple gold circlet, white and gold robes over mail, clasped hands with rosary, soft golden halo behind the head, background of plain ivory and amber glass panes` |

## P6 — Nice-to-have (si quota généreux)

- **Rosace de titre** (menu, au-dessus de LOGRES) : `circular gothic rose
  window, radial stained glass tracery, sword and crown motif at the center`,
  256×256 détouré.
- **Écu de blason** 64×64 (remplacerait les écus canvas des duels — seulement
  si on veut plus de matière que le dessin actuel).
- **Portraits de figures futures** si la passe de contenu 2 rouvre le roster :
  Roi Pêcheur (`wounded fisher king on a barge throne, holding a fishing rod,
  soft golden halo`), Viviane distincte de la Dame du Lac, etc. — à ne générer
  qu'avec les cartes qui les font parler.

---

## Ordre de tir suggéré

| Lot | Coût estimé | Quand |
|---|---|---|
| P0 yeux (3 portraits) | ~60 | **Tirable sur le solde actuel (290)** — prioritaire, ça se voit à chaque partie |
| P1 combat (3 portraits) | ~60-80 | Tirable sur le solde actuel |
| P2 reliques (2 icônes) | ~20-40 | Juste — à arbitrer avec la marge QA |
| P3 morts (9 scènes) | ~180 | Prochain quota (le suffixe SCÈNE est nouveau : tester 1 vignette d'abord) |
| P4 plaques (3) | ~120-180 | Prochain quota |
| P5 dynastie (2) | ~40 | Prochain quota |
| P6 | — | Opportuniste |

**Total pour tout : ~480-580 générations.** P0+P1 (~120-140) passent sur le
solde actuel en gardant une marge d'échecs/regénérations QA (yeux, pose) ;
P2 si la marge le permet.
