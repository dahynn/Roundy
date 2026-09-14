#!/usr/bin/env bash
set -euo pipefail

repository=${1:-$(pwd)}
output_directory=${2:-"$repository/scripts/load-test/results/$(date -u +%Y%m%dT%H%M%SZ)"}

: "${TARGET_URL:?Set TARGET_URL to the app node private URL, for example http://10.0.1.10:8080}"
if [[ ! -f "$repository/scripts/load-test/generated/actors.json" ]]; then
  echo "Missing generated actors.json. Copy the app-host fixture directory securely first." >&2
  exit 1
fi
if [[ -e "$output_directory" ]]; then
  echo "Refusing to overwrite output directory: $output_directory" >&2
  exit 1
fi

mkdir -p "$output_directory"
actor_count=$(node -e "console.log(require('$repository/scripts/load-test/generated/actors.json').length)")

docker run --rm --network host \
  -e TARGET_URL \
  -e VUS="$actor_count" \
  -v "$repository:/work:ro" \
  -v "$output_directory:/results" \
  grafana/k6:0.52.0 \
  run --summary-export /results/summary.json /work/scripts/load-test/matching-burst.js

echo "MATCHING_BURST_RESULT=$output_directory/summary.json"
