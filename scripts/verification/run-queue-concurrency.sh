#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 4 ]; then
  echo "Usage (under shared measurement lock): bash $0 BEFORE_WORKTREE AFTER_WORKTREE CANDIDATE_WORKTREE OUTPUT_DIR" >&2
  exit 2
fi
before=$(cd "$1" && pwd)
after=$(cd "$2" && pwd)
candidate=$(cd "$3" && pwd)
output=$4
harness=$(cd "$(dirname "$0")" && pwd)
[ "$(git -C "$before" rev-parse HEAD)" = "$(git -C "$before" rev-parse 6e60b8d)" ]
[ "$(git -C "$after" rev-parse HEAD)" = "$(git -C "$after" rev-parse 988e2f6)" ]
[ -z "$(git -C "$before" status --porcelain)" ]
[ -z "$(git -C "$after" status --porcelain)" ]
if [ -e "$output" ]; then echo "Refusing to overwrite existing output: $output" >&2; exit 2; fi
mkdir -p "$output"
output=$(cd "$output" && pwd)
export ROUNDY_CONCURRENCY_HARNESS="$harness"
port=${ROUNDY_TEST_REDIS_PORT:-16379}
if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $port already owned; refusing to reuse or stop it" >&2
  exit 2
fi
redis_dir=$(mktemp -d /private/tmp/roundy-experiment-redis.XXXXXX)
redis-server --bind 127.0.0.1 --port "$port" --save '' --appendonly no --daemonize no --dir "$redis_dir" >"$output/redis.log" 2>&1 &
redis_pid=$!
cleanup() {
  kill "$redis_pid" 2>/dev/null || true
  wait "$redis_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
ready=false
for attempt in {1..50}; do
  kill -0 "$redis_pid" 2>/dev/null || exit 3
  if redis-cli -h 127.0.0.1 -p "$port" ping >/dev/null 2>&1; then ready=true; break; fi
  sleep 0.1
done
[ "$ready" = true ] || exit 3
export ROUNDY_TEST_REDIS_PORT="$port"
export ROUNDY_CONCURRENCY_REPEATS=${ROUNDY_CONCURRENCY_REPEATS:-100}
{
  date -u
  uname -a
  redis-server --version
  "${JAVA_HOME}/bin/java" -version 2>&1
  echo "repeats=$ROUNDY_CONCURRENCY_REPEATS warmup=3 per_scenario; version_order=before,after,candidate"
  echo "duration=controller invocation; no HTTP network, JWT cryptography, DB, AI or video"
  for repo in "$before" "$after" "$candidate"; do
    git -C "$repo" rev-parse HEAD
    git -C "$repo" status --short
  done
  shasum -a 256 "$harness/java/com/ssafya701/roundy/measurement/QueueConcurrencyExperiment.java" "$harness/concurrency.init.gradle"
  uptime
} >"$output/environment.txt"
versions=(before after candidate)
repos=("$before" "$after" "$candidate")
for index in 0 1 2; do
  export ROUNDY_CONCURRENCY_VERSION=${versions[$index]}
  export ROUNDY_CONCURRENCY_OUTPUT="$output/$ROUNDY_CONCURRENCY_VERSION.jsonl"
  echo "Running $ROUNDY_CONCURRENCY_VERSION; logs in $output"
  (
    cd "${repos[$index]}/Backend"
    ./gradlew --no-daemon -I "$harness/concurrency.init.gradle" concurrencyTest
  ) >"$output/$ROUNDY_CONCURRENCY_VERSION-build.log" 2>&1 || {
    tail -60 "$output/$ROUNDY_CONCURRENCY_VERSION-build.log"
    exit 1
  }
  cp "${repos[$index]}/Backend/build/test-results/concurrencyTest/TEST-com.ssafya701.roundy.measurement.QueueConcurrencyExperiment.xml" "$output/$ROUNDY_CONCURRENCY_VERSION-tests.xml"
done
echo "Completed. Raw JSONL: $output"
