#!/usr/bin/env bash
# Copies the production database to the local Docker site.
#   - Exports production with WP-CLI over SSH (WP-CLI must be on the server;
#     it uses the server's own client, so the dump matches the server).
#   - Keeps a dated copy in db/ (git-ignored).
#   - Replaces the local database, swaps PROD_URL -> LOCAL_URL, and turns on
#     "Discourage search engines" locally.
# Usage: scripts/pull-db.sh        (YES=1 to skip the confirmation)
source "$(dirname "$0")/_env.sh"
require_ssh

mkdir -p db
dump="db/production-$(date +%Y%m%d-%H%M%S).sql"

echo "Exporting production database..."
ssh -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" \
	"cd '$DEPLOY_PATH' && wp db export - --single-transaction --quiet" > "$dump"
echo "Saved $dump ($(du -h "$dump" | cut -f1))"
# @db:mariadb
# MySQL 8's default collation isn't known to older MariaDB versions; switch
# it to one both engines support (WordPress core uses it too).
sed -i.bak 's/utf8mb4_0900_ai_ci/utf8mb4_unicode_520_ci/g' "$dump" && rm -f "$dump.bak"
# /@db:mariadb

confirm "Replace the LOCAL database with this export?" || { echo "Stopped. Local database unchanged."; exit 0; }

"$(dirname "$0")/db-import.sh" "$dump" --yes
wp_local search-replace "$PROD_URL" "$LOCAL_URL" --all-tables --precise --skip-columns=guid --report-changed-only
wp_local option update blog_public 0
wp_local cache flush
echo "Done. Local site now matches production: $LOCAL_URL"
