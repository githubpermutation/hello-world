'use strict';
/* =====================================================================
 *  audio.js - the whole soundtrack, rendered offline with Web Audio:
 *    - an original score for sampled instruments (piano, xylophone,
 *      nylon guitar, harp, bassoon, flute, clarinet) + a SID-style
 *      chiptune section, synth percussion
 *    - ~40 procedurally synthesised foley / cartoon sound effects
 *    - the Kokoro TTS narration with a small voice chain + music ducking
 * ===================================================================== */
const AUDIO = (() => {
  const SR = 48000;
  /** 'chip' (default): SID-style chiptune score. 'storybook': the original orchestral score. */
  const SCORE = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('score')) || window.FILM_SCORE || 'chip';
  const S = { inst: {}, voice: {} };
  const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  /** 'C4' | 'F#5' | 'Eb3' | 'Cs4' -> midi */
  function N(n) {
    if (typeof n === 'number') return n;
    const m = /^([A-G])(#|s|b)?(-?\d)$/.exec(n); if (!m) throw new Error('bad note ' + n);
    return 12 * (+m[3] + 1) + NOTE_IDX[m[1]] + (m[2] === '#' || m[2] === 's' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const bt = (bar, beat = 0) => bar * BAR + beat * BEAT;

  async function load(onP = () => {}) {
    const dec = new OfflineAudioContext(1, SR, SR);
    const keys = Object.keys(window.ASSETS).filter(k => k.endsWith('.mp3'));
    let done = 0;
    await Promise.all(keys.map(async k => {
      const buf = await dec.decodeAudioData(asset(k));
      const parts = k.split('/');
      if (parts[0] === 'voice') S.voice[parts[1].replace('.mp3', '')] = buf;
      else { (S.inst[parts[1]] = S.inst[parts[1]] || []).push({ midi: N(parts[2].replace('.mp3', '')), buf }); }
      onP(++done / keys.length);
    }));
    for (const k in S.inst) S.inst[k].sort((a, b) => a.midi - b.midi);
  }

  /* ------------------------------------------------------------------ */
  let ctx, M, RNG, NOISE, Q = [];
  /* Nodes are created just-in-time (ctx.suspend windows): a scheduled-but-not-yet-started
     node still costs CPU every render quantum, so building ~2000 of them up front is slow. */
  function defer(t, fn) { Q.push({ t, fn }); }
  function flush(until) {
    for (;;) {
      Q.sort((a, b) => a.t - b.t);
      if (!Q.length || Q[0].t >= until) return;
      while (Q.length && Q[0].t < until) Q.shift().fn();
    }
  }
  const deferred = (fn, ti) => (...a) => defer(typeof ti === 'function' ? ti(a) : a[ti], () => fn(...a));
  const rnd = (a = 0, b = 1) => a + (b - a) * RNG();
  function gainAt(node, t, v) { node.gain.setValueAtTime(v, t); }
  function env(g, t, a, peak, d, o = {}) {       // attack / exponential-ish decay
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(0, t + a + (o.hold || 0), d / 3);
  }
  function makeNoise() {
    const b = ctx.createBuffer(2, SR * 3, SR), R = mulberry32(99);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
    return b;
  }
  function noise(t, dur, dest, o = {}) {
    const s = ctx.createBufferSource(); s.buffer = NOISE; s.loop = true;
    s.playbackRate.value = o.rate || 1;
    s.connect(dest); s.start(t, rnd(0, 2)); s.stop(t + dur + .05);
    return s;
  }
  function filt(type, f, q = .7, gain = 0) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = gain; return b; }
  function gainN(v = 1) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function panN(p) { const n = ctx.createStereoPanner(); n.pan.value = clamp(p, -1, 1); return n; }
  function chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[0]; }
  function osc(type, f, t, dur, dest) { const o = ctx.createOscillator(); if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type); o.frequency.value = f; o.connect(dest); o.start(t); o.stop(t + dur + .05); return o; }
  function makeIR(dur = 2.3) {
    const len = Math.floor(SR * dur), b = ctx.createBuffer(2, len, SR), R = mulberry32(5);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / SR, e = Math.pow(1 - t / dur, 2) * Math.exp(-t * 2.6);
        lp += ((R() * 2 - 1) - lp) * (.85 - .7 * t / dur);
        d[i] = lp * e * .9;
      }
      for (const [ms, a] of [[7, .5], [13, .35], [19, .3], [29, .22], [37, .18], [47, .12]]) { const i = Math.floor((ms + c * 3) * SR / 1000); d[i] += a * (c ? -1 : 1); }
    }
    return b;
  }
  function pulseWave(duty) {
    const n = 64, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * duty);
    return ctx.createPeriodicWave(re, im);
  }

  /* ---------------- mixer ---------------- */
  function mixer() {
    const out = {};
    const master = gainN(.9);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = .005; comp.release.value = .25;
    const air = filt('highshelf', 9000, .7, 1.5);
    chain(master, air, comp, ctx.destination);
    const verb = ctx.createConvolver(); verb.buffer = makeIR(); chain(verb, gainN(.55), master);
    // music bus with ducking
    const music = gainN(.7), duck = gainN(1), mhp = filt('highpass', 40);
    chain(music, mhp, duck, master); chain(music, gainN(.32), verb);
    // chip bus (filtered, a little crunchy)
    const chip = gainN(1), chipLP = filt('lowpass', 5200, .9);
    chain(chip, chipLP, music);
    // sfx
    const sfx = gainN(.72); chain(sfx, master); chain(sfx, gainN(.16), verb);
    // voice: HPF -> low cut shelf -> presence -> compressor -> make-up
    const voice = filt('highpass', 85, .7);
    const vComp = ctx.createDynamicsCompressor();
    vComp.threshold.value = -24; vComp.knee.value = 8; vComp.ratio.value = 3.5; vComp.attack.value = .004; vComp.release.value = .14;
    const vOut = gainN(1.9);
    chain(voice, filt('lowshelf', 220, .7, -2), filt('peaking', 3200, 1, 3), filt('highshelf', 8000, .7, 1.5), vComp, vOut, master);
    chain(vOut, gainN(.06), verb);
    // lead bus with a dotted-eighth echo, the classic SID-tune trick
    const leadBus = gainN(1), dly = ctx.createDelay(1), fb = gainN(.32), wet = gainN(.3);
    dly.delayTime.value = BEAT * .75;
    chain(leadBus, music); chain(leadBus, dly, filt('lowpass', 3200), fb, dly); chain(dly, wet, music);
    Object.assign(out, { master, verb, music, duck, chip, chipLP, sfx, voice, lead: leadBus });
    return out;
  }

  /* ---------------- instruments ---------------- */
  const INST = {
    piano: { gain: .5, rel: .4, pan: .05 }, xylophone: { gain: .42, rel: .3, pan: .32 }, 'guitar-nylon': { gain: .55, rel: .15, pan: -.38 },
    harp: { gain: .42, rel: .7, pan: -.22 }, bassoon: { gain: .62, rel: .1, pan: -.08 }, flute: { gain: .36, rel: .16, pan: .26 }, clarinet: { gain: .5, rel: .12, pan: .16 },
  };
  const play = deferred(playNow, 2);
  function playNow(inst, note, t, dur, vel = 1, o = {}) {
    if (Array.isArray(note)) { note.forEach((n, i) => playNow(inst, n, t + i * (o.strum || 0), dur, vel, o)); return; }
    const midi = N(note) + (o.oct || 0) * 12, set = S.inst[inst], cfg = INST[inst];
    let s = set[0]; for (const x of set) if (Math.abs(x.midi - midi) < Math.abs(s.midi - midi)) s = x;
    const rate = Math.pow(2, (midi - s.midi) / 12);
    t = Math.max(0, t + (o.human ?? .008) * (RNG() - .5) * 2);
    const src = ctx.createBufferSource(); src.buffer = s.buf; src.playbackRate.value = rate;
    const g = ctx.createGain(), peak = cfg.gain * vel * (1 + (RNG() - .5) * .12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + (o.att ?? .004));
    const end = t + dur, rel = o.rel ?? cfg.rel;
    g.gain.setValueAtTime(peak, end); g.gain.setTargetAtTime(0, end, rel / 3);
    chain(src, g, panN(o.pan ?? cfg.pan), o.bus || M.music);
    src.start(Math.max(0, t)); src.stop(Math.min(end + rel * 2.5 + .05, t + s.buf.duration / rate));
  }
  /** melody string: "E5:.5 A5:.5 r:1 [C4,E4,G4]:2" ; beats; starts at absolute time t0 */
  function line(inst, t0, str, vel = 1, o = {}) {
    let b = 0;
    for (const tok of str.trim().split(/\s+/)) {
      const [n, d] = tok.split(':'); const dur = +d;
      if (n !== 'r') {
        const note = n.startsWith('[') ? n.slice(1, -1).split(',') : n;
        play(inst, note, t0 + b * BEAT, dur * BEAT * (o.legato ?? .95), vel * (o.accent && b % 1 === 0 ? 1.12 : 1), o);
      }
      b += dur;
    }
    return b;
  }
  /* chip: pulse oscillator, optional 50 Hz arpeggio like a real SID tune */
  const chip = deferred(chipNow, 1);
  function chipNow(notes, t, dur, vel = 1, o = {}) {
    const ms = (Array.isArray(notes) ? notes : [notes]).map(n => N(n) + (o.oct || 0) * 12);
    const g = ctx.createGain(), peak = .07 * vel;
    const o1 = osc(o.wave || M.pulse25, mtof(ms[0]), t, dur + .05, g);
    if (ms.length > 1) { const step = 1 / (o.rate || 50); let k = 0; for (let tt = t; tt < t + dur; tt += step, k++) o1.frequency.setValueAtTime(mtof(ms[k % ms.length]), tt); }
    if (o.slide) o1.frequency.exponentialRampToValueAtTime(mtof(ms[0] + o.slide), t + dur);
    if (o.vib) { const l = ctx.createOscillator(), lg = gainN(mtof(ms[0]) * .012); l.frequency.value = 6; chain(l, lg, o1.frequency); l.start(t + .12); l.stop(t + dur + .05); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + .003);
    g.gain.setTargetAtTime(peak * (o.sus ?? .65), t + .01, .05);
    g.gain.setValueAtTime(peak * (o.sus ?? .65), t + dur); g.gain.linearRampToValueAtTime(0, t + dur + .03);
    chain(g, panN(o.pan || 0), M.chip);
  }
  function chipLine(t0, str, vel = 1, o = {}) {
    let b = 0;
    for (const tok of str.trim().split(/\s+/)) { const [n, d] = tok.split(':'); if (n !== 'r') chip(n.startsWith('[') ? n.slice(1, -1).split(',') : n, t0 + b * BEAT, +d * BEAT * .9, vel, o); b += +d; }
  }
  /* ---------------- drums ---------------- */
  const D = {
    kick(t, v = 1) {
      const g = gainN(0); env(g, t, .002, .9 * v, .32);
      const o = osc('sine', 150, t, .4, g); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(46, t + .1);
      chain(g, M.music);
      const c = gainN(0), hf = filt('highpass', 2500); env(c, t, .001, .25 * v, .01); noise(t, .02, hf); chain(hf, c, M.music);
    },
    snare(t, v = 1) {
      const g = gainN(0); env(g, t, .001, .5 * v, .16);
      const hp = filt('highpass', 1400); noise(t, .25, hp); chain(hp, filt('peaking', 3500, 1, 4), g);
      const b = gainN(0); env(b, t, .001, .35 * v, .08); osc('triangle', 190, t, .15, b);
      chain(g, panN(.08), M.music); chain(b, M.music);
    },
    brush(t, v = 1) { const g = gainN(0), f = filt('bandpass', 3200, .6); env(g, t, .012, .22 * v, .14); noise(t, .25, f); chain(f, g, M.music); },
    shaker(t, v = 1) {
      const g = gainN(0); env(g, t, .006, .12 * v, .045);
      const f = filt('highpass', 6500); noise(t, .1, f); chain(f, g, panN(.35), M.music);
    },
    clap(t, v = 1) {
      const g = gainN(0), f = filt('bandpass', 1600, .9);
      g.gain.setValueAtTime(0, t);
      for (const d of [0, .011, .022]) { g.gain.setValueAtTime(.5 * v, t + d); g.gain.setTargetAtTime(.05 * v, t + d + .002, .003); }
      g.gain.setValueAtTime(.3 * v, t + .03); g.gain.setTargetAtTime(0, t + .03, .05);
      noise(t, .3, f); chain(f, g, panN(-.05), M.music);
    },
    block(t, f = 1000, v = 1) { const g = gainN(0); env(g, t, .001, .35 * v, .06); const o = osc('sine', f, t, .12, g); chain(g, filt('bandpass', f, 3), panN(.2), M.music); },
    tom(t, f = 110, v = 1) { const g = gainN(0); env(g, t, .002, .6 * v, .3); const o = osc('sine', f * 1.3, t, .45, g); o.frequency.exponentialRampToValueAtTime(f, t + .06); chain(g, panN(-.15), M.music); },
    tek(t, v = 1) { const g = gainN(0); env(g, t, .001, .3 * v, .04); const f = filt('bandpass', 3800, 2); noise(t, .08, f); chain(f, g, panN(.25), M.music); const b = gainN(0); env(b, t, .001, .2 * v, .03); osc('sine', 680, t, .06, b); chain(b, panN(.25), M.music); },
    crash(t, v = 1) { const g = gainN(0); env(g, t, .002, .22 * v, 1.6); const f = filt('highpass', 5000, .5); noise(t, 2.2, f); chain(f, g, M.music); },
    roll(t0, t1, v0, v1, rate = 16) { for (let t = t0, i = 0; t < t1; t += BEAT / (rate / 4), i++) this.snare(t, lerp(v0, v1, (t - t0) / (t1 - t0))); },
    chipKick(t, v = 1) { const g = gainN(0); env(g, t, .001, .5 * v, .12); const o = osc('triangle', 260, t, .15, g); o.frequency.exponentialRampToValueAtTime(50, t + .1); chain(g, M.chip); },
    chipSnare(t, v = 1) { const g = gainN(0); env(g, t, .001, .22 * v, .09); const f = filt('highpass', 1800); noise(t, .15, f, { rate: .5 }); chain(f, g, M.chip); },
  };
  const riser = deferred(riserNow, 0);
  function riserNow(t, dur, v = 1) { const g = gainN(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18 * v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + .03); const f = filt('bandpass', 500, 1.2); f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(6000, t + dur); noise(t, dur, f); chain(f, g, M.music); }
  function gliss(inst, t, from, to, dur, vel = .5, step = 1) {
    const scale = [0, 2, 4, 5, 7, 9, 11], notes = [];
    for (let m = N(from); step > 0 ? m <= N(to) : m >= N(to); m += step > 0 ? 1 : -1) if (scale.includes(((m % 12) + 12) % 12)) notes.push(m);
    notes.forEach((m, i) => play(inst, m, t + dur * i / notes.length, .4, vel * (.7 + .3 * i / notes.length), { human: .002 }));
  }
  function arp(inst, t0, beats, notes, pattern, sub, vel = .5, o = {}) {
    const n = Math.round(beats * sub);
    for (let i = 0; i < n; i++) play(inst, notes[pattern[i % pattern.length]], t0 + i * BEAT / sub, BEAT / sub * (o.len || 2), vel * (i % sub === 0 ? 1.1 : .9), o);
  }

  for (const k of Object.keys(D)) { const f = D[k]; D[k] = (...a) => defer(a[0], () => f.apply(D, a)); }

  /* ================== THE SCORE ================== */
  function score() {
    const V = {
      F: ['F3', 'A3', 'C4', 'F4'], CE: ['E3', 'G3', 'C4', 'E4'], C: ['E3', 'G3', 'C4', 'E4'], Am: ['E3', 'A3', 'C4', 'E4'], G: ['D3', 'G3', 'B3', 'D4'],
      G7: ['D3', 'F3', 'B3', 'D4'], Dm: ['D3', 'F3', 'A3', 'D4'], Dm7: ['D3', 'F3', 'A3', 'C4'], Em: ['E3', 'G3', 'B3', 'E4'], A7: ['E3', 'G3', 'C#4', 'E4'],
    };
    // ---- bars 0-1  Dresden: harp + flute, a storybook opening
    arp('harp', bt(0), 4, ['F3', 'C4', 'F4', 'A4', 'C5'], [0, 1, 2, 3, 4, 3, 2, 1], 2, .5);
    arp('harp', bt(1), 4, ['E3', 'C4', 'E4', 'G4', 'C5'], [0, 1, 2, 3, 4, 3, 2, 1], 2, .5);
    play('piano', V.F, bt(0), BAR * .98, .28); play('piano', V.CE, bt(1), BAR * .98, .28);
    play('bassoon', 'F2', bt(0), BEAT * 1.9, .45); play('bassoon', 'C3', bt(0, 2), BEAT * 1.9, .4);
    play('bassoon', 'E2', bt(1), BEAT * 1.9, .45); play('bassoon', 'G2', bt(1, 2), BEAT * 1.9, .4);
    line('flute', bt(0, .5), 'C5:1 A4:.5 C5:1 F5:1', .8);
    line('flute', bt(1), 'E5:1.5 D5:.5 C5:1 G4:1', .75);
    [[0, 3.5, 'C7'], [1, 1.5, 'G6'], [1, 3.5, 'E7']].forEach(([b, k, n]) => play('xylophone', n, bt(b, k), .3, .35));
    // ---- bars 2-3  C64: the theme arrives
    for (let b = 2; b <= 3; b++) {
      for (let k = 0; k < 4; k++) {
        const ch = b === 2 ? V.Am : (k < 2 ? V.F : V.G);
        play('guitar-nylon', ch.slice(1), bt(b, k + .5), BEAT * .35, .5, { strum: .012 });
        D.shaker(bt(b, k), .6); D.shaker(bt(b, k + .5), 1);
      }
      D.block(bt(b, 1), 1100, .8); D.block(bt(b, 3), 900, .8);
    }
    line('bassoon', bt(2), 'A2:.5 r:.5 E3:.5 r:.5 A2:.5 r:.5 E3:.5 r:.5 F2:.5 r:.5 C3:.5 r:.5 G2:.5 r:.5 D3:.5 r:.5', .7, { legato: .7 });
    line('xylophone', bt(2), 'E5:.5 A5:.5 C6:1 B5:.5 A5:.5 E5:1 F5:.5 A5:.5 C6:.5 A5:.5 G5:.5 B5:.5 D6:1', .75);
    // power-up into the screen
    chipLine(bt(3, 3), 'C5:.125 E5:.125 G5:.125 C6:.125 E6:.125 G6:.125 C7:.25', .6);
    riser(bt(3, 2), BEAT * 2, .8);
    // ---- bars 4-5  HOOKED: pure SID chiptune
    const chipBars = [[bt(4), BAR, ['C4', 'E4', 'G4'], 'C3'], [bt(5), BEAT * 2, ['A3', 'C4', 'E4'], 'A2'], [bt(5, 2), BEAT, ['F3', 'A3', 'C4'], 'F2'], [bt(5, 3), BEAT, ['G3', 'B3', 'D4'], 'G2']];
    for (const [t, d, ch, bass] of chipBars) {
      chip(ch, t, d * .97, .55, { rate: 50, pan: -.2 });
      for (let k = 0; k < Math.round(d / BEAT * 2); k++) chip(N(bass) + (k % 2 ? 12 : 0), t + k * BEAT / 2, BEAT * .4, .8, { wave: M.pulse50, sus: .5, pan: .1 });
    }
    for (let k = 0; k < 8; k++) { if (k % 2 === 0) D.chipKick(bt(4, k)); else D.chipSnare(bt(4, k)); }
    chipLine(bt(4), 'r:.5 G6:.25 E6:.25 C6:.5 r:1.25 C6:.25 E6:.25 G6:.5 C7:.5', .45, { vib: true, pan: .15 });
    chipLine(bt(5, 2), 'E6:.25 G6:.25 C7:.25 E7:.25 G7:1', .5, { vib: true, pan: .15 });       // "forever" flourish
    chip(['C4', 'E4', 'G4', 'C5'], bt(5, 3.5), BEAT * .9, .5, { slide: -24, rate: 60 });      // power-down on zoom out
    M.chipLP.frequency.setValueAtTime(900, bt(4)); M.chipLP.frequency.exponentialRampToValueAtTime(6500, bt(5, 2)); M.chipLP.frequency.exponentialRampToValueAtTime(1200, bt(6));
    // ---- bars 6-7  military service: a tiny march, then bits!
    D.snare(bt(6, 0), .5);
    [[0, .45], [.5, .3], [.75, .3], [1, .45], [2, .45], [2.5, .3], [2.75, .3], [3, .45], [3.5, .35], [3.75, .3]].forEach(([k, v]) => D.snare(bt(6, k), v));
    D.kick(bt(6, 0), .6); D.kick(bt(6, 2), .6); D.kick(bt(7, 0), .6);
    play('bassoon', 'C3', bt(6, 0), BEAT * .45, .8); play('bassoon', 'G2', bt(6, 1), BEAT * .45, .7); play('bassoon', 'C3', bt(6, 2), BEAT * .45, .8); play('bassoon', 'G2', bt(6, 3), BEAT * .45, .7);
    play('bassoon', 'G2', bt(7, 0), BEAT * .45, .8);
    [1, 3].forEach(k => play('piano', ['G3', 'C4', 'E4'], bt(6, k), BEAT * .3, .45));
    line('flute', bt(6), 'G5:.75 G5:.25 C6:.5 C6:.5 E6:1 C6:1 D6:.5 B5:.5', .7);
    // POOF (bar 7 beat 1) -> bytes
    D.crash(bt(7, 1), .6);
    for (let k = 0; k < 6; k++) chip(k % 2 ? ['G3', 'B3', 'D4', 'F4'] : ['G3', 'B3', 'D4'], bt(7, 1.5 + k * .5), BEAT * .45, .5, { rate: 50 });
    for (let k = 0; k < 6; k++) chip(k % 2 ? 'G3' : 'G2', bt(7, 1.5 + k * .5), BEAT * .4, .8, { wave: M.pulse50 });
    chipLine(bt(7, 1.5), 'G5:.25 B5:.25 D6:.25 G6:.25 F6:.25 D6:.25 B5:.25 G5:.25 A5:.25 B5:.25 D6:.5', .38, { pan: .2 });
    D.chipKick(bt(7, 2)); D.chipSnare(bt(7, 3)); D.chipKick(bt(7, 3.5));
    // ---- bars 8-9  the certificate: warm piano, flute, and a stamp "ta-da"
    arp('piano', bt(8), 4, ['F3', 'A3', 'C4', 'F4', 'A4'], [0, 1, 2, 3, 4, 3, 2, 1], 2, .42);
    arp('piano', bt(9), 2, ['D3', 'A3', 'C4', 'F4'], [0, 1, 2, 3, 2, 1, 2, 3], 2, .42);
    play('bassoon', 'F2', bt(8), BEAT * 3.8, .5); play('bassoon', 'D3', bt(9), BEAT * 1.9, .5);
    line('flute', bt(8), 'A5:1 C6:1 F6:1.5 E6:.5 D6:1 C6:1', .75);
    gliss('harp', bt(9, 1.5), 'C4', 'G6', BEAT * .95, .45);
    D.roll(bt(9, 1.5), bt(9, 2.5), .08, .45);
    const hit = bt(9, 2.5);
    play('piano', ['G2', 'G3', 'B3', 'D4', 'G4'], hit, BEAT * 1.4, .95);
    play('bassoon', 'G2', hit, BEAT * 1.2, .9); play('xylophone', ['G5', 'B5', 'D6', 'G6'], hit, .6, .6, { strum: .02 });
    play('guitar-nylon', ['G2', 'D3', 'G3', 'B3', 'D4'], hit, BEAT, .7, { strum: .015 });
    D.kick(hit, 1); D.crash(hit, 1.1);
    // ---- bars 10-11  puppet show: a bouncy little marionette dance
    line('bassoon', bt(10), 'C3:.5 r:.5 E3:.5 r:.5 G3:.5 r:.5 E3:.5 r:.5 A2:.5 r:.5 C3:.5 r:.5 G2:.5 r:.5 B2:.5 r:.5', .75, { legato: .6 });
    for (let b = 10; b <= 11; b++) for (let k = 0; k < 4; k++) {
      const ch = b === 10 ? ['C4', 'E4', 'G4'] : k < 2 ? ['C4', 'E4', 'A4'] : ['B3', 'D4', 'F4', 'G4'];
      play('guitar-nylon', ch, bt(b, k + .5), BEAT * .22, .5, { strum: .01 });
      D.block(bt(b, k), k % 2 ? 1250 : 950, .55);
    }
    line('xylophone', bt(10), 'G5:.5 C6:.5 E6:.5 D6:.5 C6:.5 G5:.5 E5:1 A5:.5 C6:.5 E6:.5 C6:.5 B5:.5 D6:.5 F6:1', .72);
    D.brush(bt(10, 1)); D.brush(bt(10, 3)); D.brush(bt(11, 1)); D.brush(bt(11, 3));
    // ---- bars 12-14  pipelines: flowing harp and a floaty flute
    const flow = [[12, ['F2', 'C3', 'F3', 'A3', 'C4', 'F4', 'A4', 'C5']], [13, ['G2', 'D3', 'G3', 'B3', 'D4', 'G4', 'B4', 'D5']]];
    for (const [b, ch] of flow) arp('harp', bt(b), 4, ch, [2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 4, 5, 6, 7, 6, 5], 4, .34, { len: 3 });
    arp('harp', bt(14), 2, ['E3', 'G3', 'B3', 'E4', 'G4', 'B4'], [0, 1, 2, 3, 4, 5, 4, 3], 4, .34, { len: 3 });
    arp('harp', bt(14, 2), 2, ['A2', 'E3', 'A3', 'C4', 'E4', 'A4'], [0, 1, 2, 3, 4, 5, 4, 3], 4, .34, { len: 3 });
    line('bassoon', bt(12), 'F2:2 C3:2 G2:2 D3:2 E2:2 A2:2', .5, { legato: .9 });
    line('flute', bt(12), 'A5:2 C6:1 A5:1 B5:2 D6:1 B5:1 G5:1 B5:1 A5:1 C6:1', .55);
    play('piano', V.F, bt(12), BAR * .95, .22); play('piano', V.G, bt(13), BAR * .95, .22); play('piano', V.Em, bt(14), BEAT * 1.9, .22); play('piano', V.Am, bt(14, 2), BEAT * 1.9, .22);
    for (let b = 12; b <= 14; b++) for (let k = 0; k < 8; k++) D.shaker(bt(b, k * .5), k % 2 ? .7 : .45);
    for (let b = 12; b <= 14; b++) { D.kick(bt(b, 0), .35); D.kick(bt(b, 2), .3); }
    gliss('harp', bt(14, 3), 'C6', 'C4', BEAT * .9, .35);
    // ---- bars 15-16  Python: snake-charmer clarinet over hand drums
    line('clarinet', bt(15), 'A4:.5 Bb4:.25 C#5:.25 D5:.5 E5:.25 F5:.25 E5:.5 D5:.5 C#5:.5 D5:.5', .8, { legato: .92 });
    line('clarinet', bt(16), 'E5:.5 F5:.25 E5:.25 D5:.5 C#5:.5 Bb4:.5 A4:.5 C#5:.5 E5:.5', .8, { legato: .92 });
    line('bassoon', bt(15), 'D3:.5 r:.5 A2:.5 r:.5 D3:.5 r:.5 A2:.5 r:.5 A2:.5 r:.5 E3:.5 r:.5 A2:.5 r:.5 C#3:.5 r:.5', .65, { legato: .6 });
    for (let b = 15; b <= 16; b++) {
      [0, 1.5, 2].forEach(k => D.tom(bt(b, k), k ? 120 : 95, .7));
      [.5, 1, 2.5, 3, 3.5, 3.75].forEach(k => D.tek(bt(b, k), .6));
    }
    play('guitar-nylon', ['D3', 'A3', 'D4', 'F4'], bt(15), BEAT * 1.5, .4, { strum: .02 });
    play('guitar-nylon', ['E3', 'A3', 'C#4', 'G4'], bt(16), BEAT * 1.5, .4, { strum: .02 });
    // ---- bars 17-19  curious: the full band
    for (let b = 17; b <= 18; b++) {
      const ch = b === 17 ? ['F3', 'A3', 'C4', 'F4'] : ['G3', 'B3', 'D4', 'G4'];
      for (let k = 0; k < 8; k++) play('guitar-nylon', ch, bt(b, k * .5), BEAT * .4, k % 2 ? .38 : .5, { strum: k % 2 ? -.008 : .012 });
      for (let k = 0; k < 8; k++) D.shaker(bt(b, k * .5), k % 2 ? .8 : .5);
      D.kick(bt(b, 0), .7); D.kick(bt(b, 2), .6); D.clap(bt(b, 1), .7); D.clap(bt(b, 3), .7);
      play('piano', b === 17 ? V.F : V.G, bt(b), BEAT * 1.9, .35); play('piano', b === 17 ? V.F : V.G, bt(b, 2), BEAT * 1.9, .3);
    }
    line('bassoon', bt(17), 'F2:.5 F3:.5 F2:.5 F3:.5 A2:.5 C3:.5 F3:.5 C3:.5 G2:.5 G3:.5 G2:.5 G3:.5 B2:.5 D3:.5 G3:.5 D3:.5', .7, { legato: .7 });
    line('xylophone', bt(17), 'C6:.5 A5:.5 F5:.5 A5:.5 C6:1 F6:1 D6:.5 B5:.5 G5:.5 B5:.5 D6:1 G6:1', .72);
    // bar 19: stop-time for the plug (beat 1) and the light bulb (beat 2)
    play('piano', ['A2', 'E3', 'A3', 'C4', 'E4'], bt(19), BEAT * .5, .7); play('bassoon', 'A2', bt(19), BEAT * .4, .8); D.kick(bt(19), .8); D.crash(bt(19), .5);
    play('xylophone', ['G6', 'B6', 'D7'], bt(19, 2), .8, .5, { strum: .03 });
    play('harp', ['G3', 'D4', 'G4', 'B4', 'D5'], bt(19, 2), BEAT * 2, .5, { strum: .04 });
    D.roll(bt(19, 2.5), bt(20), .06, .5);
    gliss('harp', bt(19, 3), 'G4', 'C7', BEAT * .95, .4);
    riser(bt(19, 2), BEAT * 2, .9);
    // ---- bars 20-22  outro: the theme, all together, and "READY."
    D.crash(bt(20), .8);
    for (let b = 20; b <= 21; b++) {
      for (let k = 0; k < 4; k++) { D.kick(bt(b, k), k % 2 ? 0 : .65); if (k % 2) D.clap(bt(b, k), .55); D.shaker(bt(b, k), .5); D.shaker(bt(b, k + .5), .8); }
      const chs = b === 20 ? [V.C, V.C] : [V.F, V.G];
      play('piano', chs[0], bt(b), BEAT * 1.9, .42); play('piano', chs[1], bt(b, 2), BEAT * 1.9, .42);
      for (let k = 0; k < 4; k++) play('guitar-nylon', (k < 2 ? chs[0] : chs[1]).slice(1), bt(b, k + .5), BEAT * .3, .45, { strum: .01 });
    }
    arp('harp', bt(20), 4, ['C3', 'G3', 'C4', 'E4', 'G4'], [0, 1, 2, 3, 4, 3, 2, 1], 2, .38);
    arp('harp', bt(21), 2, ['F3', 'C4', 'F4', 'A4'], [0, 1, 2, 3, 2, 1, 2, 3], 2, .38);
    arp('harp', bt(21, 2), 2, ['G3', 'D4', 'G4', 'B4'], [0, 1, 2, 3, 2, 1, 2, 3], 2, .38);
    line('bassoon', bt(20), 'C3:1 G2:1 C3:1 E3:1 F2:1 A2:1 G2:1 B2:1', .65, { legato: .6 });
    line('xylophone', bt(20), 'E5:.5 G5:.5 C6:1 D6:.5 E6:.5 C6:1 A5:.5 C6:.5 F6:.5 E6:.5 D6:.5 B5:.5 G5:.5 D6:.5', .78);
    line('flute', bt(20), 'E5:.5 G5:.5 C6:1 D6:.5 E6:.5 C6:1 A5:.5 C6:.5 F6:.5 E6:.5 D6:.5 B5:.5 G5:.5 D6:.5', .45, { oct: -1 });
    // final chord
    const fin = bt(22);
    play('piano', ['C2', 'C3', 'G3', 'C4', 'E4', 'G4', 'C5'], fin, BEAT * 5, .75, { strum: .012, rel: 1.2 });
    play('bassoon', 'C3', fin, BEAT * 2.5, .7);
    play('flute', 'C6', fin, BEAT * 3, .55);
    play('xylophone', ['C6', 'E6', 'G6', 'C7'], fin, 1.2, .55, { strum: .05 });
    gliss('harp', fin, 'C3', 'C6', BEAT * 1.2, .38);
    D.kick(fin, .8); D.crash(fin, 1);
    chipLine(fin + BEAT * 2.5, 'C6:.125 E6:.125 G6:.125 C7:.5', .5);
  }

  /* ================== THE CHIPTUNE SCORE (default) ==================
     A SID-flavoured score in A minor: PWM pulse leads with delayed vibrato and
     echo, resonant filtered bass, 50 Hz chord arpeggios and noise drums.        */
  const sid = deferred(sidNow, 1);
  function sidNow(notes, t, dur, vel = 1, o = {}) {
    const ms = (Array.isArray(notes) ? notes : [notes]).map(n => N(n) + (o.oct || 0) * 12);
    const f0 = mtof(ms[0]), wave = o.wave || 'pwm', end = t + dur, rel = o.r ?? .05;
    const g = gainN(0), peak = (o.gain ?? .06) * vel * (1 + (RNG() - .5) * .1), sus = o.s ?? .7;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + (o.a ?? .003));
    g.gain.setTargetAtTime(peak * sus, t + (o.a ?? .003), (o.d ?? .1) / 3);
    g.gain.setValueAtTime(peak * sus, end); g.gain.linearRampToValueAtTime(0, end + rel);
    const oscs = [];
    if (wave === 'pwm') {            // pulse = saw - delayed saw; modulating the delay = PWM
      const s = ctx.createOscillator(); s.type = 'sawtooth';
      const dl = ctx.createDelay(.05), inv = gainN(-1);
      dl.delayTime.value = (o.duty ?? .3) / f0;
      const l = ctx.createOscillator(), lg = gainN((o.pwm ?? .12) / f0); l.frequency.value = o.pwmRate ?? 3;
      chain(l, lg, dl.delayTime); l.start(t); l.stop(end + rel + .05);
      s.connect(g); chain(s, dl, inv, g); oscs.push(s);
    } else {
      const s = ctx.createOscillator();
      if (wave === 'pulse25') s.setPeriodicWave(M.pulse25); else s.type = wave;
      s.connect(g); oscs.push(s);
      if (o.detune) { const s2 = ctx.createOscillator(); s2.type = wave; s2.detune.value = o.detune; s2.connect(g); oscs.push(s2); }
    }
    for (const s of oscs) {
      s.frequency.value = f0;
      if (ms.length > 1) { const step = 1 / (o.rate || 50); let k = 0; for (let tt = t; tt < end; tt += step, k++) s.frequency.setValueAtTime(mtof(ms[k % ms.length]), tt); }
      if (o.from != null) { s.frequency.setValueAtTime(mtof(N(o.from)), t); s.frequency.exponentialRampToValueAtTime(f0, t + (o.glide || .06)); }
      if (o.slide) s.frequency.exponentialRampToValueAtTime(mtof(ms[0] + o.slide), end);
      if (o.vib) { const l = ctx.createOscillator(), lg = gainN(0); l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.vib === true ? 22 : o.vib, t + Math.min(.35, dur)); chain(l, lg, s.detune); l.start(t); l.stop(end + rel + .05); }
      s.start(t); s.stop(end + rel + .05);
    }
    let node = g;
    if (o.lp) {
      const f = filt('lowpass', o.lp[0], o.q ?? 4);
      f.frequency.setValueAtTime(o.lp[0], t); f.frequency.exponentialRampToValueAtTime(o.lp[1], t + (o.lpT ?? .2));
      g.connect(f); node = f;
    }
    chain(node, panN(o.pan || 0), o.bus || M.music);
  }
  const sidLine = (t0, str, vel, o) => { let b = 0; for (const tok of str.trim().split(/\s+/)) { const [n, d] = tok.split(':'); if (n !== 'r') sid(n.startsWith('[') ? n.slice(1, -1).split(',') : n, t0 + b * BEAT, +d * BEAT * (o.legato ?? .92), vel, o); b += +d; } };
  const LEAD = { wave: 'pwm', duty: .35, pwm: .1, a: .008, d: .25, s: .75, r: .12, vib: true, gain: .045, pan: .12 };
  const lead = (t0, str, vel = 1, o = {}) => sidLine(t0, str, vel, Object.assign({}, LEAD, { bus: M.lead }, o));
  const bassNote = (n, t, dur, vel = 1, o = {}) => sid(n, t, dur, vel, Object.assign({ wave: 'sawtooth', gain: .13, a: .002, d: .14, s: .55, r: .03, lp: [2400, 380], lpT: .16, q: 7, pan: -.05 }, o));
  const arpNote = (n, t, dur, vel = 1, o = {}) => sid(n, t, dur, vel, Object.assign({ wave: 'pwm', duty: .22, gain: .05, a: .001, d: .07, s: .25, r: .03, lp: [6000, 1800], lpT: .1, q: 2, pan: -.25 }, o));
  const chordArp = (ch, t, dur, vel = 1, o = {}) => sid(ch, t, dur, vel, Object.assign({ wave: 'pulse25', gain: .03, a: .002, d: .3, s: .6, r: .05, rate: 50, pan: .28, lp: [5200, 5200] }, o));
  const pad = (ch, t, dur, vel = 1) => ch.forEach((n, i) => sid(n, t, dur, vel, { wave: 'sawtooth', detune: 9, gain: .026, a: .35, d: .5, s: .8, r: .6, lp: [900, 1500], lpT: dur, q: 1, pan: (i - 1) * .35 }));
  const CD = {   // chip drums, straight to the music bus
    kick: deferred((t, v = 1) => { const g = gainN(0); env(g, t, .001, .65 * v, .2); const o = osc('triangle', 190, t, .25, g); o.frequency.exponentialRampToValueAtTime(42, t + .09); chain(g, M.music); const c = gainN(0), f = filt('highpass', 3000); env(c, t, .0005, .18 * v, .008); noise(t, .02, f); chain(f, c, M.music); }, 0),
    snare: deferred((t, v = 1) => { const g = gainN(0), f = filt('highpass', 1100); env(g, t, .001, .34 * v, .15); noise(t, .22, f, { rate: .7 }); chain(f, g, panN(.05), M.music); const b = gainN(0); env(b, t, .001, .22 * v, .06); const o = osc('square', 240, t, .1, b); o.frequency.exponentialRampToValueAtTime(110, t + .05); chain(b, filt('lowpass', 2500), M.music); }, 0),
    hat: deferred((t, v = 1, open) => { const g = gainN(0), f = filt('highpass', 8000); env(g, t, .0005, .11 * v, open ? .14 : .03); noise(t, open ? .25 : .06, f, { rate: 1.3 }); chain(f, g, panN(.3), M.music); }, 0),
    tom: deferred((t, f0 = 150, v = 1) => { const g = gainN(0); env(g, t, .001, .5 * v, .22); const o = osc('triangle', f0 * 1.6, t, .3, g); o.frequency.exponentialRampToValueAtTime(f0 * .7, t + .15); chain(g, panN(-.15), M.music); }, 0),
  };
  function scoreChip() {
    const CH = { Am: ['A3', 'C4', 'E4'], F: ['F3', 'A3', 'C4'], C: ['C4', 'E4', 'G4'], G: ['G3', 'B3', 'D4'], Dm: ['D4', 'F4', 'A4'], E: ['E3', 'G#3', 'B3'], A7: ['A3', 'C#4', 'E4', 'G4'] };
    const RT = { Am: 'A2', F: 'F2', C: 'C3', G: 'G2', Dm: 'D2', E: 'E2', A7: 'A2' };
    // [bar, [[chord, beats], ...], style]
    const PLAN = [
      [0, [['Am', 4]], 'intro'], [1, [['F', 4]], 'intro'],
      [2, [['Am', 4]], 'groove'], [3, [['F', 2], ['G', 2]], 'groove'],
      [4, [['Am', 4]], 'drive'], [5, [['F', 2], ['G', 2]], 'drive'],
      [6, [['Dm', 4]], 'march'], [7, [['E', 1], ['E', 3]], 'bits'],
      [8, [['F', 4]], 'rise'], [9, [['Dm', 2.5]], 'rise'],
      [10, [['Am', 4]], 'bounce'], [11, [['F', 2], ['G', 2]], 'bounce'],
      [12, [['F', 4]], 'flow'], [13, [['C', 4]], 'flow'], [14, [['G', 2], ['Am', 2]], 'flow'],
      [15, [['Dm', 4]], 'snake'], [16, [['A7', 4]], 'snake'],
      [17, [['F', 4]], 'drive'], [18, [['G', 4]], 'drive'],
      [20, [['F', 4]], 'anthem'], [21, [['G', 4]], 'anthem'],
    ];
    for (const [bar, chords, style] of PLAN) {
      let b0 = 0;
      for (const [cn, beats] of chords) {
        const t = bt(bar, b0), ch = CH[cn], rt = RT[cn], steps8 = Math.round(beats * 2), steps16 = Math.round(beats * 4);
        const at = k => t + k * BEAT;
        if (style === 'intro') {
          pad(ch, t, beats * BEAT, 2);
          bassNote(rt, t, beats * BEAT * .95, .7, { lp: [700, 300], d: .6, s: .8 });
          for (let k = 0; k < steps8; k++) arpNote(ch[k % 3], at(k / 2), BEAT * .4, 1.6, { oct: 1, gain: .045, lp: [2600 + k * 200 + bar * 1200, 1500], lpT: .15 });
        }
        if (style === 'groove' || style === 'bounce') {
          for (let k = 0; k < steps8; k++) bassNote(k % 2 ? N(rt) + 12 : rt, at(k / 2), BEAT * .42, k % 2 ? .8 : 1);
          for (let k = 0; k < steps16; k++) arpNote(ch[[0, 1, 2, 1][k % 4]], at(k / 4), BEAT * .22, .9, { oct: 1 });
          for (let k = 0; k < steps8; k++) CD.hat(at(k / 2), k % 2 ? 1 : .6);
          if (style === 'bounce') { for (let k = 0; k < beats; k++) k % 2 ? CD.snare(at(k), .7) : CD.kick(at(k), .9); }
          else if (bar === 3) { CD.kick(at(0), .7); CD.snare(at(1), .5); }
          pad(ch, t, beats * BEAT, .7);
        }
        if (style === 'drive' || style === 'anthem') {
          for (let k = 0; k < steps8; k++) bassNote(k % 2 ? N(rt) + 12 : rt, at(k / 2), BEAT * .4, k % 2 ? .85 : 1.05, { lp: [3000, 450] });
          chordArp(ch, t, beats * BEAT * .98, style === 'anthem' ? .9 : 1, { oct: 1 });
          for (let k = 0; k < beats; k++) { k % 2 ? CD.snare(at(k), .85) : CD.kick(at(k), 1); CD.hat(at(k + .5), 1, k === beats - 1); }
          for (let k = 0; k < steps8; k++) CD.hat(at(k / 2), .5);
          if (style === 'anthem') pad(ch, t, beats * BEAT, 1);
        }
        if (style === 'march') {
          for (let k = 0; k < steps16; k++) bassNote(k % 4 === 2 ? N(rt) + 12 : rt, at(k / 4), BEAT * .2, k % 4 === 0 ? 1.05 : .8, { lp: [1800, 300] });
          [[0, 1], [.5, .6], [.75, .6], [1, .9], [2, 1], [2.5, .6], [2.75, .6], [3, .9], [3.5, .7], [3.75, .7]].forEach(([k, v]) => CD.snare(at(k), v * .8));
          CD.kick(at(0)); CD.kick(at(2));
          pad(ch, t, beats * BEAT, .9);
        }
        if (style === 'bits') {
          if (beats === 1) { bassNote(rt, t, BEAT * .5, 1); CD.snare(t, .7); }
          else {
            for (let k = 0; k < steps16; k++) arpNote(ch[k % 3], at(k / 4), BEAT * .2, 1, { oct: 1 + (k % 8 > 3 ? 1 : 0), duty: .12 });
            for (let k = 0; k < steps8; k++) bassNote(k % 2 ? N(rt) + 12 : rt, at(k / 2), BEAT * .4, .9);
            CD.kick(at(1)); CD.snare(at(2)); CD.kick(at(2.5)); for (let k = 0; k < 6; k++) CD.hat(at(k / 2), .8);
          }
        }
        if (style === 'rise') {
          pad(ch, t, beats * BEAT, 1.1);
          for (let k = 0; k < steps8; k++) bassNote(rt, at(k / 2), BEAT * .4, .75 + k * .03, { lp: [1200 + k * 200, 400] });
          for (let k = 0; k < steps16; k++) arpNote(ch[k % 3], at(k / 4), BEAT * .2, .5 + .5 * k / steps16, { oct: 1 });
          for (let k = 0; k < steps8; k++) CD.hat(at(k / 2), .4 + .4 * k / steps8);
        }
        if (style === 'flow') {
          pad(ch, t, beats * BEAT, 1);
          for (let k = 0; k < beats; k++) bassNote(rt, at(k), BEAT * .8, .8, { lp: [900, 300], d: .3, s: .5 });
          for (let k = 0; k < steps16; k++) arpNote([...ch, N(ch[0]) + 12][[0, 1, 2, 3, 2, 1][k % 6]], at(k / 4), BEAT * .3, .85, { oct: 1, pan: Math.sin(k * .7) * .5, lp: [4200, 1400] });
          for (let k = 0; k < steps16; k++) CD.hat(at(k / 4), k % 2 ? .35 : .6);
          CD.kick(at(0), .7); if (beats > 2) CD.kick(at(2.5), .5);
        }
        if (style === 'snake') {
          pad(ch, t, beats * BEAT, .8);
          for (let k = 0; k < beats; k++) bassNote(k % 2 ? N(rt) + 7 : rt, at(k), BEAT * .45, .9);
          [[0, 90], [1.5, 130], [2, 100]].forEach(([k, f]) => CD.tom(at(k), f));
          [.5, 1, 2.5, 3, 3.5, 3.75].forEach(k => CD.hat(at(k), .8));
        }
        b0 += beats;
      }
    }
    // ---- leads (kept out of the way of the narration, bold in the gaps)
    lead(bt(0, 2), 'E5:1 A5:1 C6:1.5 B5:.5 A5:1 E5:1', .8, { gain: .034 });
    lead(bt(2), 'r:2 A4:.5 C5:.5 E5:1 F5:1 E5:.5 D5:.5 E5:1 D5:1', .6, { gain: .032 });
    chordArp(['A4', 'C5', 'E5', 'A5'], bt(3, 3), BEAT * .9, 1, { rate: 60, slide: 12, gain: .03 });   // dive into the screen
    riser(bt(3, 2), BEAT * 2, .7);
    lead(bt(4), 'A5:.5 E5:.25 A5:.25 C6:.5 B5:.5 A5:1 G5:.5 E5:.5', .9);
    lead(bt(5), 'F5:.5 A5:.5 C6:.5 A5:.5 G5:.25 B5:.25 D6:.25 G6:.25 A6:1', .9);           // "Forever"
    sid(['A4', 'C5', 'E5', 'A5'], bt(5, 3.5), BEAT * .9, .8, { wave: 'pulse25', gain: .03, rate: 60, slide: -24 });   // power-down
    lead(bt(6), 'D5:.75 D5:.25 F5:.5 A5:.5 D6:1 C6:.5 A5:.5 B5:1', .7, { gain: .038, legato: .8 });
    CD.snare(bt(7, 1), 1); D.crash(bt(7, 1), .6);
    lead(bt(7, 1.5), 'E5:.25 G#5:.25 B5:.25 E6:.25 D6:.25 B5:.25 G#5:.25 B5:.25 E6:.5', .6, { gain: .035, vib: false });
    lead(bt(8), 'A4:1 C5:1 F5:1.5 E5:.5 D5:1 F5:1', .7, { gain: .036 });
    // the stamp: G major hit on bar 9 beat 2.5, then silence
    const hit = bt(9, 2.5);
    D.roll(bt(9, 1.5), hit, .05, .35);
    bassNote('G2', hit, BEAT * 1.3, 1.2, { lp: [4000, 500], lpT: .5 }); bassNote('G1', hit, BEAT * 1.3, 1);
    sid(['G4', 'B4', 'D5', 'G5'], hit, BEAT * 1.4, 1, { wave: 'pulse25', gain: .045, rate: 50, d: .5, s: .4, r: .3 });
    lead(hit, 'G5:1.5', 1, { gain: .05, from: 'G4', glide: .08 });
    CD.kick(hit, 1.2); D.crash(hit, 1);
    lead(bt(10), 'E5:.5 A5:.5 C6:.5 A5:.5 E6:.5 C6:.5 A5:1 F5:.5 A5:.5 C6:.5 F6:.5 D6:.5 B5:.5 G5:1', .7, { gain: .036, legato: .7 });
    lead(bt(12), 'A5:2 C6:1 A5:1 G5:2 E5:1 G5:1 D5:1 G5:1 E5:1 A5:1', .6, { gain: .032 });
    lead(bt(15), 'A4:.5 Bb4:.25 C#5:.25 D5:.5 E5:.25 F5:.25 E5:.5 D5:.5 C#5:.5 D5:.5', .8, { gain: .04, duty: .45 });
    lead(bt(16), 'E5:.5 F5:.25 E5:.25 D5:.5 C#5:.5 Bb4:.5 A4:.5 C#5:.5 E5:.5', .8, { gain: .04, duty: .45 });
    lead(bt(17), 'C6:.5 A5:.5 F5:.5 A5:.5 C6:.5 D6:.5 C6:1 B5:.5 G5:.5 D5:.5 G5:.5 B5:.5 D6:.5 G6:1', .75, { gain: .036 });
    // bar 19: stop-time for the plug (beat 1) and the light bulb (beat 2)
    bassNote('A2', bt(19), BEAT * .5, 1.1); bassNote('A1', bt(19), BEAT * .5, 1); CD.kick(bt(19), 1.1); D.crash(bt(19), .5);
    sid(['A4', 'C5', 'E5'], bt(19), BEAT * .5, 1, { wave: 'pulse25', gain: .04, rate: 50 });
    sid(['G5', 'B5', 'D6', 'G6'], bt(19, 2), BEAT * 1.9, 1, { wave: 'pwm', duty: .15, gain: .03, rate: 25, a: .002, d: .6, s: .3, r: .4, bus: M.lead });
    pad(['G3', 'D4', 'G4', 'B4'], bt(19, 2), BEAT * 2, 1.1);
    D.roll(bt(19, 2.5), bt(20), .05, .45); riser(bt(19, 2), BEAT * 2, .9);
    // outro anthem + final chord + "READY." blip
    D.crash(bt(20), .7);
    lead(bt(20), 'A5:.5 C6:.5 F6:1 E6:.5 C6:.5 A5:1 B5:.5 D6:.5 G6:1 F6:.5 D6:.5 B5:.5 D6:.5', .9, { gain: .042 });
    lead(bt(20), 'F5:1.5 E5:.5 C5:2 G5:1.5 F5:.5 D5:2', .5, { gain: .022, duty: .2, pan: -.2 });
    const fin = bt(22);
    pad(['C3', 'G3', 'C4', 'E4', 'G4'], fin, BEAT * 4, 1.4);
    bassNote('C2', fin, BEAT * 3, 1.2, { lp: [3000, 300], lpT: 1.2, s: .8, r: .6 });
    sid(['C5', 'E5', 'G5', 'C6'], fin, BEAT * 3, 1, { wave: 'pulse25', gain: .035, rate: 50, d: 1, s: .5, r: .8, bus: M.lead });
    lead(fin, 'C6:3', 1, { gain: .045, from: 'G5', glide: .1, r: .8 });
    CD.kick(fin, 1.2); D.crash(fin, 1);
    sidLine(fin + BEAT * 2.75, 'C6:.125 E6:.125 G6:.125 C7:.5', .8, { wave: 'pulse25', gain: .04, a: .001, s: .8, bus: M.lead });
  }
  /* 8-bit replacements for the most cartoonish effects when the chip score plays */
  const CHIP_FX = {
    boing: c => sid(N('C4') + Math.round(12 * Math.log2(c.pitch || 1)), c.t, .3, (c.v ?? .45) * 1.4, { wave: 'pwm', gain: .05, slide: 19, a: .002, s: .6, r: .05, bus: M.sfx }),
    hop: c => sid('C5', c.t, .07, (c.v ?? .3) * 2, { wave: 'pulse25', gain: .04, slide: 12, bus: M.sfx }),
    twang: c => sid(N('G3') + Math.round(12 * Math.log2(c.pitch || 1)), c.t, .35, (c.v ?? .3) * 2.2, { wave: 'sawtooth', gain: .05, a: .001, d: .15, s: .2, r: .1, lp: [5000, 500], lpT: .2, q: 8, bus: M.sfx }),
    chime: c => sidLine(c.t, 'C6:.08 E6:.08 G6:.08 C7:.08 E7:.5', (c.v ?? .4) * 2, { wave: 'pulse25', gain: .03, a: .001, d: .2, s: .4, r: .2, bus: M.lead }),
    ding: c => { sid(['C7', 'G7'], c.t, .5, (c.v ?? .5) * 2, { wave: 'pulse25', gain: .03, rate: 25, a: .001, d: .4, s: .3, r: .3, bus: M.lead }); },
  };

  /* ================== SOUND EFFECTS ================== */
  function sfxOut(pan = 0, v = 1) { const g = gainN(v); chain(g, panN(pan), M.sfx); return g; }
  const FX = {
    pop({ t, v = .5, pitch = 1 }) {
      const out = sfxOut(rnd(-.4, .4)), g = gainN(0); env(g, t, .002, v, .09);
      const o = osc('sine', 900 * pitch, t, .15, g); o.frequency.exponentialRampToValueAtTime(260 * pitch, t + .07); chain(g, out);
      const c = gainN(0); env(c, t, .001, v * .25, .01); const f = filt('highpass', 3000); noise(t, .03, f); chain(f, c, out);
    },
    rustle({ t, dur = .4, v = .5 }) {
      const out = sfxOut(rnd(-.5, .5)), g = gainN(0), f = filt('bandpass', rnd(2500, 4000), .8), h = filt('highpass', 1200);
      noise(t, dur + .1, f); chain(f, h, g, out);
      g.gain.setValueAtTime(0, t);
      for (let tt = t; tt < t + dur; tt += rnd(.006, .018)) { const e = Math.sin(Math.PI * (tt - t) / dur); g.gain.setValueAtTime(v * .8 * e * Math.pow(RNG(), 2), tt); }
      g.gain.setValueAtTime(0, t + dur);
    },
    slide({ t, v = .4, pitch = 1 }) {
      const out = sfxOut(rnd(-.3, .3)), g = gainN(0), f = filt('bandpass', 700 * pitch, 1.4);
      f.frequency.exponentialRampToValueAtTime(2600 * pitch, t + .25);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .7, t + .08); g.gain.linearRampToValueAtTime(0, t + .3);
      noise(t, .35, f); chain(f, g, out);
    },
    pencil({ t, dur = .6, v = .4 }) {
      const out = sfxOut(rnd(-.2, .3)), g = gainN(0), f = filt('bandpass', 4200, 1.8), f2 = filt('highpass', 1800);
      noise(t, dur + .1, f); chain(f, f2, g, out);
      g.gain.setValueAtTime(0, t);
      let tt = t; while (tt < t + dur) { const len = rnd(.05, .13); g.gain.linearRampToValueAtTime(v * rnd(.5, 1), tt + len * .3); g.gain.linearRampToValueAtTime(v * .05, tt + len); tt += len + rnd(0, .03); }
      g.gain.linearRampToValueAtTime(0, t + dur + .02);
    },
    marker({ t, dur = .5, v = .4 }) {
      const out = sfxOut(.1), g = gainN(0), f = filt('bandpass', 2300, 3);
      noise(t, dur + .1, f); chain(f, g, out); env(g, t, .02, v, dur, { hold: dur * .6 });
      const s = gainN(0); env(s, t, .03, v * .05, dur * .7, { hold: dur * .4 }); const o = osc('sine', 1900, t, dur, s); o.frequency.linearRampToValueAtTime(2300, t + dur); chain(s, out);
    },
    whoosh({ t, dur = .8, v = .5, up }) {
      const g = gainN(0), f = filt('bandpass', 300, 1.1), p = ctx.createStereoPanner();
      f.frequency.setValueAtTime(up ? 600 : 300, t); f.frequency.exponentialRampToValueAtTime(up ? 5000 : 2400, t + dur * .55); f.frequency.exponentialRampToValueAtTime(up ? 3000 : 500, t + dur);
      p.pan.setValueAtTime(-.7, t); p.pan.linearRampToValueAtTime(.7, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .8, t + dur * .5); g.gain.linearRampToValueAtTime(0, t + dur);
      noise(t, dur + .05, f); chain(f, g, p, M.sfx);
    },
    zoom({ t, dur = 1, v = .5 }) {
      FX.whoosh({ t, dur, v: v * .8 });
      const g = gainN(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .08, t + dur * .7); g.gain.linearRampToValueAtTime(0, t + dur);
      const o = osc('triangle', 180, t, dur, g); o.frequency.exponentialRampToValueAtTime(1400, t + dur); chain(g, sfxOut(0));
    },
    zoomout({ t, dur = 1, v = .5 }) {
      FX.whoosh({ t, dur, v: v * .8 });
      const g = gainN(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .07, t + dur * .3); g.gain.linearRampToValueAtTime(0, t + dur);
      const o = osc('triangle', 1400, t, dur, g); o.frequency.exponentialRampToValueAtTime(160, t + dur); chain(g, sfxOut(0));
    },
    thud({ t, v = .6, pitch = 1 }) {
      const out = sfxOut(rnd(-.2, .2)), g = gainN(0); env(g, t, .002, v, .35);
      const o = osc('sine', 120 * pitch, t, .5, g); o.frequency.exponentialRampToValueAtTime(42 * pitch, t + .16); chain(g, out);
      const n = gainN(0); env(n, t, .001, v * .5, .07); const f = filt('lowpass', 500); noise(t, .12, f); chain(f, n, out);
    },
    stomp({ t, v = .6 }) {
      FX.thud({ t, v: v * .8, pitch: .9 });
      const out = sfxOut(rnd(-.3, .3)), n = gainN(0); env(n, t, .001, v * .35, .06); const f = filt('bandpass', 900, 1); noise(t, .1, f); chain(f, n, out);
    },
    stamp({ t, v = 1 }) {
      const out = sfxOut(0), g = gainN(0); env(g, t, .002, v, .6);
      const o = osc('sine', 95, t, .8, g); o.frequency.exponentialRampToValueAtTime(34, t + .25); chain(g, out);
      const s = gainN(0); env(s, t, .001, v * .6, .05); const f = filt('highpass', 900); noise(t, .1, f); chain(f, s, out);
      const k = gainN(0); env(k, t + .02, .01, v * .15, .25); const f2 = filt('bandpass', 1500, .7); noise(t, .35, f2); chain(f2, k, out);
    },
    plop({ t, v = .4, pitch = 1 }) {
      const out = sfxOut(rnd(-.4, .4)), g = gainN(0); env(g, t, .002, v, .1);
      const o = osc('sine', 380 * pitch, t, .2, g); o.frequency.exponentialRampToValueAtTime(1300 * pitch, t + .06); chain(g, out);
    },
    boing({ t, v = .45, pitch = 1 }) {
      const out = sfxOut(rnd(-.2, .2)), g = gainN(0); env(g, t, .004, v * .6, .5);
      const o = osc('sine', 170 * pitch, t, .6, g); o.frequency.exponentialRampToValueAtTime(330 * pitch, t + .45);
      const l = ctx.createOscillator(), lg = gainN(60 * pitch); l.frequency.value = 13; lg.gain.setTargetAtTime(0, t, .2); chain(l, lg, o.frequency); l.start(t); l.stop(t + .6);
      chain(g, out);
    },
    c64beep({ t, v = .3, f = 1047, dur = .3 }) {
      const out = sfxOut(0), g = gainN(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .22, t + .003); g.gain.setValueAtTime(v * .22, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + .01);
      osc(M.pulse50, f, t, dur + .02, g); chain(g, filt('lowpass', 7000), out);
    },
    blip({ t, v = .2, f = 800 }) { FX.c64beep({ t, v, f, dur: .04 }); },
    crton({ t, v = .4 }) {
      const out = sfxOut(0);
      FX.thud({ t, v: v * .6, pitch: 1.3 });
      const s = gainN(0); env(s, t + .02, .01, v * .35, .35); const f = filt('highpass', 2500); noise(t, .45, f); chain(f, s, out);
      const h = gainN(0); env(h, t, .02, v * .12, .5); osc('sawtooth', 50, t, .6, h); chain(h, filt('lowpass', 300), out);
    },
    blink({ t, v = .4 }) { const out = sfxOut(0), g = gainN(0); env(g, t, .001, v * .5, .05); const o = osc('sine', 1500, t, .08, g); o.frequency.exponentialRampToValueAtTime(700, t + .05); chain(g, out); },
    reel({ t, dur = .5, v = .4 }) {
      const out = sfxOut(0);
      for (let tt = t, k = 0; tt < t + dur; tt += lerp(.035, .012, (tt - t) / dur), k++) { const g = gainN(0); env(g, tt, .0005, v * .5, .006); const f = filt('bandpass', 3200, 2); noise(tt, .015, f); chain(f, g, out); }
    },
    keys({ t, n = 10, rate = 20, v = .35 }) {
      for (let i = 0; i < n; i++) {
        const tt = t + i / rate + rnd(0, .012), out = sfxOut(rnd(-.3, .3));
        const g = gainN(0); env(g, tt, .0005, v * rnd(.5, 1), .012); const f = filt('bandpass', rnd(2200, 3200), 1.4); noise(tt, .03, f); chain(f, g, out);
        const b = gainN(0); env(b, tt, .001, v * .35, .02); osc('sine', rnd(150, 220), tt, .04, b); chain(b, out);
      }
    },
    jingle({ t, v = .35 }) {
      for (let i = 0; i < 4; i++) {
        const tt = t + i * rnd(.05, .11), out = sfxOut(.4);
        for (const [f, a] of [[2630, 1], [3790, .6], [5120, .4], [6900, .25]]) { const g = gainN(0); env(g, tt, .001, v * .12 * a * (1 - i * .18), .25); osc('sine', f * rnd(.98, 1.02), tt, .35, g); chain(g, out); }
      }
    },
    poof({ t, v = .6 }) {
      const out = sfxOut(0), g = gainN(0), f = filt('lowpass', 4000, .7);
      f.frequency.setValueAtTime(4000, t); f.frequency.exponentialRampToValueAtTime(250, t + .45);
      env(g, t, .005, v * .8, .45); noise(t, .5, f); chain(f, g, out);
      FX.thud({ t, v: v * .4, pitch: 1.4 });
    },
    hop({ t, v = .3 }) { const out = sfxOut(rnd(-.3, .3)), g = gainN(0); env(g, t, .002, v * .5, .07); const o = osc('square', 300, t, .1, g); o.frequency.exponentialRampToValueAtTime(700, t + .06); chain(g, filt('lowpass', 3000), out); },
    ratchet({ t, dur = 2, v = .15 }) {
      for (let tt = t; tt < t + dur; tt += .11) { const out = sfxOut(-.5), g = gainN(0); env(g, tt, .0005, v * .6, .01); const f = filt('bandpass', 1700, 3); noise(tt, .02, f); chain(f, g, out); }
    },
    cheer({ t, v = .4 }) {  // party popper
      const out = sfxOut(0), g = gainN(0); env(g, t, .001, v * .8, .05); const f = filt('lowpass', 2500); noise(t, .08, f); chain(f, g, out);
      FX.rustle({ t: t + .05, dur: .7, v: v * .7 });
    },
    confetti({ t, v = .5 }) { FX.cheer({ t, v }); },
    curtain({ t, dur = .7, v = .4 }) {
      const out = sfxOut(0), g = gainN(0), f = filt('lowpass', 1400, .5); env(g, t, dur * .3, v * .6, dur * .7); noise(t, dur + .2, f); chain(f, g, out);
      FX.rustle({ t, dur, v: v * .5 });
    },
    twang({ t, v = .3, pitch = 1 }) {  // Karplus-Strong plucked string
      const f0 = 196 * pitch, len = Math.floor(SR * .9), b = ctx.createBuffer(1, len, SR), d = b.getChannelData(0), P = Math.floor(SR / f0), R = mulberry32(Math.floor(t * 1000));
      for (let i = 0; i < P; i++) d[i] = R() * 2 - 1;
      for (let i = P; i < len; i++) d[i] = .5 * (d[i - P] + d[i - P + 1]) * .996;
      const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.setValueAtTime(1.03, t); s.playbackRate.exponentialRampToValueAtTime(1, t + .12);
      const g = gainN(v * .6); chain(s, g, sfxOut(rnd(-.5, .5))); s.start(t);
    },
    clank({ t, v = .4, pitch = 1 }) {
      const out = sfxOut(rnd(-.4, .4));
      for (const [f, a, d] of [[320, 1, .5], [812, .7, .35], [1470, .5, .25], [2390, .35, .15], [3510, .2, .1]]) { const g = gainN(0); env(g, t, .001, v * .18 * a, d); osc('sine', f * pitch, t, d + .1, g); chain(g, out); }
      const c = gainN(0); env(c, t, .001, v * .4, .015); const f = filt('highpass', 2000); noise(t, .03, f); chain(f, c, out);
    },
    water({ t, dur = 3, v = .3 }) {
      const out = sfxOut(0), g = gainN(0), f = filt('lowpass', 1100, .5), b = filt('bandpass', 600, .6);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .5, t + .4); g.gain.setValueAtTime(v * .5, t + dur - .5); g.gain.linearRampToValueAtTime(0, t + dur);
      const l = ctx.createOscillator(), lg = gainN(250); l.frequency.value = .7; chain(l, lg, b.frequency); l.start(t); l.stop(t + dur);
      noise(t, dur, f); chain(f, b, g, out);
    },
    gurgle({ t, dur = 3, v = .3 }) { for (let tt = t; tt < t + dur; tt += rnd(.06, .2)) FX.plop({ t: tt, v: v * rnd(.3, .8), pitch: rnd(.7, 1.4) }); },
    birds({ t, dur = 4, v = .12 }) {
      for (let tt = t + .3; tt < t + dur; tt += rnd(.6, 1.3)) for (let k = 0; k < 2 + Math.floor(RNG() * 2); k++) {
        const ts = tt + k * .11, out = sfxOut(rnd(-.7, .7)), g = gainN(0); env(g, ts, .005, v * .4, .06);
        const o = osc('sine', rnd(2600, 3200), ts, .1, g); o.frequency.exponentialRampToValueAtTime(rnd(3800, 4600), ts + .05); chain(g, out);
      }
    },
    hiss({ t, dur = .6, v = .35 }) {
      const out = sfxOut(-.2), g = gainN(0), f = filt('highpass', 5000); env(g, t, dur * .3, v * .5, dur * .6, { hold: dur * .2 }); noise(t, dur + .2, f); chain(f, filt('peaking', 7500, 2, 6), g, out);
    },
    chime({ t, v = .4 }) { ['C6', 'E6', 'G6', 'C7', 'E7'].forEach((n, i) => play('xylophone', n, t + i * .045, .4, v * 1.2, { bus: M.sfx, pan: -.3 + i * .15, human: 0 })); },
    ding({ t, v = .5 }) { play('xylophone', ['C7', 'G7'], t, .8, v * 1.4, { bus: M.sfx, human: 0 }); FX.pop({ t, v: v * .3, pitch: 2 }); },
    slam({ t, v = .5, pitch = 1 }) {
      FX.thud({ t, v: v * .9, pitch: pitch * 1.1 });
      const out = sfxOut(rnd(-.4, .4)), s = gainN(0); env(s, t, .001, v * .5, .05); const f = filt('highpass', 1500); noise(t, .08, f); chain(f, s, out);
    },
    clap({ t, v = .5 }) {
      const out = sfxOut(.4), g = gainN(0); env(g, t, .0005, v, .03); const f = filt('bandpass', 2200, 1); noise(t, .06, f); chain(f, g, out);
      const b = gainN(0); env(b, t, .0005, v * .5, .02); osc('sine', 950, t, .04, b); chain(b, out);
    },
    plugin({ t, v = .6 }) { FX.thud({ t, v: v * .5, pitch: 1.6 }); FX.clap({ t: t + .01, v: v * .5 }); },
    zap({ t, v = .5 }) {
      const out = sfxOut(.3), h = gainN(0); env(h, t, .005, v * .18, .35); osc('sawtooth', 110, t, .5, h); chain(h, filt('bandpass', 1200, 1), out);
      for (let tt = t; tt < t + .45; tt += rnd(.015, .05)) { const g = gainN(0); env(g, tt, .0005, v * rnd(.2, .6), .01); const f = filt('bandpass', rnd(2000, 6000), 1.5); noise(tt, .02, f); chain(f, g, out); }
    },
  };

  for (const k of Object.keys(FX)) { const f = FX[k]; FX[k] = c => defer(c.t, () => f(c)); }

  /* ---------------- voice + ducking ---------------- */
  function voiceAndDuck(mute) {
    const spans = [];
    for (const [key, t] of VO) {
      const buf = S.voice[key]; if (!buf) continue;
      if (!mute) defer(t, () => { const s = ctx.createBufferSource(); s.buffer = buf; s.connect(M.voice); s.start(t); });
      spans.push([t, t + buf.duration]);
    }
    // merge spans closer than 0.5 s, then automate the music duck
    const merged = [];
    for (const sp of spans.sort((a, b) => a[0] - b[0])) { const l = merged[merged.length - 1]; if (l && sp[0] - l[1] < .5) l[1] = Math.max(l[1], sp[1]); else merged.push([...sp]); }
    const d = M.duck.gain, low = .5;
    d.setValueAtTime(1, 0);
    for (const [a, b] of merged) { d.setValueAtTime(1, Math.max(0, a - .15)); d.linearRampToValueAtTime(low, a); d.setValueAtTime(low, b); d.linearRampToValueAtTime(1, b + .35); }
    return merged;
  }

  async function render(onP = () => {}) {
    const len = Math.ceil((DURATION + .05) * SR);
    ctx = new OfflineAudioContext(2, len, SR);
    RNG = mulberry32(2024); NOISE = makeNoise(); Q = [];
    M = mixer(); M.pulse25 = pulseWave(.25); M.pulse50 = pulseWave(.5);
    const SKIP = window.__AUDIO_SKIP || {};          // debug: render stems
    const chipMode = SCORE === 'chip';
    if (chipMode) M.music.gain.value *= 1.25;
    if (!SKIP.music) chipMode ? scoreChip() : score();
    if (!SKIP.sfx) for (const c of CUES) { const f = (chipMode && CHIP_FX[c.type]) || FX[c.type]; if (f) f(c); else console.warn('no sfx', c.type); }
    voiceAndDuck(SKIP.voice);
    // master fade at the very end
    M.master.gain.setValueAtTime(.9, DURATION - 1.2); M.master.gain.linearRampToValueAtTime(0, DURATION);
    const AHEAD = 1, STEP = .5;
    flush(AHEAD);
    for (let s = STEP; s < DURATION; s += STEP) ctx.suspend(s).then(() => { flush(s + AHEAD); onP(s / DURATION); ctx.resume(); });
    const buf = await ctx.startRendering();
    // peak-normalise to -1 dBFS
    if (SKIP.raw) { onP(1); return buf; }
    let peak = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i])); }
    const k = Math.pow(10, -1.8 / 20) / (peak || 1);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
    onP(1);
    return buf;
  }
  function wavBase64(buf) {
    const ch = buf.numberOfChannels, n = buf.length, bytes = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const w = (o, s) => [...s].forEach((c, i) => bytes.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); bytes.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); bytes.setUint32(16, 16, true);
    bytes.setUint16(20, 1, true); bytes.setUint16(22, ch, true); bytes.setUint32(24, buf.sampleRate, true); bytes.setUint32(28, buf.sampleRate * ch * 2, true);
    bytes.setUint16(32, ch * 2, true); bytes.setUint16(34, 16, true); w(36, 'data'); bytes.setUint32(40, n * ch * 2, true);
    const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
    let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { bytes.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 32767, true); o += 2; }
    const u8 = new Uint8Array(bytes.buffer); let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
    return btoa(s);
  }
  return { load, render, wavBase64, score: SCORE };
})();
