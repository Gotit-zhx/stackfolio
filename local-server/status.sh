#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
for app in site admin postmaker baicaoyuan; do printf '\n%s\n' "$app"; compose "$app" ps; done
