#!/usr/bin/env bash
# Deploy dist/ to Netlify (production).
# Requires: netlify-cli, authenticated (`netlify login`).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
npx --yes netlify-cli deploy --prod --dir=dist
