"""Generate the narration with Kokoro (82M, open-weight neural TTS).
Usage: python3 voiceover.py <model_dir> <out_dir> [voice]"""
import sys, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

LINES = [
    ("dresden",  "Once upon a time, in Dresden, by the river Elbe...", 0.92),
    ("c64",      "a curious kid met a beige box, called the Commodore sixty-four.", 0.95),
    ("hooked1",  "It blinked.", 0.9),
    ("hooked2",  "It beeped!", 0.9),
    ("hooked3",  "And he was hooked.", 0.9),
    ("hooked4",  "Forever.", 0.85),
    ("boots",    "After his military service, Lars swapped his boots for bytes...", 0.95),
    ("certified","and trained as an IT specialist, for system integration.", 0.95),
    ("puppet",   "Today, he pulls the strings of complex server platforms, with Puppet.", 0.95),
    ("pipes",    "He builds pipelines with Ansible, Foreman and Jenkins, so every deployment flows smoothly downstream.", 0.97),
    ("python",   "And when the right tool doesn't exist yet? He simply writes it, in Python.", 0.95),
    ("cur1",     "Networks.", 0.95),
    ("cur2",     "Web design.", 0.95),
    ("cur3",     "Graphics.", 0.95),
    ("cur4",     "Video.", 0.95),
    ("cur5",     "Audio.", 0.95),
    ("cur6",     "If it plugs in... he's curious.", 0.93),
    ("outro",    "Lars Krahl. Hooked since the C sixty-four.", 0.9),
]

model_dir, out_dir = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else "af_heart"
k = Kokoro(f"{model_dir}/kokoro-v1.0.onnx", f"{model_dir}/voices-v1.0.bin")
meta = []
for key, text, speed in LINES:
    audio, sr = k.create(text, voice=voice, speed=speed, lang="en-us")
    # trim silence at both ends (keep a tiny tail)
    a = np.abs(audio); thr = 0.01 * a.max()
    idx = np.where(a > thr)[0]
    audio = audio[max(0, idx[0] - int(0.02 * sr)): min(len(audio), idx[-1] + int(0.08 * sr))]
    sf.write(f"{out_dir}/{key}.wav", audio, sr)
    meta.append({"key": key, "text": text, "dur": round(len(audio) / sr, 3)})
    print(key, meta[-1]["dur"])
json.dump(meta, open(f"{out_dir}/lines.json", "w"), indent=1)
print("total", sum(m["dur"] for m in meta))
