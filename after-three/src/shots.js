// The edit. Every shot: { t0, set, update(c), lyric? }. Cuts are placed on the
// song's bars or just before sung lines; times come from the aligned lyrics.
import * as THREE from 'three';
import SONG from './data.js';
import { L, word, B, BEAT, v3, path, grade, fadeIn, fadeOut, flashIn, whipIn, whipOut, pump, bounce, numerals, caption, toScreen, clamp, lerp, smooth, invLerp, easeInOut, easeOut, mulberry32 } from './shotkit.js';
import { poseKeyring } from './props/keys.js';
import { poseTowel } from './sets/apartment.js';
import { noise1, fbm1, ring, decay, backOut, expoOut, easeIn } from './util.js';
import { FONTS } from './text.js';

const KF = [-4.45, 0.0, 0.95]; // where the keys land by the door
const HOOK = [-4.944, 1.503, 0.55];
const RED = 0xff1030, WARM = 0xffc89a, SUN = 0xfff0dc, MOON = 0x9db4ff;
const centered = { align: 'center', x: 960 };

// ---- prop helpers -------------------------------------------------------
function keysOnFloor(set, p = KF, spin = 0.6, settle = 0) {
  const k = set.keys;
  k.position.set(p[0], p[1] + 0.0035, p[2]);
  k.rotation.set(-Math.PI / 2 + settle * 0.15, 0, spin);
  poseKeyring(k, { dangle: 0.35, spread: 1.4 });
}
function keysOnHook(set, swing = 0, t = 0, withNew = false) {
  const k = set.keys;
  k.position.set(HOOK[0], HOOK[1], HOOK[2]);
  k.rotation.set(0, Math.PI / 2, swing * 0.15 * Math.sin(t * 4.1));
  poseKeyring(k, { dangle: 1, swing, t });
  k.userData.newPivot.visible = withNew;
}
function attach(obj, parent) { if (obj.parent !== parent) parent.add(obj); }
function redPulse(c, base = 0.35, k = 1.0) { return base + k * c.env('low', c.t); }
// key light helper for apartment
const key = (p, t, i, col = WARM, a = 0.5, extra = {}) => ({ p, t, i, c: col, a, ...extra });

// ---- fog writing (bridge window, shower) --------------------------------
let fogNoise = null;
function fogBase(w, h) {
  if (fogNoise) return fogNoise;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
  const img = x.createImageData(w, h); const r = mulberry32(5);
  for (let i = 0; i < w * h; i++) { const v = 0.55 + r() * 0.12; img.data[i * 4] = 210; img.data[i * 4 + 1] = 222; img.data[i * 4 + 2] = 240; img.data[i * 4 + 3] = v * 255; }
  x.putImageData(img, 0, 0);
  x.filter = 'blur(2px)'; x.drawImage(c, 0, 0); x.filter = 'none';
  // droplets
  for (let i = 0; i < 900; i++) { const px = r() * w, py = r() * h, s = 0.5 + r() * r() * 5; x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(px, py, s, 0, 7); x.fillStyle = 'rgba(0,0,0,0.6)'; x.fill(); x.globalCompositeOperation = 'source-over'; x.beginPath(); x.arc(px - s * 0.3, py - s * 0.3, s * 0.35, 0, 7); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fill(); }
  fogNoise = c; return c;
}
function writeFog(cv, phrases, t, { font = 'italic 92px "Instrument Serif"', width = 9 } = {}) {
  const x = cv.getContext('2d'); const w = cv.width, h = cv.height;
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, w, h);
  x.drawImage(fogBase(w, h), 0, 0);
  x.globalCompositeOperation = 'destination-out';
  x.font = font; x.lineJoin = 'round'; x.lineCap = 'round';
  for (const ph of phrases) {
    const p = clamp((t - ph.t0) / ph.dur); if (p <= 0) continue;
    const tw = x.measureText(ph.s).width;
    x.save(); x.beginPath(); x.rect(ph.x - 20, ph.y - 120, (tw + 40) * p, 200); x.clip();
    x.lineWidth = width; x.strokeStyle = 'rgba(0,0,0,0.92)'; x.fillStyle = 'rgba(0,0,0,0.92)';
    x.strokeText(ph.s, ph.x, ph.y); x.fillText(ph.s, ph.x, ph.y);
    x.restore();
    // drips running from the letters
    if (p >= 1) {
      const r = mulberry32(ph.x | 0); const age = t - ph.t0 - ph.dur;
      for (let i = 0; i < 4; i++) { const dx = ph.x + r() * tw, len = Math.min(140, age * (20 + r() * 40)); x.lineWidth = 3 + r() * 2; x.beginPath(); x.moveTo(dx, ph.y + 10); x.lineTo(dx + r() * 3, ph.y + 10 + len); x.stroke(); }
    }
  }
  x.globalCompositeOperation = 'source-over';
}

// ---- lyric style overrides ---------------------------------------------
const BIG_CENTER = { align: 'center', x: 960, y: 330, anchorY: 'middle', size: 84, maxWidth: 1400, blur: 14 };
for (const Ln of SONG.lines) {
  if (Ln.section === 'Whispered') Ln.lyric = { hidden: true };
}

export const SHOTS = [
  // ================= INTRO: the oven clock =================
  {
    t0: 0, set: 'apartment', lyric: {},
    update(c) {
      const s = c.set, cfg = s.cfg;
      grade(c.fx, 'night');
      cfg.lamp = 0; cfg.moon = 0.25; cfg.door = 0.4; cfg.led = Math.floor(c.t * 1.2) % 2 ? '3 07' : '3:07';
      const u = easeInOut(c.u, 2);
      const cp = v3([-1.25, 0.78, -2.82], [-1.33, 0.76, -3.0], u);
      c.look(cp, [-1.4, 0.74, -3.337], { fov: 26, shake: 0.3 });
      c.fx.focus = Math.hypot(cp[0] + 1.4, cp[1] - 0.74, cp[2] + 3.337); c.fx.aperture = 0.008; c.fx.maxBlur = 18;
      c.fx.exposure = 1.6; c.fx.bloom = 1.1;
      fadeIn(c, 1.0);
      caption(c, 'AFTER THREE', 960, 770, 0.45, 2.05, { align: 'center', size: 26, spacing: 22, weight: 500 });
    },
  },
  // ================= VERSE 1 =================
  {
    // The music's off, your friends are gone
    t0: B(0), set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg;
      grade(c.fx, 'night');
      cfg.speaker = 1 - smooth(invLerp(word(0, 2) - 0.1, word(0, 2) + 0.6, c.t));
      cfg.lamp = 1; cfg.door = 0.5;
      const u = easeInOut(c.u, 2);
      c.look(v3([0.1, 1.38, -1.0], [-0.45, 1.33, -1.45], u), v3([-2.6, 1.05, -3.8], [-2.5, 1.02, -3.8], u), { fov: 40, shake: 0.5 });
      c.fx.focus = 3.0; c.fx.aperture = 0.005;
    },
  },
  {
    // I'm in the doorway, shoes back on
    t0: B(2), set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg;
      grade(c.fx, 'night');
      cfg.door = 1.2; cfg.lamp = 1;
      // one shoe lifts away (being put on)
      const k = smooth(invLerp(word(1, 4) - 0.2, word(1, 4) + 0.9, c.t));
      s.shoeB.position.set(-5 + 0.3 + k * 0.05, 0.012 + easeIn(k, 2) * 0.9, 1.6 + 0.12);
      s.shoeB.rotation.set(-k * 0.5, -0.15, k * 0.2);
      const u = easeInOut(c.u, 2);
      c.look(v3([-3.55, 0.22, 2.45], [-3.85, 0.2, 2.2], u), [-4.85, 0.25, 1.55], { fov: 32, shake: 0.4 });
      c.fx.focus = 1.15; c.fx.aperture = 0.012;
      cfg.key = key([-3.6, 0.7, 2.6], [-4.7, 0.05, 1.55], 4, WARM, 0.5);
    },
  },
  {
    // I zip my coat, unzip, and then -
    t0: L(2) - 0.3, set: 'studio',
    update(c) {
      const s = c.set; grade(c.fx, 'warm'); c.fx.exposure = 1.35;
      s.surface.visible = false; s.backdrop.material.color.set(0x050506);
      s.zipper.visible = true; s.zipper.position.set(0, 0.0, 0);
      const zip = smooth(invLerp(word(2, 1) - 0.05, word(2, 3) + 0.25, c.t));
      const unzip = smooth(invLerp(word(2, 4) - 0.05, word(2, 4) + 0.75, c.t));
      const then = smooth(invLerp(word(2, 5), word(2, 6) + 0.4, c.t));
      const sPos = 0.22 + zip * 0.7 - unzip * 0.5 + then * 0.08;
      s.zipper.userData.pose(sPos, 1, c.t, ring(c.t, word(2, 4), 2.2, 2.5) * 0.4 + ring(c.t, word(2, 1), 2.0, 2.5) * 0.3);
      const sy = sPos * s.zipper.userData.LEN;
      c.look([0.075, sy + 0.035, 0.11], [0, sy - 0.012, 0], { fov: 30, shake: 0.35 });
      c.fx.focus = Math.hypot(0.075, 0.047, 0.11); c.fx.aperture = 0.01; c.fx.maxBlur = 20;
      s.key.position.set(0.35, sy + 0.45, 0.45); s.key.target.position.set(0, sy, 0); s.key.intensity = 30; s.key.angle = 0.35; s.key.penumbra = 1;
      s.scene.environmentIntensity = 0.8;
      s.rim.intensity = 40; s.rim.color.set(0x9db4ff); s.rim.position.set(-0.4, sy + 0.3, 0.1); s.rim.target.position.set(0, sy, 0);
      fadeIn(c, 0.15);
    },
  },
  {
    // You rinse the same glass once again (angle 1)
    t0: L(3) - 0.25, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'night');
      cfg.water = 1; cfg.lamp = 1.2;
      // the glass is held (by no one) under the tap and turned, again and again
      s.glass.position.set(-2.6 + 0.02 * Math.sin(c.t * 1.7), 1.0, -3.7); s.glass.rotation.set(0.35 + 0.08 * Math.sin(c.t * 1.9), c.t * 1.6, 0.25);
      const u = easeInOut(c.u, 2);
      c.look(v3([-2.28, 1.06, -3.2], [-2.33, 1.05, -3.26], u), [-2.6, 1.04, -3.7], { fov: 30, shake: 0.4 });
      c.fx.focus = 0.55; c.fx.aperture = 0.014;
      cfg.key = key([-2.2, 1.4, -3.1], [-2.6, 1.0, -3.7], 5, WARM, 0.3); cfg.glassEnv = 2.2; cfg.waterEnd = 1.05;
    },
  },
  {
    // ...once again (angle 2: from above — the same motion repeats)
    t0: word(3, 5) - 0.25, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'night');
      cfg.water = 1; cfg.lamp = 1.2;
      s.glass.position.set(-2.6 + 0.02 * Math.sin(c.t * 1.7), 1.0, -3.7); s.glass.rotation.set(0.35 + 0.08 * Math.sin(c.t * 1.9), c.t * 1.6, 0.25);
      const u = easeInOut(c.u, 2);
      c.look(v3([-2.95, 1.12, -3.25], [-2.9, 1.1, -3.3], u), [-2.6, 1.05, -3.72], { fov: 28, shake: 0.35 });
      c.fx.focus = 0.6; c.fx.aperture = 0.014;
      cfg.key = key([-3.0, 1.4, -3.1], [-2.6, 1.0, -3.7], 5, WARM, 0.3); cfg.glassEnv = 2.2; cfg.waterEnd = 1.05;
    },
  },
  {
    // You say it's way too late to walk — the window, the city, a neon sign
    t0: L(4) - 0.2, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'night');
      cfg.blindsTilt = 0.32; cfg.lamp = 0.8;
      cfg.neon = 0.12 + 0.12 * (noise1(c.t * 9) > 0.2 ? 1 : 0.2);
      const u = easeInOut(c.u, 2);
      c.look(v3([3.0, 1.5, 1.9], [3.3, 1.52, 1.4], u), [5.0, 1.65, -0.2], { fov: 34, shake: 0.4 });
      c.fx.focus = 2.0; c.fx.aperture = 0.008;
    },
  },
  {
    // And haven't even checked the clock
    t0: L(5) - 0.2, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'night');
      const b = (c.t - SONG.beats[0]) / BEAT; const tick = Math.floor(b) + easeOut(clamp((b % 1) / 0.12), 3);
      cfg.clock = [3, 41, (tick * 1) % 60]; cfg.lamp = 1;
      const u = easeInOut(c.u, 2);
      c.look(v3([0.12, 1.83, -3.15], [0.22, 1.87, -3.3], u), [0.55, 1.95, -3.97], { fov: 26, shake: 0.35 });
      const rack = smooth(invLerp(L(5) + 0.4, L(5) + 1.6, c.t));
      c.fx.focus = lerp(0.35, 0.82, rack); c.fx.aperture = 0.016;
      cfg.key = key([-0.3, 2.4, -3.0], [0.55, 1.9, -3.97], 14, WARM, 0.32);
    },
  },
  {
    // I say I'll count and go on three — the keys on their hook
    t0: L(6) - 0.2, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'night');
      cfg.door = 1.0;
      const sw = 0.35 * decay(c.t, word(6, 5), 1.5) + 0.05;
      keysOnHook(s, sw, c.t);
      const u = easeInOut(c.u, 2);
      c.look(v3([-4.55, 1.47, 0.95], [-4.68, 1.47, 0.82], u), [-4.95, 1.45, 0.56], { fov: 30, shake: 0.35 });
      c.fx.focus = 0.48; c.fx.aperture = 0.02;
      cfg.key = key([-4.2, 1.3, 1.2], [-4.95, 1.45, 0.55], 6, WARM, 0.4);
      numerals(c, [
        { ch: '1', x: 1500, y: 470, size: 150, t0: word(6, 3), t1: L(7), col: [255, 236, 210], alpha: 0.22, glow: 20, italic: true },
        { ch: '2', x: 1610, y: 470, size: 150, t0: word(6, 4), t1: L(7), col: [255, 236, 210], alpha: 0.22, glow: 20, italic: true },
        { ch: '3', x: 1720, y: 470, size: 150, t0: word(6, 7), t1: L(7), col: [255, 80, 90], alpha: 0.5, glow: 30, italic: true },
      ]);
    },
  },
  {
    // You dry your hands — the towel tugged, let go
    t0: L(7) - 0.2, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'night');
      const pull = smooth(invLerp(word(7, 1) - 0.1, word(7, 1) + 0.5, c.t)) * (1 - smooth(invLerp(word(7, 3) + 0.1, word(7, 3) + 0.5, c.t)));
      poseTowel(s.towel, pull * 0.5, c.t);
      s.towel.rotation.y = pull * 0.1;
      c.look([-1.6, 0.98, -2.75], [-1.95, 0.82, -3.35], { fov: 30, shake: 0.4 });
      c.fx.focus = 0.72; c.fx.aperture = 0.014;
      cfg.key = key([-1.3, 1.5, -2.7], [-1.95, 0.8, -3.35], 3, WARM, 0.35);
    },
  },
  {
    // ...and walk to me — POV down the hall to the door
    t0: word(7, 4) - 0.25, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'night');
      cfg.door = 1.3;
      const u = easeIn(c.u, 1.6);
      const steps = Math.abs(Math.sin((c.t - SONG.beats[0]) / BEAT * Math.PI)) * 0.018;
      const p = path([[-2.0, 1.62, -2.4], [-2.9, 1.6, -1.2], [-3.6, 1.58, 0.3], [-4.15, 1.56, 1.25]], u);
      p[1] += steps;
      c.look(p, v3([-4.6, 1.3, 0.2], [-5, 1.1, 1.6], smooth(u * 1.3)), { fov: lerp(40, 46, u), shake: 0.9 });
      cfg.key = key([-2.6, 2.4, 0.4], [-5, 1.0, 1.2], 22, MOON, 0.7, { pen: 1, shadow: false });
      c.fx.focus = lerp(3.5, 1.0, u); c.fx.aperture = 0.006;
      whipOut(c, [0.0, 1.0], 0.25, 0.18);
    },
  },
  // ================= CHORUS 1 =================
  {
    // One, you take my keys
    t0: L(8) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.1);
      cfg.neon = redPulse(c); cfg.door = 1; cfg.moon = 0.2;
      const lift = easeIn(invLerp(word(8, 2) - 0.1, word(8, 4) + 0.5, c.t), 2.2);
      keysOnHook(s, 0.25 + lift * 0.8, c.t * 1.4);
      s.keys.position.y += lift * 0.55; s.keys.position.x += lift * 0.12;
      c.look([-4.62, 1.5, 0.36], [-4.95, 1.47 + lift * 0.2, 0.55], { fov: 30, shake: 0.6 });
      c.fx.focus = 0.38; c.fx.aperture = 0.02;
      cfg.key = key([-4.3, 1.2, 0.2], [-4.95, 1.45, 0.55], 10 * redPulse(c, 0.5, 0.8), RED, 0.4);
      flashIn(c, 0.45, 0.25, [0.9, 0.1, 0.16]);
    },
  },
  {
    // Two, they hit the floor (slow motion)
    t0: L(9) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.1);
      cfg.neon = redPulse(c); cfg.door = 1; cfg.moon = 0.2;
      const hit = word(9, 4);
      const slow = 0.42 / (hit - c.shot.t0);
      const tau = (c.t - c.shot.t0) * slow;
      const bo = bounce(tau, 0.85, 0, 0, 0.28);
      const k = s.keys;
      const air = bo.airborne && bo.impacts.length === 0;
      k.position.set(KF[0] + 0.0, bo.y + 0.0035, KF[2]);
      const fall = clamp(tau / 0.42);
      k.rotation.set(-Math.PI / 2 * easeIn(fall, 1.5) + (air ? 0 : 0.08 * ring(c.t, hit, 3, 4)), fall * 1.2, 0.6 + fall * 1.4);
      poseKeyring(k, { dangle: air ? 1 - fall * 0.65 : 0.35 + 0.2 * ring(c.t, hit, 3.5, 5), swing: air ? 0.6 : 0, t: c.t * 3, spread: 1.4 });
      const shakeK = ring(c.t, hit, 9, 7) * 0.012;
      c.look([-3.95, 0.16 + shakeK, 0.52], [KF[0], 0.12 + shakeK * 0.5, KF[2]], { fov: 34, shake: 0.4 }); cfg.door = 0.35;
      c.fx.focus = 0.57; c.fx.aperture = 0.022;
      cfg.key = key([-4.0, 0.9, 1.4], [KF[0], 0, KF[2]], 8 * redPulse(c, 0.6, 0.6), RED, 0.5);
      const f = 0.35 * decay(c.t, hit, 9); if (f > c.fx.flash) { c.fx.flash = f; c.fx.flashColor = [0.9, 0.08, 0.14]; }
    },
  },
  {
    // Three, I leave them be
    t0: L(10) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.1);
      cfg.neon = redPulse(c); cfg.door = 1; cfg.moon = 0.2;
      keysOnFloor(s, KF, 0.6 + 1.4 + 1.2, 0);
      const a = lerp(2.5, 2.05, easeInOut(c.u, 2));
      c.look([KF[0] + Math.cos(a) * 0.2, 0.07, KF[2] + Math.sin(a) * 0.2], [KF[0], 0.008, KF[2]], { fov: 30, shake: 0.35 });
      c.fx.focus = 0.21; c.fx.aperture = 0.03; c.fx.maxBlur = 22;
      cfg.key = key([-4.0, 0.6, 1.5], [KF[0], 0, KF[2]], 10 * redPulse(c, 0.6, 0.6), RED, 0.5);
    },
  },
  {
    // Holding still right by the door
    t0: L(11) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.06);
      cfg.neon = redPulse(c, 0.3, 0.6); cfg.door = 1.3; cfg.moon = 0.2;
      keysOnFloor(s, KF, 3.2, 0);
      const u = easeInOut(c.u, 2);
      c.look(v3([-3.25, 0.14, 0.2], [-3.5, 0.13, 0.38], u), [-4.95, 0.55, 1.45], { fov: 34, shake: 0.4 });
      c.fx.focus = 1.2; c.fx.aperture = 0.01;
      cfg.key = key([-3.4, 0.8, 0.4], [-4.6, 0.3, 1.2], 22, RED, 0.6); cfg.door = 1.8;
    },
  },
  {
    // One — keys turning in the air (studio)
    t0: L(12) - 0.05, set: 'studio',
    update(c) {
      const s = c.set; grade(c.fx, 'red'); pump(c, 0.1);
      s.surface.visible = false; s.bokeh.visible = true;
      s.keys.visible = true; s.keys.position.set(0, lerp(0.25, 0.21, c.u), 0); s.keys.rotation.set(0.1, Math.sin(c.lt * 1.3) * 0.7, 0.08);
      poseKeyring(s.keys, { dangle: 0.9, swing: 0.2, t: c.t, spread: 3.2 });
      c.look([0.0, 0.225, 0.25], [0, 0.205, 0], { fov: 30, shake: 0.4 });
      c.fx.focus = 0.24; c.fx.aperture = 0.016;
      s.key.intensity = 40; s.key.position.set(0.4, 0.6, 0.6); s.key.target.position.set(0, 0.22, 0); s.scene.environmentIntensity = 0.7;
      s.rim.intensity = 120 * redPulse(c, 0.5, 0.8); s.rim.position.set(-0.4, 0.5, -0.5); s.rim.target.position.set(0, 0.22, 0);
      flashIn(c, 0.35, 0.2, [0.9, 0.1, 0.16]);
    },
  },
  {
    // Two — the fall again, from the side (studio, wood floor)
    t0: L(13) - 0.05, set: 'studio',
    update(c) {
      const s = c.set; grade(c.fx, 'red'); pump(c, 0.1);
      s.surface.material = s.surfaces.wood; s.bokeh.visible = true;
      const hit = word(13, 4);
      const slow = 0.27 / (hit - c.shot.t0);
      const tau = (c.t - c.shot.t0) * slow;
      const bo = bounce(tau, 0.35, 0, 0, 0.3);
      const air = bo.impacts.length === 0;
      const fall = clamp(tau / 0.27);
      s.keys.visible = true; s.keys.position.set(0, bo.y + 0.0035, 0);
      s.keys.rotation.set(-Math.PI / 2 * easeIn(fall, 1.4) + (air ? 0 : 0.1 * ring(c.t, hit, 3, 4)), 0.3, 1.0 + fall);
      poseKeyring(s.keys, { dangle: air ? 1 - fall * 0.6 : 0.4 + 0.2 * ring(c.t, hit, 3.5, 5), swing: air ? 0.5 : 0, t: c.t * 3, spread: 1.3 });
      const shakeK = ring(c.t, hit, 9, 7) * 0.006;
      c.look([0.32, 0.035 + shakeK, 0.18], [0, 0.03, 0], { fov: 30, shake: 0.3 });
      c.fx.focus = 0.37; c.fx.aperture = 0.02;
      s.key.intensity = 5; s.key.position.set(-0.3, 0.6, 0.5); s.key.target.position.set(0, 0, 0); s.key.angle = 0.25; s.scene.environmentIntensity = 0.5;
      s.rim.intensity = 50 * redPulse(c, 0.5, 0.8); s.rim.position.set(-0.5, 0.5, -0.6); s.rim.target.position.set(0, 0.0, 0); s.rim.angle = 0.25;
      const f = 0.35 * decay(c.t, hit, 9); if (f > c.fx.flash) { c.fx.flash = f; c.fx.flashColor = [0.9, 0.08, 0.14]; }
    },
  },
  {
    // Three — top down, the camera turning over the keys
    t0: L(14) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.1);
      cfg.neon = redPulse(c); cfg.door = 1.1; cfg.moon = 0.2;
      keysOnFloor(s, KF, 3.2, 0);
      const a = 0.6 + c.lt * 0.18;
      c.look([KF[0], lerp(0.5, 0.42, c.u), KF[2] + 0.001], [KF[0], 0, KF[2]], { fov: 30, shake: 0.3, up: [Math.cos(a), 0, Math.sin(a)] });
      c.fx.focus = 0.45; c.fx.aperture = 0.008;
      cfg.key = key([-4.1, 0.9, 1.3], [KF[0], 0, KF[2]], 12 * redPulse(c, 0.6, 0.6), RED, 0.45);
    },
  },
  {
    // Holding still right by the door — tilt from the handle down to the keys
    t0: L(15) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.06);
      cfg.neon = redPulse(c, 0.3, 0.7); cfg.door = 1.2; cfg.moon = 0.2;
      keysOnFloor(s, KF, 3.2, 0);
      const u = easeInOut(invLerp(0.2, 0.85, c.u), 2.5);
      c.look([-4.05, 0.95, 0.75], v3([-4.93, 1.0, 1.21], [KF[0], 0.02, KF[2]], u), { fov: 32, shake: 0.4 });
      c.fx.focus = lerp(1.0, 1.05, u); c.fx.aperture = 0.01;
      cfg.key = key([-4.0, 1.4, 0.5], [-4.9, 0.6, 1.2], 30, RED, 0.6); cfg.door = 2.0;
      fadeOut(c, 0.25, [0.06, 0.02, 0.0]);
    },
  },
  // ================= VERSE 2 =================
  {
    // You pull my coat down to one wrist — the zipper runs all the way down
    t0: L(16) - 0.1, set: 'studio',
    update(c) {
      const s = c.set; grade(c.fx, 'warm');
      s.surface.visible = false; s.backdrop.material.color.set(0x050404);
      s.zipper.visible = true;
      const d = easeInOut(invLerp(word(16, 1), word(16, 7) + 0.3, c.t), 2);
      const sPos = lerp(0.92, 0.04, d);
      s.zipper.userData.pose(sPos, 1 + d * 1.6, c.t, ring(c.t, word(16, 1), 2, 2) * 0.4);
      const sy = sPos * s.zipper.userData.LEN;
      c.look([-0.07, sy + 0.05, 0.16], [0, sy - 0.01, 0], { fov: 32, shake: 0.5 });
      c.fx.focus = Math.hypot(0.07, 0.06, 0.16); c.fx.aperture = 0.01;
      s.key.position.set(0.35, sy + 0.45, 0.45); s.key.target.position.set(0, sy, 0); s.key.intensity = 30; s.key.angle = 0.4; s.key.penumbra = 1;
      s.scene.environmentIntensity = 0.8;
      s.rim.intensity = 60; s.rim.color.set(0xffa060); s.rim.position.set(-0.4, 0.4, -0.4); s.rim.target.position.set(0, 0.2, 0);
      fadeIn(c, 0.2, [0.06, 0.02, 0.0]);
    },
  },
  {
    // And kiss me while I'm stuck like this — two glasses touch
    t0: L(17) - 0.1, set: 'studio',
    update(c) {
      const s = c.set; grade(c.fx, 'warm');
      s.bokeh.visible = true; s.wineA.visible = s.wineB.visible = true;
      const tc = word(17, 3);
      const k = easeOut(invLerp(c.shot.t0, tc, c.t), 2.2);
      const tilt = 0.16 * k + 0.012 * ring(c.t, tc, 6, 8);
      const gap = lerp(0.075, 0.0425, k);
      s.wineA.position.set(-gap, 0, 0); s.wineA.rotation.set(0, 0, -tilt);
      s.wineB.position.set(gap, 0, 0.004); s.wineB.rotation.set(0, 1.0, tilt);
      const u = easeInOut(c.u, 2);
      c.look(v3([0.05, 0.19, 0.42], [-0.03, 0.2, 0.38], u), [0, 0.17, 0], { fov: 30, shake: 0.4 });
      c.fx.focus = 0.41; c.fx.aperture = 0.012;
      s.key.intensity = 90; s.key.position.set(0.5, 0.7, 0.3); s.key.target.position.set(0, 0.15, 0); s.key.angle = 0.45;
      s.rim.intensity = 120; s.rim.color.set(0xffb070); s.rim.position.set(-0.3, 0.45, -0.6); s.rim.target.position.set(0, 0.15, 0);
      const glint = Math.exp(-Math.max(0, c.t - tc) * 3) * (c.t > tc - 0.03 ? 1 : 0);
      if (glint > 0.01) c.overlays.push((ctx) => {
        const [x, y] = toScreen(c, [0, 0.214, 0.002]);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 160 * glint + 20);
        g.addColorStop(0, `rgba(255,240,215,${0.85 * glint})`); g.addColorStop(0.15, `rgba(255,200,140,${0.35 * glint})`); g.addColorStop(1, 'rgba(255,160,90,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 300, y - 300, 600, 600);
        ctx.fillStyle = `rgba(255,235,210,${0.5 * glint})`; ctx.fillRect(x - 380 * glint, y - 1, 760 * glint, 2);
      });
    },
  },
  {
    // I tug your shirt, a button pops
    t0: L(18) - 0.1, set: 'studio',
    update(c) {
      const s = c.set; grade(c.fx, 'warm'); c.fx.exposure = 1.25;
      s.surface.visible = false; s.shirt.visible = true; s.shirt.position.set(0, 0.25, -0.006);
      const tug = ring(c.t, word(18, 1), 3, 4) * 0.012;
      s.shirt.position.z = -0.006 + tug; s.shirt.rotation.x = tug * 2;
      const pop = word(18, 6) - 0.05;
      const b = s.button; b.visible = true;
      if (c.t < pop) {
        b.position.set(0, 0.25, 0.0045 + tug * 1.2); b.rotation.set(0, 0, 0.3 + Math.sin(c.t * 30) * 0.03 * smooth(invLerp(word(18, 1), pop, c.t)));
      } else {
        const tau = (c.t - pop) * 0.28;
        b.position.set(0 + 0.55 * tau, 0.25 + 0.9 * tau - 4.9 * tau * tau, 0.0045 + 0.8 * tau);
        b.rotation.set(tau * 40, tau * 23, 0.3 + tau * 31);
      }
      c.look([0.035, 0.262, 0.15], [0.004, 0.252, 0], { fov: 28, shake: 0.4 });
      c.fx.focus = 0.15; c.fx.aperture = 0.02; c.fx.maxBlur = 22;
      s.key.intensity = 30; s.key.position.set(-0.35, 0.6, 0.45); s.key.target.position.set(0, 0.25, 0); s.key.angle = 0.45;
      s.rim.intensity = 0; s.fill.intensity = 0.4;
    },
  },
  {
    // You ask me "here?" — the button spins out and stops
    t0: L(19) - 0.1, set: 'studio',
    lyric: BIG_CENTER,
    update(c) {
      const s = c.set; grade(c.fx, 'warm');
      const stop = word(19, 6) + 0.05;
      const q = clamp((c.t - c.shot.t0) / (stop - c.shot.t0));
      const b = s.button; b.visible = true;
      const tilt = 0.6 * Math.pow(1 - q, 1.3);
      const phi = 2 * Math.PI * (1.2 * c.lt + 2.8 * c.lt * c.lt);
      const R = 0.0058;
      b.position.set(0, R * Math.sin(tilt) + 0.0012, 0);
      b.rotation.set(0, 0, 0);
      b.rotateY(phi); b.rotateX(-Math.PI / 2 + tilt);
      if (q >= 1) { b.position.set(0, 0.0012, 0); b.rotation.set(-Math.PI / 2, 0, phi * 0 + 2.0); }
      c.look([0.0, 0.035, 0.115], [0, 0.012, 0], { fov: 30, shake: 0.25 });
      c.fx.focus = 0.118; c.fx.aperture = 0.03; c.fx.maxBlur = 24;
      const dim = c.t > 65.0 ? 0.35 + 0.65 * smooth(invLerp(65.2, 66.1, c.t)) : 1;
      s.key.intensity = 80 * dim; s.key.position.set(0.05, 0.6, 0.12); s.key.target.position.set(0, 0, 0); s.key.angle = 0.18; s.key.penumbra = 0.9;
      s.rim.intensity = 30 * dim; s.rim.color.set(0xffa060); s.fill.intensity = 0.15;
    },
  },
  {
    // I work your belt free with one hand
    t0: L(20) - 0.1, set: 'studio',
    update(c) {
      const s = c.set; grade(c.fx, 'warm');
      s.surface.material = s.surfaces.wool; s.belt.visible = true; s.belt.position.set(0, 0.002, 0); s.belt.rotation.y = 0.35;
      const lift = smooth(invLerp(word(20, 1), word(20, 3), c.t));
      const slide = easeInOut(invLerp(word(20, 3) - 0.1, word(20, 7) + 0.3, c.t), 2);
      s.belt.userData.prongPivot.rotation.z = lift * 0.55 * (1 - slide * 0.5);
      s.belt.userData.strap.position.set(slide * 0.14, lift * 0.002, 0);
      const u = easeInOut(c.u, 2);
      c.look(v3([-0.07, 0.085, 0.13], [-0.04, 0.075, 0.14], u), [-0.01, 0.0, 0.0], { fov: 30, shake: 0.4 });
      c.fx.focus = 0.16; c.fx.aperture = 0.016;
      s.key.intensity = 90; s.key.position.set(0.25, 0.55, 0.4); s.key.target.position.set(0, 0, 0); s.key.angle = 0.4;
      s.rim.intensity = 80; s.rim.color.set(0xffb070); s.rim.position.set(-0.5, 0.2, -0.4); s.rim.target.position.set(0, 0, 0);
    },
  },
  {
    // You lift me higher than I planned — the camera rises into the lamp
    t0: L(21) - 0.1, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'warm'); c.fx.streak = 0.4;
      cfg.lamp = 1.3; cfg.lampSwing = 0.22 * Math.sin(c.lt * 2.2 + 0.4);
      const u = easeInOut(c.u, 2.4);
      c.look(v3([-2.15, 1.0, -2.45], [-2.3, 2.45, -2.95], u), v3([-2.6, 1.3, -3.6], [-2.6, 1.75, -3.5], u), { fov: lerp(40, 30, u), roll: u * 0.25, shake: 0.8 });
      c.fx.focus = lerp(1.2, 0.75, u); c.fx.aperture = 0.008;
    },
  },
  {
    // The counter's cold, and then it's not
    t0: L(22) - 0.1, set: 'studio',
    update(c) {
      const s = c.set; grade(c.fx, 'warm');
      const warmK = smooth(invLerp(word(22, 5) - 0.15, word(22, 6) + 0.3, c.t));
      s.drops.visible = true; s.setDrops(1 - smooth(invLerp(word(22, 4), word(22, 6) + 0.5, c.t)));
      s.tumbler.visible = true; s.tumbler.position.set(0.15, 0, -0.12);
      const u = easeInOut(c.u, 2);
      c.look(v3([-0.17, 0.045, 0.17], [-0.09, 0.04, 0.19], u), [0, 0.0, 0.0], { fov: 30, shake: 0.35 });
      c.fx.focus = 0.2; c.fx.aperture = 0.02;
      s.key.color.setRGB(lerp(0.6, 1.0, warmK), lerp(0.72, 0.72, warmK), lerp(1.0, 0.45, warmK)); s.key.intensity = 70;
      s.key.position.set(0.3, 0.5, -0.2); s.key.target.position.set(0, 0, 0); s.key.angle = 0.5;
      s.rim.intensity = 40; s.rim.color.setRGB(lerp(0.5, 1, warmK), lerp(0.6, 0.5, warmK), lerp(1, 0.3, warmK));
      c.fx.gain = [lerp(0.92, 1.08, warmK), lerp(0.98, 0.99, warmK), lerp(1.08, 0.88, warmK)];
      c.fx.shadowTint = [lerp(0, 0.012, warmK), 0.004, lerp(0.03, 0, warmK)];
    },
  },
  {
    // You twist my hair into a knot
    t0: L(23) - 0.1, set: 'studio',
    update(c) {
      const s = c.set; grade(c.fx, 'warm');
      s.surface.visible = false; s.hair.visible = true;
      s.hair.position.set(0, 0.56, 0); s.hair.scale.setScalar(0.36); s.hair.rotation.y = c.lt * 0.6;
      const m = s.hair.material.uniforms; m.uTime.value = c.t; m.uTwist.value = easeInOut(invLerp(word(23, 1), word(23, 6) + 0.2, c.t), 2);
      m.uLight.value.set(0.5, 0.6, 0.6).normalize(); m.uBright.value = 1.6;
      const tw = m.uTwist.value, fy = lerp(0.43, 0.52, smooth(tw)), fx = lerp(0, -0.025, smooth(tw));
      c.look([fx, fy + 0.02, 0.24 + 0.04 * tw], [fx, fy, 0], { fov: 32, shake: 0.5 });
      c.fx.focus = 0.24 + 0.04 * tw; c.fx.aperture = 0.008;
      s.key.intensity = 30; s.rim.intensity = 0;
      whipOut(c, [1, 0], 0.18, 0.2);
    },
  },
  // ================= CHORUS 2 =================
  {
    // One, you've got me pinned — the frame knocked crooked
    t0: L(24) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.12);
      cfg.neon = redPulse(c, 0.4, 1.0); cfg.moon = 0.2; cfg.lamp = 0.5;
      const hit = word(24, 4);
      const k = c.t < hit ? 0 : 1;
      s.frame.rotation.z = k * (-0.21 + 0.06 * ring(c.t, hit, 3.2, 5));
      s.frame.position.set(2.7 + k * 0.01, 1.55 - k * 0.015, -3.995);
      const u = easeIn(c.u, 2);
      const sh = ring(c.t, hit, 8, 7) * 0.02;
      c.look(v3([2.45, 1.48, -2.55], [2.6, 1.52, -3.05], u).map((v, i) => v + (i === 0 ? sh : 0)), [2.7, 1.55, -4], { fov: 32, shake: 0.7, roll: sh });
      c.fx.focus = lerp(1.45, 0.95, u); c.fx.aperture = 0.006;
      cfg.key = key([3.8, 1.5, -2.6], [2.7, 1.5, -4], 8.1 * redPulse(c, 0.6, 0.6), RED, 0.6);
      flashIn(c, 0.4, 0.25, [0.9, 0.1, 0.16]);
      const f = 0.4 * decay(c.t, hit, 9); if (f > c.fx.flash) { c.fx.flash = f; c.fx.flashColor = [1, 0.4, 0.4]; }
    },
  },
  {
    // Two, the wall, the floor — the world rolls over
    t0: L(25) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.12);
      cfg.neon = redPulse(c, 0.4, 1.0); cfg.moon = 0.2; cfg.lamp = 0.5;
      s.frame.rotation.z = -0.21;
      const u = easeInOut(invLerp(word(25, 1) - 0.4, word(25, 4) + 0.3, c.t), 2.2);
      c.look([2.3, 1.25, -2.4], v3([2.7, 1.4, -4.0], [2.0, 0.0, -2.1], u), { fov: 40, roll: u * Math.PI * 0.6, shake: 1.0 });
      c.fx.focus = lerp(1.6, 1.3, u); c.fx.aperture = 0.004;
      cfg.key = key([3.8, 1.5, -1.6], [2.4, 0.5, -3], 9.9 * redPulse(c, 0.6, 0.6), RED, 0.8);
      c.fx.warp = Math.abs(Math.sin(u * Math.PI)) * 0.03; c.fx.warpDir = [0.7, 0.7];
    },
  },
  {
    // Three, I pull you in — dolly zoom down the hall
    t0: L(26) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.12);
      cfg.neon = redPulse(c, 0.4, 1.0); cfg.moon = 0.2; cfg.door = 1.5; cfg.lamp = 0.6;
      keysOnFloor(s, KF, 3.2, 0);
      const u = easeInOut(c.u, 2);
      const x = lerp(-0.6, -3.45, u);
      const dist = -x + 5.0;
      const fov = 2 * Math.atan(1.25 / dist) * 180 / Math.PI;
      c.look([x, 1.15, 1.6], [-5, 1.05, 1.6], { fov, shake: 0.5 });
      c.fx.focus = dist; c.fx.aperture = 0.004;
      cfg.key = key([-2.5, 2.0, 0.9], [-5, 1.0, 1.6], 70 * redPulse(c, 0.6, 0.6), RED, 0.5); cfg.door = 2.2;
    },
  },
  {
    // Lost it after three or four — the clock spins, numbers run on
    t0: L(27) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.15);
      cfg.neon = redPulse(c, 0.4, 1.0); cfg.moon = 0.2; cfg.lamp = 0.6;
      const m = 41 + Math.pow(c.lt, 2) * 120 + c.lt * 60;
      cfg.clock = [3 + Math.floor(m / 60), m % 60, (m * 60) % 60];
      c.look([0.42, 1.92, -3.42], [0.55, 1.95, -3.97], { fov: 30, roll: Math.sin(c.lt * 2) * 0.08, shake: 0.8 });
      c.fx.focus = 0.56; c.fx.aperture = 0.012;
      cfg.key = key([1.2, 2.2, -3.2], [0.55, 1.95, -3.97], 6.3 * redPulse(c, 0.5, 0.8), RED, 0.4);
      const r = mulberry32(3);
      const items = [];
      for (let i = 0; i < 9; i++) items.push({ ch: String(3 + i), x: 260 + r() * 1400, y: 260 + r() * 560, size: 140 + r() * 260, t0: word(27, 3) + i * BEAT / 2 - 0.1, t1: word(27, 3) + i * BEAT / 2 + 0.9, col: i % 3 === 0 ? [255, 240, 230] : [255, 60, 75], alpha: 0.75, italic: r() > 0.5, blur: 8, fo: 0.5, rot: (r() - 0.5) * 0.4 });
      numerals(c, items);
    },
  },
  {
    // One, you've got me pinned — the couch is shoved from the wall
    t0: L(28) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.12);
      cfg.neon = redPulse(c, 0.4, 1.0); cfg.moon = 0.2; cfg.lamp = 0.5; cfg.accent = 1.5;
      const hit = word(28, 4) - 0.15;
      const sh = easeOut(invLerp(hit, hit + 0.35, c.t), 3);
      cfg.couchZ = sh * 0.5;
      s.scrapes.visible = s.scrapes2.visible = sh > 0;
      for (const [sc, x] of [[s.scrapes, 0.28], [s.scrapes2, 2.12]]) { sc.position.set(x, 0.003, 3.47 - 0.25 * sh + 0.1); sc.scale.set(Math.max(0.01, sh), 1, 1); sc.material.opacity = 0.6 * sh; }
      const shk = ring(c.t, hit + 0.3, 7, 6) * 0.03;
      c.look([1.2 + shk, 4.4, 2.9], [1.2, 0, 2.9], { fov: 38, up: [0, 0, -1], shake: 0.6 });
      cfg.key = key([2.6, 3.2, 1.2], [1.2, 0.3, 3.0], 90 * redPulse(c, 0.6, 0.6), RED, 0.75, { shadow: true }); cfg.hemiI = 0.6;
      flashIn(c, 0.4, 0.25, [0.9, 0.1, 0.16]);
    },
  },
  {
    // Two, the wall, the floor — the glass goes over, in slow motion, and cracks
    t0: L(29) - 0.05, set: 'studio',
    update(c) {
      const s = c.set; grade(c.fx, 'red'); pump(c, 0.1);
      s.surface.material = s.surfaces.wood; s.bokeh.visible = true;
      const hit = word(29, 4);
      const H0 = 0.32, t0 = c.shot.t0;
      const slow = Math.sqrt(2 * H0 / 9.81) / (hit - t0);
      const tau = Math.max(0, c.t - t0) * slow;
      if (c.t < hit) {
        s.tumbler.visible = true;
        s.tumbler.position.set(-0.05 + tau * 0.12, Math.max(0, H0 - 0.5 * 9.81 * tau * tau), 0);
        s.tumbler.rotation.set(0.2, 0.3, 0.4 + tau * 6.0);
      } else {
        const a = c.t - hit, k = easeOut(clamp(a / 0.5), 3);
        s.cracked.visible = true; s.cracked.position.set(-0.05 + 0.25 * 0.12, 0.037, 0); s.cracked.rotation.set(0, 0.3, Math.PI / 2);
        s.cracked.userData.A.position.set(0, -k * 0.012, 0); s.cracked.userData.A.rotation.set(0, 0, -k * 0.1);
        s.cracked.userData.B.position.set(0, k * 0.01, 0.0); s.cracked.userData.B.rotation.set(k * 0.6, 0, k * 0.2);
      }
      c.look([0.3, 0.07, 0.36], [0.0, 0.13, 0], { fov: 36, shake: 0.4 });
      c.fx.focus = 0.46; c.fx.aperture = 0.016;
      s.key.intensity = 10; s.key.position.set(0.3, 0.7, 0.4); s.key.target.position.set(0, 0, 0); s.key.angle = 0.3;
      s.rim.intensity = 70 * redPulse(c, 0.5, 0.8); s.rim.position.set(-0.4, 0.3, -0.5); s.rim.target.position.set(0, 0.05, 0); s.rim.angle = 0.35;
      const f = 0.45 * decay(c.t, hit, 9); if (f > c.fx.flash) { c.fx.flash = f; c.fx.flashColor = [1, 0.85, 0.85]; }
    },
  },
  {
    // Three, I pull you in — rushing into the bulb
    t0: L(30) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.12);
      cfg.neon = redPulse(c, 0.4, 1.0); cfg.moon = 0.2; cfg.lamp = 1.4; cfg.lampSwing = 0.3 * Math.sin(c.lt * 2.6);
      const u = easeIn(c.u, 2.5);
      const bulb = [-2.6 + Math.sin(cfg.lampSwing) * 1.0, 1.68, -3.5];
      c.look(v3([-2.0, 1.25, -2.4], [-2.5, 1.6, -3.3], u), bulb, { fov: lerp(36, 24, u), roll: -u * 0.4, shake: 1.0 });
      c.fx.focus = lerp(1.4, 0.3, u); c.fx.aperture = 0.008; c.fx.streak = 0.6;
      c.fx.flash = Math.max(c.fx.flash, smooth(invLerp(0.75, 1.0, c.u)) * 0.95); c.fx.flashColor = [1, 0.85, 0.7];
    },
  },
  {
    // Lost it after three or four — everything spins, then the dark
    t0: L(31) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'red'); pump(c, 0.18);
      cfg.neon = redPulse(c, 0.3, 1.2); cfg.moon = 0.2; cfg.lamp = 0.6 * (c.t < 92.75 ? 1 : 0);
      const m = 300 + Math.pow(c.lt, 2) * 200 + c.lt * 200;
      cfg.clock = [3 + Math.floor(m / 60), m % 60, (m * 60) % 60];
      c.look([0.48, 1.94, -3.6], [0.55, 1.95, -3.97], { fov: 34, roll: c.lt * 0.6, shake: 1.0 });
      c.fx.focus = 0.38; c.fx.aperture = 0.012;
      cfg.key = key([1.2, 2.2, -3.2], [0.55, 1.95, -3.97], 6.3 * redPulse(c, 0.5, 0.8), RED, 0.4);
      const strobe = c.env('high', c.t) > 0.62 && c.t < 92.75 ? 0.18 : 0;
      c.fx.flash = Math.max(c.fx.flash, strobe); c.fx.flashColor = [1, 0.4, 0.45];
      const r = mulberry32(8); const items = [];
      for (let i = 0; i < 16; i++) items.push({ ch: String(4 + i), x: 160 + r() * 1600, y: 220 + r() * 640, size: 120 + r() * 340, t0: word(31, 3) + i * BEAT / 3 - 0.1, t1: word(31, 3) + i * BEAT / 3 + 0.8, col: i % 4 === 0 ? [255, 240, 230] : [255, 60, 75], alpha: 0.8, italic: r() > 0.5, blur: 10, fo: 0.4, rot: (r() - 0.5) * 0.6, spin: (r() - 0.5) * 0.8 });
      numerals(c, items);
      if (c.t > 92.75) c.fx.fade = 1;
    },
  },
  // ================= BRIDGE =================
  {
    // In the dark you're still, and all the hurry's gone
    t0: L(32) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'moon');
      cfg.lamp = 0; cfg.moon = 3.2; cfg.door = 0.3; cfg.blindsTilt = 0.12; cfg.dust = 0.9; cfg.couchZ = 0.5;
      s.t1.position.set(1.05, 0.42, 1.95); s.w2.position.set(1.35, 0.42, 1.8); s.w2.rotation.set(Math.PI / 2, 0, 0.4); s.w2.position.y = 0.462;
      const u = easeInOut(c.u, 2);
      c.look(v3([-0.4, 0.75, 0.2], [-0.25, 0.72, 0.45], u), [1.3, 0.35, 1.6], { fov: 32, shake: 0.3 });
      c.fx.focus = 2.1; c.fx.aperture = 0.008;
      fadeIn(c, 1.2);
    },
  },
  {
    // Fingers trace around my wrist, but don't hold on
    t0: L(33) - 0.05, set: 'studio',
    update(c) {
      const s = c.set; grade(c.fx, 'moon');
      s.surface.material = s.surfaces.sheet; if (!s.surface.userData.folded) s.foldSurface(1);
      s.trace.visible = true;
      const draw = smooth(invLerp(word(33, 1), word(33, 4) + 0.6, c.t));
      const let_go = smooth(invLerp(word(33, 6) - 0.2, word(33, 8) + 0.6, c.t));
      const idx = s.trace.geometry.index.count;
      const n = Math.floor(idx * draw / 6) * 6;
      s.trace.geometry.setDrawRange(Math.floor(idx * let_go * 0.9 / 6) * 6, n);
      s.trace.position.set(0.0, 0.012 + let_go * 0.02, 0.0); s.trace.rotation.set(0, 0.3, 0);
      s.traceMat.opacity = 1 - let_go * 0.85;
      c.look([0.04, 0.25, 0.2], [0, 0.0, 0.0], { fov: 34, shake: 0.3 });
      c.fx.focus = 0.32; c.fx.aperture = 0.01;
      s.key.color.set(MOON); s.key.intensity = 60; s.key.position.set(0.9, 0.9, -0.5); s.key.target.position.set(0, 0, 0); s.key.angle = 0.45; s.key.map = s.gobo; s.key.penumbra = 0.3;
      s.fill.intensity = 0.15; s.hemi.intensity = 0.05; s.backdrop.visible = false;
    },
  },
  {
    // And you say it's not too late for me to go — the door, far away
    t0: L(34) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'moon');
      cfg.lamp = 0; cfg.moon = 1.2; cfg.door = 1.0; cfg.blindsTilt = 0.22; cfg.dust = 0.5; cfg.couchZ = 0.5;
      keysOnFloor(s, KF, 3.2, 0);
      const u = easeInOut(c.u, 2);
      c.look(v3([1.4, 1.05, 2.55], [0.9, 1.0, 2.35], u), [-5, 0.85, 1.6], { fov: 30, shake: 0.3 });
      cfg.key = key([-1.5, 2.6, 2.6], [-5, 0.9, 1.4], 30, MOON, 0.55, { pen: 1, shadow: false });
      c.fx.focus = 6.0; c.fx.aperture = 0.004;
      caption(c, '4:52 AM', 1720, 180, c.shot.t0 + 0.6, c.shot.t1 - 0.3, { align: 'right', size: 18, spacing: 8, color: [200, 214, 255] });
    },
  },
  {
    // So I start to count again, and count too slow
    t0: L(35) - 0.05, set: 'void',
    update(c) {
      const s = c.set; grade(c.fx, 'moon');
      s.dustMat.uniforms.uColor.value.setRGB(0.6, 0.72, 1.0);
      s.glow.visible = true; s.glow.material.color.setRGB(0.25, 0.35, 0.7); s.glow.position.set(1.2, 0.6, -5); s.glow.scale.setScalar(7);
      c.look([0, 0, 1.0 - c.lt * 0.05], [0, 0, -3], { fov: 40, shake: 0.4 });
      numerals(c, [
        { ch: '1', x: 760, y: 470, size: 520, t0: word(35, 4), t1: c.shot.t1 + 0.5, fi: 1.6, col: [214, 226, 255], alpha: 0.85, italic: true, blur: 26, blurEnd: 0, glow: 50, dy: -6, zoom: 0 },
        { ch: '2', x: 1180, y: 520, size: 520, t0: word(35, 9) - 0.2, t1: c.shot.t1 + 0.5, fi: 2.6, col: [214, 226, 255], alpha: 0.55, italic: true, blur: 30, glow: 50, dy: -4, zoom: 0 },
      ]);
    },
  },
  {
    // (I should go) (I don't know) (I won't go) — written in the window's fog
    t0: L(36) - 0.25, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'moon');
      const dawn = smooth(invLerp(c.shot.t0, c.shot.t1, c.t));
      cfg.lamp = 0; cfg.moon = 0.6; cfg.door = 0.4; cfg.blindsRaise = 1; cfg.fog = true; cfg.dawn = dawn; cfg.neon = 0.15 * (1 - dawn); cfg.couchZ = 0.5;
      const u = s.win.userData;
      writeFog(u.fogC, [
        { s: '(I should go)', x: 150, y: 240, t0: L(36) - 0.1, dur: 1.4 },
        { s: "(I don't know)", x: 420, y: 400, t0: L(37) - 0.1, dur: 1.5 },
        { s: "(I won't go)", x: 300, y: 560, t0: L(38) - 0.1, dur: 1.6 },
      ], c.t);
      u.fogTex.needsUpdate = true;
      u.fog.material.color.setRGB(0.35 + dawn * 0.5, 0.42 + dawn * 0.5, 0.6 + dawn * 0.45);
      const k = easeInOut(c.u, 2);
      c.look(v3([2.75, 1.62, 0.25], [3.05, 1.64, 0.15], k), [5, 1.66, 0.0], { fov: 40, shake: 0.35 });
      c.fx.focus = 2.1; c.fx.aperture = 0.004;
      c.fx.gain = [lerp(0.93, 1.05, dawn), lerp(0.98, 1.0, dawn), lerp(1.07, 1.02, dawn)];
      c.fx.flash = Math.max(c.fx.flash, smooth(invLerp(c.shot.t1 - 0.6, c.shot.t1, c.t))); c.fx.flashColor = [1, 0.97, 0.92];
    },
  },
  // ================= VERSE 3 (noon) =================
  {
    // I find one button in my shoe
    t0: B(51), set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'day');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.blindsTilt = 0.32; cfg.couchZ = 0.9; cfg.dust = 0.5;
      s.shoeA.position.set(2.15, 0.0, -0.1); s.shoeA.rotation.set(0, 2.6, 0);
      attach(s.button, s.shoeA); s.button.visible = true;
      { const iy = s.shoeA.userData.insoleY; const bx = 0.1; s.button.position.set(bx, iy(bx) + 0.0016, 0.004); s.button.rotation.set(-Math.PI / 2, Math.atan2(iy(bx + 0.01) - iy(bx - 0.01), 0.02), 0.8); }
      const u = easeInOut(c.u, 2);
      s.shoeA.updateMatrixWorld();
      const W = (x, y, z) => { const v = new THREE.Vector3(x, y, z); s.shoeA.localToWorld(v); return [v.x, v.y, v.z]; };
      const p = v3(W(0.0, 0.36, 0.24), W(0.03, 0.32, 0.21), u), tgt = W(0.11, 0.05, 0.0);
      c.look(p, tgt, { fov: 30, shake: 0.3 });
      c.fx.focus = Math.hypot(p[0] - tgt[0], p[1] - tgt[1], p[2] - tgt[2]); c.fx.aperture = 0.01;
      c.fx.flash = Math.max(c.fx.flash, 1 - smooth(c.lt / 0.5)); c.fx.flashColor = [1, 0.97, 0.92];
    },
  },
  {
    // Your spotless glass is cracked in two
    t0: B(52), set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'day');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9;
      s.glass.visible = false; s.cracked.visible = true;
      s.cracked.position.set(-3.1, 0.92, -3.5); s.cracked.rotation.set(0, 0.5, 0);
      s.cracked.userData.B.position.set(0.05, 0.0, 0.03); s.cracked.userData.B.rotation.set(0, 0.6, 0);
      s.cracked.userData.A.position.set(-0.01, 0, 0); s.cracked.userData.A.rotation.set(0, -0.15, 0);
      const u = easeInOut(c.u, 2);
      c.look(v3([-2.76, 1.07, -3.12], [-2.88, 1.05, -3.08], u), [-3.1, 0.95, -3.5], { fov: 30, shake: 0.3 });
      c.fx.focus = 0.5; c.fx.aperture = 0.012;
      cfg.key = key([-1.7, 2.2, -2.4], [-3.1, 0.92, -3.5], 60, SUN, 0.22, { pen: 0.4 });
    },
  },
  {
    // The couch is three feet from the wall — a floor plan dimension
    t0: B(53), set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'day');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9; cfg.blindsRaise = 0.6;
      s.scrapes.visible = s.scrapes2.visible = true;
      for (const [sc, x] of [[s.scrapes, 0.28], [s.scrapes2, 2.12]]) { sc.position.set(x, 0.003, 3.47 - 0.45 + 0.1); sc.scale.set(1, 1, 1); sc.material.opacity = 0.55; }
      const u = easeInOut(c.u, 2);
      c.look([1.2, lerp(5.2, 4.7, u), 2.85], [1.2, 0, 2.85], { fov: 38, up: [0, 0, -1], shake: 0.2 });
      const back = 3.47 - 0.9 + 0.46, wall = 4.0, x = 2.45;
      const draw = easeOut(invLerp(word(41, 1), word(41, 3) + 0.2, c.t), 3);
      const lab = smooth(invLerp(word(41, 3) - 0.1, word(41, 3) + 0.4, c.t));
      c.overlays.push((ctx) => {
        const a = toScreen(c, [x, 0.01, wall]), b = toScreen(c, [x, 0.01, back]);
        const m = [lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5)];
        const e = [lerp(m[0], a[0], draw), lerp(m[1], a[1], draw)], f = [lerp(m[0], b[0], draw), lerp(m[1], b[1], draw)];
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(f[0], f[1]); ctx.stroke();
        if (draw > 0.98) for (const p of [a, b]) { ctx.beginPath(); ctx.moveTo(p[0] - 18, p[1]); ctx.lineTo(p[0] + 18, p[1]); ctx.stroke(); }
        ctx.globalAlpha = lab; ctx.fillStyle = '#fff'; ctx.font = `600 30px ${FONTS.SANS}`; ctx.letterSpacing = '10px'; ctx.textAlign = 'left';
        ctx.fillText('3 FT', m[0] + 26, m[1] + 8);
        ctx.font = `italic 40px ${FONTS.SERIF}`; ctx.letterSpacing = '0px'; ctx.fillText('(0.91 m)', m[0] + 26, m[1] + 56);
      });
    },
  },
  {
    // ... I never felt it move at all — stillness at floor level
    t0: B(54), set: 'apartment',
    lyric: { size: 64 },
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'day'); c.fx.sat = 0.8;
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9; cfg.dust = 0.8;
      s.scrapes.visible = s.scrapes2.visible = true;
      for (const [sc, x] of [[s.scrapes, 0.28], [s.scrapes2, 2.12]]) { sc.position.set(x, 0.003, 3.47 - 0.45 + 0.1); sc.scale.set(1, 1, 1); sc.material.opacity = 0.6; }
      const u = c.u * 0.6;
      c.look([0.36, 0.055, 3.92 - u * 0.15], [0.26, 0.04, 2.9], { fov: 34, shake: 0.0 });
      c.fx.focus = 0.95; c.fx.aperture = 0.01;
      cfg.key = key([2.5, 2.4, 3.4], [0.4, 0, 3.2], 25, SUN, 0.5);
    },
  },
  {
    // My voice is gone, don't ask me how — steam
    t0: B(55), set: 'shower',
    update(c) {
      const s = c.set; grade(c.fx, 'day'); c.fx.exposure = 1.0;
      const m = s.mat.uniforms; m.uFog.value = lerp(0.55, 1, smooth(c.u * 1.5)); m.uExposure.value = 1.4;
      const x = s.maskC.getContext('2d'); x.clearRect(0, 0, s.maskC.width, s.maskC.height); s.maskTex.needsUpdate = true;
      c.look([0.1 - c.u * 0.1, 0.02, 1.5], [0, 0, 0], { fov: 40, shake: 0.4 });
    },
  },
  {
    // I'm humming in your shower now — a finger draws the hum in the steam
    t0: B(56), set: 'shower',
    update(c) {
      const s = c.set; grade(c.fx, 'day'); c.fx.exposure = 1.0;
      const m = s.mat.uniforms; m.uFog.value = 1; m.uExposure.value = 1.4;
      const x = s.maskC.getContext('2d'); const W = s.maskC.width, H = s.maskC.height;
      x.clearRect(0, 0, W, H);
      const t0 = word(44, 0) - 0.1, t1 = word(44, 5) + 0.3;
      const p = clamp((c.t - t0) / (t1 - t0));
      x.strokeStyle = '#fff'; x.lineWidth = 9; x.lineCap = 'round'; x.lineJoin = 'round'; x.filter = 'blur(3px)';
      x.beginPath();
      const N = 260;
      for (let i = 0; i <= N * p; i++) {
        const q = i / N; const tt = lerp(t0, t1, q);
        const amp = 6 + 30 * c.env('voc', tt);
        const px = lerp(W * 0.2, W * 0.8, q), py = H * 0.5 + (Math.sin(q * 120) * 0.75 + Math.sin(q * 47 + 1.3) * 0.25) * amp * Math.sin(q * Math.PI) + Math.sin(q * 6) * 14;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke(); x.filter = 'none';
      s.maskTex.needsUpdate = true;
      c.look([0.0, 0.0, 1.45 - c.u * 0.1], [0, 0, 0], { fov: 40, shake: 0.35 });
    },
  },
  {
    // It's noon, I'm dressed — the clock at twelve
    t0: B(57), set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'day');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9;
      cfg.clock = [12, 0, (c.t - B(57)) * 2 % 60];
      c.look([0.42, 1.9, -3.38], [0.55, 1.95, -3.97], { fov: 30, shake: 0.3 });
      c.fx.focus = 0.6; c.fx.aperture = 0.01;
      cfg.key = key([1.6, 2.4, -2.6], [0.55, 1.95, -3.97], 40, SUN, 0.3, { pen: 0.5 });
    },
  },
  {
    // ...I've lost my keys — the empty hook
    t0: word(45, 4) - 0.3, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'day');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9;
      s.keys.visible = false;
      const u = easeInOut(c.u, 2);
      c.look(v3([-4.6, 1.52, 0.86], [-4.66, 1.5, 0.78], u), [-4.97, 1.49, 0.55], { fov: 30, shake: 0.3 });
      c.fx.focus = 0.46; c.fx.aperture = 0.016;
      cfg.key = key([-3.2, 2.2, 0.0], [-4.97, 1.5, 0.55], 40, SUN, 0.35, { pen: 0.5 });
    },
  },
  {
    // You laugh and start to count to three — something glints under the couch
    t0: B(58), set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'day');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9; cfg.dust = 0.6;
      keysOnFloor(s, [0.55, 0, 2.02], 2.0, 0);
      const u = easeInOut(c.u, 2);
      c.look(v3([1.5, 0.55, 0.6], [1.2, 0.35, 1.2], u), v3([0.9, 0.2, 2.0], [0.6, 0.05, 2.02], u), { fov: 36, shake: 0.4 });
      c.fx.focus = lerp(2.2, 1.5, u); c.fx.aperture = 0.008;
      cfg.key = key([2.0, 1.4, 1.2], [0.55, 0, 2.02], 20, SUN, 0.25);
      const gl = smooth(invLerp(word(46, 1), word(46, 1) + 0.3, c.t)) * (0.6 + 0.4 * Math.sin(c.t * 9));
      c.overlays.push((ctx) => {
        const [x, y] = toScreen(c, [0.56, 0.02, 2.02]);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y, 0, x, y, 70); g.addColorStop(0, `rgba(255,240,200,${0.9 * gl})`); g.addColorStop(1, 'rgba(255,220,160,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 80, y - 80, 160, 160);
        ctx.fillStyle = `rgba(255,245,220,${0.8 * gl})`; ctx.fillRect(x - 110, y - 1, 220, 2); ctx.fillRect(x - 1, y - 60, 2, 120);
      });
      numerals(c, [
        { ch: '1', x: 1420, y: 430, size: 130, t0: word(46, 5), t1: c.shot.t1 + 0.2, col: [255, 214, 150], alpha: 0.7, italic: true, glow: 20 },
        { ch: '2', x: 1540, y: 430, size: 130, t0: word(46, 6), t1: c.shot.t1 + 0.2, col: [255, 214, 150], alpha: 0.7, italic: true, glow: 20 },
        { ch: '3', x: 1660, y: 430, size: 130, t0: word(46, 7), t1: c.shot.t1 + 0.2, col: [255, 214, 150], alpha: 0.7, italic: true, glow: 20 },
      ]);
    },
  },
  // ================= FINAL CHORUS =================
  {
    // One, you find my keys
    t0: L(47) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'gold');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9;
      const lift = easeIn(invLerp(word(47, 2), word(47, 4) + 0.6, c.t), 2);
      keysOnFloor(s, [0.55, 0, 2.02], 2.0, 0);
      if (lift > 0) {
        s.keys.position.y += lift * 0.6; s.keys.position.z -= lift * 0.15;
        s.keys.rotation.x = lerp(-Math.PI / 2, 0, smooth(lift * 2)); poseKeyring(s.keys, { dangle: smooth(lift * 2), swing: 0.4, t: c.t });
      }
      c.look([0.7, 0.06, 1.76], [0.56, 0.03 + lift * 0.25, 2.02], { fov: 30, shake: 0.4 });
      c.fx.focus = 0.3; c.fx.aperture = 0.016;
      cfg.key = key([1.8, 1.0, 1.6], [0.55, 0, 2.02], 25, SUN, 0.3);
    },
  },
  {
    // Two, you add one more — a new brass key threads onto the ring
    t0: L(48) - 0.05, set: 'studio',
    update(c) {
      const s = c.set; grade(c.fx, 'gold');
      s.surface.visible = false; s.bokeh.visible = true; s.backdrop.material.color.set(0x1a120a);
      s.keys.visible = true; s.keys.position.set(0, 0.22, 0); s.keys.rotation.set(0.05, 0.35 + c.lt * 0.15, 0.04);
      poseKeyring(s.keys, { dangle: 1, swing: 0.1, t: c.t, spread: 3.2 });
      const np = s.keys.userData.newPivot; np.visible = true;
      const k = easeInOut(invLerp(word(48, 2) - 0.2, word(48, 4) + 0.2, c.t), 2);
      const base = -Math.PI / 2 + 0.75;
      const ang = lerp(base + 2.3, base, k);
      np.position.set(Math.cos(ang) * 0.014, Math.sin(ang) * 0.014, 0.003);
      np.rotation.z = lerp(ang + 0.6, -Math.PI / 2 + 0.2, smooth(k));
      const pre = 1 - smooth(invLerp(c.shot.t0, word(48, 2) - 0.1, c.t));
      np.position.x += pre * 0.05; np.position.y += pre * 0.03;
      c.look([0.02, 0.2, 0.22], [0, 0.18, 0], { fov: 30, shake: 0.35 });
      c.fx.focus = 0.24; c.fx.aperture = 0.016;
      s.key.color.set(0xffd9a0); s.key.intensity = 50; s.scene.environmentIntensity = 0.7; s.key.position.set(0.35, 0.6, 0.45); s.key.target.position.set(0, 0.2, 0);
      s.rim.intensity = 120; s.rim.color.set(0xffb060); s.rim.position.set(-0.4, 0.45, -0.5); s.rim.target.position.set(0, 0.2, 0);
      s.fill.color.set(0xffe2c0); s.fill.intensity = 0.8;
    },
  },
  {
    // Three, you're mine to keep — hung back on the hook, two keys now
    t0: L(49) - 0.05, set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'gold');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9;
      keysOnHook(s, 0.3 * decay(c.t, c.shot.t0, 1.2) + 0.03, c.t, true);
      const u = easeInOut(c.u, 2);
      c.look(v3([-4.6, 1.47, 0.38], [-4.68, 1.47, 0.42], u), [-4.95, 1.45, 0.55], { fov: 30, shake: 0.3 });
      c.fx.focus = 0.38; c.fx.aperture = 0.018;
      cfg.key = key([-3.6, 2.0, 0.2], [-4.95, 1.45, 0.55], 40, 0xffe0b0, 0.3);
    },
  },
  {
    // Never made it through the door
    t0: L(50) - 0.05, set: 'apartment',
    lyric: { ...centered, y: 1080 * 0.82, anchorY: 'bottom', size: 64 },
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'gold');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9; cfg.door = 0.3;
      keysOnHook(s, 0.03, c.t, true);
      const u = easeInOut(c.u, 2);
      c.look(v3([-3.7, 1.4, 1.6], [-2.6, 1.45, 1.55], u), [-5, 1.05, 1.6], { fov: 34, shake: 0.3 });
      c.fx.focus = lerp(1.3, 2.4, u); c.fx.aperture = 0.006;
      cfg.key = key([-2.0, 2.3, 0.4], [-5, 1.0, 1.6], 45, 0xffe0b0, 0.45, { pen: 0.5 });
    },
  },
  // ================= OUTRO MONTAGE (daylight) =================
  {
    // two glasses, side by side
    t0: B(63), set: 'apartment',
    lyric: { ...centered, y: 1080 * 0.82, anchorY: 'bottom', size: 64 },
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'gold');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9;
      s.w1.position.set(-1.62, 0.92, -3.6); s.w2.position.set(-1.53, 0.92, -3.57);
      const u = easeInOut(c.u, 2);
      c.look(v3([-1.25, 1.12, -3.0], [-1.35, 1.1, -2.95], u), [-1.58, 1.04, -3.58], { fov: 30, shake: 0.3 });
      c.fx.focus = 0.7; c.fx.aperture = 0.012;
      cfg.key = key([-0.2, 2.3, -2.5], [-1.58, 0.95, -3.58], 55, 0xffe0b0, 0.25, { pen: 0.5 });
      fadeIn(c, 0.3, [1, 0.95, 0.88]);
    },
  },
  {
    // the lamp, still
    t0: B(64), set: 'apartment',
    lyric: { ...centered, y: 1080 * 0.82, anchorY: 'bottom', size: 64 },
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'gold');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9;
      const u = easeInOut(c.u, 2);
      c.look(v3([-1.7, 1.25, -2.4], [-1.8, 1.3, -2.5], u), [-2.6, 1.85, -3.5], { fov: 34, shake: 0.3 });
      c.fx.focus = 1.4; c.fx.aperture = 0.006;
      cfg.key = key([-0.5, 2.6, -1.8], [-2.6, 1.8, -3.5], 30, 0xffe0b0, 0.4);
    },
  },
  {
    // the button beside the cracked glass
    t0: B(65), set: 'apartment',
    lyric: { ...centered, y: 1080 * 0.82, anchorY: 'bottom', size: 64 },
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'gold');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9;
      s.glass.visible = false; s.cracked.visible = true;
      s.cracked.position.set(-3.1, 0.92, -3.5); s.cracked.rotation.set(0, 0.5, 0);
      s.cracked.userData.B.position.set(0.05, 0, 0.03); s.cracked.userData.B.rotation.set(0, 0.6, 0);
      attach(s.button, s.scene); s.button.visible = true; s.button.position.set(-3.0, 0.9215, -3.42); s.button.rotation.set(-Math.PI / 2, 0, 0.4);
      const u = easeInOut(c.u, 2);
      c.look(v3([-2.82, 1.0, -3.2], [-2.86, 0.99, -3.16], u), [-3.03, 0.93, -3.44], { fov: 30, shake: 0.3 });
      c.fx.focus = 0.32; c.fx.aperture = 0.016;
      cfg.key = key([-1.7, 2.2, -2.4], [-3.1, 0.92, -3.5], 60, 0xffe0b0, 0.22, { pen: 0.4 });
    },
  },
  {
    // the shoes, paired again by the door
    t0: B(66), set: 'apartment',
    lyric: { ...centered, y: 1080 * 0.82, anchorY: 'bottom', size: 64 },
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'gold');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9; cfg.door = 0.2;
      const u = easeInOut(c.u, 2);
      c.look(v3([-3.9, 0.45, 1.35], [-3.95, 0.42, 1.45], u), [-4.68, 0.06, 1.6], { fov: 32, shake: 0.3 });
      c.fx.focus = 0.9; c.fx.aperture = 0.012;
      cfg.key = key([-2.6, 2.0, 0.6], [-4.65, 0.0, 1.6], 45, 0xffe0b0, 0.35, { pen: 0.5 });
    },
  },
  {
    // the window, blinds up, the day outside
    t0: B(67), set: 'apartment',
    lyric: { ...centered, y: 1080 * 0.82, anchorY: 'bottom', size: 64 },
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'gold');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9; cfg.blindsRaise = 1; cfg.dust = 1;
      const u = easeInOut(c.u, 2);
      c.look(v3([1.9, 1.35, 1.4], [2.2, 1.38, 1.1], u), [5, 1.7, -0.3], { fov: 36, shake: 0.3 });
      c.fx.focus = 3.0; c.fx.aperture = 0.004;
    },
  },
  {
    // the couch, three feet out
    t0: B(68), set: 'apartment',
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'gold');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9; cfg.dust = 0.6;
      const u = easeInOut(c.u, 2);
      c.look(v3([3.4, 1.3, 0.8], [3.2, 1.25, 1.0], u), [1.2, 0.45, 2.7], { fov: 34, shake: 0.3 });
      c.fx.focus = 2.6; c.fx.aperture = 0.006;
    },
  },
  {
    // the door, the keys, the title
    t0: B(69), set: 'apartment',
    lyric: { ...centered, y: 1080 * 0.33, anchorY: 'middle', size: 60 },
    update(c) {
      const s = c.set, cfg = s.cfg; grade(c.fx, 'gold');
      cfg.mode = 'day'; cfg.lamp = 0; cfg.couchZ = 0.9; cfg.door = 0.2; cfg.dust = 0.6;
      keysOnHook(s, 0.02, c.t, true);
      const u = easeInOut(c.u, 1.6);
      c.look(v3([-4.0, 1.45, 0.75], [-2.3, 1.5, 1.2], u), v3([-4.95, 1.42, 0.6], [-5, 1.15, 1.2], u), { fov: lerp(30, 38, u), shake: 0.3 });
      c.fx.focus = lerp(0.95, 2.6, u); c.fx.aperture = 0.008;
      cfg.key = key([-2.0, 2.3, 0.4], [-5, 1.2, 1.0], 45, 0xffe0b0, 0.5, { pen: 0.5 });
      const ta = 162.9;
      c.overlays.push((ctx) => {
        const a = smooth(invLerp(ta, ta + 0.8, c.t));
        if (a <= 0) return;
        ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.fillStyle = '#fff8ee';
        ctx.shadowColor = 'rgba(60,30,0,0.5)'; ctx.shadowBlur = 30;
        ctx.font = `italic 400 160px ${FONTS.SERIF}`; ctx.fillText('After Three', 960, 640);
        ctx.shadowBlur = 10; ctx.font = `500 22px ${FONTS.SANS}`; ctx.letterSpacing = '14px'; ctx.globalAlpha = a * 0.8; ctx.fillText('03:07 AM — 12:03 PM', 960, 712);
      });
      fadeOut(c, 0.9);
    },
  },
];
