#!/usr/bin/env bash
set -euo pipefail

# Run on the server from /srv/stackfolio after ICP approval and DNS verification.
# This changes only public URL/security configuration and keeps existing secrets intact.
if [ "${PUBLIC_RELEASE_CONFIRMED:-}" != "1" ]; then
  echo "Set PUBLIC_RELEASE_CONFIRMED=1 only after ICP filing approval and DNS verification." >&2
  exit 2
fi

ROOT="${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
STACK_ENV="${STACK_ENV:-$ROOT/local-server/.env}"
POSTMAKER_ENV="${POSTMAKER_ENV:-$ROOT/local-server/apps/postmaker/.env}"
BAICAOYUAN_ENV="${BAICAOYUAN_ENV:-$ROOT/local-server/apps/baicaoyuan/.env.compose}"

for file in "$STACK_ENV" "$POSTMAKER_ENV" "$BAICAOYUAN_ENV"; do
  if [ ! -f "$file" ]; then
    echo "Missing environment file: $file" >&2
    exit 3
  fi
done

set_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  local temporary="${file}.tmp.$$"
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' "$file" > "$temporary"
  mv "$temporary" "$file"
}

stamp="$(date +%Y%m%d-%H%M%S)"
cp -a "$STACK_ENV" "$STACK_ENV.before-public-$stamp"
cp -a "$POSTMAKER_ENV" "$POSTMAKER_ENV.before-public-$stamp"
cp -a "$BAICAOYUAN_ENV" "$BAICAOYUAN_ENV.before-public-$stamp"

set_env "$STACK_ENV" NEXT_PUBLIC_SITE_URL "https://gotit-zhx.top"
set_env "$STACK_ENV" NEXT_PUBLIC_POSTMAKER_URL "https://postmaker.gotit-zhx.top"
set_env "$STACK_ENV" NEXT_PUBLIC_BAICAOYUAN_URL "https://baicaoyuan.gotit-zhx.top"
set_env "$STACK_ENV" POSTMAKER_COOKIE_SECURE "true"
set_env "$STACK_ENV" POSTMAKER_RESOURCE_PROFILE "low"

set_env "$POSTMAKER_ENV" POSTMAKER_COOKIE_SECURE "true"
set_env "$BAICAOYUAN_ENV" PUBLIC_ORIGIN "https://baicaoyuan.gotit-zhx.top"
set_env "$BAICAOYUAN_ENV" DJANGO_ALLOWED_HOSTS "baicaoyuan.gotit-zhx.top,localhost,127.0.0.1"
set_env "$BAICAOYUAN_ENV" TIP_ALLOW_REGISTRATION "false"

echo "Public application environment prepared."
echo "Backups:"
echo "  $STACK_ENV.before-public-$stamp"
echo "  $POSTMAKER_ENV.before-public-$stamp"
echo "  $BAICAOYUAN_ENV.before-public-$stamp"

