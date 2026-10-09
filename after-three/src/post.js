// Post-processing: HDR scene -> depth of field -> bloom -> filmic grade, grain,
// lens effects, letterbox and the typography layer. All custom passes.
import * as THREE from 'three';

const VERT = /* glsl */`
out vec2 vUv;
void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function fsMaterial(frag, uniforms) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: 'precision highp float;\nin vec3 position;\n' + VERT,
    fragmentShader: 'precision highp float;\nprecision highp sampler2D;\nin vec2 vUv;\nout vec4 outColor;\n' + frag,
    uniforms, depthTest: false, depthWrite: false,
  });
}

const DEPTH_FN = /* glsl */`
uniform sampler2D tDepth; uniform float uNear; uniform float uFar;
uniform float uFocus; uniform float uAperture; uniform float uMaxBlur; uniform float uPxScale;
float viewZ(vec2 uv){
  float d = texture(tDepth, uv).r;
  return (uNear * uFar) / ((uFar - uNear) * d - uFar) * -1.0;
}
// circle of confusion in full-res pixels (signed: <0 foreground)
float coc(float z){
  float c = uAperture * (z - uFocus) / (z * max(uFocus, 1e-3)) * 1000.0 * uPxScale;
  return clamp(c, -uMaxBlur, uMaxBlur);
}`;

// half-res prefilter: colour + signed circle of confusion (full-res px) in alpha
const COC_FRAG = DEPTH_FN + /* glsl */`
uniform sampler2D tColor;
void main(){
  float z = viewZ(vUv);
  outColor = vec4(texture(tColor, vUv).rgb, coc(z));
}`;

const DOF_FRAG = /* glsl */`
uniform sampler2D tCoc; uniform vec2 uTexel; uniform float uMaxBlur;
const float GOLDEN = 2.39996323;
void main(){
  vec4 c0 = texture(tCoc, vUv);
  float cs = abs(c0.a);
  vec3 col = c0.rgb;
  float tot = 1.0;
  float radius = 1.0;
  float rs = max(0.6, uMaxBlur * uMaxBlur / 96.0);
  for (int i = 0; i < 48; i++) {
    if (radius >= uMaxBlur) break;
    float ang = float(i) * GOLDEN;
    vec4 sm = texture(tCoc, vUv + vec2(cos(ang), sin(ang)) * uTexel * radius);
    float ss = abs(sm.a);
    // background samples may not bleed over a sharper foreground
    if (sm.a > c0.a) ss = clamp(ss, 0.0, cs * 2.0);
    float m = smoothstep(radius - 0.5, radius + 0.5, ss);
    col += mix(col / tot, sm.rgb, m);
    tot += 1.0;
    radius += rs / radius;
  }
  outColor = vec4(col / tot, cs);
}`;

const PREFILTER_FRAG = /* glsl */`
uniform sampler2D tColor; uniform vec2 uTexel; uniform float uThreshold; uniform float uKnee;
void main(){
  vec3 c = vec3(0.0);
  c += texture(tColor, vUv + uTexel * vec2(-1.0,-1.0)).rgb;
  c += texture(tColor, vUv + uTexel * vec2( 1.0,-1.0)).rgb;
  c += texture(tColor, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture(tColor, vUv + uTexel * vec2( 1.0, 1.0)).rgb;
  c *= 0.25;
  c = min(c, vec3(60.0));
  float br = max(c.r, max(c.g, c.b));
  float rq = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  rq = rq * rq / (4.0 * uKnee + 1e-4);
  float w = max(rq, br - uThreshold) / max(br, 1e-4);
  outColor = vec4(c * w, 1.0);
}`;

const DOWN_FRAG = /* glsl */`
uniform sampler2D tColor; uniform vec2 uTexel;
void main(){
  vec2 t = uTexel;
  vec3 a = texture(tColor, vUv + t*vec2(-2.0, 2.0)).rgb;
  vec3 b = texture(tColor, vUv + t*vec2( 0.0, 2.0)).rgb;
  vec3 c = texture(tColor, vUv + t*vec2( 2.0, 2.0)).rgb;
  vec3 d = texture(tColor, vUv + t*vec2(-2.0, 0.0)).rgb;
  vec3 e = texture(tColor, vUv).rgb;
  vec3 f = texture(tColor, vUv + t*vec2( 2.0, 0.0)).rgb;
  vec3 g = texture(tColor, vUv + t*vec2(-2.0,-2.0)).rgb;
  vec3 h = texture(tColor, vUv + t*vec2( 0.0,-2.0)).rgb;
  vec3 i = texture(tColor, vUv + t*vec2( 2.0,-2.0)).rgb;
  vec3 j = texture(tColor, vUv + t*vec2(-1.0, 1.0)).rgb;
  vec3 k = texture(tColor, vUv + t*vec2( 1.0, 1.0)).rgb;
  vec3 l = texture(tColor, vUv + t*vec2(-1.0,-1.0)).rgb;
  vec3 m = texture(tColor, vUv + t*vec2( 1.0,-1.0)).rgb;
  vec3 r = e*0.125 + (a+c+g+i)*0.03125 + (b+d+f+h)*0.0625 + (j+k+l+m)*0.125;
  outColor = vec4(r, 1.0);
}`;

const UP_FRAG = /* glsl */`
uniform sampler2D tColor; uniform sampler2D tPrev; uniform vec2 uTexel; uniform float uRadius;
void main(){
  vec2 t = uTexel * uRadius;
  vec3 s = texture(tColor, vUv + t*vec2(-1.0,-1.0)).rgb;
  s += texture(tColor, vUv + t*vec2( 0.0,-1.0)).rgb * 2.0;
  s += texture(tColor, vUv + t*vec2( 1.0,-1.0)).rgb;
  s += texture(tColor, vUv + t*vec2(-1.0, 0.0)).rgb * 2.0;
  s += texture(tColor, vUv).rgb * 4.0;
  s += texture(tColor, vUv + t*vec2( 1.0, 0.0)).rgb * 2.0;
  s += texture(tColor, vUv + t*vec2(-1.0, 1.0)).rgb;
  s += texture(tColor, vUv + t*vec2( 0.0, 1.0)).rgb * 2.0;
  s += texture(tColor, vUv + t*vec2( 1.0, 1.0)).rgb;
  outColor = vec4(texture(tPrev, vUv).rgb + s / 16.0, 1.0);
}`;

const FINAL_FRAG = DEPTH_FN + /* glsl */`
uniform sampler2D tColor; uniform sampler2D tDof; uniform sampler2D tBloom; uniform sampler2D tText;
uniform vec2 uRes; uniform float uTime;
uniform float uExposure, uBloom, uHalation, uCA, uVignette, uGrain, uSat, uContrast, uLetterbox, uFade, uFlash, uTextAlpha, uDofOn;
uniform vec3 uLift, uGamma, uGain, uShadowTint, uHighTint, uFadeColor, uFlashColor;
uniform float uWarp; uniform vec2 uWarpDir; uniform float uStreak;

vec3 aces(vec3 x){
  const mat3 ACESIn = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 ACESOut = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  vec3 v = ACESIn * x;
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return clamp(ACESOut * (a / b), 0.0, 1.0);
}
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }

float gM = 0.0;
vec3 sceneAt(vec2 uv){
  vec3 sharp = texture(tColor, uv).rgb;
  if (uDofOn > 0.5) sharp = mix(sharp, texture(tDof, uv).rgb, gM);
  return sharp;
}

void main(){
  vec2 uv = vUv;
  if (uDofOn > 0.5) { float c = abs(coc(viewZ(uv))); gM = smoothstep(0.6, 2.5, max(c, texture(tDof, uv).a * 0.8)); }
  // optional directional smear (whip pans)
  vec2 dir = (uv - 0.5);
  float r2 = dot(dir, dir);
  vec3 col;
  if (uWarp > 0.001) {
    col = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      float f = (float(i) / 11.0 - 0.5) * uWarp;
      col += sceneAt(uv + uWarpDir * f);
    }
    col /= 12.0;
  } else {
    // chromatic aberration grows to the edges
    vec2 off = dir * r2 * uCA * 0.02;
    col.r = sceneAt(uv - off).r;
    col.g = sceneAt(uv).g;
    col.b = sceneAt(uv + off).b;
  }
  vec3 bloom = texture(tBloom, uv).rgb;
  col += bloom * uBloom;
  // halation: red-orange glow around highlights
  col += bloom * vec3(1.0, 0.35, 0.12) * uHalation;
  // anamorphic streak from bloom
  if (uStreak > 0.0) {
    vec3 s = vec3(0.0);
    for (int i = -6; i <= 6; i++) s += texture(tBloom, uv + vec2(float(i) * 0.012, 0.0)).rgb * (1.0 - abs(float(i)) / 7.0);
    col += s * uStreak * vec3(0.5, 0.65, 1.0) * 0.12;
  }
  col *= uExposure;
  col = aces(col);
  // grade (display-ish space)
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);
  col += uShadowTint * (1.0 - smoothstep(0.0, 0.45, l)) * 0.6;
  col += uHighTint * smoothstep(0.45, 1.0, l) * 0.6;
  col = pow(max(col * uGain + uLift * (1.0 - col), 0.0), 1.0 / uGamma);
  col = (col - 0.5) * uContrast + 0.5;
  // vignette
  float vig = smoothstep(0.95, 0.15, length(dir * vec2(1.0, 0.82)) * 1.15);
  col *= mix(1.0, vig, uVignette);
  col = clamp(col, 0.0, 1.0);
  // everything below happens in display (sRGB) space
  vec3 o = toSRGB(col);
  vec4 tx = texture(tText, uv);
  o = o * (1.0 - tx.a * uTextAlpha) + tx.rgb * uTextAlpha;
  o = o + uFlashColor * uFlash * (1.0 - o * 0.5);
  o = mix(o, uFadeColor, uFade);
  float g = hash(gl_FragCoord.xy + fract(uTime * 13.7) * 1000.0) + hash(gl_FragCoord.xy * 1.37 + fract(uTime * 7.3) * 500.0) - 1.0;
  float lum = dot(o, vec3(0.333));
  o += g * uGrain * (0.45 + 0.55 * (1.0 - abs(lum - 0.45) * 1.5));
  if (uv.y < uLetterbox || uv.y > 1.0 - uLetterbox) o = vec3(0.0);
  o += (hash(gl_FragCoord.xy + 0.5) - 0.5) / 255.0;
  outColor = vec4(o, 1.0);
}`;

export const DEFAULT_FX = () => ({
  exposure: 1.0, bloom: 0.6, bloomThreshold: 1.0, bloomKnee: 0.6, halation: 0.25, ca: 0.6,
  vignette: 0.55, grain: 0.035, sat: 1.0, contrast: 1.05,
  lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], shadowTint: [0, 0, 0], highTint: [0, 0, 0],
  letterbox: 0.095, fade: 0, fadeColor: [0, 0, 0], flash: 0, flashColor: [1, 1, 1], textAlpha: 1,
  focus: 2.0, aperture: 0.0, maxBlur: 16, warp: 0, warpDir: [1, 0], streak: 0,
});

export class Post {
  constructor(renderer, w, h, scale = 1) {
    this.r = renderer; this.w = w; this.h = h; this.scale = scale;
    const hf = THREE.HalfFloatType;
    const depthTex = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
    this.sceneRT = new THREE.WebGLRenderTarget(w, h, { type: hf, samples: +(new URLSearchParams(location.search).get('msaa') ?? 4), depthTexture: depthTex, colorSpace: THREE.LinearSRGBColorSpace });
    this.dofRT = new THREE.WebGLRenderTarget(w >> 1, h >> 1, { type: hf });
    this.bloomLevels = [];
    let bw = w >> 1, bh = h >> 1;
    for (let i = 0; i < 6; i++) {
      this.bloomLevels.push({ down: new THREE.WebGLRenderTarget(bw, bh, { type: hf }), up: new THREE.WebGLRenderTarget(bw, bh, { type: hf }) });
      bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1);
    }
    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); this.black.needsUpdate = true;
    const depthU = () => ({ tDepth: { value: depthTex }, uNear: { value: 0.1 }, uFar: { value: 100 }, uFocus: { value: 2 }, uAperture: { value: 0 }, uMaxBlur: { value: 16 }, uPxScale: { value: scale } });
    this.cocRT = new THREE.WebGLRenderTarget(w >> 1, h >> 1, { type: hf });
    this.cocMat = fsMaterial(COC_FRAG, { ...depthU(), tColor: { value: this.sceneRT.texture } });
    this.dofMat = fsMaterial(DOF_FRAG, { tCoc: { value: this.cocRT.texture }, uTexel: { value: new THREE.Vector2(1 / w, 1 / h) }, uMaxBlur: { value: 16 } });
    this.preMat = fsMaterial(PREFILTER_FRAG, { tColor: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1 }, uKnee: { value: 0.5 } });
    this.downMat = fsMaterial(DOWN_FRAG, { tColor: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.upMat = fsMaterial(UP_FRAG, { tColor: { value: null }, tPrev: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1 } });
    this.finalMat = fsMaterial(FINAL_FRAG, {
      ...depthU(),
      tColor: { value: this.sceneRT.texture }, tDof: { value: this.dofRT.texture }, tBloom: { value: null }, tText: { value: null },
      uRes: { value: new THREE.Vector2(w, h) }, uTime: { value: 0 },
      uExposure: { value: 1 }, uBloom: { value: 0.5 }, uHalation: { value: 0.2 }, uCA: { value: 0.5 }, uVignette: { value: 0.5 }, uGrain: { value: 0.03 },
      uSat: { value: 1 }, uContrast: { value: 1 }, uLetterbox: { value: 0.1 }, uFade: { value: 0 }, uFlash: { value: 0 }, uTextAlpha: { value: 1 }, uDofOn: { value: 0 },
      uLift: { value: new THREE.Vector3() }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
      uShadowTint: { value: new THREE.Vector3() }, uHighTint: { value: new THREE.Vector3() }, uFadeColor: { value: new THREE.Vector3() }, uFlashColor: { value: new THREE.Vector3(1, 1, 1) },
      uWarp: { value: 0 }, uWarpDir: { value: new THREE.Vector2(1, 0) }, uStreak: { value: 0 },
    });
    this.quad = new THREE.Mesh(new THREE.BufferGeometry(), this.finalMat);
    this.quad.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad.frustumCulled = false;
    this.qScene = new THREE.Scene(); this.qScene.add(this.quad);
    this.qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  dispose() {
    for (const rt of [this.sceneRT, this.dofRT, this.cocRT, ...this.bloomLevels.flatMap((l) => [l.down, l.up])]) rt.dispose();
    this.sceneRT.depthTexture.dispose();
  }
  pass(mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.qScene, this.qCam);
  }
  render(scene, camera, fx, textTex, time) {
    const r = this.r;
    const prof = window.__prof; const gl = r.getContext(); const px = new Uint8Array(4);
    let tp = performance.now();
    const mark = (name) => { if (!prof) return; gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const n = performance.now(); prof[name] = (prof[name] || 0) + n - tp; tp = n; };
    mark('pre');
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);
    mark('scene');
    const dofOn = fx.aperture > 0.0001;
    for (const m of [this.cocMat, this.finalMat]) {
      m.uniforms.uNear.value = camera.near; m.uniforms.uFar.value = camera.far;
      m.uniforms.uFocus.value = fx.focus; m.uniforms.uAperture.value = fx.aperture; m.uniforms.uMaxBlur.value = fx.maxBlur * this.scale;
    }
    if (dofOn) {
      this.dofMat.uniforms.uMaxBlur.value = fx.maxBlur * this.scale;
      this.pass(this.cocMat, this.cocRT);
      this.pass(this.dofMat, this.dofRT);
    }
    mark('dof');
    // bloom
    const L = this.bloomLevels;
    this.preMat.uniforms.tColor.value = this.sceneRT.texture;
    this.preMat.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
    this.preMat.uniforms.uThreshold.value = fx.bloomThreshold; this.preMat.uniforms.uKnee.value = fx.bloomKnee;
    this.pass(this.preMat, L[0].down);
    for (let i = 1; i < L.length; i++) {
      this.downMat.uniforms.tColor.value = L[i - 1].down.texture;
      this.downMat.uniforms.uTexel.value.set(1 / L[i - 1].down.width, 1 / L[i - 1].down.height);
      this.pass(this.downMat, L[i].down);
    }
    let prev = L[L.length - 1].down.texture;
    for (let i = L.length - 2; i >= 0; i--) {
      this.upMat.uniforms.tColor.value = prev;
      this.upMat.uniforms.tPrev.value = L[i].down.texture;
      this.upMat.uniforms.uTexel.value.set(1 / L[i + 1].down.width, 1 / L[i + 1].down.height);
      this.upMat.uniforms.uRadius.value = 1.0;
      this.pass(this.upMat, L[i].up);
      prev = L[i].up.texture;
    }
    mark('bloom');
    const u = this.finalMat.uniforms;
    u.tBloom.value = prev; u.tText.value = textTex || this.black; u.uTime.value = time;
    u.uExposure.value = fx.exposure; u.uBloom.value = fx.bloom / 6; u.uHalation.value = fx.halation / 6; u.uCA.value = fx.ca;
    u.uVignette.value = fx.vignette; u.uGrain.value = fx.grain; u.uSat.value = fx.sat; u.uContrast.value = fx.contrast;
    u.uLetterbox.value = fx.letterbox; u.uFade.value = fx.fade; u.uFlash.value = fx.flash; u.uTextAlpha.value = fx.textAlpha;
    u.uDofOn.value = dofOn ? 1 : 0;
    u.uLift.value.fromArray(fx.lift); u.uGamma.value.fromArray(fx.gamma); u.uGain.value.fromArray(fx.gain);
    u.uShadowTint.value.fromArray(fx.shadowTint); u.uHighTint.value.fromArray(fx.highTint);
    u.uFadeColor.value.fromArray(fx.fadeColor); u.uFlashColor.value.fromArray(fx.flashColor);
    u.uWarp.value = fx.warp; u.uWarpDir.value.fromArray(fx.warpDir); u.uStreak.value = fx.streak;
    this.pass(this.finalMat, null);
    mark('final');
  }
}
