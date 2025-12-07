#!/usr/bin/env bash
set -euo pipefail

# Build the backend Docker image and tag it with the package version.
# Usage:
#   scripts/build.sh
# Optional environment variables:
#   IMAGE_NAME - override the image name (default: agents-demos-backend)
#   PUSH=true  - if set, push the image after successful build

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"
REPO_ROOT="$(cd "$DIR/../.." >/dev/null 2>&1 && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to build the image" >&2
  exit 2
fi

version="$($DIR/scripts/get-version.sh)"
name="${IMAGE_NAME:-agents-demos-backend}"
image="${name}:${version}"

echo "Building Docker image: ${image}"

docker build -t "${image}" -f "$DIR/Dockerfile" "$REPO_ROOT"

echo "Built ${image}"

if [[ "${PUSH:-}" == "true" ]]; then
  echo "Pushing ${image}"
  docker push "${image}"
fi
