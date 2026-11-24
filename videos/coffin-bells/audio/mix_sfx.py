"""Place CC0 library sounds (Reodelbasalan/adbertiser-sfx) on the timeline, cued to the picture. Output: sfx.wav (48 kHz stereo)."""
import sys, wave, numpy as np
LIB = sys.argv[1]; SR = 48000; DUR = 57.6; N = int(DUR * SR)
out = np.zeros((N, 2))
def load(rel):
    w = wave.open(f'{LIB}/sounds/{rel}.wav'); sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
    x = np.frombuffer(w.readframes(n), dtype='<i2' if sw == 2 else '<i4').astype(float) / (32768 if sw == 2 else 2**31)
    x = x.reshape(-1, ch); x = np.repeat(x, 2, axis=1) if ch == 1 else x[:, :2]
    if sr != SR: idx = np.arange(0, len(x), sr / SR); x = np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in range(2)], 1)
    return x
def place(rel, t, db=0.0, fade_out=None, align='start', loop_to=None):
    x = load(rel)
    if loop_to: reps = int(np.ceil(loop_to * SR / len(x))); x = np.tile(x, (reps, 1))[:int(loop_to * SR)]
    if align == 'peak': t = t - np.argmax(np.abs(x).sum(1)) / SR     # line the loudest moment up with t (whoosh into a cut)
    elif align == 'end': t = t - len(x) / SR
    if fade_out: f = int(fade_out * SR); x[-f:] *= np.linspace(1, 0, f)[:, None]
    fi = int(0.01 * SR); x[:fi] *= np.linspace(0, 1, fi)[:, None]
    i = int(t * SR); a, b = max(0, i), min(N, i + len(x)); out[a:b] += x[a - i:b - i] * 10 ** (db / 20)

# ---- ambience beds
place('nature/wind_1', 0.0, -22, fade_out=0.6, loop_to=4.4); place('nature/crickets', 0.0, -26, fade_out=0.6, loop_to=4.4)
place('nature/fire_crackle', 8.8, -24, fade_out=0.5, loop_to=8.5)            # crypt candles
place('nature/wind_1', 17.3, -28, fade_out=0.5, loop_to=8.4)                 # dusk graveyard
place('nature/wind_2', 25.8, -27, fade_out=0.8, loop_to=10.0)                # night grave
place('cinematic/tension_drone_1', 28.1, -20, fade_out=1.0)
place('cinematic/tension_drone_1', 35.9, -16, loop_to=11.2, fade_out=1.2)    # creepy bed
place('cinematic/tension_drone_2', 41.0, -20, fade_out=1.5)
place('nature/wind_2', 47.27, -24, fade_out=1.0, loop_to=5.4)
# ---- 0-4 s hook
place('impact/boom_sub_1', 0.0, -8)
place('riser/riser_short_1', 4.12, -12, align='end')
place('whoosh/whoosh_reverse_1', 4.12, -10, align='end')
# ---- 4-9 s inside the coffin
place('cinematic/heartbeat', 5.25, -6); place('cinematic/heartbeat', 7.4, -8)
place('foley/knock_1', 6.55, -8); place('impact/thud_1', 6.6, -10); place('foley/knock_2', 7.6, -10)
# ---- crypt 8.8-17.3
place('whoosh/whoosh_soft_1', 8.8, -11, align='peak')
place('paper/' + 'paper_slide' if False else 'transition/slide_in', 9.0, -18)
place('stinger/mystery', 11.45, -14)
place('whoosh/whoosh_air_1', 12.25, -18, align='peak'); place('whoosh/whoosh_air_2', 13.45, -18, align='peak')
place('impact/hit_metal_2', 14.55, -18)
place('foley/keys_jingle', 15.55, -8)
# ---- doctor 17.3-25.8
place('whoosh/whoosh_big_1', 17.29, -10, align='peak')
place('riser/riser_short_2', 19.84, -13, align='end')
place('whoosh/whoosh_low_1', 19.84, -9, align='peak'); place('impact/thud_2', 19.9, -8)
place('food/pour', 23.25, -10)
place('cartoon/slide_whistle_down', 24.05, -14)
place('food/crunch_2', 24.6, -10)
# ---- bells 25.8-47.3
place('whoosh/whoosh_big_2', 25.8, -10, align='peak')
place('impact/impact_1', 26.06, -12)
place('riser/riser_noise_1', 32.6, -18, align='end')
place('horror/creak_long', 33.5, -16)
place('whoosh/whoosh_fast_2', 34.85, -12, align='peak')
place('ding/bell_small_1', 34.98, -4)
place('whoosh/whoosh_low_2', 35.74, -10, align='peak')
place('cinematic/braam_2', 35.92, -8)
place('cinematic/rumble', 38.1, -14)
place('horror/creak_long', 41.5, -12)
place('horror/ghost_whoosh', 43.0, -18)
place('ding/bell_small_2', 43.45, -5); place('ding/bell_small_1', 44.25, -7); place('ding/bell_small_2', 45.05, -9)
place('foley/footsteps', 44.0, -14)
place('cinematic/suspense_sting', 45.0, -9)
# ---- rows 47.3-52.6
place('whoosh/whoosh_big_3', 47.27, -10, align='peak')
place('riser/riser_long_1', 50.48, -12, align='end')
place('impact/boom_1', 50.48, -6)
# ---- boxing 52.6-57.5
place('whoosh/whoosh_flyby_1', 52.64, -9, align='peak')
place('crowd/crowd_ooh', 53.4, -16)
place('riser/riser_short_2', 55.0, -13, align='end')
place('sports/boxing_bell', 55.0, -3)
place('impact/impact_2', 55.0, -10)
place('crowd/cheer', 55.3, -12, fade_out=1.0)
place('impact/punch_3', 56.45, -8); place('cinematic/tail_reverb', 56.5, -12)

out = np.tanh(out * 1.2) / 1.2
w = wave.open(sys.argv[2], 'w'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out, -1, 1) * 32767).astype('<i2').tobytes()); w.close()
print('peak', np.abs(out).max())
