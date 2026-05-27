#!/usr/bin/env bash
# Deploy dist/ to Cloudflare Pages.
# Requires: wrangler, authenticated (`wrangler login`).
#
# Usage:
#   PROJECT=ipgyeong-cube ./deploy/cloudflare-pages.sh
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
PROJECT="${PROJECT:-ipgyeong-cube}"
npx --yes wrangler pages deploy dist --project-name="$PROJECT"
