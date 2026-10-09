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
  setupPlayer();
}

function setupPlayer() {
  const ui = document.getElementById('ui');
  const start = document.getElementById('start');
  const bar = document.getElementById('bar');
  const fill = document.getElementById('fill');
  let playing = false;
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    canvas.style.width = `${W * s}px`; canvas.style.height = `${H * s}px`;
  };
  addEventListener('resize', fit); fit();
  engine.render(params.has('t') ? +params.get('t') : 0.0);
  const toggle = () => {
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
  bar.addEventListener('click', (e) => { const r = bar.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * SONG.duration; start.classList.add('gone'); });
  if (params.has('t')) audio.currentTime = +params.get('t');
  let idle = 0;
  addEventListener('mousemove', () => { ui.classList.remove('hide'); clearTimeout(idle); idle = setTimeout(() => ui.classList.add('hide'), 2200); });
  // adaptive resolution: if frames take too long while playing, render smaller
  let frames = 0, acc = 0, lastNow = performance.now();
  const loop = () => {
    requestAnimationFrame(loop);
    const now = performance.now(); const dt = now - lastNow; lastNow = now;
    const t = audio.currentTime;
    if (!audio.paused || t !== loop.last) { engine.render(t); loop.last = t; }
    fill.style.width = `${t / SONG.duration * 100}%`;
    if (!audio.paused && !params.has('scale')) {
      frames++; acc += dt;
      if (frames === 45) {
        const avg = acc / frames; frames = 0; acc = 0;
        if (avg > 40 && engine.scale > 0.5) engine.setScale(engine.scale > 0.75 ? 0.75 : 0.5);
      }
    }
  };
  loop();
  audio.addEventListener('ended', () => { start.classList.remove('gone'); start.querySelector('span').textContent = 'Play again'; audio.currentTime = 0; });
}
boot();
