#!/usr/bin/env bash
# Installs Screenshooter once and links it into ~/.claude/skills so it works in every project.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS="$HOME/.claude/skills"
LINK="$SKILLS/screenshooter"

echo "Installing Playwright + Chromium in $DIR ..."
(cd "$DIR" && npm install)

mkdir -p "$SKILLS"
if [ -L "$LINK" ]; then
  rm "$LINK"
elif [ -e "$LINK" ]; then
  echo "Error: $LINK exists and is not a symlink. Move it aside and re-run." >&2
  exit 1
fi
ln -s "$DIR" "$LINK"

echo "Linked $LINK -> $DIR"
echo "Done. In any Claude Code session, run /screenshooter or ask for screenshots."
