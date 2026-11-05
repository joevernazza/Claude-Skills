# Shared helpers for scripts/*.sh. Loads .env and checks required values.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# .env is optional for local-only scripts; remote scripts call require_ssh.
if [[ -f .env ]]; then
	set -a
	# shellcheck source=/dev/null
	source .env
	set +a
fi

require_ssh() {
	: "${SSH_USER:?Set SSH_USER in .env}"
	: "${SSH_HOST:?Set SSH_HOST in .env}"
	: "${DEPLOY_PATH:?Set DEPLOY_PATH in .env}"
}
SSH_PORT="${SSH_PORT:-22}"
PROD_URL="${PROD_URL:-__PROD_URL__}"
LOCAL_URL="${LOCAL_URL:-http://localhost:__PORT__}"

# Local database name and the client/dump tools inside the db container.
# They always match the server version (WP-CLI's bundled MariaDB client
# can't log in to MySQL 8.x, so `wp db` commands aren't used here).
DB_NAME="__PREFIX__"
DB_CLIENT="__DB_CLIENT__"
DB_DUMP="__DB_DUMP__"

wp_local() {
	docker compose run --rm -T cli wp "$@"
}

# Runs the db container's SQL client as root: db_local [args...] < file.sql
db_local() {
	docker compose exec -T -e MYSQL_PWD="${DB_ROOT_PASSWORD:-root}" db "$DB_CLIENT" -uroot "$@"
}

# Dumps the local database to stdout.
db_dump_local() {
	docker compose exec -T -e MYSQL_PWD="${DB_ROOT_PASSWORD:-root}" db "$DB_DUMP" -uroot \
		--single-transaction --default-character-set=utf8mb4 --no-tablespaces "$DB_NAME"
}

confirm() {
	[[ "${YES:-}" == "1" ]] && return 0
	read -r -p "$1 [y/N] " answer
	[[ "$answer" =~ ^[Yy]$ ]]
}
