#!/usr/bin/env bash
# Correctifs QA portraits (remarques Jael 2026-07-12 soir) : baron, fee,
# lancelot, gauvain, keu — style minimaliste FORCÉ (pose frontale symétrique,
# yeux fentes noires explicites). Seed 79 pour se démarquer des lots ratés.
# Boucle de relance : ne regénère que les personnages sans candidats v2,
# jusqu'à 6 vagues espacées de 20 min (panne PixelLab « No space left on
# device » constatée ce soir — jobs non facturés, usd:0).
set -uo pipefail
cd "$(dirname "$0")/.."

MFORCE="minimalist stained glass window portrait, flat design like Reigns game art, perfectly frontal symmetrical pose facing the viewer directly, two narrow vertical solid black slit eyes clearly visible on the face, extremely simple geometric face, no facial shading, no texture detail, very few large flat panes of muted colored glass, bold thick black lead outlines, deep muted jewel tones, hieratic bust, edge to edge full bleed, no grey border, glass fills entire canvas"

declare -A DESC=(
  [baron-v2]="fat scheming baron, purple velvet doublet, heavy gold chain necklace, smug face, no halo, background of plain rich purple glass panes"
  [fee-v2]="small fae woman, pointed ears, iridescent wings, pale green glow, no halo, background of plain pale green glass panes"
  [lancelot-v2]="noble knight Lancelot, long brown hair, silver armor, deep blue surcoat, no halo, background of plain deep blue glass panes"
  [gauvain-v2]="proud young knight Gawain, blond hair, green and gold surcoat, golden heraldic sun disc in the top corner of the background, background of green and gold glass panes"
  [keu-v2]="grumpy seneschal knight Kay, short brown hair, thick mustache, plain red tunic, no halo, background of plain brick red glass panes"
)

for wave in 1 2 3 4 5 6; do
  missing=0
  for name in baron-v2 fee-v2 lancelot-v2 gauvain-v2 keu-v2; do
    if ls "assets/gen/portraits-color/$name-"*.png >/dev/null 2>&1; then continue; fi
    missing=1
    echo "=== VAGUE $wave: $name"
    node scripts/pixellab.mjs generate \
      --description "${DESC[$name]}, $MFORCE" \
      --size 128x128 --no-bg false --seed 79 \
      --out-dir assets/gen/portraits-color --name "$name" || echo "!!! ECHEC: $name"
    sleep 15
  done
  [ "$missing" -eq 0 ] && { echo "=== TOUT EST LA ==="; exit 0; }
  [ "$wave" -lt 6 ] && { echo "--- attente 20 min avant vague suivante ---"; sleep 1200; }
done
echo "=== FIN DES VAGUES (vérifier ce qui manque) ==="
