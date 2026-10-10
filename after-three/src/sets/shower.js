// Shower glass, steamed up. The tile wall behind is ray-traced analytically in
// the glass shader so fogged areas can be blurred (texture LOD) and wiped areas
// sharp. A canvas mask holds where a finger has cleared the fog.
import * as THREE from 'three';
import { tileTex } from '../textures.js';
import { ctx2d } from '../util.js';

export function buildShower() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const maskC = document.createElement('canvas'); maskC.width = 1024; maskC.height = 640; ctx2d(maskC);
  const maskTex = new THREE.CanvasTexture(maskC); maskTex.colorSpace = THREE.NoColorSpace;
  const tiles = tileTex(); tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.minFilter = THREE.LinearMipmapLinearFilter;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTiles: { value: tiles }, uMask: { value: maskTex }, uTime: { value: 0 }, uFog: { value: 1 }, uLight: { value: new THREE.Color(1.0, 0.86, 0.7) },
      uExposure: { value: 1.6 }, uDepth: { value: 0.5 },
    },
    vertexShader: `varying vec3 vP; varying vec2 vUv; void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position,1.0); vP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uTiles; uniform sampler2D uMask; uniform float uTime; uniform float uFog; uniform vec3 uLight; uniform float uExposure; uniform float uDepth;
      varying vec3 vP; varying vec2 vUv;
      float h21(vec2 p){ p = fract(p*vec2(233.34, 851.73)); p += dot(p, p+23.45); return fract(p.x*p.y); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p*=2.03; a*=0.5; } return s; }
      // droplets: xy = lens normal, z = coverage
      vec3 drops(vec2 uv, float scale, float t, float density){
        vec2 g = uv*scale; vec2 id = floor(g); vec2 f = fract(g)-0.5;
        float r = h21(id);
        if (r > density) return vec3(0.0);
        vec2 c = (vec2(h21(id+3.1), h21(id+7.7))-0.5)*0.5;
        float s = 0.06 + 0.3*pow(h21(id+1.3), 5.0);
        vec2 d = (f - c) / s;
        float l = length(d*vec2(1.0, 0.85));
        float m = smoothstep(1.0, 0.75, l);
        return vec3(d*m, m);
      }
      vec3 wall(vec2 uv, float lod){
        vec3 t = textureLod(uTiles, uv, lod).rgb;
        t = pow(t, vec3(2.2));
        vec2 q = uv - vec2(1.2, 0.95);
        float light = 0.35 + 1.4*exp(-dot(q,q)*0.9);
        return t * uLight * light * uExposure;
      }
      void main(){
        vec3 V = normalize(vP - cameraPosition);
        float tt = (-uDepth - vP.z) / V.z;
        vec3 Q = vP + V*tt;
        vec2 wuv = Q.xy * 0.9 + vec2(1.0, 1.0);
        vec3 d1 = drops(vUv*vec2(1.6,1.0), 34.0, uTime, 0.55);
        vec3 d2 = drops(vUv*vec2(1.6,1.0)+0.37, 90.0, uTime, 0.7);
        vec3 d3 = drops(vUv*vec2(1.6,1.0)+0.71, 210.0, uTime, 0.8);
        vec2 n = d1.xy + d2.xy*0.7 + d3.xy*0.5;
        float dc = clamp(d1.z + d2.z + d3.z, 0.0, 1.0);
        float mask = texture2D(uMask, vUv).r;
        float streak = 0.0;
        for (int i=1;i<10;i++){ streak += texture2D(uMask, vUv + vec2(0.0, float(i)*0.014)).r * (1.0-float(i)/10.0); }
        streak = clamp(streak*0.3*smoothstep(0.55, 0.9, vn(vec2(vUv.x*140.0, 3.0))), 0.0, 1.0);
        float clear = clamp(max(mask, streak) + (1.0-uFog), 0.0, 1.0);
        vec3 sharp = wall(wuv, 0.0);
        vec3 lensed = wall(wuv - n*0.012, 0.5);
        vec3 blurry = wall(wuv, 3.2);
        float steam = fbm(vUv*vec2(2.5,1.6) + vec2(0.0, -uTime*0.04));
        vec3 fogCol = blurry*0.5 + uLight*(0.10 + 0.22*steam)*uExposure*0.5;
        vec3 col = mix(fogCol, sharp, clear);
        // drops on the fogged glass show a sharp, lensed view through them
        col = mix(col, lensed*1.05, dc*(1.0-clear)*0.9);
        vec3 N = normalize(vec3(n*0.7, 1.0));
        float spec = pow(max(0.0, dot(N, normalize(vec3(-0.4, 0.6, 1.0)))), 60.0) * dc;
        col += uLight * spec * 1.2;
        col *= 1.0 - 0.25*dc*(1.0-length(n)*0.6)*(1.0-clear);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), mat); scene.add(glass);
  const set = { scene, glass, mat, maskC, maskTex };
  set.reset = (ctx) => { mat.uniforms.uTime.value = ctx.t; mat.uniforms.uFog.value = 1; };
  return set;
}
