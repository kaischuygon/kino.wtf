# Contributing

Thanks for considering a contribution to kino.wtf.

## Prerequisites

- Node.js 22.13+
- Yarn 1.x

## Setup

```sh
yarn install
```

Run locally:

```sh
yarn dev
```

## Development modes

- Frontend-only: no `.env` required (localStorage mode).
- Supabase-enabled: configure `.env` from `.env.example` and apply SQL schema/migrations.
- Dataset tooling: use `get_games/` Python scripts and `TMDB_API_TOKEN`.

## Quality checks

Before opening a pull request, run:

```sh
yarn format:check
yarn lint
yarn test
yarn build
```

## Pull requests

- Keep PRs focused and small when possible.
- Include a brief summary of user-visible changes.
- Update docs when behavior, setup, or structure changes.
