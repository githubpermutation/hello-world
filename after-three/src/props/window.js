// Steel-grid loft window with venetian blinds, the city outside and a neon sign.
import * as THREE from 'three';
import { mulberry32 } from '../util.js';

function cityTexture(day) {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, H);
  if (day) { sky.addColorStop(0, '#9cc3e8'); sky.addColorStop(0.6, '#dfe9ef'); sky.addColorStop(1, '#f4ede0'); }
  else { sky.addColorStop(0, '#05070f'); sky.addColorStop(0.55, '#0d1430'); sky.addColorStop(0.85, '#2a1f3a'); sky.addColorStop(1, '#3a2630'); }
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  const r = mulberry32(day ? 11 : 12);
  for (let layer = 0; layer < 3; layer++) {
    let bx = -50;
    while (bx < W) {
      const bw = 120 + r() * 260, bh = H * (0.25 + r() * 0.45) * (1 - layer * 0.18);
      const top = H - bh;
      if (day) { const v = 175 - layer * 25 + r() * 30; x.fillStyle = `rgb(${v},${v * 0.97},${v * 0.93})`; }
      else { const v = 8 + layer * 6; x.fillStyle = `rgb(${v},${v + 2},${v + 8})`; }
      x.fillRect(bx, top, bw, bh);
      // windows
      const cols = Math.floor(bw / 26), rows = Math.floor(bh / 34);
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const lit = r();
        if (day) { x.fillStyle = `rgba(90,110,130,${0.25 + r() * 0.3})`; x.fillRect(bx + 8 + i * 26, top + 12 + j * 34, 14, 20); }
        else if (lit > 0.72) { const warm = r() > 0.3; x.fillStyle = warm ? `rgba(255,${180 + r() * 50},${110 + r() * 40},${0.6 + r() * 0.4})` : `rgba(170,200,255,${0.5 + r() * 0.4})`; x.fillRect(bx + 8 + i * 26, top + 12 + j * 34, 14, 20); }
      }
      bx += bw + 10 + r() * 40;
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function neonTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 1024; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 1024);
  x.font = '400 190px "Instrument Serif"'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const letters = ['H', 'O', 'T', 'E', 'L'];
  x.shadowColor = 'rgba(255,30,60,1)'; x.shadowBlur = 30; x.strokeStyle = '#ff6a7c'; x.lineWidth = 7;
  letters.forEach((l, i) => x.strokeText(l, 128, 110 + i * 200));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function makeWindow() {
  const g = new THREE.Group(); // window plane local XY, room side +z; bottom at y=0
  const W = 2.4, H = 1.6;
  const steel = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.4, metalness: 0.7 });
  const bar = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), steel); m.position.set(x, y, 0); m.castShadow = true; g.add(m); };
  bar(W + 0.06, 0.05, 0, 0); bar(W + 0.06, 0.05, 0, H); bar(0.05, H, -W / 2, H / 2); bar(0.05, H, W / 2, H / 2);
  for (let i = 1; i < 4; i++) bar(0.025, H, -W / 2 + i * W / 4, H / 2);
  for (let j = 1; j < 3; j++) bar(W, 0.025, 0, j * H / 3);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.04, 0.22), new THREE.MeshStandardMaterial({ color: 0xe6e1d8, roughness: 0.6 }));
  sill.position.set(0, -0.03, 0.08); sill.receiveShadow = true; sill.castShadow = true; g.add(sill);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.08, envMapIntensity: 1.5 });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), glassMat); pane.position.set(0, H / 2, -0.005); g.add(pane);
  // fog layer on the glass (bridge: words written in condensation)
  const fogC = document.createElement('canvas'); fogC.width = 1024; fogC.height = 683; fogC.getContext('2d', { willReadFrequently: true });
  const fogTex = new THREE.CanvasTexture(fogC); fogTex.colorSpace = THREE.SRGBColorSpace;
  const fog = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 1 }));
  fog.position.set(0, H / 2, 0.012); fog.visible = false; g.add(fog);
  // blinds
  const slatMat = new THREE.MeshStandardMaterial({ color: 0xd9d4ca, roughness: 0.55, side: THREE.DoubleSide });
  const N = 30;
  const slatGeo = new THREE.BoxGeometry(W - 0.06, 0.0015, 0.05);
  const slats = new THREE.InstancedMesh(slatGeo, slatMat, N);
  slats.castShadow = true; slats.receiveShadow = true; g.add(slats);
  const head = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, 0.06), slatMat); head.position.set(0, H - 0.03, 0.07); head.castShadow = true; g.add(head);
  const dummy = new THREE.Object3D();
  const setBlinds = (tilt = 0.5, raise = 0) => {
    // tilt: 0 open (horizontal), 1 closed. raise: 0 down, 1 fully stacked at top
    for (let i = 0; i < N; i++) {
      const yDown = H - 0.07 - (i + 0.5) * (H - 0.08) / N;
      const yUp = H - 0.07 - i * 0.006;
      dummy.position.set(0, THREE.MathUtils.lerp(yDown, yUp, raise), 0.07);
      dummy.rotation.set(tilt * 1.35 * (1 - raise), 0, 0);
      dummy.updateMatrix(); slats.setMatrixAt(i, dummy.matrix);
    }
    slats.instanceMatrix.needsUpdate = true;
  };
  setBlinds(0.45, 0);
  // outside: city plate far away, neon sign closer
  const nightTex = cityTexture(false), dayTex = cityTexture(true);
  const cityMat = new THREE.MeshBasicMaterial({ map: nightTex, color: new THREE.Color(1, 1, 1).multiplyScalar(1.6), toneMapped: false });
  const city = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), cityMat); city.position.set(0, 3, -14); g.add(city);
  const neonMat = new THREE.MeshBasicMaterial({ map: neonTexture(), color: new THREE.Color(1, 1, 1).multiplyScalar(8), blending: THREE.AdditiveBlending, transparent: true, toneMapped: false, depthWrite: false });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 3.0), neonMat); neon.position.set(-1.6, 1.9, -6); g.add(neon);
  g.userData = { W, H, setBlinds, slats, cityMat, nightTex, dayTex, neonMat, neon, fog, fogC, fogTex, pane };
  g.userData.setDay = (day) => { cityMat.map = day ? dayTex : nightTex; cityMat.color.setScalar(day ? 2.2 : 1.6); cityMat.needsUpdate = true; neon.visible = !day; };
  g.userData.setNeon = (v) => neonMat.color.setScalar(8 * v);
  return g;
}
