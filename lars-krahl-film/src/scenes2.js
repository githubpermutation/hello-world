'use strict';
/* =====================================================================
 *  scenes2.js - 4 Boots->Bytes, 5 Certificate, 6 Puppet, 7 Pipelines
 * ===================================================================== */

/* generic manila tag (text drawn live), hole on the left at (26,55) */
defSprite('tag', 290, 110, (g, rc, R, v, R0) => {
  const p = [[40, 0], [290, 0], [290, 110], [40, 110], [0, 55]];
  const pp = paper(g, p, '#e9cf98', R0, { amp: 1.2 });
  outline(rc, pp, { strokeWidth: 2 });
  g.fillStyle = '#fbf7ee'; g.beginPath(); g.arc(30, 55, 11, 0, TAU); g.fill();
  rc.circle(30, 55, 22, { strokeWidth: 1.6 });
}, { border: 3, shadow: .7 });
function tagText(g, x, y, r, s, str, o = {}) {
  if (s <= 0) return;
  put(g, 'tag', x, y, { s, r, ax: .12, ay: .5 });
  g.save(); g.translate(x, y); g.rotate(r); g.scale(s, s);
  text(g, str, 162, 4, { size: o.size || 54, color: o.color || INK });
  g.restore();
}

/* ============================ 4  BOOTS -> BYTES ============================ */
defSheet('boots', '#ddd6b1', 'plain', {
  extra(g, rc, R0) {
    const camo = ['#6b7a45', '#8c8a55', '#4f5a36', '#a39a6a'];
    for (const [cx, cy] of [[0, 0], [1840, 1010], [1840, 0], [0, 1010]]) for (let i = 0; i < 14; i++) {
      const x = cx + (R0() - .5) * 520, y = cy + (R0() - .5) * 420, pts = [];
      for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, r = 40 + R0() * 50; pts.push([x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r]); }
      fillPoly(g, spline(pts.concat([pts[0]]), 5), camo[i % 4]);
    }
  },
});
defSprite('b_label', 860, 130, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(0, 0, 860, 130), '#5d6b3a', R0, { amp: 2.5, step: 7 });
  crayon(g, p, '#4b5830', R0, { gap: 10, alpha: .4 });
  text(g, 'MILITARY SERVICE', 430, 70, { f: 'marker', size: 76, color: '#efe6c8', spacing: 6 });
}, { border: 5 });
defSprite('b_boot', 320, 330, (g, rc, R, v, R0) => {
  const shaft = [[40, 10], [180, 10], [185, 210], [36, 214]];
  const foot = [[30, 190], [190, 196], [262, 214], [300, 250], [304, 292], [26, 292]];
  const sole = [[20, 286], [312, 286], [312, 326], [20, 326]];
  paper(g, sole, '#2a2320', R0, { amp: 1 });
  for (let x = 34; x < 310; x += 26) g.fillStyle = '#453a33', g.fillRect(x, 314, 14, 10);
  const fp = paper(g, foot, '#4d3a2b', R0, { amp: 1.2 }); outline(rc, fp);
  const sp = paper(g, shaft, '#5a4332', R0, { amp: 1.2 }); outline(rc, sp);
  crayon(g, sp, '#3d2d22', R0, { gap: 12, alpha: .35 });
  paper(g, [[34, 10], [186, 10], [186, 38], [34, 38]], '#3b2c21', R0, { amp: .8 });
  // laces
  for (let i = 0; i < 6; i++) { const y = 60 + i * 28; rc.line(150, y, 188, y + 18, { stroke: '#e9dfc4', strokeWidth: 3 }); rc.line(150, y + 18, 188, y, { stroke: '#e9dfc4', strokeWidth: 3 }); }
  g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.ellipse(240, 232, 36, 10, .3, 0, TAU); g.fill();
}, { border: 6 });
defSprite('b_dogtag', 190, 280, (g, rc, R, v, R0) => {
  g.fillStyle = '#9aa3a8'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(95, 6 + i * 7, 3, 0, TAU); g.fill(); }
  const tag = roundRectPts(20, 100, 150, 170, 38);
  const tp = paper(g, tag, '#c3cbcf', R0, { amp: .8 }); outline(rc, tp, { strokeWidth: 2.2 });
  g.fillStyle = '#fbf7ee'; g.beginPath(); g.arc(95, 124, 10, 0, TAU); g.fill(); rc.circle(95, 124, 20, { strokeWidth: 1.5 });
  text(g, 'KRAHL', 95, 175, { f: 'pixel', size: 22, color: '#56606a' });
  text(g, 'LARS', 95, 210, { f: 'pixel', size: 22, color: '#56606a' });
  text(g, 'DRESDEN', 95, 244, { f: 'pixel', size: 14, color: '#56606a' });
}, { border: 4 });
const BIT_COLS = ['#2a9d8f', '#e4572e', '#f2b134', '#4d7cc7'];
BIT_COLS.forEach((c, i) => ['0', '1'].forEach(d => defSprite(`bit${d}${i}`, 110, 120, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(0, 0, 110, 120), c, R0, { amp: 1.6 }); outline(rc, p, { strokeWidth: 2 });
  text(g, d, 55, 74, { f: 'pixel', size: 58, color: '#fbf7ee' });
  g.fillStyle = INK; g.beginPath(); g.arc(36, 22, 5, 0, TAU); g.arc(74, 22, 5, 0, TAU); g.fill();
}, { border: 4 })));

const POOF = 5 * BEAT;   // boots turn into bytes on bar 7, beat 1
defScene('boots', {
  sheet: 'boots',
  draw(g, lt) {
    put(g, 'b_label', 960, 150 + (1 - E.back(prog(lt, .15, .6))) * -300, { r: -.02 + sway(.008, .4) });
    // dog tag on a pin
    const ds = pop(SC.boots + .5, .5);
    if (ds > 0) {
      put(g, 'b_dogtag', 1630, 250, { s: ds, ay: .02, r: Math.sin(lt * 3.2) * .12 * Math.exp(-lt * .4) });
      g.fillStyle = '#e4572e'; g.beginPath(); g.arc(1630, 252, 12 * ds, 0, TAU); g.fill();
    }
    // marching boots
    const gone = lt > POOF;
    const bootS = gone ? popOut(SC.boots + POOF, .12) : 1;
    if (bootS > 0) {
      const drop = (1 - E.bounce(prog(lt, 0, .45))) * -700;
      const beat = (lt - .06) / BEAT, n = Math.floor(beat), f = beat - n;
      [[800, 0], [1100, 1]].forEach(([x, side]) => {
        let lift = 0, rot = 0;
        if (lt > .5 && n % 2 === side && lt < POOF - .05) { lift = Math.sin(f * Math.PI) * 110; rot = -Math.sin(f * Math.PI) * .18; }
        g.save(); g.globalAlpha = .25; g.fillStyle = '#3a2a1a';
        g.beginPath(); g.ellipse(x + 20, 872, 150 - lift * .4, 16, 0, 0, TAU); g.fill(); g.restore();
        put(g, 'b_boot', x, 868 - lift + drop, { ay: 1, s: bootS, r: rot });
      });
      for (let k = 1; k <= 5; k++) { const tk = SC.boots + .06 + k * BEAT; poof(g, k % 2 ? 1180 : 880, 860, tk, { r: 60, pr: 16, n: 6, life: .35, seed: k, color: '#cbbf96' }); }
    }
    // boots  ->  bytes!
    writeText(g, 'boots', 420, 470, prog(lt, 1.85, 2.3), { size: 120, color: INK, r: -.05 });
    const sk = []; for (let i = 0; i <= 12; i++) sk.push([300 + i * 22, 480 + (i % 2 ? -18 : 14) - i * 2]);
    inkLine(g, sk, { p: prog(lt, POOF, POOF + .17), color: '#e4572e', w: 9, seed: 31 });
    writeText(g, 'bytes!', 450, 620, prog(lt, POOF + .1, POOF + .55), { size: 130, color: '#e4572e', r: -.07 });
    poof(g, 950, 760, SC.boots + POOF, { r: 230, pr: 70, n: 11, life: .8, seed: 4 });
    confetti(g, 950, 760, SC.boots + POOF + .02, { n: 40, spd: 900, seed: 8, colors: BIT_COLS });
    // bits hopping in formation
    if (lt > POOF + .02) {
      for (let i = 0; i < 9; i++) {
        const R = mulberry32(700 + i), p = E.out(prog(lt, POOF + .02 + i * .03, POOF + .45 + i * .03));
        const tx = 560 + i * 118 + (lt - POOF) * 50, ty = 860;
        const x = lerp(950, tx, p), y = lerp(760, ty, p) - Math.sin(p * Math.PI) * 200;
        const hop = Math.abs(Math.sin(((lt - POOF - .5) / BEAT + i * .5) * Math.PI)) * 42 * prog(lt, POOF + .45, POOF + .6);
        const key = `bit${R() < .5 ? '0' : '1'}${i % 4}`;
        // legs
        const lx = x, ly = y - hop, leg = Math.sin(((lt - POOF - .5) / BEAT + i * .5) * TAU) * 10;
        inkLine(g, [[lx - 20, ly], [lx - 22 - leg, ly + 34]], { w: 5, seed: i * 3 + 1, passes: 1 });
        inkLine(g, [[lx + 20, ly], [lx + 22 + leg, ly + 34]], { w: 5, seed: i * 3 + 2, passes: 1 });
        put(g, key, lx, ly, { ay: 1, s: E.back(prog(lt, POOF + .02 + i * .03, POOF + .35 + i * .03)), r: sway(.08, 1.3, i) });
      }
    }
  },
});

/* ============================ 5  CERTIFICATE ============================ */
defSheet('cert', '#f1dcd2', 'dots', { dot: 'rgba(160,70,60,0.15)' });
defSprite('cert', 1000, 700, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(0, 0, 1000, 700), '#faf2dc', R0, { amp: 3.5, step: 6 });
  const gr = g.createRadialGradient(500, 350, 200, 500, 350, 640); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(170,120,40,0.25)');
  g.save(); pathPoly(g, p); g.clip(); g.fillStyle = gr; g.fillRect(0, 0, 1000, 700); g.restore();
  rc.rectangle(34, 34, 932, 632, { stroke: '#2b4a7a', strokeWidth: 3.2, roughness: .6 });
  rc.rectangle(50, 50, 900, 600, { stroke: '#2b4a7a', strokeWidth: 1.6, roughness: .6 });
  for (const [x, y, sx, sy] of [[50, 50, 1, 1], [950, 50, -1, 1], [50, 650, 1, -1], [950, 650, -1, -1]]) {
    rc.curve([[x, y + sy * 90], [x + sx * 30, y + sy * 40], [x + sx * 70, y + sy * 30], [x + sx * 100, y + sy * 8]], { stroke: '#2b4a7a', strokeWidth: 2 });
    rc.circle(x + sx * 34, y + sy * 34, 16, { stroke: '#2b4a7a', strokeWidth: 2, fill: '#c0392b', fillStyle: 'solid' });
  }
  text(g, 'Zertifikat', 500, 120, { f: 'fred', size: 84, color: '#2b4a7a' });
  text(g, 'Hiermit wird bescheinigt, dass', 500, 200, { f: 'patrick', size: 36, color: '#5b4a3a' });
  text(g, 'Lars Krahl', 500, 276, { f: 'hand', size: 100, color: INK });
  text(g, 'erfolgreich ausgebildet wurde zum', 500, 350, { f: 'patrick', size: 32, color: '#5b4a3a' });
  g.setLineDash([4, 8]); g.strokeStyle = 'rgba(43,74,122,0.45)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(180, 460); g.lineTo(820, 460); g.moveTo(220, 545); g.lineTo(780, 545); g.stroke(); g.setLineDash([]);
  rc.line(620, 612, 880, 612, { strokeWidth: 1.6 });
  rc.curve([[640, 600], [670, 570], [690, 610], [720, 575], [735, 600], [770, 580], [800, 596], [850, 582]], { strokeWidth: 2.2, stroke: '#2b4a7a' });
  text(g, 'Dresden', 750, 636, { f: 'patrick', size: 24, color: '#5b4a3a' });
}, { border: 0, shadow: 1.2 });
defSprite('rosette', 180, 250, (g, rc, R, v, R0) => {
  for (const s of [-1, 1]) { const t = [[90 + s * 10, 110], [90 + s * 70, 240], [90 + s * 40, 220], [90 + s * 20, 250], [90 + s * 50, 110]]; paper(g, t, '#b8322a', R0, { amp: .8 }); outline(rc, t, { strokeWidth: 2 }); }
  const pl = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, r = i % 2 ? 72 : 84; pl.push([90 + Math.cos(a) * r, 90 + Math.sin(a) * r]); }
  paper(g, pl, '#d6453a', R0, { amp: .6 }); outline(rc, pl, { strokeWidth: 2 });
  paper(g, ellPts(90, 90, 50, 50, 30), '#f2c53d', R0, { amp: .8 });
  const st = []; for (let i = 0; i <= 10; i++) { const r = i % 2 ? 14 : 32, a = i / 10 * TAU - Math.PI / 2; st.push([90 + Math.cos(a) * r, 90 + Math.sin(a) * r]); }
  fillPoly(g, st, '#fbf7ee');
}, { border: 4 });
function gearPts(cx, cy, r, teeth) {
  const p = []; for (let i = 0; i < teeth * 4; i++) { const a = i / (teeth * 4) * TAU, k = i % 4; p.push([cx + Math.cos(a) * (k === 1 || k === 2 ? r : r * .8), cy + Math.sin(a) * (k === 1 || k === 2 ? r : r * .8)]); }
  return p;
}
[['gearA', 220, 12, '#2a9d8f'], ['gearB', 150, 8, '#f2b134'], ['gearC', 120, 7, '#e4572e']].forEach(([k, d, n, c]) => defSprite(k, d, d, (g, rc, R, v, R0) => {
  const p = paper(g, gearPts(d / 2, d / 2, d / 2 - 2, n), c, R0, { torn: false }); outline(rc, p, { strokeWidth: 2.2, roughness: .5 });
  g.fillStyle = '#fbf7ee'; g.beginPath(); g.arc(d / 2, d / 2, d * .14, 0, TAU); g.fill(); rc.circle(d / 2, d / 2, d * .28, { strokeWidth: 2 });
}, { border: 4 }));
defSprite('stamp', 240, 340, (g, rc, R, v, R0) => {
  const knob = paper(g, ellPts(120, 60, 58, 54, 28), '#a8683a', R0, { amp: 1 }); outline(rc, knob);
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(100, 40, 20, 12, -.5, 0, TAU); g.fill();
  const neck = [[96, 108], [144, 108], [150, 210], [90, 210]]; paper(g, neck, '#8a5530', R0, { amp: .8 }); outline(rc, neck, { strokeWidth: 2 });
  const base = [[20, 210], [220, 210], [228, 300], [12, 300]]; paper(g, base, '#c28a55', R0, { amp: 1 }); outline(rc, base);
  paper(g, [[14, 298], [226, 298], [226, 332], [14, 332]], '#c0392b', R0, { amp: .8 });
}, { border: 5 });
defSprite('stampmark', 430, 170, (g, rc, R, v, R0) => {
  rc.rectangle(10, 10, 410, 150, { stroke: '#c0392b', strokeWidth: 7, roughness: 1.4 });
  text(g, 'CERTIFIED', 200, 88, { f: 'marker', size: 70, color: '#c0392b' });
  g.strokeStyle = '#c0392b'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(360, 80); g.lineTo(380, 110); g.lineTo(410, 50); g.stroke();
  // worn rubber: knock out specks
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${.3 + R0() * .7})`; g.beginPath(); g.arc(R0() * 430, R0() * 170, .6 + R0() * 2.4, 0, TAU); g.fill(); }
  g.globalCompositeOperation = 'source-over';
}, { border: 0, shadow: false, tex: false, boil: false });

defScene('cert', {
  sheet: 'cert',
  draw(g, lt) {
    // gears peeking from behind the certificate
    const gs = pop(SC.cert + 1.9, .5), ang = lt * 1.1;
    put(g, 'gearA', 250, 230, { s: gs, r: ang });
    put(g, 'gearB', 395, 150, { s: pop(SC.cert + 2.0, .5), r: -ang * 12 / 8 + .2 });
    put(g, 'gearC', 175, 410, { s: pop(SC.cert + 2.1, .5), r: -ang * 12 / 7 + .1 });
    // certificate drops in
    const cp = prog(lt, .02, .6), cx = 840, cy = 540 + (1 - E.back(cp)) * -1000, cr = -.025 + (1 - E.out(cp)) * .25;
    put(g, 'cert', cx, cy, { r: cr });
    put(g, 'tape', cx - 470, cy - 330, { r: -.7 + cr }); put(g, 'tape', cx + 470, cy - 330, { r: .7 + cr });
    g.save(); g.translate(cx, cy); g.rotate(cr);
    writeText(g, 'Fachinformatiker', 0, 450 - 350 - 10, prog(lt, .75, 1.75), { size: 110, color: '#c0392b' });
    writeText(g, 'für Systemintegration', 0, 530 - 350 - 5, prog(lt, 2.15, 3.15), { size: 86, color: '#c0392b' });
    put(g, 'rosette', -410, 250, { s: .85 * pop(SC.cert + 3.0, .5), r: -.15 + sway(.03, .6) });
    // stamp mark (after impact)
    const hit = SC.cert + 3.75;
    if (T >= hit) put(g, 'stampmark', 250, 262, { r: -.14, s: .82 * (1 + .25 * (1 - E.out(prog(T, hit, hit + .12)))) });
    g.restore();
    // the rubber stamp
    const sx = lt < 3.67 ? lerp(1500, 1105, E.out(prog(lt, 3.15, 3.55))) : lt < 3.95 ? 1105 : lerp(1105, 1600, E.in(prog(lt, 3.95, 4.35)));
    let sy = lt < 3.67 ? lerp(-500, 330, E.out(prog(lt, 3.15, 3.55))) : lt < 3.75 ? lerp(330, 850, E.in(prog(lt, 3.67, 3.75))) : lt < 3.95 ? 850 - Math.sin(prog(lt, 3.75, 3.95) * Math.PI) * 12 : lerp(850, -500, E.in(prog(lt, 3.95, 4.35)));
    if (lt > 3.1 && lt < 4.4) put(g, 'stamp', sx, sy, { ay: 1, r: lt < 3.67 ? -.12 * (1 - prog(lt, 3.35, 3.65)) : 0, sy: lt > 3.75 && lt < 3.83 ? .9 : 1 });
    actionLines(g, 1105, 820, SC.cert + 3.75, { r0: 150, len: 70, w: 7, n: 10 });
    confetti(g, 1105, 790, SC.cert + 3.77, { n: 34, spd: 800, seed: 12 });
    // Lars, then a proud thumbs-up
    const ls = prog(lt, .45, .95), jump = Math.sin(Math.PI * prog(lt, 3.77, 4.15)) * 70;
    const lx = 1640, ly = 660 + (1 - E.back(ls)) * 700 - jump;
    if (lt < 3.77) put(g, 'lars', lx, ly, { r: sway(.02, .5) });
    else {
      put(g, 'larsNoArm', lx, ly, { r: sway(.02, .5) });
      put(g, 'larsArmUp', lx + 66, ly - 86, { ax: .33, ay: .9, r: (1 - E.back(prog(lt, 3.77, 4.05))) * 2.4 + sway(.05, 1) });
      sparkle(g, lx + 110, ly - 290, 1.3, SC.cert + 3.95);
    }
  },
});

/* ============================ 6  PUPPET ============================ */
defSheet('puppet', '#e4dbef', 'dots', { dot: 'rgba(90,60,140,0.15)' });
defSprite('p_stage', 1840, 190, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(0, 0, 1840, 190), '#8a5a3b', R0, { amp: 2 });
  g.save(); pathPoly(g, p); g.clip();
  for (let y = 0; y < 190; y += 38) { g.fillStyle = y % 76 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)'; g.fillRect(0, y, 1840, 38); rc.line(0, y, 1840, y, { strokeWidth: 1.4, stroke: 'rgba(40,20,10,0.6)' }); }
  for (let i = 0; i < 30; i++) { const x = R0() * 1840, y = Math.floor(R0() * 5) * 38; rc.line(x, y, x, y + 38, { strokeWidth: 1.4, stroke: 'rgba(40,20,10,0.6)' }); }
  g.restore();
  paper(g, rectPts(0, 0, 1840, 16), '#6d4329', R0, { amp: 1 });
}, { border: 0, shadow: 1 });
function curtain(g, rc, R0, w, h, flip) {
  const p = []; for (let i = 0; i <= 12; i++) p.push([i / 12 * w, 0]);
  for (let i = 12; i >= 0; i--) { const x = i / 12 * w; p.push([x + (flip ? -1 : 1) * Math.sin(i * .8) * 6, h - (flip ? (12 - i) : i) * 6]); }
  const pp = paper(g, p, '#b8322a', R0, { amp: 1.5 });
  g.save(); pathPoly(g, pp); g.clip();
  for (let x = 0; x < w; x += 46) { const gr = g.createLinearGradient(x, 0, x + 46, 0); gr.addColorStop(0, 'rgba(60,0,0,0.35)'); gr.addColorStop(.5, 'rgba(255,200,200,0.12)'); gr.addColorStop(1, 'rgba(60,0,0,0.35)'); g.fillStyle = gr; g.fillRect(x, 0, 46, h); }
  g.restore();
  outline(rc, pp, { strokeWidth: 2 });
  const tx = flip ? 40 : w - 40;
  paper(g, [[tx - 30, h * .55], [tx + 30, h * .55], [tx + 24, h * .6], [tx - 24, h * .6]], '#f2c53d', R0, { amp: .6 });
}
defSprite('p_curtL', 360, 1010, (g, rc, R, v, R0) => curtain(g, rc, R0, 360, 1010, false), { border: 0, shadow: 1.2 });
defSprite('p_curtR', 360, 1010, (g, rc, R, v, R0) => curtain(g, rc, R0, 360, 1010, true), { border: 0, shadow: 1.2 });
defSprite('p_valance', 1840, 130, (g, rc, R, v, R0) => {
  const p = [[0, 0], [1840, 0]]; for (let i = 23; i >= 0; i--) { p.push([(i + 1) * 1840 / 24, 90]); p.push([(i + .5) * 1840 / 24, 128]); }
  p.push([0, 90]);
  const pp = paper(g, p, '#a52a22', R0, { amp: 1.2 }); outline(rc, pp, { strokeWidth: 2 });
  g.fillStyle = '#f2c53d'; g.fillRect(0, 70, 1840, 10);
}, { border: 0, shadow: 1.2 });
defSprite('p_hand', 200, 300, (g, rc, R, v, R0) => {
  const sleeve = [[50, 0], [150, 0], [156, 150], [44, 150]]; paper(g, sleeve, '#2a9d8f', R0, { amp: 1 }); outline(rc, sleeve, { strokeWidth: 2 });
  paper(g, [[40, 140], [160, 140], [160, 168], [40, 168]], '#23867a', R0, { amp: .8 });
  const fist = roundRectPts(38, 160, 124, 120, 40); const fp = paper(g, fist, SKIN, R0, { amp: 1 }); outline(rc, fist, { strokeWidth: 2.2 });
  for (let i = 1; i < 4; i++) rc.line(38 + i * 31, 232, 38 + i * 31, 276, { strokeWidth: 1.8 });
}, { border: 5 });
defSprite('p_bar', 760, 70, (g, rc, R, v, R0) => {
  const b = [[0, 22], [760, 22], [760, 48], [0, 48]]; paper(g, b, '#c18d5a', R0, { amp: 1 }); outline(rc, b, { strokeWidth: 2 });
  const c = [[350, 0], [410, 0], [410, 70], [350, 70]]; paper(g, c, '#a8763f', R0, { amp: .8 }); outline(rc, c, { strokeWidth: 2 });
  for (const x of [14, 380, 746]) { g.fillStyle = '#6b4a2a'; g.beginPath(); g.arc(x, 35, 6, 0, TAU); g.fill(); }
}, { border: 4 });
defSprite('p_rack', 240, 380, (g, rc, R, v, R0) => {
  const p = paper(g, roundRectPts(0, 0, 240, 360, 16), '#2e3d57', R0, { amp: 1.2 }); outline(rc, p);
  for (let i = 0; i < 7; i++) { const u = [[18, 100 + i * 34], [222, 100 + i * 34], [222, 126 + i * 34], [18, 126 + i * 34]]; paper(g, u, '#43577a', R0, { amp: .6, rim: false }); for (let k = 0; k < 5; k++) g.fillStyle = 'rgba(0,0,0,0.35)', g.fillRect(110 + k * 18, 106 + i * 34, 10, 14); }
  // happy face on the top unit
  paper(g, [[18, 18], [222, 18], [222, 86], [18, 86]], '#dfe7f0', R0, { amp: .8 });
  g.fillStyle = INK; g.beginPath(); g.arc(90, 46, 7, 0, TAU); g.arc(150, 46, 7, 0, TAU); g.fill();
  rc.arc(120, 58, 40, 24, .2, Math.PI - .2, false, { strokeWidth: 2.4 });
  g.fillStyle = CHEEK; g.beginPath(); g.ellipse(68, 64, 10, 6, 0, 0, TAU); g.ellipse(172, 64, 10, 6, 0, 0, TAU); g.fill();
  for (const x of [30, 190]) paper(g, [[x, 358], [x + 20, 358], [x + 22, 380], [x - 2, 380]], '#1d2638', R0, { amp: .5 });
}, { border: 5 });
defSprite('p_note', 400, 210, (g, rc, R, v, R0) => {
  const p = paper(g, rectPts(0, 0, 400, 210), '#fff8d6', R0, { amp: 1.8 });
  for (let y = 50; y < 210; y += 40) rc.line(10, y + 10, 390, y + 10, { stroke: 'rgba(80,120,200,0.4)', strokeWidth: 1.2 });
  text(g, "node 'webserver' {", 26, 52, { f: 'gochi', size: 34, align: 'left' });
  text(g, 'include happy', 66, 102, { f: 'gochi', size: 34, align: 'left', color: '#8e44ad' });
  text(g, '}', 26, 150, { f: 'gochi', size: 34, align: 'left' });
}, { border: 4 });

defScene('puppet', {
  sheet: 'puppet',
  draw(g, lt) {
    const open = E.inOut(prog(lt, .1, .75));
    put(g, 'p_stage', 960, 950);
    // hand + control bar
    const hy = lerp(-360, 90, E.back(prog(lt, .3, .75)));
    const dance = prog(lt, .9, 1.3);
    const phi = Math.sin((T - SC.puppet) * Math.PI / BEAT) * .2 * dance + sway(.01, .7);
    const bx = 960 + Math.sin((T - SC.puppet) * Math.PI / BEAT / 2) * 30 * dance, by = hy + 200;
    const attach = [-366, 0, 366].map(dx => [bx + Math.cos(phi) * dx, by + Math.sin(phi) * dx]);
    const racks = [560, 960, 1360];
    const rackPos = racks.map((x, i) => {
      const drop = (1 - E.bounce(prog(lt, .55 + i * .15, 1.15 + i * .15))) * -900;
      const a = attach[i];
      const dy = (a[1] - by) * 1.3, hop = i === 1 ? Math.abs(Math.sin((T - SC.puppet) * Math.PI / BEAT)) * -26 * dance : 0;
      return [x + (a[0] - (960 + [-366, 0, 366][i])) * .7, 560 + dy + drop + hop, -phi * .6 + (i - 1) * .04 * Math.sin((T - SC.puppet) * 3)];
    });
    rackPos.forEach(([x, y, r], i) => {
      const a = attach[i];
      const top = [x + Math.sin(r) * 190, y - Math.cos(r) * 190];
      inkLine(g, [a, top], { w: 2.4, color: 'rgba(42,29,20,0.85)', seed: 60 + i, wob: .4, passes: 1 });
      put(g, 'p_rack', x, y, { r });
      // blinking LEDs
      g.save(); g.translate(x, y); g.rotate(r);
      for (let u = 0; u < 7; u++) for (let k = 0; k < 2; k++) {
        const on = hash(i * 97 + u * 13 + k * 7 + Math.floor(T * 7)) > .45;
        g.fillStyle = on ? (k ? '#f2b134' : '#7ee07e') : 'rgba(0,0,0,0.4)';
        g.beginPath(); g.arc(-80 + k * 22, -73 + u * 34, 6, 0, TAU); g.fill();
      }
      g.restore();
    });
    put(g, 'p_bar', bx, by, { r: phi });
    put(g, 'p_hand', bx, by - 25, { ay: .88, r: phi * .5 });
    // "Puppet" tag hanging from the bar
    const ts = pop(SC.puppet + 2.95, .45);
    if (ts > 0) {
      const ta = [bx + Math.cos(phi) * 200, by + Math.sin(phi) * 200];
      const swing = Math.sin((lt - 2.95) * 4) * .25 * Math.exp(-(lt - 2.95) * .6) + phi * .5;
      const tx = ta[0] + Math.sin(swing) * 90, ty = ta[1] + Math.cos(swing) * 90;
      inkLine(g, [ta, [tx, ty]], { w: 2.4, seed: 71, passes: 1 });
      g.save(); g.translate(tx, ty); g.rotate(Math.PI / 2 + swing - 1.57 + 1.2); g.restore();
      tagText(g, tx, ty, .3 + swing, ts, 'Puppet', { size: 60 });
    }
    put(g, 'p_note', 560, 845, { s: pop(SC.puppet + 3.35, .45), r: -.06 });
    // curtains + valance on top
    put(g, 'p_curtL', lerp(760, 205, open), 530, { r: 0 });
    put(g, 'p_curtR', lerp(1160, 1715, open), 530, { r: 0 });
    put(g, 'p_valance', 960, 95);
    for (let k = 0; k < 4; k++) sparkle(g, [300, 1620, 760, 1180][k], [300, 330, 180, 200][k], 1, SC.puppet + 1.1 + k * BEAT);
  },
});

/* ============================ 7  PIPELINES ============================ */
defSheet('pipes', '#2f5f8f', 'blueprint', { age: 'rgba(10,30,60,0.35)' });
function filletPath(pts, r = 60, per = 8) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], [cx, cy] = pts[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by);
    const p1 = [bx - (bx - ax) / l1 * r, by - (by - ay) / l1 * r], p2 = [bx + (cx - bx) / l2 * r, by + (cy - by) / l2 * r];
    for (let k = 0; k <= per; k++) { const t = k / per, u = 1 - t; out.push([u * u * p1[0] + 2 * u * t * bx + t * t * p2[0], u * u * p1[1] + 2 * u * t * by + t * t * p2[1]]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const PIPE = filletPath([[330, 262], [700, 262], [700, 560], [1180, 560], [1180, 300], [1600, 300], [1600, 720]], 70, 10);
const PIPE_LEN = polyLen(PIPE);
function pipeFrac(x, y) { // arclength fraction of the pipe point closest to (x,y)
  let best = 1e9, acc = 0, bestL = 0;
  for (let i = 1; i < PIPE.length; i++) { const a = PIPE[i - 1], b = PIPE[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); const d = Math.hypot((a[0] + b[0]) / 2 - x, (a[1] + b[1]) / 2 - y); if (d < best) { best = d; bestL = acc + l / 2; } acc += l; }
  return bestL / PIPE_LEN;
}
const STATIONS = [
  { name: 'Ansible', x: 700, y: 410, t: 1.3, tag: [520, 500, -.25], icon: 'pp_valve' },
  { name: 'Foreman', x: 940, y: 560, t: 2.12, tag: [880, 740, .1], icon: 'pp_gauge' },
  { name: 'Jenkins', x: 1390, y: 300, t: 2.72, tag: [1330, 150, -.08], icon: 'pp_valve2' },
];
STATIONS.forEach(s => s.f = pipeFrac(s.x, s.y));
defSprite('pp_laptop', 300, 220, (g, rc, R, v, R0) => {
  const lid = [[40, 0], [260, 0], [260, 150], [40, 150]]; paper(g, lid, '#b9c2c9', R0, { amp: 1 }); outline(rc, lid);
  paper(g, [[54, 14], [246, 14], [246, 138], [54, 138]], '#1e2a24', R0, { amp: .6 });
  text(g, '$ git push', 66, 48, { f: 'pixel', size: 15, color: '#7ee07e', align: 'left' });
  text(g, '> deploying…', 66, 82, { f: 'pixel', size: 13, color: '#7ee07e', align: 'left' });
  const base = [[0, 150], [300, 150], [280, 196], [20, 196]]; paper(g, base, '#9aa4ac', R0, { amp: 1 }); outline(rc, base);
}, { border: 5 });
defSprite('pp_valve', 170, 170, (g, rc, R, v, R0) => {
  const rim = paper(g, ellPts(85, 85, 78, 78, 36), '#d6453a', R0, { amp: .8 }); outline(rc, rim, { strokeWidth: 2.4 });
  g.fillStyle = '#2f5f8f'; g.beginPath(); g.arc(85, 85, 58, 0, TAU); g.fill();
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.strokeStyle = '#d6453a'; g.lineWidth = 14; g.beginPath(); g.moveTo(85, 85); g.lineTo(85 + Math.cos(a) * 62, 85 + Math.sin(a) * 62); g.stroke(); }
  paper(g, ellPts(85, 85, 20, 20, 16), '#f2c53d', R0, { amp: .5 });
}, { border: 5 });
defSprite('pp_valve2', 170, 170, (g, rc, R, v, R0) => {
  const rim = paper(g, ellPts(85, 85, 78, 78, 36), '#4d7cc7', R0, { amp: .8 }); outline(rc, rim, { strokeWidth: 2.4 });
  g.fillStyle = '#2f5f8f'; g.beginPath(); g.arc(85, 85, 58, 0, TAU); g.fill();
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .4; g.strokeStyle = '#4d7cc7'; g.lineWidth = 14; g.beginPath(); g.moveTo(85, 85); g.lineTo(85 + Math.cos(a) * 62, 85 + Math.sin(a) * 62); g.stroke(); }
  paper(g, ellPts(85, 85, 20, 20, 16), '#fbf7ee', R0, { amp: .5 });
}, { border: 5 });
defSprite('pp_gauge', 170, 170, (g, rc, R, v, R0) => {
  const rim = paper(g, ellPts(85, 85, 80, 80, 36), '#c8732f', R0, { amp: .8 }); outline(rc, rim, { strokeWidth: 2.4 });
  paper(g, ellPts(85, 85, 62, 62, 30), '#fbf7ee', R0, { amp: .5 });
  for (let i = 0; i <= 8; i++) { const a = Math.PI * .8 + i / 8 * Math.PI * 1.4; rc.line(85 + Math.cos(a) * 48, 85 + Math.sin(a) * 48, 85 + Math.cos(a) * 58, 85 + Math.sin(a) * 58, { strokeWidth: 2 }); }
  g.fillStyle = 'rgba(126,224,126,0.6)'; g.beginPath(); g.moveTo(85, 85); g.arc(85, 85, 44, Math.PI * 1.7, Math.PI * 2.2); g.fill();
}, { border: 5 });
defSprite('pkg', 90, 80, (g, rc, R, v, R0) => {
  const b = paper(g, rectPts(0, 0, 90, 80), '#c9975c', R0, { amp: 1 }); outline(rc, b, { strokeWidth: 2 });
  g.fillStyle = 'rgba(236,222,178,0.85)'; g.fillRect(38, 0, 14, 80);
  paper(g, [[8, 40], [36, 40], [36, 70], [8, 70]], '#fbf7ee', R0, { amp: .5, rim: false });
  g.strokeStyle = '#2a9d8f'; g.lineWidth = 4; g.beginPath(); g.moveTo(13, 56); g.lineTo(20, 63); g.lineTo(31, 46); g.stroke();
}, { border: 3, shadow: .6 });
defSprite('hardhat', 130, 80, (g, rc, R, v, R0) => {
  const d = ellPts(65, 70, 52, 58, 20, Math.PI, TAU); d.push([117, 70]); const dp = paper(g, d, '#f2c53d', R0, { amp: .8 }); outline(rc, dp, { strokeWidth: 2 });
  const brim = [[0, 66], [130, 66], [126, 80], [4, 80]]; paper(g, brim, '#e0a92a', R0, { amp: .6 }); outline(rc, brim, { strokeWidth: 2 });
  paper(g, [[58, 14], [72, 14], [72, 66], [58, 66]], '#e0a92a', R0, { amp: .4, rim: false });
}, { border: 3 });
defSprite('bowtie', 110, 60, (g, rc, R, v, R0) => {
  const l = [[55, 30], [0, 0], [0, 60]], r = [[55, 30], [110, 0], [110, 60]];
  paper(g, l, '#2a1d14', R0, { amp: .6 }); paper(g, r, '#2a1d14', R0, { amp: .6 });
  paper(g, ellPts(55, 30, 13, 13, 12), '#3d2d22', R0, { amp: .4 });
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(12, 16, 20, 4); g.fillRect(78, 16, 20, 4);
}, { border: 3 });
defSprite('pp_river', 1840, 200, (g, rc, R, v, R0) => {
  const p = [[0, 20]]; for (let x = 0; x <= 1840; x += 40) p.push([x, 16 + Math.sin(x * .02) * 8]); p.push([1840, 200], [0, 200]);
  const pp = paper(g, p, '#7cc0e3', R0, { amp: 1.5 });
  halftone(g, pp, 'rgba(255,255,255,0.22)', 12, 2.8, .3);
}, { border: 0, shadow: .9, boil: false });
const PKG_T0 = 3.3, PKG_GAP = .33, PKG_TRAVEL = 1.6, PKG_N = 7;

defScene('pipes', {
  sheet: 'pipes',
  draw(g, lt) {
    // chalk annotations
    writeText(g, 'pipeline.yml', 1000, 120, prog(lt, .4, 1.0), { size: 64, color: 'rgba(255,255,255,0.85)', r: -.03 });
    inkLine(g, [[820, 165], [1180, 150]], { p: prog(lt, .9, 1.1), color: 'rgba(255,255,255,0.7)', w: 3, seed: 81 });
    put(g, 'pp_river', 960, 945);
    river(g, lt, 60, 1860, 880, 1030, 300);
    // water pouring out of the pipe end
    if (lt > 3.2) {
      const wp = E.out(prog(lt, 3.2, 3.5));
      const ws = []; for (let k = 0; k <= 10; k++) ws.push([1600 + Math.sin(k * .9 + stepT() * 20) * 5, 740 + k / 10 * 150 * wp]);
      inkLine(g, ws, { w: 30, color: '#9fd4f0', seed: 90, wob: 2, passes: 1 });
      inkLine(g, ws, { w: 6, color: 'rgba(255,255,255,0.9)', seed: 91, wob: 3, passes: 1 });
      if (wp >= 1) for (let k = 0; k < 6; k++) { const R = mulberry32(k + Math.floor(T * 12) * 9); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(1600 + (R() - .5) * 90, 890 - R() * 40, 3 + R() * 6, 0, TAU); g.fill(); }
    }
    // the pipe, built piece by piece
    const bp = E.inOut(prog(lt, .05, 1.3));
    if (bp > 0) {
      const n = Math.max(2, Math.ceil(PIPE.length * bp)); const part = PIPE.slice(0, n);
      const end = along(PIPE, bp); part[part.length - 1] = [end.x, end.y];
      g.save(); g.lineCap = 'butt'; g.lineJoin = 'round';
      const stroke = (w, c) => { g.strokeStyle = c; g.lineWidth = w; pathPoly(g, part, false); g.stroke(); };
      stroke(62, '#3b1f0e'); stroke(50, '#c8732f'); stroke(22, '#dd9152'); stroke(6, 'rgba(255,230,190,0.8)');
      g.restore();
      // flanges
      for (let f = 0; f < bp; f += .07) {
        const q = along(PIPE, f); g.save(); g.translate(q.x, q.y); g.rotate(q.a);
        g.fillStyle = '#9a5424'; g.fillRect(-9, -36, 18, 72); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(-9, -36, 18, 72); g.restore();
      }
      if (bp > .98) { g.fillStyle = '#9a5424'; g.fillRect(1560, 712, 80, 26); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(1560, 712, 80, 26); }
    }
    put(g, 'pp_laptop', 210, 250, { s: pop(SC.pipes + .05, .45), r: -.04 });
    // stations with tags
    STATIONS.forEach((s, i) => {
      const ss = pop(SC.pipes + s.t, .45);
      if (ss <= 0) return;
      const spin = lt > PKG_T0 ? (lt - PKG_T0) * 2.5 : 0;
      put(g, s.icon, s.x, s.y, { s: ss, r: s.icon === 'pp_gauge' ? 0 : spin + i });
      if (s.icon === 'pp_gauge') { const a = Math.PI * 1.2 + Math.sin(lt * 5) * .3 + prog(lt, PKG_T0, PKG_T0 + 1) * .9; inkLine(g, [[s.x, s.y], [s.x + Math.cos(a) * 46, s.y + Math.sin(a) * 46]], { w: 5, color: '#c0392b', seed: 83, passes: 1 }); }
      const [tx, ty, tr] = s.tag;
      const sw = Math.sin((lt - s.t) * 4 + i) * .12 * Math.exp(-(lt - s.t) * .5);
      inkLine(g, [[s.x, s.y], [tx + 20, ty]], { w: 2.4, color: 'rgba(255,255,255,0.8)', seed: 84 + i, passes: 1 });
      tagText(g, tx, ty, tr + sw, ss, s.name, { size: 58 });
      if (i === 1) put(g, 'hardhat', tx + 150, ty - 58, { s: pop(SC.pipes + s.t + .15, .4), r: tr + sw + .1 });
      if (i === 2) put(g, 'bowtie', tx + 150, ty + 70, { s: pop(SC.pipes + s.t + .15, .4), r: tr + sw });
    });
    // deployments flowing downstream
    for (let i = 0; i < PKG_N; i++) {
      const t0 = PKG_T0 + i * PKG_GAP, dt = lt - t0; if (dt < 0) continue;
      if (dt < PKG_TRAVEL) {
        const q = along(PIPE, E.sine(dt / PKG_TRAVEL));
        const nx = Math.sin(q.a), ny = -Math.cos(q.a);
        put(g, 'pkg', q.x + nx * 62 * (ny < 0 ? 1 : -1) * 0 + (Math.abs(ny) > .5 ? 0 : -54), q.y - (Math.abs(ny) > .5 ? 58 : 0), { s: pop(SC.pipes + t0, .3) * .95, r: sway(.08, 1.4, i) });
        STATIONS.forEach((s, k) => { if (k === 0) return; sparkle(g, s.x, s.y - 80, 1, SC.pipes + t0 + PKG_TRAVEL * s.f, { color: '#7ee07e' }); });
      } else {
        const ft = dt - PKG_TRAVEL, fall = Math.min(1, ft / .35);
        const x = 1600 + ft * 290, y = fall < 1 ? 720 + E.in(fall) * 190 : 910 + Math.sin(ft * 5 + i) * 7;
        if (x < 1900) put(g, 'pkg', x, y, { r: fall < 1 ? fall * 2 : Math.sin(ft * 4 + i) * .12 });
        if (fall >= 1 && ft < .8) poof(g, 1600 + .35 * 290, 930, SC.pipes + t0 + PKG_TRAVEL + .35, { r: 60, pr: 14, n: 7, life: .4, seed: i, color: '#d9f1ff' });
      }
    }
    writeText(g, 'downstream', 1180, 990, prog(lt, 5.75, 6.2), { size: 70, color: INK, r: -.02 });
    inkLine(g, [[1340, 990], [1450, 984]], { p: prog(lt, 6.15, 6.3), w: 5, seed: 88 });
    inkLine(g, [[1425, 966], [1452, 984], [1425, 1004]], { p: prog(lt, 6.28, 6.36), w: 5, seed: 89 });
  },
});

/* ---------------- sfx for scenes 4-7 ---------------- */
(function () {
  const b = SC.boots;
  cue(b - .7, 'zoomout', { dur: 1.15, v: .5 });
  cue(b + .15, 'rustle', { dur: .3, v: .45 });
  cue(b + .38, 'thud', { v: .55 });
  cue(b + .5, 'jingle', { v: .35 });
  for (let k = 1; k <= 5; k++) cue(b + .06 + k * BEAT, 'stomp', { v: .6 });
  cue(b + 1.85, 'pencil', { dur: .45, v: .4 });
  cue(b + POOF, 'poof', { v: .7 });
  cue(b + POOF, 'marker', { dur: .2, v: .4 });
  cue(b + POOF + .1, 'pencil', { dur: .45, v: .4 });
  for (let i = 0; i < 9; i++) cue(b + POOF + .1 + i * .035, 'blip', { v: .18, f: 600 + (i % 4) * 200 });
  for (let k = 0; k < 2; k++) cue(b + POOF + .5 + (k + 1) * BEAT, 'hop', { v: .35 });

  const c = SC.cert;
  cue(c - .5, 'whoosh', { dur: .9, v: .5 });
  cue(c + .1, 'rustle', { dur: .5, v: .6 });
  cue(c + .5, 'slide', { v: .45, pitch: .8 });
  cue(c + .75, 'pencil', { dur: 1, v: .4 });
  cue(c + 1.9, 'ratchet', { dur: 2.6, v: .12 });
  cue(c + 2.15, 'pencil', { dur: 1, v: .4 });
  cue(c + 3.0, 'pop', { v: .4 });
  cue(c + 3.15, 'whoosh', { dur: .4, v: .35 });
  cue(c + 3.75, 'stamp', { v: 1 });
  cue(c + 3.77, 'cheer', { v: .35 });
  shake(c + 3.75, 16, .5);

  const p = SC.puppet;
  cue(p - .5, 'whoosh', { dur: .9, v: .5 });
  cue(p + .1, 'curtain', { dur: .7, v: .45 });
  cue(p + .3, 'slide', { v: .4, pitch: .7 });
  [.55, .7, .85].forEach((t, i) => cue(p + t + .45, 'thud', { v: .4, pitch: 1 + i * .15 }));
  for (let k = 0; k < 6; k++) cue(p + 1.15 + k * BEAT, 'twang', { v: .22, pitch: [1, 1.26, 1.5, 1.26, 1, 1.5][k] });
  cue(p + 2.95, 'pop', { v: .4 });
  cue(p + 3.35, 'pop', { v: .35, pitch: 1.2 });

  const q = SC.pipes;
  cue(q - .5, 'whoosh', { dur: .9, v: .5 });
  cue(q + .05, 'clank', { v: .4 }); cue(q + .35, 'clank', { v: .35, pitch: 1.2 }); cue(q + .7, 'clank', { v: .35, pitch: .9 }); cue(q + 1.05, 'clank', { v: .35, pitch: 1.1 });
  cue(q + .4, 'pencil', { dur: .6, v: .3 });
  STATIONS.forEach(s => cue(q + s.t, 'pop', { v: .45, pitch: 1 }));
  cue(q + 3.2, 'water', { dur: 3.5, v: .35 });
  cue(q + 3.25, 'gurgle', { dur: 3.4, v: .3 });
  for (let i = 0; i < PKG_N; i++) cue(q + PKG_T0 + i * PKG_GAP + PKG_TRAVEL + .35, 'plop', { v: .35, pitch: 1 + (i % 3) * .12 });
  cue(q + 5.75, 'pencil', { dur: .55, v: .3 });
})();
