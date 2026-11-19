// Audio: the ORIGINAL voiceover is the master timeline and is never altered or replaced.
// The sound bed (music + ambience + SFX, already ducked under the voice by make-sound-bed.py) sits underneath.
import React from 'react';
import { Audio, staticFile } from 'remotion';

export function Soundtrack({ audio }: { audio: { voiceover: string | null; soundBed: string | null; voiceVolume: number; bedVolume: number } }) {
  return (
    <>
      {audio.voiceover && <Audio src={staticFile(audio.voiceover)} volume={audio.voiceVolume} />}
      {audio.soundBed && <Audio src={staticFile(audio.soundBed)} volume={audio.bedVolume} />}
    </>
  );
}
