// Room furniture and fittings, all built from primitives + procedural textures.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { fabricTex, marbleTex, paintTex, clockFaceTex, printTex, tileTex, woodTex, brushedTex } from '../textures.js';
import { metal } from './keys.js';
import { mulberry32 } from '../util.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const sh = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };
const box = (w, h, d, mat) => sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
const rbox = (w, h, d, r, mat, seg = 4) => sh(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), mat));

// ---------------- Couch ----------------
export function makeCouch() {
  const g = new THREE.Group();
  // velvet: sheen gives the soft rim that reads as pile
  const velvet = (col, rep) => new THREE.MeshPhysicalMaterial({ map: fabricTex(col, rep), bumpMap: fabricTex(col, rep), bumpScale: 0.6, roughness: 0.92, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x9fb8a4) });
  const fab = velvet([58, 82, 68], [5, 5]);
  const fab2 = velvet([64, 90, 74], [4, 4]);
  const W = 2.1, D = 0.92;
  const base = rbox(W, 0.22, D, 0.05, fab); base.position.set(0, 0.25, 0); g.add(base);
  const back = rbox(W, 0.5, 0.2, 0.08, fab); back.position.set(0, 0.6, D / 2 - 0.1); g.add(back);
  for (const s of [-1, 1]) { const arm = rbox(0.2, 0.42, D, 0.08, fab); arm.position.set(s * (W / 2 - 0.1), 0.45, 0); g.add(arm); }
  for (let i = 0; i < 2; i++) {
    const c = rbox((W - 0.4) / 2 - 0.01, 0.16, D - 0.22, 0.07, fab2, 5); c.position.set((i - 0.5) * ((W - 0.4) / 2), 0.44, -0.08); c.rotation.z = (i - 0.5) * 0.02; g.add(c);
    const b = rbox((W - 0.4) / 2 - 0.02, 0.44, 0.18, 0.08, fab2, 5); b.position.set((i - 0.5) * ((W - 0.4) / 2), 0.72, D / 2 - 0.27); b.rotation.x = -0.15; g.add(b);
  }
  // throw pillow
  const p = rbox(0.42, 0.4, 0.14, 0.07, std({ map: fabricTex([150, 92, 64], [3, 3]), roughness: 0.9 }), 5); p.position.set(-0.68, 0.66, 0.1); p.rotation.set(-0.25, 0.3, 0.2); g.add(p);
  const legM = std({ color: 0x2a1d14, roughness: 0.5 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.14, 12), legM)); l.position.set(sx * (W / 2 - 0.08), 0.07, sz * (D / 2 - 0.08)); g.add(l); }
  return g;
}

export function makeRug(w = 2.4, d = 1.7) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 360; const x = c.getContext('2d');
  x.fillStyle = '#6d5d4e'; x.fillRect(0, 0, 512, 360);
  x.strokeStyle = '#b9a58a'; x.lineWidth = 6; x.strokeRect(18, 18, 476, 324);
  x.strokeStyle = '#3d332b'; x.lineWidth = 3; x.strokeRect(34, 34, 444, 292);
  const r = mulberry32(5);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 240 : 0},${r() > 0.5 ? 220 : 0},0.05)`; x.fillRect(r() * 512, r() * 360, 2, 2); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), std({ map: tex, roughness: 1 }));
  m.receiveShadow = true; return m;
}

export function makeCoffeeTable() {
  const g = new THREE.Group();
  const top = rbox(1.0, 0.04, 0.55, 0.015, std({ map: woodTex([0.6, 0.6]), roughness: 0.45, color: 0x8a6a50 })); top.position.y = 0.4; g.add(top);
  const lm = std({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = box(0.025, 0.38, 0.025, lm); l.position.set(sx * 0.44, 0.19, sz * 0.22); g.add(l); }
  return g;
}

// ---------------- Wall clock ----------------
export function makeWallClock(r = 0.17) {
  const g = new THREE.Group();
  const rim = sh(new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 16, 96), metal(0x1d1d1f, 0.35))); g.add(rim);
  const body = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 96), std({ color: 0x151515, roughness: 0.6 }))); body.rotation.x = Math.PI / 2; body.position.z = -0.016; g.add(body);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r - 0.004, 96), std({ map: clockFaceTex(), roughness: 0.7 })); face.position.z = 0.0; face.receiveShadow = true; g.add(face);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.03, thickness: 0.001, transparent: true, opacity: 0.25 }));
  glass.position.z = 0.014; g.add(glass);
  const handM = std({ color: 0x141414, roughness: 0.5 });
  const mk = (len, w, d, z, col) => { const p = new THREE.Group(); const m = box(w, len, d, col || handM); m.position.y = len / 2 - len * 0.12; p.add(m); p.position.z = z; g.add(p); return p; };
  const hour = mk(r * 0.55, 0.012, 0.003, 0.004), min = mk(r * 0.82, 0.008, 0.003, 0.007);
  const sec = mk(r * 0.9, 0.0025, 0.002, 0.010, std({ color: 0xc8352a, roughness: 0.4 }));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 20), std({ color: 0x141414 })); cap.rotation.x = Math.PI / 2; cap.position.z = 0.012; g.add(cap);
  g.userData = { hour, min, sec };
  g.userData.set = (h, m, s) => {
    hour.rotation.z = -((h % 12) + m / 60) / 12 * Math.PI * 2;
    min.rotation.z = -(m + s / 60) / 60 * Math.PI * 2;
    sec.rotation.z = -s / 60 * Math.PI * 2;
  };
  return g;
}

// ---------------- Picture frame ----------------
export function makeFrame(w = 0.5, h = 0.66) {
  const g = new THREE.Group();
  const fm = std({ color: 0x1b1714, roughness: 0.45 });
  const t = 0.03;
  for (const [x, y, ww, hh] of [[0, h / 2, w + t * 2, t], [0, -h / 2, w + t * 2, t], [-w / 2, 0, t, h], [w / 2, 0, t, h]]) { const b = box(ww, hh, 0.03, fm); b.position.set(x, y, 0.015); g.add(b); }
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ color: 0xf2eee6, roughness: 0.9 })); mat.position.z = 0.004; mat.receiveShadow = true; g.add(mat);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.72, h * 0.72), std({ map: printTex(), roughness: 0.85 })); art.position.z = 0.006; art.receiveShadow = true; g.add(art);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.12, metalness: 0 })); gl.position.z = 0.02; g.add(gl);
  return g;
}

// ---------------- Door ----------------
export function makeDoor() {
  const g = new THREE.Group(); // door in local XY, facing +z (room side)
  const W = 0.92, H = 2.08, T = 0.045;
  const paint = std({ map: paintTex([46, 58, 64]), roughness: 0.55 });
  const slab = new THREE.Group(); slab.position.set(-W / 2, 0, 0); g.add(slab); // hinge on left
  const sl = box(W, H, T, paint); sl.position.set(W / 2, H / 2 + 0.012, 0); slab.add(sl);
  // raised panels
  for (const [y, hh] of [[0.55, 0.75], [1.5, 0.85]]) {
    for (const x of [0.25, 0.67]) {
      const p = rbox(0.3, hh, 0.012, 0.004, paint, 2); p.position.set(x, y, T / 2 + 0.004); slab.add(p);
      const inner = rbox(0.24, hh - 0.06, 0.012, 0.004, paint, 2); inner.position.set(x, y, T / 2 + 0.009); slab.add(inner);
    }
  }
  const hm = metal(0xb8b2a6, 0.22);
  const rose = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.01, 32), hm)); rose.rotation.x = Math.PI / 2; rose.position.set(W - 0.07, 1.0, T / 2 + 0.005); slab.add(rose);
  const lever = new THREE.Group(); lever.position.set(W - 0.07, 1.0, T / 2 + 0.04); slab.add(lever);
  const neck = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.06, 16), hm)); neck.rotation.x = Math.PI / 2; neck.position.z = -0.02; lever.add(neck);
  const bar = rbox(0.13, 0.018, 0.018, 0.008, hm, 3); bar.position.set(-0.055, 0, 0.01); lever.add(bar);
  const bolt = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 32), hm)); bolt.rotation.x = Math.PI / 2; bolt.position.set(W - 0.07, 1.25, T / 2 + 0.006); slab.add(bolt);
  const thumb = box(0.008, 0.035, 0.012, hm); thumb.position.set(W - 0.07, 1.25, T / 2 + 0.014); slab.add(thumb);
  const peep = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 20), hm)); peep.rotation.x = Math.PI / 2; peep.position.set(W / 2, 1.55, T / 2 + 0.005); slab.add(peep);
  // frame / casing
  const trim = std({ color: 0xe9e4da, roughness: 0.6 });
  const cw = 0.07;
  for (const [x, y, w, h] of [[-W / 2 - cw / 2, H / 2, cw, H + 0.02], [W / 2 + cw / 2, H / 2, cw, H + 0.02], [0, H + cw / 2 + 0.01, W + cw * 2, cw]]) { const b = box(w, h, 0.03, trim); b.position.set(x, y, 0.03); g.add(b); }
  g.userData = { slab, lever, W, H };
  return g;
}

// ---------------- Pendant lamp ----------------
export function makePendant(cable = 0.9) {
  const g = new THREE.Group(); // origin at ceiling attach point
  const swing = new THREE.Group(); g.add(swing);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, cable, 8), std({ color: 0x111111, roughness: 0.6 })); cab.position.y = -cable / 2; swing.add(cab);
  const pts = [];
  for (let i = 0; i <= 20; i++) { const a = i / 20; pts.push(new THREE.Vector2(0.03 + Math.pow(a, 1.6) * 0.17, -a * 0.2)); }
  const shadeOuter = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshStandardMaterial({ color: 0x1f2b25, roughness: 0.35, metalness: 0.6, side: THREE.FrontSide }));
  const shadeInner = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshStandardMaterial({ color: 0xf3e2c4, roughness: 0.7, side: THREE.BackSide, emissive: 0xffc98a, emissiveIntensity: 0.15 }));
  shadeOuter.castShadow = true;
  const shade = new THREE.Group(); shade.add(shadeOuter, shadeInner); shade.position.y = -cable; swing.add(shade);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd2a0, emissiveIntensity: 40 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 16), bulbMat); bulb.position.y = -cable - 0.12; swing.add(bulb);
  const spot = new THREE.SpotLight(0xffc68a, 30, 9, 1.0, 0.75, 1.6);
  spot.position.set(0, -cable - 0.1, 0); spot.target.position.set(0, -cable - 3, 0);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0005; spot.shadow.radius = 4; spot.shadow.camera.near = 0.05;
  swing.add(spot, spot.target);
  const fill = new THREE.PointLight(0xffb878, 1.5, 6, 1.6); fill.position.set(0, -cable - 0.05, 0); swing.add(fill);
  g.userData = { swing, bulbMat, spot, fill, cable };
  g.userData.setPower = (p) => { bulbMat.emissiveIntensity = 40 * p; spot.intensity = 30 * p; spot.castShadow = p > 0.01; fill.intensity = 1.5 * p; fill.visible = p > 0.01; spot.visible = p > 0.01; shadeInner.material.emissiveIntensity = 0.15 * p; };
  return g;
}

// ---------------- Kitchen counter run with sink, faucet, oven ----------------
export function makeKitchen() {
  const g = new THREE.Group(); // back of counter at z=0 (against wall), runs along x from 0 to L
  const L = 4.0, D = 0.65, H = 0.92, top = 0.04;
  const cab = std({ map: paintTex([28, 34, 36]), roughness: 0.5 });
  const marble = new THREE.MeshPhysicalMaterial({ map: marbleTex(true), roughness: 0.14, clearcoat: 0.6, clearcoatRoughness: 0.08 });
  const sinkX = 1.8, sinkW = 0.62, sinkD = 0.42, sinkZ = D / 2 + 0.02;
  // countertop pieces around sink hole
  const tp = (x0, x1, z0, z1) => { const b = box(x1 - x0, top, z1 - z0, marble); b.position.set((x0 + x1) / 2, H - top / 2, (z0 + z1) / 2); g.add(b); };
  tp(0, sinkX - sinkW / 2, 0, D); tp(sinkX + sinkW / 2, L, 0, D);
  tp(sinkX - sinkW / 2, sinkX + sinkW / 2, 0, sinkZ - sinkD / 2); tp(sinkX - sinkW / 2, sinkX + sinkW / 2, sinkZ + sinkD / 2, D);
  // basin
  const steel = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, metalness: 1, roughness: 0.32, roughnessMap: brushedTex(), side: THREE.BackSide });
  const basin = sh(new THREE.Mesh(new THREE.BoxGeometry(sinkW, 0.2, sinkD), steel)); basin.position.set(sinkX, H - 0.1, sinkZ); g.add(basin);
  const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 24), metal(0x777a7e, 0.3)); drain.position.set(sinkX, H - 0.198, sinkZ); g.add(drain);
  // cabinets
  const body = box(L, H - top - 0.1, D - 0.03, cab); body.position.set(L / 2, (H - top - 0.1) / 2 + 0.1, (D - 0.03) / 2); g.add(body);
  const kick = box(L, 0.1, D - 0.1, std({ color: 0x0c0c0c })); kick.position.set(L / 2, 0.05, (D - 0.1) / 2); g.add(kick);
  const handleM = metal(0xb39a6a, 0.25);
  const doors = 6;
  for (let i = 0; i < doors; i++) {
    const x = (i + 0.5) * L / doors;
    const front = rbox(L / doors - 0.006, H - top - 0.12, 0.02, 0.003, cab, 2); front.position.set(x, (H - top - 0.1) / 2 + 0.1, D - 0.02); g.add(front);
    const hdl = box(0.18, 0.012, 0.02, handleM); hdl.position.set(x, H - top - 0.1, D + 0.005); g.add(hdl);
  }
  // oven panel with LED clock (in the 2nd door from the right)
  const ovenX = L - 1.0;
  const ovenGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.5), new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.08, metalness: 0.2, clearcoat: 1 }));
  ovenGlass.position.set(ovenX, 0.42, D + 0.012); g.add(ovenGlass);
  const ledC = document.createElement('canvas'); ledC.width = 1024; ledC.height = 384;
  const ledTex = new THREE.CanvasTexture(ledC); ledTex.colorSpace = THREE.SRGBColorSpace;
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), new THREE.MeshBasicMaterial({ map: ledTex, transparent: true, blending: THREE.AdditiveBlending, color: new THREE.Color(1, 1, 1).multiplyScalar(2.2), toneMapped: false }));
  led.position.set(ovenX, 0.74, D + 0.013); g.add(led);
  let lastLed = '';
  const setLed = (str, on = 1) => {
    const key = str + on.toFixed(2); if (key === lastLed) return; lastLed = key;
    const x = ledC.getContext('2d'); x.clearRect(0, 0, 1024, 384);
    x.font = '300 300px Inter'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = 'rgba(60,255,160,0.7)'; x.shadowBlur = 18; x.fillStyle = `rgba(150,255,200,${on})`; x.fillText(str, 512, 200);
    ledTex.needsUpdate = true;
  };
  setLed('3:07');
  // faucet: gooseneck
  const fpts = [];
  for (let i = 0; i <= 30; i++) {
    const a = i / 30;
    if (a < 0.5) fpts.push(new THREE.Vector3(0, a / 0.5 * 0.34, 0));
    else { const b = (a - 0.5) / 0.5 * Math.PI; fpts.push(new THREE.Vector3(0, 0.34 + Math.sin(b) * 0.1, (1 - Math.cos(b)) * 0.1)); }
  }
  const faucetM = metal(0xcfd2d6, 0.12);
  const faucet = new THREE.Group(); faucet.position.set(sinkX, H, 0.08); g.add(faucet);
  const neck = sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fpts), 80, 0.014, 20), faucetM)); faucet.add(neck);
  const fbase = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.04, 24), faucetM)); fbase.position.y = 0.02; faucet.add(fbase);
  const handle = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 12), faucetM)); handle.position.set(0.035, 0.12, 0); handle.rotation.z = -1.0; faucet.add(handle);
  const tipY = H + 0.34 + Math.sin(Math.PI) * 0.1 - 0.0, tipZ = 0.08 + 0.2;
  // water stream
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOn: { value: 1 }, uColor: { value: new THREE.Color(1.0, 0.85, 0.65) } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.0); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform float uTime; uniform float uOn; uniform vec3 uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      float h(float n){return fract(sin(n)*43758.5453);}
      float n1(float x){float i=floor(x),f=fract(x);return mix(h(i),h(i+1.0),f*f*(3.0-2.0*f));}
      void main(){ float fr = pow(1.0-abs(dot(vN,vV)),2.0); float y=vUv.y;
        float streak = n1(vUv.x*24.0 + floor(y*3.0)) * 0.6 + n1((y*30.0 + uTime*40.0))*0.4;
        float a = (0.15 + fr*0.9) * (0.6+0.6*streak) * uOn; if (y > 1.0 - uOn) a *= 1.0;
        gl_FragColor = vec4(uColor * a * 2.2, a); }`,
  });
  const streamLen = tipY - (H - 0.18);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0075, streamLen, 20, 8, true), waterMat);
  stream.position.set(sinkX, tipY - streamLen / 2 - 0.01, tipZ); g.add(stream);
  const setStreamEnd = (yEnd) => { const len = Math.max(0.02, tipY - 0.01 - yEnd); stream.scale.y = len / streamLen; stream.position.y = tipY - 0.01 - len / 2; };
  g.userData = { L, D, H, sinkX, sinkZ, ovenX, setLed, stream, waterMat, setStreamEnd, tip: new THREE.Vector3(sinkX, tipY, tipZ) };
  return g;
}

// Backsplash tiles + open shelf
export function makeBacksplash(L = 4.0) {
  const g = new THREE.Group();
  const t = tileTex([4, 0.6], true);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.6), new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.15 })); m.position.set(L / 2, 0.92 + 0.3, 0.001); m.receiveShadow = true; g.add(m);
  const shelf = box(1.6, 0.035, 0.24, std({ map: woodTex([0.3, 0.3]), roughness: 0.5, color: 0x9a7a60 })); shelf.position.set(0.95, 1.72, 0.12); g.add(shelf);
  return g;
}

// ---------------- Speaker with LED ring ----------------
export function makeSpeaker() {
  const g = new THREE.Group();
  const body = rbox(0.12, 0.2, 0.12, 0.05, std({ map: fabricTex([40, 40, 44], [2, 3]), roughness: 1 }), 6); body.position.y = 0.1; g.add(body);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.004, 32), std({ color: 0x111111, roughness: 0.3 })); top.position.y = 0.2; g.add(top);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.6, 1).multiplyScalar(8), toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.0025, 8, 48), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.203; g.add(ring);
  g.userData = { ringMat, setLed: (v) => ringMat.color.setRGB(0.3 * v * 8, 0.6 * v * 8, 1 * v * 8) };
  return g;
}

// ---------------- Dish towel (draped cloth) ----------------
export function makeTowel() {
  const geo = new THREE.PlaneGeometry(0.34, 0.5, 24, 36);
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#b9b2a4'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#7e2f28'; for (const y of [30, 44, 200, 214]) x.fillRect(0, y, 256, 7);
  for (let i = 0; i < 256; i += 3) { x.fillStyle = 'rgba(0,0,0,0.04)'; x.fillRect(i, 0, 1, 256); x.fillRect(0, i, 256, 1); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide }));
  m.castShadow = true; m.receiveShadow = true;
  m.userData.base = geo.attributes.position.array.slice();
  return m;
}

// ---------------- Wall coat rail with hooks ----------------
export function makeRail() {
  const g = new THREE.Group();
  const rail = rbox(0.6, 0.08, 0.025, 0.006, std({ map: woodTex([0.2, 0.2]), color: 0x8a6a50, roughness: 0.5 }), 2); g.add(rail);
  return g;
}
