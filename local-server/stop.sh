#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
target="${1:-all}"
if [ "$target" = all ]; then targets=(site postmaker baicaoyuan); else targets=("$target"); fi
for app in "${targets[@]}"; do compose "$app" down; done
# No --volumes: application data is preserved.
