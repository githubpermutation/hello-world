// Typography layer: lyrics revealed word by word on the sung timing, chorus
// numerals, captions and per-shot graphic overlays. Drawn on a 2D canvas that
// the final post pass composites (premultiplied) over the graded image.
import * as THREE from 'three';
import { clamp, smooth, invLerp, easeOut, lerp } from './util.js';

const SERIF = '"Instrument Serif", Georgia, serif';
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
export const FONTS = { SERIF, SANS };

const NUMWORD = { 'one,': '1', 'two,': '2', 'three,': '3' };

export class TextLayer {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas'); this.canvas.width = w; this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.NoColorSpace; this.tex.premultiplyAlpha = true; this.tex.generateMipmaps = false;
    this.tex.minFilter = this.tex.magFilter = THREE.LinearFilter;
    this.hasFilter = typeof this.ctx.filter === 'string';
  }
  clear() { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, this.w, this.h); }
  commit() { this.tex.needsUpdate = true; }

  // soft blurred text without ctx.filter fallback issues
  blurText(str, x, y, blur) {
    const c = this.ctx;
    if (blur > 0.3 && this.hasFilter) { c.filter = `blur(${blur.toFixed(2)}px)`; c.fillText(str, x, y); c.filter = 'none'; }
    else c.fillText(str, x, y);
  }

  // Draw one lyric line. st: style object.
  line(L, t, st) {
    const c = this.ctx;
    const fadeIn = st.fadeIn ?? 0.32, fadeOut = st.fadeOut ?? 0.45;
    const end = st.end ?? L.end;
    const outA = 1 - smooth(invLerp(end - fadeOut, end, t));
    if (outA <= 0.001 || t < L.words[0].t - 0.4) return;
    let words = L.words.map((w) => ({ ...w }));
    let numeral = null;
    if (st.numerals && NUMWORD[words[0].w.toLowerCase()]) numeral = { ch: NUMWORD[words[0].w.toLowerCase()], t: words[0].t };
    if (numeral && st.numeralReplace) words = words.slice(1);
    const size = st.size ?? 62;
    c.font = `${st.italic === false ? '' : 'italic '}${st.weight ?? 400} ${size}px ${st.font ?? SERIF}`;
    c.textBaseline = 'alphabetic';
    const space = c.measureText(' ').width;
    const maxW = st.maxWidth ?? this.w * 0.62;
    // layout with wrapping
    const rows = [[]]; let rowW = 0;
    for (const w of words) {
      const ww = c.measureText(w.w).width;
      if (rowW > 0 && rowW + space + ww > maxW) { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push({ ...w, ww }); rowW += (rowW > 0 ? space : 0) + ww;
    }
    const lh = size * (st.leading ?? 1.12);
    const totalH = lh * (rows.length - 1);
    let y0 = st.y ?? this.h * 0.8;
    if (st.anchorY === 'bottom') y0 -= totalH; else if (st.anchorY === 'middle') y0 -= totalH / 2;
    const col = st.color ?? [246, 240, 230];
    const drift = st.drift ?? 14;
    rows.forEach((row, ri) => {
      const rw = row.reduce((a, w, i) => a + w.ww + (i ? space : 0), 0);
      let x = st.x ?? this.w * 0.09;
      if (st.align === 'center') x -= rw / 2; else if (st.align === 'right') x -= rw;
      const y = y0 + ri * lh;
      for (const w of row) {
        const a = smooth(invLerp(w.t - 0.06, w.t - 0.06 + fadeIn, t)) * outA;
        if (a > 0.002) {
          const k = 1 - a;
          const blur = (st.blur ?? 9) * k + (1 - outA) * (st.outBlur ?? 6);
          c.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a * (st.alpha ?? 1)})`;
          if (st.glow) { c.shadowColor = `rgba(${st.glow[0]},${st.glow[1]},${st.glow[2]},${(st.glowAlpha ?? 0.55) * a})`; c.shadowBlur = st.glowSize ?? 24; }
          this.blurText(w.w, x, y + drift * k * k - (1 - outA) * (st.outDrift ?? 8), blur);
          c.shadowBlur = 0; c.shadowColor = 'transparent';
        }
        x += w.ww + space;
      }
    });
    if (numeral && st.numerals) this.numeral(numeral.ch, t - numeral.t, outA, st);
  }

  numeral(ch, lt, outA, st) {
    const c = this.ctx;
    const n = st.numerals;
    const a = clamp(lt / 0.08) * outA * (n.alpha ?? 0.9);
    if (a <= 0) return;
    const s = (n.size ?? 760) * (1 + 0.1 * Math.exp(-lt * 5));
    c.save();
    c.font = `${n.italic ? 'italic ' : ''}400 ${s}px ${SERIF}`;
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const col = n.color ?? [255, 60, 70];
    if (n.stroke) {
      c.lineWidth = n.stroke; c.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
      c.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},${a * 0.8})`; c.shadowBlur = n.glow ?? 30;
      c.strokeText(ch, n.x ?? this.w * 0.78, n.y ?? this.h * 0.82);
    } else {
      c.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
      c.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},${a * 0.6})`; c.shadowBlur = n.glow ?? 30;
      c.fillText(ch, n.x ?? this.w * 0.78, n.y ?? this.h * 0.82);
    }
    c.restore();
  }

  caption(str, x, y, a, { size = 22, color = [240, 236, 228], spacing = 6, align = 'left', weight = 500 } = {}) {
    if (a <= 0) return;
    const c = this.ctx;
    c.save(); c.font = `${weight} ${size}px ${SANS}`; c.letterSpacing = `${spacing}px`; c.textAlign = align;
    c.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${a})`; c.fillText(str, x, y); c.restore();
  }
}
