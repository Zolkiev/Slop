// Recolor d'un cadre de carte (verrière) vers la teinte d'un domaine — 0 crédit.
// Préserve le plomb sombre et les filets d'or ; tire les verres vers la teinte
// du domaine en gardant la structure clair/foncé (le tracery reste lisible).
// Usage : node scripts/recolor-plate.mjs --domain couronne [--in assets/ui/card-plate.png]
import { PNG } from '../../.claude/tools/node_modules/pngjs/lib/png.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i >= 0 ? process.argv[i + 1] : d;
};

// Teinte cible (H en degrés) par domaine. `sat` : 'vif' (verres saturés) ou
// 'muet' (pierre désaturée, pour le peuple — le distingue du Foi doré).
const DOMAINS = {
  foi: { h: 44, sat: 'vif' },          // ambre / or
  magie: { h: 282, sat: 'vif' },       // violet mystique
  chevalerie: { h: 215, sat: 'vif' },  // bleu-acier
  couronne: { h: 330, sat: 'vif' },    // pourpre / cramoisi
  peuple: { h: 30, sat: 'muet' },      // terre / pierre (muet)
};

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  const d = max - min;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hue2rgb(p, q, t) {
  if (t < 0) t += 1; if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

const domain = arg('domain', 'couronne');
const spec = DOMAINS[domain];
if (spec == null) { console.error('domaine inconnu:', domain); process.exit(2); }
const targetH = spec.h;
const inPath = arg('in', 'assets/ui/card-plate.png');
const png = PNG.sync.read(readFileSync(inPath));

for (let i = 0; i < png.data.length; i += 4) {
  const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2], a = png.data[i + 3];
  if (a === 0) continue;
  const [h, s, l] = rgbToHsl(r, g, b);
  if (l < 0.16) continue;                                   // plomb sombre : garder
  if (h >= 35 && h <= 60 && s > 0.35 && l > 0.35) continue; // or : garder les filets
  // verre : teinte du domaine, structure clair/foncé préservée.
  // 'vif' = verres saturés ; 'muet' = pierre désaturée (peuple).
  const ns = spec.sat === 'muet' ? Math.min(s * 0.5, 0.28) : Math.max(s, 0.5);
  const [nr, ng, nb] = hslToRgb(targetH, ns, l);
  png.data[i] = nr; png.data[i + 1] = ng; png.data[i + 2] = nb;
}

mkdirSync('assets/gen/plates', { recursive: true });
const out = `assets/gen/plates/plate-${domain}-recolor.png`;
writeFileSync(out, PNG.sync.write(png));
console.log('écrit', out, `(teinte ${domain} = ${targetH}°)`);
