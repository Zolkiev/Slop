#!/usr/bin/env bash
# Génération PixelLab des assets de Logres : 26 portraits + 5 décors d'ère.
# Portraits 128x128 transparents (4 candidats par job) -> assets/gen/portraits/
# Décors 384x640 opaques (1 candidat) -> assets/gen/bg/
# Style commun imposé par suffixe de prompt (pas de commande style dans l'API client).
set -uo pipefail
cd "$(dirname "$0")/.."

PSTYLE="arthurian legend dark fantasy pixel art, bust portrait, head and shoulders facing viewer, muted medieval color palette, detailed pixel shading, subtle dark outline"
BSTYLE="arthurian dark fantasy pixel art scene, muted medieval palette, no people, no characters, no figures, edge to edge full bleed composition, no white border, no frame, no padding, fills entire canvas seamlessly"

portrait() { # $1=name  $2=description
  echo "=== PORTRAIT: $1"
  node scripts/pixellab.mjs generate \
    --description "$2, $PSTYLE" \
    --size 128x128 --no-bg true --seed 77 \
    --out-dir assets/gen/portraits --name "$1" || echo "!!! ECHEC: $1"
}

background() { # $1=name  $2=description
  echo "=== DECOR: $1"
  node scripts/pixellab.mjs generate \
    --description "$2, $BSTYLE" \
    --size 384x640 --no-bg false --seed 77 \
    --out-dir assets/gen/bg --name "$1" || echo "!!! ECHEC: $1"
}

# ---- Personnages majeurs ----
portrait merlin      "wise old wizard Merlin, very long white beard, deep blue hooded robe with faint golden stars, piercing pale eyes, gnarled wooden staff tip visible"
portrait morgane     "beautiful scheming sorceress Morgana, long raven black hair, dark emerald gown, thin silver circlet, sly knowing smile, faint green magic glow"
portrait eveque      "stern medieval bishop, white and gold mitre, rich crimson vestments, golden cross pendant, severe disapproving face"
portrait keu         "grumpy middle aged seneschal knight Sir Kay, short brown hair, thick mustache, red tunic over chainmail, ring of iron keys on shoulder"
portrait gauvain     "proud young knight Sir Gawain, blond hair, green and gold surcoat with golden sun emblem, confident smirk"
portrait lancelot    "handsome noble knight Sir Lancelot, long brown hair, polished silver armor, deep blue surcoat, melancholic gaze"
portrait guenievre   "elegant queen Guinevere, delicate golden crown, long auburn hair, white and gold gown, composed serene face"
portrait perceval    "naive eager young knight Percival, messy red-brown hair, freckles, simple red surcoat, wide hopeful eyes"
portrait mordred     "menacing pale young man Mordred, jet black hair, black armor with dark iron crown, cold contemptuous stare"
portrait dame-lac    "ethereal Lady of the Lake, flowing silver-blue hair like water, translucent veil, soft blue glow, calm otherworldly face"
portrait galaad      "pure young knight Sir Galahad, white and silver armor, golden light halo behind head, serene blond youth"
portrait bedivere    "loyal veteran knight Sir Bedivere, grey beard, scarred face, battered dented silver armor, sad faithful eyes"
portrait roi-lot     "rival king Lot of Orkney, black fur mantle over dark red tunic, crude iron crown, thick dark beard, hostile glare"

# ---- Figures récurrentes du royaume ----
portrait baron       "fat scheming medieval baron, rich purple velvet doublet, heavy gold chains, smug jowly face"
portrait paysan      "weathered medieval peasant man, straw colored hair, patched brown hood, tired hollow cheeks, pleading eyes"
portrait barde       "flamboyant medieval bard, teal feathered cap, bright yellow and teal doublet, lute neck visible, theatrical grin"
portrait marchand    "shifty medieval merchant, green hooded robe, gold rings on fingers, small scales pendant, greedy smile"
portrait moine       "humble tonsured monk, plain brown wool robe, rope belt, meek downcast eyes, round soft face"
portrait ermite      "wild old hermit, long tangled grey hair and beard, ragged patched robes, intense burning eyes"
portrait fee         "small fae woman, pointed ears, iridescent dragonfly wings, pale green skin glow, mischievous ancient eyes"
portrait saxon       "saxon warrior emissary, blond braided hair and beard, grey fur cloak over iron scale armor, bone talisman necklace"
portrait heraut      "royal herald, bright tabard with red dragon of Pendragon emblem, brass trumpet on shoulder, alert formal posture"
portrait ecuyer      "young medieval squire boy, brown bowl haircut, padded beige gambeson, nervous earnest expression"
portrait pelerin     "medieval pilgrim, wide brimmed grey hat with scallop shell badge, dusty travel cloak, wooden staff, weary hopeful face"
portrait conseiller  "old royal advisor, long grey beard, dark scholarly robes with silver trim, rolled parchment in hand, cautious eyes"
portrait chevalier   "anonymous knight of the round table, closed steel great helm with narrow visor slit, grey steel armor, red plume"

# ---- Décors des 5 ères ----
background roche   "megalithic stone circle on a misty hill at blue dusk, a sword embedded in an anvil on a stone, distant dark castle silhouette, cold blue night atmosphere"
background camelot "golden castle of Camelot at sunrise, tall white towers with red and gold banners, warm golden light, prosperous green valley below"
background graal   "holy misty forest, god rays of white light through tall dark trees, faint golden chalice glow floating in the far mist, ethereal sacred atmosphere"
background chute   "burning battlefield at dark red dusk, black ravens in a blood red sky, ruined castle silhouette, broken spears in scorched earth, ash falling"
background avalon  "mystical lake isle in thick fog, a lone black barge on still dark water, violet twilight, silhouettes of apple trees on the isle, otherworldly calm"

echo "=== TERMINE ==="
