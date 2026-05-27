#!/usr/bin/env bash
# Deploy dist/ to an S3 bucket (+ optional CloudFront invalidation).
# Requires: aws CLI, authenticated.
#
# Usage:
#   BUCKET=my-bucket DISTRIBUTION_ID=E123ABC ./deploy/s3.sh
set -euo pipefail
cd "$(dirname "$0")/.."

: "${BUCKET:?BUCKET env var is required (target S3 bucket name)}"

npm run build
aws s3 sync dist/ "s3://${BUCKET}/" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude index.html
aws s3 cp dist/index.html "s3://${BUCKET}/index.html" \
  --cache-control "public,max-age=60"

if [ -n "${DISTRIBUTION_ID:-}" ]; then
  aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/index.html" "/"
fi

echo "✔ deployed to s3://${BUCKET}/"
