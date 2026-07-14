// Capture de vérification du drag : maintient la carte à mi-geste (gauche
// puis droite) et photographie l'aperçu des jauges impactées.
// Usage : node scripts/drag-shot.mjs (dev server requis sur 5173)
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.TEMP ?? '/tmp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 860 });
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
await sleep(1200);

await page.keyboard.press('Enter'); // menu -> premier règne
await sleep(800);

const cx = 240;
const cy = 430;
for (const [name, dx] of [['left', -58], ['right', 58]]) {
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // glissement progressif pour laisser l'aperçu s'allumer
  for (let s = 1; s <= 6; s++) await page.mouse.move(cx + (dx * s) / 6, cy);
  await sleep(400);
  await page.screenshot({ path: `${OUT}/logres-drag-${name}.png` });
  await page.mouse.move(cx, cy); // retour au centre : pas de validation
  await page.mouse.up();
  await sleep(400);
}
await browser.close();
console.log('OK, captures dans', OUT);
