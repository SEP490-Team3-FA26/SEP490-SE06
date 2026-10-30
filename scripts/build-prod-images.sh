#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

REVISION="$(git rev-parse HEAD)"

# Unlabelled images are rebuilt once. Set FORCE_REBUILD=1 for a manual rebuild.
build_if_changed() {
  local image="$1" context="$2" dockerfile="$3"
  shift 3
  local previous_revision started_at
  previous_revision="$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image" 2>/dev/null || true)"

  # Compare each image against its own build, including changes from skipped releases.
  if [ "${FORCE_REBUILD:-0}" != "1" ] && [ -n "$previous_revision" ] && \
    git cat-file -e "${previous_revision}^{commit}" 2>/dev/null && \
    git diff --quiet "$previous_revision" "$REVISION" -- "$@"; then
    echo "⏭️ $image: inputs unchanged; reusing existing image."
    return
  fi

  echo "🏗️ Building $image at $REVISION..."
  started_at=$SECONDS
  docker build --label "org.opencontainers.image.revision=$REVISION" \
    -t "$image" "$context" -f "$dockerfile"
  echo "⏱️ $image built in $((SECONDS - started_at)) seconds."
}

build_if_changed wdp301-backend:latest ./backend ./backend/docker/backend.Dockerfile \
  backend
build_if_changed wdp301-frontend:latest . ./backend/docker/frontend.Dockerfile \
  frontend package.json backend/docker/frontend.Dockerfile backend/docker/nginx.frontend.conf .dockerignore
build_if_changed wdp301-ai:latest ./backend/apps/ai-service ./backend/apps/ai-service/Dockerfile \
  backend/apps/ai-service
