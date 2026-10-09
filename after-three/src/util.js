// Small deterministic helpers shared by every module.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smoother = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOut = (t, p = 3) => 1 - Math.pow(1 - clamp(t), p);
export const easeIn = (t, p = 3) => Math.pow(clamp(t), p);
export const easeInOut = (t, p = 3) => { t = clamp(t); return t < 0.5 ? Math.pow(2 * t, p) / 2 : 1 - Math.pow(2 - 2 * t, p) / 2; };
export const expoOut = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const backOut = (t, s = 1.7) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };
export const pulse = (t, a, b) => smooth(invLerp(a, a + (b - a) * 0.5, t)) * (1 - smooth(invLerp(a + (b - a) * 0.5, b, t)));
// window that fades in over fi and out over fo
export const win = (t, a, b, fi = 0.3, fo = 0.3) => smooth(invLerp(a, a + fi, t)) * (1 - smooth(invLerp(b - fo, b, t)));

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1D value noise, smooth, deterministic
function hash1(i) { let x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
export function noise1(x) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u) * 2 - 1;
}
export function fbm1(x, oct = 3) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * noise1(x * f + i * 17.13); a *= 0.5; f *= 2.03; }
  return s;
}
// 2D value noise for textures
function hash2(x, y) { let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return h - Math.floor(h); }
export function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
export function fbm2(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise2(x * f + i * 5.3, y * f - i * 3.1); n += a; a *= 0.5; f *= 2.0; }
  return s / n;
}

// handheld camera wobble: returns [x,y,z,roll] offsets
export function handheld(t, amp = 1, seed = 0) {
  const s = seed * 13.7;
  return [
    fbm1(t * 0.35 + s) * 0.012 * amp,
    fbm1(t * 0.31 + s + 40) * 0.009 * amp,
    fbm1(t * 0.27 + s + 80) * 0.006 * amp,
    fbm1(t * 0.22 + s + 120) * 0.006 * amp,
  ];
}

// damped spring response to an impulse at time t0
export const ring = (t, t0, freq = 6, damp = 6) => (t < t0 ? 0 : Math.exp(-(t - t0) * damp) * Math.sin((t - t0) * freq * Math.PI * 2));
export const decay = (t, t0, k = 6) => (t < t0 ? 0 : Math.exp(-(t - t0) * k));
