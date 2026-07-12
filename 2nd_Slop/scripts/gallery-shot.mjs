// Galerie de revue des candidats de portraits : construit gallery-proof.html
// (une ligne par personnage, 4 candidats côte à côte) puis la capture en
// tranches PNG dans %TEMP%. Usage : node scripts/gallery-shot.mjs [dossier]
import { readdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const DIR = process.argv[2] ?? 'assets/gen/portraits-color';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.TEMP ?? '/tmp';

const byChar = new Map();
for (const f of readdirSync(DIR).filter((f) => f.endsWith('.png'))) {
  const name = f.replace(/-\d+\.png$/, '');
  if (!byChar.has(name)) byChar.set(name, []);
  byChar.get(name).push(f);
}

const rows = [...byChar.keys()].sort().map((name) => {
  const imgs = byChar.get(name).sort().map((f) =>
    `<figure><img src="/${DIR}/${f}"><figcaption>${f.match(/-(\d+)\.png$/)[1]}</figcaption></figure>`).join('');
  return `<section><h2>${name}</h2><div>${imgs}</div></section>`;
}).join('\n');

writeFileSync('gallery-proof.html', `<!doctype html><html><head><meta charset="utf-8">
<style>
body{background:#14111c;color:#e8dcc4;font:14px serif;margin:8px}
section{display:flex;align-items:center;gap:10px;margin-bottom:6px}
h2{width:110px;margin:0;font-size:15px;color:#c9a227;text-align:right}
div{display:flex;gap:8px;flex-wrap:wrap;max-width:850px}
figure{margin:0;text-align:center}
img{width:96px;height:96px;image-rendering:pixelated;display:block}
figcaption{font-size:11px;color:#888}
</style></head><body>${rows}<script>document.title='ready'</script></body></html>`);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1020, height: 800 });
await page.goto('http://localhost:5173/gallery-proof.html', { waitUntil: 'networkidle0' });
await page.waitForFunction("document.title === 'ready'");
const total = await page.evaluate(() => document.body.scrollHeight);
let n = 0;
for (let y = 0; y < total; y += 780) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: `${OUT}/gallery-${n++}.png` });
}
await browser.close();
console.log(`OK: ${n} tranches (${byChar.size} personnages) dans ${OUT}`);
