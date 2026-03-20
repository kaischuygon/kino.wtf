# kino.wtf

Daily and weekly movie-themed guessing games built with TanStack Start, React, and Tailwind CSS.

![kino.wtf](/public/og-image.png)

## Overview

kino.wtf is a Wordle-style web app for film fans. Players can guess:

- Actors (daily)
- Movies (daily)
- Directors (weekly)

The app is built as a TanStack Start project with file-based routing and SPA prerendering.

## Features

- File-based routing with TanStack Router
- SPA mode with prerendered pages
- Daily and weekly game cadences
- Persisted progress and stats in localStorage
- Shareable results and streak tracking
- Theme switching with DaisyUI

## Tech Stack

- TanStack Start
- TanStack Router
- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- DaisyUI
- ESLint
- Yarn

## Project Structure

```text
.
|- src/
|  |- routes/              # TanStack Start file routes
|  |- components/          # Reusable UI components
|  |- hooks/               # Game state and helper hooks
|  |- helpers/             # Pure helpers (date/index selection logic)
|  |- router.tsx           # Router creation
|  |- routeTree.gen.ts     # Auto-generated route tree
|  |- routes.tsx           # Route metadata used by navigation/UI
|- get_games/              # Python data-fetch utilities for game datasets
|- public/                 # Static assets
|- vite.config.ts          # Vite + TanStack Start config
|- vercel.json             # Vercel rewrite config
```

## Routing

Routes are file-based under src/routes.

- / -> home
- /actors -> daily actor game
- /movies -> daily movie game
- /directors -> weekly director game

The generated route tree is written to src/routeTree.gen.ts by the TanStack tooling.

## Getting Started

### Prerequisites

- Node.js 22.13+
- Yarn 1.x

### Install

```sh
yarn install
```

### Run Dev Server

```sh
yarn dev
```

### Build

```sh
yarn build
```

### Start Production Server

```sh
yarn start
```

### Preview Build

```sh
yarn preview
```

### Lint

```sh
yarn lint
```

## NPM Scripts

- yarn dev: run local development server
- yarn build: build client and server output and run type-check
- yarn start: run the Start server output from .output/server/index.mjs
- yarn preview: preview production build locally
- yarn lint: run ESLint

## TanStack Start Notes

- Vite is configured with the TanStack Start plugin in vite.config.ts.
- The project currently uses SPA mode with prerender crawling enabled.
- Prerender output is generated during yarn build.
- index.html is intentionally minimal. Document head metadata is declared in src/routes/__root.tsx.

## Game Data

The game datasets live in get_games as JSON files:

- get_games/actors.json
- get_games/movies.json
- get_games/directors.json

These are built from IMDb seed CSV files and enriched with TMDb metadata using get_games/fetch_games.py.

## Updating Datasets

### Python setup

```sh
cd get_games
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Required environment variable

Set TMDB_API_TOKEN in your environment.

If you use 1Password CLI, the included get_games/op.env file can be used with op run.

### Example commands

```sh
cd get_games

# actors
python fetch_games.py --file kino-actors.csv --type person --output actors.json --limit 1000

# movies
python fetch_games.py --file kino-movies.csv --type title --output movies.json --limit 1000

# directors
python fetch_games.py --file kino-directors.csv --type person --director true --output directors.json --limit 1000
```

## Local Development Tips

### Simulate next game boundary

In development builds, run this in the browser console on a game page:

```js
window.__simulateNextBoundary()
```

This updates localStorage and dispatches a storage event so the page refreshes game index state immediately.

## Deployment

- Primary hosting target: Vercel
- vercel.json rewrites all routes to / so prerendered SPA routing works in production.

## Troubleshooting

- If build passes but route changes are missing, restart the dev server so route tree generation refreshes.
- If theme changes do not persist, clear localStorage keys and reload.
- If dataset generation fails, verify TMDB_API_TOKEN is set and valid.

## Credits

- IMDb seed lists curated for actors, movies, and directors
  - https://www.imdb.com/list/ls4153445038/?ref_=uspf_t_3
  - https://www.imdb.com/list/ls4152948888/?ref_=uspf_t_1
  - https://www.imdb.com/list/ls4152948412/?ref_=uspf_t_2
- Metadata enrichment from TMDb API:
  - https://developer.themoviedb.org/reference/intro/getting-started
