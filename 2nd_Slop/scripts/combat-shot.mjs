// Capture de vérification des duels : force une épreuve via #combat=<id>,
// photographie la scène au repos, à mi-geste (aperçu des blasons) et après
// un swipe. Usage : node scripts/combat-shot.mjs [id] (dev server sur 5173)
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.TEMP ?? '/tmp';
const id = process.argv[2] ?? 'camlann';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 800 });
await page.goto(`http://localhost:5173/#combat=${id}`, { waitUntil: 'networkidle0' });
await sleep(1200);

await page.keyboard.press('Enter'); // menu -> règne (le duel s'ouvre aussitôt)
await sleep(800);
await page.screenshot({ path: `${OUT}/logres-combat-repos.png` });

// mi-geste : l'aperçu des blasons s'illumine
const cx = 240;
const cy = 480;
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let s = 1; s <= 6; s++) await page.mouse.move(cx + (58 * s) / 6, cy);
await sleep(450);
await page.screenshot({ path: `${OUT}/logres-combat-drag.png` });
for (let s = 1; s <= 3; s++) await page.mouse.move(cx + 58 + (40 * s) / 3, cy);
await page.mouse.up(); // au-delà du seuil : la manœuvre part en poussière
await sleep(400);
await page.screenshot({ path: `${OUT}/logres-combat-shatter.png` });
await sleep(700);
await page.screenshot({ path: `${OUT}/logres-combat-manche2.png` });

await browser.close();
console.log('OK, captures dans', OUT);
