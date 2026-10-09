// Copies three.module.js into src/vendor with one tweak for software rendering:
// the transmission (glass) pre-pass renders at half resolution without MSAA.
import fs from 'fs';
const src = new URL('../node_modules/three/build/three.module.js', import.meta.url);
let s = fs.readFileSync(src, 'utf8');
const a = 'transmissionRenderTarget.setSize( activeViewport.z, activeViewport.w );';
if (!s.includes(a)) throw new Error('patch point not found');
s = s.replace(a, 'transmissionRenderTarget.setSize( Math.ceil( activeViewport.z * 0.5 ), Math.ceil( activeViewport.w * 0.5 ) );');
s = s.replace(/(transmissionRenderTarget\[ camera\.id \] = new WebGLRenderTarget\( 1, 1, \{[\s\S]*?)samples: 4,/, '$1samples: 0,');
fs.mkdirSync(new URL('../src/vendor/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../src/vendor/three.module.js', import.meta.url), s);
console.log('patched three ->', 'src/vendor/three.module.js');
