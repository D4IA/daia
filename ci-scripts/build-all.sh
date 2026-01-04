#!/usr/bin/env bash
set -euo pipefail

echo "Building all packages with turbo..."
pnpm run build

echo "Build completed successfully"
