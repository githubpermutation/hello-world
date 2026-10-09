// Builds dist/index.html: the player as one file (code and fonts inlined).
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
execFileSync('node', [path.join(root, 'tools/patch-three.mjs')], { stdio: 'inherit' });

const res = await build({
  entryPoints: [path.join(root, 'src/main.js')], bundle: true, minify: true, format: 'esm', write: false, target: 'es2020',
  alias: { three: path.join(root, 'src/vendor/three.module.js') },
  plugins: [{ name: 'addons', setup(b) { b.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: path.join(root, 'node_modules/three/examples/jsm', a.path.slice('three/addons/'.length)) })); } }],
});
const js = res.outputFiles[0].text;

const font = (f) => fs.readFileSync(path.join(root, 'node_modules/@fontsource', f)).toString('base64');
const faces = [
  ['Instrument Serif', 'normal', 400, 'instrument-serif/files/instrument-serif-latin-400-normal.woff2'],
  ['Instrument Serif', 'italic', 400, 'instrument-serif/files/instrument-serif-latin-400-italic.woff2'],
  ['Inter', 'normal', 300, 'inter/files/inter-latin-300-normal.woff2'],
  ['Inter', 'normal', 500, 'inter/files/inter-latin-500-normal.woff2'],
  ['Inter', 'normal', 600, 'inter/files/inter-latin-600-normal.woff2'],
].map(([fam, style, w, f]) => `@font-face{font-family:"${fam}";font-style:${style};font-weight:${w};src:url(data:font/woff2;base64,${font(f)}) format("woff2")}`).join('\n');

// audio: by default the page plays the song from the repo root, so the build
// stays small. --embed inlines it (AAC + Opus) for a single self-contained file.
let audioTag = '<audio id="song" src="../../After Three.m4a" preload="auto"></audio>';
if (process.argv.includes('--embed')) {
  const enc = (ext, args) => {
    const f = path.join(dist, 'after-three.' + ext);
    if (!fs.existsSync(f)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(root, '..', 'After Three.m4a'), '-map', '0:a', ...args, f]);
    return fs.readFileSync(f).toString('base64');
  };
  const aac = enc('m4a', ['-c:a', 'aac', '-b:a', '192k']);
  const opus = enc('ogg', ['-c:a', 'copy']);
  audioTag = `<audio id="song" preload="auto"><source type="audio/mp4; codecs=mp4a.40.2" src="data:audio/mp4;base64,${aac}"><source type="audio/ogg; codecs=opus" src="data:audio/ogg;base64,${opus}"></audio>`;
}

const css = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>After Three</title>
<style>${faces}\n${css}</style>
</head><body>
<div id="stage"><canvas id="film" width="1920" height="1080"></canvas></div>
${audioTag}
<div id="start"><h1>After Three</h1><span>Play</span><small>SPACE play/pause · ←/→ seek · F fullscreen</small></div>
<div id="ui"><div id="bar"><div><div id="fill"></div></div></div></div>
<script type="module">${js}</script>
</body></html>`;
fs.writeFileSync(path.join(dist, 'index.html'), html);
console.log('dist/index.html', (html.length / 1e6).toFixed(1), 'MB');
