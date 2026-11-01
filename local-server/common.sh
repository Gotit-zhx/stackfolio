#!/usr/bin/env bash
set -euo pipefail
DEPLOY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -f "$DEPLOY_ROOT/.env" ]; then cp "$DEPLOY_ROOT/.env.example" "$DEPLOY_ROOT/.env"; fi
set -a
source "$DEPLOY_ROOT/.env"
set +a
compose() {
  local target="$1"; shift
  case "$target" in
    site|admin) docker compose -p stackfolio-site --env-file "$DEPLOY_ROOT/.env" -f "$DEPLOY_ROOT/compose.yaml" "$@" ;;
    postmaker)
      local -a files=(
        -f "$DEPLOY_ROOT/apps/postmaker/docker-compose.public.yml"
        -f "$DEPLOY_ROOT/postmaker.override.yaml"
      )
      if [ "${POSTMAKER_RESOURCE_PROFILE:-}" = low ]; then
        files+=(-f "$DEPLOY_ROOT/postmaker.server.override.yaml")
      fi
      docker compose -p stackfolio-postmaker --env-file "$DEPLOY_ROOT/apps/postmaker/.env" "${files[@]}" "$@"
      ;;
    baicaoyuan) PUBLIC_ORIGIN="${NEXT_PUBLIC_BAICAOYUAN_URL}" HTTP_PORT="${BAICAOYUAN_HTTP_PORT}" HTTPS_PORT="${BAICAOYUAN_HTTPS_PORT}" docker compose -p stackfolio-baicaoyuan --env-file "$DEPLOY_ROOT/apps/baicaoyuan/.env.compose" -f "$DEPLOY_ROOT/apps/baicaoyuan/compose.yaml" "$@" ;;
    *) printf 'Unknown service: %s\n' "$target" >&2; return 2 ;;
  esac
}
init_project() {
  local target="$1"
  case "$target" in
    site|admin) ;;
    postmaker)
      [ -d "$DEPLOY_ROOT/apps/postmaker/.git" ] || { echo 'Run ./clone-projects.sh first' >&2; return 1; }
      local env_file="$DEPLOY_ROOT/apps/postmaker/.env"
      if [ ! -f "$env_file" ]; then
        umask 077
        sed "s/^WORKSPACE_AUTH_SECRET=.*/WORKSPACE_AUTH_SECRET=$(openssl rand -hex 32)/" "$DEPLOY_ROOT/apps/postmaker/.env.public.example" > "$env_file"
      fi
      if grep -q '^WORKSPACE_AUTH_SECRET=replace-with' "$env_file"; then echo 'Set a random WORKSPACE_AUTH_SECRET in apps/postmaker/.env' >&2; return 1; fi
      ;;
    baicaoyuan)
      [ -d "$DEPLOY_ROOT/apps/baicaoyuan/.git" ] || { echo 'Run ./clone-projects.sh first' >&2; return 1; }
      (cd "$DEPLOY_ROOT/apps/baicaoyuan" && sh scripts/init-compose.sh >/dev/null)
      ;;
    *) echo 'Usage: [site|postmaker|baicaoyuan|all]' >&2; return 2 ;;
  esac
}
