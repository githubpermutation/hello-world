'use strict';
/* =====================================================================
 *  main.js - boot, player UI, export hooks (used by tools/render.mjs)
 * ===================================================================== */
function b64ToBuf(b64) { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
function asset(path) { const a = window.ASSETS && window.ASSETS[path]; if (!a) throw new Error('missing asset ' + path); return b64ToBuf(a); }

async function loadFonts() {
  const list = [
    ['Caveat', 'caveat-latin-400-normal', '400'], ['Caveat', 'caveat-latin-700-normal', '700'],
    ['Gochi Hand', 'gochi-hand-latin-400-normal', '400'], ['Permanent Marker', 'permanent-marker-latin-400-normal', '400'],
    ['Press Start 2P', 'press-start-2p-latin-400-normal', '400'], ['Patrick Hand', 'patrick-hand-latin-400-normal', '400'],
    ['Fredericka the Great', 'fredericka-the-great-latin-400-normal', '400'],
  ];
  for (const [fam, file, weight] of list) {
    const ff = new FontFace(fam, asset(`fonts/${file}.woff2`), { weight });
    await ff.load(); document.fonts.add(ff);
  }
}

const FILM = {
  duration: DURATION, ready: false,
  async init(onProgress = () => {}, scale = 1) {
    RENDER_SCALE = scale;
    await loadFonts(); onProgress(.05, 'fonts');
    buildTextures(); onProgress(.1, 'paper');
    await bakeAll(p => onProgress(.1 + p * .55, 'scissors'));
    await AUDIO.load(p => onProgress(.65 + p * .15, 'instruments'));
    this.ready = true;
  },
  async mix(onProgress) { if (!this.buffer) this.buffer = await AUDIO.render(onProgress); return this.buffer; },
  frame(ctx, t, mb = 0) { drawFrame(ctx, clamp(t, 0, DURATION), { mb }); },
  async wavBase64() { const b = await this.mix(); return AUDIO.wavBase64(b); },
};
window.FILM = FILM;

/* ---------------- interactive player ---------------- */
async function startPlayer() {
  const cv = document.getElementById('film'), ctx = cv.getContext('2d');
  const ui = { start: document.getElementById('start'), bar: document.getElementById('bar'), fill: document.getElementById('fill'),
    status: document.getElementById('status'), controls: document.getElementById('controls'), play: document.getElementById('play'),
    seek: document.getElementById('seek'), time: document.getElementById('time'), fs: document.getElementById('fs') };
  const scale = Math.min(2, Math.max(1, Math.round((window.devicePixelRatio || 1) * Math.min(innerWidth / W, innerHeight / H) * 2) / 2));
  cv.width = W * scale; cv.height = H * scale;
  await FILM.init((p, what) => { ui.fill.style.width = (p * 100).toFixed(1) + '%'; ui.status.textContent = `cutting ${what}…`; }, scale);
  await FILM.mix(p => { ui.fill.style.width = (80 + p * 20).toFixed(1) + '%'; ui.status.textContent = 'tuning the orchestra…'; });
  ui.fill.style.width = '100%'; ui.status.textContent = 'ready';
  document.body.classList.add('ready');
  FILM.frame(ctx, 3.9);

  let ac = null, src = null, playing = false, startAt = 0, offset = 0, raf = 0;
  const now = () => playing ? Math.min(DURATION, ac.currentTime - startAt) : offset;
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function tick() {
    const t = now();
    FILM.frame(ctx, t, 0);
    ui.seek.value = t / DURATION * 1000; ui.time.textContent = `${fmt(t)} / ${fmt(DURATION)}`;
    if (playing && t >= DURATION) { pause(); offset = 0; document.body.classList.add('ended'); }
    if (playing) raf = requestAnimationFrame(tick);
  }
  function play() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
    ac.resume();
    if (offset >= DURATION - .05) offset = 0;
    src = ac.createBufferSource(); src.buffer = FILM.buffer; src.connect(ac.destination);
    src.start(0, offset); startAt = ac.currentTime - offset; playing = true;
    document.body.classList.add('playing'); document.body.classList.remove('ended', 'paused');
    ui.play.textContent = '❚❚'; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  function pause() {
    if (!playing) return; offset = now(); playing = false;
    try { src.stop(); } catch (e) {}
    document.body.classList.add('paused'); ui.play.textContent = '▶'; cancelAnimationFrame(raf); tick();
  }
  ui.start.addEventListener('click', () => { document.body.classList.add('started'); play(); });
  ui.play.addEventListener('click', () => playing ? pause() : play());
  ui.seek.addEventListener('input', () => { const was = playing; if (was) pause(); offset = ui.seek.value / 1000 * DURATION; tick(); if (was) play(); });
  ui.fs.addEventListener('click', () => { const el = document.getElementById('stage'); document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen && el.requestFullscreen(); });
  cv.addEventListener('click', () => { if (document.body.classList.contains('started')) playing ? pause() : play(); });
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); if (!document.body.classList.contains('started')) ui.start.click(); else playing ? pause() : play(); }
    if (e.code === 'KeyF') ui.fs.click();
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { const was = playing; if (was) pause(); offset = clamp(offset + (e.code === 'ArrowRight' ? 5 : -5), 0, DURATION); tick(); if (was) play(); }
  });
}
if (!/[?&]export\b/.test(location.search)) addEventListener('DOMContentLoaded', startPlayer);
