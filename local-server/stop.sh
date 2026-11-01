#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
target="${1:-all}"
if [ "$target" = all ]; then targets=(site postmaker baicaoyuan); else targets=("$target"); fi
for app in "${targets[@]}"; do
  if [ "$app" = admin ]; then compose "$app" stop admin; else compose "$app" down; fi
done
# No --volumes: application data is preserved.
