#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "进入验证阶段，准备后台启动 DEV 环境..."
bash "$ROOT_DIR/scripts/service.sh" start-bg development

echo "验证环境已启动。"
echo "APP_ENV=development"
echo "如需查看日志：npm run service:logs -- development"
echo "如需停止服务：npm run service:stop -- development"

if [[ ! -t 0 ]]; then
  echo "当前不是交互式终端，无法等待人工确认，流程暂停。" >&2
  exit 1
fi

read -r -p "人工验证通过后输入 yes 继续后续流程: " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "未收到确认，流程保持暂停。"
  exit 1
fi

echo "验证已确认通过，可以继续后续流程。"
