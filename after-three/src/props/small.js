// Macro props: shirt button, belt + buckle, coat zipper, twisted hair.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { leatherTex, fabricTex } from '../textures.js';
import { metal } from './keys.js';
import { mulberry32 } from '../util.js';

const MM = 0.001;

// ---------------- Shirt button with snapped thread ----------------
export function makeButton(color = 0xf4efe6) {
  const g = new THREE.Group();
  const R = 5.8 * MM;
  const s = new THREE.Shape(); s.absarc(0, 0, R, 0, Math.PI * 2, false);
  for (const [x, y] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) { const h = new THREE.Path(); h.absarc(x * 1.25 * MM, y * 1.25 * MM, 0.62 * MM, 0, Math.PI * 2, true); s.holes.push(h); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.9 * MM, bevelEnabled: true, bevelThickness: 0.45 * MM, bevelSize: 0.5 * MM, bevelSegments: 4, curveSegments: 48 });
  geo.translate(0, 0, -0.45 * MM);
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.6, iridescenceIOR: 1.6, sheen: 0.3, transmission: 0.15, thickness: 0.002 });
  const body = new THREE.Mesh(geo, mat); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.6 * MM, 0.55 * MM, 12, 64), mat); rim.position.z = 0.55 * MM; rim.castShadow = true; g.add(rim);
  // thread stubs
  const thr = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.9 });
  const r = mulberry32(4);
  for (let i = 0; i < 5; i++) {
    const pts = [];
    const x0 = (i % 2 ? 1 : -1) * 1.25 * MM, y0 = (i % 3 ? 1 : -1) * 1.25 * MM;
    for (let k = 0; k <= 8; k++) pts.push(new THREE.Vector3(x0 + (r() - 0.5) * 0.6 * MM * k, y0 + (r() - 0.5) * 0.6 * MM * k, -0.5 * MM - k * 0.7 * MM));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.18 * MM, 5), thr); g.add(tube);
  }
  return g;
}

// ---------------- Belt with buckle ----------------
export function makeBelt() {
  const g = new THREE.Group();
  const W = 34 * MM; // strap width
  const lt = leatherTex([58, 34, 22]); lt.repeat.set(4, 0.5);
  const leather = new THREE.MeshPhysicalMaterial({ map: lt, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4, sheen: 0.4, sheenColor: new THREE.Color(0x5a3a26) });
  const edge = new THREE.MeshStandardMaterial({ color: 0x1e120c, roughness: 0.6 });
  // strap (free end) lies along +x from the buckle; it slides with g.userData.slide
  const strap = new THREE.Group(); g.add(strap);
  const sm = new THREE.Mesh(new RoundedBoxGeometry(0.36, 3.5 * MM, W, 2, 1.2 * MM), [leather, leather, leather, leather, leather, leather]);
  sm.position.set(0.18 - 0.03, 0, 0); sm.castShadow = true; sm.receiveShadow = true; strap.add(sm);
  // holes
  const holeM = new THREE.MeshBasicMaterial({ color: 0x050302 });
  for (let i = 0; i < 5; i++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(2.0 * MM, 2.0 * MM, 3.7 * MM, 20), holeM); h.position.set(0.02 + i * 0.025, 0, 0); strap.add(h); }
  // stitching line
  const stitch = new THREE.MeshStandardMaterial({ color: 0xcbb592, roughness: 0.8 });
  for (const z of [-1, 1]) for (let i = 0; i < 60; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(3 * MM, 0.3 * MM, 0.6 * MM), stitch); s.position.set(-0.02 + i * 0.006, 1.8 * MM, z * (W / 2 - 3 * MM)); strap.add(s); }
  // fixed side (under the buckle, going -x)
  const fixed = new THREE.Mesh(new RoundedBoxGeometry(0.3, 3.5 * MM, W, 2, 1.2 * MM), leather);
  fixed.position.set(-0.16, -4.5 * MM, 0); fixed.castShadow = true; fixed.receiveShadow = true; g.add(fixed);
  // buckle frame
  const bw = 46 * MM, bh = 50 * MM, bt = 5 * MM;
  const s = new THREE.Shape();
  s.moveTo(-bw / 2 + 6 * MM, -bh / 2); s.lineTo(bw / 2 - 6 * MM, -bh / 2); s.quadraticCurveTo(bw / 2, -bh / 2, bw / 2, -bh / 2 + 6 * MM);
  s.lineTo(bw / 2, bh / 2 - 6 * MM); s.quadraticCurveTo(bw / 2, bh / 2, bw / 2 - 6 * MM, bh / 2); s.lineTo(-bw / 2 + 6 * MM, bh / 2);
  s.quadraticCurveTo(-bw / 2, bh / 2, -bw / 2, bh / 2 - 6 * MM); s.lineTo(-bw / 2, -bh / 2 + 6 * MM); s.quadraticCurveTo(-bw / 2, -bh / 2, -bw / 2 + 6 * MM, -bh / 2);
  const hole = new THREE.Path(); hole.moveTo(-bw / 2 + bt, -bh / 2 + bt); hole.lineTo(bw / 2 - bt, -bh / 2 + bt); hole.lineTo(bw / 2 - bt, bh / 2 - bt); hole.lineTo(-bw / 2 + bt, bh / 2 - bt); hole.lineTo(-bw / 2 + bt, -bh / 2 + bt);
  s.holes.push(hole);
  const bgeo = new THREE.ExtrudeGeometry(s, { depth: 3 * MM, bevelEnabled: true, bevelThickness: 1.4 * MM, bevelSize: 1.2 * MM, bevelSegments: 5, curveSegments: 16 });
  bgeo.translate(0, 0, -1.5 * MM);
  const buckleM = metal(0xb9a06a, 0.18);
  const buckle = new THREE.Mesh(bgeo, buckleM); buckle.rotation.x = -Math.PI / 2; buckle.rotation.z = Math.PI / 2; buckle.position.set(-0.03, 0, 0);
  buckle.castShadow = true; buckle.receiveShadow = true; g.add(buckle);
  // prong: hinged at the bar nearest the fixed side
  const prongPivot = new THREE.Group(); prongPivot.position.set(-0.03 - bh / 2 + bt / 2, 2 * MM, 0); g.add(prongPivot);
  const prong = new THREE.Mesh(new THREE.CylinderGeometry(1.6 * MM, 1.6 * MM, bh - bt * 0.5, 16), buckleM);
  prong.rotation.z = Math.PI / 2; prong.position.x = (bh - bt) / 2; prong.castShadow = true; prongPivot.add(prong);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(1.7 * MM, 12, 8), buckleM); tip.position.x = bh - bt * 0.7; prongPivot.add(tip);
  g.userData = { strap, prongPivot, buckle };
  return g;
}

// ---------------- Coat zipper ----------------
export function makeZipper() {
  const g = new THREE.Group(); // runs along y from 0 (bottom) to LEN (top)
  const LEN = 0.34, N = 70;
  const toothM = metal(0xc29a5c, 0.32);
  const ts0 = new THREE.Shape();
  ts0.moveTo(-2.6 * MM, -1.3 * MM); ts0.lineTo(0.6 * MM, -1.3 * MM); ts0.absarc(1.3 * MM, 0, 1.45 * MM, -Math.PI / 2, Math.PI / 2, false); ts0.lineTo(-2.6 * MM, 1.3 * MM); ts0.lineTo(-2.6 * MM, -1.3 * MM);
  const tg = new THREE.ExtrudeGeometry(ts0, { depth: 1.6 * MM, bevelEnabled: true, bevelThickness: 0.5 * MM, bevelSize: 0.35 * MM, bevelSegments: 3, curveSegments: 10 });
  tg.translate(0, 0, -0.8 * MM);
  const teeth = [new THREE.InstancedMesh(tg, toothM, N), new THREE.InstancedMesh(tg, toothM, N)];
  teeth.forEach((m) => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
  const wool = new THREE.MeshPhysicalMaterial({ map: fabricTex([150, 112, 76], [18, 18]), roughness: 1, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xc8a070), side: THREE.DoubleSide });
  const tapeM = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.9, side: THREE.DoubleSide });
  // two coat panels as deformable planes (left/right)
  const panels = [-1, 1].map((side) => {
    const geo = new THREE.PlaneGeometry(0.22, LEN + 0.12, 16, 60);
    const m = new THREE.Mesh(geo, wool); m.castShadow = true; m.receiveShadow = true; g.add(m);
    m.userData.base = geo.attributes.position.array.slice(); m.userData.side = side;
    return m;
  });
  const tapes = [-1, 1].map((side) => {
    const geo = new THREE.PlaneGeometry(0.012, LEN + 0.04, 1, 60);
    const m = new THREE.Mesh(geo, tapeM); m.receiveShadow = true; g.add(m);
    m.userData.base = geo.attributes.position.array.slice(); m.userData.side = side;
    return m;
  });
  // slider + pull tab
  const slider = new THREE.Group(); g.add(slider);
  const sm = metal(0xc29a5c, 0.22);
  const body = new THREE.Mesh(new RoundedBoxGeometry(11 * MM, 22 * MM, 6 * MM, 3, 2.2 * MM), sm); body.castShadow = true; slider.add(body);
  const tabPivot = new THREE.Group(); tabPivot.position.set(0, 4 * MM, 4 * MM); slider.add(tabPivot);
  const ts = new THREE.Shape(); ts.moveTo(-4 * MM, 0); ts.lineTo(4 * MM, 0); ts.lineTo(5.5 * MM, -26 * MM); ts.quadraticCurveTo(0, -30 * MM, -5.5 * MM, -26 * MM); ts.lineTo(-4 * MM, 0);
  const th = new THREE.Path(); th.absarc(0, -20 * MM, 2.2 * MM, 0, Math.PI * 2, true); ts.holes.push(th);
  const tab = new THREE.Mesh(new THREE.ExtrudeGeometry(ts, { depth: 1.2 * MM, bevelEnabled: true, bevelThickness: 0.5 * MM, bevelSize: 0.5 * MM, bevelSegments: 3 }), sm);
  tab.castShadow = true; tabPivot.add(tab);
  const dummy = new THREE.Object3D();
  // s: slider position 0..1 along length (1 = closed to top). open: spread factor below slider
  const pose = (s, open = 1, t = 0, tabSwing = 0) => {
    const sy = s * LEN;
    const off = (y) => { const d = Math.max(0, sy - y); return 2.6 * MM + open * (d * d * 0.9 + d * 0.06); };
    for (let k = 0; k < 2; k++) {
      const side = k ? 1 : -1;
      for (let i = 0; i < N; i++) {
        const y = (i + (k ? 0.5 : 0)) / N * LEN;
        const o = y > sy ? 2.6 * MM * 0.45 : off(y);
        dummy.position.set(side * o, y, 0); dummy.rotation.set(0, side > 0 ? Math.PI : 0, -Math.min(0.5, Math.max(0, sy - y) * 2.5 * open));
        dummy.updateMatrix(); teeth[k].setMatrixAt(i, dummy.matrix);
      }
      teeth[k].instanceMatrix.needsUpdate = true;
    }
    for (const m of [...panels, ...tapes]) {
      const p = m.geometry.attributes.position, b = m.userData.base, side = m.userData.side;
      const isPanel = panels.includes(m);
      for (let i = 0; i < p.count; i++) {
        const lx = b[i * 3], ly = b[i * 3 + 1] + LEN / 2;
        const o = ly > sy ? 2.6 * MM * 0.45 : off(ly);
        const inner = isPanel ? (lx * side + 0.11) : (lx * side + 0.006); // distance from inner edge
        const x = side * (o + 5 * MM + inner + (isPanel ? 0.004 : 0));
        const z = isPanel ? -1.5 * MM - inner * inner * 0.6 + Math.sin(ly * 40 + side) * 0.002 * inner * 8 + (ly < sy ? -inner * 0.25 * open * Math.min(1, (sy - ly) * 4) : 0) : -1.4 * MM;
        p.setXYZ(i, x, ly, z);
      }
      p.needsUpdate = true; m.geometry.computeVertexNormals();
    }
    slider.position.set(0, sy, 3 * MM);
    tabPivot.rotation.x = 0.25 + tabSwing;
  };
  pose(1, 1);
  g.userData = { pose, LEN, slider };
  return g;
}

// ---------------- Hair (GPU strands twisting into a knot) ----------------
export function makeHair(count = 900, segs = 90) {
  const r = mulberry32(9);
  const pos = new Float32Array(count * segs * 2 * 3);
  const sAttr = new Float32Array(count * segs * 2);
  const strand = new Float32Array(count * segs * 2 * 3);
  let o = 0;
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, rad = Math.sqrt(r()), len = 0.85 + r() * 0.15, tone = r();
    for (let k = 0; k < segs; k++) for (const e of [0, 1]) {
      const s = (k + e) / segs * len;
      sAttr[o] = s; strand[o * 3] = a; strand[o * 3 + 1] = rad; strand[o * 3 + 2] = tone; o++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aS', new THREE.BufferAttribute(sAttr, 1));
  geo.setAttribute('aStrand', new THREE.BufferAttribute(strand, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: true,
    uniforms: { uTwist: { value: 0 }, uTime: { value: 0 }, uLight: { value: new THREE.Vector3(0.6, 0.6, 0.5).normalize() }, uWarm: { value: new THREE.Color(1.0, 0.62, 0.3) }, uBright: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aS; attribute vec3 aStrand;
      uniform float uTwist; uniform float uTime;
      varying float vS; varying float vTone; varying vec3 vT; varying vec3 vP;
      vec3 axis(float s){
        // a straight fall that coils into a knot as uTwist approaches 1
        float k = smoothstep(0.45, 1.0, uTwist);
        vec3 straight = vec3(sin(s*3.0 + uTime*0.6)*0.015, -s*0.9, 0.0);
        float ang = s * 14.0 * k;
        float rr = 0.12 * (1.0 - s*0.7) * k;
        vec3 coil = vec3(cos(ang)*rr - rr, -s*0.9*(1.0-k*0.85), sin(ang)*rr*0.9);
        return mix(straight, coil, k);
      }
      vec3 strandPos(float s){
        float spread = (aStrand.y * 2.0 - 1.0);
        vec3 loose = vec3(spread * (0.06 + s*0.09) + sin(s*9.0 + aStrand.x*3.0 + uTime*0.8)*0.01*s,
                          -s*0.9 + abs(spread)*0.03,
                          sin(aStrand.x*5.0)*0.02 + sin(s*7.0 + aStrand.x)*0.01);
        vec3 c = axis(s);
        vec3 c2 = axis(s + 0.01);
        vec3 T = normalize(c2 - c);
        vec3 N = normalize(cross(T, vec3(0.0,0.0,1.0)) + vec3(1e-4));
        vec3 B = cross(T, N);
        float tw = aStrand.x + uTwist * s * 30.0;
        float bundle = 0.03 * (0.7 + 0.3*s);
        vec3 rope = c + (N*cos(tw) + B*sin(tw)) * sqrt(abs(spread)) * bundle;
        float g = smoothstep(0.05, 0.6, uTwist - aStrand.z*0.08);
        return mix(loose, rope, g);
      }
      void main(){
        float s = aS;
        vec3 p = strandPos(s);
        vec3 T = normalize(strandPos(s + 0.004) - p);
        vS = s; vTone = aStrand.z; vT = normalize(mat3(modelMatrix)*T);
        vec4 wp = modelMatrix * vec4(p,1.0); vP = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uLight; uniform vec3 uWarm; uniform float uBright;
      varying float vS; varying float vTone; varying vec3 vT; varying vec3 vP;
      void main(){
        vec3 V = normalize(cameraPosition - vP);
        vec3 H = normalize(uLight + V);
        float th = dot(vT, H);
        float spec = pow(sqrt(max(0.0, 1.0 - th*th)), 60.0);
        float diff = sqrt(max(0.0, 1.0 - pow(dot(vT, uLight), 2.0)));
        vec3 base = mix(vec3(0.08,0.045,0.025), vec3(0.2,0.11,0.06), vTone);
        vec3 col = base * (0.2 + diff*0.8) * uWarm * 1.6 + uWarm * spec * 2.4 * (0.4+vTone);
        float a = 0.5 * smoothstep(1.0, 0.8, vS) * (0.5 + 0.5*vTone);
        gl_FragColor = vec4(col * uBright, a);
      }`,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  return lines;
}
