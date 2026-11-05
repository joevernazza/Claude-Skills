#!/usr/bin/env bash
# Backs up the LOCAL database to db/local-<date>.sql (git-ignored).
# Usage: scripts/db-export.sh [file.sql]
source "$(dirname "$0")/_env.sh"

mkdir -p db
out="${1:-db/local-$(date +%Y%m%d-%H%M%S).sql}"
db_dump_local > "$out"
echo "Saved $out ($(du -h "$out" | cut -f1))"
