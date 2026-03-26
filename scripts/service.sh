#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
. "$ROOT_DIR/scripts/env.sh"

PID_DIR="$ROOT_DIR/run"
LOG_DIR="$ROOT_DIR/logs"
NODE_BIN="${NODE_BIN:-node}"

mkdir -p "$PID_DIR" "$LOG_DIR"

COMMAND="${1:-}"
ENV_NAME="${2:-${APP_ENV:-production}}"
load_app_env "$ENV_NAME"

PID_FILE="$PID_DIR/server.${APP_ENV}.pid"
LOG_FILE="$LOG_DIR/server.${APP_ENV}.log"

is_running() {
  if [[ ! -f "$PID_FILE" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$PID_FILE")"

  if [[ -z "$pid" ]]; then
    return 1
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi

  rm -f "$PID_FILE"
  return 1
}

start_server() {
  local follow_logs="${1:-false}"

  if is_running; then
    echo "[$APP_ENV] 服务已在运行，PID: $(cat "$PID_FILE")"
    echo "监听地址: http://$HOST:$PORT"
    echo "日志文件: $LOG_FILE"
    if [[ "$follow_logs" == "true" ]]; then
      show_logs
    fi
    return 0
  fi

  (
    cd "$ROOT_DIR"
    nohup env APP_ENV="$APP_ENV" NODE_ENV="$NODE_ENV" HOST="$HOST" PORT="$PORT" DATA_DIR="$DATA_DIR" "$NODE_BIN" server.js </dev/null >>"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
  )

  sleep 1

  if is_running; then
    echo "[$APP_ENV] 服务启动成功，PID: $(cat "$PID_FILE")"
    echo "监听地址: http://$HOST:$PORT"
    echo "日志文件: $LOG_FILE"
    if [[ "$follow_logs" == "true" ]]; then
      show_logs
    fi
    return 0
  fi

  echo "[$APP_ENV] 服务启动失败，请检查日志: $LOG_FILE" >&2
  exit 1
}

stop_server() {
  if ! is_running; then
    echo "[$APP_ENV] 服务未运行"
    return 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  kill "$pid"

  for _ in {1..10}; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      rm -f "$PID_FILE"
      echo "[$APP_ENV] 服务已停止"
      return 0
    fi
    sleep 1
  done

  echo "[$APP_ENV] 服务停止超时，尝试强制结束 PID: $pid"
  kill -9 "$pid"
  rm -f "$PID_FILE"
  echo "[$APP_ENV] 服务已强制停止"
}

status_server() {
  if is_running; then
    echo "[$APP_ENV] 服务运行中，PID: $(cat "$PID_FILE")"
    echo "监听地址: http://$HOST:$PORT"
    echo "日志文件: $LOG_FILE"
  else
    echo "[$APP_ENV] 服务未运行"
  fi
}

show_logs() {
  touch "$LOG_FILE"
  tail -n 100 -f "$LOG_FILE"
}

case "$COMMAND" in
  start)
    start_server true
    ;;
  start-bg)
    start_server false
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server
    start_server
    ;;
  status)
    status_server
    ;;
  logs)
    show_logs
    ;;
  *)
    echo "用法: bash scripts/service.sh {start|start-bg|stop|restart|status|logs} [development|production]" >&2
    exit 1
    ;;
esac
