#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$ROOT_DIR/apps"
clone_project() {
  local name="$1" repo="$2" branch="$3"
  local target="$ROOT_DIR/apps/$name"
  if [ -d "$target/.git" ]; then printf 'Already cloned: %s\n' "$name"; return; fi
  git clone --branch "$branch" --single-branch "https://github.com/$repo.git" "$target"
}
clone_project postmaker Gotit-zhx/PostMaker main
clone_project baicaoyuan Gotit-zhx/Text-Image-Platform master
printf '%s\n' 'Project clones ready. Existing clones are never reset or pulled automatically.'
