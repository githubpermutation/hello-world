// Keyring: split ring, two house keys, a leather fob, and (later) a new brass key.
import * as THREE from 'three';
import { leatherTex, brushedTex } from '../textures.js';

const MM = 0.001;
export const metal = (color, rough = 0.28) => new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: rough, roughnessMap: brushedTex(), clearcoat: 0.3, clearcoatRoughness: 0.2 });

function keyShape(cuts, style = 0) {
  const s = new THREE.Shape();
  // bow: rounded head, centred on origin (hole at -8mm)
  const R = style === 1 ? 13 : 12;
  if (style === 1) {
    const th = Math.asin(4.2 / R);
    s.moveTo(R * Math.cos(th) * MM, -4.2 * MM);
    s.absarc(0, 0, R * MM, -th, th, true);
  } else {
    s.moveTo(9 * MM, -4.2 * MM);
    s.lineTo(4 * MM, -11 * MM);
    s.quadraticCurveTo(-4 * MM, -14 * MM, -12 * MM, -9 * MM);
    s.quadraticCurveTo(-16 * MM, 0, -12 * MM, 9 * MM);
    s.quadraticCurveTo(-4 * MM, 14 * MM, 4 * MM, 11 * MM);
    s.lineTo(9 * MM, 4.2 * MM);
  }
  // shoulder + bitting on top edge
  s.lineTo(12 * MM, 4.2 * MM);
  s.lineTo(12 * MM, 5.2 * MM);
  s.lineTo(14 * MM, 5.2 * MM);
  let x = 14;
  for (const c of cuts) {
    s.lineTo((x + 1.2) * MM, (5.2 - c) * MM);
    s.lineTo((x + 2.6) * MM, (5.2 - c) * MM);
    s.lineTo((x + 3.8) * MM, 5.2 * MM);
    x += 4;
  }
  s.lineTo((x + 1) * MM, 4.6 * MM);
  s.lineTo((x + 4) * MM, 1.2 * MM);
  s.lineTo((x + 4) * MM, -1.5 * MM);
  s.lineTo((x + 1.5) * MM, -3.2 * MM);
  s.lineTo(12 * MM, -3.2 * MM);
  s.lineTo(12 * MM, -4.2 * MM);
  const hole = new THREE.Path(); hole.absarc(-7.5 * MM, 0, 2.6 * MM, 0, Math.PI * 2, false);
  s.holes.push(hole);
  return s;
}

export function makeKey(color = 0xc9ccd0, cuts = [1.2, 2.2, 0.6, 1.8, 1.0, 2.4], style = 0) {
  const geo = new THREE.ExtrudeGeometry(keyShape(cuts, style), { depth: 2.0 * MM, bevelEnabled: true, bevelThickness: 0.35 * MM, bevelSize: 0.35 * MM, bevelSegments: 2, curveSegments: 24 });
  geo.translate(7.5 * MM, 0, -1.0 * MM); // pivot at the hole
  const m = new THREE.Mesh(geo, metal(color));
  m.castShadow = true; m.receiveShadow = true;
  // engraved keyway groove
  const g = new THREE.Mesh(new THREE.BoxGeometry(24 * MM, 0.9 * MM, 0.6 * MM), metal(new THREE.Color(color).multiplyScalar(0.55), 0.5));
  g.position.set(7.5 * MM + 27 * MM, 0.4 * MM, 1.25 * MM); m.add(g);
  const g2 = g.clone(); g2.position.z = -1.25 * MM; m.add(g2);
  return m;
}

function helixRing(r = 14 * MM, tube = 1.1 * MM) {
  class Helix extends THREE.Curve {
    getPoint(u, o = new THREE.Vector3()) { const a = u * Math.PI * 2 * 1.9; return o.set(Math.cos(a) * r, Math.sin(a) * r, (u - 0.5) * 2.6 * MM); }
  }
  const geo = new THREE.TubeGeometry(new Helix(), 200, tube, 10, false);
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xd8d8dc, metalness: 1, roughness: 0.25 }));
  m.castShadow = true; return m;
}

function fob() {
  const s = new THREE.Shape();
  const w = 15 * MM, h = 44 * MM, r = 6 * MM;
  s.moveTo(-w / 2 + r, 0); s.lineTo(w / 2 - r, 0); s.quadraticCurveTo(w / 2, 0, w / 2, -r);
  s.lineTo(w / 2, -h + w / 2); s.absarc(0, -h + w / 2, w / 2, 0, Math.PI, true);
  s.lineTo(-w / 2, -r); s.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
  const hole = new THREE.Path(); hole.absarc(0, -6 * MM, 2.5 * MM, 0, Math.PI * 2, true); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 3 * MM, bevelEnabled: true, bevelThickness: 0.8 * MM, bevelSize: 0.8 * MM, bevelSegments: 3, curveSegments: 20 });
  geo.translate(0, 6 * MM, -1.5 * MM);
  const tex = leatherTex([92, 30, 24]);
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0x553322), clearcoat: 0.15 }));
  tex.repeat.set(30, 30);
  m.castShadow = true; m.receiveShadow = true;
  // stitched edge: thin lighter line around
  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(2.2 * MM, 2.2 * MM, 5.5 * MM, 20), metal(0xd2b06a, 0.2));
  rivet.rotation.x = Math.PI / 2; rivet.position.set(0, -31 * MM, 0); m.add(rivet);
  // small connecting ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5 * MM, 0.8 * MM, 8, 32), metal(0xd8d8dc, 0.25));
  ring.rotation.y = Math.PI / 2; ring.position.y = 0; m.add(ring);
  return m;
}

// Keyring group. Members hang from pivots on the ring; angles are animated by
// the caller through ring.userData.swing (array of [rx, rz] per member).
export function makeKeyring() {
  const g = new THREE.Group();
  const ring = helixRing(); g.add(ring);
  const members = [];
  const add = (obj, ang, len) => {
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(ang) * 14 * MM, Math.sin(ang) * 14 * MM, 0);
    pivot.rotation.z = ang; // point outward
    obj.rotation.set(0, 0, 0);
    pivot.add(obj); g.add(pivot);
    members.push({ pivot, obj, base: ang, len });
    return pivot;
  };
  const k1 = makeKey(0xc7cacd, [1.2, 2.2, 0.6, 1.8, 1.0, 2.4]);
  const k2 = makeKey(0xb08d57, [2.0, 0.8, 2.4, 1.2, 1.9, 0.7], 0);
  add(k1, -Math.PI / 2 - 0.15, 0.06);
  add(k2, -Math.PI / 2 + 0.4, 0.06);
  const f = fob(); f.rotation.z = Math.PI / 2;
  const fp = add(f, -Math.PI / 2 - 0.7, 0.06);
  // fob hangs along local x: rotate so its length goes outward
  f.rotation.z = Math.PI / 2;
  const newKey = makeKey(0xe0b462, [0.6, 2.4, 1.4, 2.2, 0.8, 1.6], 1);
  const np = add(newKey, -Math.PI / 2 + 0.75, 0.06);
  np.visible = false;
  g.userData = { members, k1, k2, fob: f, newKey, newPivot: np, ring };
  return g;
}

// Pose keyring members: gravity direction expressed in ring-local frame so keys
// dangle; extra swing per member.
export function poseKeyring(g, { dangle = 1, swing = 0, t = 0, spread = 1 } = {}) {
  const { members } = g.userData;
  members.forEach((m, i) => {
    // with dangle=1 members point down (-y in ring space); otherwise outward
    const down = -Math.PI / 2;
    const out = m.base;
    const target = out + (down + (m.base - down) * 0.25 * spread - out) * dangle;
    const sw = swing * Math.sin(t * 5.2 + i * 1.7) * Math.exp(-0.0 * t);
    m.pivot.rotation.z = target + sw;
    m.pivot.rotation.y = swing * 0.5 * Math.sin(t * 3.9 + i * 2.3);
    m.pivot.position.set(Math.cos(m.base) * 14 * MM, Math.sin(m.base) * 14 * MM, (i === 2 ? -2.2 : (i - 1.5) * 1.2) * MM);
  });
}

export function makeHook() {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(9 * MM, 9 * MM, 4 * MM, 32), metal(0x8a8f96, 0.35));
  plate.rotation.x = Math.PI / 2; g.add(plate);
  class C extends THREE.Curve { getPoint(u, o = new THREE.Vector3()) { const a = u * Math.PI * 1.15; return o.set(0, -Math.sin(a) * 9 * MM + 2 * MM * u, (1 - Math.cos(a)) * 0 + u * 34 * MM - Math.sin(a) * 0); } }
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const z = Math.min(u * 1.6, 1) * 32 * MM + Math.max(0, u - 0.62) * 0;
    const y = u < 0.62 ? 0 : (Math.sin((u - 0.62) / 0.38 * Math.PI * 0.55) * 14 * MM);
    pts.push(new THREE.Vector3(0, y, z));
  }
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 2.4 * MM, 12), metal(0x8a8f96, 0.3));
  tube.castShadow = true; g.add(tube);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(3.4 * MM, 16, 12), metal(0x8a8f96, 0.3));
  ball.position.copy(pts[pts.length - 1]); g.add(ball);
  g.userData.tip = pts[Math.round(pts.length * 0.62)].clone();
  return g;
}
