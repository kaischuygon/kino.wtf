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

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for frontend-only, Supabase-enabled, and dataset-tooling setups, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the system fits together.

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
