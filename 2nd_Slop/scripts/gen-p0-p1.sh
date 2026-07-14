#!/usr/bin/env bash
# Tir P0+P1 du backlog d'assets (docs/ASSETS-BACKLOG.md, validé Jael 2026-07-14).
# P0 : yeux de baron/gauvain/lancelot à réharmoniser (MBASE standard, pose
#      frontale forcée, SANS le renfort « slit eyes » qui les avait désalignés).
# P1 : visages du combat — le roi, le Chevalier Noir, le chef saxon.
# ~20 générations/job (4 candidats), budget total ~120. Solde avant tir : 290.
# En cas de 503 au poll : node scripts/pixellab.mjs poll --job <id> (payé une fois).
set -uo pipefail
cd "$(dirname "$0")/.."

MBASE="minimalist stained glass window portrait, flat design, large simple flat panes of muted colored glass, bold thick black lead outlines, simple geometric stylized face, narrow black slit eyes, no facial shading, very few details, deep muted jewel tones, hieratic bust facing viewer, edge to edge full bleed, no grey border, glass fills entire canvas"

portrait() { # $1=out-dir $2=name $3=description
  echo "=== PORTRAIT: $2"
  node scripts/pixellab.mjs generate \
    --description "$3, $MBASE" \
    --size 128x128 --no-bg false --seed 78 \
    --out-dir "$1" --name "$2" || echo "!!! ECHEC: $2"
}

# ---- P0 : réharmonisation des yeux ----
portrait assets/gen/portraits-qa2 baron    "fat scheming baron, purple velvet doublet, heavy gold chains, smug face, no halo, perfectly frontal symmetrical pose, background of plain rich purple glass panes"
portrait assets/gen/portraits-qa2 gauvain  "proud young knight Gawain, blond hair, green and gold surcoat, large heraldic golden sun disc in the background, perfectly frontal symmetrical pose, background of green and gold glass panes"
portrait assets/gen/portraits-qa2 lancelot "noble knight Lancelot, long brown hair, silver armor, deep blue surcoat, no halo, perfectly frontal symmetrical pose, background of plain deep blue glass panes"

# ---- P1 : les visages du combat ----
portrait assets/gen/portraits-combat roi            "king Arthur, noble bearded face, golden crown, regal red and gold mantle, no halo, perfectly frontal symmetrical pose, background of plain deep red and gold glass panes"
portrait assets/gen/portraits-combat chevalier-noir "ominous black knight, closed black great helm with narrow visor slit, black armor, dark violet plume, no halo, perfectly frontal symmetrical pose, background of plain charcoal and dark violet glass panes"
portrait assets/gen/portraits-combat chef-saxon     "fierce saxon warlord, wild blond braided hair and beard, bearskin cloak over iron scale armor, round painted war shield, no halo, perfectly frontal symmetrical pose, background of plain cold sea grey and rust glass panes"

echo "=== TERMINE"
node scripts/pixellab.mjs balance
