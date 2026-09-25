#!/usr/bin/env bash
# Copies + trims the open-licensed assets used by the film into ../assets.
#   $1 = node_modules dir containing tonejs-instrument-*-mp3 and @fontsource/*
#   $2 = directory with the Kokoro voice wavs (from voiceover.py)
set -euo pipefail
NM=$1; VO=$2; A=$(cd "$(dirname "$0")/.." && pwd)/assets
mkdir -p "$A/samples" "$A/voice" "$A/fonts" "$A/vendor"
enc() { # src dst maxlen
  ffmpeg -loglevel error -y -i "$1" -t "$3" -af "afade=t=out:st=$(echo "$3-0.4" | bc):d=0.4" -ac 1 -ar 44100 -b:a 96k "$2"; }
declare -A PICK=(
  [piano]="C3 Ds3 Fs3 A3 C4 Ds4 Fs4 A4 C5 Ds5 Fs5 A5 C6"
  [xylophone]="G4 C5 G5 C6 G6 C7"
  [guitar-nylon]="E2 A2 D3 Fs3 B3 E4 Gs4 A4 E5"
  [harp]="C3 G3 D4 A4 E5 B5 F6"
  [bassoon]="G2 C3 G3 C4 E4 G4"
  [flute]="C5 E5 A5 C6 E6"
  [clarinet]="D4 F4 As4 D5 F5"
)
declare -A LEN=([piano]=3.2 [xylophone]=1.8 [guitar-nylon]=2.6 [harp]=3.5 [bassoon]=2.2 [flute]=2.4 [clarinet]=2.4)
for inst in "${!PICK[@]}"; do
  mkdir -p "$A/samples/$inst"
  for n in ${PICK[$inst]}; do enc "$NM/tonejs-instrument-$inst-mp3/$n.mp3" "$A/samples/$inst/$n.mp3" "${LEN[$inst]}"; done
done
for f in "$VO"/*.wav; do ffmpeg -loglevel error -y -i "$f" -ar 24000 -ac 1 -b:a 128k "$A/voice/$(basename "${f%.wav}").mp3"; done
cp "$VO/lines.json" "$A/voice/lines.json"
for f in caveat/files/caveat-latin-700-normal caveat/files/caveat-latin-400-normal gochi-hand/files/gochi-hand-latin-400-normal \
         permanent-marker/files/permanent-marker-latin-400-normal press-start-2p/files/press-start-2p-latin-400-normal \
         patrick-hand/files/patrick-hand-latin-400-normal fredericka-the-great/files/fredericka-the-great-latin-400-normal; do
  cp "$NM/@fontsource/$f.woff2" "$A/fonts/"; done
cp "$NM/roughjs/bundled/rough.js" "$A/vendor/rough.js"
du -sh "$A"/*
