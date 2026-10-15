#!/bin/bash
# One hourly tick, run by launchd (macOS) or cron (Linux); installed by tools/local/setup.sh.
# The git check is free. Claude only starts when tools/local/check.mjs finds work.
#
#   bash tools/local/dispatch.sh            normal tick
#   bash tools/local/dispatch.sh --force    start Claude even when the check finds nothing
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO" || exit 1
mkdir -p .local
LOG=".local/dispatch.log"
exec >>"$LOG" 2>&1
echo
echo "=== $(date '+%Y-%m-%d %H:%M:%S') tick ==="

# launchd and cron start with a bare PATH.
export PATH="$HOME/.local/bin:$HOME/.claude/local:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
[ -f .local/dispatch.env ] && { set -a; . .local/dispatch.env; set +a; }
[ -n "${PATH_EXTRA:-}" ] && export PATH="$PATH_EXTRA:$PATH"

# One tick at a time. A lock older than 3 hours is treated as stale.
LOCK=".local/dispatch.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +180 2>/dev/null)" ]; then rm -rf "$LOCK"; mkdir "$LOCK"; else echo "previous tick still running"; exit 0; fi
fi
trap 'rm -rf "$LOCK"' EXIT

node tools/local/check.mjs
rc=$?
if [ $rc -eq 10 ] && [ "${1:-}" != "--force" ]; then echo "idle"; exit 0; fi
if [ $rc -ne 0 ] && [ $rc -ne 10 ]; then echo "check failed with exit code $rc"; exit $rc; fi

# Subscription auth: a long-lived token from `claude setup-token`, kept in the macOS Keychain
# (or ~/.config/math-viz/claude-token on Linux). Never bill an API key by accident.
unset ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN
if [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
  if command -v security >/dev/null 2>&1; then
    CLAUDE_CODE_OAUTH_TOKEN="$(security find-generic-password -s math-viz-claude-token -w 2>/dev/null || true)"
  elif [ -f "$HOME/.config/math-viz/claude-token" ]; then
    CLAUDE_CODE_OAUTH_TOKEN="$(cat "$HOME/.config/math-viz/claude-token")"
  fi
  [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ] && export CLAUDE_CODE_OAUTH_TOKEN
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
ALLOWED=(
  "Read" "Edit" "Write" "Glob" "Grep" "WebFetch" "WebSearch"
  "Bash(node tools/*)" "Bash(npm test)" "Bash(npm run *)"
  "Bash(bash tools/local/run.sh *)"
  "Bash(git status *)" "Bash(git diff *)" "Bash(git log *)" "Bash(git show *)"
  "Bash(git add *)" "Bash(git commit *)" "Bash(git fetch *)"
  "Bash(git pull --rebase origin $BRANCH)" "Bash(git rebase --continue)" "Bash(git rebase --abort)"
  "Bash(git push origin $BRANCH)" "Bash(git push --dry-run origin *)"
  "Bash(ffprobe *)" "Bash(ffmpeg *)" "Bash(ls *)" "Bash(du *)" "Bash(mkdir *)"
  "Bash(gh auth status)" "Bash(gh api repos/CodexOperator/math-viz/pages*)" "Bash(gh api -X POST repos/CodexOperator/math-viz/pages *)"
  "Bash(curl -sI https://codexoperator.github.io/*)"
)
echo "starting claude (work found)"
claude -p "/local-dispatch" --permission-mode dontAsk --allowedTools "${ALLOWED[@]}" --output-format text
status=$?
echo "claude exited with $status"
# The agent releases the lease when it finishes; release it here too in case the run died.
node tools/local/lease.mjs release

# Desktop notification with the last line of the run, if the platform supports it.
summary="$(tail -n 3 "$LOG" | head -n 1 | cut -c1-180 | tr '"' "'")"
if command -v osascript >/dev/null 2>&1; then
  osascript -e "display notification \"$summary\" with title \"math-viz local agent\"" >/dev/null 2>&1 || true
elif command -v notify-send >/dev/null 2>&1; then
  notify-send "math-viz local agent" "$summary" || true
fi
exit $status
