'use strict';
/* =====================================================================
 *  core.js - tiny collage-animation engine
 *  - deterministic (every frame is a pure function of time T)
 *  - cut-paper sprites: torn edges, white "scissor" border, paper grain,
 *    baked drop shadow, 3 "line boil" variants for the hand-drawn feel
 * ===================================================================== */
const W = 1920, H = 1080;
const FPS_BOIL = 8;           // hand-drawn line boil rate
const FPS_STEP = 12;          // stop-motion stepping for idle motion ("on twos")
let T = 0;                    // global clock (seconds), set per frame

/* ---------------- math ---------------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  lin: t => t,
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  out5: t => 1 - Math.pow(1 - t, 5),
  in: t => t * t * t,
  back: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 9 - .75) * (TAU / 3)) + 1,
  bounce: t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + .75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + .9375;
    return n1 * (t -= 2.625 / d1) * t + .984375;
  },
};
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const hash = (n) => mulberry32((n * 2654435761) >>> 0)();
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const boilIdx = (t = T) => Math.floor(t * FPS_BOIL) % 3;
const stepT = (t = T, fps = FPS_STEP) => Math.floor(t * fps) / fps;
/** hand-held jitter that changes on boil frames */
const wob = (seed, amp, t = T) => (hash(seed * 7919 + Math.floor(t * FPS_BOIL)) - .5) * 2 * amp;
/** stepped sine for idle motion */
const sway = (amp, freq, phase = 0, t = T) => Math.sin(stepT(t) * freq * TAU + phase) * amp;

/* pop-in: 0 before t0, overshooting to 1 */
const pop = (t0, d = .45, t = T) => t < t0 ? 0 : E.back(prog(t, t0, t0 + d));
const popOut = (t0, d = .3, t = T) => t < t0 ? 1 : 1 - E.in(prog(t, t0, t0 + d));
const inS = (t0, d = .5, fn = E.out, t = T) => fn(prog(t, t0, t0 + d));

/* ---------------- canvas helpers ---------------- */
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function ellPts(cx, cy, rx, ry, n = 56, a0 = 0, a1 = TAU) {
  const p = []; const full = Math.abs(a1 - a0 - TAU) < 1e-6;
  const cnt = full ? n : n + 1;
  for (let i = 0; i < cnt; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return p;
}
function roundRectPts(x, y, w, h, r, n = 6) {
  const p = [];
  const c = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) { const a = a0 + Math.PI / 2 * i / n; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return p;
}
/** subdivide + jitter a closed polygon => torn / hand-cut paper edge */
function tornPts(pts, R, amp = 2.5, step = 9, closed = true) {
  const out = []; const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const segs = Math.max(1, Math.round(len / step));
    for (let s = 0; s < segs; s++) {
      const f = s / segs, j = (R() - .5) * 2 * amp + (R() < .06 ? (R() - .5) * amp * 2.2 : 0);
      out.push([a[0] + dx * f + nx * j, a[1] + dy * f + ny * j]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
function pathPoly(g, pts, close = true) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (close) g.closePath();
}
function fillPoly(g, pts, fill) { pathPoly(g, pts); g.fillStyle = fill; g.fill(); }
/** cut-paper shape: torn edge + subtle tonal variation + darker rim */
function paper(g, pts, color, R, o = {}) {
  const tp = o.torn === false ? pts : tornPts(pts, R, o.amp ?? 2.2, o.step ?? 8);
  pathPoly(g, tp);
  g.fillStyle = color; g.fill();
  if (o.shade !== false) {
    // soft mottling
    g.save(); pathPoly(g, tp); g.clip();
    const bb = bbox(tp);
    const gr = g.createLinearGradient(bb.x, bb.y, bb.x + bb.w, bb.y + bb.h);
    gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(.55, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(60,30,0,0.10)');
    g.fillStyle = gr; g.fillRect(bb.x, bb.y, bb.w, bb.h);
    g.restore();
  }
  if (o.rim !== false) { pathPoly(g, tp); g.strokeStyle = o.rimColor || 'rgba(40,20,0,0.18)'; g.lineWidth = o.rimW || 1.3; g.stroke(); }
  return tp;
}
function bbox(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
/** halftone dots clipped to pts */
function halftone(g, pts, color, gap = 9, r = 2.2, ang = .5) {
  g.save(); pathPoly(g, pts); g.clip();
  const bb = bbox(pts); g.fillStyle = color;
  const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2, ext = Math.hypot(bb.w, bb.h) / 2 + gap;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let u = -ext; u <= ext; u += gap) for (let v = -ext; v <= ext; v += gap) {
    const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca;
    const k = .55 + .45 * clamp((y - bb.y) / bb.h);
    g.beginPath(); g.arc(x, y, r * k, 0, TAU); g.fill();
  }
  g.restore();
}
/** crayon-ish hatch fill clipped to pts (static, drawn at bake time) */
function crayon(g, pts, color, R, o = {}) {
  g.save(); pathPoly(g, pts); g.clip();
  const bb = bbox(pts), gap = o.gap ?? 7, ang = o.ang ?? -0.9;
  g.strokeStyle = color; g.lineCap = 'round'; g.globalAlpha = o.alpha ?? .55;
  const ca = Math.cos(ang), sa = Math.sin(ang), ext = Math.hypot(bb.w, bb.h);
  const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
  for (let u = -ext / 2; u < ext / 2; u += gap * (.7 + R() * .6)) {
    g.lineWidth = (o.w ?? 2.4) * (.6 + R() * .8);
    g.beginPath();
    const x0 = cx + u * ca + sa * ext / 2, y0 = cy + u * sa - ca * ext / 2;
    g.moveTo(x0 + (R() - .5) * 4, y0);
    g.lineTo(cx + u * ca - sa * ext / 2 + (R() - .5) * 4, cy + u * sa + ca * ext / 2);
    g.stroke();
  }
  g.restore();
}

/* ---------------- ink (live, wobbly, draw-on) ---------------- */
const INK = '#2a1d14';
/** wobbly polyline with optional draw-on progress p (0..1) */
function inkLine(g, pts, o = {}) {
  const p = o.p ?? 1; if (p <= 0) return;
  const seed = o.seed ?? 1, amp = o.wob ?? 1.2;
  // resample
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = L[L.length - 1] * p;
  const b = Math.floor(T * FPS_BOIL) + (o.still ? 0 : 0);
  const R = mulberry32(seed * 131 + (o.still ? 0 : b) * 17);
  g.save();
  g.strokeStyle = o.color || INK; g.lineWidth = o.w ?? 4; g.lineCap = 'round'; g.lineJoin = 'round';
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  if (o.dash) g.setLineDash(o.dash);
  const passes = o.passes ?? 2;
  for (let pass = 0; pass < passes; pass++) {
    g.beginPath();
    let started = false;
    for (let i = 0; i < pts.length; i++) {
      let [x, y] = pts[i];
      if (L[i] > total) {
        const a = pts[i - 1], f = (total - L[i - 1]) / (L[i] - L[i - 1] || 1);
        x = a[0] + (x - a[0]) * f; y = a[1] + (y - a[1]) * f;
        const jx = (R() - .5) * amp * 2, jy = (R() - .5) * amp * 2;
        g.lineTo(x + jx, y + jy); break;
      }
      const jx = (R() - .5) * amp * 2, jy = (R() - .5) * amp * 2;
      if (!started) { g.moveTo(x + jx, y + jy); started = true; } else g.lineTo(x + jx, y + jy);
    }
    g.globalAlpha *= pass ? .55 : 1;
    g.lineWidth *= pass ? .6 : 1;
    g.stroke();
  }
  g.restore();
}
/** smooth a list of control points via Catmull-Rom into a dense polyline */
function spline(ctrl, per = 12) {
  const out = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}
function polyLen(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; }
/** point + angle at arclength fraction f along pts */
function along(pts, f) {
  const L = polyLen(pts) * clamp(f); let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + l >= L) { const k = (L - acc) / (l || 1); return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, a: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    acc += l;
  }
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  return { x: b[0], y: b[1], a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

/* ---------------- text ---------------- */
const FONT = {
  hand: '700 1px Caveat', handL: '400 1px Caveat', gochi: '400 1px "Gochi Hand"', marker: '400 1px "Permanent Marker"',
  pixel: '400 1px "Press Start 2P"', patrick: '400 1px "Patrick Hand"', fred: '400 1px "Fredericka the Great"',
};
function font(f, size) { return f.replace('1px', size + 'px'); }
function text(g, str, x, y, o = {}) {
  g.save();
  g.font = font(FONT[o.f || 'hand'], o.size || 60);
  g.textAlign = o.align || 'center'; g.textBaseline = o.base || 'middle';
  g.translate(x, y); if (o.r) g.rotate(o.r);
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  if (o.stroke) { g.lineJoin = 'round'; g.strokeStyle = o.stroke; g.lineWidth = o.sw || 8; g.strokeText(str, 0, 0); }
  g.fillStyle = o.color || INK;
  if (o.spacing) {
    // manual letter spacing
    let w = 0; const ws = [...str].map(ch => { const m = g.measureText(ch).width; w += m + o.spacing; return m; }); w -= o.spacing;
    let cx = g.textAlign === 'center' ? -w / 2 : g.textAlign === 'right' ? -w : 0;
    g.textAlign = 'left';
    [...str].forEach((ch, i) => { g.fillText(ch, cx, 0); cx += ws[i] + o.spacing; });
  } else g.fillText(str, 0, 0);
  g.restore();
}
/** handwriting-style reveal: left-to-right wipe with a soft edge */
function writeText(g, str, x, y, p, o = {}) {
  if (p <= 0) return;
  g.save();
  g.font = font(FONT[o.f || 'hand'], o.size || 60);
  const w = g.measureText(str).width, h = (o.size || 60) * 1.6;
  const ax = (o.align || 'center') === 'center' ? -w / 2 : o.align === 'right' ? -w : 0;
  g.translate(x, y); if (o.r) g.rotate(o.r);
  g.beginPath(); g.rect(ax - 20, -h / 2 - 10, (w + 40) * clamp(p), h + 20); g.clip();
  text(g, str, 0, 0, Object.assign({}, o, { r: 0 }));
  g.restore();
  return w;
}
function measure(str, f, size) { const g = SCRATCH.getContext('2d'); g.font = font(FONT[f], size); return g.measureText(str).width; }
const SCRATCH = typeof document !== 'undefined' ? mkCanvas(8, 8) : null;

/* ---------------- textures ---------------- */
const TEX = {};
function buildTextures() {
  // paper grain: transparent base with dark specks and light fibres (used source-atop)
  const g1 = mkCanvas(512, 512), c = g1.getContext('2d'), R = mulberry32(7);
  for (let i = 0; i < 26; i++) { // mottling
    const x = R() * 512, y = R() * 512, r = 40 + R() * 120;
    const gr = c.createRadialGradient(x, y, 0, x, y, r);
    const dark = R() < .5;
    gr.addColorStop(0, dark ? 'rgba(70,40,10,0.045)' : 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { c.save(); c.translate(ox, oy); c.fillRect(x - r, y - r, 2 * r, 2 * r); c.restore(); }
  }
  for (let i = 0; i < 16000; i++) { c.fillStyle = `rgba(60,35,10,${.02 + R() * .08})`; c.fillRect(R() * 512, R() * 512, 1 + R() * 1.2, 1 + R() * 1.2); }
  for (let i = 0; i < 5000; i++) { c.fillStyle = `rgba(255,255,255,${.03 + R() * .08})`; c.fillRect(R() * 512, R() * 512, 1, 1); }
  c.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = R() * 512, y = R() * 512, a = R() * TAU, l = 6 + R() * 22;
    c.strokeStyle = R() < .5 ? `rgba(80,50,20,${.05 + R() * .07})` : `rgba(255,255,255,${.08 + R() * .1})`;
    c.lineWidth = .6 + R() * .7;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + .6) * l * .5, y + Math.sin(a + .6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  TEX.grain = g1;

  // kraft board 1024 tile
  const kb = mkCanvas(1024, 1024), k = kb.getContext('2d'), R2 = mulberry32(11);
  k.fillStyle = '#b98f5e'; k.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 60; i++) {
    const x = R2() * 1024, y = R2() * 1024, r = 80 + R2() * 260;
    const gr = k.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, R2() < .5 ? 'rgba(90,55,20,0.10)' : 'rgba(230,195,140,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) { k.fillStyle = gr; k.save(); k.translate(ox, oy); k.fillRect(x - r, y - r, 2 * r, 2 * r); k.restore(); }
  }
  for (let i = 0; i < 70000; i++) { k.fillStyle = `rgba(${R2() < .5 ? '60,35,10' : '240,210,160'},${.04 + R2() * .1})`; k.fillRect(R2() * 1024, R2() * 1024, 1 + R2() * 1.5, 1 + R2() * 1.5); }
  for (let i = 0; i < 1400; i++) {
    const x = R2() * 1024, y = R2() * 1024, a = R2() * TAU, l = 10 + R2() * 40;
    k.strokeStyle = `rgba(${R2() < .6 ? '70,40,15' : '235,205,150'},${.08 + R2() * .12})`; k.lineWidth = .6 + R2();
    k.beginPath(); k.moveTo(x, y); k.quadraticCurveTo(x + Math.cos(a + .5) * l * .5, y + Math.sin(a + .5) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); k.stroke();
  }
  TEX.kraft = kb;

  // film grain frames (screen overlay)
  TEX.noise = [];
  for (let f = 0; f < 4; f++) {
    const n = mkCanvas(480, 270), nc = n.getContext('2d'), id = nc.createImageData(480, 270), R3 = mulberry32(100 + f);
    for (let i = 0; i < id.data.length; i += 4) { const v = R3() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 22; }
    nc.putImageData(id, 0, 0); TEX.noise.push(n);
  }
  // vignette
  const vg = mkCanvas(W, H), v = vg.getContext('2d');
  const gr = v.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.05);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.7, 'rgba(30,15,0,0.16)'); gr.addColorStop(1, 'rgba(20,8,0,0.55)');
  v.fillStyle = gr; v.fillRect(0, 0, W, H);
  TEX.vignette = vg;
}

/* ---------------- sprites ---------------- */
const SPR = new Map();
/**
 * define a cut-out sprite.
 * fn(g, rc, R, v, R0): draw in [0,w]x[0,h]. rc = rough canvas (seed varies per boil
 * variant), R = per-variant rng, R0 = stable rng (use for cut edges), v = variant idx.
 * opts: border (px, white cut margin), borderColor, shadow (bool|num), boil (bool), tex (bool)
 */
function defSprite(key, w, h, fn, o = {}) { SPR.set(key, { key, w, h, fn, o, v: null }); }
function bakeSprite(sp, scale = 1) {
  const o = sp.o, border = o.border ?? 5, sh = o.shadow === false ? 0 : (o.shadow === true || o.shadow == null ? 1 : o.shadow);
  const pad = Math.ceil(border + 30 * Math.max(sh, .3) + 6);
  const nv = o.boil === false ? 1 : 3;
  sp.pad = pad; sp.v = [];
  for (let vi = 0; vi < nv; vi++) {
    const cw = (sp.w + 2 * pad) * scale, chh = (sp.h + 2 * pad) * scale;
    const A = mkCanvas(cw, chh), a = A.getContext('2d');
    a.scale(scale, scale); a.translate(pad, pad);
    const seed = hashStr(sp.key) % 100000;
    const rc = rough.canvas(A, { options: { seed: seed + vi * 7 + 1, roughness: 1.1, bowing: 1, stroke: INK, strokeWidth: 2.4 } });
    sp.fn(a, rc, mulberry32(seed + vi * 101 + 3), vi, mulberry32(seed + 17));
    a.setTransform(1, 0, 0, 1, 0, 0);
    if (o.tex !== false) { // grain, atop existing pixels only
      a.globalCompositeOperation = 'source-atop'; a.globalAlpha = o.texAlpha ?? 1;
      const pat = a.createPattern(TEX.grain, 'repeat'); a.fillStyle = pat;
      a.save(); a.translate((seed % 300), (seed % 211)); a.fillRect(-(seed % 300), -(seed % 211), cw, chh); a.restore();
      a.globalCompositeOperation = 'source-over'; a.globalAlpha = 1;
    }
    let out = A;
    if (border > 0) {
      const B = mkCanvas(cw, chh), b = B.getContext('2d');
      const n = 18, rr = border * scale;
      for (let i = 0; i < n; i++) { const an = i / n * TAU; b.drawImage(A, Math.cos(an) * rr, Math.sin(an) * rr); }
      b.drawImage(A, 0, 0);
      b.globalCompositeOperation = 'source-in'; b.fillStyle = o.borderColor || '#fbf7ee'; b.fillRect(0, 0, cw, chh);
      b.globalCompositeOperation = 'source-over';
      // faint grey edge around the white margin, looks like a paper cut
      b.drawImage(A, 0, 0);
      out = B;
    }
    if (sh > 0) {
      const C = mkCanvas(cw, chh), c = C.getContext('2d');
      c.shadowColor = `rgba(45,25,5,${.38 * Math.min(1, sh)})`; c.shadowBlur = 12 * scale * sh; c.shadowOffsetX = 5 * scale * sh; c.shadowOffsetY = 8 * scale * sh;
      c.drawImage(out, 0, 0);
      out = C;
    }
    sp.v.push(out);
  }
  sp.scale = scale;
}
/** draw sprite centred on its anchor (ax, ay in 0..1 of content box) */
function put(g, key, x, y, o = {}) {
  const sp = SPR.get(key); if (!sp) throw new Error('no sprite ' + key);
  if (!sp.v) bakeSprite(sp, RENDER_SCALE);
  const s = o.s ?? 1; if (s <= 0.001 || (o.a ?? 1) <= 0.001) return;
  const v = sp.v[sp.v.length === 1 ? 0 : (boilIdx(o.t ?? T) + (o.vo || 0)) % 3];
  const ax = o.ax ?? .5, ay = o.ay ?? .5;
  g.save();
  g.translate(x, y);
  if (o.r) g.rotate(o.r);
  g.scale(s * (o.sx ?? 1), s * (o.sy ?? 1));
  if (o.a != null) g.globalAlpha *= clamp(o.a);
  if (o.comp) g.globalCompositeOperation = o.comp;
  g.drawImage(v, -ax * sp.w - sp.pad, -ay * sp.h - sp.pad, sp.w + 2 * sp.pad, sp.h + 2 * sp.pad);
  g.restore();
}
let RENDER_SCALE = 1;
function bakeAll(onProgress) {
  const all = [...SPR.values()]; let i = 0;
  return new Promise(res => {
    (function step() {
      const t0 = performance.now();
      while (i < all.length && performance.now() - t0 < 30) { if (!all[i].v) bakeSprite(all[i], RENDER_SCALE); i++; }
      onProgress && onProgress(i / all.length);
      if (i < all.length) setTimeout(step, 0); else res();
    })();
  });
}

/* ---------------- common props ---------------- */
function tapePts(w, h, R) {
  // masking tape with zig-zag torn ends
  const p = [];
  const zz = (x, top, bot, dir) => { const n = 6; for (let i = 0; i <= n; i++) p.push([x + (i % 2 ? 3 : -3) * dir + (R() - .5) * 2, top + (bot - top) * i / n]); };
  p.push([4, 0]); p.push([w - 4, 0]);
  zz(w - 4, 0, h, 1);
  p.push([4, h]);
  const q = []; for (let i = 0; i <= 6; i++) q.push([4 + (i % 2 ? -3 : 3) + (R() - .5) * 2, h - h * i / 6]);
  return p.concat(q);
}
defSprite('tape', 150, 42, (g, rc, R, v, R0) => {
  const pts = tapePts(150, 42, R0);
  pathPoly(g, pts); g.fillStyle = 'rgba(236,222,178,0.78)'; g.fill();
  g.strokeStyle = 'rgba(120,100,50,0.18)'; g.lineWidth = 1; g.stroke();
  g.save(); pathPoly(g, pts); g.clip(); g.globalAlpha = .12; g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) g.fillRect(0, 6 + i * 6, 150, 1.2); g.restore();
}, { border: 0, shadow: .25, boil: false });
defSprite('tapeB', 130, 40, (g, rc, R, v, R0) => {
  const pts = tapePts(130, 40, R0);
  pathPoly(g, pts); g.fillStyle = 'rgba(160,205,220,0.72)'; g.fill();
  g.save(); pathPoly(g, pts); g.clip(); g.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = -40; x < 170; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 8, 0); g.lineTo(x + 48, 40); g.lineTo(x + 40, 40); g.fill(); } g.restore();
}, { border: 0, shadow: .25, boil: false });
defSprite('tapeR', 130, 40, (g, rc, R, v, R0) => {
  const pts = tapePts(130, 40, R0);
  pathPoly(g, pts); g.fillStyle = 'rgba(232,120,110,0.72)'; g.fill();
  g.save(); pathPoly(g, pts); g.clip(); g.fillStyle = 'rgba(255,255,255,0.45)'; for (let x = 10; x < 130; x += 22) { g.beginPath(); g.arc(x, 20, 5, 0, TAU); g.fill(); } g.restore();
}, { border: 0, shadow: .25, boil: false });

// little doodle stars / sparkles (live)
function sparkle(g, x, y, s, t0, o = {}) {
  const p = prog(T, t0, t0 + (o.d ?? .6)); if (p <= 0 || p >= 1) return;
  const k = Math.sin(p * Math.PI);
  g.save(); g.translate(x, y); g.rotate(p * 1.2); g.scale(s * k, s * k);
  g.fillStyle = o.color || '#ffd23f'; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i < 8; i++) { const r = i % 2 ? 9 : 28, a = i / 8 * TAU; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.fill(); g.stroke(); g.restore();
}
function starDoodle(g, x, y, s, seed, o = {}) {
  const pts = []; for (let i = 0; i <= 10; i++) { const r = i % 2 ? 11 * s : 26 * s, a = i / 10 * TAU - Math.PI / 2; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  inkLine(g, pts, { seed, w: o.w ?? 3.2, color: o.color || INK, p: o.p ?? 1, passes: 1 });
}
/** burst of paper confetti (deterministic particles) */
const CONF_COLORS = ['#e4572e', '#f2b134', '#2a9d8f', '#4d7cc7', '#f4a6a6', '#fbf7ee', '#8e6cc2'];
function confetti(g, x, y, t0, o = {}) {
  const dt = T - t0; const life = o.life ?? 1.6; if (dt < 0 || dt > life) return;
  const n = o.n ?? 28, R = mulberry32(o.seed ?? 5), spd = o.spd ?? 700;
  g.save();
  for (let i = 0; i < n; i++) {
    const a = (o.a0 ?? 0) + (R() - .5) * (o.spread ?? TAU), v = spd * (.35 + R() * .75);
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v - (o.up ?? 250);
    const drag = Math.exp(-2.2 * dt);
    const px = x + vx * (1 - drag) / 2.2, py = y + vy * (1 - drag) / 2.2 + 520 * dt * dt * (o.grav ?? 1);
    const rot = R() * TAU + dt * (R() - .5) * 18;
    const al = 1 - prog(dt, life * .6, life);
    g.save(); g.translate(px, py); g.rotate(rot); g.scale(1, Math.cos(dt * (6 + R() * 8)));
    g.globalAlpha = al; g.fillStyle = (o.colors || CONF_COLORS)[i % (o.colors || CONF_COLORS).length];
    const sz = (o.size ?? 14) * (.6 + R() * .8);
    if (i % 3 === 0) { g.beginPath(); g.arc(0, 0, sz * .45, 0, TAU); g.fill(); } else g.fillRect(-sz / 2, -sz * .3, sz, sz * .6);
    g.restore();
  }
  g.restore();
}
/** cartoon "poof" cloud */
function poof(g, x, y, t0, o = {}) {
  const dt = T - t0, life = o.life ?? .7; if (dt < 0 || dt > life) return;
  const p = dt / life, R = mulberry32(o.seed ?? 9), n = o.n ?? 9, rad = (o.r ?? 120);
  g.save();
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + R() * .5, d = rad * E.out(p) * (.6 + R() * .5);
    const r = (o.pr ?? 45) * (1 - p * .8) * (.7 + R() * .6);
    g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .7, r, 0, TAU);
    g.fillStyle = o.color || '#fbf7ee'; g.globalAlpha = 1 - E.in(p); g.fill();
    g.lineWidth = 3; g.strokeStyle = INK; g.globalAlpha *= .8; g.stroke();
  }
  g.restore();
}
/** speed lines / motion accents */
function actionLines(g, x, y, t0, o = {}) {
  const dt = T - t0, life = o.life ?? .45; if (dt < 0 || dt > life) return;
  const p = dt / life, n = o.n ?? 8, R = mulberry32(o.seed ?? 3);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + R() * .3, r0 = (o.r0 ?? 90) + p * 80, r1 = r0 + (o.len ?? 60) * (1 - p);
    inkLine(g, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], { w: o.w ?? 5, seed: i + 1, passes: 1, color: o.color, wob: .5 });
  }
}
