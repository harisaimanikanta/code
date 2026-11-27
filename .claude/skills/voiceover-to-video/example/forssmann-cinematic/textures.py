#!/usr/bin/env python3
"""2D textures for the Forssmann film (PIL). Run after the Blender prepass (tex/xray_raw.png, tex/heart_illus.png).
Everything printed on a prop is either historically accurate (journal title: Forssmann, 'Die Sondierung des rechten Herzens',
Klinische Wochenschrift 8, 1929) or deliberately unreadable (grey text blocks), so nothing invented can be read as fact."""
import os, random, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageChops
HERE = os.path.dirname(os.path.abspath(__file__)); T = os.path.join(HERE, 'tex'); R = random.Random(3)
SERIF = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'; SERIF_R = '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'
SERIF_I = '/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf'
def font(p, s): return ImageFont.truetype(p, s)
def paper(w, h, base=(232, 222, 196), age=0.35):
    im = Image.new('RGB', (w, h), base); px = im.load()
    noise = Image.effect_noise((w // 4, h // 4), 40).resize((w, h), Image.BICUBIC).convert('L')
    stain = Image.effect_noise((w // 40, h // 40), 90).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(30)).convert('L')
    tint = Image.new('RGB', (w, h), (180, 150, 100))
    im = Image.composite(tint, im, ImageOps.autocontrast(stain).point(lambda v: int(v * age * 0.5)))
    im = ImageChops.multiply(im, Image.merge('RGB', [noise.point(lambda v: 215 + v // 6)] * 3))
    vig = Image.new('L', (w, h), 0); d = ImageDraw.Draw(vig); d.rectangle([w * 0.04, h * 0.04, w * 0.96, h * 0.96], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(min(w, h) * 0.06)); dark = Image.new('RGB', (w, h), (120, 95, 60))
    return Image.composite(im, dark, vig.point(lambda v: 110 + int(v * 0.57)))
def text_block(d, x, y, w, lines, lh=14, col=(70, 60, 50), seed=0):
    r = random.Random(seed)
    for i in range(lines):
        ww = w if i % 7 != 6 else int(w * r.uniform(0.3, 0.7)); xx = x
        while xx < x + ww - 10:
            wl = r.randint(14, 60); d.rectangle([xx, y + i * lh, min(x + ww, xx + wl), y + i * lh + lh * 0.42], fill=col); xx += wl + r.randint(5, 9)

# ---------------------------------------------------------------- X-ray film (radiograph look)
raw = Image.open(os.path.join(T, 'xray_raw.png')).convert('L'); W, H = raw.size
soft = raw.filter(ImageFilter.GaussianBlur(2.2))
# lung fields: darker ellipses either side of the mediastinum; mediastinum slightly denser
lung = Image.new('L', (W, H), 0); d = ImageDraw.Draw(lung)
for cx in (0.31, 0.62):
    d.ellipse([W * (cx - 0.15), H * 0.2, W * (cx + 0.15), H * 0.72], fill=255)
lung = lung.filter(ImageFilter.GaussianBlur(45))
img = ImageChops.subtract(soft, lung.point(lambda v: int(v * 0.22)))
med = Image.new('L', (W, H), 0); ImageDraw.Draw(med).ellipse([W * 0.36, H * 0.15, W * 0.56, H * 0.85], fill=255); med = med.filter(ImageFilter.GaussianBlur(50))
img = ImageChops.add(img, med.point(lambda v: int(v * 0.12)))
img = ImageOps.autocontrast(img, cutoff=0.5).point(lambda v: int(18 + 0.86 * (v / 255) ** 1.15 * 255))
grain = Image.effect_noise((W, H), 28).convert('L'); img = Image.blend(img, ImageChops.overlay(img, grain), 0.35)
film = Image.merge('RGB', [img.point(lambda v: int(v * 0.86)), img.point(lambda v: int(v * 0.93)), img])
edge = Image.new('L', (W, H), 0); ImageDraw.Draw(edge).rounded_rectangle([W * 0.025, H * 0.02, W * 0.975, H * 0.98], 24, fill=255); edge = edge.filter(ImageFilter.GaussianBlur(10))
film = Image.composite(film, Image.new('RGB', (W, H), (8, 10, 14)), edge)
dd = ImageDraw.Draw(film); dd.text((W * 0.06, H * 0.045), 'L', font=font(SERIF, 42), fill=(225, 232, 240))
film.save(os.path.join(T, 'xray_film.png'))
mon = ImageOps.invert(img).point(lambda v: int(30 + v * 0.75)); mon = Image.merge('RGB', [mon] * 3); m2 = Image.new('RGB', (W, int(W * 0.6)), (0, 0, 0))
m2.paste(mon.crop((0, int(H * 0.18), W, int(H * 0.18) + int(W * 0.6))), (0, 0)); m2.save(os.path.join(T, 'xray_monitor.png'))

# ---------------------------------------------------------------- anatomical wall chart (Latin labels, 1920s teaching chart)
cw, ch = 950, 1200; chart = paper(cw, ch, (226, 214, 184), 0.5); d = ImageDraw.Draw(chart)
hi = Image.open(os.path.join(T, 'heart_illus.png')).convert('RGB'); hi = hi.resize((720, 800))
mask = ImageOps.invert(ImageChops.difference(hi, Image.new('RGB', hi.size, hi.getpixel((5, 5)))).convert('L').point(lambda v: 255 if v > 18 else 0)); mask = ImageOps.invert(mask).filter(ImageFilter.GaussianBlur(1))
hi = Image.blend(hi, ImageOps.posterize(hi, 4), 0.35); chart.paste(hi, (115, 230), mask)
d.text((cw / 2, 95), 'COR HUMANUM', font=font(SERIF, 64), fill=(60, 30, 25), anchor='mm'); d.line([150, 145, 800, 145], fill=(90, 60, 40), width=3)
d.text((cw / 2, 180), 'Tab. XII', font=font(SERIF_I, 32), fill=(70, 50, 40), anchor='mm')
for (x, y, tx, ty, lab) in [(300, 470, 60, 420, 'Atrium dextrum'), (560, 330, 700, 260, 'Aorta'), (430, 300, 120, 300, 'Vena cava sup.'), (520, 640, 690, 700, 'Ventriculus sinister'), (380, 720, 70, 820, 'Ventriculus dexter'), (600, 420, 740, 470, 'A. pulmonalis')]:
    d.line([x, y, tx + (150 if tx < 300 else -10), ty + 12], fill=(50, 35, 30), width=2); d.text((tx, ty), lab, font=font(SERIF_I, 28), fill=(45, 30, 25))
d.rectangle([20, 20, cw - 20, ch - 20], outline=(90, 60, 40), width=4); chart.save(os.path.join(T, 'chart.png'))

# ---------------------------------------------------------------- the journal page (real article title; body text unreadable)
jw, jh = 1200, 860; j = paper(jw, jh, (238, 232, 214), 0.2); d = ImageDraw.Draw(j)
for half in (0, 1):
    x0 = 40 + half * 600
    d.text((x0 + 280, 60), 'KLINISCHE WOCHENSCHRIFT', font=font(SERIF, 27), fill=(25, 22, 20), anchor='mm'); d.line([x0 + 10, 88, x0 + 550, 88], fill=(30, 25, 20), width=2)
    d.text((x0 + 280, 106), '8. JAHRGANG  ·  1929', font=font(SERIF_R, 20), fill=(40, 35, 30), anchor='mm')
    if half == 0:
        d.text((x0 + 280, 160), 'DIE SONDIERUNG DES RECHTEN HERZENS', font=font(SERIF, 23), fill=(20, 18, 16), anchor='mm')
        d.text((x0 + 280, 195), 'Von WERNER FORSSMANN', font=font(SERIF_I, 22), fill=(30, 26, 22), anchor='mm')
        text_block(d, x0 + 15, 235, 255, 38, 15, seed=1); text_block(d, x0 + 290, 235, 255, 38, 15, seed=2)
    else:
        xr = Image.open(os.path.join(T, 'xray_film.png')).convert('L'); xr = ImageOps.autocontrast(xr).resize((360, 432)); xr = ImageOps.grayscale(Image.merge('RGB', [xr] * 3))
        j.paste(Image.merge('RGB', [xr.point(lambda v: int(v * 0.82 + 20))] * 3), (x0 + 100, 150)); d.text((x0 + 280, 600), 'Abb. 1', font=font(SERIF_I, 22), fill=(30, 26, 22), anchor='mm')
        text_block(d, x0 + 15, 640, 530, 12, 15, seed=3)
d.line([jw / 2, 40, jw / 2, jh - 40], fill=(150, 140, 120), width=2); j.save(os.path.join(T, 'journal.png'))

# ---------------------------------------------------------------- his sketch (arm -> tube -> heart), pencil on paper
sk = paper(600, 760, (240, 236, 222), 0.15); d = ImageDraw.Draw(sk); pc = (60, 60, 66)
d.line([(80, 120), (140, 300), (230, 470), (330, 600)], fill=pc, width=4); d.line([(130, 90), (200, 280), (290, 450), (390, 560)], fill=pc, width=4)
d.ellipse([360, 160, 520, 320], outline=pc, width=4); d.arc([380, 120, 470, 220], 180, 360, fill=pc, width=3)
for i in range(0, 60, 2):
    t = i / 60; x = 300 + (440 - 300) * t ** 0.7; y = 520 - (520 - 240) * t; d.point((x, y), fill=(140, 60, 30))
d.line([(300, 520), (340, 420), (400, 330), (440, 250)], fill=(150, 70, 30), width=3); d.text((300, 690), 'v. basilica  →  cor', font=font(SERIF_I, 28), fill=pc)
sk.save(os.path.join(T, 'sketch.png'))

# ---------------------------------------------------------------- diploma, portrait, small-town view
dp = paper(800, 600, (236, 228, 204), 0.3); d = ImageDraw.Draw(dp); d.rectangle([25, 25, 775, 575], outline=(120, 90, 50), width=6); d.rectangle([45, 45, 755, 555], outline=(150, 120, 70), width=2)
d.text((400, 120), 'DIPLOMA', font=font(SERIF, 64), fill=(60, 40, 30), anchor='mm'); text_block(d, 140, 210, 520, 12, 22, (90, 75, 60), 5)
d.ellipse([560, 430, 680, 550], outline=(150, 40, 30), width=6); dp.save(os.path.join(T, 'diploma.png'))
pt = Image.new('RGB', (700, 900), (28, 22, 16)); d = ImageDraw.Draw(pt); d.ellipse([230, 170, 470, 470], fill=(150, 110, 80)); d.rectangle([160, 480, 540, 900], fill=(20, 18, 16)); d.ellipse([230, 140, 470, 300], fill=(60, 50, 40))
pt = pt.filter(ImageFilter.GaussianBlur(14)); pt = Image.blend(pt, Image.effect_noise((700, 900), 40).convert('RGB'), 0.06); pt.save(os.path.join(T, 'portrait.png'))
tw, th = 1600, 800; tn = Image.new('RGB', (tw, th), (150, 160, 172)); d = ImageDraw.Draw(tn)
for i in range(16):
    x = i * 110 + R.randint(-20, 20); h = R.randint(200, 360); d.rectangle([x, th - h, x + 100, th], fill=(70 + R.randint(-8, 8), 72, 78)); d.polygon([(x - 10, th - h), (x + 50, th - h - 90), (x + 110, th - h)], fill=(64, 60, 62))
    for k in range(3): d.rectangle([x + 20 + k * 25, th - h + 60, x + 32 + k * 25, th - h + 90], fill=(210, 190, 140) if R.random() < 0.35 else (90, 95, 100))
tn = tn.filter(ImageFilter.GaussianBlur(6)); tn.save(os.path.join(T, 'town.png'))
print('textures ok')
