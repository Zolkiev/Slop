// Vérif visuelle : tuto au 1er règne, CONTINUER, feedback roi verrouillé.
// Prérequis : `npm run dev` tourne sur http://localhost:5173.
// Usage : node scripts/onboarding-smoke.mjs
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.TEMP ?? '.';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 800, deviceScaleFactor: 2 });

// localStorage vierge → tuto doit apparaître
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1400);
await page.screenshot({ path: `${OUT}/onb-menu.png` });

await page.keyboard.press('Enter'); // premier règne
await sleep(900);
await page.screenshot({ path: `${OUT}/onb-tuto-1.png` }); // bulle 1 (carte)
await page.keyboard.press('ArrowRight');
await sleep(1000);
await page.screenshot({ path: `${OUT}/onb-tuto-3.png` }); // bulle 3 après 1er choix

// quitte au menu (Échap = pause) puis vérifie CONTINUER au retour
await page.keyboard.press('Escape');
await sleep(400);
await page.screenshot({ path: `${OUT}/onb-pause.png` });
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1200);
await page.screenshot({ path: `${OUT}/onb-continue.png` }); // menu doit montrer CONTINUER

await browser.close();
console.log('OK — captures onb-*.png dans', OUT);
