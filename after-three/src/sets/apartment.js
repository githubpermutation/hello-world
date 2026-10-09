// The apartment: one room with kitchen, front door, loft window and couch.
// Shots mutate set.cfg each frame; update() applies it to lights and props.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { woodTex, woodRough, plasterTex, plasterBump, scrapeTex, fabricTex } from '../textures.js';
import { makeCouch, makeRug, makeCoffeeTable, makeWallClock, makeFrame, makeDoor, makePendant, makeKitchen, makeBacksplash, makeSpeaker, makeTowel, makeRail } from '../props/furniture.js';
import { makeWindow } from '../props/window.js';
import { makeKeyring, makeHook, poseKeyring } from '../props/keys.js';
import { makeTumbler, makeWineGlass, makeBottle, makeCrackedTumbler, setGlassEnv } from '../props/glass.js';
import { makeShoe } from '../props/shoe.js';
import { makeButton } from '../props/small.js';
import { mulberry32 } from '../util.js';

let envCache = null;
export function makeEnvMaps(renderer) {
  if (envCache) return envCache;
  const pm = new THREE.PMREMGenerator(renderer);
  const day = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  // night: dark room with a warm lamp panel and a cool window panel
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x020305, side: THREE.BackSide })));
  const panel = (w, h, col, pos, look) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(...look); s.add(m); };
  panel(2, 1, new THREE.Color(6, 3.6, 1.8), [-1, 6, -2], [0, 0, 0]);
  panel(4, 3, new THREE.Color(0.25, 0.35, 0.8), [8, 2, 0], [0, 0, 0]);
  panel(3, 3, new THREE.Color(0.5, 0.05, 0.08), [6, 2, 6], [0, 0, 0]);
  panel(6, 1, new THREE.Color(0.6, 0.5, 0.4), [0, -2, -8], [0, 0, 0]);
  const night = pm.fromScene(s, 0.02).texture;
  envCache = { day, night };
  return envCache;
}

const std = (o) => new THREE.MeshStandardMaterial(o);

export function buildApartment() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const X0 = -5, X1 = 5, Z0 = -4, Z1 = 4, HT = 2.8;
  // floor
  const floorMat = std({ map: woodTex([5, 4]), roughnessMap: woodRough([5, 4]), roughness: 1, metalness: 0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // walls
  const wallMat = std({ map: plasterTex([198, 190, 178], [4, 1.5]), bumpMap: plasterBump([4, 1.5]), bumpScale: 0.4, roughness: 0.92 });
  const addWall = (w, h, pos, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.set(...pos); m.rotation.y = rotY; m.receiveShadow = true; m.castShadow = true; scene.add(m); return m; };
  addWall(X1 - X0, HT, [0, HT / 2, Z0], 0); // back
  addWall(X1 - X0, HT, [0, HT / 2, Z1], Math.PI); // front
  // left wall with door opening (door at z=1.6, w 0.92, h 2.08)
  const dz = 1.6, dw = 0.92, dh = 2.1;
  addWall(dz - dw / 2 - Z0, HT, [X0, HT / 2, (Z0 + dz - dw / 2) / 2], Math.PI / 2);
  addWall(Z1 - (dz + dw / 2), HT, [X0, HT / 2, (Z1 + dz + dw / 2) / 2], Math.PI / 2);
  addWall(dw, HT - dh, [X0, dh + (HT - dh) / 2, dz], Math.PI / 2);
  // right wall with window opening (z in [-1.2,1.2], y in [0.85,2.45])
  const wz = 1.2, wy0 = 0.85, wy1 = 2.45;
  addWall(Z1 - Z0 - 0, wy0, [X1, wy0 / 2, 0], -Math.PI / 2);
  addWall(Z1 - Z0, HT - wy1, [X1, wy1 + (HT - wy1) / 2, 0], -Math.PI / 2);
  addWall(Z1 - wz, wy1 - wy0, [X1, (wy0 + wy1) / 2, (Z1 + wz) / 2], -Math.PI / 2);
  addWall(Z1 - wz, wy1 - wy0, [X1, (wy0 + wy1) / 2, (Z0 - wz) / 2], -Math.PI / 2);
  // window reveal (depth)
  const reveal = std({ color: 0xd9d2c6, roughness: 0.9 });
  for (const [w, h, p, r] of [[0.25, 2.4, [X1 + 0.125, wy0, 0], [-Math.PI / 2, 0, 0]], [0.25, 2.4, [X1 + 0.125, wy1, 0], [Math.PI / 2, 0, 0]]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), reveal); m.position.set(...p); m.rotation.set(r[0], 0, Math.PI / 2); m.receiveShadow = true; scene.add(m); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), std({ color: 0x8c8780, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = HT; ceil.castShadow = true; ceil.receiveShadow = true; scene.add(ceil);
  // skirting
  const skirt = std({ color: 0xe7e2d8, roughness: 0.6 });
  for (const [w, p, r] of [[X1 - X0, [0, 0.05, Z0 + 0.008], 0], [X1 - X0, [0, 0.05, Z1 - 0.008], 0], [Z1 - Z0, [X1 - 0.008, 0.05, 0], Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.016), skirt); m.position.set(...p); m.rotation.y = r; m.receiveShadow = true; scene.add(m); }

  // kitchen
  const kitchen = makeKitchen(); kitchen.position.set(-4.4, 0, Z0); scene.add(kitchen);
  const splash = makeBacksplash(); splash.position.set(-4.4, 0, Z0 + 0.002); scene.add(splash);
  const pendant = makePendant(1.0); pendant.position.set(-2.6, HT, -3.5); scene.add(pendant);
  const speaker = makeSpeaker(); speaker.position.set(-0.75, 0.92, -3.72); speaker.rotation.y = -0.3; scene.add(speaker);
  // counter clutter: bottles and glasses
  const clutter = new THREE.Group(); scene.add(clutter);
  const b1 = makeBottle(0x24452a, 0.31); b1.position.set(-4.05, 0.92, -3.72); clutter.add(b1);
  const b2 = makeBottle(0x4a2c12, 0.24); b2.position.set(-3.85, 0.92, -3.55); clutter.add(b2);
  const b3 = makeBottle(0x24452a, 0.31); b3.position.set(-1.05, 0.92, -3.62); b3.rotation.z = 0; clutter.add(b3);
  const w1 = makeWineGlass(); w1.position.set(-3.6, 0.92, -3.45); clutter.add(w1);
  const w2 = makeWineGlass(); w2.position.set(-1.35, 0.92, -3.42); clutter.add(w2);
  const t1 = makeTumbler(); t1.position.set(-3.3, 0.92, -3.6); clutter.add(t1);
  const t2 = makeTumbler(); t2.position.set(-1.6, 0.92, -3.7); clutter.add(t2);
  // the glass being rinsed (hero), and its cracked twin (day)
  const glass = makeTumbler(); glass.position.set(-2.6, 0.75, -3.62); scene.add(glass);
  const cracked = makeCrackedTumbler(); cracked.position.set(-2.0, 0.92, -3.5); cracked.visible = false; scene.add(cracked);
  const towel = makeTowel(); scene.add(towel);
  // clock + frame
  const clock = makeWallClock(0.17); clock.position.set(0.55, 1.95, Z0 + 0.03); scene.add(clock);
  const frame = makeFrame(); frame.position.set(2.7, 1.55, Z0 + 0.005); scene.add(frame);
  const frame2 = makeFrame(0.36, 0.46); frame2.position.set(3.35, 1.35, Z0 + 0.005); scene.add(frame2);
  // door + rail + hook
  const door = makeDoor(); door.position.set(X0 + 0.005, 0, dz); door.rotation.y = Math.PI / 2; scene.add(door);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), new THREE.MeshBasicMaterial({ color: 0x000000 })); outside.position.set(X0 - 0.2, 1.2, dz); outside.rotation.y = Math.PI / 2; scene.add(outside);
  const gapMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.72, 0.4).multiplyScalar(12), toneMapped: false });
  const gap = new THREE.Mesh(new THREE.PlaneGeometry(dw - 0.02, 0.012), gapMat); gap.position.set(X0 - 0.01, 0.006, dz); gap.rotation.y = Math.PI / 2; scene.add(gap);
  // light spilling under the door: a low, wide spot grazing the floor
  const doorSpill = new THREE.SpotLight(0xffb36b, 0, 4, 1.2, 1.0, 2); doorSpill.position.set(X0 + 0.02, 0.02, dz); doorSpill.target.position.set(X0 + 1.5, 0.0, dz); scene.add(doorSpill, doorSpill.target);
  const rail = makeRail(); rail.position.set(X0 + 0.015, 1.5, 0.55); rail.rotation.y = Math.PI / 2; scene.add(rail);
  const hooks = [];
  for (let i = 0; i < 3; i++) { const h = makeHook(); h.position.set(X0 + 0.03, 1.5, 0.55 - 0.2 + i * 0.2); h.rotation.y = Math.PI / 2; scene.add(h); hooks.push(h); }
  const mat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.95), std({ map: fabricTex([70, 58, 44], [8, 12]), roughness: 1 })); mat.position.set(X0 + 0.42, 0.006, dz); mat.receiveShadow = true; scene.add(mat);
  // shoes by the door (night); a single shoe used in daytime close-ups
  const shoeA = makeShoe(); shoeA.position.set(X0 + 0.35, 0.012, dz - 0.15); shoeA.rotation.y = 0.3; scene.add(shoeA);
  const shoeB = makeShoe(); shoeB.position.set(X0 + 0.3, 0.012, dz + 0.12); shoeB.rotation.y = -0.15; scene.add(shoeB);
  const button = makeButton(0x1d2a3c); button.visible = false; scene.add(button);
  // keys
  const keys = makeKeyring(); scene.add(keys);
  // window
  const win = makeWindow(); win.position.set(X1 - 0.02, wy0, 0); win.rotation.y = -Math.PI / 2; scene.add(win);
  // living area
  const couch = makeCouch(); couch.rotation.y = Math.PI; scene.add(couch);
  const rug = makeRug(); rug.position.set(1.2, 0.006, 1.7); scene.add(rug);
  const table = makeCoffeeTable(); table.position.set(1.2, 0, 1.9); scene.add(table);
  const scrapes = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.24), new THREE.MeshBasicMaterial({ map: scrapeTex(), transparent: true, opacity: 0.5, depthWrite: false }));
  scrapes.rotation.x = -Math.PI / 2; scrapes.rotation.z = Math.PI / 2; scrapes.position.set(1.2, 0.002, 3.45); scrapes.visible = false; scene.add(scrapes);
  const scrapes2 = scrapes.clone(); scene.add(scrapes2);

  // lights
  const hemi = new THREE.HemisphereLight(0x22304c, 0x0c0907, 0.35); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x9fb4ff, 1.6);
  moon.position.set(X1 + 6, 6.5, -1.5); moon.target.position.set(0, 0, 0.6);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.02;
  Object.assign(moon.shadow.camera, { left: -6, right: 6, top: 5, bottom: -5, near: 1, far: 30 });
  scene.add(moon, moon.target);
  const sun = new THREE.DirectionalLight(0xfff0d8, 0);
  sun.position.set(X1 + 7, 5.5, 2.0); sun.target.position.set(0, 0, -0.5);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 5, bottom: -5, near: 1, far: 30 });
  scene.add(sun, sun.target);
  const neonLight = new THREE.SpotLight(0xff2340, 0, 14, 1.1, 1.0, 1.2); neonLight.position.set(X1 + 0.5, (wy0 + wy1) / 2, 0); neonLight.target.position.set(0, 1.0, 0); scene.add(neonLight, neonLight.target);
  const skyFill = new THREE.SpotLight(0xdfe9ff, 0, 14, 1.2, 1.0, 1.0); skyFill.position.set(X1 + 0.5, (wy0 + wy1) / 2, 0); skyFill.target.position.set(0, 0.8, 0); scene.add(skyFill, skyFill.target);
  const fillDoor = new THREE.PointLight(0xffb070, 0, 3, 2); fillDoor.position.set(X0 + 0.4, 0.3, dz); scene.add(fillDoor);
  // camera-side key light for close-ups (shots set cfg.key)
  const keyLight = new THREE.SpotLight(0xffd2a0, 0, 6, 0.5, 0.7, 1.4);
  keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024); keyLight.shadow.bias = -0.0003; keyLight.shadow.radius = 3; keyLight.shadow.camera.near = 0.05;
  scene.add(keyLight, keyLight.target);
  // dust motes (visible where light hits them)
  const dustN = 1400, dpos = new Float32Array(dustN * 3), dseed = new Float32Array(dustN);
  { const r = mulberry32(77); for (let i = 0; i < dustN; i++) { dpos[i * 3] = -4.5 + r() * 9.3; dpos[i * 3 + 1] = 0.1 + r() * 2.5; dpos[i * 3 + 2] = -3.5 + r() * 7.2; dseed[i] = r(); } }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3)); dgeo.setAttribute('aSeed', new THREE.BufferAttribute(dseed, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0.7, 0.8, 1.0) }, uAmt: { value: 0 }, uBeam: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader: `attribute float aSeed; uniform float uTime; varying float vA; varying vec3 vW; void main(){ vec3 p = position; p.y += sin(uTime*0.13 + aSeed*40.0)*0.08; p.x += cos(uTime*0.11 + aSeed*25.0)*0.06; p.z += sin(uTime*0.09 + aSeed*13.0)*0.06; vec4 wp = modelMatrix*vec4(p,1.0); vW = wp.xyz; vec4 mv = viewMatrix*wp; gl_Position = projectionMatrix*mv; gl_PointSize = clamp((1.0 + aSeed*2.5) * (6.0 / -mv.z), 1.0, 14.0); vA = 0.3 + 0.7*fract(aSeed*17.13); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAmt; varying float vA; varying vec3 vW; void main(){ vec2 d = gl_PointCoord-0.5; float a = smoothstep(0.5, 0.0, length(d)) * vA * uAmt; float beam = smoothstep(2.4, 4.9, vW.x) * 0.8 + 0.2; gl_FragColor = vec4(uColor*a*beam, a); }`,
  });
  const dust = new THREE.Points(dgeo, dustMat); dust.frustumCulled = false; scene.add(dust);
  // practical accent near couch (floor lamp glow)
  const accent = new THREE.PointLight(0xffa860, 0, 5, 2); accent.position.set(3.6, 1.4, 3.3); scene.add(accent);

  const set = {
    scene, kitchen, pendant, speaker, glass, cracked, towel, clock, frame, door, keys, hooks, win, couch, rug, table, button, shoeA, shoeB, scrapes, scrapes2,
    clutter, gap, gapMat, keyLight, dust, dustMat, w1, w2, t1, t2, doorSpill, hemi, moon, sun, neonLight, skyFill, fillDoor, accent, mat,
    dims: { X0, X1, Z0, Z1, HT, dz },
    cfg: null,
  };
  const defaults = () => ({
    mode: 'night', lamp: 1, lampSwing: 0, moon: 0.6, neon: 0, door: 1, speaker: 0, water: 0,
    blindsTilt: -0.4, blindsRaise: 0, couchZ: 0, clock: [3, 7, 0], led: '3:07', ledOn: 1, envI: 1,
    keys: 'hook', waterEnd: 0.74, fog: false, sunI: 4.5, hemiI: null, accent: 0, exposure: 1, key: null, dust: 0, dawn: 0,
  });
  set.reset = (ctx) => {
    set.cfg = defaults();
    if (!set.env) set.env = makeEnvMaps(ctx.renderer || window.__renderer);
    // default keyring on the hook
    const hk = hooks[1];
    keys.position.set(hk.position.x + 0.026, hk.position.y + 0.003, hk.position.z);
    keys.rotation.set(0, Math.PI / 2, 0); keys.scale.setScalar(1);
    poseKeyring(keys, { dangle: 1 });
    keys.userData.newPivot.visible = false;
    keys.visible = true;
    button.visible = false;
    cracked.visible = false;
    glass.visible = true; glass.position.set(-2.6, 0.75, -3.62); glass.rotation.set(0, 0, 0);
    shoeA.position.set(X0 + 0.35, 0.012, dz - 0.15); shoeA.rotation.set(0, 0.3, 0);
    shoeB.visible = true; shoeA.visible = true;
    shoeB.position.set(X0 + 0.3, 0.012, dz + 0.12); shoeB.rotation.set(0, -0.15, 0);
    moon.position.set(X1 + 6, 6.5, -1.5); moon.target.position.set(0, 0, 0.6);
    if (button.parent !== scene) scene.add(button);
    towel.rotation.set(0, 0, 0);
    scrapes.visible = scrapes2.visible = false;
    frame.rotation.z = 0; frame.position.set(2.7, 1.55, Z0 + 0.005);
    pendant.userData.swing.rotation.set(0, 0, 0);
    clutter.visible = true;
    w1.position.set(-3.6, 0.92, -3.45); w1.rotation.set(0, 0, 0); w2.position.set(-1.35, 0.92, -3.42); w2.rotation.set(0, 0, 0);
    cracked.position.set(-3.1, 0.92, -3.5); cracked.rotation.set(0, 0, 0); cracked.userData.A.position.set(0, 0, 0); cracked.userData.A.rotation.set(0, 0, 0); cracked.userData.B.position.set(0, 0, 0); cracked.userData.B.rotation.set(0, 0, 0);
    keys.userData.members.forEach((m) => m.obj.visible = true);
    // towel default: folded over the counter edge
    poseTowel(towel, 0, 0);
    towel.position.set(-1.95, 0.92, -3.32);
  };
  set.update = (ctx) => {
    const c = set.cfg, day = c.mode === 'day';
    scene.environment = day ? set.env.day : set.env.night;
    setGlassEnv(set.env.day, (day ? 0.9 : 0.45) * (c.glassEnv ?? 1));
    towel.visible = !day;
    scene.environmentIntensity = (day ? 0.55 : 0.35) * c.envI;
    pendant.userData.setPower(c.lamp);
    pendant.userData.swing.rotation.z = c.lampSwing;
    pendant.userData.swing.rotation.x = c.lampSwing * 0.4;
    moon.intensity = day ? 0 : 1.6 * c.moon; moon.castShadow = !day && c.moon > 0; moon.visible = !day && c.moon > 0;
    sun.intensity = day ? c.sunI * 0.8 : 0; sun.castShadow = day; sun.visible = day;
    hemi.color.set(day ? 0xdfe6f0 : 0x22304c); hemi.groundColor.set(day ? 0x8a7660 : 0x0c0907); hemi.intensity = c.hemiI ?? (day ? 0.9 : 0.35);
    skyFill.intensity = day ? 9 : 0; skyFill.visible = day;
    neonLight.intensity = c.neon * 14; neonLight.visible = c.neon > 0.001; win.userData.setNeon(0.25 + c.neon * 1.2);
    win.userData.setDay(day); win.userData.setBlinds(c.blindsTilt, c.blindsRaise);
    gapMat.color.setRGB(1.0, 0.72, 0.4).multiplyScalar(12 * c.door); doorSpill.intensity = 1.2 * c.door; fillDoor.intensity = 0.15 * c.door;
    speaker.userData.setLed(c.speaker);
    kitchen.userData.waterMat.uniforms.uOn.value = c.water; kitchen.userData.setStreamEnd(c.waterEnd); kitchen.userData.stream.visible = c.water > 0.01; kitchen.userData.waterMat.uniforms.uTime.value = ctx.t;
    kitchen.userData.setLed(c.led, c.ledOn);
    clock.userData.set(...c.clock);
    couch.position.set(1.2, 0, 3.47 - c.couchZ);
    accent.intensity = c.accent; accent.visible = c.accent > 0; fillDoor.visible = c.door > 0.01; doorSpill.visible = c.door > 0.01;
    win.userData.fog.visible = c.fog;
    if (c.key) {
      keyLight.position.fromArray(c.key.p); keyLight.target.position.fromArray(c.key.t);
      keyLight.intensity = (c.key.i ?? 20) * (c.key.c === 0xff1030 ? 0.28 : 1); keyLight.color.set(c.key.c ?? 0xffd2a0); keyLight.angle = c.key.a ?? 0.5; keyLight.penumbra = c.key.pen ?? 0.7;
      keyLight.castShadow = c.key.shadow !== false;
      keyLight.visible = true;
    } else { keyLight.intensity = 0; keyLight.castShadow = false; keyLight.visible = false; }
    dustMat.uniforms.uAmt.value = c.dust; dustMat.uniforms.uTime.value = ctx.t; dust.visible = c.dust > 0;
    if (day) dustMat.uniforms.uColor.value.setRGB(1.0, 0.85, 0.6); else dustMat.uniforms.uColor.value.setRGB(0.6, 0.72, 1.0);
    win.userData.cityMat.color.setScalar(day ? 2.2 : 1.6 + c.dawn * 2.5);
    if (!day && c.dawn > 0) win.userData.cityMat.color.setRGB(1.6 + c.dawn * 1.2, 1.6 + c.dawn * 1.8, 1.6 + c.dawn * 3.2);
  };
  return set;
}

// Towel hanging over the counter edge: top part flat on the counter, rest hangs.
// fall: 0 resting, 1 slid off the edge and dropped
export function poseTowel(towel, fall, t) {
  const p = towel.geometry.attributes.position; const b = towel.userData.base;
  for (let i = 0; i < p.count; i++) {
    const x = b[i * 3], y = b[i * 3 + 1]; // plane: x in [-.17,.17], y in [-.25,.25]
    const s = 0.25 - y; // distance from top edge along cloth
    const onTop = 0.12 + fall * 0.3;
    let px = x, py, pz;
    const wob = Math.sin(x * 30 + s * 12) * 0.012 + Math.sin(s * 25 + x * 8) * 0.008 + Math.sin(x * 70) * 0.003;
    if (s < onTop) { py = 0.004 + 0.003 * Math.sin(x * 40); pz = -(onTop - s); }
    else { const d = s - onTop; py = -d * Math.cos(0.08) ; pz = d * 0.12 + wob; }
    p.setXYZ(i, px, py, pz);
  }
  p.needsUpdate = true; towel.geometry.computeVertexNormals();
}
