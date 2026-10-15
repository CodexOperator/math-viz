"""Narration-timed manim scenes.

Every video is a pair of files:

    videos/scenes/<id>.py               a manim file whose scene class is called `Main`
    media/narration/videos/<id>.json    { "id", "title", "summary", "station", "music",
                                          "segments": [ { "id", "text" }, ... ] }

Inside `construct()` the scene walks through the narration one beat at a time:

    class Main(NarratedScene):
        narration_id = "two-addresses"

        def construct(self):
            with self.beat("intro") as t:          # t = seconds this beat lasts
                self.play(Create(plane), run_time=0.4 * t)
                self.play(FadeIn(dot), run_time=0.3 * t)
            # leaving the block pads with a wait until the beat's time is used up

How long a beat lasts:
  * If media/audio/videos/<id>/<segment>.mp3 exists (generated on the local box by
    `npm run media:audio`), the beat lasts as long as that clip plus a short pad, and the clip
    is mixed into the video with add_sound.
  * Otherwise the length is estimated from the word count (about 2.5 words per second), so a
    silent render has the same pacing the narrated one will have.

When the scene finishes, captions are written to media/video/<id>.vtt so the site can show
the narration as subtitles even when there is no audio.
"""

from __future__ import annotations

import json
import pathlib
import subprocess
from contextlib import contextmanager

from manim import Scene

ROOT = pathlib.Path(__file__).resolve().parents[2]
NARRATION_DIR = ROOT / "media" / "narration" / "videos"
AUDIO_DIR = ROOT / "media" / "audio" / "videos"
OUT_DIR = ROOT / "media" / "video"

WORDS_PER_SECOND = 2.5
PAD_SECONDS = 0.35
MIN_BEAT_SECONDS = 1.5


def clip_duration(path: pathlib.Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(result.stdout.strip())


def _vtt_time(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


class NarratedScene(Scene):
    """A Scene whose pacing follows a narration script."""

    narration_id: str | None = None

    def setup(self):
        if not self.narration_id:
            raise ValueError("Set narration_id on the scene class")
        path = NARRATION_DIR / f"{self.narration_id}.json"
        self.narration = json.loads(path.read_text())
        self.segments = {seg["id"]: seg for seg in self.narration["segments"]}
        self._cues: list[dict] = []
        self._used: set[str] = set()

    def beat_length(self, segment_id: str) -> tuple[float, pathlib.Path | None]:
        segment = self.segments[segment_id]
        audio = AUDIO_DIR / self.narration_id / f"{segment_id}.mp3"
        if audio.exists():
            return clip_duration(audio) + PAD_SECONDS, audio
        words = len(segment["text"].split())
        return max(MIN_BEAT_SECONDS, words / WORDS_PER_SECOND) + PAD_SECONDS, None

    @contextmanager
    def beat(self, segment_id: str):
        if segment_id not in self.segments:
            raise KeyError(f"{self.narration_id}: no narration segment called {segment_id!r}")
        length, audio = self.beat_length(segment_id)
        start = self.renderer.time
        if audio is not None:
            self.add_sound(str(audio))
        yield length
        elapsed = self.renderer.time - start
        if elapsed < length - 1e-3:
            self.wait(length - elapsed)
        self._used.add(segment_id)
        self._cues.append({"start": start, "end": self.renderer.time, "text": self.segments[segment_id]["text"]})

    def tear_down(self):
        unused = [sid for sid in self.segments if sid not in self._used]
        if unused:
            print(f"[narrated] {self.narration_id}: segments never used: {', '.join(unused)}")
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        lines = ["WEBVTT", ""]
        for i, cue in enumerate(self._cues, 1):
            lines += [str(i), f"{_vtt_time(cue['start'])} --> {_vtt_time(cue['end'])}", cue["text"], ""]
        (OUT_DIR / f"{self.narration_id}.vtt").write_text("\n".join(lines))
