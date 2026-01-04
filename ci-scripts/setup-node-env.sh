#!/usr/bin/env bash
set -euo pipefail

echo "Installing dependencies with pnpm..."
pnpm install --frozen-lockfile

echo "Dependencies installed successfully"
