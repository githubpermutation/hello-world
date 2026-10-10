# After Three — music video

A music video for the Suno song **After Three**, made entirely in JavaScript:
the sets, props, lighting, camera work, typography and grade are all generated
in code (three.js + custom shaders + Canvas 2D). There are no image or model
files; every texture (wood floor, marble, plaster, tiles, fabric, leather, city
at night) is painted procedurally at load time.

- **Watch it live:** open [`dist/index.html`](dist/index.html) in a browser
  (double-clicking it works). The film runs in real time, synced to the song,
  which the page loads from `After Three.m4a` at the repo root, so keep the
  file where it is in the checkout. Click or press space to play, ←/→ to seek,
  F for fullscreen. The player lowers its internal resolution automatically on
  slow GPUs; add `?scale=0.5` to force it.
- **Rebuild it:** `cd after-three && npm install && node tools/build.mjs`.
  `node tools/build.mjs --embed` inlines the audio too, giving a ~10 MB file
  that works anywhere (not committed, to keep the repo small).
- **Concept and shot list:** [`TREATMENT.md`](TREATMENT.md).

## The idea

A love story told only by the things in the room. One apartment, 03:07 AM to
noon, and no faces: the keys, a glass rinsed "once again", a zipper, a shirt
button, a belt buckle, hair twisted into a knot, the couch that moved three
feet, a second key added to the ring. Objects move as if handled by people we
never see. The count ("one, two, three") is the typographic motif: big serif
numerals in the choruses, a count that runs past four when it is lost, and a
count done "too slow" in the bridge.

| Section | Light | Content |
|---|---|---|
| Verse 1 | tungsten pendant + moonlight through blinds | aftermath, the door, zipper, the glass under the tap, the window, the clock, keys on the hook, the walk down the hall |
| Chorus 1 | a red neon sign across the street, pulsing with the kick | keys lifted, keys hitting the floor in slow motion, keys left by the door |
| Verse 2 | close, warm | the zipper all the way down, two glasses touching, a button popping, "here?", a belt buckle, the lamp from below, the counter warming, hair twisting |
| Chorus 2 | strobing red | a frame knocked crooked, the world rolling from wall to floor, a dolly zoom, the clock and the count running away, the couch shoved, a glass cracking |
| Bridge | moonlight only | striped light, a thread of light tracing a wrist, the far door, "1 … 2", the whispered lines written in the window's condensation as dawn comes |
| Verse 3 | noon | a button in a shoe, the glass cracked in two, the couch drawn as a floor plan ("3 FT"), a hum drawn in shower steam, 12:00, the empty hook |
| Final chorus / outro | golden | keys found under the couch, a new brass key threaded onto the ring, hung back on the hook, daylight montage, the door |

## Sync

The lyrics are timed per word. `analysis/` contains the pipeline: the vocal was
separated from the mix (UVR MDX-Net, via sherpa-onnx), transcribed with
NVIDIA Parakeet-TDT (word timestamps), and aligned to the written lyrics with a
Needleman–Wunsch alignment; the result, plus the beat grid (104.9 BPM) and
per-band energy envelopes used for light pulses, is in `src/data.js`.

## How it's made

| Part | Where |
|---|---|
| Engine: `render(t)` is a pure function of time, so playback and offline rendering match frame for frame | `src/engine.js` |
| Post: HDR → depth of field (CoC prefilter + golden-angle gather) → bloom (mip chain) with halation → ACES tone map → lift/gamma/gain grade → chromatic aberration, vignette, grain, 2.2:1 letterbox | `src/post.js` |
| Lyrics: word-by-word reveal on the sung timing, chorus numerals, captions | `src/text.js`, `src/lyrics.js` |
| The edit: ~60 shots with camera moves, prop animation, lights, grade | `src/shots.js`, helpers in `src/shotkit.js` |
| Sets: the apartment (day/night rigs), a macro "studio" stage, a shower-glass shader, a void for type | `src/sets/` |
| Props: keyring, glasses (incl. the cracked one), pump, button, belt, zipper, GPU hair, furniture, window with blinds | `src/props/` |

## Playback performance notes

- **Warm-up.** Each shot has its own light/shadow combination, and every
  combination is a separate shader program. `Engine.warmAsync` renders each
  shot at four points before Play so none of that happens mid-song.
- **Clock.** `audio.currentTime` advances in coarse steps, so the player runs its
  own clock from the frame timestamps and eases it toward the audio time.
- **Text layer.** Line layouts are cached, large glowing numerals are baked once
  into sprites, and the 1080p canvas is only repainted/re-uploaded when what is
  visible changes. 2D canvases are GPU-backed in the browser; only the offline
  renderer (`?render=1`) switches them to CPU-backed for fast readback.
- `?render=1` also keeps the WebGL drawing buffer for screenshots, which a real
  player doesn't need.

## Rendering a video file

No video is committed. To render one (headless Chromium + ffmpeg; about
2 s per 1080p frame in software WebGL, so roughly 1–2 hours for the whole
song, much faster on a machine with a GPU):

```bash
cd after-three && npm install
node tools/patch-three.mjs                 # src/vendor/three.module.js
npx http-server -p 8123 .. &               # the renderer loads the dev page from here
tools/final.sh /tmp/after-three-frames 24 2   # frames dir, fps, parallel workers
# -> dist/after-three.mp4 (H.264 + AAC, song muxed in)
```

`tools/render.mjs` is the underlying renderer (`--scale 0.5 --fps 12` makes a
quick half-resolution preview; `--from/--to` render a time range).

## Development

Serve the repo root (`npx http-server -p 8123 .`) and open
`/after-three/src/index.html`; `?t=60` starts at 1:00. `tools/sheet.mjs` renders
a contact sheet (one frame per shot), `tools/frame.mjs` renders single frames,
and `tools/strips.py` turns a preview render into per-shot filmstrips; these
were used for look development and timing review.
