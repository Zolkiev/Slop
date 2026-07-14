// Capture de vérification de l'UX : overlay de code (menu), panneau pause,
// curseur de volume. Usage : node scripts/ux-shot.mjs (dev server sur 5173)
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.TEMP ?? '/tmp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 480, height: 800 });
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
await sleep(1200);

// L'échelle CSS du canvas suit la fenêtre : ici 800/800 = 1, coordonnées directes.

// 1. overlay de code depuis le menu (tap sur la zone du code en bas)
await page.mouse.click(240, 760);
await sleep(400);
await page.keyboard.type('LG1-ZZZ'); // code invalide -> message d'erreur
await page.keyboard.press('Enter');
await sleep(300);
await page.screenshot({ path: `${OUT}/logres-ux-code.png` });
await page.keyboard.press('Escape');
await sleep(300);

// 1bis. panneau SONS depuis le menu principal (bouton ♪ en bas à droite)
await page.mouse.click(451, 765);
await sleep(400);
await page.screenshot({ path: `${OUT}/logres-ux-sons.png` });
await page.keyboard.press('Escape');
await sleep(300);

// 2. panneau pause en jeu
await page.keyboard.press('Enter'); // menu -> règne
await sleep(800);
await page.mouse.click(451, 765); // bouton pause (coin bas droit)
await sleep(400);
await page.screenshot({ path: `${OUT}/logres-ux-pause.png` });

// 3. curseur musique tiré vers la gauche
await page.mouse.move(110 + 260 * 0.35, 327);
await page.mouse.down();
await page.mouse.move(110 + 260 * 0.1, 327, { steps: 5 });
await page.mouse.up();
await sleep(300);
await page.screenshot({ path: `${OUT}/logres-ux-slider.png` });

await browser.close();
console.log('OK, captures dans', OUT);
