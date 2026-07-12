// Capture d'écran de vérification : démarre un règne et photographie
// quelques cartes successives (cadre vitrail). Usage : node scripts/smoke-shot.mjs
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.TEMP ?? '/tmp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 860 });
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
await sleep(1200); // préchargement portraits + première frame

await page.keyboard.press('Enter'); // menu -> premier règne
await sleep(800);
for (let i = 0; i < 14; i++) {
  await page.screenshot({ path: `${OUT}/logres-card-${i}.png` });
  await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
  await sleep(900); // envol + pioche
}
await browser.close();
console.log('OK, captures dans', OUT);
