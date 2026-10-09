// Helpers for writing shots: grades, timing, camera paths, physics, overlays.
import SONG from './data.js';
import { clamp, lerp, smooth, invLerp, easeInOut, easeOut, mulberry32 } from './util.js';
import { FONTS } from './text.js';

export const L = (i) => SONG.lines[i].start;
export const LE = (i) => SONG.lines[i].end;
export const word = (i, w) => SONG.lines[i].words[w].t;
export const B = (n) => SONG.downbeats[n];
export const BEAT = 60 / SONG.bpm;

export const v3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
// Catmull-Rom through points, t in [0,1]
export function path(pts, t) {
  t = clamp(t) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(t)), f = t - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
  return [0, 1, 2].map((k) => {
    const a = p0[k], b = p1[k], c = p2[k], d = p3[k];
    return 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
  });
}

const GRADES = {
  night: { exposure: 1.35, lift: [0.006, 0.008, 0.016], gamma: [1, 1, 1.02], gain: [1.03, 0.99, 0.95], shadowTint: [0, 0.006, 0.022], highTint: [0.03, 0.012, 0], sat: 0.95, contrast: 1.07, bloom: 0.75, halation: 0.4, grain: 0.032 },
  red: { exposure: 1.05, lift: [0.012, 0.004, 0.008], gamma: [1, 1, 1], gain: [1.05, 0.97, 0.97], shadowTint: [0.018, 0, 0.01], highTint: [0.035, 0, 0.012], sat: 1.06, contrast: 1.1, bloom: 0.95, halation: 0.55, grain: 0.034, streak: 0.35 },
  warm: { exposure: 1.4, lift: [0.01, 0.006, 0.004], gamma: [1, 1, 1], gain: [1.07, 0.99, 0.9], shadowTint: [0.01, 0.004, 0.0], highTint: [0.035, 0.018, 0], sat: 1.0, contrast: 1.08, bloom: 0.85, halation: 0.5, grain: 0.032 },
  moon: { exposure: 1.3, lift: [0.004, 0.008, 0.02], gamma: [1, 1, 1.03], gain: [0.93, 0.98, 1.07], shadowTint: [0, 0.008, 0.03], highTint: [0.0, 0.01, 0.03], sat: 0.72, contrast: 1.04, bloom: 0.7, halation: 0.2, grain: 0.036 },
  day: { exposure: 0.9, lift: [0.012, 0.012, 0.012], gamma: [1.02, 1.0, 0.98], gain: [1.03, 1.0, 0.96], shadowTint: [0.004, 0.008, 0.016], highTint: [0.02, 0.012, 0.0], sat: 0.92, contrast: 1.07, bloom: 0.55, halation: 0.25, grain: 0.026 },
  gold: { exposure: 0.92, lift: [0.014, 0.01, 0.006], gamma: [1.02, 1.0, 0.97], gain: [1.08, 1.0, 0.87], shadowTint: [0.01, 0.006, 0.01], highTint: [0.04, 0.022, 0.0], sat: 0.98, contrast: 1.08, bloom: 0.7, halation: 0.4, grain: 0.028 },
};
export function grade(fx, name) { Object.assign(fx, JSON.parse(JSON.stringify(GRADES[name]))); }

// fade from/to black around a shot edge
export function fadeIn(c, dur = 0.5, col = [0, 0, 0]) { c.fx.fade = Math.max(c.fx.fade, 1 - smooth(c.lt / dur)); c.fx.fadeColor = col; }
export function fadeOut(c, dur = 0.5, col = [0, 0, 0]) { c.fx.fade = Math.max(c.fx.fade, smooth((c.lt - (c.dur - dur)) / dur)); c.fx.fadeColor = col; }
export function flashIn(c, k = 0.8, dur = 0.35, col = [1, 1, 1]) { const f = k * Math.exp(-c.lt / dur * 3); if (f > c.fx.flash) { c.fx.flash = f; c.fx.flashColor = col; } }
export function whipIn(c, dir = [1, 0], dur = 0.22, amt = 0.25) { const k = 1 - smooth(c.lt / dur); c.fx.warp = Math.max(c.fx.warp, k * amt); c.fx.warpDir = dir; }
export function whipOut(c, dir = [1, 0], dur = 0.2, amt = 0.25) { const k = smooth((c.lt - (c.dur - dur)) / dur); c.fx.warp = Math.max(c.fx.warp, k * amt); c.fx.warpDir = dir; }
// beat-reactive exposure pump
export function pump(c, k = 0.08, band = 'low') { c.fx.exposure *= 1 + k * c.env(band, c.t); }

// Ballistic drop with bounces. Returns {y, vy, impacts:[t...], settled}
export function bounce(t, y0, v0 = 0, floor = 0, e = 0.3, g = 9.81) {
  let y = y0, v = v0, tt = 0; const impacts = [];
  for (let k = 0; k < 6; k++) {
    // time to hit floor: y + v t - g t^2/2 = floor
    const a = -g / 2, b = v, cc = y - floor;
    const th = (-b - Math.sqrt(b * b - 4 * a * cc)) / (2 * a);
    if (t < tt + th) { const s = t - tt; return { y: y + v * s - g * s * s / 2, vy: v - g * s, impacts, airborne: true }; }
    tt += th; impacts.push(tt);
    const vin = v - g * th; v = -vin * e; y = floor;
    if (Math.abs(v) < 0.08) break;
  }
  return { y: floor, vy: 0, impacts, airborne: false };
}

// Numerals overlay drawn behind text: list of {ch, x, y, size, t0, t1, col, alpha, blur, italic}
export function numerals(c, items) {
  c.overlays.push((ctx) => {
    for (const n of items) {
      const a = smooth(invLerp(n.t0, n.t0 + (n.fi ?? 0.12), c.t)) * (1 - smooth(invLerp(n.t1 - (n.fo ?? 0.4), n.t1, c.t))) * (n.alpha ?? 1);
      if (a <= 0.002) continue;
      const lt = c.t - n.t0;
      const s = n.size * (1 + (n.zoom ?? 0.08) * Math.exp(-lt * 5) + (n.grow ?? 0) * lt);
      ctx.save();
      ctx.font = `${n.italic ? 'italic ' : ''}400 ${s}px ${FONTS.SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const col = n.col ?? [255, 60, 70];
      if (n.blur && ctx.filter !== undefined) ctx.filter = `blur(${n.blur * (1 - smooth(lt / 0.6)) + (n.blurEnd ?? 0)}px)`;
      ctx.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},${a * 0.7})`; ctx.shadowBlur = n.glow ?? 40;
      ctx.translate(n.x + (n.dx ?? 0) * lt, n.y + (n.dy ?? 0) * lt); if (n.rot) ctx.rotate(n.rot + (n.spin ?? 0) * lt);
      if (n.stroke) { ctx.lineWidth = n.stroke; ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`; ctx.strokeText(n.ch, 0, 0); }
      else { ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`; ctx.fillText(n.ch, 0, 0); }
      ctx.restore();
    }
  });
}

// small spaced caption (time stamps etc.)
export function caption(c, str, x, y, t0, t1, opts = {}) {
  const a = smooth(invLerp(t0, t0 + 0.4, c.t)) * (1 - smooth(invLerp(t1 - 0.4, t1, c.t)));
  c.overlays.push((ctx, text) => text.caption(str, x, y, a * (opts.alpha ?? 0.85), opts));
}

// project a world point to screen pixels
export function toScreen(c, p) {
  const v = { x: p[0], y: p[1], z: p[2] };
  const cam = c.cam; cam.updateMatrixWorld();
  const e = cam.matrixWorldInverse.elements, pe = cam.projectionMatrix.elements;
  const x = e[0] * v.x + e[4] * v.y + e[8] * v.z + e[12], y = e[1] * v.x + e[5] * v.y + e[9] * v.z + e[13], z = e[2] * v.x + e[6] * v.y + e[10] * v.z + e[14];
  const cx = pe[0] * x + pe[8] * z, cy = pe[5] * y + pe[9] * z, w = -z;
  return [(cx / w * 0.5 + 0.5) * 1920, (1 - (cy / w * 0.5 + 0.5)) * 1080, w];
}

export { clamp, lerp, smooth, invLerp, easeInOut, easeOut, mulberry32 };
