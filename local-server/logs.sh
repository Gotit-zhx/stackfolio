#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
target="${1:-site}"; shift || true
compose "$target" logs --tail 100 -f "$@"
