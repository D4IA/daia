#!/usr/bin/env bash
set -euo pipefail

# Extract package version from the package.json file of the backend package.
# Usage: scripts/get-version.sh

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install jq: https://stedolan.github.io/jq/" >&2
  exit 2
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"
PKG_JSON="$DIR/package.json"

if [[ ! -f "$PKG_JSON" ]]; then
  echo "package.json not found at $PKG_JSON" >&2
  exit 2
fi

jq -r '.version' "$PKG_JSON"
