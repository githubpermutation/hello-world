// Render one time to a jpg with an optional JS snippet run before (to patch shots for experiments)
// node tools/frame.mjs out.jpg t "js snippet"
import { chromium } from 'playwright';
import fs from 'fs';
const [out, t, js = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || m.type() === 'log') console.log('console:', m.text().slice(0, 300)); });
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto('http://localhost:8123/after-three/src/index.html?render=1');
await p.waitForFunction('window.ready', null, { timeout: 60000 });
const url = await p.evaluate(async ([t, js]) => { if (js) await (0, eval)(js); window.renderFrame(t); return document.getElementById('film').toDataURL('image/jpeg', 0.9); }, [+t, js]);
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
await b.close();
