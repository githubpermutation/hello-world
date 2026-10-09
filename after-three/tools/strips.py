# Filmstrips from preview frames: one row per shot (N frames across).
# python3 tools/strips.py frames_dir fps out_prefix shot_times.json [N] [rows_per_sheet]
import sys, json, os
from PIL import Image, ImageDraw
d, fps, out, shots = sys.argv[1], float(sys.argv[2]), sys.argv[3], json.load(open(sys.argv[4]))
N = int(sys.argv[5]) if len(sys.argv) > 5 else 6
R = int(sys.argv[6]) if len(sys.argv) > 6 else 6
tw, th = 320, 180
sheets = []
for si in range(0, len(shots), R):
    img = Image.new('RGB', (tw * N + 60, th * R), (20, 20, 20))
    dr = ImageDraw.Draw(img)
    for r, (i, (a, b)) in enumerate(list(enumerate(shots))[si:si + R]):
        dr.text((5, r * th + 5), str(i), fill=(255, 255, 0))
        dr.text((5, r * th + 20), f"{a:.1f}", fill=(200, 200, 200))
        for k in range(N):
            t = a + (b - a) * (k + 0.5) / N
            f = os.path.join(d, f"f{int(round(t * fps)):05d}.jpg")
            if os.path.exists(f):
                im = Image.open(f).resize((tw, th))
                img.paste(im, (60 + k * tw, r * th))
    p = f"{out}{si // R:02d}.jpg"; img.save(p, quality=85); sheets.append(p)
print('\n'.join(sheets))
