// Render selected times to PNG: node tools/preview.mjs out_dir t1 t2 ...
import { chromium } from 'playwright';
import fs from 'fs';
const [out, ...times] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text().slice(0, 400)); });
p.on('requestfailed', (r) => console.log('reqfail', r.url())); p.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto('http://localhost:8123/after-three/src/index.html?render=1');
await p.waitForFunction('window.ready', null, { timeout: 60000 });
for (const t of times) {
  const t0 = Date.now();
  const url = await p.evaluate((t) => { window.renderFrame(t); window.renderFrame(t); return document.getElementById('film').toDataURL('image/jpeg', 0.9); }, +t);
  fs.writeFileSync(`${out}/t${(+t).toFixed(2).padStart(7, '0')}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('t', t, 'ms', Date.now() - t0);
}
await b.close();
