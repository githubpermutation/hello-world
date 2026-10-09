// Smoke test of the built player: loads dist/index.html, seeks, renders, screenshots.
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8123/after-three/dist/index.html?t=60');
await p.waitForTimeout(25000);
await p.screenshot({ path: process.argv[2] });
await p.click('#start');
await p.waitForTimeout(8000);
const t = await p.evaluate(() => document.getElementById('song').currentTime);
console.log('audio time after play', t, 'errors', errs);
await b.close();
