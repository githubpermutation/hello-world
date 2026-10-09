// Near-empty stage for title cards and typographic moments: drifting dust in a
// soft light shaft, optional glow.
import * as THREE from 'three';
import { glowTex } from '../textures.js';
import { mulberry32 } from '../util.js';

export function buildVoid() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const r = mulberry32(31);
  const N = 500;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (r() - 0.5) * 6; pos[i * 3 + 1] = (r() - 0.5) * 3.4; pos[i * 3 + 2] = -r() * 6; seed[i] = r(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(1.0, 0.8, 0.6) }, uAmt: { value: 1 }, uTex: { value: glowTex() } },
    vertexShader: `attribute float aSeed; uniform float uTime; varying float vA; void main(){ vec3 p = position; p.y += sin(uTime*0.2 + aSeed*30.0)*0.15 + uTime*0.02*(aSeed-0.5); p.x += cos(uTime*0.15 + aSeed*20.0)*0.12; vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (2.0 + aSeed*7.0) * (3.0 / -mv.z); vA = 0.25 + 0.75*fract(aSeed*7.13); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAmt; uniform sampler2D uTex; varying float vA; void main(){ float a = texture2D(uTex, gl_PointCoord).a * vA * uAmt; gl_FragColor = vec4(uColor*a*1.5, a); }`,
  });
  const dust = new THREE.Points(geo, mat); dust.frustumCulled = false; scene.add(dust);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.6, 0.9, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.position.set(0, 0, -4); glow.scale.setScalar(5); scene.add(glow);
  const set = { scene, dust, dustMat: mat, glow };
  set.reset = (ctx) => { mat.uniforms.uTime.value = ctx.t; mat.uniforms.uAmt.value = 1; glow.visible = false; dust.visible = true; mat.uniforms.uColor.value.setRGB(1.0, 0.8, 0.6); };
  return set;
}
