import sys, os, glob
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
fs = sorted(glob.glob(os.path.join(d, '*.png'))); ims = [Image.open(f).convert('RGB') for f in fs]
w, h = 300, int(300 * ims[0].height / ims[0].width); rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * w, rows * (h + 22)), (20, 20, 20)); D = ImageDraw.Draw(S); fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = (i % cols) * w, (i // cols) * (h + 22); S.paste(im.resize((w, h)), (x, y + 22)); D.text((x + 5, y + 3), os.path.basename(f)[:-4], fill=(230, 230, 230), font=fnt)
S.save(out); print(out, S.size)
