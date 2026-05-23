#!/usr/bin/env bash
# Pull knowledge-base content into content/imported/ for local development.
# CI uses actions/checkout instead.
set -euo pipefail

KB_REPO="${KB_REPO:-https://github.com/BlueWhalexh/knowledge-base.git}"
KB_DIR="content/imported"

cd "$(dirname "$0")/.."

if [ -d "$KB_DIR/.git" ]; then
  echo "Updating existing knowledge-base clone in $KB_DIR..."
  git -C "$KB_DIR" pull --ff-only
else
  if [ -d "$KB_DIR" ] && [ -n "$(ls -A "$KB_DIR" 2>/dev/null)" ]; then
    echo "ERROR: $KB_DIR exists and is not empty but is not a git repo."
    echo "Move or delete it before running pull-content."
    exit 1
  fi
  echo "Cloning $KB_REPO into $KB_DIR..."
  rm -rf "$KB_DIR"
  git clone "$KB_REPO" "$KB_DIR"
fi

echo "Done. content/imported/ is up to date."
