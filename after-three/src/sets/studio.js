// Macro stage: a surface, a dark backdrop and a configurable key/rim/fill rig.
// Hosts the close-up props (zipper, button, belt, hair, keys, glasses).
import * as THREE from 'three';
import { marbleTex, woodTex, woodRough, fabricTex } from '../textures.js';
import { makeZipper, makeButton, makeBelt, makeHair } from '../props/small.js';
import { makeKeyring, poseKeyring } from '../props/keys.js';
import { makeWineGlass, makeTumbler, makeCrackedTumbler, setGlassEnv } from '../props/glass.js';
import { makeEnvMaps } from './apartment.js';
import { glowTex } from '../textures.js';
import { mulberry32 } from '../util.js';

export function buildStudio() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const surfaces = {
    marble: new THREE.MeshPhysicalMaterial({ map: marbleTex(true, [1, 1]), roughness: 0.14, clearcoat: 0.5, clearcoatRoughness: 0.1 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex([1.5, 1.5]), roughnessMap: woodRough([1.5, 1.5]), roughness: 1 }),
    wool: new THREE.MeshStandardMaterial({ map: fabricTex([38, 40, 46], [40, 40]), roughness: 1 }),
    sheet: new THREE.MeshStandardMaterial({ map: fabricTex([200, 204, 214], [60, 60]), roughness: 1 }),
  };
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(3, 3, 120, 120), surfaces.marble);
  surface.rotation.x = -Math.PI / 2; surface.receiveShadow = true; scene.add(surface);
  surface.userData.base = surface.geometry.attributes.position.array.slice();
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 1 }));
  backdrop.position.set(0, 1.5, -1.4); backdrop.receiveShadow = true; scene.add(backdrop);
  // lights
  const key = new THREE.SpotLight(0xffc690, 120, 6, 0.6, 0.6, 1.5); key.position.set(0.8, 1.0, 0.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.radius = 3; key.shadow.camera.near = 0.1;
  scene.add(key, key.target);
  const rim = new THREE.SpotLight(0xff2a44, 0, 6, 0.7, 0.8, 1.5); rim.position.set(-0.6, 0.5, -0.8); scene.add(rim, rim.target);
  const fill = new THREE.DirectionalLight(0x8fa8ff, 0.5); fill.position.set(-1, 0.8, 1.2); scene.add(fill);
  const hemi = new THREE.HemisphereLight(0x223355, 0x0a0806, 0.15); scene.add(hemi);
  // props
  const zipper = makeZipper(); scene.add(zipper);
  const button = makeButton(); scene.add(button);
  const belt = makeBelt(); scene.add(belt);
  const hair = makeHair(); scene.add(hair);
  const keys = makeKeyring(); scene.add(keys);
  const wineA = makeWineGlass(), wineB = makeWineGlass(); scene.add(wineA, wineB);
  const tumbler = makeTumbler(); scene.add(tumbler);
  const cracked = makeCrackedTumbler(); scene.add(cracked);
  // background bokeh points (city lights / practicals)
  const bokeh = new THREE.Group(); scene.add(bokeh);
  const r = mulberry32(21);
  const bt = glowTex();
  for (let i = 0; i < 40; i++) {
    const warm = r() > 0.4;
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, color: warm ? new THREE.Color(3, 1.6, 0.7) : new THREE.Color(2.6, 0.4, 0.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.position.set((r() - 0.5) * 5, 0.2 + r() * 2.2, -1.2 - r() * 0.15); m.scale.setScalar(0.02 + r() * 0.05);
    bokeh.add(m);
  }
  // condensation droplets on the counter (instanced half-spheres)
  const dropGeo = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transmission: 1, thickness: 0.002, ior: 1.33 });
  const drops = new THREE.InstancedMesh(dropGeo, dropMat, 260); scene.add(drops);
  const dropData = [];
  for (let i = 0; i < 260; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.12; dropData.push([Math.cos(a) * d, Math.sin(a) * d, 0.0008 + Math.pow(r(), 3) * 0.004, r()]); }
  const dmy = new THREE.Object3D();
  const setDrops = (k) => {
    dropData.forEach(([x, z, s, ph], i) => { const sc = s * Math.max(0, Math.min(1, (k - ph * 0.6) / 0.4)); dmy.position.set(x, 0, z); dmy.scale.set(sc, sc * 0.55, sc); dmy.updateMatrix(); drops.setMatrixAt(i, dmy.matrix); });
    drops.instanceMatrix.needsUpdate = true;
  };
  setDrops(1);

  // blinds gobo for the key light (moonlight stripes)
  const goboC = document.createElement('canvas'); goboC.width = 256; goboC.height = 256;
  { const g = goboC.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 16; i++) { const grd = g.createLinearGradient(0, i * 16, 0, i * 16 + 16); grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.3, 'rgba(255,255,255,1)'); grd.addColorStop(0.6, 'rgba(255,255,255,1)'); grd.addColorStop(0.85, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, i * 16, 256, 16); } }
  const gobo = new THREE.CanvasTexture(goboC); gobo.colorSpace = THREE.SRGBColorSpace;
  // a glowing thread of light that traces a loop on the sheet (bridge)
  class Loop extends THREE.Curve { getPoint(u, o = new THREE.Vector3()) { const a = u * Math.PI * 2 * 1.08 - 0.4; return o.set(Math.cos(a) * 0.075 * (1 + 0.04 * Math.sin(a * 3)), 0.004 + 0.002 * Math.sin(a * 2), Math.sin(a) * 0.045); } }
  const traceGeo = new THREE.TubeGeometry(new Loop(), 300, 0.0012, 6, false);
  const traceMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.5, 2.4).multiplyScalar(3), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const trace = new THREE.Mesh(traceGeo, traceMat); scene.add(trace);
  // vertical shirt panel for the button shot
  const shirtTex = fabricTex([150, 172, 204], [30, 30]);
  const shirt = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2, 60, 60), new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.95 }));
  shirt.receiveShadow = true; shirt.castShadow = true; scene.add(shirt);
  shirt.userData.base = shirt.geometry.attributes.position.array.slice();
  { const p = shirt.geometry.attributes.position, b = shirt.userData.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; let z = Math.sin(x * 9 + y * 3) * 0.006 + Math.sin(y * 14 - x * 4) * 0.003; if (Math.abs(x - 0.0) < 0.018) z += 0.003; p.setZ(i, z); } p.needsUpdate = true; shirt.geometry.computeVertexNormals(); }
  const placket = new THREE.Mesh(new THREE.BoxGeometry(0.036, 1.2, 0.002), new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.95 })); placket.position.z = 0.004; shirt.add(placket);
  // folds for the sheet surface
  const foldSurface = (amt) => {
    const p = surface.geometry.attributes.position, b = surface.userData.base;
    for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; const z = amt * (Math.sin(x * 7 + Math.sin(y * 3) * 2) * 0.018 + Math.sin(y * 11 + x * 2.5) * 0.008 + Math.sin((x + y) * 23) * 0.002); p.setZ(i, z); }
    p.needsUpdate = true; surface.geometry.computeVertexNormals(); surface.userData.folded = amt;
  };
  const set = { scene, surface, gobo, trace, traceMat, shirt, foldSurface, surfaces, backdrop, key, rim, fill, hemi, zipper, button, belt, hair, keys, wineA, wineB, tumbler, cracked, bokeh, drops, setDrops, cfg: null };
  // shot values are written in 'stage units'; the stage is small, so scale down
  const GAIN = 0.14;
  set.update = () => { key.intensity *= GAIN; rim.intensity *= GAIN; rim.visible = rim.intensity > 0; fill.intensity *= 0.5; };
  set.reset = (ctx) => {
    if (!set.env) set.env = makeEnvMaps(ctx.renderer);
    scene.environment = set.env.day; scene.environmentIntensity = 0.12;
    setGlassEnv(set.env.day, 0.8);
    for (const o of [zipper, button, belt, hair, keys, wineA, wineB, tumbler, cracked, drops, bokeh, trace, shirt]) o.visible = false;
    if (surface.userData.folded) foldSurface(0);
    key.map = null; key.penumbra = 0.6; key.castShadow = true;
    for (const o of [zipper, button, belt, hair, keys, wineA, wineB, tumbler, cracked]) { o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.setScalar(1); }
    for (const o of [cracked.userData.A, cracked.userData.B]) { o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); }
    surface.visible = true; surface.material = surfaces.marble; backdrop.visible = true;
    backdrop.material.color.set(0x0a0a0c);
    key.color.set(0xffc690); key.intensity = 120; key.position.set(0.8, 1.0, 0.6); key.target.position.set(0, 0, 0); key.angle = 0.6;
    rim.intensity = 0; rim.color.set(0xff2a44); rim.position.set(-0.6, 0.5, -0.8); rim.target.position.set(0, 0, 0);
    fill.intensity = 0.5; fill.color.set(0x8fa8ff);
    hemi.intensity = 0.15;
    keys.position.set(0, 0, 0); keys.rotation.set(0, 0, 0); poseKeyring(keys, { dangle: 1 }); keys.userData.newPivot.visible = false;
    surface.position.set(0, 0, 0);
  };
  return set;
}
