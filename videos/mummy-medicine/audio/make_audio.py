"""Synthesise meme-style SFX + a soft mystery music bed (no copyrighted samples), cued to the voiceover."""
import numpy as np, wave, json
SR = 44100; DUR = 62.2
N = int(SR * DUR); sfx = np.zeros(N); music = np.zeros(N)
rng = np.random.default_rng(7)
def add(buf, t, x, g=1.0):
    i = int(t * SR)
    if i >= N: return
    j = min(N, i + len(x)); buf[i:j] += x[:j - i] * g
def env(n, a=0.005, d=None):
    t = np.arange(n) / SR; e = np.minimum(1, t / a)
    return e * (np.exp(-t / d) if d else 1)
def boom(dur=1.6):  # "vine boom"-style: pitched-down bass thump + click + saturation
    n = int(dur * SR); t = np.arange(n) / SR
    f = 95 * np.exp(-t * 3) + 42; ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env(n, 0.003, 0.45) + 0.4 * np.sin(2 * ph) * env(n, 0.003, 0.15)
    x += rng.normal(0, 1, n) * env(n, 0.001, 0.012) * 0.6
    return np.tanh(x * 2.2) * 0.9
def scratch(dur=0.55):  # record scratch: band noise with fast pitch wobble
    n = int(dur * SR); t = np.arange(n) / SR; w = rng.normal(0, 1, n)
    car = np.sin(2 * np.pi * np.cumsum(900 + 700 * np.sin(2 * np.pi * 7 * t)) / SR)
    return np.tanh(w * car * 1.5) * env(n, 0.01, 0.25) * 0.5
def whoosh(dur=0.7):
    n = int(dur * SR); t = np.arange(n) / SR; w = rng.normal(0, 1, n)
    k = np.sin(np.pi * t / dur) ** 2; y = np.zeros(n); a = 0.0
    for i in range(n):  # sweeping one-pole lowpass
        c = 0.02 + 0.3 * k[i]; a += c * (w[i] - a); y[i] = a
    return y * k * 1.6
def buzzer(dur=0.5):  # wrong-answer buzzer
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * 110 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 116 * t)) * 0.5
    return x * env(n, 0.005) * np.minimum(1, (dur - t) / 0.05) * 0.28
def ding(f=1318.5, dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)) * env(n, 0.002, 0.35) * 0.35
def bloop(dur=0.35):  # tar drop
    n = int(dur * SR); t = np.arange(n) / SR; f = 300 + 900 * np.exp(-t * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.08) * 0.6
def riser(dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR; f = 200 + 900 * (t / dur) ** 2
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + rng.normal(0, 1, n) * 0.15) * (t / dur) ** 2
def cough(dur=0.25):
    n = int(dur * SR); w = rng.normal(0, 1, n); y = np.convolve(w, np.ones(30) / 30, 'same')
    return np.tanh(y * 6) * env(n, 0.004, 0.06) * 0.5
def sting(dur=2.5):  # dark low cluster swell
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t) for f in (55, 58.3, 82.4, 87.3)) / 4
    return x * np.minimum(1, t / 0.15) * np.exp(-t / 1.2) * 0.8
def grind(dur=3.5):  # stone mortar grinding
    n = int(dur * SR); t = np.arange(n) / SR; w = rng.normal(0, 1, n)
    y = np.convolve(w, np.ones(12) / 12, 'same') * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 0.87 * t)))
    return y * np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.3) * 0.35

PORTALS = [14.53, 23.98, 33.77, 41.02, 46.46, 51.15]
add(sfx, 0.0, boom(), 0.9)
add(sfx, 0.4, grind(), 0.8)
for c in (1.2, 1.55, 6.2, 6.5): add(sfx, c, cough(), 0.7)
add(sfx, 11.72, scratch(), 1.0)
for p in PORTALS: add(sfx, p - 0.35, whoosh(), 0.8)
add(sfx, 29.2, buzzer(), 1.0)            # "made a mistake"
add(sfx, 38.38, boom(), 0.8)             # "eating the bodies"
add(sfx, 44.7, sting(), 0.9)             # "fresh corpses"
add(sfx, 47.35, ding(), 0.8); add(sfx, 47.47, ding(1760), 0.6)   # "STILL sold" cha-ching
add(sfx, 50.85, boom(), 0.9)             # "ONE wrong word"
add(sfx, 55.95, bloop(), 1.0)            # tar drop lands
add(sfx, 57.55, riser(), 0.8)            # "And the word mummy?"
add(sfx, 58.77, boom(), 1.0)             # reveal

# music: soft A-minor mystery bed (pad + plucked arpeggio), ~ -22 dB under voice
t = np.arange(N) / SR
chords = [(220, 261.6, 329.6), (174.6, 220, 261.6), (196, 246.9, 293.7), (164.8, 207.7, 246.9)]  # Am F G E
bar = 4.0
for k in range(int(DUR / bar) + 1):
    a, b = k * bar, min(DUR, (k + 1) * bar); i, j = int(a * SR), int(b * SR)
    tt = t[i:j] - a; ch = chords[k % 4]
    pad = sum(np.sin(2 * np.pi * f / 2 * tt + np.sin(2 * np.pi * 0.2 * tt) * 0.3) for f in ch) / 3
    music[i:j] += pad * np.minimum(1, tt / 0.8) * np.minimum(1, (bar - tt) / 0.8) * 0.5
    for s in range(8):  # pluck arpeggio, 8th notes
        st = a + s * bar / 8; f = ch[s % 3] * (2 if s % 4 == 3 else 1)
        n = int(0.6 * SR); x = np.sin(2 * np.pi * f * np.arange(n) / SR) * env(n, 0.003, 0.18) * 0.35
        add(music, st, x)
music *= np.minimum(1, t / 1.5) * np.minimum(1, (DUR - t) / 1.5)
# music dips during the portal hits and drops out for the final reveal line
music *= 1 - 0.85 * np.clip((t - 58.6) / 0.3, 0, 1)
def save(name, x, peak):
    x = x / (np.abs(x).max() + 1e-9) * peak
    w = wave.open(name, 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes()); w.close()
save('sfx.wav', sfx, 0.7); save('music.wav', music, 0.5)
print('ok')
