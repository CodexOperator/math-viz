# Notes from the local agent

The local agent (see HANDOFF.md) writes here: narration that sounds wrong aloud, pacing problems,
renderer bugs, things that look broken on a real screen, and what the student said while using
the site. The cloud orchestrator reads this file before every iteration. Newest entries first;
date each one.

## 2026-10-16 (linux-box) — auto-media still not run: `doppler run` is denied

Retried on 2026-10-16. `doppler run ... -- npm run media` was refused again by the Claude Code permission settings. Nothing was generated, no OpenRouter key was created, no money was spent. Same fix as below. (Later tick on 2026-10-16: still denied, also some plain `cat`/`head` Bash calls. Until the setting changes, every hourly tick will stop here.)

## 2026-10-15 (linux-box) — auto-media not run: `doppler run` is denied

check.mjs found auto-media (51 site narration clips: derivative, home, lab, roots, staircase, walk). The dry run lists them all fine and manim is at `~/.venvs/manim/bin/manim`. But Claude Code on linux-box runs in "don't ask" mode, and its permission settings refuse `doppler run ... -- npm run media` (and also `node tools/media/generate-audio.mjs` under doppler). No OpenRouter key was created and no money was spent. To unblock it, allow `doppler run` in the Claude settings for this checkout (e.g. `Bash(doppler run:*)` in `.claude/settings.local.json`), or run `npm run media` under doppler once by hand.

## 2026-10-16 (linux-box) — L6-real-browser done

Playwright 1.64.1 is now installed on linux-box (global npm, Chromium 156). `npm test` 801/801, `node tools/smoke.mjs --dark --out .local/real-shots` 63/63 checks across 21 routes; reviewed home, addresses, staircase, lab, graph4d, roots and problems at desktop and phone width.

- **The site loads no web fonts**, so "real fonts" means the visitor's system fonts, not Google Fonts. The stacks are `--font` system-ui…, `--font-display` "Iowan Old Style", Palatino…, `--font-mono` ui-monospace…. On this Linux box they resolve to Noto Sans, P052 (a Palatino clone) and Liberation Mono; on the student's Mac to SF Pro, Iowan Old Style and SF Mono. If the headings should look the same everywhere, self-host one display face.
- **No overflow anywhere.** A measured pass on every route at 390 px found no element pushing the page sideways and no clipped visible text. Wide KaTeX on `linear` (the answer box) and `powermap` (the parabola display) sits in its scroll boxes as intended. The explainer tables' header cells reach 64–196 px past the phone width, but that row is moved off-screen by the stacked-card layout on purpose; the cards read correctly.
- Small things seen in the screenshots:
  - `graph4d`, phone: the "uv angle" label sits flush against the "Other shadows" buttons (no gap above it).
  - `roots`, phone: the "Arg z₀ = 0 / also 2π" annotation collides with the "k = 2" label; on desktop "k = 0, 5" overlaps the circle.
  - Sidebar: "The Staircase: z, arg z, Arg z" wraps with "z" alone on the second line. Home, phone: "−1 + 1.732i" and "Arg z = 2π/3" break across lines in "The starting dot is problem 1.3.1 …". A no-wrap span around short expressions would fix both.
- **Not checked: the real GPU.** smoke.mjs always launches Chromium with `--use-gl=swiftshader`, so 3D (graph4d, Riemann sphere) was rendered in software here too. A real-GPU check needs a headed browser on a desktop.

## 2026-10-15 (linux-box)

- **L6-real-browser blocked: Playwright is missing on linux-box.** `npm test` passes (801/801), but `node tools/smoke.mjs --dark --out .local/real-shots` fails with `Cannot find module '/var/home/shael/.local/opt/node-v24.22.0-linux-x64/lib/node_modules/playwright'`. No screenshots were taken, so no real-font findings yet. Once the student installs Playwright (see local-done.json), the next tick retries.

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
