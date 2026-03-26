#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "main" ]]; then
  echo "部署脚本只能在 main 分支执行，当前分支: $current_branch" >&2
  exit 1
fi

git pull origin main
./scripts/service.sh restart
