# get_movies

This folder contains helper scripts used to fetch movie and actor data from The Movie Database (TMDb) for the web app.

## Purpose

- `movies.py`: Scrapes top-rated movies and exports `movies.json`.
- `actors.py`: Scrapes actors (from `top1000actors.csv`) and exports `actors.json`.

## Prerequisites

- Python 3.9+ (or your project's supported Python)
- Install required Python packages:

```
pip install -r requirements.txt
```

- 1Password CLI (op) v2 installed and signed in. Follow the 1Password docs to install and sign in (eg. `op signin`).

## Notes about `op.env`

This repo includes an `op.env` file containing the 1Password URI for the TMDb token:

```
TMDB_API_TOKEN="op://Private/TMDb/credential"
```

That line is an op URI placeholder and is not automatically expanded by `dotenv`. The scripts call `load_dotenv()` and then read `TMDB_API_TOKEN` from the environment. To actually provide a usable token you must resolve the op URI with the 1Password CLI and either export it into your shell or write the resolved value into an env file.

## Recommended way to run the scripts (with 1Password cli)

```sh
# Run the scripts (use --limit to limit pages/ids)
op run --env-file "op.env" -- python actors.py --limit 5 # limits to 5 results
op run --env-file "op.env" -- python actors.py # use scraper default
```

## Command examples

- Run only 2 pages of movies (fast test):

```sh
op run --env-file "op.env" -- python movies.py --limit 2
```

- Run 10 actors (fast test):

```sh
op run --env-file "op.env" -- python actors.py --limit 10
```

## Security

- Do not commit real API tokens to the repository or push `.env` files containing secrets.

## Troubleshooting

- If `op` returns an error, sign in using the 1Password CLI (`op signin`) and retry.
- If `load_dotenv()` is not picking up values, ensure your credential is saved in 1password properly or update op.env appropriately.
