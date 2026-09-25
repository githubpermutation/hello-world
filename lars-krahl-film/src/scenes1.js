'use strict';
/* =====================================================================
 *  scenes1.js - scene registry, paper sheets, 1 Dresden, 2 C64, 3 Hooked
 * ===================================================================== */
const SCENES = [];
function defScene(id, o) { SCENES.push(Object.assign({ id, t0: SC[id] }, o)); }
/** scene placement on the big kraft-paper "table" (world space) */
const PLACE = {
  dresden: { x: 0, y: 0, r: 0, s: 1 },
  c64: { x: 2160, y: 250, r: -0.035, s: 1 },
  boots: { x: 4380, y: -130, r: 0.04, s: 1 },
  cert: { x: 6520, y: 220, r: -0.03, s: 1 },
  puppet: { x: 8680, y: -100, r: 0.025, s: 1 },
  pipes: { x: 10840, y: 180, r: -0.02, s: 1 },
  python: { x: 13000, y: -140, r: 0.035, s: 1 },
  curious: { x: 15160, y: 150, r: -0.025, s: 1 },
  outro: { x: 17320, y: 0, r: 0, s: 1 },
};
/* the C64 monitor screen (in c64-scene local coords) doubles as scene 3 */
const SCREEN = { x: 1290, y: 440, w: 600, h: 338 };
(function () {
  const p = PLACE.c64, dx = SCREEN.x - W / 2, dy = SCREEN.y - H / 2, c = Math.cos(p.r), s = Math.sin(p.r);
  PLACE.hooked = { x: p.x + dx * c - dy * s, y: p.y + dx * s + dy * c, r: p.r, s: SCREEN.w / W };
})();

function defSheet(id, color, pat, o = {}) {
  defSprite('sheet_' + id, 1840, 1010, (g, rc, R, v, R0) => {
    const pts = paper(g, rectPts(0, 0, 1840, 1010), color, R0, { amp: 3, step: 14, rim: true });
    g.save(); pathPoly(g, pts); g.clip();
    const line = (x0, y0, x1, y1, c, w) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    if (pat === 'dots') { g.fillStyle = o.dot || 'rgba(40,60,50,0.16)'; for (let x = 20; x < 1840; x += 40) for (let y = 20; y < 1010; y += 40) { g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); } }
    if (pat === 'grid' || pat === 'blueprint') {
      const c1 = pat === 'grid' ? 'rgba(70,130,200,0.20)' : 'rgba(255,255,255,0.13)', c2 = pat === 'grid' ? 'rgba(70,130,200,0.35)' : 'rgba(255,255,255,0.30)';
      for (let x = 0; x < 1840; x += 40) line(x, 0, x, 1010, x % 200 === 0 ? c2 : c1, x % 200 === 0 ? 1.6 : 1);
      for (let y = 0; y < 1010; y += 40) line(0, y, 1840, y, y % 200 === 0 ? c2 : c1, y % 200 === 0 ? 1.6 : 1);
    }
    if (pat === 'lines') { for (let y = 120; y < 1010; y += 52) line(0, y, 1840, y, 'rgba(70,120,200,0.28)', 1.5); line(150, 0, 150, 1010, 'rgba(220,60,60,0.45)', 2); }
    // aged edges
    const gr = g.createRadialGradient(920, 505, 400, 920, 505, 1100);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, o.age || 'rgba(120,80,20,0.22)');
    g.fillStyle = gr; g.fillRect(0, 0, 1840, 1010);
    if (o.extra) o.extra(g, rc, R0);
    g.restore();
  }, { border: 0, shadow: 1.6, boil: false });
}
/* scene sheet + tape at the corners (drawn in local coordinates) */
function drawSheet(g, id, o = {}) {
  put(g, 'sheet_' + id, W / 2, H / 2, { r: o.r || 0 });
  const tp = o.tape || [['tape', 110, 60, -.6], ['tape', 1810, 60, .6], ['tape', 110, 1020, .65], ['tape', 1810, 1020, -.6]];
  for (const [k, x, y, r] of tp) put(g, k, x, y, { r });
}

/* ============================ 1  DRESDEN ============================ */
defSheet('dresden', '#d3e6ea', 'plain', { age: 'rgba(90,110,90,0.22)' });
const SAND = '#e0cfa6', SAND2 = '#cdb88e', SOOT = 'rgba(70,58,48,0.55)';
function sootPatches(g, pts, R0, n = 18) {
  g.save(); pathPoly(g, pts); g.clip();
  const bb = bbox(pts);
  for (let i = 0; i < n; i++) { g.fillStyle = SOOT; const w = 8 + R0() * 26, h = 6 + R0() * 14; g.fillRect(bb.x + R0() * bb.w, bb.y + R0() * bb.h, w, h); }
  g.restore();
}
function archWin(g, rc, x, y, w, h, fill = '#4a3f38') {
  const p = [[x, y + h], [x, y + w / 2]].concat(ellPts(x + w / 2, y + w / 2, w / 2, w / 2, 10, Math.PI, TAU)).concat([[x + w, y + h]]);
  fillPoly(g, p, fill); rc.polygon(p, { strokeWidth: 1.6, roughness: .5 });
}
defSprite('d_frauen', 360, 540, (g, rc, R, v, R0) => {
  // corner towers
  for (const x of [30, 270]) {
    const tw = paper(g, rectPts(x, 300, 60, 240), SAND2, R0, { amp: 1 }); sootPatches(g, tw, R0, 6); outline(rc, tw, { strokeWidth: 2 });
    const cap = ellPts(x + 30, 300, 32, 34, 14, Math.PI, TAU); cap.push([x + 62, 300]);
    paper(g, cap, '#5f7f73', R0, { amp: .8 }); outline(rc, cap, { strokeWidth: 2 });
    rc.line(x + 30, 266, x + 30, 244, { strokeWidth: 2 });
    archWin(g, rc, x + 18, 360, 24, 50);
  }
  // body
  const body = paper(g, rectPts(60, 330, 240, 210), SAND, R0, { amp: 1.2 });
  sootPatches(g, body, R0, 22); outline(rc, body);
  archWin(g, rc, 95, 380, 36, 80); archWin(g, rc, 162, 370, 36, 90); archWin(g, rc, 229, 380, 36, 80);
  rc.line(60, 480, 300, 480, { strokeWidth: 1.6 });
  // the stone bell
  const bell = bezPts([62, 336], [120, 300], [80, 140], [180, 118], 18).concat(bezPts([180, 118], [280, 140], [240, 300], [298, 336], 18));
  const bp = paper(g, bell, SAND, R0, { amp: 1 }); sootPatches(g, bp, R0, 20); outline(rc, bp);
  for (const k of [-1, 1]) rc.curve([[180 + k * 70, 318], [180 + k * 48, 220], [180 + k * 20, 140]], { strokeWidth: 1.5 });
  // lantern + cross
  const lan = paper(g, rectPts(158, 64, 44, 60), SAND2, R0, { amp: .8 }); outline(rc, lan, { strokeWidth: 2 });
  const lc = ellPts(180, 64, 26, 24, 12, Math.PI, TAU); lc.push([206, 64]);
  paper(g, lc, '#5f7f73', R0, { amp: .6 }); outline(rc, lc, { strokeWidth: 2 });
  g.strokeStyle = '#d9a520'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(180, 42); g.lineTo(180, 4); g.moveTo(168, 18); g.lineTo(192, 18); g.stroke();
}, { border: 5 });
defSprite('d_hof', 160, 480, (g, rc, R, v, R0) => {
  const tiers = [[25, 300, 110, 180], [35, 190, 90, 110], [48, 110, 64, 80]];
  for (const [x, y, w, h] of tiers) {
    const p = paper(g, rectPts(x, y, w, h), SAND2, R0, { amp: 1 }); sootPatches(g, p, R0, 8); outline(rc, p, { strokeWidth: 2 });
    for (let i = 1; i < 4; i++) rc.line(x + w * i / 4, y + 8, x + w * i / 4, y + h - 8, { strokeWidth: 1.2 });
  }
  archWin(g, rc, 62, 340, 36, 90);
  const top = [[58, 110], [80, 30], [102, 110]];
  paper(g, top, '#5f7f73', R0, { amp: .8 }); outline(rc, top, { strokeWidth: 2 });
  g.strokeStyle = '#d9a520'; g.lineWidth = 5; g.beginPath(); g.moveTo(80, 32); g.lineTo(80, 4); g.stroke();
}, { border: 5 });
defSprite('d_haus', 150, 440, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(35, 160, 80, 280), SAND2, R0, { amp: 1 }); sootPatches(g, p, R0, 10); outline(rc, p, { strokeWidth: 2 });
  archWin(g, rc, 60, 200, 30, 60); archWin(g, rc, 60, 300, 30, 60);
  const cap = [[30, 164], [120, 164], [104, 120], [92, 70], [84, 40], [66, 40], [58, 70], [46, 120]];
  paper(g, cap, '#5f9a86', R0, { amp: 1 }); outline(rc, cap, { strokeWidth: 2 });
  g.strokeStyle = '#d9a520'; g.lineWidth = 5; g.beginPath(); g.moveTo(75, 40); g.lineTo(75, 6); g.stroke();
}, { border: 5 });
defSprite('d_semper', 420, 260, (g, rc, R, v, R0) => {
  const base = paper(g, rectPts(0, 130, 420, 130), SAND, R0, { amp: 1 }); sootPatches(g, base, R0, 12); outline(rc, base);
  for (let i = 0; i < 6; i++) archWin(g, rc, 18 + i * 68 - (i > 2 ? -0 : 0), 170, 30, 60);
  const ex = [[120, 260], [120, 80]].concat(ellPts(210, 80, 90, 60, 18, Math.PI, TAU)).concat([[300, 260]]);
  const ep = paper(g, ex, SAND2, R0, { amp: 1 }); sootPatches(g, ep, R0, 10); outline(rc, ep);
  archWin(g, rc, 175, 90, 70, 140, '#3d3530');
  // quadriga
  paper(g, [[180, 22], [240, 22], [246, 40], [174, 40]], '#3d3530', R0, { amp: .6 });
  paper(g, ellPts(210, 16, 16, 12, 10), '#3d3530', R0, { amp: .6 });
}, { border: 5 });
defSprite('d_akad', 380, 320, (g, rc, R, v, R0) => {
  const base = paper(g, rectPts(0, 190, 380, 130), SAND, R0, { amp: 1 }); sootPatches(g, base, R0, 12); outline(rc, base);
  for (let i = 0; i < 7; i++) archWin(g, rc, 14 + i * 52, 222, 26, 56);
  const dome = ellPts(190, 190, 90, 150, 24, Math.PI, TAU); dome.push([280, 190]);
  const dp = paper(g, dome, '#a8c6d2', R0, { amp: 1 }); outline(rc, dp);
  for (let i = -3; i <= 3; i++) rc.curve([[190 + i * 26, 190], [190 + i * 20, 120], [190 + i * 6, 50]], { strokeWidth: 1.4 });
  g.fillStyle = '#d9a520'; g.beginPath(); g.arc(190, 34, 9, 0, TAU); g.fill(); rc.line(190, 26, 190, 4, { stroke: '#d9a520', strokeWidth: 4 });
}, { border: 5 });
defSprite('d_farbank', 1840, 140, (g, rc, R, v, R0) => {
  const p = [[0, 40]];
  for (let x = 0; x <= 1840; x += 30) p.push([x, 40 - Math.abs(Math.sin(x * .013)) * 26 - R0() * 12]);
  p.push([1840, 140], [0, 140]);
  const pp = paper(g, p, '#9cc07c', R0, { amp: 1.5 });
  crayon(g, pp, '#6f9a52', R0, { gap: 9, alpha: .45 });
  for (let i = 0; i < 26; i++) { const x = 30 + R0() * 1780; paper(g, ellPts(x, 30, 20 + R0() * 14, 18 + R0() * 10, 12), '#77a35b', R0, { amp: 1 }); }
}, { border: 0, shadow: .7 });
defSprite('d_river', 1840, 230, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(0, 0, 1840, 230), '#3f86b8', R0, { amp: 2 });
  halftone(g, p, 'rgba(255,255,255,0.18)', 11, 2.6, .4);
  crayon(g, p, '#2f6d99', R0, { gap: 14, alpha: .35, ang: -.2 });
}, { border: 0, shadow: .6, boil: false });
defSprite('d_nearbank', 1840, 160, (g, rc, R, v, R0) => {
  const p = [[0, 30]];
  for (let x = 0; x <= 1840; x += 40) p.push([x, 24 + R0() * 16]);
  p.push([1840, 160], [0, 160]);
  const pp = paper(g, p, '#5e8f4f', R0, { amp: 2 });
  crayon(g, pp, '#3f6e36', R0, { gap: 8, alpha: .4 });
  for (let i = 0; i < 40; i++) { const x = R0() * 1840, y = 40 + R0() * 90; rc.linearPath([[x - 8, y + 8], [x - 3, y - 6], [x, y + 6], [x + 4, y - 9], [x + 9, y + 8]], { stroke: '#2f5227', strokeWidth: 1.8 }); }
  // tiny flowers
  for (let i = 0; i < 18; i++) { const x = R0() * 1840, y = 60 + R0() * 80; g.fillStyle = ['#fbf7ee', '#f2b134', '#f4a6a6'][i % 3]; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
}, { border: 0, shadow: .8 });
defSprite('d_bridge', 980, 130, (g, rc, R, v, R0) => {
  g.beginPath();
  const top = tornPts([[0, 0], [980, 0], [980, 130], [0, 130]], R0, 1.2, 10);
  pathPoly(g, top);
  const arches = [];
  for (let i = 0; i < 6; i++) {
    const cx = 80 + i * 165, a = ellPts(cx, 130, 62, 78, 16, Math.PI, TAU);
    arches.push(a); g.moveTo(a[0][0], a[0][1]); for (const q of a) g.lineTo(q[0], q[1]); g.closePath();
  }
  g.fillStyle = SAND2; g.fill('evenodd');
  g.save(); g.clip('evenodd'); sootPatches(g, rectPts(0, 0, 980, 130), R0, 30); g.restore();
  rc.line(0, 28, 980, 28, { strokeWidth: 2 });
  for (let x = 12; x < 980; x += 22) rc.line(x, 4, x, 24, { strokeWidth: 1.4 });
  for (const a of arches) rc.curve(a, { strokeWidth: 2 });
}, { border: 4, shadow: .8 });
defSprite('d_sun', 240, 240, (g, rc, R, v, R0) => {
  const p = paper(g, ellPts(120, 120, 100, 100, 40), '#f6b93b', R0, { amp: 2 });
  crayon(g, p, '#ee8f1f', R0, { gap: 8, alpha: .5 });
  outline(rc, p);
  // sleepy happy face
  rc.arc(84, 112, 34, 22, 0.1, Math.PI - .1, false, { strokeWidth: 3 });
  rc.arc(156, 112, 34, 22, 0.1, Math.PI - .1, false, { strokeWidth: 3 });
  rc.arc(120, 146, 60, 40, 0.15, Math.PI - .15, false, { strokeWidth: 3 });
  g.fillStyle = CHEEK; g.beginPath(); g.ellipse(64, 140, 16, 10, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(176, 140, 16, 10, 0, 0, TAU); g.fill();
}, { border: 6 });
function cloudPts(w, h, R0, n = 6) {
  const p = []; const cx = w / 2, cy = h * .58;
  for (let i = 0; i <= 64; i++) {
    const a = i / 64 * TAU;
    const bump = Math.abs(Math.sin(a * n / 2)) * .22 + .78;
    const ry = a > 0 && a < Math.PI ? h * .32 : h * .46 * bump;
    p.push([cx + Math.cos(a) * w * .47 * (a > 0 && a < Math.PI ? 1 : bump), cy + Math.sin(a) * ry]);
  }
  return p;
}
defSprite('d_cloud', 330, 150, (g, rc, R, v, R0) => { const p = paper(g, cloudPts(330, 150, R0, 7), '#fbf8f0', R0, { amp: 1.4 }); rc.curve(p.slice(28, 64), { strokeWidth: 1.8, stroke: 'rgba(42,29,20,.6)' }); }, { border: 0, shadow: .7 });
defSprite('d_cloud2', 230, 110, (g, rc, R, v, R0) => { const p = paper(g, cloudPts(230, 110, R0, 5), '#fbf8f0', R0, { amp: 1.2 }); rc.curve(p.slice(28, 64), { strokeWidth: 1.6, stroke: 'rgba(42,29,20,.6)' }); }, { border: 0, shadow: .6 });
defSprite('d_boat', 170, 110, (g, rc, R, v, R0) => {
  const hull = [[0, 50], [170, 50], [138, 104], [32, 104]];
  const sail = [[40, 50], [85, 0], [130, 50]];
  const newsprint = (pts) => { g.save(); pathPoly(g, pts); g.clip(); g.fillStyle = 'rgba(40,40,40,0.35)'; for (let y = 0; y < 110; y += 7) for (let x = 0; x < 170; x += 22) g.fillRect(x + (y % 14 ? 6 : 0), y, 14 + R0() * 4, 2); g.restore(); };
  paper(g, sail, '#f1ede2', R0, { amp: .8 }); newsprint(sail); outline(rc, sail, { strokeWidth: 2 });
  paper(g, hull, '#f7f3ea', R0, { amp: .8 }); newsprint(hull); outline(rc, hull, { strokeWidth: 2 });
  rc.line(85, 50, 85, 104, { strokeWidth: 1.6 });
}, { border: 3, shadow: .6 });
defSprite('d_slip', 600, 110, (g, rc, R, v, R0) => { paper(g, rectPts(0, 0, 600, 110), '#fbf5e6', R0, { amp: 2.5, step: 7 }); }, { border: 0, shadow: .8, boil: false });

function river(g, lt, x0, x1, y0, y1, seed) {
  // animated shimmer lines
  for (let i = 0; i < 16; i++) {
    const R = mulberry32(seed + i), y = y0 + R() * (y1 - y0), len = 60 + R() * 90;
    const x = x0 + ((R() * (x1 - x0) + stepT() * (30 + R() * 30)) % (x1 - x0));
    const pts = []; for (let k = 0; k <= 8; k++) pts.push([x + k / 8 * len, y + Math.sin(k / 8 * TAU + stepT() * 3 + i) * 4]);
    inkLine(g, pts, { color: 'rgba(255,255,255,0.75)', w: 3, seed: seed + i, passes: 1 });
  }
}
function bird(g, x, y, s, ph) {
  const f = Math.sin(stepT() * 14 + ph) * 16 * s;
  inkLine(g, [[x - 26 * s, y - f], [x - 10 * s, y - 4 * s], [x, y + 4 * s], [x + 10 * s, y - 4 * s], [x + 26 * s, y - f]], { w: 3.4, seed: 3 + ph | 0, passes: 1 });
}

defScene('dresden', {
  sheet: 'dresden',
  draw(g, lt) {
    // clouds + sun (behind everything)
    const cl = [['d_cloud', 1440, 120, .15], ['d_cloud2', 700, 205, .3], ['d_cloud2', 1830, 420, .45], ['d_cloud', 150, 520, .55]];
    cl.forEach(([k, x, y, t0], i) => put(g, k, x + stepT() * (8 + i * 3), y + sway(4, .3, i), { s: pop(t0, .55), r: sway(.02, .4, i) }));
    const sp = pop(.3, .7);
    if (sp > 0) {
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU + lt * .25, r0 = 125, r1 = 125 + (i % 2 ? 40 : 62) * sp;
        inkLine(g, [[1690 + Math.cos(a) * r0, 205 + Math.sin(a) * r0], [1690 + Math.cos(a) * r1, 205 + Math.sin(a) * r1]], { color: '#e8912b', w: 7, seed: i + 40, passes: 1 });
      }
      put(g, 'd_sun', 1690, 205, { s: sp, r: sway(.05, .25) });
    }
    // skyline rising from behind the far bank
    const rise = (t0) => (1 - E.back(prog(lt, t0, t0 + .6))) * 560;
    put(g, 'd_semper', 560, 705 + rise(2.35), { ay: 1 });
    put(g, 'd_hof', 800, 705 + rise(2.2), { ay: 1 });
    put(g, 'd_haus', 960, 705 + rise(2.3), { ay: 1 });
    put(g, 'd_frauen', 1190, 710 + rise(2.02), { ay: 1, r: sway(.006, .5) });
    put(g, 'd_akad', 1500, 705 + rise(2.45), { ay: 1 });
    // banks + river
    put(g, 'd_farbank', 960, 720);
    put(g, 'd_river', 960, 850);
    river(g, lt, 60, 1860, 760, 940, 100);
    put(g, 'd_bridge', 530, 800 + (1 - E.back(prog(lt, 2.6, 3.1))) * 300, { a: prog(lt, 2.6, 2.75) });
    // little paper boat on the Elbe
    const bp = pop(2.95, .5);
    if (bp > 0) put(g, 'd_boat', 1240 + (lt - 2.95) * 34, 868 + sway(5, .8), { s: bp, r: sway(.08, .7) });
    put(g, 'd_nearbank', 960, 975);
    writeText(g, 'Elbe', 1560, 905, prog(lt, 3.2, 3.6), { size: 64, color: '#fbf7ee', r: -.04 });
    // "Once upon a time..."
    const slipS = pop(.55, .5);
    put(g, 'd_slip', 390, 140, { s: slipS, r: -.04 });
    put(g, 'tapeR', 110, 110, { s: slipS, r: -.7 });
    g.save(); g.translate(390, 142); g.rotate(-.04);
    writeText(g, 'Once upon a time…', 0, 0, prog(lt, .95, 1.95), { size: 70, color: INK });
    g.restore();
    // "Dresden"
    writeText(g, 'Dresden', 400, 330, prog(lt, 2.1, 2.65), { size: 170, color: '#c0392b', r: -.06 });
    const ul = []; for (let i = 0; i <= 20; i++) ul.push([160 + i * 25, 420 - i * 1.6 + Math.sin(i * 1.3) * 4]);
    inkLine(g, ul, { p: prog(lt, 2.55, 2.85), color: INK, w: 6, seed: 77 });
    starDoodle(g, 690, 250, 1, 5, { p: prog(lt, 2.75, 2.95), color: '#c0392b' });
    // birds
    if (lt > .4) { bird(g, 380 + lt * 95, 560 - lt * 12, 1, 0); bird(g, 300 + lt * 95, 600 - lt * 10, .75, 2); }
  },
});

/* ============================ 2  C64 ============================ */
defSheet('c64', '#d5ebdc', 'dots');
defSprite('c_desk', 1840, 270, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(0, 0, 1840, 270), '#a86f3e', R0, { amp: 2 });
  g.save(); pathPoly(g, p); g.clip();
  for (let i = 0; i < 26; i++) {
    const y = 14 + i * 10 + R0() * 6; const pts = [];
    for (let x = -20; x <= 1860; x += 40) pts.push([x, y + Math.sin(x * .004 + i) * 6 + R0() * 2]);
    g.strokeStyle = `rgba(80,40,10,${.15 + R0() * .2})`; g.lineWidth = 1 + R0() * 1.5; pathPoly(g, pts, false); g.stroke();
  }
  for (let i = 0; i < 4; i++) { const x = 200 + R0() * 1400, y = 60 + R0() * 150; g.strokeStyle = 'rgba(80,40,10,0.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 30, 10, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(x, y, 16, 5, 0, 0, TAU); g.stroke(); }
  g.fillStyle = 'rgba(255,230,190,0.25)'; g.fillRect(0, 0, 1840, 10);
  g.restore();
}, { border: 0, shadow: 1 });
defSprite('c_poster', 300, 300, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(0, 0, 300, 300), '#f2b134', R0, { amp: 2 });
  halftone(g, p, 'rgba(228,87,46,0.35)', 12, 3, .8);
  const inv = ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'];
  const px = 22, ox = 150 - 11 * px / 2, oy = 70;
  inv.forEach((row, y) => [...row].forEach((c, x) => { if (c === '1') { g.fillStyle = '#4b3fa0'; g.fillRect(ox + x * px + (R0() - .5) * 2, oy + y * px + (R0() - .5) * 2, px - 2, px - 2); } }));
  text(g, 'PLAY!', 150, 262, { f: 'pixel', size: 28, color: '#4b3fa0' });
}, { border: 6 });
defSprite('c_monitor', 760, 600, (g, rc, R, v, R0) => {
  const outer = tornPts(roundRectPts(0, 0, 760, 520, 46), R0, 1.2, 10);
  const hole = roundRectPts(80, 81, 600, 338, 30).reverse();
  g.beginPath(); pathPoly(g, outer); g.moveTo(hole[0][0], hole[0][1]); for (const q of hole) g.lineTo(q[0], q[1]); g.closePath();
  g.fillStyle = '#d9cfb6'; g.fill('evenodd');
  g.save(); g.clip('evenodd');
  const gr = g.createLinearGradient(0, 0, 0, 520); gr.addColorStop(0, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(90,60,20,0.18)');
  g.fillStyle = gr; g.fillRect(0, 0, 760, 520);
  g.restore();
  // bezel ring
  g.strokeStyle = '#4a4238'; g.lineWidth = 14; pathPoly(g, roundRectPts(74, 75, 612, 350, 34)); g.stroke();
  outline(rc, outer); rc.polygon(roundRectPts(66, 67, 628, 366, 38), { strokeWidth: 2 });
  // controls
  text(g, 'COMMODORE', 150, 470, { f: 'patrick', size: 28, color: '#6b5e4c' });
  for (let i = 0; i < 4; i++) { paper(g, ellPts(470 + i * 46, 470, 13, 13, 12), '#8b7d68', R0, { amp: .5 }); rc.circle(470 + i * 46, 470, 26, { strokeWidth: 1.6 }); }
  // stand
  const st = [[300, 515], [460, 515], [500, 600], [260, 600]];
  paper(g, st, '#c9bea3', R0, { amp: 1 }); outline(rc, st, { strokeWidth: 2 });
}, { border: 6 });
defSprite('c_c64', 760, 220, (g, rc, R, v, R0) => {
  const body = [[30, 40], [730, 40], [760, 200], [0, 200]];
  const bp = paper(g, roundRectPts(0, 30, 760, 180, 30).map(([x, y]) => [x + (y < 100 ? (x < 380 ? 18 : -18) * (100 - y) / 70 : 0), y]), '#ddd2b3', R0, { amp: 1.2 });
  outline(rc, bp);
  paper(g, [[40, 30], [720, 30], [740, 70], [20, 70]], '#cfc3a2', R0, { amp: .8 });
  // rainbow badge
  ['#e4572e', '#f28c28', '#f2c53d', '#5aa05a', '#4d7cc7'].forEach((c, i) => { g.fillStyle = c; g.fillRect(60, 44 + i * 4, 70, 3.2); });
  text(g, 'commodore 64', 210, 52, { f: 'patrick', size: 20, color: '#5c4f3e' });
  // keys
  const kw = 34, kh = 26;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 15; c++) {
    const x = 70 + c * 38 + r * 12, y = 84 + r * 30;
    const k = [[x, y], [x + kw, y], [x + kw, y + kh], [x, y + kh]];
    paper(g, k, '#5a4636', R0, { amp: .6, rim: false }); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 3, y + 3, kw - 6, 5);
  }
  paper(g, [[210, 206 - 10], [470, 196], [470, 188 + 12], [210, 200]], '#5a4636', R0, { amp: .5 });
  for (let i = 0; i < 4; i++) { const k = [[670, 80 + i * 30], [720, 80 + i * 30], [720, 104 + i * 30], [670, 104 + i * 30]]; paper(g, k, '#b59a78', R0, { amp: .6 }); rc.polygon(k, { strokeWidth: 1.4 }); }
}, { border: 6 });
defSprite('c_joy', 170, 240, (g, rc, R, v, R0) => {
  const base = [[10, 150], [160, 150], [170, 240], [0, 240]];
  paper(g, base, '#2b2522', R0, { amp: 1 }); outline(rc, base, { strokeWidth: 2 });
  paper(g, ellPts(40, 170, 16, 10, 12), '#e4572e', R0, { amp: .6 });
  const stick = [[76, 150], [94, 150], [92, 50], [78, 50]];
  paper(g, stick, '#2b2522', R0, { amp: .6 }); outline(rc, stick, { strokeWidth: 2 });
  const knob = paper(g, ellPts(85, 44, 30, 28, 18), '#e4572e', R0, { amp: 1 }); outline(rc, knob, { strokeWidth: 2 });
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(74, 34, 7, 0, TAU); g.fill();
}, { border: 5 });
defSprite('c_floppy', 190, 190, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(0, 0, 190, 190), '#26221f', R0, { amp: 1.2 }); outline(rc, p, { strokeWidth: 2 });
  g.fillStyle = '#d8d0c0'; g.beginPath(); g.arc(95, 110, 22, 0, TAU); g.fill(); g.fillStyle = '#26221f'; g.beginPath(); g.arc(95, 110, 9, 0, TAU); g.fill();
  g.fillStyle = '#8a8378'; g.fillRect(84, 140, 22, 44);
  const lab = [[18, 14], [172, 14], [172, 62], [18, 62]];
  paper(g, lab, '#fbf7ee', R0, { amp: 1 });
  text(g, 'GAMES!!', 95, 40, { f: 'marker', size: 30, color: '#c0392b', r: -.04 });
}, { border: 5 });
defSprite('c_label', 480, 110, (g, rc, R, v, R0) => { paper(g, rectPts(0, 0, 480, 110), '#fbf5e6', R0, { amp: 2.4, step: 7 }); }, { border: 0, shadow: .8, boil: false });
defSprite('c_qmark', 90, 130, (g, rc, R) => { text(g, '?', 45, 70, { size: 130, color: '#c0392b', stroke: '#fbf7ee', sw: 10 }); }, { border: 0, shadow: .5 });

/* ----- the C64 screen: in "screen space" 1920x1080. Also drawn as scene 3. ----- */
const C64 = { border: '#9a8ff0', bg: '#4a3fb0', fg: '#a79ef7' };
const SC_ON = SC.c64 + 2.2;       // power on
defSprite('h_eye', 300, 360, (g, rc, R, v, R0) => {
  const p = paper(g, ellPts(150, 180, 140, 170, 44), '#fbf8f0', R0, { amp: 1.6 }); outline(rc, p, { strokeWidth: 4 });
}, { border: 0, shadow: .8 });
defSprite('h_bubble', 560, 320, (g, rc, R, v, R0) => {
  const b = cloudPts(520, 260, R0, 9).map(([x, y]) => [x + 20, y - 20]);
  const tail = [[150, 200], [70, 310], [230, 220]];
  paper(g, tail, '#fbf8f0', R0, { amp: 1 }); const bp = paper(g, b, '#fbf8f0', R0, { amp: 1.5 }); outline(rc, bp, { strokeWidth: 3.5 });
  const letters = 'BEEP!', cols = ['#e4572e', '#f2b134', '#2a9d8f', '#4d7cc7', '#e4572e'], fonts = ['marker', 'pixel', 'marker', 'fred', 'marker'];
  letters.split('').forEach((ch, i) => {
    const x = 120 + i * 78, y = 145 + (i % 2 ? 10 : -6), r = (R0() - .5) * .35;
    g.save(); g.translate(x, y); g.rotate(r);
    paper(g, rectPts(-34, -44, 68, 88), cols[i], R0, { amp: 1.4 });
    text(g, ch, 0, 4, { f: fonts[i], size: fonts[i] === 'pixel' ? 46 : 72, color: '#fbf7ee' });
    g.restore();
  });
}, { border: 5 });
defSprite('h_hook', 110, 170, (g, rc, R, v, R0) => {
  g.lineCap = 'round'; g.strokeStyle = '#8f9aa3'; g.lineWidth = 14;
  g.beginPath(); g.moveTo(40, 10); g.lineTo(40, 110); g.arc(70, 110, 30, Math.PI, 0, true); g.lineTo(100, 80); g.stroke();
  g.strokeStyle = '#dfe6ea'; g.lineWidth = 4; g.beginPath(); g.moveTo(36, 16); g.lineTo(36, 100); g.stroke();
  const barb = [[100, 70], [110, 96], [92, 92]]; fillPoly(g, barb, '#8f9aa3');
  g.fillStyle = '#8f9aa3'; g.beginPath(); g.arc(40, 10, 11, 0, TAU); g.fill();
  g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.arc(40, 10, 11, 0, TAU); g.stroke();
}, { border: 4, shadow: .6 });
defSprite('heart', 70, 64, (g, rc, R, v, R0) => {
  const p = []; for (let i = 0; i <= 40; i++) { const t = i / 40 * TAU; p.push([35 + 16 * Math.pow(Math.sin(t), 3) * 1.9, 30 - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 1.9]); }
  paper(g, p, '#e4572e', R0, { amp: .8 }); outline(rc, p, { strokeWidth: 2 });
}, { border: 3, shadow: .4 });

function c64Text(g, str, col, row, color = C64.fg) {
  g.font = font(FONT.pixel, 36); g.textBaseline = 'top'; g.textAlign = 'left'; g.fillStyle = color;
  g.fillText(str, 200 + col * 38, 150 + row * 46);
}
function drawScreen(g) {
  const lt = T - SC.hooked;
  g.save();
  pathPoly(g, roundRectPts(0, 0, W, H, 90)); g.clip();
  if (T < SC_ON) {
    g.fillStyle = '#26332f'; g.fillRect(0, 0, W, H);
  } else {
    // power-on: bright line opening up
    const on = prog(T, SC_ON, SC_ON + .28);
    let shx = 0, shy = 0;
    if (lt > 1.22 && lt < 1.7) { const k = 1 - prog(lt, 1.22, 1.7); shx = Math.sin(lt * 90) * 24 * k; shy = Math.cos(lt * 70) * 14 * k; }
    g.fillStyle = C64.border; g.fillRect(0, 0, W, H);
    g.save(); g.translate(shx, shy);
    g.fillStyle = C64.bg; g.fillRect(160, 110, W - 320, H - 220);
    g.beginPath(); g.rect(160, 110, W - 320, H - 220); g.clip();
    const cleared = lt > 3.4;
    if (!cleared) {
      const typed = (str, t0, cps = 90) => str.slice(0, Math.max(0, Math.floor((T - t0) * cps)));
      c64Text(g, typed('    **** COMMODORE 64 BASIC V2 ****', SC_ON + .3), 0, 1);
      c64Text(g, typed(' 64K RAM SYSTEM  38911 BASIC BYTES FREE', SC_ON + .55), 0, 3);
      if (T > SC_ON + .95) c64Text(g, 'READY.', 0, 5);
      if (T > SC_ON + 1 && Math.floor(T / .33) % 2 === 0) { g.fillStyle = C64.fg; g.fillRect(200, 150 + 6 * 46, 36, 40); }
    } else {
      const typed = (str, t0, cps = 38) => str.slice(0, Math.max(0, Math.floor((lt - t0) * cps)));
      c64Text(g, typed('10 PRINT "LARS ";', 3.42), 0, 0);
      c64Text(g, typed('20 GOTO 10', 3.62), 0, 1);
      c64Text(g, typed('RUN', 3.8), 0, 2);
      if (lt > 3.86) {
        const rows = Math.floor((lt - 3.86) * 24);
        const vis = 18, first = Math.max(0, rows - vis + 3);
        const line = 'LARS LARS LARS LARS LARS LARS LARS LARS';
        for (let r = first; r < rows; r++) c64Text(g, r === rows - 1 ? line.slice(0, 5 * (1 + Math.floor((lt * 60) % 8))) : line, 0, 3 + r - first - (rows > vis - 3 ? 0 : 0));
      }
    }
    // --- the screen comes alive: eyes, beep, hook ---
    const eyeS = pop(.02, .4, lt) * popOut(1.95, .25, lt);
    if (eyeS > 0) {
      const blink = (a) => 1 - Math.sin(Math.PI * prog(lt, a, a + .16)) * .92;
      const sy = blink(.38) * blink(.78) * (lt > 1.22 && lt < 1.9 ? 1.12 : 1);
      const look = lt < 1.2 ? Math.sin(lt * 3) * 30 : 30;
      [[740, 600], [1180, 600]].forEach(([x, y], i) => {
        put(g, 'h_eye', x, y, { s: eyeS, sy, r: i ? .05 : -.05 });
        if (sy > .3) {
          g.save(); g.translate(x + look, y + 30 * sy); g.scale(eyeS, eyeS * sy);
          g.fillStyle = INK; g.beginPath(); g.arc(0, 0, 58, 0, TAU); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(18, -20, 16, 0, TAU); g.fill();
          g.restore();
        }
      });
    }
    const bs = pop(1.22, .35, lt) * popOut(2.2, .2, lt);
    if (bs > 0) { put(g, 'h_bubble', 1420, 300, { s: bs, r: .06 + wob(4, .02) }); actionLines(g, 1420, 300, SC.hooked + 1.22, { r0: 230, len: 90, w: 8, color: '#fbf7ee' }); }
    // kid face + hook
    const up = lt > 2.95 ? E.in(prog(lt, 2.95, 3.35)) * 1500 : 0;
    const tug = lt > 2.72 && lt < 2.95 ? Math.sin((lt - 2.72) * 40) * 12 : 0;
    if (lt > 1.95 && lt < 3.4) {
      const ky = 740 + (1 - E.back(prog(lt, 1.98, 2.4))) * 800 - up + tug;
      put(g, 'kidface', 960, ky, { r: prog(lt, 2.95, 3.35) * .2 + sway(.02, .8) });
      // bait: a floppy disk on a fishing hook, dangling right at his mouth
      const hy = lt < 2.72 ? lerp(-300, ky + 60, E.out(prog(lt, 2.2, 2.7))) : ky + 60;
      const dang = lt < 2.72 ? Math.sin(lt * 7) * .12 * (1 - prog(lt, 2.4, 2.72)) : 0;
      g.save(); g.translate(960, hy); g.rotate(dang);
      inkLine(g, [[0, -hy - 80], [0, -150]], { w: 4, color: '#2a1d14', seed: 9, wob: .6, passes: 1 });
      put(g, 'h_hook', 30, -150, { ay: .05, s: 1.1, r: -.05 });
      put(g, 'c_floppy', 50, 30, { s: .62, r: .35 + sway(.05, 1.3) });
      g.restore();
    }
    // hearts when he's hooked
    for (let i = 0; i < 9; i++) {
      const t0 = 2.9 + i * .06, dt = lt - t0; if (dt < 0 || dt > 1.2) continue;
      const R = mulberry32(300 + i), x = 700 + R() * 520 + Math.sin(dt * 6 + i) * 30, y = 820 - dt * (380 + R() * 240) - up * .2;
      put(g, 'heart', x, y, { s: E.back(prog(dt, 0, .25)) * (1.2 + R()), a: 1 - prog(dt, .8, 1.2), r: (R() - .5) * .6 });
    }
    // Forever: infinity symbol
    if (lt > 3.6) {
      const inf = []; for (let i = 0; i <= 120; i++) { const t = i / 120 * TAU + Math.PI / 2, d = 1 + Math.sin(t) ** 2; inf.push([960 + 520 * Math.cos(t) / d, 600 + 520 * Math.sin(t) * Math.cos(t) / d]); }
      const p = prog(lt, 3.55, 4.0);
      inkLine(g, inf, { p, color: '#f2b134', w: 34, seed: 21, wob: 2.5 });
      inkLine(g, inf, { p, color: '#e4572e', w: 10, seed: 22, wob: 3, passes: 1 });
      sparkle(g, 1480, 400, 2, SC.hooked + 3.9); sparkle(g, 440, 790, 1.6, SC.hooked + 4.0);
    }
    g.restore();
    // turn-on mask
    if (on < 1) {
      g.fillStyle = '#26332f'; const hh = (H / 2) * E.out(on);
      g.fillRect(0, 0, W, H / 2 - hh - 4); g.fillRect(0, H / 2 + hh + 4, W, H / 2);
      g.fillStyle = `rgba(255,255,255,${1 - on})`; g.fillRect(0, H / 2 - hh - 6, W, 12 + hh * 2 * (1 - on));
    }
    // CRT: scanlines + glow
    g.fillStyle = 'rgba(0,0,0,0.10)'; for (let y = 0; y < H; y += 7) g.fillRect(0, y, W, 3);
    if (Math.floor(T * 24) % 5 === 0) { g.fillStyle = 'rgba(255,255,255,0.025)'; g.fillRect(0, 0, W, H); }
  }
  const vg = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // glass reflection
  g.fillStyle = 'rgba(255,255,255,0.045)';
  g.beginPath(); g.moveTo(120, 60); g.lineTo(820, 60); g.lineTo(480, 560); g.lineTo(120, 700); g.closePath(); g.fill();
  g.restore();
}

defScene('c64', {
  sheet: 'c64', t1: SC.boots,
  draw(g, lt) {
    const t = T;
    put(g, 'c_poster', 330, 260, { s: pop(SC.c64 + .1, .5), r: -.06 + sway(.01, .3) });
    put(g, 'tapeB', 330, 110, { s: pop(SC.c64 + .2, .3), r: .05 });
    // kid rising from behind the desk, then leaning in; gone once hooked
    if (t < SC.hooked + 2.95) {
      const rise = (1 - E.back(prog(lt, .2, .75))) * 520;
      const lean = E.inOut(prog(lt, 3.3, 4.2)) * 60;
      put(g, 'kid', 470 + lean, 640 + rise + sway(4, .9), { r: lean * .003 + sway(.02, .45) });
      if (lt > .9) put(g, 'c_qmark', 620, 330 + sway(6, 1), { s: pop(SC.c64 + .9, .4) * popOut(SC.c64 + 2.1, .2), r: sway(.1, .8) });
    }
    // monitor (screen content first, then casing on top)
    const mp = prog(lt, 1.5, 2.1), my = (1 - E.bounce(mp)) * -900;
    if (mp > 0) {
      g.save(); g.translate(SCREEN.x, SCREEN.y + my); g.scale(SCREEN.w / W, SCREEN.w / W); g.translate(-W / 2, -H / 2);
      drawScreen(g);
      g.restore();
      put(g, 'c_monitor', 1290, 490 + my, { r: sway(.004, .3) });
    }
    put(g, 'c_desk', 960, 925);
    const cp = prog(lt, 1.7, 2.25);
    if (cp > 0) put(g, 'c_c64', 1190 + (1 - E.out5(cp)) * 1300, 880, { r: (1 - E.elastic(cp)) * .2 });
    put(g, 'c_joy', 1760, 800, { s: pop(SC.c64 + 2.0, .5), r: .08 + sway(.02, .5) });
    put(g, 'c_floppy', 300, 950, { s: pop(SC.c64 + 1.9, .45), r: -.2 });
    // label
    const lp = pop(SC.c64 + 2.3, .4);
    put(g, 'c_label', 660, 985, { s: lp, r: -.03 });
    g.save(); g.translate(660, 988); g.rotate(-.03);
    writeText(g, 'the Commodore 64!', 0, 0, prog(lt, 2.4, 3.3), { size: 62, color: INK });
    g.restore();
    inkLine(g, spline([[890, 970], [930, 930], [940, 900]], 8), { p: prog(lt, 3.2, 3.5), w: 5, seed: 12 });
    inkLine(g, [[922, 912], [940, 896], [952, 918]], { p: prog(lt, 3.45, 3.55), w: 5, seed: 13 });
    sparkle(g, 1660, 170, 1.4, SC.c64 + 2.5); sparkle(g, 920, 230, 1.1, SC.c64 + 2.7); sparkle(g, 1720, 640, 1, SC.c64 + 3.2);
  },
});
/* scene 3 lives inside the monitor: it only needs a camera target */
defScene('hooked', { noDraw: true });

/* ---------------- sfx for scenes 1-3 ---------------- */
(function () {
  const d = SC.dresden;
  [.15, .3, .45, .55].forEach(t => cue(d + t, 'pop', { v: .35 }));
  cue(d + .3, 'rustle', { dur: .35, v: .5 });
  cue(d + .55, 'rustle', { dur: .3, v: .5 });
  cue(d + .95, 'pencil', { dur: 1, v: .35 });
  [2.02, 2.2, 2.3, 2.35, 2.45].forEach((t, i) => cue(d + t, 'slide', { v: .45, pitch: 1 + i * .08 }));
  cue(d + 2.6, 'slide', { v: .4, pitch: .8 });
  cue(d + 2.1, 'pencil', { dur: .55, v: .4 });
  cue(d + 2.95, 'plop', { v: .45 });
  cue(d + 3.2, 'pencil', { dur: .4, v: .3 });
  cue(d + 0, 'birds', { v: .12, dur: 4 });
  cue(d + 0, 'water', { v: .15, dur: 4.6 });

  const c = SC.c64;
  cue(c - .45, 'whoosh', { dur: .9, v: .55 });
  cue(c + .1, 'pop', { v: .3 });
  cue(c + .2, 'slide', { v: .45, pitch: .7 });
  cue(c + .9, 'boing', { v: .25, pitch: 1.4 });
  cue(c + 1.5, 'whoosh', { dur: .35, v: .35 });
  cue(c + 1.76, 'thud', { v: .7 });
  cue(c + 1.7, 'slide', { v: .5, pitch: .6 });
  cue(c + 1.9, 'pop', { v: .35 }); cue(c + 2.0, 'pop', { v: .35, pitch: 1.2 });
  cue(SC_ON, 'crton', { v: .45 });
  cue(SC_ON + .95, 'c64beep', { v: .18, f: 1600, dur: .05 });
  cue(c + 2.4, 'pencil', { dur: .9, v: .35 });
  shake(c + 1.76, 7);

  const h = SC.hooked;
  cue(h - .75, 'zoom', { dur: 1.1, v: .5 });
  cue(h + .02, 'pop', { v: .4 }); cue(h + .08, 'pop', { v: .35, pitch: 1.2 });
  cue(h + .38, 'blink', { v: .5 }); cue(h + .78, 'blink', { v: .5 });
  cue(h + 1.22, 'c64beep', { v: .5, f: 988, dur: .32 });
  cue(h + 1.95, 'pop', { v: .3, pitch: .8 });
  cue(h + 2.0, 'slide', { v: .45, pitch: .8 });
  cue(h + 2.2, 'reel', { dur: .5, v: .4 });
  cue(h + 2.72, 'boing', { v: .5 });
  cue(h + 2.95, 'whoosh', { dur: .45, v: .6, up: true });
  cue(h + 3.42, 'keys', { n: 17, rate: 38, v: .35 });
  cue(h + 3.62, 'keys', { n: 10, rate: 38, v: .35 });
  cue(h + 3.62, 'marker', { dur: .65, v: .35 });
  cue(h + 3.8, 'keys', { n: 3, rate: 38, v: .35 });
})();
