#!/usr/bin/env bash
# Links WordPress Install into ~/.claude/skills so it works in every project.
# No dependencies to install: the script only uses Node built-ins.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS="$HOME/.claude/skills"
LINK="$SKILLS/wordpress-install"

mkdir -p "$SKILLS"
if [ -L "$LINK" ]; then
  rm "$LINK"
elif [ -e "$LINK" ]; then
  echo "Error: $LINK exists and is not a symlink. Move it aside and re-run." >&2
  exit 1
fi
ln -s "$DIR" "$LINK"

echo "Linked $LINK -> $DIR"
echo "Done. In any Claude Code session, run /wordpress-install or ask for a new WordPress site."
