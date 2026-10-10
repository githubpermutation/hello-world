// Typography layer: lyrics revealed word by word on the sung timing, chorus
// numerals, captions and per-shot graphic overlays. Drawn on a 2D canvas that
// the final post pass composites (premultiplied) over the graded image.
//
// Performance notes: line layouts (measureText) are cached per line, big glowing
// numerals are baked once into sprites and then just blitted, and the canvas is
// only cleared/redrawn/re-uploaded when the visible state actually changed.
import * as THREE from 'three';
import { clamp, smooth, invLerp, ctx2d } from './util.js';

const SERIF = '"Instrument Serif", Georgia, serif';
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
export const FONTS = { SERIF, SANS };

const NUMWORD = { 'one,': '1', 'two,': '2', 'three,': '3' };
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// ---------------------------------------------------------------- glyph sprites
const sprites = new Map();
let scratch = null;

// A glyph baked at a fixed size with its glow (and optional blur) included.
function sprite({ ch, size, italic, col, glow, stroke, blur, middle, shadowA }) {
  const key = [ch, size, italic ? 1 : 0, col.join(','), glow, stroke || 0, blur, middle ? 1 : 0, shadowA].join('|');
  let s = sprites.get(key);
  if (s) return s;
  const font = `${italic ? 'italic ' : ''}400 ${size}px ${SERIF}`;
  scratch ||= ctx2d(document.createElement('canvas'));
  scratch.font = font; scratch.textBaseline = middle ? 'middle' : 'alphabetic';
  const m = scratch.measureText(ch);
  const pad = Math.ceil(glow * 1.6 + blur * 3 + (stroke || 0) + 8);
  const w = Math.ceil(m.width) + pad * 2;
  const asc = Math.ceil(m.actualBoundingBoxAscent), desc = Math.ceil(m.actualBoundingBoxDescent);
  const h = asc + desc + pad * 2;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = ctx2d(cv);
  c.font = font; c.textAlign = 'center'; c.textBaseline = middle ? 'middle' : 'alphabetic';
  if (blur > 0.3) c.filter = `blur(${blur}px)`;
  c.shadowColor = rgb(col, shadowA); c.shadowBlur = glow;
  const ox = w / 2, oy = pad + asc;
  if (stroke) { c.lineWidth = stroke; c.strokeStyle = rgb(col); c.strokeText(ch, ox, oy); }
  else { c.fillStyle = rgb(col); c.fillText(ch, ox, oy); }
  s = { cv, ox, oy };
  sprites.set(key, s);
  return s;
}

// Draw a glyph centred on (x, y). `base` is the size the sprite is baked at;
// `size` the size to draw (animated zooms just scale the sprite). `blurMax` > 0
// pulls focus: a blurred and a sharp sprite are cross-faded as `blur` -> 0.
export function drawGlyph(ctx, o) {
  const { ch, x, y, a } = o;
  const base = o.base ?? o.size, size = o.size ?? base, k = size / base;
  const spec = { ch, size: base, italic: !!o.italic, col: o.col, glow: o.glow ?? 40, stroke: o.stroke || 0, middle: !!o.middle, shadowA: o.shadowA ?? 0.7 };
  const bmax = o.blurMax ?? 0;
  const sharp = sprite({ ...spec, blur: 0 });
  const soft = bmax > 0.3 ? sprite({ ...spec, blur: bmax }) : null;
  if (o.prebake) return;
  const mix = soft ? clamp(1 - (o.blur ?? 0) / bmax) : 1;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (soft && mix < 0.999) { ctx.globalAlpha = clamp(a * (1 - mix)); ctx.drawImage(soft.cv, -soft.ox * k, -soft.oy * k, soft.cv.width * k, soft.cv.height * k); }
  if (mix > 0.001) { ctx.globalAlpha = clamp(a * mix); ctx.drawImage(sharp.cv, -sharp.ox * k, -sharp.oy * k, sharp.cv.width * k, sharp.cv.height * k); }
  ctx.restore();
}

// ---------------------------------------------------------------- the layer
export class TextLayer {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas'); this.canvas.width = w; this.canvas.height = h;
    this.ctx = ctx2d(this.canvas);
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.NoColorSpace; this.tex.premultiplyAlpha = true; this.tex.generateMipmaps = false;
    this.tex.minFilter = this.tex.magFilter = THREE.LinearFilter;
    this.hasFilter = typeof this.ctx.filter === 'string';
    this.sig = null; // signature of what is currently painted (null = unknown)
  }
  clear() { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, this.w, this.h); }
  commit() { this.tex.needsUpdate = true; }

  // soft blurred text without ctx.filter fallback issues
  blurText(str, x, y, blur) {
    const c = this.ctx;
    if (blur > 0.3 && this.hasFilter) { c.filter = `blur(${blur.toFixed(2)}px)`; c.fillText(str, x, y); c.filter = 'none'; }
    else c.fillText(str, x, y);
  }

  // Word positions for a line; depends only on the style, so it is cached.
  layout(L, st) {
    const key = [st.size ?? 62, st.font ?? '', st.italic, st.weight ?? 400, st.maxWidth ?? '', st.leading ?? '', st.x ?? '', st.y ?? '', st.align ?? '', st.anchorY ?? '', st.numerals ? 1 : 0, st.numeralReplace ? 1 : 0].join('|');
    if (L._lay && L._lay.key === key) return L._lay;
    const c = this.ctx;
    let words = L.words;
    let numeral = null;
    if (st.numerals && NUMWORD[words[0].w.toLowerCase()]) numeral = { ch: NUMWORD[words[0].w.toLowerCase()], t: words[0].t };
    if (numeral && st.numeralReplace) words = words.slice(1);
    const size = st.size ?? 62;
    const font = `${st.italic === false ? '' : 'italic '}${st.weight ?? 400} ${size}px ${st.font ?? SERIF}`;
    c.font = font;
    const space = c.measureText(' ').width;
    const maxW = st.maxWidth ?? this.w * 0.62;
    const rows = [[]]; let rowW = 0;
    for (const w of words) {
      const ww = c.measureText(w.w).width;
      if (rowW > 0 && rowW + space + ww > maxW) { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push({ w: w.w, t: w.t, ww }); rowW += (rowW > 0 ? space : 0) + ww;
    }
    const lh = size * (st.leading ?? 1.12);
    const totalH = lh * (rows.length - 1);
    let y0 = st.y ?? this.h * 0.8;
    if (st.anchorY === 'bottom') y0 -= totalH; else if (st.anchorY === 'middle') y0 -= totalH / 2;
    const items = [];
    rows.forEach((row, ri) => {
      const rw = row.reduce((a, w, i) => a + w.ww + (i ? space : 0), 0);
      let x = st.x ?? this.w * 0.09;
      if (st.align === 'center') x -= rw / 2; else if (st.align === 'right') x -= rw;
      const y = y0 + ri * lh;
      for (const w of row) { items.push({ w: w.w, t: w.t, x, y }); x += w.ww + space; }
    });
    return (L._lay = { key, font, items, numeral });
  }

  // Everything needed to paint a line at time t (or null if it is not visible),
  // including a signature of the visible state for change detection.
  prep(L, t, st) {
    const fadeIn = st.fadeIn ?? 0.32, fadeOut = st.fadeOut ?? 0.45;
    const end = st.end ?? L.end;
    const outA = 1 - smooth(invLerp(end - fadeOut, end, t));
    if (outA <= 0.001 || t < L.words[0].t - 0.4) return null;
    const lay = this.layout(L, st);
    const al = lay.items.map((it) => smooth(invLerp(it.t - 0.06, it.t - 0.06 + fadeIn, t)) * outA);
    let num = null, nsig = '';
    if (lay.numeral) {
      const n = st.numerals, lt = t - lay.numeral.t;
      const base = n.size ?? 760;
      drawGlyph(null, { ch: lay.numeral.ch, base, col: n.color ?? [255, 60, 70], glow: n.glow ?? 30, stroke: n.stroke, shadowA: n.stroke ? 0.8 : 0.6, italic: n.italic, prebake: true });
      num = { ch: lay.numeral.ch, lt };
      nsig = `/${Math.round(clamp(lt / 0.08) * 255)}:${Math.round(Math.exp(-Math.max(0, lt) * 5) * 1500)}`;
    }
    const sig = `${L.start}:${Math.round(outA * 255)}:${al.map((a) => Math.round(a * 255)).join(',')}${nsig}`;
    return { L, st, lay, al, outA, num, sig };
  }

  paint(p) {
    const { st, lay, al, outA, num } = p;
    const c = this.ctx;
    c.font = lay.font; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const col = st.color ?? [246, 240, 230];
    const drift = st.drift ?? 14;
    lay.items.forEach((it, i) => {
      const a = al[i];
      if (a <= 0.002) return;
      const k = 1 - a;
      const blur = (st.blur ?? 9) * k + (1 - outA) * (st.outBlur ?? 6);
      c.fillStyle = rgb(col, a * (st.alpha ?? 1));
      if (st.glow) { c.shadowColor = rgb(st.glow, (st.glowAlpha ?? 0.55) * a); c.shadowBlur = st.glowSize ?? 24; }
      this.blurText(it.w, it.x, it.y + drift * k * k - (1 - outA) * (st.outDrift ?? 8), blur);
      c.shadowBlur = 0; c.shadowColor = 'transparent';
    });
    if (num) {
      const n = st.numerals, lt = num.lt;
      const a = clamp(lt / 0.08) * outA * (n.alpha ?? 0.9);
      if (a > 0) {
        const base = n.size ?? 760;
        drawGlyph(c, {
          ch: num.ch, x: n.x ?? this.w * 0.78, y: n.y ?? this.h * 0.82, a, base, size: base * (1 + 0.1 * Math.exp(-lt * 5)),
          col: n.color ?? [255, 60, 70], glow: n.glow ?? 30, stroke: n.stroke, shadowA: n.stroke ? 0.8 : 0.6, italic: n.italic,
        });
      }
    }
  }

  caption(str, x, y, a, { size = 22, color = [240, 236, 228], spacing = 6, align = 'left', weight = 500 } = {}) {
    if (a <= 0) return;
    const c = this.ctx;
    c.save(); c.font = `${weight} ${size}px ${SANS}`; c.letterSpacing = `${spacing}px`; c.textAlign = align;
    c.fillStyle = rgb(color, a); c.fillText(str, x, y); c.restore();
  }
}
