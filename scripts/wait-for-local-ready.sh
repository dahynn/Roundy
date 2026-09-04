#!/usr/bin/env bash
set -euo pipefail

env_file=".env"
timeout_seconds=300
started_at="$(date +%s)"

usage() {
  cat <<'EOF'
Usage: scripts/wait-for-local-ready.sh [--env-file PATH] [--started-at UNIX_SECONDS] [--timeout SECONDS]

Waits until every Roundy Compose service is healthy and the frontend, backend,
and AI health endpoints return HTTP 200. It only observes running containers.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      env_file="$2"
      shift 2
      ;;
    --started-at)
      started_at="$2"
      shift 2
      ;;
    --timeout)
      timeout_seconds="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

services=(mysql redis minio openvidu ai backend frontend)
health_endpoints=(
  "frontend=http://127.0.0.1:3000/healthz"
  "backend=http://127.0.0.1:8080/actuator/health/readiness"
  "ai=http://127.0.0.1:18000/healthz"
)

service_status() {
  local service="$1"
  local container_id

  container_id="$(docker compose --env-file "$env_file" ps -q "$service")"
  if [[ -z "$container_id" ]]; then
    echo "missing"
    return
  fi

  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id"
}

all_services_healthy() {
  local service
  for service in "${services[@]}"; do
    [[ "$(service_status "$service")" == "healthy" ]] || return 1
  done
}

all_endpoints_ready() {
  local item
  local url
  local status
  for item in "${health_endpoints[@]}"; do
    url="${item#*=}"
    status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$url" || true)"
    [[ "$status" == "200" ]] || return 1
  done
}

print_snapshot() {
  local service
  local service_name
  local item
  local name
  local url
  local status

  for service in "${services[@]}"; do
    service_name="$(printf '%s' "$service" | tr '[:lower:]' '[:upper:]')"
    echo "SERVICE_${service_name}=$(service_status "$service")"
  done

  for item in "${health_endpoints[@]}"; do
    name="${item%%=*}"
    url="${item#*=}"
    status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$url" || true)"
    name="$(printf '%s' "$name" | tr '[:lower:]' '[:upper:]')"
    echo "HTTP_${name}=${status:-unreachable}"
  done
}

deadline=$((started_at + timeout_seconds))
while (( $(date +%s) <= deadline )); do
  if all_services_healthy && all_endpoints_ready; then
    ready_at="$(date +%s)"
    echo "READY_AT=$ready_at"
    echo "READY_SECONDS=$((ready_at - started_at))"
    print_snapshot
    exit 0
  fi
  sleep 2
done

echo "Timed out after ${timeout_seconds}s waiting for Roundy to become ready." >&2
print_snapshot >&2
exit 1
