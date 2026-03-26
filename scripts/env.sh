#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

normalize_env_name() {
  local value="${1:-}"
  value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"

  case "$value" in
    prod)
      printf 'production'
      ;;
    dev)
      printf 'development'
      ;;
    production|development)
      printf '%s' "$value"
      ;;
    *)
      printf 'development'
      ;;
  esac
}

load_env_file() {
  local file_path="$1"
  if [[ ! -f "$file_path" ]]; then
    return 0
  fi

  set -a
  # shellcheck disable=SC1090
  source "$file_path"
  set +a
}

load_app_env() {
  local requested_env="${1:-${APP_ENV:-${NODE_ENV:-development}}}"
  local explicit_app_host="${APP_HOST-}"
  local explicit_port="${PORT-}"
  local explicit_data_dir="${DATA_DIR-}"
  local explicit_node_env="${NODE_ENV-}"
  local explicit_app_env="${APP_ENV-}"
  requested_env="$(normalize_env_name "$requested_env")"

  load_env_file "$ROOT_DIR/.env"
  export APP_ENV="$requested_env"
  load_env_file "$ROOT_DIR/.env.$APP_ENV"

  export APP_ENV="${explicit_app_env:-$requested_env}"
  export NODE_ENV="${explicit_node_env:-${NODE_ENV:-}}"
  export HOST="${explicit_app_host:-${HOST:-0.0.0.0}}"

  if [[ -z "${explicit_port:-${PORT:-}}" ]]; then
    if [[ "$APP_ENV" == "production" ]]; then
      export PORT="9090"
    else
      export PORT="9091"
    fi
  else
    export PORT="${explicit_port:-$PORT}"
  fi

  if [[ -z "${NODE_ENV:-}" ]]; then
    if [[ "$APP_ENV" == "production" ]]; then
      export NODE_ENV="production"
    else
      export NODE_ENV="development"
    fi
  fi

  if [[ -n "${explicit_data_dir:-}" ]]; then
    export DATA_DIR="$explicit_data_dir"
  elif [[ -z "${DATA_DIR:-}" ]]; then
    export DATA_DIR="$ROOT_DIR/data/$APP_ENV"
  fi
}
