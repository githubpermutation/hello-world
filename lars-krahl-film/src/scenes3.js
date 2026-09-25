'use strict';
/* =====================================================================
 *  scenes3.js - 8 Python, 9 Curious (montage), 10 Outro
 * ===================================================================== */

/* ============================ 8  PYTHON ============================ */
defSheet('python', '#f4e3b0', 'dots', { dot: 'rgba(140,100,20,0.16)' });
defSprite('py_board', 640, 540, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(0, 0, 640, 540), '#b98150', R0, { amp: 2 }); outline(rc, p);
  g.fillStyle = 'rgba(60,30,10,0.55)';
  for (let x = 30; x < 640; x += 40) for (let y = 30; y < 540; y += 40) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
}, { border: 5 });
defSprite('py_hammer', 120, 320, (g, rc, R, v, R0) => {
  const h = [[48, 70], [72, 70], [74, 318], [46, 318]]; paper(g, h, '#d9a066', R0, { amp: .8 }); outline(rc, h, { strokeWidth: 2 });
  const hd = [[0, 18], [120, 18], [120, 76], [0, 76]]; paper(g, hd, '#8f9aa3', R0, { amp: .8 }); outline(rc, hd, { strokeWidth: 2 });
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(6, 24, 108, 8);
}, { border: 4 });
defSprite('py_screw', 70, 300, (g, rc, R, v, R0) => {
  const hd = roundRectPts(8, 0, 54, 120, 18); paper(g, hd, '#e4572e', R0, { amp: .8 }); outline(rc, hd, { strokeWidth: 2 });
  for (let i = 0; i < 3; i++) rc.line(22 + i * 13, 16, 22 + i * 13, 104, { strokeWidth: 1.6 });
  const sh = [[28, 120], [42, 120], [42, 290], [35, 300], [28, 290]]; paper(g, sh, '#aab4bb', R0, { amp: .5 }); outline(rc, sh, { strokeWidth: 2 });
}, { border: 4 });
function wrenchPath(g) {
  g.beginPath();
  g.moveTo(44, 90); g.lineTo(44, 250);
  g.arc(60, 290, 44, -Math.PI * .62, Math.PI * 1.62, false);
  g.lineTo(76, 250); g.lineTo(76, 90);
  g.arc(60, 56, 56, Math.PI * .62, Math.PI * .2, false);
  g.lineTo(84, 20); g.lineTo(84, -2); g.lineTo(36, -2); g.lineTo(36, 20);
  g.arc(60, 56, 56, Math.PI * .8, Math.PI * .38, true);
  g.closePath();
  g.moveTo(80, 290); g.arc(60, 290, 20, 0, TAU);
}
defSprite('wrench', 120, 340, (g, rc, R, v, R0) => {
  wrenchPath(g); g.fillStyle = '#aab4bb'; g.fill('evenodd');
  g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(50, 100, 6, 140);
  text(g, 'py', 60, 170, { f: 'pixel', size: 16, color: '#3b6ea5', r: Math.PI / 2 });
}, { border: 5 });
defSprite('py_note', 720, 540, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(0, 0, 720, 540), '#fdfbf4', R0, { amp: 1.6 });
  for (let y = 90; y < 540; y += 62) rc.line(20, y, 700, y, { stroke: 'rgba(80,120,200,0.45)', strokeWidth: 1.4 });
  rc.line(96, 10, 96, 530, { stroke: 'rgba(220,60,60,0.55)', strokeWidth: 2 });
  for (let y = 40; y < 540; y += 54) { g.fillStyle = '#e7e0cf'; g.beginPath(); g.arc(40, y, 11, 0, TAU); g.fill(); rc.circle(40, y, 22, { strokeWidth: 1.6 }); }
  text(g, 'my_tools.py', 690, 50, { f: 'gochi', size: 30, align: 'right', color: '#8a7a66' });
}, { border: 4 });
defSprite('py_basket', 320, 250, (g, rc, R, v, R0) => {
  const body = [[20, 60], [300, 60], [262, 250], [58, 250]];
  const bp = paper(g, body, '#c99b5a', R0, { amp: 1.2 });
  g.save(); pathPoly(g, bp); g.clip();
  for (let y = 60; y < 250; y += 24) for (let x = 0; x < 320; x += 36) { g.fillStyle = (x / 36 + (y - 60) / 24) % 2 ? 'rgba(110,60,15,0.5)' : 'rgba(255,230,180,0.35)'; g.fillRect(x, y, 36, 24); }
  g.restore(); outline(rc, bp);
  const rim = paper(g, ellPts(160, 62, 150, 30, 30), '#a8763f', R0, { amp: 1 }); outline(rc, rim, { strokeWidth: 2 });
  paper(g, ellPts(160, 58, 120, 18, 24), '#3d2a18', R0, { amp: .8, rim: false });
}, { border: 5 });
defSprite('py_head', 180, 130, (g, rc, R, v, R0) => {
  const hp = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; hp.push([80 + Math.cos(a) * (a > -1.2 && a < 1.2 || a > 5.1 ? 95 : 78), 65 + Math.sin(a) * 55]); }
  const h = paper(g, hp, '#3b6ea5', R0, { amp: 1 }); outline(rc, h);
  paper(g, ellPts(70, 38, 50, 20, 20), '#f2c53d', R0, { amp: .8, rim: false });
  for (const [x, y] of [[70, 50], [120, 48]]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, 17, 20, 0, 0, TAU); g.fill(); rc.ellipse(x, y, 34, 40, { strokeWidth: 2 }); g.fillStyle = INK; g.beginPath(); g.arc(x + 5, y + 3, 9, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 8, y - 1, 3, 0, TAU); g.fill(); }
  rc.arc(130, 88, 60, 30, .1, Math.PI * .8, false, { strokeWidth: 2.4 });
  g.fillStyle = CHEEK; g.beginPath(); g.ellipse(96, 86, 12, 7, 0, 0, TAU); g.fill();
}, { border: 5 });
const PY_LINES = [['def new_tool():', 1060, 392, 2.42, 3.0], ['    return magic()', 1060, 470, 3.05, 3.55]];
function snakeHead(lt) {
  if (lt < 2.35) { const p = E.out(prog(lt, 1.9, 2.35)); return [lerp(960, 1060, p), lerp(900, 402, p), -.3 * (1 - p)]; }
  for (const [str, x, y, a, b] of PY_LINES) {
    if (lt <= b + .05) {
      const p = prog(lt, a, b), w = measure(str, 'gochi', 54);
      return [x + w * p + 6, y + 10 + Math.sin(lt * 40) * 6 * (p > 0 && p < 1 ? 1 : 0), .05 + Math.sin(lt * 30) * .05];
    }
  }
  const p = E.inOut(prog(lt, 3.6, 4.1));
  return [lerp(1500, 1250, p), lerp(480, 700, p), lerp(.05, -.1, p)];
}
defScene('python', {
  sheet: 'python',
  draw(g, lt) {
    const S = SC.python;
    put(g, 'py_board', 480, 470, { s: pop(S + .05, .5), r: -.02 });
    put(g, 'py_hammer', 300, 470, { s: pop(S + .2, .45), r: .08 + sway(.02, .6) });
    put(g, 'py_screw', 690, 470, { s: pop(S + .3, .45), r: -.06 + sway(.02, .7, 1) });
    // the missing tool: dashed outline, then the real one
    g.save(); g.translate(440, 460); g.rotate(.05); g.translate(-60, -170);
    g.setLineDash([14, 12]); g.lineDashOffset = -stepT() * 30; g.strokeStyle = '#fbf7ee'; g.lineWidth = 5;
    wrenchPath(g); g.globalAlpha = prog(lt, .3, .6); g.stroke(); g.restore();
    const qs = pop(S + .9, .45) * popOut(S + 3.45, .15);
    if (qs > 0) text(g, '?', 440 + wob(3, 3), 470, { size: 260, color: '#e4572e', stroke: '#fbf7ee', sw: 14, r: sway(.12, 1.2), alpha: qs });
    const ws = pop(S + 3.5, .5);
    if (ws > 0) { put(g, 'wrench', 440, 460, { s: ws, r: .05 }); sparkle(g, 520, 300, 1.6, S + 3.6); sparkle(g, 360, 620, 1.2, S + 3.7); }
    // notebook + code
    put(g, 'py_note', 1300, 470, { s: pop(S + .12, .5), r: .02 });
    g.save(); g.translate(1300, 470); g.rotate(.02); g.translate(-1300, -470);
    for (const [str, x, y, a, b] of PY_LINES) writeText(g, str, x, y, prog(lt, a, b), { f: 'gochi', size: 54, align: 'left', color: str.startsWith('def') ? '#3b6ea5' : INK });
    g.restore();
    // snake rising from the basket
    if (lt > 1.9) {
      const [wx, wy, hr] = snakeHead(lt);           // pencil tip (writing point)
      const hx = wx - 6, hy = wy - 172;
      const base = [960, 880];
      const ctrl = [base, [base[0] - 40, base[1] - 120], [lerp(base[0], hx, .45) - 80, lerp(base[1], hy, .55) + 40], [hx - 70, hy + 20], [hx - 20, hy]];
      const body = spline(ctrl, 10).map(([x, y], i, arr) => {
        const f = i / (arr.length - 1), w = Math.sin(f * 12 - stepT() * 8) * 14 * Math.sin(f * Math.PI);
        return [x + w, y + w * .4];
      });
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      const st = (w, c, dash) => { g.strokeStyle = c; g.lineWidth = w; g.setLineDash(dash || []); g.lineDashOffset = -stepT() * 20; pathPoly(g, body, false); g.stroke(); };
      st(56, INK); st(48, '#3b6ea5'); st(48, '#f2c53d', [26, 34]); st(10, 'rgba(255,255,255,0.35)');
      g.restore();
      // pencil in the mouth + head
      put(g, 'pencil', wx, wy, { s: .34, ax: 0, r: -1.0 + hr * .5 });
      put(g, 'py_head', hx, hy, { r: hr, ax: .3 });
      if (Math.floor(lt * 3) % 3 === 0) inkLine(g, [[hx + 95, hy + 8], [hx + 130, hy + 2], [hx + 145, hy - 8], [hx + 130, hy + 2], [hx + 146, hy + 12]], { w: 4, color: '#e4572e', seed: 45, passes: 1 });
    }
    put(g, 'py_basket', 960, 930, { s: pop(S + 1.7, .45) });
    writeText(g, 'Python!', 1560, 800, prog(lt, 3.45, 3.95), { size: 120, color: '#3b6ea5', r: -.06 });
    const ul = []; for (let i = 0; i <= 12; i++) ul.push([1400 + i * 28, 870 + Math.sin(i) * 4]);
    inkLine(g, ul, { p: prog(lt, 3.9, 4.1), color: '#f2b134', w: 8, seed: 46 });
  },
});

/* ============================ 9  CURIOUS ============================ */
defSheet('curious', '#f8f6ef', 'grid');
const NET_N = [[60, 70, '#e4572e'], [190, 40, '#2a9d8f'], [320, 90, '#f2b134'], [110, 200, '#4d7cc7'], [260, 220, '#8e6cc2'], [190, 130, '#fbf7ee']];
const NET_L = [[0, 1], [1, 2], [0, 3], [3, 4], [4, 2], [5, 0], [5, 2], [5, 3], [5, 4], [1, 5]];
defSprite('cu_net', 380, 280, (g, rc, R, v, R0) => {
  for (const [a, b] of NET_L) rc.line(NET_N[a][0], NET_N[a][1], NET_N[b][0], NET_N[b][1], { strokeWidth: 3 });
  for (const [x, y, c] of NET_N) { const p = paper(g, ellPts(x, y, 30, 30, 22), c, R0, { amp: 1 }); outline(rc, p, { strokeWidth: 2.4 }); }
  g.fillStyle = INK; const [x, y] = NET_N[5]; g.fillRect(x - 14, y - 8, 28, 16);
}, { border: 5 });
defSprite('cu_web', 440, 320, (g, rc, R, v, R0) => {
  const w = paper(g, rectPts(0, 0, 440, 320), '#fbf7ee', R0, { amp: 1.2 }); outline(rc, w);
  paper(g, rectPts(0, 0, 440, 44), '#4d7cc7', R0, { amp: .8 });
  ['#e4572e', '#f2b134', '#2a9d8f'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(24 + i * 26, 22, 8, 0, TAU); g.fill(); });
  paper(g, [[110, 10], [420, 10], [420, 34], [110, 34]], '#fbf7ee', R0, { amp: .5, rim: false });
  text(g, 'http://', 120, 23, { f: 'patrick', size: 20, color: '#8a7a66', align: 'left' });
  paper(g, [[20, 62], [420, 62], [420, 110], [20, 110]], '#f4a6a6', R0, { amp: .8 });
  const img = [[20, 128], [200, 128], [200, 300], [20, 300]]; paper(g, img, '#8ecae6', R0, { amp: .8 });
  fillPoly(g, [[30, 290], [90, 190], [130, 250], [150, 220], [190, 290]], '#2a9d8f');
  g.fillStyle = '#f2b134'; g.beginPath(); g.arc(160, 165, 16, 0, TAU); g.fill();
  for (let i = 0; i < 6; i++) rc.line(220, 140 + i * 28, 220 + 190 * (i === 5 ? .5 : .85 + R0() * .15), 140 + i * 28, { strokeWidth: 3, stroke: '#b9ad9a' });
}, { border: 5 });
defSprite('cu_gfx', 400, 300, (g, rc, R, v, R0) => {
  const pal = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; pal.push([200 + Math.cos(a) * 180 * (1 + .08 * Math.sin(a * 3)), 160 + Math.sin(a) * 120]); }
  const pp = paper(g, pal, '#d9a066', R0, { amp: 1.2 }); outline(rc, pp);
  g.fillStyle = '#f8f6ef'; g.beginPath(); g.ellipse(250, 210, 34, 26, 0, 0, TAU); g.fill(); rc.ellipse(250, 210, 68, 52, { strokeWidth: 2 });
  [['#e4572e', 90, 120], ['#f2b134', 160, 80], ['#2a9d8f', 240, 80], ['#4d7cc7', 310, 120], ['#8e6cc2', 110, 200], ['#fbf7ee', 330, 200]].forEach(([c, x, y]) => { const b = paper(g, ellPts(x, y, 26, 22, 18), c, R0, { amp: 2.4 }); outline(rc, b, { strokeWidth: 1.6 }); });
  const br = [[250, 250], [390, 20], [400, 28], [262, 258]]; paper(g, br, '#c0392b', R0, { amp: .6 }); outline(rc, br, { strokeWidth: 2 });
  fillPoly(g, [[250, 250], [236, 280], [262, 262]], INK);
}, { border: 5 });
defSprite('cu_video', 340, 280, (g, rc, R, v, R0) => {
  const b = paper(g, rectPts(0, 60, 340, 220), '#2b2522', R0, { amp: 1.2 }); outline(rc, b);
  text(g, 'SCENE 1', 30, 130, { f: 'marker', size: 34, color: '#fbf7ee', align: 'left' });
  text(g, 'TAKE 64', 30, 190, { f: 'marker', size: 34, color: '#f2b134', align: 'left' });
  text(g, 'dir: Lars', 30, 245, { f: 'gochi', size: 30, color: '#fbf7ee', align: 'left' });
  paper(g, rectPts(0, 20, 340, 40), '#fbf7ee', R0, { amp: .8 });
  g.save(); g.beginPath(); g.rect(0, 20, 340, 40); g.clip(); g.fillStyle = '#2b2522'; for (let x = -20; x < 360; x += 60) { g.beginPath(); g.moveTo(x, 60); g.lineTo(x + 30, 60); g.lineTo(x + 60, 20); g.lineTo(x + 30, 20); g.fill(); } g.restore();
}, { border: 5 });
defSprite('cu_clap', 350, 50, (g, rc, R, v, R0) => {
  paper(g, rectPts(0, 5, 350, 40), '#fbf7ee', R0, { amp: .8 });
  g.save(); g.beginPath(); g.rect(0, 5, 350, 40); g.clip(); g.fillStyle = '#2b2522'; for (let x = -20; x < 370; x += 60) { g.beginPath(); g.moveTo(x, 5); g.lineTo(x + 30, 5); g.lineTo(x + 60, 45); g.lineTo(x + 30, 45); g.fill(); } g.restore();
  rc.rectangle(0, 5, 350, 40, { strokeWidth: 2 });
}, { border: 4 });
defSprite('cu_phones', 230, 220, (g, rc, R, v, R0) => {
  g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 26; g.beginPath(); g.arc(115, 130, 90, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  g.strokeStyle = '#e4572e'; g.lineWidth = 16; g.beginPath(); g.arc(115, 130, 90, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  for (const x of [22, 208]) { const c = paper(g, roundRectPts(x - 24, 110, 48, 100, 22), '#2b2522', R0, { amp: .8 }); outline(rc, c, { strokeWidth: 2 }); paper(g, roundRectPts(x - 14, 124, 28, 72, 12), '#e4572e', R0, { amp: .6, rim: false }); }
}, { border: 5 });
defSprite('cu_socket', 170, 200, (g, rc, R, v, R0) => {
  const p = paper(g, roundRectPts(0, 0, 170, 200, 26), '#fbf7ee', R0, { amp: .8 }); outline(rc, p);
  const c = paper(g, ellPts(85, 100, 58, 58, 30), '#ece5d4', R0, { amp: .6 }); outline(rc, c, { strokeWidth: 2 });
  g.fillStyle = INK; g.beginPath(); g.arc(62, 100, 9, 0, TAU); g.arc(108, 100, 9, 0, TAU); g.fill();
  g.fillStyle = '#8f9aa3'; g.fillRect(80, 44, 10, 14); g.fillRect(80, 142, 10, 14);
}, { border: 5 });
defSprite('cu_plug', 210, 130, (g, rc, R, v, R0) => {
  g.fillStyle = '#aab4bb'; g.fillRect(0, 42, 70, 14); g.fillRect(0, 76, 70, 14);
  g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(0, 42, 70, 14); g.strokeRect(0, 76, 70, 14);
  const b = roundRectPts(60, 8, 120, 116, 40); const bp = paper(g, b, '#2b2522', R0, { amp: .8 }); outline(rc, bp);
  paper(g, [[176, 50], [210, 56], [210, 76], [176, 82]], '#2b2522', R0, { amp: .6 });
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(80, 22, 70, 8);
}, { border: 5 });
[['cu_bulb0', '#e8e4d6'], ['cu_bulb1', '#ffe36e']].forEach(([k, c]) => defSprite(k, 170, 250, (g, rc, R, v, R0) => {
  const gl = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; const r = a > .3 && a < Math.PI - .3 ? 50 : 75; gl.push([85 + Math.cos(a) * r, 85 + Math.sin(a) * (a > 0 && a < Math.PI ? 90 : 75)]); }
  const gp = paper(g, gl, c, R0, { amp: 1 }); outline(rc, gp);
  rc.curve([[66, 150], [72, 100], [85, 120], [98, 100], [104, 150]], { strokeWidth: 2.4, stroke: k === 'cu_bulb1' ? '#e4572e' : '#8a7a66' });
  const base = [[52, 170], [118, 170], [112, 230], [58, 230]]; paper(g, base, '#8f9aa3', R0, { amp: .6 }); outline(rc, base, { strokeWidth: 2 });
  for (let y = 182; y < 230; y += 14) rc.line(54, y, 116, y + 4, { strokeWidth: 1.6 });
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(58, 60, 12, 26, .4, 0, TAU); g.fill();
}, { border: 5 }));
const CUR_ITEMS = [
  { key: 'cu_net', x: 360, y: 280, t: .07, label: 'Networks', r: -.06 },
  { key: 'cu_web', x: 1560, y: 250, t: .97, label: 'Web design', r: .05, ly: 225 },
  { key: 'cu_gfx', x: 350, y: 770, t: 2.07, label: 'Graphics', r: .04 },
  { key: 'cu_video', x: 1580, y: 770, t: 2.97, label: 'Video', r: -.05 },
  { key: 'cu_phones', x: 820, y: 930, t: 3.72, label: 'Audio', r: .02 },
];
const PLUG_T = 9 * BEAT, BULB_T = 10 * BEAT;   // bar 19 beats 1 and 2
defScene('curious', {
  sheet: 'curious',
  draw(g, lt) {
    const S = SC.curious, powered = lt > PLUG_T;
    const glowK = powered ? 1 - prog(lt, PLUG_T, 6.8) * .6 : 0;
    // Lars in the middle
    const ls = prog(lt, 0, .45), hop = Math.abs(Math.sin(prog(lt, PLUG_T, PLUG_T + .45) * Math.PI)) * 60;
    const look = CUR_ITEMS.reduce((a, it) => lt > it.t ? (it.x < 960 ? -1 : 1) : a, 0);
    put(g, 'lars', 960, 600 + (1 - E.back(ls)) * 700 - hop, { s: .78, r: look * .05 + sway(.02, .6) });
    // slam-in items
    CUR_ITEMS.forEach((it, i) => {
      const dt = lt - it.t; if (dt < 0) return;
      const p = E.out(prog(dt, 0, .22));
      const s = lerp(1.9, 1, p) * (1 + (powered ? Math.abs(Math.sin((lt - PLUG_T) * 9 + i)) * .06 * glowK : 0));
      const x = it.x, y = it.y;
      if (powered && glowK > 0) { const gr = g.createRadialGradient(x, y, 40, x, y, 260); gr.addColorStop(0, `rgba(255,230,120,${.45 * glowK})`); gr.addColorStop(1, 'rgba(255,230,120,0)'); g.fillStyle = gr; g.fillRect(x - 260, y - 260, 520, 520); }
      put(g, it.key, x, y, { s, a: prog(dt, 0, .06), r: it.r + (1 - p) * .25 + sway(.02, .5, i) });
      actionLines(g, x, y, S + it.t + .18, { r0: 190, len: 60, w: 6, n: 10, seed: i + 3 });
      // item extras
      if (it.key === 'cu_net') for (let k = 0; k < 4; k++) {
        const [a, b] = NET_L[(k * 3) % NET_L.length], f = ((lt * .9 + k * .27) % 1);
        const px = x - 190 + lerp(NET_N[a][0], NET_N[b][0], f), py = y - 140 + lerp(NET_N[a][1], NET_N[b][1], f);
        g.fillStyle = '#e4572e'; g.beginPath(); g.arc(px, py, 8 * p, 0, TAU); g.fill();
      }
      if (it.key === 'cu_video') {
        const cl = dt < .25 ? -.55 : dt < .38 ? lerp(-.55, 0, E.in(prog(dt, .25, .38))) : 0;
        put(g, 'cu_clap', x - 170 * s, y - 110 * s, { s, ax: 0, ay: .5, r: it.r + cl });
      }
      if (it.key === 'cu_phones') {
        for (let k = 0; k < 16; k++) {
          const h = (18 + Math.abs(Math.sin(stepT() * 9 + k * .9) * Math.cos(k * .7 + stepT() * 4)) * 80) * p;
          g.fillStyle = ['#2a9d8f', '#4d7cc7', '#8e6cc2'][k % 3];
          g.fillRect(x + 140 + k * 20, y - h / 2, 12, h);
        }
      }
      if (it.key === 'cu_web') { g.fillStyle = '#2a9d8f'; g.fillRect(x - 200, y + 168, 400 * clamp(dt / 1.2), 8); }
      writeText(g, it.label, x + (it.key === 'cu_phones' ? 320 : 0), y + (it.key === 'cu_phones' ? -110 : it.ly || 190), prog(dt, .15, .5), { size: 64, color: INK, r: it.r * .6 });
    });
    // plug + socket
    const ss = pop(S + 4.55, .4);
    put(g, 'cu_socket', 1250, 560, { s: ss });
    if (lt > PLUG_T - .55) {
      const pp = E.inOut(prog(lt, PLUG_T - .5, PLUG_T));
      const px = lerp(1760, 1262, pp) + (lt > PLUG_T && lt < PLUG_T + .1 ? 6 : 0), py = lerp(640, 560, pp);
      const cable = spline([[px + 200, py + 6], [px + 280, py - 30], [lerp(1900, px + 300, .5), 520], [1960, 470]], 10);
      inkLine(g, cable, { w: 12, color: '#2b2522', seed: 51, wob: .5, passes: 1 });
      put(g, 'cu_plug', px, py, { ax: 0 });
    }
    if (lt > PLUG_T) {
      for (let k = 0; k < 7; k++) { const R = mulberry32(k + Math.floor(lt * 16) * 13); if (lt < PLUG_T + .45) inkLine(g, [[1250, 560], [1250 + (R() - .5) * 200, 560 + (R() - .5) * 200], [1250 + (R() - .5) * 260, 560 + (R() - .5) * 260]], { w: 4, color: '#f2b134', seed: k, passes: 1 }); }
      confetti(g, 960, 300, S + BULB_T, { n: 46, spd: 900, seed: 77 });
    }
    // light bulb moment
    const bs = pop(S + PLUG_T - .1, .4);
    if (bs > 0) {
      const lit = lt > BULB_T;
      if (lit) {
        const k = E.out(prog(lt, BULB_T, BULB_T + .3));
        const gr = g.createRadialGradient(960, 155, 30, 960, 155, 330 * k); gr.addColorStop(0, 'rgba(255,230,110,0.8)'); gr.addColorStop(1, 'rgba(255,230,110,0)');
        g.fillStyle = gr; g.fillRect(560, -200, 800, 800);
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + .3; inkLine(g, [[960 + Math.cos(a) * 130, 155 + Math.sin(a) * 130], [960 + Math.cos(a) * (130 + 70 * k), 155 + Math.sin(a) * (130 + 70 * k)]], { w: 7, color: '#f2b134', seed: 90 + i, passes: 1 }); }
      }
      put(g, lit ? 'cu_bulb1' : 'cu_bulb0', 960, 165, { s: bs * (lit ? 1 + .15 * (1 - E.out(prog(lt, BULB_T, BULB_T + .25))) : 1), r: sway(.05, .7) });
      sparkle(g, 1110, 110, 1.3, S + BULB_T + .1); sparkle(g, 820, 120, 1, S + BULB_T + .2);
    }
  },
});

/* ============================ 10  OUTRO ============================ */
defSheet('outro', '#f4ecd9', 'plain');
const TITLE = 'LARS KRAHL';
const LSTYLE = [
  ['#e4572e', 'marker', '#fbf7ee'], ['#2a9d8f', 'fred', '#fbf7ee'], ['#fbf7ee', 'marker', INK], ['#f2b134', 'pixel', INK],
  null,
  ['#4d7cc7', 'marker', '#fbf7ee'], ['#fbf7ee', 'fred', '#e4572e'], ['#8e6cc2', 'hand', '#fbf7ee'], ['#2b2522', 'marker', '#f2b134'], ['#f4a6a6', 'fred', INK],
];
[...TITLE].forEach((ch, i) => {
  if (ch === ' ') return;
  const [bg, f, fg] = LSTYLE[i];
  defSprite('rl' + i, 150, 190, (g, rc, R, v, R0) => {
    const pts = [[4 + R0() * 10, R0() * 12], [146 - R0() * 10, R0() * 14], [150 - R0() * 12, 188 - R0() * 10], [R0() * 12, 190 - R0() * 12]];
    const p = paper(g, pts, bg, R0, { amp: 2.2, step: 6 });
    if (i % 3 === 0) halftone(g, p, 'rgba(0,0,0,0.10)', 10, 2.4, .7);
    text(g, ch, 75, 102, { f, size: f === 'pixel' ? 100 : f === 'hand' ? 170 : 140, color: fg });
  }, { border: 5 });
});
defSprite('o_sub', 1180, 86, (g, rc, R, v, R0) => {
  paper(g, rectPts(0, 0, 1180, 86), '#fdfaf1', R0, { amp: 2, step: 7 });
  text(g, 'Fachinformatiker für Systemintegration  ·  Dresden', 590, 46, { f: 'patrick', size: 50, color: '#4a3a2a' });
}, { border: 0, shadow: .8 });
defSprite('o_url', 720, 120, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(0, 0, 720, 120), C64.border, R0, { amp: 2, step: 7 });
  paper(g, rectPts(24, 16, 672, 88), C64.bg, R0, { amp: 1.2, rim: false });
}, { border: 5 });
const OUTRO_PROPS = [
  ['d_frauen', 200, 260, .42, 2.15, -.05], ['c_c64', 1700, 200, .36, 2.3, .06], ['b_boot', 230, 880, .42, 2.45, -.1],
  ['p_rack', 1790, 560, .38, 2.6, .08], ['py_head', 1690, 900, .75, 2.75, -.08], ['d_boat', 150, 560, .95, 2.9, .05],
];
defScene('outro', {
  sheet: 'outro',
  draw(g, lt) {
    const S = SC.outro;
    OUTRO_PROPS.forEach(([k, x, y, s, t0, r], i) => put(g, k, x + sway(4, .4, i), y + sway(6, .5, i + 2), { s: s * pop(S + t0, .45), r: r + sway(.04, .45, i) }));
    // ransom-note title
    let x = 960 - (9 * 150 + 80) / 2 + 75;
    [...TITLE].forEach((ch, i) => {
      if (ch === ' ') { x += 80; return; }
      const t0 = S + .18 + i * .075, R = mulberry32(900 + i);
      const s = pop(t0, .4), rr = (R() - .5) * .22;
      put(g, 'rl' + i, x, 400 + (R() - .5) * 30 + sway(5, .6, i), { s, r: rr + (1 - s) * .8 + sway(.03, .5, i) });
      x += 150;
    });
    confetti(g, 960, 200, S + .95, { n: 60, spd: 1100, seed: 31, up: 400 });
    const ss = E.back(prog(lt, 1.0, 1.4));
    put(g, 'o_sub', 960, 620 + (1 - ss) * 40, { a: prog(lt, 1.0, 1.15), r: -.01 });
    writeText(g, 'hooked since the C64', 900, 760, prog(lt, 1.5, 2.7), { size: 96, color: '#c0392b', r: -.03 });
    put(g, 'heart', 1390, 745, { s: pop(S + 2.75, .4) * 1.1, r: .15 + sway(.08, 1.2) });
    // the URL, typed C64-style
    const us = pop(S + 3.0, .4);
    put(g, 'o_url', 960, 900, { s: us, r: .01 });
    if (us > .9) {
      g.save(); g.translate(960, 900); g.rotate(.01);
      const url = 'lars-krahl.de', n = Math.min(url.length, Math.max(0, Math.floor((lt - 3.15) * 16)));
      g.font = font(FONT.pixel, 44); g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = C64.fg;
      const w = g.measureText(url).width, x0 = -w / 2 - 20;
      g.fillText(url.slice(0, n), x0, 4);
      if (Math.floor(T / .33) % 2 === 0 || n < url.length) g.fillRect(x0 + g.measureText(url.slice(0, n)).width + 6, -20, 40, 46);
      g.restore();
    }
  },
});

/* ---------------- sfx for scenes 8-10 ---------------- */
(function () {
  const p = SC.python;
  cue(p - .5, 'whoosh', { dur: .9, v: .5 });
  cue(p + .05, 'slide', { v: .4, pitch: .7 }); cue(p + .2, 'clank', { v: .3, pitch: 1.3 }); cue(p + .3, 'clank', { v: .3, pitch: 1.6 });
  cue(p + .12, 'rustle', { dur: .3, v: .4 });
  cue(p + .9, 'boing', { v: .35, pitch: 1.2 });
  cue(p + 1.7, 'pop', { v: .35, pitch: .8 });
  cue(p + 1.9, 'hiss', { dur: .6, v: .35 });
  cue(p + 2.42, 'pencil', { dur: .58, v: .45 });
  cue(p + 3.05, 'pencil', { dur: .5, v: .45 });
  cue(p + 3.5, 'chime', { v: .4 });
  cue(p + 3.45, 'pencil', { dur: .45, v: .3 });

  const c = SC.curious;
  cue(c - .5, 'whoosh', { dur: .9, v: .5 });
  CUR_ITEMS.forEach((it, i) => { cue(c + it.t, 'slam', { v: .55, pitch: 1 + i * .06 }); cue(c + it.t + .15, 'pencil', { dur: .35, v: .25 }); });
  cue(c + 3.22, 'clap', { v: .6 });
  cue(c + 4.55, 'pop', { v: .35 });
  cue(c + PLUG_T - .5, 'slide', { v: .4, pitch: .9 });
  cue(c + PLUG_T, 'plugin', { v: .7 });
  cue(c + PLUG_T, 'zap', { v: .5 });
  cue(c + PLUG_T - .1, 'pop', { v: .35, pitch: 1.3 });
  cue(c + BULB_T, 'ding', { v: .55 });
  shake(c + PLUG_T, 8, .35);

  const o = SC.outro;
  cue(o - .55, 'whoosh', { dur: 1, v: .55 });
  for (let i = 0; i < 10; i++) if (TITLE[i] !== ' ') cue(o + .18 + i * .075, 'pop', { v: .4, pitch: .9 + i * .05 });
  cue(o + .95, 'confetti', { v: .5 });
  cue(o + 1.0, 'slide', { v: .35 });
  cue(o + 1.5, 'pencil', { dur: 1.2, v: .4 });
  OUTRO_PROPS.forEach(([, , , , t0], i) => cue(o + t0, 'pop', { v: .25, pitch: 1.2 + i * .05 }));
  cue(o + 3.0, 'pop', { v: .4 });
  cue(o + 3.15, 'keys', { n: 13, rate: 16, v: .4 });
  cue(o + 4.1, 'c64beep', { v: .2, f: 1320, dur: .08 });
})();
