#!/usr/bin/env bash
# Deploy dist/ to GitHub Pages on the gh-pages branch.
# Requires: gh-pages npm package (auto-installed via npx).
#
# Usage:
#   ./deploy/github-pages.sh                   # deploy to /
#   BASE_PATH=/my-repo/ ./deploy/github-pages.sh
set -euo pipefail

cd "$(dirname "$0")/.."
echo "▶ build with BASE_PATH=${BASE_PATH:-/}"
BASE_PATH="${BASE_PATH:-/}" npm run build
echo "▶ publishing dist/ to gh-pages branch"
npx --yes gh-pages -d dist -t true
echo "✔ done — visit GitHub Pages settings to enable the gh-pages branch source"
