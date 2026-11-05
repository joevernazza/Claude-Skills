#!/usr/bin/env bash
# Replaces the LOCAL database with a .sql dump (e.g. from db-export.sh).
# Doesn't change URLs; use scripts/pull-db.sh for production dumps.
# Usage: scripts/db-import.sh <file.sql> [--yes]
source "$(dirname "$0")/_env.sh"

file="${1:?Usage: scripts/db-import.sh <file.sql> [--yes]}"
[[ -f "$file" ]] || { echo "No such file: $file" >&2; exit 1; }
[[ "${2:-}" == "--yes" ]] && YES=1

confirm "Replace the LOCAL database ($DB_NAME) with $file?" || { echo "Stopped. Local database unchanged."; exit 0; }

db_local -e "DROP DATABASE IF EXISTS \`$DB_NAME\`; CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;"
db_local --default-character-set=utf8mb4 "$DB_NAME" < "$file"
echo "Imported $file into $DB_NAME."
