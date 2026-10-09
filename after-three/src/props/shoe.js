// A patent-leather pump: arched sole, stiletto heel, low-cut upper with a
// pointed vamp and a visible insole. Built from deformed parametric surfaces.
import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { smooth } from '../util.js';

const L = 0.245, HH = 0.082;
const halfW = (x) => {
  const u = Math.min(1, Math.max(0, x / L));
  const heel = u < 0.16 ? Math.sqrt(Math.max(0, 1 - Math.pow((0.16 - u) / 0.16, 2))) * 0.027 : 0.027;
  const mid = 0.027 + 0.009 * Math.sin(Math.min(1, Math.max(0, (u - 0.16) / 0.52)) * Math.PI * 0.85);
  const w = u < 0.16 ? heel : mid;
  const toe = u > 0.68 ? Math.pow(Math.max(0, 1 - (u - 0.68) / 0.32), 0.8) : 1;
  return Math.max(0.0004, w * toe);
};
const soleY = (x) => HH * (1 - smooth((x / L - 0.2) / 0.46));
// outline around the foot, s in [0,1): heel at s=0, toe at s=0.5
const outline = (s) => {
  const a = s * Math.PI * 2;
  const x = (1 - Math.cos(a)) * 0.5 * L;
  return [x, Math.sign(Math.sin(a)) * halfW(x) * Math.pow(Math.abs(Math.sin(a)), 0.15)];
};
const wallH = (x) => { const u = x / L; return u < 0.5 ? 0.056 - 0.032 * smooth(u / 0.45) : 0.024; };

export function makeShoe(color = 0x4a0d14) {
  const g = new THREE.Group();
  const patent = new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide });
  const lining = new THREE.MeshStandardMaterial({ color: 0xc9a68a, roughness: 0.8, side: THREE.DoubleSide });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.6, side: THREE.DoubleSide });
  const sh = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  // sole: a slab following the arch
  const soleGeo = new ParametricGeometry((s, v, o) => {
    const [x, z] = outline(s);
    const k = v < 0.5 ? v * 2 : (1 - v) * 2; // 0 at edge, 1 at middle (cap)
    const side = v < 0.5 ? 0 : 1; // bottom / top
    o.set(x + (L / 2 - x) * (1 - k) * 0, soleY(x) + side * 0.006, z * k);
  }, 140, 8);
  g.add(sh(new THREE.Mesh(soleGeo, soleMat)));
  // insole
  const insGeo = new ParametricGeometry((s, v, o) => { const [x, z] = outline(s); o.set(x * 0.97 + 0.004, soleY(x) + 0.0075, z * v * 0.9); }, 140, 4);
  g.add(sh(new THREE.Mesh(insGeo, lining)));
  // walls (outside patent, inside lining)
  const wallFn = (inset) => (s, v, o) => {
    const [x, z] = outline(s);
    // the lining only shows inside the opening; under the vamp it stays low
    const h = wallH(x) * (inset < 1 ? 1 - smooth((x / L - 0.46) / 0.08) * 0.85 : 1);
    const bulge = 1 + 0.08 * Math.sin(v * Math.PI);
    o.set(x, soleY(x) + 0.006 + v * h, z * bulge * (1 - 0.18 * v * v) * inset);
  };
  g.add(sh(new THREE.Mesh(new ParametricGeometry(wallFn(1), 160, 10), patent)));
  g.add(new THREE.Mesh(new ParametricGeometry(wallFn(0.93), 160, 6), lining));
  // vamp over the toe box
  const x0 = L * 0.5;
  const vamp = new ParametricGeometry((s, r, o) => {
    const x = x0 + (L - x0) * s;
    const hw = halfW(x) * (1 - 0.18);
    const rr = r * 2 - 1;
    const throat = 1 - Math.pow(1 - s, 6) * 0; // keep a clean edge
    const arch = 0.016 * Math.sqrt(Math.max(0, 1 - rr * rr)) * Math.sin(Math.min(1, s * 1.4) * Math.PI * 0.75) * throat;
    o.set(x, soleY(x) + 0.006 + wallH(x) * (1 - Math.pow(s, 3)) + arch, rr * hw);
  }, 40, 24);
  g.add(sh(new THREE.Mesh(vamp, patent)));
  // throat edge piping
  const pts = [];
  for (let i = 0; i <= 40; i++) { const s = i / 40; const [x, z] = outline(s < 0.5 ? s * 0.5 + 0.75 : (s - 0.5) * 0.5); pts.push(new THREE.Vector3(x, 0, z)); }
  // stiletto heel
  const heel = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.0045, HH, 24), patent));
  heel.position.set(0.032, HH / 2, 0); heel.rotation.z = 0.08; g.add(heel);
  const tip = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.0047, 0.0047, 0.004, 16), soleMat)); tip.position.set(0.035, 0.002, 0); g.add(tip);
  g.userData = { L, insoleY: (x) => soleY(x) + 0.0075 };
  return g;
}
