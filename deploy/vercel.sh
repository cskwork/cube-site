#!/usr/bin/env bash
# Deploy to Vercel (production).
# Requires: vercel CLI, authenticated (`vercel login`).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
npx --yes vercel --prod --yes
