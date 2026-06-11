#!/bin/bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
NODE_BIN="${NODE_BIN:-$(dirname "$(command -v node)")}"

cd "$PROJECT_DIR"
export PATH="$NODE_BIN:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

"$NODE_BIN/node" --env-file="$PROJECT_DIR/.env" "$PROJECT_DIR/scripts/run_technical_seo_check.mjs"
