#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 2 ]; then
  echo "Usage: bash $0 REPOSITORY OUTPUT_JSON" >&2
  exit 2
fi
repository=$(cd "$1" && pwd)
output=$2
harness=$(cd "$(dirname "$0")" && pwd)
if [ -e "$output" ]; then echo "Refusing to overwrite existing output: $output" >&2; exit 2; fi
port=${ROUNDY_TEST_REDIS_PORT:-16380}
if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $port already owned; refusing to reuse or stop it" >&2
  exit 2
fi
mkdir -p "$(dirname "$output")"
redis_dir=$(mktemp -d /private/tmp/roundy-cumulative-redis.XXXXXX)
redis-server --bind 127.0.0.1 --port "$port" --save '' --appendonly no --daemonize no --dir "$redis_dir" >"${output}.redis.log" 2>&1 &
redis_pid=$!
cleanup() {
  kill "$redis_pid" 2>/dev/null || true
  wait "$redis_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
for attempt in {1..50}; do
  if redis-cli -h 127.0.0.1 -p "$port" ping >/dev/null 2>&1; then break; fi
  sleep 0.1
done
redis-cli -h 127.0.0.1 -p "$port" ping >/dev/null
export ROUNDY_TEST_REDIS_PORT="$port"
export ROUNDY_CONCURRENCY_HARNESS="$harness"
export ROUNDY_LOAD_OUTPUT="$output"
(
  cd "$repository/Backend"
  ./gradlew --no-daemon -I "$harness/concurrency.init.gradle" cumulativeLoadTest
)
