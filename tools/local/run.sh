#!/bin/bash
# Doppler-backed commands for the local agent, so its allowlist can stay tiny.
#
#   bash tools/local/run.sh media [args]          doppler run -- npm run media (audio, then re-render)
#   bash tools/local/run.sh audio [args]          doppler run -- node tools/media/generate-audio.mjs [args]
#   bash tools/local/run.sh secret-names          list the names (never the values) of the Doppler secrets
#
# Reads DOPPLER_PROJECT and DOPPLER_CONFIG from .local/dispatch.env (written by tools/local/setup.sh).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO"
if [ -f .local/dispatch.env ]; then set -a; . .local/dispatch.env; set +a; fi
: "${DOPPLER_PROJECT:=agi}"
if [ -z "${DOPPLER_CONFIG:-}" ]; then
  echo "DOPPLER_CONFIG is not set. Run: bash tools/local/setup.sh --doppler-config <config>" >&2
  exit 2
fi
cmd="${1:-}"; shift || true
case "$cmd" in
  media)        exec doppler run --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" -- sh -c 'node tools/media/generate-audio.mjs "$@"; node tools/videos/render.mjs' sh "$@" ;;
  audio)        exec doppler run --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" -- node tools/media/generate-audio.mjs "$@" ;;
  secret-names) exec doppler secrets --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" --only-names ;;
  *) echo "usage: bash tools/local/run.sh media|audio|secret-names [args]" >&2; exit 2 ;;
esac
