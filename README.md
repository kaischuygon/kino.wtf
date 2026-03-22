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
- Optional cloud sync for signed-in users (Supabase)
- Email/password auth + password reset flow
- Discord, Google, and GitHub OAuth sign-in
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
|  |- features/            # Feature modules (gameplay, game-history)
|  |  |- gameplay/
|  |  |  |- components/    # Game-specific UI (GuessBox, stats, share, nav)
|  |  |  |- hooks/         # Game-specific state hooks (useGame, useGameIndex)
|  |  |- game-history/
|  |     |- components/    # History modal and pagination
|  |     |- hooks/         # History pagination helpers
|  |- components/          # Shared app-level UI (Navbar, Footer, common modals)
|  |- hooks/               # Shared app hooks (auth, generic modal state)
|  |- helpers/             # Pure helpers (date/index selection logic)
|  |- lib/                 # Integration and persistence modules
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

### Test

```sh
yarn test
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
- index.html is intentionally minimal. Document head metadata is declared in src/routes/\_\_root.tsx.

## Development Workflow

### Frontend-only mode (no Supabase setup)

If `.env` is missing or uses placeholder values from `.env.example`, the app shell still runs locally.
Gameplay catalog is now DB-backed, so game routes require Supabase catalog data.

Use this mode for:

- UI work
- non-catalog gameplay logic updates
- route and component refactors

### Supabase-enabled mode

Use this mode when developing auth, cloud sync, and archive persistence.

1. Copy `.env.example` to `.env`
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`
3. Apply `supabase/schema.sql`
4. Apply migrations in `supabase/migrations/` order

### OAuth provider setup (Supabase)

To use Google, Discord, or GitHub sign-in locally:

1. In Supabase Dashboard, go to Authentication > Providers and enable the provider.
2. In Supabase Dashboard, set Site URL to your app URL (for local dev: `http://localhost:3000`).
3. Add Redirect URLs for local and production, including `/auth` (for example: `http://localhost:3000/auth`).
4. In each external provider (Google/Discord/GitHub), configure its callback URL to the Supabase callback URL shown in the provider settings.

For GitHub specifically, create an OAuth App in GitHub Developer Settings and paste the Client ID/Secret into Supabase's GitHub provider configuration.

### Leaderboard Test Data (Supabase)

For leaderboard UI testing (top 5, personal placement, modal pagination), use the seed scripts in `supabase/seed/`.

Quick flow:

```sh
# 1) Apply pending migrations (includes leaderboard RPCs)
npx supabase db push --yes

# 2) Create synthetic auth users for realistic leaderboard volume
npx supabase db query --linked -f supabase/seed/leaderboard_auth_users_seed.sql

# 3) Seed mixed outcomes for a rolling index window (daily + weekly)
npx supabase db query --linked -f supabase/seed/leaderboard_dev_seed.sql
```

Cleanup:

```sh
npx supabase db query --linked -f supabase/seed/leaderboard_seed_cleanup.sql
```

See `supabase/seed/README.md` for details.

### Dataset-generation mode

Use this mode when generating and appending new game catalog entries.

1. Set up Python dependencies in `get_games/`
2. Set `TMDB_API_TOKEN`
3. Set `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`
4. Run `fetch_games.py` with `--mode ... --write-db` to append entries

## Game Data

Runtime gameplay catalog lives in Supabase tables:

- `public.actor_games`
- `public.movie_games`
- `public.director_games`

`get_games/*.json` files are maintained as tooling artifacts and bootstrap snapshots:

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
python fetch_games.py --file kino-directors.csv --type person --director --output directors.json --limit 1000
```

Append newly generated games to DB catalog tables:

```sh
cd get_games

# actors
python fetch_games.py --file kino-actors.csv --type person --output actors.json --limit 50 --mode actors --write-db

# movies
python fetch_games.py --file kino-movies.csv --type title --output movies.json --limit 50 --mode movies --write-db

# directors
python fetch_games.py --file kino-directors.csv --type person --director --output directors.json --limit 20 --mode directors --write-db
```

## Local Development Tips

### Simulate next game boundary

In development builds, run this in the browser console on a game page:

```js
window.__simulateNextBoundary();
```

This updates localStorage and dispatches a storage event so the page refreshes game index state immediately.

## Deployment

- Primary hosting target: Vercel
- vercel.json routes unmatched requests to `/_shell.html` so SPA prerendered routing works in production.

## Auth and Database (Supabase)

This project now supports low-maintenance auth and persistence using Supabase's free tier.

### What is implemented

- Email/password sign up and sign in
- Password reset request + reset completion flow
- Discord OAuth sign in (working)
- Google OAuth sign in (working)
- GitHub OAuth sign in (working)
- Synced per-user:
  - game stats
  - in-progress game state
  - played game archive

### Environment variables

Copy `.env.example` to `.env` and set values from your Supabase project:

```sh
cp .env.example .env
```

Required vars:

- VITE_SUPABASE_URL
- VITE_SUPABASE_KEY

### Database schema

Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.

For versioned changes, use the migration files in `supabase/migrations/`.
Apply them in filename order.

Create a new timestamped migration file with:

```sh
yarn db:migration:new -- add_descriptive_name
```

Current baseline migration:

- `supabase/migrations/202603200001_initial_auth_and_games.sql`

Tables created:

- `user_profiles`
- `game_stats`
- `game_states`
- `played_games`

The schema includes:

- row-level security (RLS) enabled on all public tables
- policies scoped to `auth.uid()` so users can only read/write their own data
- trigger for creating a profile row on new auth users

### Supabase provider setup

In Supabase Authentication Providers:

- Enable Email
- Enable Discord, Google, and GitHub, and set each provider client ID/secret
- Set redirect URL(s) to include your local/dev and deployed auth callback URL:
  - `http://localhost:5173/auth`
  - `https://your-domain/auth`

## Troubleshooting

- If build passes but route changes are missing, restart the dev server so route tree generation refreshes.
- If theme changes do not persist, clear localStorage keys and reload.
- If dataset generation fails, verify TMDB_API_TOKEN is set and valid.

## Community and Security

- Contributing guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- License: `LICENSE`

## Credits

- IMDb seed lists curated for actors, movies, and directors
  - https://www.imdb.com/list/ls4153445038/?ref_=uspf_t_3
  - https://www.imdb.com/list/ls4152948888/?ref_=uspf_t_1
  - https://www.imdb.com/list/ls4152948412/?ref_=uspf_t_2
- Metadata enrichment from TMDb API:
  - https://developer.themoviedb.org/reference/intro/getting-started
