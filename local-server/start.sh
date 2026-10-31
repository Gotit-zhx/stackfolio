#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
target="${1:-all}"
if [ "$target" = all ]; then targets=(site postmaker baicaoyuan); else targets=("$target"); fi
for app in "${targets[@]}"; do
  init_project "$app"
  compose "$app" up -d --build --wait --wait-timeout 240
done
printf '\nSite: %s\nPostMaker: %s\n百草园: %s\n' "$NEXT_PUBLIC_SITE_URL" "$NEXT_PUBLIC_POSTMAKER_URL" "$NEXT_PUBLIC_BAICAOYUAN_URL"
