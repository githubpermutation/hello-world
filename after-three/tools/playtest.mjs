// Smoke test of the built player. node tools/playtest.mjs out.png [url]
// default url: the built file opened straight from disk (file://), as a user would.
import { chromium } from 'playwright';
import path from 'path';
const url = (process.argv[3] || 'file://' + path.resolve(new URL('../dist/index.html', import.meta.url).pathname)) + '?t=60&scale=' + (process.argv[4] ?? '1');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url);
const labels = new Set();
const t0 = Date.now();
while (Date.now() - t0 < 600000) { const l = await p.textContent('#start span'); labels.add(l.replace(/\d+%/, 'N%')); if (l === 'Play') break; await p.waitForTimeout(500); }
console.log('labels seen', [...labels], 'after', ((Date.now() - t0) / 1000).toFixed(0), 's');
await p.click('#start');
await p.waitForTimeout(8000);
await p.keyboard.press('Space');
const t = await p.evaluate(() => document.getElementById('song').currentTime);
await p.screenshot({ path: process.argv[2] });
console.log('audio time after play', t, 'errors', errs);
await b.close();
