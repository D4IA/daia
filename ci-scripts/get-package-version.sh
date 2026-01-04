#!/usr/bin/env bash
set -euo pipefail

PACKAGE_JSON_PATH="${1:-package.json}"

if [ ! -f "$PACKAGE_JSON_PATH" ]; then
  echo "Error: package.json not found at $PACKAGE_JSON_PATH" >&2
  exit 1
fi

jq -r '.version' "$PACKAGE_JSON_PATH"
