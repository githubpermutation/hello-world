// Offline renderer: renders frames headlessly and pipes them to ffmpeg.
// node tools/render.mjs --out file.mp4 [--fps 30] [--scale 1] [--from 0] [--to 165] [--frames dir] [--workers 1] [--part i/n]
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : a), []));
const fps = +(args.fps || 30), scale = +(args.scale || 1), from = +(args.from || 0), to = +(args.to || 165);
const W = Math.round(1920 * scale), H = Math.round(1080 * scale);
const frames = args.frames;
if (frames) fs.mkdirSync(frames, { recursive: true });
const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
let [pi, pn] = (args.part || '0/1').split('/').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on('pageerror', (e) => console.log('pageerror:', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 300)); });
await p.goto(`http://localhost:8123/after-three/src/index.html?render=1&scale=${scale}`);
await p.waitForFunction('window.ready', null, { timeout: 120000 });
await p.evaluate(() => window.warm());
let ff = null;
if (args.out) {
  ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', args.out], { stdio: ['pipe', 'inherit', 'inherit'] });
}
const t0 = Date.now(); let done = 0;
for (let n = n0; n < n1; n++) {
  if ((n - n0) % pn !== pi) continue;
  const t = n / fps;
  const url = await p.evaluate((t) => { window.renderFrame(t); return document.getElementById('film').toDataURL('image/jpeg', 0.95); }, t);
  const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  if (frames) fs.writeFileSync(`${frames}/f${String(n).padStart(5, '0')}.jpg`, buf);
  if (ff) { if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r)); }
  done++;
  if (done % 50 === 0) { const el = (Date.now() - t0) / 1000; console.log(`frame ${n} t=${t.toFixed(2)} ${(el / done).toFixed(2)}s/frame`); }
}
if (ff) { ff.stdin.end(); await new Promise((r) => ff.on('close', r)); }
await b.close();
console.log('done', done, 'frames in', ((Date.now() - t0) / 1000).toFixed(0), 's');
