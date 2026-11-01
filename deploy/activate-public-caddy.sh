#!/usr/bin/env bash
set -euo pipefail

# Run on the server from /srv/stackfolio after ICP filing approval and DNS propagation.
# This script deliberately requires an explicit human confirmation before opening 80/443.
if [ "${PUBLIC_RELEASE_CONFIRMED:-}" != "1" ]; then
  echo "Set PUBLIC_RELEASE_CONFIRMED=1 only after ICP filing approval and DNS verification." >&2
  exit 2
fi

EXPECTED_IP="${PUBLIC_RELEASE_IP:-120.24.174.196}"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
TEMPLATE="${TEMPLATE:-$(cd "$(dirname "$0")" && pwd)/Caddyfile.gotit-zhx.top.example}"
BACKUP="/etc/caddy/Caddyfile.before-stackfolio-public"

hosts=(
  gotit-zhx.top
  www.gotit-zhx.top
  postmaker.gotit-zhx.top
  baicaoyuan.gotit-zhx.top
)

for host in "${hosts[@]}"; do
  resolved="$(getent ahostsv4 "$host" | awk '{print $1}' | sort -u | tr '\n' ' ')"
  if ! getent ahostsv4 "$host" | awk '{print $1}' | grep -Fxq "$EXPECTED_IP"; then
    echo "DNS check failed for $host; resolved: ${resolved:-<none>}; expected: $EXPECTED_IP" >&2
    exit 3
  fi
done

if [ ! -f "$TEMPLATE" ]; then
  echo "Missing Caddy template: $TEMPLATE" >&2
  exit 4
fi

install -d -m 0755 "$(dirname "$CADDYFILE")"
if [ -f "$CADDYFILE" ]; then
  cp -a "$CADDYFILE" "$BACKUP"
fi
install -m 0644 "$TEMPLATE" "$CADDYFILE"

if ! caddy validate --config "$CADDYFILE"; then
  if [ -f "$BACKUP" ]; then cp -a "$BACKUP" "$CADDYFILE"; fi
  exit 5
fi

if ! systemctl reload caddy; then
  if [ -f "$BACKUP" ]; then
    cp -a "$BACKUP" "$CADDYFILE"
    caddy validate --config "$CADDYFILE"
    systemctl reload caddy || true
  fi
  exit 6
fi

echo "Public Caddy configuration is active."
systemctl --no-pager --quiet is-active caddy
ss -ltn '( sport = :80 or sport = :443 )'

