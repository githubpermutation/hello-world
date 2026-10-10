// Player: syncs the film to the audio element, plus an offline-render hook.
import { Engine, W, H } from './engine.js';
import SONG from './data.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('film');
const engine = new Engine(canvas, params.has('scale') ? +params.get('scale') : 1);
window.__engine = engine;
const audio = document.getElementById('song');

async function boot() {
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('italic 60px "Instrument Serif"'), document.fonts.load('60px "Instrument Serif"'),
    document.fonts.load('500 20px Inter'), document.fonts.load('600 20px Inter'), document.fonts.load('300 20px Inter'),
  ]);
  if (params.has('render')) {
    window.renderFrame = (t) => { engine.render(t); return true; };
    window.warm = () => { engine.warm(); return true; };
    window.ready = true;
    return;
  }
  await setupPlayer();
}

async function setupPlayer() {
  const ui = document.getElementById('ui');
  const start = document.getElementById('start');
  const label = start.querySelector('span');
  const bar = document.getElementById('bar');
  const fill = document.getElementById('fill');
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    canvas.style.width = `${W * s}px`; canvas.style.height = `${H * s}px`;
  };
  addEventListener('resize', fit); fit();

  // Warm-up: build every set and compile every shader variant up front, so no
  // shot has to do it mid-playback (that was the source of the freezes).
  let busy = true;
  start.classList.add('busy'); label.textContent = 'Preparing 0%';
  await engine.warmAsync((p) => { label.textContent = `Preparing ${Math.round(p * 100)}%`; });
  const t0 = params.has('t') ? +params.get('t') : 0;
  engine.render(t0);
  if (params.has('t')) audio.currentTime = t0;
  busy = false; start.classList.remove('busy'); label.textContent = 'Play';

  const toggle = () => {
    if (busy) return;
    start.classList.add('gone');
    if (audio.paused) { audio.play(); } else audio.pause();
  };
  start.addEventListener('click', toggle);
  canvas.addEventListener('click', toggle);
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowRight') audio.currentTime = Math.min(SONG.duration, audio.currentTime + 5);
    if (e.code === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
    if (e.code === 'KeyF') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); }
  });
  bar.addEventListener('click', (e) => { if (busy) return; const r = bar.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * SONG.duration; start.classList.add('gone'); });
  let idle = 0;
  addEventListener('mousemove', () => { ui.classList.remove('hide'); clearTimeout(idle); idle = setTimeout(() => ui.classList.add('hide'), 2200); });

  // Clock. audio.currentTime only advances in coarse, uneven steps, which makes
  // camera moves judder even at a steady frame rate. Run our own clock off the
  // frame timestamps and ease it toward the audio time (snapping after seeks).
  let tEst = 0, wasPlaying = false, lastRaf = 0;
  const resync = () => { wasPlaying = false; };
  audio.addEventListener('seeking', resync); audio.addEventListener('play', resync); audio.addEventListener('pause', resync);

  // Adaptive resolution from the median frame time, which ignores one-off hitches.
  const dts = []; let calm = 0;
  const adapt = (dt) => {
    if (params.has('scale')) return;
    dts.push(dt); calm += dt;
    if (dts.length < 120 || calm < 4000) return;
    const med = dts.slice().sort((x, y) => x - y)[dts.length >> 1];
    dts.length = 0;
    if (med > 26 && engine.scale > 0.5) { engine.setScale(engine.scale > 0.75 ? 0.75 : 0.5); calm = 0; }
  };

  let lastDrawn = -1;
  const loop = (now = performance.now()) => {
    requestAnimationFrame(loop);
    const dt = Math.min(100, now - lastRaf); lastRaf = now;
    const a = audio.currentTime;
    let t;
    if (audio.paused) { t = tEst = a; wasPlaying = false; dts.length = 0; calm = 0; }
    else {
      tEst += dt / 1000;
      const err = a - tEst;
      if (!wasPlaying || Math.abs(err) > 0.25) { tEst = a; calm = 0; dts.length = 0; }
      else tEst += err * 0.06;
      wasPlaying = true; t = tEst;
      adapt(dt);
    }
    if (!audio.paused || t !== lastDrawn) { engine.render(t); lastDrawn = t; }
    fill.style.width = `${t / SONG.duration * 100}%`;
  };
  requestAnimationFrame(loop);
  audio.addEventListener('ended', () => { start.classList.remove('gone'); label.textContent = 'Play again'; audio.currentTime = 0; });
}
boot();
