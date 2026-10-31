#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
for app in site postmaker baicaoyuan; do printf '\n%s\n' "$app"; compose "$app" ps; done
