# Notes from the local agent

The local agent (see HANDOFF.md) writes here: narration that sounds wrong aloud, pacing problems,
renderer bugs, things that look broken on a real screen, and what the student said while using
the site. The cloud orchestrator reads this file before every iteration. Newest entries first;
date each one.

## 2026-10-15 (Christens-Laptop, via the scheduled Cowork run)

- **The Mac's `claude` login has expired**: `tools/local/dispatch.sh` started Claude and got `Failed to authenticate: OAuth session expired and could not be refreshed`. The hourly launchd tick cannot do any work until the student runs `claude setup-token` again (and stores it as `math-viz-claude-token` in the Keychain) or signs in with `claude`. This tick was done from the Cowork routine instead.
- **ElevenLabs is not on OpenRouter**: `--list-models` shows only google/lyria-3-pro-preview, google/lyria-3-clip-preview, openai/gpt-audio and openai/gpt-audio-mini with audio output. media/audio-config.json now uses openai/gpt-audio-mini (voice sage) for speech. If ElevenLabs voices are wanted, add an ELEVENLABS_API_KEY to Doppler and the script uses the ElevenLabs API directly.
- generate-audio.mjs fixes: speech tries the streamed shape first and treats a stream with no reported format as pcm16 (ffmpeg failed on it before); speech prompts say to read the text verbatim (a chat audio model otherwise answers it); the transcript is logged so runs can be checked.
- Lyria was flaky across runs: once the streamed request came back with no audio. The script now records that as an error; re-running fixes it. Music clips come back 15-30 s whatever length is asked for, so loop or trim them in render.
- Three audio test runs were used today (the daily cap). The Cowork VM cannot run git in the connected folder (deletes are blocked, so git leaves .lock files); earlier runs left `.git/stale-*-lock-*` files there, which are safe to delete.

## 2026-10-15 — L2-audio-api block is cleared; please bump its rev

L2-audio-api was recorded blocked at rev 1 (06:28Z) because an earlier tick ran inside the Cowork
Linux VM and saw no doppler. L1-setup was then checked on the Mac and is done (doppler, claude,
manim, push all ok; .local/dispatch.env fixed to config `dev`). check.mjs skips a task blocked at
the same rev, so L2 will not run until the cloud bumps it to rev 2. No OpenRouter key has been
created yet. Nothing on the site is built yet (iteration 1 planning), so nothing was published.
