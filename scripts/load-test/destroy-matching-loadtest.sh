#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" != "--destroy" ]]; then
  echo "This command removes the dedicated test database and Redis volume. Re-run with --destroy." >&2
  exit 2
fi

env_file=${2:-.env.matching-loadtest}
compose_file=${3:-compose.matching-loadtest.yaml}
docker compose --env-file "$env_file" -f "$compose_file" down -v --remove-orphans
rm -rf scripts/load-test/generated scripts/load-test/results
echo "MATCHING_LOADTEST_DATA_DESTROYED=true"
