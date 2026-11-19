# Audio Workflow — voiceover analysis, transcription, sound design, subtitles

## The voiceover is the master

- `new-project.py` copies the original into `inputs/` untouched and decodes a 48 kHz PCM copy to
  `public/voiceover.wav` for the renderer. `durationFrames = ceil(exact_decoded_duration × fps)`.
- Never trim, speed-change, denoise, re-voice or replace it. Clipping or noise in the source is reported, not fixed
  (unless the user asks).

## Analysis

| Script | Output |
|---|---|
| `inspect-audio.py` | format, sample rate, channels, exact duration, EBU R128 loudness, true peak, clipped samples, silences, speech intervals, lead/tail silence |
| `analyze-duration.py` | frame count, pause classes (micro/breath/sentence/dramatic), speaking rate, recommended beats & moves, minimum orbital frames |
| `transcribe.py` | `analysis/transcript.json`: words (start/end/conf/timing source), sentences, discrepancies |
| `generate-timeline.py` | `analysis/timeline.json` (words/sentences/beats with frames), `data/subtitles.json`, shot-plan skeleton |

## Transcription backends (auto-detected, never assumed)

1. `faster-whisper` (`pip install faster-whisper`; needs model download from Hugging Face or `--model-dir`)
2. `openai-whisper` (`pip install openai-whisper`)
3. `whisper.cpp` (`whisper-cli` + ggml model via `--model-dir/--model`)
4. `vosk` (`pip install vosk` + model dir)
5. **script-estimate** (no ASR): distributes the supplied script over detected speech by syllable weight and
   aligns punctuation boundaries to real pauses with a monotonic DP. Sentence boundaries land on pauses;
   word timing inside a sentence is approximate (±0.2–0.4 s). Marked `timingQuality: estimated`.

Policy: script + ASR → script wording, ASR timing; mismatches go to `discrepancies` (substitutions, script-only,
audio-only) and must be reported to the user — never silently "fixed". ASR only → ASR text. Neither available and
no script → stop and ask for a script or an ASR install (the only blocking question).

## Sound design (`make-sound-bed.py`)

Generates `public/sound-bed.wav` (48 kHz stereo) + `analysis/sound-design.json`:
- **Score**: dark drone chord per shot mood (lighting preset), detuned pairs, slow LFOs, pulse for tension
  moods, crossfaded at shot boundaries.
- **Ambience**: `amb:lab|corridor|hall|micro|office|void` per shot.
- **Events**: `impact`, `boom`, `riser` (pre-rolled to land on the cue), `whoosh` (centred), `heartbeat`, `glass`,
  `paper`, `stamp`, `click`, `shimmer`; `{"type", "at", "gain"}` for offsets. `silence` = controlled silence.
- **Auto**: whoosh on spatial transitions, riser before lens/tunnel/liquid/scale transitions, boom on first
  triumph/punchline.
- **Ducking**: envelope follower on the voice (30 ms attack / 450 ms release) reduces music+ambience by `--duck-db`
  (9 dB) and SFX by a third of that; bed self-levels to `--under-voice-lu` (12 LU) below the voice.
- User-supplied music: mix it into the bed instead (place in `public/`, add a second `<Audio>` in
  `Soundtrack.tsx` with volume automation), keep ≥10 LU under the voice.

## Subtitles

`data/subtitles.json → cues[]: {start, end, text, words[], emphasis[], position}` (seconds). Rendered by
`subtitles/Subtitles.tsx`: condensed bold uppercase white, crimson emphasis words, soft scrim, mobile-safe
margins (portrait: 24 % from bottom), optional word highlight (`config.subtitles.wordHighlight`). Keep cues
≤ 42 chars/line, ≥ 0.8 s, never overlapping; move to `top` when the subject occupies the lower third.
