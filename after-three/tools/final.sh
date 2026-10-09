#!/usr/bin/env bash
# Final render: N headless workers render JPEG frames, then ffmpeg muxes with the song.
# usage: tools/final.sh <frames_dir> [fps=24] [workers=2]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:?frames dir}; FPS=${2:-24}; N=${3:-2}
mkdir -p "$OUT"
for ((i=0; i<N; i++)); do
  node tools/render.mjs --scale 1 --fps "$FPS" --from 0 --to 165 --frames "$OUT" --part "$i/$N" > "$OUT/log$i.txt" 2>&1 &
done
wait
ffmpeg -v error -y -framerate "$FPS" -i "$OUT/f%05d.jpg" -i "../After Three.m4a" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 19 -tune film -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 256k -shortest dist/after-three.mp4
ls -la dist/after-three.mp4
