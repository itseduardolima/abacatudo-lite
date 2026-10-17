#!/bin/sh
set -e

PROXY_DIR="${PROXY_DIR:-/root/proxy}"
PROXY_CONTAINER="${PROXY_CONTAINER:-proxy-caddy-1}"
SITE="$1"
SRC="$2"
DEST="$PROXY_DIR/sites/$SITE.caddy"
BAK="$DEST.bak"

[ -f "$DEST" ] && cp "$DEST" "$BAK"
cp "$SRC" "$DEST"

if ! docker exec "$PROXY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile; then
  if [ -f "$BAK" ]; then mv "$BAK" "$DEST"; else rm -f "$DEST"; fi
  exit 1
fi

rm -f "$BAK"
docker exec "$PROXY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile
