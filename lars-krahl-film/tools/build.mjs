// Bundles src/*.js + assets/ into one self-contained HTML file: dist/index.html
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = ['core', 'timeline', 'characters', 'scenes1', 'scenes2', 'scenes3', 'render', 'audio', 'main'];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const assets = {};
for (const f of walk(path.join(root, 'assets'))) {
  const rel = path.relative(path.join(root, 'assets'), f).split(path.sep).join('/');
  if (rel.startsWith('vendor/') || rel.endsWith('.json')) continue;
  assets[rel] = fs.readFileSync(f).toString('base64');
}
const js = SRC.filter(n => fs.existsSync(path.join(root, 'src', n + '.js')))
  .map(n => `// ---- ${n}.js ----\n` + fs.readFileSync(path.join(root, 'src', n + '.js'), 'utf8')).join('\n');
const rough = fs.readFileSync(path.join(root, 'assets/vendor/rough.js'), 'utf8');
const scripts = [
  `<script>/* rough.js (MIT) */\n${rough}</script>`,
  `<script>window.ASSETS=${JSON.stringify(assets)};</script>`,
  `<script>\n${js}\n</script>`,
].join('\n');
const html = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8').replace('<!--__SCRIPTS__-->', () => scripts);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
console.log('dist/index.html', (html.length / 1e6).toFixed(2), 'MB,', Object.keys(assets).length, 'assets');
