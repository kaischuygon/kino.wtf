# get_games

Utilities for generating the movie/actor/director game datasets used by the app.

## What this folder contains

- `fetch_games.py`: Main data-fetch script that reads IMDb seed CSVs and enriches data from TMDb.
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

## Usage

From this directory:

```sh
# actors dataset
python fetch_games.py --file kino-actors.csv --type person --output actors.json --limit 1000

# movies dataset
python fetch_games.py --file kino-movies.csv --type title --output movies.json --limit 1000

# directors dataset
python fetch_games.py --file kino-directors.csv --type person --director true --output directors.json --limit 1000
```

With 1Password CLI:

```sh
op run --env-file "op.env" -- python fetch_games.py --file kino-actors.csv --type person --output actors.json --limit 10
```

## Arguments

- `--file` (required): input CSV filename of IMDb IDs
- `--type` (required): `title` or `person`
- `--output` (required): output JSON filename
- `--limit` (optional): max entries to process
- `--director` (optional): when true and type is `person`, uses directing credits

## Security

- Never commit real API tokens.
- Keep secret values out of source-controlled `.env` files.

## Troubleshooting

- `401` / auth errors: verify `TMDB_API_TOKEN` is set and valid.
- `op` errors: run `op signin` and retry.
- Empty or low-result datasets: verify the CSV input IDs and increase `--limit`.
