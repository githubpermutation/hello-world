// Contact sheet: render the middle (or given fraction) of every shot.
// node tools/sheet.mjs out_dir [fraction] [fromShot] [toShot]
import { chromium } from 'playwright';
import fs from 'fs';
const [out, frac = '0.5', from = '0', to = '999', list = ''] = process.argv.slice(2);
const only = list ? list.split(',').map(Number) : null;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text().slice(0, 300)); });
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto('http://localhost:8123/after-three/src/index.html?render=1');
await p.waitForFunction('window.ready', null, { timeout: 60000 });
const shots = await p.evaluate(() => window.__engine.shots.map((s) => [s.t0, s.t1]));
for (let i = +from; i < Math.min(shots.length, +to); i++) {
  if (only && !only.includes(i)) continue;
  const [a, z] = shots[i]; const t = a + (z - a) * +frac;
  const t0 = Date.now();
  const url = await p.evaluate((t) => { window.renderFrame(t); return document.getElementById('film').toDataURL('image/jpeg', 0.88); }, t);
  fs.writeFileSync(`${out}/s${String(i).padStart(2, '0')}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(i, t.toFixed(2), Date.now() - t0, 'ms');
}
await b.close();
