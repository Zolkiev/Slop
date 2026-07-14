// Capture de vérification des lignées : restaure un save qui débloque tout,
// sélectionne un roi, lance un règne et photographie les premières cartes.
// Usage : node scripts/lineage-shot.mjs [indexRoi=3] (dev server sur 5173)
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.TEMP ?? '/tmp';
const kingIndex = Number(process.argv[2] ?? 3); // 3 = Morgane
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 800 });
// LG1-5QT = best 45 (tout débloqué), roi pré-sélectionné 3 (Morgane)
await page.goto('http://localhost:5173/#save=LG1-5QT', { waitUntil: 'networkidle0' });
await sleep(1200);

// aligner la sélection sur le roi voulu (le save la met déjà sur 3)
const delta = kingIndex - 3;
for (let i = 0; i < Math.abs(delta); i++) {
  await page.keyboard.press(delta > 0 ? 'ArrowRight' : 'ArrowLeft');
  await sleep(200);
}
await page.screenshot({ path: `${OUT}/logres-lineage-menu.png` });

await page.keyboard.press('Enter');
await sleep(800);
for (let i = 0; i < 6; i++) {
  await page.screenshot({ path: `${OUT}/logres-lineage-card-${i}.png` });
  await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
  await sleep(900);
}
await browser.close();
console.log('OK, captures dans', OUT);
