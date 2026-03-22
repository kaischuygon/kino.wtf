#!/usr/bin/env bash
set -euo pipefail

# Appends newly generated game entries to Supabase catalog tables.
# Defaults are intentionally conservative and can be overridden via env vars.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python}"
SCHEMA_VERSION="${CATALOG_SCHEMA_VERSION:-v1}"
DRY_RUN=false
BUFFER_CHECK=false
STATUS_ONLY=false
FAIL_ON_LOW_BUFFER=false
ONLY_MODE=""

ACTORS_LIMIT="${ACTORS_LIMIT:-50}"
MOVIES_LIMIT="${MOVIES_LIMIT:-50}"
DIRECTORS_LIMIT="${DIRECTORS_LIMIT:-20}"

BUFFER_ACTORS_DAYS="${BUFFER_ACTORS_DAYS:-14}"
BUFFER_MOVIES_DAYS="${BUFFER_MOVIES_DAYS:-14}"
BUFFER_DIRECTORS_WEEKS="${BUFFER_DIRECTORS_WEEKS:-8}"

BASE_DATE="${BASE_DATE:-2025-12-31}"

usage() {
  cat <<'EOF'
Usage:
  ./append_catalog.sh [--dry-run] [--buffer-check] [--status-only] [--fail-on-low-buffer] [--only actors|movies|directors]

Options:
  --dry-run      Generate JSON outputs only; do not append to Supabase.
  --buffer-check Only generate/append for modes below the configured buffer threshold.
  --status-only  Print buffer report and exit (no generation or DB writes).
  --fail-on-low-buffer Exit non-zero if any mode is below threshold.
  --only <mode>  Run only one mode.

Environment overrides:
  PYTHON_BIN                 Python executable (default: python)
  CATALOG_SCHEMA_VERSION     Schema adapter version passed to fetch_games.py (default: v1)
  ACTORS_LIMIT               Generation limit for actors mode (default: 50)
  MOVIES_LIMIT               Generation limit for movies mode (default: 50)
  DIRECTORS_LIMIT            Generation limit for directors mode (default: 20)
  BUFFER_ACTORS_DAYS         Trigger threshold for actors mode (default: 14)
  BUFFER_MOVIES_DAYS         Trigger threshold for movies mode (default: 14)
  BUFFER_DIRECTORS_WEEKS     Trigger threshold for directors mode (default: 8)
  BASE_DATE                  Index epoch start date (default: 2025-12-31)

Required env vars for non-dry runs:
  TMDB_API_TOKEN
  SUPABASE_URL (or VITE_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY

Required env vars for --buffer-check:
  SUPABASE_URL (or VITE_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY

Required env vars for --status-only:
  SUPABASE_URL (or VITE_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --buffer-check)
      BUFFER_CHECK=true
      shift
      ;;
    --status-only)
      STATUS_ONLY=true
      shift
      ;;
    --fail-on-low-buffer)
      FAIL_ON_LOW_BUFFER=true
      shift
      ;;
    --only)
      ONLY_MODE="${2:-}"
      if [[ -z "$ONLY_MODE" ]]; then
        echo "Missing value for --only" >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

LOW_BUFFER_DETECTED=false

SUPABASE_URL_RESOLVED="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"

if [[ "$DRY_RUN" == false && "$STATUS_ONLY" == false ]]; then
  if [[ -z "${TMDB_API_TOKEN:-}" ]]; then
    echo "Missing TMDB_API_TOKEN" >&2
    exit 1
  fi
  if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    echo "Missing SUPABASE_SERVICE_ROLE_KEY" >&2
    exit 1
  fi
  if [[ -z "$SUPABASE_URL_RESOLVED" ]]; then
    echo "Missing SUPABASE_URL or VITE_SUPABASE_URL" >&2
    exit 1
  fi
fi

if [[ "$BUFFER_CHECK" == true ]]; then
  if [[ -z "$SUPABASE_URL_RESOLVED" ]]; then
    echo "Missing SUPABASE_URL or VITE_SUPABASE_URL for --buffer-check" >&2
    exit 1
  fi
  if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    echo "Missing SUPABASE_SERVICE_ROLE_KEY for --buffer-check" >&2
    exit 1
  fi
fi

if [[ "$STATUS_ONLY" == true ]]; then
  BUFFER_CHECK=true
  if [[ -z "$SUPABASE_URL_RESOLVED" ]]; then
    echo "Missing SUPABASE_URL or VITE_SUPABASE_URL for --status-only" >&2
    exit 1
  fi
  if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    echo "Missing SUPABASE_SERVICE_ROLE_KEY for --status-only" >&2
    exit 1
  fi
fi

if [[ "$FAIL_ON_LOW_BUFFER" == true && "$BUFFER_CHECK" == false ]]; then
  echo "--fail-on-low-buffer requires --buffer-check or --status-only" >&2
  exit 1
fi

mode_table() {
  local mode="$1"
  case "$mode" in
    actors) echo "actor_games" ;;
    movies) echo "movie_games" ;;
    directors) echo "director_games" ;;
    *)
      echo "Unsupported mode: $mode" >&2
      exit 1
      ;;
  esac
}

current_index_for_mode() {
  local mode="$1"
  "$PYTHON_BIN" - "$mode" "$BASE_DATE" <<'PY'
import datetime
import sys

mode = sys.argv[1]
base_date = datetime.date.fromisoformat(sys.argv[2])
today = datetime.date.today()

if mode in ("actors", "movies"):
    print(max((today - base_date).days, 0))
elif mode == "directors":
    today_week = today - datetime.timedelta(days=today.weekday())
    base_week = base_date - datetime.timedelta(days=base_date.weekday())
    print(max((today_week - base_week).days // 7, 0))
else:
    raise SystemExit(f"Unsupported mode: {mode}")
PY
}

max_index_for_mode() {
  local mode="$1"
  local table
  table="$(mode_table "$mode")"

  "$PYTHON_BIN" - "$table" "$SUPABASE_URL_RESOLVED" "$SUPABASE_SERVICE_ROLE_KEY" <<'PY'
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

table = sys.argv[1]
supabase_url = sys.argv[2].rstrip('/')
service_key = sys.argv[3]

url = (
    f"{supabase_url}/rest/v1/{urllib.parse.quote(table)}"
    "?select=game_index"
    "&order=game_index.desc"
    "&limit=1"
)

req = urllib.request.Request(
    url,
    headers={
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    },
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode('utf-8'))
except urllib.error.HTTPError as exc:
    detail = exc.read().decode('utf-8', errors='replace')
    raise SystemExit(f"Failed reading {table} max index: HTTP {exc.code}: {detail}")

if not payload:
    print(-1)
else:
    print(int(payload[0].get("game_index", -1)))
PY
}

should_run_mode_buffer() {
  local mode="$1"
  local threshold="$2"

  local current_index
  local max_index
  local remaining

  current_index="$(current_index_for_mode "$mode")"
  max_index="$(max_index_for_mode "$mode")"
  remaining=$(( max_index - current_index ))

  echo "Buffer check mode=$mode current_index=$current_index max_index=$max_index remaining=$remaining threshold=$threshold"

  if (( remaining < threshold )); then
    LOW_BUFFER_DETECTED=true
    return 0
  fi

  return 1
}

print_buffer_status() {
  echo "mode,current_index,max_index,remaining,threshold,action"

  for mode in actors movies directors; do
    if [[ -n "$ONLY_MODE" && "$ONLY_MODE" != "$mode" ]]; then
      continue
    fi

    local threshold
    case "$mode" in
      actors) threshold="$BUFFER_ACTORS_DAYS" ;;
      movies) threshold="$BUFFER_MOVIES_DAYS" ;;
      directors) threshold="$BUFFER_DIRECTORS_WEEKS" ;;
      *)
        echo "Unsupported mode in status report: $mode" >&2
        exit 1
        ;;
    esac

    local current_index
    local max_index
    local remaining
    local action

    current_index="$(current_index_for_mode "$mode")"
    max_index="$(max_index_for_mode "$mode")"
    remaining=$(( max_index - current_index ))

    if (( remaining < threshold )); then
      LOW_BUFFER_DETECTED=true
      action="run"
    else
      action="skip"
    fi

    echo "$mode,$current_index,$max_index,$remaining,$threshold,$action"
  done
}

run_mode() {
  local mode="$1"
  local imdb_type="$2"
  local file_name="$3"
  local output_name="$4"
  local limit="$5"
  local extra_flags="$6"
  local buffer_threshold="$7"

  if [[ -n "$ONLY_MODE" && "$ONLY_MODE" != "$mode" ]]; then
    return 0
  fi

  if [[ "$BUFFER_CHECK" == true ]]; then
    if ! should_run_mode_buffer "$mode" "$buffer_threshold"; then
      echo "Skipping mode=$mode due to healthy buffer"
      return 0
    fi
  fi

  local cmd=(
    "$PYTHON_BIN" "$ROOT_DIR/fetch_games.py"
    --file "$ROOT_DIR/$file_name"
    --type "$imdb_type"
    --output "$ROOT_DIR/$output_name"
    --limit "$limit"
    --mode "$mode"
    --catalog-schema-version "$SCHEMA_VERSION"
  )

  if [[ -n "$extra_flags" ]]; then
    # shellcheck disable=SC2206
    local extras=( $extra_flags )
    cmd+=("${extras[@]}")
  fi

  if [[ "$DRY_RUN" == false ]]; then
    cmd+=(--write-db)
  fi

  echo "Running mode=$mode limit=$limit dry_run=$DRY_RUN schema=$SCHEMA_VERSION"
  "${cmd[@]}"
}

if [[ "$STATUS_ONLY" == true ]]; then
  print_buffer_status
  if [[ "$FAIL_ON_LOW_BUFFER" == true && "$LOW_BUFFER_DETECTED" == true ]]; then
    echo "At least one mode is below threshold" >&2
    exit 2
  fi
  exit 0
fi

run_mode "actors" "person" "kino-actors.csv" "actors.json" "$ACTORS_LIMIT" "" "$BUFFER_ACTORS_DAYS"
run_mode "movies" "title" "kino-movies.csv" "movies.json" "$MOVIES_LIMIT" "" "$BUFFER_MOVIES_DAYS"
run_mode "directors" "person" "kino-directors.csv" "directors.json" "$DIRECTORS_LIMIT" "--director" "$BUFFER_DIRECTORS_WEEKS"

if [[ "$FAIL_ON_LOW_BUFFER" == true && "$LOW_BUFFER_DETECTED" == true ]]; then
  echo "At least one mode is below threshold" >&2
  exit 2
fi

echo "All requested modes completed."
