// Drinking glasses (tumbler, wine glass), bottles, and the tumbler cracked in two.
import * as THREE from 'three';
import { noise1 } from '../util.js';

// every glass material registers here so sets can give glass its own (brighter)
// reflection map: glass only reads through what it reflects
export const GLASS_MATS = [];
export const glassMat = (tint = 0xffffff, rough = 0.02) => {
  const m = new THREE.MeshPhysicalMaterial({
    color: tint, metalness: 0, roughness: rough, transmission: 1, thickness: 0.006, ior: 1.5,
    specularIntensity: 1, envMapIntensity: 1.2, side: THREE.FrontSide, transparent: false,
  });
  GLASS_MATS.push(m); return m;
};
export function setGlassEnv(env, intensity) { for (const m of GLASS_MATS) { m.envMap = env; m.envMapIntensity = intensity; } }

// closed profile of a tumbler: outer wall, rounded rim, inner wall, thick base
export function tumblerProfile(h = 0.105, r = 0.037) {
  const pts = [];
  const t = 0.0028, base = 0.012;
  pts.push(new THREE.Vector2(0.0001, 0));
  pts.push(new THREE.Vector2(r * 0.9, 0));
  pts.push(new THREE.Vector2(r * 0.97, 0.002));
  pts.push(new THREE.Vector2(r * 0.985, 0.006));
  for (let i = 1; i <= 10; i++) { const y = 0.006 + (h - 0.006) * i / 10; pts.push(new THREE.Vector2(r * (0.985 + 0.015 * i / 10), y)); }
  for (let i = 1; i < 6; i++) { const a = i / 6 * Math.PI; pts.push(new THREE.Vector2(r - t / 2 + Math.cos(a) * t / 2, h + Math.sin(a) * t / 2)); }
  for (let i = 0; i <= 10; i++) { const y = h - (h - base) * i / 10; pts.push(new THREE.Vector2(r - t - 0.0005 * i / 10 - 0.0004, y)); }
  pts.push(new THREE.Vector2(r * 0.8, base - 0.0005));
  pts.push(new THREE.Vector2(0.0001, base));
  return pts;
}

export function makeTumbler(opts = {}) {
  const geo = new THREE.LatheGeometry(tumblerProfile(opts.h, opts.r), 64);
  const m = new THREE.Mesh(geo, glassMat(opts.tint ?? 0xf6fbff));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function makeWineGlass() {
  const pts = [];
  const R = 0.042;
  pts.push(new THREE.Vector2(0.0001, 0));
  pts.push(new THREE.Vector2(0.036, 0.0));
  pts.push(new THREE.Vector2(0.037, 0.002));
  pts.push(new THREE.Vector2(0.006, 0.006));
  pts.push(new THREE.Vector2(0.0035, 0.02));
  pts.push(new THREE.Vector2(0.0035, 0.09));
  for (let i = 0; i <= 16; i++) { const a = i / 16; const y = 0.095 + a * 0.115; const r = R * Math.sin(Math.min(1, a * 1.5 + 0.12) * Math.PI * 0.62) * (1 - 0.12 * a * a) + 0.004; pts.push(new THREE.Vector2(r, y)); }
  const top = pts[pts.length - 1];
  pts.push(new THREE.Vector2(top.x - 0.0016, top.y + 0.0006));
  for (let i = 16; i >= 0; i--) { const a = i / 16; const y = 0.098 + a * 0.112; const r = R * Math.sin(Math.min(1, a * 1.5 + 0.12) * Math.PI * 0.62) * (1 - 0.12 * a * a) + 0.004 - 0.0018; pts.push(new THREE.Vector2(Math.max(0.0001, r), y)); }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), glassMat(0xf8fbff));
  m.castShadow = true;
  return m;
}

export function makeBottle(color = 0x2c4a2a, h = 0.3) {
  const pts = [];
  const r = 0.036;
  pts.push(new THREE.Vector2(0.0001, 0)); pts.push(new THREE.Vector2(r - 0.002, 0)); pts.push(new THREE.Vector2(r, 0.004));
  pts.push(new THREE.Vector2(r, h * 0.6));
  for (let i = 1; i <= 8; i++) { const a = i / 8; pts.push(new THREE.Vector2(r - (r - 0.013) * (0.5 - 0.5 * Math.cos(a * Math.PI)), h * 0.6 + a * h * 0.18)); }
  pts.push(new THREE.Vector2(0.013, h * 0.96)); pts.push(new THREE.Vector2(0.015, h * 0.97)); pts.push(new THREE.Vector2(0.015, h)); pts.push(new THREE.Vector2(0.0001, h));
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, transmission: 0.85, thickness: 0.02, ior: 1.5, attenuationColor: new THREE.Color(color), attenuationDistance: 0.05 });
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mat);
  m.castShadow = true;
  // label
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.0006, r + 0.0006, h * 0.22, 48, 1, true, -1.2, 2.4), new THREE.MeshStandardMaterial({ color: 0xe9e0cc, roughness: 0.8 }));
  lab.position.y = h * 0.33; m.add(lab);
  return m;
}

// Tumbler split along a jagged vertical crack into two pieces.
export function makeCrackedTumbler() {
  const prof = tumblerProfile();
  const jag = (y, s) => noise1(y * 160 + s) * 0.18 + noise1(y * 420 + s * 2) * 0.06;
  const cutA = 0.4, cutB = 0.4 + Math.PI * 1.05;
  function half(p0, p1, s0, s1) {
    const N = 40, M = prof.length;
    const pos = [], idx = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i < M; i++) {
      const y = prof[i].y, r = prof[i].x;
      const a0 = p0 + jag(y, s0), a1 = p1 + jag(y, s1);
      const a = a0 + (a1 - a0) * j / N;
      pos.push(Math.sin(a) * r, y, Math.cos(a) * r);
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < M - 1; i++) {
      const a = j * M + i, b = (j + 1) * M + i;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    // caps along both cut edges
    const shape2d = prof.map((p) => new THREE.Vector2(p.x, p.y));
    const tris = THREE.ShapeUtils.triangulateShape(shape2d, []);
    for (const [phi, s, flip] of [[p0, s0, true], [p1, s1, false]]) {
      const base = pos.length / 3;
      for (const p of prof) { const a = phi + jag(p.y, s); pos.push(Math.sin(a) * p.x, p.y, Math.cos(a) * p.x); }
      for (const t of tris) flip ? idx.push(base + t[0], base + t[2], base + t[1]) : idx.push(base + t[0], base + t[1], base + t[2]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, glassMat(0xf6fbff)); m.castShadow = true;
    return m;
  }
  const g = new THREE.Group();
  const A = half(cutA, cutB, 1, 2); const B = half(cutB, cutA + Math.PI * 2, 2, 1);
  g.add(A, B); g.userData = { A, B, cutA, cutB };
  return g;
}
