#!/bin/bash
# One-time setup of the hourly local agent (macOS launchd or Linux cron).
#
#   bash tools/local/setup.sh --desktop                    prepare for a Claude desktop-app routine (no launchd/cron, no token)
#   bash tools/local/setup.sh --doppler-config dev         install the launchd/cron schedule (asks before installing anything)
#   bash tools/local/setup.sh --interval 1800              change how often it runs (seconds; default 3600)
#   bash tools/local/setup.sh --run-now                    also run one tick right away
#   bash tools/local/setup.sh --uninstall                  remove the schedule
#
# What it does:
#   1. checks the toolchain (node, git, ffmpeg, doppler, claude, manim) and offers to install what is missing
#   2. saves the Doppler project/config to .local/dispatch.env (gitignored)
#   3. offers to store a long-lived Claude login token (`claude setup-token`) in the macOS Keychain
#      so unattended runs use your subscription
#   4. installs the schedule: ~/Library/LaunchAgents/com.mathviz.dispatch.plist, or a crontab line
#   5. writes .claude/settings.local.json with the same narrow allowlist, for running /local-dispatch
#      from the Claude desktop app or an interactive session without prompts
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO"
LABEL="com.mathviz.dispatch"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
INTERVAL=3600
CONFIG=""
RUN_NOW=0
UNINSTALL=0
DESKTOP=0
while [ $# -gt 0 ]; do
  case "$1" in
    --doppler-config) CONFIG="$2"; shift 2 ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    --run-now) RUN_NOW=1; shift ;;
    --desktop) DESKTOP=1; shift ;;
    --uninstall) UNINSTALL=1; shift ;;
    *) echo "unknown option $1"; exit 2 ;;
  esac
done
OS="$(uname -s)"
ask() { local reply; read -r -p "$1 [y/N] " reply </dev/tty; [[ "$reply" =~ ^[Yy] ]]; }

if [ $UNINSTALL -eq 1 ]; then
  if [ "$OS" = "Darwin" ]; then
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    rm -f "$PLIST"
  else
    crontab -l 2>/dev/null | grep -v "tools/local/dispatch.sh" | crontab - || true
  fi
  echo "Removed the hourly schedule. (.local/ and the Keychain token are left in place.)"
  exit 0
fi

echo "== 1. Toolchain"
node tools/local/check.mjs --tools || true
if [ "$OS" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
  command -v doppler >/dev/null || { ask "Install the Doppler CLI with Homebrew?" && brew install dopplerhq/cli/doppler; }
  command -v ffmpeg >/dev/null || { ask "Install ffmpeg with Homebrew?" && brew install ffmpeg; }
  if ! node tools/local/check.mjs --tools 2>/dev/null | grep -q "^ok      manim"; then
    if ask "Install manim (Homebrew pango/pkg-config, BasicTeX, and a Python venv at ~/.venvs/manim)?"; then
      brew install pango pkg-config
      brew list --cask basictex >/dev/null 2>&1 || brew install --cask basictex
      python3 -m venv "$HOME/.venvs/manim"
      "$HOME/.venvs/manim/bin/pip" install --upgrade pip manim
    fi
  fi
fi
command -v claude >/dev/null || { echo "Claude Code is required: https://code.claude.com/docs/en/setup"; exit 1; }

echo "== 2. Doppler"
if [ -z "$CONFIG" ] && [ -f .local/dispatch.env ]; then CONFIG="$(sed -n 's/^DOPPLER_CONFIG=//p' .local/dispatch.env)"; fi
if [ -z "$CONFIG" ]; then
  doppler configs --project agi 2>/dev/null || true
  read -r -p "Doppler config in project agi that holds the OpenRouter keys: " CONFIG </dev/tty
fi
mkdir -p .local
printf 'DOPPLER_PROJECT=agi\nDOPPLER_CONFIG=%s\n' "$CONFIG" > .local/dispatch.env
echo "Saved .local/dispatch.env (project agi, config $CONFIG)."
bash tools/local/run.sh secret-names >/dev/null 2>&1 && echo "Doppler access works." || echo "Warning: could not list secrets in agi/$CONFIG. Run 'doppler login' and check the config name."

echo "== 3. Claude login for unattended runs"
if [ $DESKTOP -eq 1 ]; then
  echo "Skipped: the desktop app uses its own login."
elif [ "$OS" = "Darwin" ]; then
  if security find-generic-password -s math-viz-claude-token >/dev/null 2>&1; then
    echo "A token is already stored in the Keychain (service math-viz-claude-token)."
  elif ask "Create a long-lived Claude token with 'claude setup-token' and store it in the Keychain? (recommended: launchd may not see your normal login)"; then
    claude setup-token
    read -r -s -p "Paste the token it printed (input hidden): " TOKEN </dev/tty; echo
    security add-generic-password -U -a "$USER" -s math-viz-claude-token -w "$TOKEN"
    unset TOKEN
    echo "Stored in the Keychain."
  fi
else
  if [ ! -f "$HOME/.config/math-viz/claude-token" ] && ask "Create a long-lived Claude token with 'claude setup-token' and save it to ~/.config/math-viz/claude-token (mode 600)?"; then
    claude setup-token
    read -r -s -p "Paste the token it printed (input hidden): " TOKEN </dev/tty; echo
    mkdir -p "$HOME/.config/math-viz" && umask 077 && printf '%s' "$TOKEN" > "$HOME/.config/math-viz/claude-token"
    unset TOKEN
  fi
fi

echo "== 4. Schedule (every $INTERVAL seconds)"
if [ $DESKTOP -eq 1 ]; then
  echo "Skipped: create the hourly routine in the Claude desktop app (steps printed below)."
elif [ "$OS" = "Darwin" ]; then
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$REPO/tools/local/dispatch.sh</string></array>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>StartInterval</key><integer>$INTERVAL</integer>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>$REPO/.local/launchd.out.log</string>
  <key>StandardErrorPath</key><string>$REPO/.local/launchd.err.log</string>
</dict>
</plist>
PLIST
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  echo "Installed $PLIST (runs while you are logged in and the Mac is awake; a missed tick runs on wake)."
else
  ( crontab -l 2>/dev/null | grep -v "tools/local/dispatch.sh"; echo "17 * * * * /bin/bash $REPO/tools/local/dispatch.sh" ) | crontab -
  if [ "$INTERVAL" -ne 3600 ]; then echo "Note: cron runs hourly at :17; edit with 'crontab -e' for another interval."; fi
  echo "Installed a crontab entry (hourly at :17)."
fi

echo "== 5. Allowlist for interactive or desktop-app runs"
if [ -f .claude/settings.local.json ]; then
  echo ".claude/settings.local.json already exists; left unchanged. The dispatch script passes its own allowlist."
else
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  cat > .claude/settings.local.json <<JSON
{
  "permissions": {
    "allow": [
      "Bash(node tools/*)", "Bash(npm test)", "Bash(npm run *)", "Bash(bash tools/local/run.sh *)",
      "Bash(git status *)", "Bash(git diff *)", "Bash(git log *)", "Bash(git show *)",
      "Bash(git add *)", "Bash(git commit *)", "Bash(git fetch *)",
      "Bash(git pull --rebase origin $BRANCH)", "Bash(git rebase --continue)", "Bash(git rebase --abort)",
      "Bash(git push origin $BRANCH)", "Bash(git push --dry-run origin *)",
      "Bash(ffprobe *)", "Bash(ffmpeg *)", "Bash(ls *)", "Bash(du *)", "Bash(mkdir *)",
      "WebFetch", "WebSearch"
    ]
  }
}
JSON
  echo "Wrote .claude/settings.local.json (local only, not committed)."
fi

echo
if [ $DESKTOP -eq 1 ]; then
  echo "Done. Now create the routine in the Claude desktop app:"
  echo "  Code tab > Routines > New routine > Local"
  echo "  Name: math-viz local agent    Folder: $REPO"
  echo "  Schedule: Hourly              Instructions: Run /local-dispatch"
  echo "  Permission mode: Accept edits (the allowlist in .claude/settings.local.json covers the commands)"
  echo "  Then press Run now once and choose 'always allow' for anything it still asks."
  echo
fi
echo "Useful commands:"
echo "  bash tools/local/dispatch.sh --force   run one tick now (log: .local/dispatch.log)"
echo "  node tools/local/check.mjs             see what is pending without starting Claude"
echo "  tail -f .local/dispatch.log            watch the agent"
echo "  bash tools/local/setup.sh --uninstall  stop the schedule"
if [ $RUN_NOW -eq 1 ] && [ $DESKTOP -eq 0 ]; then bash tools/local/dispatch.sh; tail -n 30 .local/dispatch.log; fi
