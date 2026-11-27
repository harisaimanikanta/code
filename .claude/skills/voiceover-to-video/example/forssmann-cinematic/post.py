#!/usr/bin/env python3
"""Cinematic post for the Forssmann film (voiceover-to-video v5).  python3 post.py [--preview]
Per shot: take the rendered frames (on twos), motion-interpolate to 24 fps INSIDE the shot only (never across a cut),
apply the shot's grade (memory sepia, light-transition flash, fade to black), then concatenate, upscale 540x960 -> 1080x1920
(lanczos + light sharpen + fine film grain), burn captions/supers (ASS) and mix the voice over a quiet sound bed."""
import json, os, subprocess, sys, glob, math, wave, struct, random
HERE = os.path.dirname(os.path.abspath(__file__)); FR = os.path.join(HERE, 'frames'); SEG = os.path.join(HERE, 'segs'); os.makedirs(SEG, exist_ok=True)
SB = json.load(open(os.path.join(HERE, 'storyboard.json'))); FPS = SB['fps']; D = SB['duration']
WORDS = json.load(open(os.path.join(HERE, 'align', 'words.json'))); LINES = json.load(open(os.path.join(HERE, 'align', 'lines.json')))
def F(t): return int(round(t * FPS))
def run(cmd): subprocess.run(cmd, check=True)
GRADE = {  # per-shot ffmpeg filters (applied at 540x960)
    '11A': "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=contrast=0.95:brightness=0.02,vignette=PI/4",
}
FLASH_OUT = {'11A': ('#fff1d6', 0.45)}          # light transition: the door glow fills the frame
FLASH_IN = {'11B': ('#fff1d6', 0.30), '8A': ('#ffffff', 0.12)}
FADE_IN = {'1A': ('black', 0.25)}; FADE_OUT = {'13D': ('black', 0.35)}

def segment(s):
    sid = s['id']; a, b = F(s['t0']), F(s['t1']); n = b - a; out = os.path.join(SEG, f'{a:05d}_{sid}.mp4')
    if os.path.exists(out) and '--force' not in sys.argv: return out
    have = [f for f in range(a, b) if os.path.exists(os.path.join(FR, f'{f:05d}.png'))]
    if not have: raise SystemExit(f'no frames for {sid}')
    lst = os.path.join(SEG, f'{sid}.txt')
    with open(lst, 'w') as fh:   # concat list with exact per-frame durations (works for any gaps)
        for i, f in enumerate(have):
            nxt = have[i + 1] if i + 1 < len(have) else b
            fh.write(f"file '{os.path.join(FR, f'{f:05d}.png')}'\nduration {(nxt - f) / FPS:.6f}\n")
        fh.write(f"file '{os.path.join(FR, f'{have[-1]:05d}.png')}'\n")
    vf = [f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none" if len(have) < n else f"fps={FPS}",
          "tpad=stop_mode=clone:stop=12", f"trim=end_frame={n}", "setpts=PTS-STARTPTS"]   # pad: the concat demuxer drops the tail frame, which would drift the cuts off the voice
    if sid in GRADE: vf.append(GRADE[sid])
    dur = n / FPS
    if sid in FADE_IN: c, d = FADE_IN[sid]; vf.append(f"fade=t=in:st=0:d={d}:color={c}")
    if sid in FLASH_IN: c, d = FLASH_IN[sid]; vf.append(f"fade=t=in:st=0:d={d}:color={c}")
    if sid in FLASH_OUT: c, d = FLASH_OUT[sid]; vf.append(f"fade=t=out:st={dur - d:.3f}:d={d}:color={c}")
    if sid in FADE_OUT: c, d = FADE_OUT[sid]; vf.append(f"fade=t=out:st={dur - d:.3f}:d={d}:color={c}")
    vf.append("format=yuv420p")
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', ','.join(vf), '-frames:v', str(n), '-r', str(FPS), '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', out])
    return out

# ------------------------------------------------ captions + supers (ASS)
def ts(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h}:{m:02d}:{s:05.2f}'
NUM = [('nineteen twenty nine', '1929'), ('twenty five', '25'), ('twenty seven', '27'), ('x ray', 'X-ray'), ('werner forssmann', 'Werner Forssmann'), ('nobel prize', 'Nobel Prize')]
def captions():
    ev = []
    ws = [[w[0].split('(')[0], w[1], w[2]] for w in WORDS]
    MERGE = [(('nineteen', 'twenty', 'nine'), '1929'), (('nineteen', 'fifty', 'six'), '1956'), (('x', 'ray'), 'X-ray')]   # never split a number across captions
    i = 0; out = []
    while i < len(ws):
        for seq, rep in MERGE:
            if tuple(w[0] for w in ws[i:i + len(seq)]) == seq: out.append([rep, ws[i][1], ws[i + len(seq) - 1][2]]); i += len(seq); break
        else: out.append(ws[i]); i += 1
    ws = out
    i = 0
    while i < len(ws):   # 1-3 word chunks, break at pauses > 0.25 s and at sentence ends
        grp = [ws[i]]; i += 1
        while i < len(ws) and len(grp) < 3 and ws[i][1] - grp[-1][2] < 0.25: grp.append(ws[i]); i += 1
        txt = ' '.join(g[0] for g in grp)
        for a_, b_ in NUM: txt = txt.replace(a_, b_)
        txt = txt.replace('x-ray', 'X-ray').replace('forssmann', 'Forssmann').replace('werner', 'Werner').replace('nobel', 'Nobel').replace("didn't", "didn't")
        t0, t1 = grp[0][1], max(grp[-1][2], grp[0][1] + 0.35)
        if i < len(ws): t1 = min(t1 + 0.12, ws[i][1])
        ev.append(f'Dialogue: 0,{ts(t0)},{ts(t1)},Cap,,0,0,0,,{{\\fad(40,60)}}{txt.upper()}')
    for s in SB['shots']:
        if s.get('title'):
            ev.append(f"Dialogue: 1,{ts(s['t0'] + 0.25)},{ts(min(s['t1'], s['t0'] + 2.6))},Super,,0,0,0,,{{\\fad(250,300)}}{s['title']}")
    hdr = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,DejaVu Sans,62,&H00FFFFFF,&H00FFFFFF,&H00101010,&H78000000,1,0,0,0,100,100,1,0,1,4,2,2,80,80,430,1
Style: Super,DejaVu Serif,46,&H00E8F0F4,&H00FFFFFF,&H00000000,&H64000000,0,1,0,0,100,100,2,0,1,2,1,7,70,70,170,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    open(os.path.join(HERE, 'subs.ass'), 'w', encoding='utf-8').write(hdr + '\n'.join(ev) + '\n')

# ------------------------------------------------ sound bed: low drone + heartbeats on the story beats (quiet, under the voice)
def soundbed(path):
    sr = 48000; n = int(sr * (D + 0.5)); buf = [0.0] * n; R = random.Random(1)
    beats = [2.58, 3.86, 51.26, 53.9, 81.34, 83.54, 85.33]
    for t in beats:
        for k, (dt, amp) in enumerate(((0.0, 1.0), (0.18, 0.6))):
            s0 = int((t + dt) * sr)
            for i in range(int(0.22 * sr)):
                if s0 + i >= n: break
                x = i / sr; buf[s0 + i] += amp * 0.55 * math.sin(2 * math.pi * (52 - 30 * x) * x) * math.exp(-x * 22)
    for i in range(n):   # soft drone (two detuned low sines + filtered noise), swells under S8 and S13
        t = i / sr; sw = 0.5 + 0.5 * math.tanh((t - 47.5) * 2) - 0.5 * (0.5 + 0.5 * math.tanh((t - 55.5) * 2)) + 0.6 * (0.5 + 0.5 * math.tanh((t - 76.5) * 1.5))
        buf[i] += (0.05 + 0.05 * sw) * (math.sin(2 * math.pi * 55 * t) + 0.7 * math.sin(2 * math.pi * 82.6 * t + 0.4 * math.sin(0.3 * t)))
    fade = int(0.6 * sr)
    for i in range(fade): buf[n - 1 - i] *= i / fade
    peak = max(abs(x) for x in buf) or 1
    with wave.open(path, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(b''.join(struct.pack('<h', int(32767 * 0.9 * x / peak)) for x in buf))

if __name__ == '__main__':
    segs = [segment(s) for s in sorted(SB['shots'], key=lambda s: s['t0'])]
    lst = os.path.join(SEG, 'all.txt'); open(lst, 'w').write(''.join(f"file '{p}'\n" for p in segs))
    joined = os.path.join(HERE, 'joined.mp4'); run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', joined])
    captions(); bed = os.path.join(HERE, 'bed.wav'); soundbed(bed)
    out = os.path.join(HERE, 'final.mp4')
    vf = "scale=1080:1920:flags=lanczos,unsharp=5:5:0.45:5:5:0.0,noise=c0s=3:c0f=t,ass=" + os.path.join(HERE, "subs.ass") + ",format=yuv420p"
    af = "[1:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo][sc];[2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=-17dB[bd];" \
         "[bd][sc]sidechaincompress=threshold=0.04:ratio=3:attack=30:release=500[bdd];[vo][bdd]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]"
    run(['ffmpeg', '-v', 'error', '-y', '-i', joined, '-i', os.path.join(HERE, 'voice.mp3'), '-i', bed, '-filter_complex', af + ';[0:v]' + vf + '[v]', '-map', '[v]', '-map', '[a]',
         '-c:v', 'libx264', '-crf', '21', '-preset', 'medium', '-maxrate', '14M', '-bufsize', '28M', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out])
    print('final:', out)
