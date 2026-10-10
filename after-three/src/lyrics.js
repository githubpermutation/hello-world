// Lyric styling per section; a shot may override position/colour through
// shot.lyric (object) which is resolved at the line's start time.
import { FONTS } from './text.js';

const NIGHT = [246, 238, 226];
const BASE = {
  verse: { size: 60, x: 1920 * 0.085, y: 1080 * 0.835, anchorY: 'bottom', color: NIGHT, glow: [0, 0, 0], glowSize: 30, fadeIn: 0.38, fadeOut: 0.5 },
  chorus: {
    size: 66, x: 1920 * 0.085, y: 1080 * 0.835, anchorY: 'bottom', color: [255, 244, 240], glow: [40, 0, 6], glowSize: 30, fadeIn: 0.22, fadeOut: 0.3,
    numerals: { size: 820, x: 1920 * 0.79, y: 1080 * 0.9, color: [235, 20, 46], alpha: 0.78, glow: 70 },
  },
  verse2: { size: 58, x: 1920 * 0.085, y: 1080 * 0.835, anchorY: 'bottom', color: [255, 236, 214], glow: [20, 6, 0], glowSize: 26, fadeIn: 0.25, fadeOut: 0.3 },
  bridge: { size: 48, align: 'center', x: 960, y: 1080 * 0.82, anchorY: 'bottom', color: [214, 226, 255], glow: [0, 6, 30], glowSize: 30, fadeIn: 0.9, fadeOut: 1.0, blur: 14, drift: 6, maxWidth: 1300 },
  whisper: { size: 40, align: 'center', x: 960, y: 540, color: [230, 236, 255], fadeIn: 0.7, fadeOut: 0.9, blur: 12, drift: 4, glow: [120, 150, 255], glowSize: 18 },
  day: { size: 60, x: 1920 * 0.085, y: 1080 * 0.835, anchorY: 'bottom', color: [255, 251, 244], glow: [25, 15, 5], glowAlpha: 0.95, glowSize: 30, fadeIn: 0.3, fadeOut: 0.4 },
  final: {
    size: 64, x: 1920 * 0.085, y: 1080 * 0.835, anchorY: 'bottom', color: [255, 248, 236], glow: [25, 12, 0], glowAlpha: 0.9, glowSize: 30, fadeIn: 0.3, fadeOut: 0.5,
    numerals: { size: 820, x: 1920 * 0.79, y: 1080 * 0.9, color: [255, 196, 120], alpha: 0.75, glow: 60 },
  },
  outro: { size: 72, align: 'center', x: 960, y: 1080 * 0.6, anchorY: 'middle', color: [255, 248, 236], glow: [25, 12, 0], glowAlpha: 0.9, glowSize: 36, fadeIn: 0.5, fadeOut: 0.9, maxWidth: 1500 },
};

function sectionKind(L) {
  const s = L.section;
  if (s.startsWith('Verse 1')) return 'verse';
  if (s.startsWith('Verse 2')) return 'verse2';
  if (s.startsWith('Chorus x1')) return L.text.startsWith('Never') ? 'outro' : 'final';
  if (s.startsWith('Chorus')) return 'chorus';
  if (s.startsWith('Bridge')) return 'bridge';
  if (s.startsWith('Whispered')) return 'whisper';
  return 'day';
}
export function lyricStyleFor(L, shot) {
  const kind = sectionKind(L);
  const st = { ...BASE[kind], kind };
  const o = typeof shot?.lyric === 'function' ? shot.lyric(L) : shot?.lyric;
  if (o) {
    Object.assign(st, o);
    if (o.numerals && BASE[kind].numerals) st.numerals = { ...BASE[kind].numerals, ...o.numerals };
  }
  if (L.lyric) Object.assign(st, L.lyric);
  return st;
}
// Lines visible at time t, prepared for painting (see TextLayer.prep).
export function activeLyrics(text, t, lines) {
  const out = [];
  for (const L of lines) {
    if (t < L.start - 0.5 || t > L.end + 0.2 || L.style.hidden) continue;
    const p = text.prep(L, t, L.style);
    if (p) out.push(p);
  }
  return out;
}
export { FONTS };
