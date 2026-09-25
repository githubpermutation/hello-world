'use strict';
/* =====================================================================
 *  characters.js - our hero, as a kid and as a grown-up (cut paper)
 * ===================================================================== */
const SKIN = '#f3c9a2', HAIR = '#6b3f24', CHEEK = 'rgba(235,110,100,0.45)';

function bezPts(p0, p1, p2, p3, n = 20) {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return o;
}
function outline(rc, pts, o = {}) {
  rc.polygon(pts, Object.assign({ stroke: INK, strokeWidth: 2.4, roughness: .8, bowing: .6 }, o));
}
function hairPts(cx, cy, r, R0, spikes = 9) {
  const p = [];
  const a0 = Math.PI * 1.02, a1 = Math.PI * 1.98;
  for (let i = 0; i <= spikes * 2; i++) {
    const a = a0 + (a1 - a0) * i / (spikes * 2);
    const rr = r * (i % 2 ? 1.28 + R0() * .12 : 1.06);
    p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  // fringe back across the forehead
  for (let i = 0; i <= 8; i++) {
    const f = i / 8, x = cx + r * .98 - f * r * 1.96;
    const y = cy - r * .28 - (i % 2 ? r * .18 : 0) + Math.sin(f * Math.PI) * -r * .05;
    p.push([x, y]);
  }
  return p;
}
function face(g, rc, R0, cx, cy, r, o = {}) {
  // ears
  paper(g, ellPts(cx - r * .98, cy + r * .08, r * .18, r * .24, 16), SKIN, R0, { amp: .8 });
  paper(g, ellPts(cx + r * .98, cy + r * .08, r * .18, r * .24, 16), SKIN, R0, { amp: .8 });
  const fp = paper(g, ellPts(cx, cy, r, r * 1.04, 44), SKIN, R0, { amp: 1.1 });
  outline(rc, fp, { strokeWidth: 2.2 });
  // hair
  const hp = paper(g, hairPts(cx, cy, r, R0, o.spikes || 9), o.hair || HAIR, R0, { amp: 1.2 });
  outline(rc, hp, { strokeWidth: 2 });
  // eyes
  const ey = cy + r * .12, ex = r * .36, er = r * (o.eye || .1);
  if (o.wide) {
    for (const s of [-1, 1]) {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + s * ex, ey, er * 1.9, er * 2.2, 0, 0, TAU); g.fill();
      rc.ellipse(cx + s * ex, ey, er * 3.8, er * 4.4, { strokeWidth: 2 });
      g.fillStyle = INK; g.beginPath(); g.ellipse(cx + s * ex + er * .3, ey + er * .2, er * 1.05, er * 1.25, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + s * ex + er * .65, ey - er * .3, er * .38, 0, TAU); g.fill();
    }
  } else {
    for (const s of [-1, 1]) {
      g.fillStyle = INK; g.beginPath(); g.ellipse(cx + s * ex, ey, er * .8, er * 1.1, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + s * ex + er * .25, ey - er * .35, er * .28, 0, TAU); g.fill();
    }
  }
  // brows
  rc.line(cx - ex - r * .12, ey - r * .3, cx - ex + r * .12, ey - r * .34, { strokeWidth: 2.4 });
  rc.line(cx + ex - r * .12, ey - r * .34, cx + ex + r * .12, ey - r * .3, { strokeWidth: 2.4 });
  // cheeks
  g.fillStyle = CHEEK;
  g.beginPath(); g.ellipse(cx - r * .58, cy + r * .42, r * .16, r * .1, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(cx + r * .58, cy + r * .42, r * .16, r * .1, 0, 0, TAU); g.fill();
  // nose + smile
  rc.arc(cx + r * .02, cy + r * .32, r * .14, r * .12, 0.2, Math.PI - .2, false, { strokeWidth: 2 });
  if (o.mouthO) {
    g.fillStyle = '#7a2e2a'; g.beginPath(); g.ellipse(cx, cy + r * .62, r * .14, r * .17, 0, 0, TAU); g.fill();
    rc.ellipse(cx, cy + r * .62, r * .28, r * .34, { strokeWidth: 2 });
  } else {
    const sp = [[cx - r * .36, cy + r * .52], [cx - r * .15, cy + r * .72], [cx + r * .15, cy + r * .72], [cx + r * .36, cy + r * .52]];
    g.fillStyle = '#7a2e2a'; pathPoly(g, spline(sp, 6)); g.fill();
    rc.curve(sp, { strokeWidth: 2.4 });
    g.fillStyle = '#fff'; g.fillRect(cx - r * .2, cy + r * .54, r * .4, r * .07);
  }
}
function stripes(g, pts, c1, c2, h, off = 0) {
  g.save(); pathPoly(g, pts); g.clip();
  const bb = bbox(pts);
  for (let y = bb.y + off, i = 0; y < bb.y + bb.h; y += h, i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(bb.x - 5, y, bb.w + 10, h + .5); }
  g.restore();
}

/* ---- kid (Commodore era) : 300 x 480, head centre (150,120) ---- */
defSprite('kid', 300, 480, (g, rc, R, v, R0) => {
  // arms (behind torso)
  for (const s of [-1, 1]) {
    const arm = tornPts([[150 + s * 70, 225], [150 + s * 118, 300], [150 + s * 130, 410], [150 + s * 98, 415], [150 + s * 88, 310], [150 + s * 60, 260]], R0, 1.2, 8);
    pathPoly(g, arm); g.fillStyle = '#e4572e'; g.fill(); stripes(g, arm, '#e4572e', '#f6e8c8', 16, 4); outline(rc, arm, { strokeWidth: 2 });
    paper(g, ellPts(150 + s * 114, 420, 20, 18, 14), SKIN, R0);
  }
  const body = tornPts([[78, 230], [222, 230], [240, 470], [60, 470]], R0, 1.4, 8);
  pathPoly(g, body); g.fillStyle = '#e4572e'; g.fill();
  stripes(g, body, '#e4572e', '#f6e8c8', 20, 6);
  outline(rc, body);
  // collar
  paper(g, ellPts(150, 232, 44, 14, 20), '#2a9d8f', R0);
  face(g, rc, R0, 150, 125, 92, { wide: true, eye: .1 });
}, { border: 6 });

/* ---- big kid face for the "hooked" close-up : 800 x 640, head centre (400,300) ---- */
defSprite('kidface', 800, 640, (g, rc, R, v, R0) => {
  const body = tornPts([[180, 520], [620, 520], [760, 640], [40, 640]], R0, 2, 10);
  pathPoly(g, body); g.fillStyle = '#e4572e'; g.fill(); stripes(g, body, '#e4572e', '#f6e8c8', 34, 10); outline(rc, body);
  paper(g, ellPts(400, 520, 110, 34, 24), '#2a9d8f', R0);
  face(g, rc, R0, 400, 300, 230, { wide: true, eye: .1, mouthO: true, spikes: 11 });
}, { border: 8 });

/* ---- grown-up Lars : 300 x 600, head centre (150,105) ---- */
function drawLars(g, rc, R0, o = {}) {
  // legs
  for (const s of [-1, 1]) {
    const leg = tornPts([[150 + s * 8, 390], [150 + s * 62, 390], [150 + s * 58, 560], [150 + s * 14, 560]], R0, 1.2, 8);
    paper(g, leg, '#3d5a80', R0, { torn: false }); outline(rc, leg, { strokeWidth: 2 });
    const shoe = tornPts([[150 + s * 4, 555], [150 + s * 70, 555], [150 + s * 86, 588], [150 + s * 2, 590]], R0, 1, 6);
    paper(g, shoe, '#f6f1e6', R0, { torn: false }); outline(rc, shoe, { strokeWidth: 2 });
    rc.line(150 + s * 4, 578, 150 + s * 84, 578, { stroke: '#e4572e', strokeWidth: 3 });
  }
  // left arm (viewer's left) always down
  const arm = tornPts([[82, 215], [48, 300], [42, 390], [72, 392], [84, 310], [104, 240]], R0, 1.2, 8);
  paper(g, arm, '#23867a', R0, { torn: false }); outline(rc, arm, { strokeWidth: 2 });
  paper(g, ellPts(57, 400, 19, 17, 14), SKIN, R0);
  if (!o.noRightArm) {
    const arm2 = arm.map(([x, y]) => [300 - x, y]);
    paper(g, arm2, '#23867a', R0, { torn: false }); outline(rc, arm2, { strokeWidth: 2 });
    paper(g, ellPts(243, 400, 19, 17, 14), SKIN, R0);
  }
  // hoodie
  const body = tornPts([[88, 200], [212, 200], [236, 405], [64, 405]], R0, 1.4, 8);
  paper(g, body, '#2a9d8f', R0); outline(rc, body);
  // pocket + strings
  const pk = [[105, 330], [195, 330], [205, 385], [95, 385]];
  paper(g, pk, '#23867a', R0, { amp: 1 }); outline(rc, pk, { strokeWidth: 1.8 });
  rc.line(132, 215, 128, 285, { strokeWidth: 2, stroke: '#f6f1e6' }); rc.line(168, 215, 172, 285, { strokeWidth: 2, stroke: '#f6f1e6' });
  // hood
  paper(g, ellPts(150, 205, 62, 20, 20), '#23867a', R0);
  face(g, rc, R0, 150, 105, 80, { eye: .1 });
}
defSprite('lars', 300, 600, (g, rc, R, v, R0) => drawLars(g, rc, R0), { border: 6 });
defSprite('larsNoArm', 300, 600, (g, rc, R, v, R0) => drawLars(g, rc, R0, { noRightArm: true }), { border: 6 });
/* raised right arm with thumbs-up; pivot at shoulder = (30, 190) */
defSprite('larsArmUp', 90, 210, (g, rc, R, v, R0) => {
  const arm = tornPts([[18, 200], [52, 200], [62, 70], [34, 66]], R0, 1.2, 8);
  paper(g, arm, '#23867a', R0, { torn: false }); outline(rc, arm, { strokeWidth: 2 });
  const fist = ellPts(48, 52, 24, 22, 16);
  paper(g, fist, SKIN, R0); outline(rc, fist, { strokeWidth: 2 });
  const th = [[40, 34], [46, 6], [58, 6], [60, 34]];
  paper(g, th, SKIN, R0, { torn: false }); outline(rc, th, { strokeWidth: 2 });
}, { border: 5 });
