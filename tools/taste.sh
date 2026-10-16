#!/bin/bash
# Run the vendored taste skill's checks (.claude/skills/taste-skill) against this site.
#
#   bash tools/taste.sh lint <files or folders>      source scan for banned patterns and stock phrases
#   bash tools/taste.sh inspect [route] [--allow r]  real-browser measure of index.html#<route> at 1440/768/390;
#                                                    screenshots in .taste-skill/inspect/<route>/
#
# Finds Chrome itself (CHROME_PATH, then the Playwright Chromium) and adds --no-sandbox when running
# as root (containers). See docs/CONSTRAINTS.md "Design taste" for which rules apply to this site.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
SKILL="$REPO/.claude/skills/taste-skill"
cmd="${1:-}"; shift || true
case "$cmd" in
  lint) exec node "$SKILL/scripts/lint.mjs" "$@" ;;
  inspect)
    route="home"
    if [ $# -gt 0 ] && [[ "$1" != --* ]]; then route="$1"; shift; fi
    chrome="${CHROME_PATH:-}"
    if [ -z "$chrome" ]; then chrome="$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1 || true)"; fi
    if [ -n "$chrome" ] && [ "$(id -u)" = "0" ]; then
      wrap="$REPO/.taste-skill/chrome-no-sandbox.sh"
      mkdir -p "$REPO/.taste-skill"
      body="$(printf '#!/bin/bash\nexec "%s" --no-sandbox "$@"' "$chrome")"
      # Several agents run this at once: write the wrapper only when it is missing or stale, atomically.
      if [ ! -x "$wrap" ] || [ "$(cat "$wrap")" != "$body" ]; then
        printf '%s\n' "$body" > "$wrap.$$"; chmod +x "$wrap.$$"; mv -f "$wrap.$$" "$wrap"
      fi
      chrome="$wrap"
    fi
    [ -n "$chrome" ] && export CHROME_PATH="$chrome"
    cd "$REPO"
    # The inspector loads a file path; a small redirect page per route carries the route. Each route
    # gets its own redirect and output folder, so agents inspecting different routes at once do not
    # overwrite each other.
    mkdir -p .taste-skill/routes
    printf '<!doctype html><meta charset="utf-8"><script>location.replace("../../index.html#%s")</script>\n' "$route" > ".taste-skill/routes/$route.html"
    if [ "$route" = "home" ]; then target="index.html"; else target=".taste-skill/routes/$route.html"; fi
    out=()
    case " $* " in *" --out "*) ;; *) out=(--out ".taste-skill/inspect/$route") ;; esac
    # Study-tool exemptions (docs/CONSTRAINTS.md "Design taste"): the pictures are the mathematics, so the
    # photograph/footage floors and the decorative motion floor do not apply.
    exec node "$SKILL/scripts/inspect.mjs" "$target" "${out[@]}" --allow few-pictures,no-footage,still-page "$@" ;;
  *) echo "usage: bash tools/taste.sh lint <paths> | inspect [route] [--allow rule]" >&2; exit 2 ;;
esac
