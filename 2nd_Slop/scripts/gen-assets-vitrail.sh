#!/usr/bin/env bash
# Batch vitrail minimaliste (DA + système couleur validés 2026-07-12).
# Fond de verre identitaire par personnage (aligné jauges : Foi=or, Magie=violet/vert,
# Chevalerie=bleu/acier, Couronne=rouge/pourpre, peuple=tons terre) ; halo réservé
# au sacré/surnaturel (évêque, moine, galaad, dame-lac).
# Déjà faits (assets/gen/portraits-color/) : merlin, moine, mordred, paysan.
# Portraits 128x128 (4 candidats/job, ~20 générations) -> assets/gen/portraits-color/
# Décors 384x640 (1 candidat, ~40-60 générations)      -> assets/gen/bg/
# En cas de 503 au poll : node scripts/pixellab.mjs poll --job <id> récupère sans re-payer.
set -uo pipefail
cd "$(dirname "$0")/.."

MBASE="minimalist stained glass window portrait, flat design, large simple flat panes of muted colored glass, bold thick black lead outlines, simple geometric stylized face, narrow black slit eyes, no facial shading, very few details, deep muted jewel tones, hieratic bust facing viewer, edge to edge full bleed, no grey border, glass fills entire canvas"
BSTYLE="arthurian dark fantasy pixel art scene, muted medieval palette, no people, no characters, no figures, edge to edge full bleed composition, no white border, no frame, no padding, fills entire canvas seamlessly"

portrait() { # $1=name  $2=description (inclut fond + halo éventuel)
  echo "=== PORTRAIT: $1"
  node scripts/pixellab.mjs generate \
    --description "$2, $MBASE" \
    --size 128x128 --no-bg false --seed 78 \
    --out-dir assets/gen/portraits-color --name "$1" || echo "!!! ECHEC: $1"
}

background() { # $1=name  $2=description
  echo "=== DECOR: $1"
  node scripts/pixellab.mjs generate \
    --description "$2, $BSTYLE" \
    --size 384x640 --no-bg false --seed 77 \
    --out-dir assets/gen/bg --name "$1" || echo "!!! ECHEC: $1"
}

# ---- Foi (ambre/or, halo pour le sacré) ----
portrait eveque     "stern bishop with warm tan skin, tall white and gold mitre, crimson vestments, golden cross pendant, soft golden halo behind the head, background of plain amber and purple glass panes"
portrait galaad     "pure young knight Galahad, white and silver armor, blond hair, radiant golden halo behind the head, background of plain white and gold glass panes"
portrait pelerin    "pilgrim, wide brimmed grey hat with scallop shell badge, dusty cloak, wooden staff, no halo, background of plain dusty ochre glass panes"
portrait ermite     "wild old hermit, tangled grey hair and beard, ragged robes, intense burning eyes, no halo, background of plain dark moss green glass panes"

# ---- Magie (violet/vert, halo argenté pour la Dame du Lac seulement) ----
portrait morgane    "sorceress Morgana, long black hair, dark green gown, thin silver circlet, no halo, background of plain deep emerald green glass panes"
portrait fee        "small fae woman, pointed ears, iridescent wings, no halo, background of plain pale iridescent green glass panes"
portrait dame-lac   "Lady of the Lake, flowing silver-blue hair, translucent veil, soft silver halo behind the head, background of plain icy blue and silver glass panes"

# ---- Chevalerie (bleus/aciers, sans halo) ----
portrait lancelot   "noble knight Lancelot, long brown hair, silver armor, deep blue surcoat, no halo, background of plain deep blue glass panes"
portrait gauvain    "proud young knight Gawain, blond hair, green and gold surcoat, large heraldic golden sun disc in the background, background of green and gold glass panes"
portrait perceval   "naive young knight Percival, messy red-brown hair, freckles, simple red surcoat, no halo, background of plain terracotta red glass panes"
portrait bedivere   "veteran knight Bedivere, grey beard, scarred face, battered silver armor, no halo, background of plain steel grey blue glass panes"
portrait keu        "grumpy seneschal knight Kay, brown hair, thick mustache, red tunic over chainmail, no halo, background of plain brick red glass panes"
portrait chevalier  "anonymous knight, closed steel great helm with narrow visor slit, grey armor, red plume, no halo, background of plain neutral steel grey glass panes"
portrait ecuyer     "young squire boy, brown bowl haircut, padded beige gambeson, no halo, background of plain pale beige glass panes"

# ---- Couronne (rouges/pourpres/or, sans halo) ----
portrait guenievre  "elegant queen Guinevere, golden crown, long auburn hair, white and gold gown, no halo, background of plain white and gold glass panes"
portrait roi-lot    "rival king Lot, black fur mantle, dark red tunic, crude iron crown, dark beard, no halo, background of plain dark red glass panes"
portrait baron      "fat scheming baron, purple velvet doublet, heavy gold chains, smug face, no halo, background of plain rich purple glass panes"
portrait conseiller "old royal advisor, long grey beard, dark scholarly robes, rolled parchment, no halo, background of plain ink grey violet glass panes"
portrait heraut     "royal herald, bright tabard with red dragon emblem, brass trumpet, no halo, background of plain red and gold glass panes"

# ---- Peuple & étrangers (tons terre/froids, sans halo) ----
portrait marchand   "shifty merchant, green hooded robe, gold rings, small scales pendant, no halo, background of plain copper green glass panes"
portrait barde      "flamboyant bard, teal feathered cap, yellow and teal doublet, lute, no halo, background of plain teal and yellow glass panes"
portrait saxon      "saxon warrior, blond braided hair and beard, grey fur cloak, iron scale armor, no halo, background of plain cold frost grey blue glass panes"

# ---- Décors des 5 ères ----
background roche   "megalithic stone circle on a misty hill at blue dusk, a sword embedded in an anvil on a stone, distant dark castle silhouette, cold blue night atmosphere"
background camelot "golden castle of Camelot at sunrise, tall white towers with red and gold banners, warm golden light, prosperous green valley below"
background graal   "holy misty forest, god rays of white light through tall dark trees, faint golden chalice glow floating in the far mist, ethereal sacred atmosphere"
background chute   "burning battlefield at dark red dusk, black ravens in a blood red sky, ruined castle silhouette, broken spears in scorched earth, ash falling"
background avalon  "mystical lake isle in thick fog, a lone black barge on still dark water, violet twilight, silhouettes of apple trees on the isle, otherworldly calm"

echo "=== TERMINE ==="
