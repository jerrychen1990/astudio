#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/run"
LOG_DIR="$ROOT_DIR/logs"
PID_FILE="$PID_DIR/server.pid"
LOG_FILE="$LOG_DIR/server.log"
NODE_BIN="${NODE_BIN:-node}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-9090}"

mkdir -p "$PID_DIR" "$LOG_DIR"

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
  if is_running; then
    echo "服务已在运行，PID: $(cat "$PID_FILE")"
    echo "日志文件: $LOG_FILE"
    show_logs
    return 0
  fi

  (
    cd "$ROOT_DIR"
    if command -v setsid >/dev/null 2>&1; then
      nohup env HOST="$HOST" PORT="$PORT" setsid "$NODE_BIN" server.js >>"$LOG_FILE" 2>&1 &
    else
      nohup env HOST="$HOST" PORT="$PORT" "$NODE_BIN" server.js >>"$LOG_FILE" 2>&1 &
    fi
    echo $! >"$PID_FILE"
  )

  sleep 1

  if is_running; then
    echo "服务启动成功，PID: $(cat "$PID_FILE")"
    echo "监听地址: http://$HOST:$PORT"
    echo "日志文件: $LOG_FILE"
    show_logs
    return 0
  fi

  echo "服务启动失败，请检查日志: $LOG_FILE" >&2
  exit 1
}

stop_server() {
  if ! is_running; then
    echo "服务未运行"
    return 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  kill "$pid"

  for _ in {1..10}; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      rm -f "$PID_FILE"
      echo "服务已停止"
      return 0
    fi
    sleep 1
  done

  echo "服务停止超时，尝试强制结束 PID: $pid"
  kill -9 "$pid"
  rm -f "$PID_FILE"
  echo "服务已强制停止"
}

status_server() {
  if is_running; then
    echo "服务运行中，PID: $(cat "$PID_FILE")"
  else
    echo "服务未运行"
  fi
}

show_logs() {
  touch "$LOG_FILE"
  tail -n 100 -f "$LOG_FILE"
}

case "${1:-}" in
  start)
    start_server
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
    echo "用法: bash scripts/service.sh {start|stop|restart|status|logs}" >&2
    exit 1
    ;;
esac
