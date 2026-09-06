#!/usr/bin/env bash
set -euo pipefail

env_file=".env.production"
compose_file="compose.production.yaml"

usage() {
  cat <<'EOF'
Usage: scripts/check-production-ready.sh [--env-file PATH] [--compose-file PATH]

Checks a Roundy public-deployment environment file without printing secret values
or starting containers. It validates required values and Docker Compose syntax.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      env_file="$2"
      shift 2
      ;;
    --compose-file)
      compose_file="$2"
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

if [[ ! -f "$env_file" ]]; then
  echo "Environment file not found: $env_file" >&2
  exit 1
fi

if [[ ! -f "$compose_file" ]]; then
  echo "Compose file not found: $compose_file" >&2
  exit 1
fi

value_for() {
  local key="$1"
  awk -v key="$key" '
    index($0, key "=") == 1 {
      value = substr($0, length(key) + 2)
    }
    END { print value }
  ' "$env_file" | tr -d '\r'
}

is_placeholder() {
  local value="$1"
  [[ -z "$value" || "$value" == replace-with-* || "$value" == "roundy.example.com" || "$value" == "operator@example.com" ]]
}

required_keys=(
  ROUNDY_DOMAIN
  ACME_EMAIL
  MYSQL_DATABASE
  MYSQL_USER
  MYSQL_PASSWORD
  MYSQL_ROOT_PASSWORD
  MINIO_ACCESS_KEY
  MINIO_SECRET_KEY
  JWT_SECRET
  KAKAO_CLIENT_ID
  KAKAO_SECRET_KEY
  KAKAO_ADMIN_KEY
  JPA_DDL_AUTO
  OPENVIDU_URL
  OPENVIDU_PUBLIC_URL
  OPENVIDU_SECRET
  VERIFICATION_AI_SERVER_IPS
)

missing_keys=()
for key in "${required_keys[@]}"; do
  if is_placeholder "$(value_for "$key")"; then
    missing_keys+=("$key")
  fi
done

if (( ${#missing_keys[@]} > 0 )); then
  echo "Replace placeholder values before deployment: ${missing_keys[*]}" >&2
  exit 1
fi

roundy_domain="$(value_for ROUNDY_DOMAIN)"
if [[ "$roundy_domain" != *.* || "$roundy_domain" == *"/"* || "$roundy_domain" == *"://"* ]]; then
  echo "ROUNDY_DOMAIN must be a host name without a URL scheme or path." >&2
  exit 1
fi

for key in OPENVIDU_URL OPENVIDU_PUBLIC_URL; do
  value="$(value_for "$key")"
  if [[ ! "$value" =~ ^https://[^[:space:]]+$ ]]; then
    echo "$key must use an HTTPS URL." >&2
    exit 1
  fi
done

jpa_ddl_auto="$(value_for JPA_DDL_AUTO)"
if [[ "$jpa_ddl_auto" != "update" && "$jpa_ddl_auto" != "validate" ]]; then
  echo "JPA_DDL_AUTO must be update (initial schema) or validate (after verification)." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI is required to validate the Compose configuration." >&2
  exit 1
fi

docker compose --env-file "$env_file" -f "$compose_file" config --quiet

if [[ "$jpa_ddl_auto" == "update" ]]; then
  echo "WARNING: JPA_DDL_AUTO=update. After the first verified deployment and backup, change it to validate." >&2
fi

echo "PRODUCTION_PRECHECK=PASSED"
echo "ROUNDY_DOMAIN=$roundy_domain"
echo "OPENVIDU_PUBLIC_URL_CONFIGURED=true"
