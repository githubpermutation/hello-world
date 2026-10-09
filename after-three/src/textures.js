// Procedural textures painted on canvases at load time (no image files).
import * as THREE from 'three';
import { fbm2, noise2, mulberry32, clamp, lerp } from './util.js';

const cache = new Map();
function make(key, w, h, paint, { srgb = true, repeat = [1, 1], aniso = 8 } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  paint(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  cache.set(key, t);
  return t;
}
function pixels(ctx, w, h, fn) {
  const img = ctx.createImageData(w, h); const d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4; const c = fn(x, y);
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = c[3] ?? 255;
  }
  ctx.putImageData(img, 0, 0);
}
// tileable fbm by blending offsets
function tfbm(x, y, w, h, s, oct) {
  const u = x / w, v = y / h;
  const a = fbm2(x * s, y * s, oct), b = fbm2((x - w) * s, y * s, oct), c = fbm2(x * s, (y - h) * s, oct), d = fbm2((x - w) * s, (y - h) * s, oct);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

// --- Wood floor: long planks, warm oak, with matching roughness ---
function woodPlank(ctx, w, h, rough) {
  const rnd = mulberry32(7);
  const rows = 12, rowH = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * w * 0.6;
    while (x < w) {
      const len = w * (0.28 + rnd() * 0.42);
      const tone = 0.86 + rnd() * 0.24, hue = rnd(), seed = rnd() * 100;
      const img = ctx.createImageData(Math.ceil(len), Math.ceil(rowH));
      const d = img.data, W = img.width, H = img.height;
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
        const gy = yy / H;
        const warp = fbm2(xx * 0.004 + seed, gy * 1.5 + seed, 3) * 3.0;
        const streak = noise2(xx * 0.01 + seed, (gy + warp * 0.3) * 18.0);
        const fine = noise2(xx * 0.3 + seed, yy * 0.9);
        const figure = Math.pow(Math.abs(Math.sin((gy * 3.0 + warp) * 3.14)), 6.0);
        let v = (0.82 + 0.12 * streak + 0.06 * fine - 0.1 * figure) * tone;
        const edge = Math.min(yy, H - 1 - yy, xx, W - 1 - xx);
        const gap = edge < 1 ? 0.55 : edge < 2 ? 0.85 : 1;
        const o = (yy * W + xx) * 4;
        if (rough) { const rv = clamp(0.5 + 0.12 * (streak - 0.5) + 0.25 * figure + (edge < 2 ? 0.3 : 0)) * 255; d[o] = d[o + 1] = d[o + 2] = rv; }
        else { d[o] = (128 + hue * 12) * v * gap; d[o + 1] = (92 + hue * 6) * v * gap; d[o + 2] = (64 - hue * 6) * v * gap; }
        d[o + 3] = 255;
      }
      const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; tmp.getContext('2d').putImageData(img, 0, 0);
      ctx.drawImage(tmp, Math.round(x), Math.round(r * rowH));
      if (x + len > w) ctx.drawImage(tmp, Math.round(x - w), Math.round(r * rowH));
      x += len;
    }
  }
}
export const woodTex = (rep = [2, 2]) => make('wood' + rep, 1024, 1024, (c, w, h) => woodPlank(c, w, h, false), { repeat: rep });
export const woodRough = (rep = [2, 2]) => make('woodR' + rep, 1024, 1024, (c, w, h) => woodPlank(c, w, h, true), { srgb: false, repeat: rep });

// --- Painted plaster wall ---
export const plasterTex = (tint = [222, 214, 200], rep = [3, 3]) => make('plaster' + tint + rep, 512, 512, (c, w, h) => pixels(c, w, h, (x, y) => {
  const n = tfbm(x, y, w, h, 0.02, 5) * 0.6 + tfbm(x, y, w, h, 0.15, 3) * 0.4;
  const v = 0.9 + (n - 0.5) * 0.16;
  return [tint[0] * v, tint[1] * v, tint[2] * v];
}), { repeat: rep });
export const plasterBump = (rep = [3, 3]) => make('plasterB' + rep, 512, 512, (c, w, h) => pixels(c, w, h, (x, y) => {
  const n = tfbm(x, y, w, h, 0.08, 4); const v = n * 255; return [v, v, v];
}), { srgb: false, repeat: rep });

// --- Marble counter ---
export const marbleTex = (dark = false, rep = [1, 1]) => make('marble' + dark + rep, 1024, 1024, (c, w, h) => pixels(c, w, h, (x, y) => {
  const n = tfbm(x, y, w, h, 0.004, 6);
  const t = (x + y * 0.6) * 0.006 + n * 7.0;
  const vein = Math.pow(1 - Math.abs(Math.sin(t)), 18) * 0.8 + Math.pow(1 - Math.abs(Math.sin(t * 2.3 + 1.7)), 40) * 0.4;
  const cloud = tfbm(x, y, w, h, 0.01, 4);
  if (dark) {
    const b = 0.08 + cloud * 0.05; const v = b + vein * 0.35;
    return [v * 255, v * 250, v * 245];
  }
  const b = 0.86 + cloud * 0.08 - vein * 0.42;
  return [b * 245, b * 242, b * 236];
}), { repeat: rep });

// --- Woven fabric (couch, blanket) ---
export const fabricTex = (col = [80, 86, 98], rep = [6, 6]) => make('fabric' + col + rep, 256, 256, (c, w, h) => pixels(c, w, h, (x, y) => {
  const wx = Math.sin(x * Math.PI / 2) * 0.5 + 0.5, wy = Math.sin(y * Math.PI / 2) * 0.5 + 0.5;
  const weave = ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? wx : wy) * 0.18;
  const n = tfbm(x, y, w, h, 0.05, 3) * 0.2;
  const v = 0.8 + weave + n - 0.1;
  return [col[0] * v, col[1] * v, col[2] * v];
}), { repeat: rep });

// --- Leather ---
export const leatherTex = (col = [60, 34, 22]) => make('leather' + col, 512, 512, (c, w, h) => pixels(c, w, h, (x, y) => {
  const cell = noise2(x * 0.25, y * 0.25); const n = tfbm(x, y, w, h, 0.03, 4);
  const v = 0.75 + cell * 0.2 + (n - 0.5) * 0.4;
  return [col[0] * v, col[1] * v, col[2] * v];
}), { repeat: [1, 1] });

// --- Subway tiles (shower) ---
export const tileTex = (rep = [1, 1], green = false) => make('tile' + rep + green, 1024, 1024, (c, w, h) => {
  c.fillStyle = green ? '#1b2a24' : '#b9b4ac'; c.fillRect(0, 0, w, h);
  const tw = w / 4, th = h / 8;
  const rr = mulberry32(green ? 3 : 4);
  for (let r = 0; r < 8; r++) for (let i = -1; i < 5; i++) {
    const x = i * tw + (r % 2) * tw / 2, y = r * th;
    const g = c.createLinearGradient(x, y, x, y + th);
    if (green) { const k = 0.8 + rr() * 0.4; const col = (a) => `rgb(${(30 * a * k) | 0},${(58 * a * k) | 0},${(50 * a * k) | 0})`; g.addColorStop(0, col(1.25)); g.addColorStop(0.5, col(1.0)); g.addColorStop(1, col(0.8)); }
    else { g.addColorStop(0, '#f4f1ec'); g.addColorStop(0.5, '#ebe7e0'); g.addColorStop(1, '#dedad2'); }
    c.fillStyle = g; c.beginPath(); c.roundRect(x + 4, y + 4, tw - 8, th - 8, 10); c.fill();
  }
}, { repeat: rep });

// --- Clock face ---
export const clockFaceTex = () => make('clockface', 1024, 1024, (c, w, h) => {
  const cx = w / 2, cy = h / 2;
  c.fillStyle = '#efe9df'; c.fillRect(0, 0, w, h);
  const g = c.createRadialGradient(cx, cy * 0.8, 50, cx, cy, w * 0.55);
  g.addColorStop(0, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(120,110,95,0.25)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.translate(cx, cy);
  for (let i = 0; i < 60; i++) {
    c.save(); c.rotate(i * Math.PI / 30);
    c.fillStyle = '#1b1a18';
    if (i % 5 === 0) c.fillRect(-7, -470, 14, 70); else c.fillRect(-2.5, -470, 5, 26);
    c.restore();
  }
  c.fillStyle = '#1b1a18'; c.font = '120px "Instrument Serif"'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const [n, a] of [[12, 0], [3, 90], [6, 180], [9, 270]]) {
    const r = 330, ang = a * Math.PI / 180;
    c.fillText(String(n), Math.sin(ang) * r, -Math.cos(ang) * r + 8);
  }
  c.font = '500 26px Inter'; c.letterSpacing = '8px'; c.fillStyle = '#5a5650'; c.fillText('AFTER THREE', 0, 170);
}, { repeat: [1, 1] });

// --- Picture in frame: abstract print ---
export const printTex = () => make('print', 768, 1024, (c, w, h) => {
  c.fillStyle = '#e8e1d4'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#c4462f'; c.beginPath(); c.arc(w * 0.5, h * 0.42, w * 0.27, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#1f2a3a'; c.fillRect(w * 0.18, h * 0.62, w * 0.64, h * 0.05);
  c.fillStyle = '#d8a24a'; c.fillRect(w * 0.18, h * 0.69, w * 0.4, h * 0.02);
  c.fillStyle = '#2a2622'; c.font = 'italic 40px "Instrument Serif"'; c.textAlign = 'center'; c.fillText('three', w / 2, h * 0.86);
});

// --- Soft radial sprite (light glows, bokeh) ---
export const glowTex = () => make('glow', 128, 128, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
export const discTex = () => make('disc', 128, 128, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, w * 0.36, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.7, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
});

// --- Brushed metal roughness ---
export const brushedTex = () => make('brushed', 512, 64, (c, w, h) => pixels(c, w, h, (x, y) => {
  const v = (0.3 + noise2(x * 0.02, y * 3.1) * 0.25 + noise2(x * 0.3, y * 7.3) * 0.1) * 255; return [v, v, v];
}), { srgb: false, repeat: [1, 1] });

// --- Door paint (slight brush texture) ---
export const paintTex = (col = [40, 44, 48]) => make('paint' + col, 256, 512, (c, w, h) => pixels(c, w, h, (x, y) => {
  const v = 0.92 + noise2(x * 0.05, y * 0.9) * 0.08 + noise2(x * 0.5, y * 0.02) * 0.04;
  return [col[0] * v, col[1] * v, col[2] * v];
}));

// --- Floor scrape marks (alpha) ---
export const scrapeTex = () => make('scrape', 1024, 256, (c, w, h) => {
  const rnd = mulberry32(3);
  c.clearRect(0, 0, w, h);
  for (let k = 0; k < 2; k++) {
    const y0 = h * (0.3 + k * 0.4);
    for (let i = 0; i < 14; i++) {
      c.strokeStyle = `rgba(255,240,220,${0.15 + rnd() * 0.3})`; c.lineWidth = 0.6 + rnd() * 2;
      c.beginPath(); const yy = y0 + (rnd() - 0.5) * 26;
      c.moveTo(w * 0.05 + rnd() * 40, yy); c.bezierCurveTo(w * 0.35, yy + (rnd() - 0.5) * 8, w * 0.65, yy + (rnd() - 0.5) * 8, w * (0.9 + rnd() * 0.08), yy + (rnd() - 0.5) * 6); c.stroke();
    }
  }
});
