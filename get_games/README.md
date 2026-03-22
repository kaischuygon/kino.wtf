# get_games

Utilities for generating the movie/actor/director game datasets used by the app.

## What this folder contains

- `fetch_games.py`: Main data-fetch script that reads IMDb seed CSVs and enriches data from TMDb.
- `append_catalog.sh`: Canonical batch wrapper for generation/append workflows.
- `kino-actors.csv`, `kino-movies.csv`, `kino-directors.csv`: Input seed lists (IMDb IDs).
- `actors.json`, `movies.json`, `directors.json`: Output game datasets consumed by the frontend.
- `requirements.txt`: Python dependencies for the data tooling.
- `op.env`: Optional 1Password CLI env-file with TMDb token reference.

## Prerequisites

- Python 3.9+
- A TMDb API bearer token in `TMDB_API_TOKEN`
- Optional: 1Password CLI (`op`) if you use secrets via `op.env`

Install dependencies:

```sh
pip install -r requirements.txt
```

## Token configuration

`fetch_games.py` reads `TMDB_API_TOKEN` from environment variables (and calls `load_dotenv()`).

If you use `op.env`, the value is an op URI placeholder, for example:

```sh
TMDB_API_TOKEN="op://Private/TMDb/credential"
```

Use `op run` so the placeholder is resolved at runtime.

`append_catalog.sh` is the preferred automation entrypoint; the old helper wrapper was removed.

## Usage

From this directory:

```sh
# actors dataset
python fetch_games.py --file kino-actors.csv --type person --output actors.json --limit 1000

# movies dataset
python fetch_games.py --file kino-movies.csv --type title --output movies.json --limit 1000

# directors dataset
python fetch_games.py --file kino-directors.csv --type person --director --output directors.json --limit 1000
```

With 1Password CLI:

```sh
op run --env-file "op.env" -- python fetch_games.py --file kino-actors.csv --type person --output actors.json --limit 10
```

### Append New Games To Supabase Catalog

`fetch_games.py` can append generated entries directly into DB-backed game tables while preserving
existing history and indexes.

Required env vars for DB writes:

- `SUPABASE_URL` (or `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

Examples:

```sh
# append new actors games
python fetch_games.py --file kino-actors.csv --type person --output actors.json --limit 30 --mode actors --write-db

# append new movies games
python fetch_games.py --file kino-movies.csv --type title --output movies.json --limit 30 --mode movies --write-db

# append new directors games
python fetch_games.py --file kino-directors.csv --type person --director --output directors.json --limit 15 --mode directors --write-db
```

Notes:

- DB writes append starting from the current max `game_index` in the mode table.
- Existing rows are preserved; no automatic rewrite of prior history.
- JSON output is still produced for tooling/debug workflows.
- TMDb calls now use retry/backoff, strict timeouts, and per-entry validation.

### Batch Append Helper

Use the wrapper script to run all modes in one command (or one specific mode).

```sh
# dry run (JSON generation only)
bash append_catalog.sh --dry-run

# append all modes to Supabase
bash append_catalog.sh

# append only directors
bash append_catalog.sh --only directors

# buffer-based run (only runs modes below threshold)
bash append_catalog.sh --buffer-check

# preview buffer decisions without DB writes
bash append_catalog.sh --buffer-check --dry-run

# status-only report (CSV output, no generation)
bash append_catalog.sh --status-only

# status-only report that fails if any mode is below threshold
bash append_catalog.sh --status-only --fail-on-low-buffer
```

Optional environment overrides:

- `CATALOG_SCHEMA_VERSION` (default `v1`)
- `ACTORS_LIMIT`, `MOVIES_LIMIT`, `DIRECTORS_LIMIT`
- `PYTHON_BIN` (when not using `python`)
- `BUFFER_ACTORS_DAYS` (default `14`)
- `BUFFER_MOVIES_DAYS` (default `14`)
- `BUFFER_DIRECTORS_WEEKS` (default `8`)

Exit-code policy:

- `--fail-on-low-buffer` returns exit code `2` when any mode is below threshold.
- Use it with `--status-only` for alerting and with `--buffer-check` for strict policy enforcement.

Expected buffer-check output (example):

```text
Buffer check mode=actors current_index=81 max_index=90 remaining=9 threshold=14
Running mode=actors limit=50 dry_run=false schema=v1
Buffer check mode=movies current_index=81 max_index=98 remaining=17 threshold=14
Skipping mode=movies due to healthy buffer
Buffer check mode=directors current_index=11 max_index=13 remaining=2 threshold=8
Running mode=directors limit=20 dry_run=false schema=v1
All requested modes completed.
```

Expected status-only output (example):

```text
mode,current_index,max_index,remaining,threshold,action
actors,81,90,9,14,run
movies,81,98,17,14,skip
directors,11,13,2,8,run
```

### Production Scheduling

Recommended pattern:

1. Run `append_catalog.sh --status-only` on a schedule for visibility/monitoring.
2. Run `append_catalog.sh --buffer-check` on a schedule to refill only when needed.

Cron example (daily at 03:10 UTC with 1Password):

```cron
10 3 * * * cd /path/to/repo/get_games && eval "$(op signin --account my)" && op run --env-file op.env -- bash append_catalog.sh --buffer-check >> /var/log/kino-catalog.log 2>&1
```

### GitHub Actions Automation

Workflow file: `.github/workflows/game-catalog-buffer.yml`

It runs daily and has two jobs:

1. `buffer-status`: runs `--status-only --fail-on-low-buffer` for alerting.
2. `buffer-refill`: always runs `--buffer-check` to refill as needed.

Required repository secrets:

- `TMDB_API_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional repository variables:

- `BUFFER_ACTORS_DAYS`, `BUFFER_MOVIES_DAYS`, `BUFFER_DIRECTORS_WEEKS`
- `ACTORS_LIMIT`, `MOVIES_LIMIT`, `DIRECTORS_LIMIT`
- `CATALOG_SCHEMA_VERSION`

## Arguments

- `--file` (required): input CSV filename of IMDb IDs
- `--type` (required): `title` or `person`
- `--output` (required): output JSON filename
- `--limit` (optional): max entries to process
- `--director` (optional flag): when set and `--type person`, uses directing credits
- `--mode` (required with `--write-db`): `actors`, `movies`, or `directors`
- `--write-db` (optional): append generated games to Supabase catalog table
- `--supabase-url` (optional): explicit Supabase URL override
- `--supabase-service-key` (optional): explicit service key override
- `--catalog-schema-version` (optional): schema adapter version, defaults to `v1`

## Schema Change Plan

When the frontend game payload schema changes, do not hot-patch ad hoc fields in multiple places.
Use this sequence:

1. Add/update schema adapter in `normalize_game_for_catalog` inside `fetch_games.py`.
2. Extend `validate_game_schema` to enforce the new required fields.
3. Introduce a new adapter token (for example, `v2`) and keep `v1` backward compatible during migration.
4. Add a DB migration for any required SQL/RPC updates that read from `game_data` JSON paths.
5. Dry run generation to JSON only first (no `--write-db`) and inspect output shape.
6. Append to DB with the new adapter only after route/runtime readers are updated.

This keeps generation, persistence, and runtime readers in lockstep.

## Safe Run Checklist

Before running append jobs:

1. Confirm credentials are loaded (`TMDB_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
2. Run a small JSON-only test (`--limit 5` without `--write-db`).
3. Review warning logs for skipped entries and ensure quality bar is expected.
4. Run the real append command with `--write-db`.
5. Verify row counts in the target mode table and check max `game_index` increments as expected.

## Security

- Never commit real API tokens.
- Keep secret values out of source-controlled `.env` files.

## Troubleshooting

- `401` / auth errors: verify `TMDB_API_TOKEN` is set and valid.
- `op` errors: run `op signin` and retry.
- Empty or low-result datasets: verify the CSV input IDs and increase `--limit`.
