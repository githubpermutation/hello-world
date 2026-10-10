// Smoke test of the built player. node tools/playtest.mjs out.png [url]
// default url: the built file opened straight from disk (file://), as a user would.
import { chromium } from 'playwright';
import path from 'path';
const url = (process.argv[3] ?? 'file://' + path.resolve(new URL('../dist/index.html', import.meta.url).pathname)) + '?t=60';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url);
await p.waitForTimeout(25000);
await p.click('#start');
await p.waitForTimeout(8000);
const t = await p.evaluate(() => document.getElementById('song').currentTime);
await p.screenshot({ path: process.argv[2] });
console.log('audio time after play', t, 'errors', errs);
await b.close();
