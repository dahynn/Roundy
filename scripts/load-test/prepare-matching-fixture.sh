#!/usr/bin/env bash
set -euo pipefail

env_file=${1:-.env.matching-loadtest}
compose_file=${2:-compose.matching-loadtest.yaml}
output_directory=${3:-scripts/load-test/generated}

if [[ ! -f "$env_file" ]]; then
  echo "Environment file not found: $env_file" >&2
  exit 1
fi
if [[ ! -f "$compose_file" ]]; then
  echo "Compose file not found: $compose_file" >&2
  exit 1
fi
if [[ -e "$output_directory" ]]; then
  echo "Refusing to overwrite fixture directory: $output_directory" >&2
  exit 1
fi

set -a
source "$env_file"
set +a
export LOAD_TEST_JWT_SECRET="$JWT_SECRET"

node scripts/load-test/generate-matching-fixture.mjs "$output_directory"

docker compose --env-file "$env_file" -f "$compose_file" exec -T mysql sh -c \
  'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < "$output_directory/users.sql"
docker compose --env-file "$env_file" -f "$compose_file" exec -T redis \
  redis-cli --pipe < "$output_directory/verification.redis"

echo "MATCHING_FIXTURE_PREPARED=$output_directory"
