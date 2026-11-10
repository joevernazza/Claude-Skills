#!/usr/bin/env bash
# Copies production media (wp-content/uploads) to the local site.
# Only adds/updates files; never deletes local files.
source "$(dirname "$0")/_env.sh"
require_ssh

rsync -avz -e "ssh -p $SSH_PORT" \
	"$SSH_USER@$SSH_HOST:$DEPLOY_PATH/wp-content/uploads/" \
	public_html/wp-content/uploads/
