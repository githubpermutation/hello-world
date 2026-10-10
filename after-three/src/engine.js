// The film is a pure function of time: render(t) finds the active shot, lets
// it pose its set, camera, lights and grade, then runs the post chain.
import * as THREE from 'three';
import { Post, DEFAULT_FX } from './post.js';
import { TextLayer } from './text.js';
import SONG from './data.js';
import { SHOTS } from './shots.js';
import { lyricStyleFor, activeLyrics } from './lyrics.js';
import { getSet } from './sets/index.js';
import { handheld, clamp, RENDER_MODE } from './util.js';

export const W = 1920, H = 1080;

export function env(name, t) {
  const a = SONG.env[name]; const f = t * SONG.fps; const i = Math.floor(f);
  if (i < 0 || i >= a.length - 1) return 0;
  return (a[i] + (a[i + 1] - a[i]) * (f - i)) / 255;
}
const BEAT = 60 / SONG.bpm;
export function beatPhase(t) { const b = (t - SONG.beats[0]) / BEAT; return { n: Math.floor(b), f: b - Math.floor(b) }; }
// time since last beat (s)
export function sinceBeat(t) { const p = beatPhase(t); return p.f * BEAT; }

export class Engine {
  constructor(canvas, scale = 1) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: RENDER_MODE, powerPreference: 'high-performance', stencil: false });
    const w = Math.round(W * scale), h = Math.round(H * scale);
    r.setPixelRatio(1); r.setSize(w, h, false);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NoToneMapping;
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.autoClear = true;
    this.camera = new THREE.PerspectiveCamera(35, W / H, 0.02, 120);
    this.post = new Post(r, w, h, scale); this.scale = scale;
    this.text = new TextLayer(W, H);
    this.shots = SHOTS.slice().sort((a, b) => a.t0 - b.t0);
    for (let i = 0; i < this.shots.length; i++) this.shots[i].t1 = this.shots[i].t1 ?? (this.shots[i + 1] ? this.shots[i + 1].t0 : SONG.duration);
    for (const L of SONG.lines) L.style = lyricStyleFor(L, this.shotAt(L.start + 0.05));
  }
  // change internal render resolution (the player lowers it on slow GPUs)
  setScale(scale) {
    const w = Math.round(W * scale), h = Math.round(H * scale);
    this.renderer.setSize(w, h, false);
    this.post.dispose();
    this.post = new Post(this.renderer, w, h, scale);
    this.scale = scale;
  }
  shotAt(t) {
    let s = this.shots[0];
    for (const sh of this.shots) if (sh.t0 <= t) s = sh; else break;
    return s;
  }
  // build every set once (used before an offline render so frame timing is stable)
  warm() {
    for (const sh of this.shots) { this.render(sh.t0 + 0.01); }
  }
  // Player warm-up: render every shot at a few points so every set, texture
  // upload, shader variant and glyph sprite exists before the first frame is
  // shown. Each light/shadow combination is its own shader program, so
  // without this each new shot would freeze for the compile.
  async warmAsync(onProgress) {
    const fr = [0.04, 0.35, 0.65, 0.96];
    const gl = this.renderer.getContext(); const px = new Uint8Array(4);
    const total = this.shots.length * fr.length; let n = 0;
    for (const sh of this.shots) for (const f of fr) {
      this.render(sh.t0 + (sh.t1 - sh.t0) * f);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // wait for the GPU
      n++;
      onProgress?.(n / total);
      await new Promise((r) => setTimeout(r, 0));
    }
    this.text.sig = null;
  }
  render(t) {
    const shot = this.shotAt(t);
    const set = getSet(shot.set);
    const fx = DEFAULT_FX();
    const cam = this.camera;
    const lt = t - shot.t0, dur = shot.t1 - shot.t0;
    const ctx = {
      t, lt, dur, u: clamp(lt / dur), fx, set, cam, text: this.text, song: SONG, env, shot, renderer: this.renderer,
      overlays: [],
      look(pos, target, { fov = 35, roll = 0, shake = 0.6, seed = 0, up = [0, 1, 0] } = {}) {
        const h = handheld(t, shake, seed + shot.t0);
        cam.position.set(pos[0] + h[0], pos[1] + h[1], pos[2] + h[2]);
        cam.up.set(up[0], up[1], up[2]);
        cam.lookAt(target[0] + h[0] * 0.6, target[1] + h[1] * 0.6, target[2] + h[2] * 0.6);
        cam.rotateZ(roll + h[3]);
        if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
      },
    };
    if (set.reset) set.reset(ctx);
    shot.update(ctx);
    if (set.update) set.update(ctx);
    // a breath of the kick drum in every shot
    fx.exposure *= 1 + 0.025 * env('low', t);
    cam.updateMatrixWorld();
    // typography
    if (!window.__noText) {
      const T = this.text;
      const items = activeLyrics(T, t, SONG.lines);
      const sig = items.map((p) => p.sig).join('|');
      // repaint (and re-upload the canvas) only if something visible changed
      if (ctx.overlays.length || sig !== T.sig || window.__noSkip) {
        T.clear();
        for (const p of items) T.paint(p);
        for (const o of ctx.overlays) { T.ctx.save(); o(T.ctx, T); T.ctx.restore(); }
        T.commit();
        T.sig = ctx.overlays.length ? null : sig;
      }
    }
    this.post.render(set.scene, cam, fx, this.text.tex, t);
  }
}
