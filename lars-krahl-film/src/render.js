'use strict';
/* =====================================================================
 *  render.js - camera, kraft-paper table, film overlays, frame renderer
 * ===================================================================== */
const ORDER = SCENES.map(s => s.id);
const TRANS = [];   // camera moves between scenes
(function () {
  for (let i = 1; i < ORDER.length; i++) {
    const to = ORDER[i];
    let a = SC[to] - .5, b = SC[to] + .45, dip = .13;
    if (to === 'hooked') { a = SC.hooked - .78; b = SC.hooked + .32; dip = 0; }
    if (to === 'boots') { a = SC.boots - .7; b = SC.boots + .45; dip = .06; }
    if (to === 'outro') { a = SC.outro - .55; b = SC.outro + .5; dip = .16; }
    TRANS.push({ a, b, from: i - 1, to: i, dip });
  }
})();
function holdState(i, t) {
  const id = ORDER[i], p = PLACE[id];
  const h0 = i === 0 ? 0 : TRANS[i - 1].b, h1 = i < TRANS.length ? TRANS[i].a : DURATION;
  const push = 1 + (id === 'hooked' ? .04 : .035) * E.sine(prog(t, h0, h1));
  return { x: p.x, y: p.y, r: p.r, z: push / p.s };
}
function camera(t) {
  let c = null;
  for (const tr of TRANS) {
    if (t < tr.a) { c = holdState(tr.from, t); break; }
    if (t <= tr.b) {
      const p = E.inOut(prog(t, tr.a, tr.b));
      const A = holdState(tr.from, tr.a), B = holdState(tr.to, tr.b);
      const z = Math.exp(lerp(Math.log(A.z), Math.log(B.z), p)) * (1 - tr.dip * Math.sin(Math.PI * p));
      // position follows the zoom so zooms feel anchored on their target
      const zw = Math.abs(B.z - A.z) > .2 ? clamp((1 / (z / (1 - tr.dip * Math.sin(Math.PI * p))) - 1 / A.z) / (1 / B.z - 1 / A.z)) : p;
      c = { x: lerp(A.x, B.x, zw), y: lerp(A.y, B.y, zw), r: lerp(A.r, B.r, p), z };
      break;
    }
  }
  if (!c) c = holdState(ORDER.length - 1, t);
  // opening push, hand-held drift, shakes
  c.z *= 1 + .12 * (1 - E.inOut(prog(t, 0, 2.8)));
  c.x += (Math.sin(t * .61) * 6 + Math.sin(t * 1.73) * 1.5) / c.z;
  c.y += (Math.cos(t * .47) * 5 + Math.cos(t * 1.31) * 1.2) / c.z;
  c.r += Math.sin(t * .37) * .003;
  for (const [t0, amp, dur] of SHAKES) {
    const dt = t - t0; if (dt < 0 || dt > dur) continue;
    const k = amp * Math.pow(1 - dt / dur, 2);
    c.x += Math.sin(dt * 71) * k / c.z; c.y += Math.cos(dt * 57) * k / c.z; c.r += Math.sin(dt * 43) * k * .0006;
  }
  return c;
}
function applyCam(g, c) { g.translate(W / 2, H / 2); g.scale(c.z, c.z); g.rotate(-c.r); g.translate(-c.x, -c.y); }
function sceneXform(g, id) { const p = PLACE[id]; g.translate(p.x, p.y); g.rotate(p.r); g.scale(p.s, p.s); g.translate(-W / 2, -H / 2); }

/* ---------------- the table between the sheets ---------------- */
defSprite('pencil', 520, 60, (g, rc, R, v, R0) => {
  const body = [[60, 8], [470, 8], [470, 52], [60, 52]];
  paper(g, body, '#f2b134', R0, { amp: .8 }); outline(rc, body, { strokeWidth: 2 });
  rc.line(60, 22, 470, 22, { strokeWidth: 1.2 }); rc.line(60, 38, 470, 38, { strokeWidth: 1.2 });
  const tip = [[60, 8], [0, 30], [60, 52]]; paper(g, tip, '#e9c9a0', R0, { amp: .6 }); outline(rc, tip, { strokeWidth: 2 });
  fillPoly(g, [[18, 23], [0, 30], [18, 37]], '#2a1d14');
  paper(g, [[470, 6], [505, 6], [505, 54], [470, 54]], '#f4a6a6', R0, { amp: .6 });
  g.fillStyle = '#b9b9b9'; g.fillRect(462, 6, 14, 48);
}, { border: 0, shadow: 1 });
defSprite('clip', 70, 180, (g) => {
  g.strokeStyle = '#8f9aa3'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(20, 150); g.lineTo(20, 30); g.arc(35, 30, 15, Math.PI, 0); g.lineTo(50, 160); g.arc(35, 160, 15, 0, Math.PI); g.lineTo(20, 60); g.stroke();
}, { border: 0, shadow: .5 });
function drawTable(g, c) {
  const hd = Math.hypot(W, H) / 2 / c.z + 10;
  g.save();
  g.fillStyle = drawTable.pat || (drawTable.pat = g.createPattern(TEX.kraft, 'repeat'));
  g.fillRect(c.x - hd, c.y - hd, hd * 2, hd * 2);
  // doodles in the gaps between the sheets (only when on screen)
  for (let i = 0; i < ORDER.length - 1; i++) {
    const A = PLACE[ORDER[i]], B = PLACE[ORDER[i + 1]]; if (ORDER[i + 1] === 'hooked' || ORDER[i] === 'hooked') continue;
    const gx = (A.x + B.x) / 2, gy = (A.y + B.y) / 2;
    if (Math.abs(gx - c.x) > hd + 400) continue;
    const pts = spline([[gx - 260, gy - 40 + (i % 2) * 60], [gx - 90, gy + 30], [gx + 90, gy - 30], [gx + 260, gy + 20]], 10);
    inkLine(g, pts, { w: 4, color: 'rgba(60,35,15,0.55)', dash: [14, 12], seed: 500 + i, passes: 1 });
    const e = pts[pts.length - 1], q = pts[pts.length - 3], a = Math.atan2(e[1] - q[1], e[0] - q[0]);
    inkLine(g, [[e[0] - Math.cos(a - .5) * 26, e[1] - Math.sin(a - .5) * 26], e, [e[0] - Math.cos(a + .5) * 26, e[1] - Math.sin(a + .5) * 26]], { w: 4, color: 'rgba(60,35,15,0.55)', seed: 520 + i, passes: 1 });
    if (i % 3 === 0) { g.strokeStyle = 'rgba(90,50,15,0.22)'; g.lineWidth = 9; g.beginPath(); g.arc(gx + 40, gy + 330, 95, .3, 5.9); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(gx + 44, gy + 334, 80, 0, TAU); g.stroke(); }
    if (i % 3 === 1) put(g, 'pencil', gx + 10, gy - 330, { r: 1.25 + i * .1 });
    if (i % 3 === 2) put(g, 'clip', gx, gy + 300, { r: .4 });
    starDoodle(g, gx + (i % 2 ? 60 : -60), gy - 170, 1, 600 + i, { color: 'rgba(60,35,15,0.55)' });
  }
  g.restore();
}

/* ---------------- overlays ---------------- */
function drawOverlays(g, t) {
  // film grain
  g.save();
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = .9;
  const n = TEX.noise[Math.floor(t * 24) % 4], R = mulberry32(Math.floor(t * 24));
  g.drawImage(n, -R() * 40, -R() * 40, W + 60, H + 60);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  // dust & hairs (on twos)
  const R2 = mulberry32(Math.floor(t * 12) * 7 + 1);
  for (let i = 0; i < 3; i++) {
    if (R2() < .55) continue;
    const x = R2() * W, y = R2() * H;
    g.fillStyle = `rgba(40,25,10,${.15 + R2() * .2})`; g.beginPath(); g.arc(x, y, 1 + R2() * 2.5, 0, TAU); g.fill();
  }
  if (R2() < .12) { const x = R2() * W, y = R2() * H; g.strokeStyle = 'rgba(40,25,10,0.22)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 30, y - 20, x + 10, y + 40, x + 50, y + 30); g.stroke(); }
  g.drawImage(TEX.vignette, 0, 0);
  // warm grade
  g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,190,120,0.18)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  // fades
  const fin = 1 - prog(t, .05, .75), fout = prog(t, DURATION - 1.1, DURATION - .15);
  const f = Math.max(fin, fout);
  if (f > 0) { g.fillStyle = `rgba(22,14,8,${f})`; g.fillRect(0, 0, W, H); }
  g.restore();
}

/* ---------------- frame ---------------- */
function drawWorld(g, t) {
  T = t;
  const c = camera(t);
  g.save();
  applyCam(g, c);
  drawTable(g, c);
  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i]; if (s.noDraw) continue;
    const next = SCENES[i + 1];
    const t1 = s.t1 ?? (next ? next.t0 : DURATION);
    if (t < s.t0 - 1.1 || t > t1 + 1.1) continue;
    g.save(); sceneXform(g, s.id);
    if (s.sheet) drawSheet(g, s.sheet, s.sheetOpts);
    s.draw(g, t - s.t0);
    g.restore();
  }
  g.restore();
}
const MB = { canvas: null };
/** render one frame. opts.mb = motion blur samples when the camera moves fast */
function drawFrame(g, t, opts = {}) {
  const s = g.canvas.width / W;
  g.setTransform(s, 0, 0, s, 0, 0);
  let n = 1;
  if (opts.mb) {
    const a = camera(t - 1 / 120), b = camera(t + 1 / 120);
    const d = Math.hypot((a.x - b.x) * b.z, (a.y - b.y) * b.z) + Math.abs(Math.log(a.z / b.z)) * 900;
    n = clamp(Math.ceil(d / 7), 1, opts.mb);
  }
  if (n <= 1) { drawWorld(g, t); }
  else {
    if (!MB.canvas || MB.canvas.width !== g.canvas.width) { MB.canvas = mkCanvas(g.canvas.width, g.canvas.height); MB.ctx = MB.canvas.getContext('2d'); }
    const m = MB.ctx;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.restore();
    for (let i = 0; i < n; i++) {
      const ti = t + (i / (n - 1) - .5) / 60;
      m.setTransform(s, 0, 0, s, 0, 0); drawWorld(m, ti);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1 / (i + 1); g.drawImage(MB.canvas, 0, 0); g.restore();
    }
    T = t;
  }
  g.setTransform(s, 0, 0, s, 0, 0);
  drawOverlays(g, t);
}
