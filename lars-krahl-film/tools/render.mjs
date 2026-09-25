// Offline renderer: drives dist/index.html in headless Chromium, captures every
// frame deterministically and muxes it with the JS-rendered soundtrack.
//
//   node tools/render.mjs                      -> dist/lars-krahl.mp4 (1080p30)
//   node tools/render.mjs --fps 60 --workers 4
//   node tools/render.mjs --preview 1.5,6,12   -> .frames/preview/*.png
//   node tools/render.mjs --audio-only         -> dist/soundtrack.wav
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const FPS = +arg('fps', 30), WORKERS = +arg('workers', 4), MB = +arg('mb', 16);
const exe = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const url = 'file://' + path.join(root, 'dist/index.html') + '?export';
const FRAMES = path.join(root, '.frames');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';

const browser = await chromium.launch({ executablePath: exe, args: ['--disable-gpu', '--disable-accelerated-2d-canvas', '--autoplay-policy=no-user-gesture-required'] });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(url);
  await page.evaluate(async () => { await FILM.init(); window.__cv = document.getElementById('film'); window.__cx = __cv.getContext('2d'); });
  return page;
}
const grab = (page, t, mb) => page.evaluate(([t, mb]) => { FILM.frame(__cx, t, mb); return __cv.toDataURL('image/png').split(',')[1]; }, [t, mb]);

const preview = arg('preview');
if (preview) {
  const dir = path.join(FRAMES, 'preview'); fs.mkdirSync(dir, { recursive: true });
  const page = await openPage();
  for (const t of String(preview).split(',').map(Number)) {
    const t0 = Date.now(); const b = await grab(page, t, MB);
    const f = path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`); fs.writeFileSync(f, Buffer.from(b, 'base64'));
    console.log(f, Date.now() - t0, 'ms');
  }
  await browser.close(); process.exit(0);
}

// ---- soundtrack ----
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const wavPath = path.join(root, 'dist/soundtrack.wav');
{
  const page = await openPage();
  const t0 = Date.now();
  const b64 = await page.evaluate(() => FILM.wavBase64());
  fs.writeFileSync(wavPath, Buffer.from(b64, 'base64'));
  console.log('soundtrack', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await page.close();
}
if (arg('audio-only')) { await browser.close(); process.exit(0); }

// ---- frames ----
const duration = await (async () => { const p = await browser.newPage(); await p.goto(url); const d = await p.evaluate(() => FILM.duration); await p.close(); return d; })();
const total = Math.ceil(duration * FPS);
const dir = path.join(FRAMES, `f${FPS}`); fs.mkdirSync(dir, { recursive: true });
let next = 0, done = 0; const t0 = Date.now();
await Promise.all(Array.from({ length: WORKERS }, async () => {
  const page = await openPage();
  while (next < total) {
    const i = next++; const f = path.join(dir, `${String(i).padStart(5, '0')}.png`);
    if (fs.existsSync(f) && !arg('force')) { done++; continue; }
    fs.writeFileSync(f, Buffer.from(await grab(page, i / FPS, MB), 'base64'));
    if (++done % 50 === 0) console.log(`${done}/${total} frames, ${((Date.now() - t0) / done).toFixed(0)} ms/frame`);
  }
  await page.close();
}));
await browser.close();

const out = path.join(root, arg('out', 'dist/lars-krahl.mp4'));
const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%05d.png'), '-i', wavPath,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-tune', 'animation', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '256k', '-shortest', out], { stdio: 'inherit' });
if (r.status) process.exit(r.status);
console.log('wrote', out);
