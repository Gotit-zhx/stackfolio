#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
target="${1:-all}"
if [ "$target" = all ]; then targets=(site admin postmaker baicaoyuan); else targets=("$target"); fi
for app in "${targets[@]}"; do
  init_project "$app"
  if [ "$app" = admin ]; then
    compose "$app" up -d --build --wait --wait-timeout 240 admin
  elif [ "$app" = site ]; then
    compose "$app" up -d --build --wait --wait-timeout 240 site
  else
    compose "$app" up -d --build --wait --wait-timeout 240
  fi
done
printf '\nSite: %s\nPostMaker: %s\n百草园: %s\n' "$NEXT_PUBLIC_SITE_URL" "$NEXT_PUBLIC_POSTMAKER_URL" "$NEXT_PUBLIC_BAICAOYUAN_URL"
