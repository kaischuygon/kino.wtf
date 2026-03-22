# kino.wtf Project Spec

## Purpose

This document is a high-level specification for development in this repository.

It is optimized for:

- project comprehension
- architecture-aware implementation
- safe feature additions without regressing game behavior, auth flows, or data integrity

## Product Scope

kino.wtf is a movie-themed guessing game with three modes:

- actors (daily cadence)
- movies (daily cadence)
- directors (weekly cadence)

The app supports:

- anonymous/local gameplay
- optional account-backed persistence through Supabase
- game history and archive browsing
- shareable results and profile settings

## Tech Stack

- TanStack Start + TanStack Router (file-based routes)
- React 19 + TypeScript
- Vite
- Tailwind CSS + DaisyUI
- Supabase (Auth + Postgres)
- Vitest + ESLint + Prettier

## High-Level Architecture

### Route Layer

Location: src/routes

Responsibilities:

- route definitions and route-local page composition
- search param validation (for game index selection)
- loading route-scoped datasets from get_games

Rules:

- keep route files thin
- push game mechanics into feature hooks/components

### Feature Layer

Location: src/features

Current feature modules:

- gameplay
- game-history

Responsibilities:

- domain-specific UI and behavior
- game state and index logic
- feature-local reusable primitives

Rules:

- feature internals should prefer local imports within the same feature
- cross-feature usage should be intentional and minimal

### Shared Application Layer

Locations:

- src/components
- src/hooks
- src/helpers
- src/lib

Responsibilities:

- app-shell UI (navbar/footer/navigation scaffolding)
- generic hooks (auth and modal lifecycle)
- pure utility functions
- integrations/persistence boundaries

Rules:

- shared modules must remain domain-agnostic when possible
- feature-specific logic should migrate to src/features

## Key Data and State Boundaries

### Game Data

Game catalogs are stored in Supabase tables (`actor_games`, `movie_games`, `director_games`) and
read through a bounded public RPC (`get_public_game_catalog`).

Legacy JSON files in `get_games/*.json` remain tooling artifacts and bootstrap sources, not runtime
gameplay sources.

Contract:

- route decides game mode and coordinates dynamic catalog loading from Supabase RPC
- gameplay hooks operate on selected catalog entry
- runtime catalog reads must be capped to current index to prevent future-game exposure
- route handles async data loading with loading/error states before rendering gameplay component
- URL normalization redirects out-of-range game indices to valid values within current catalog bounds

### Local Draft State

Primary concept: local state is a draft cache.

Implementation intent:

- local storage retains in-progress game state
- game index mismatch invalidates stale local drafts
- local data can be used without Supabase configuration

### Remote Canonical State

When Supabase is configured and user is authenticated:

- remote state is canonical for account persistence
- stats/state/archive writes are scoped per user and mode
- merge and sync logic must avoid overwriting fresher remote state

## Auth and Persistence Decisions

### Auth Providers

Implemented providers:

- email/password
- Discord OAuth

Planned providers can exist in UI scaffolding, but should not be treated as active without full backend/provider configuration.

### Security Model

Database uses:

- row-level security on public tables
- auth.uid-based policies
- restrictive grants for authenticated role

Design expectation:

- frontend never bypasses policy assumptions
- server-side or SQL changes must preserve user-level isolation

## Migration Strategy

Current approach uses a squashed baseline migration.

Source of truth:

- supabase/migrations/202603200001_initial_auth_and_games.sql
- supabase/schema.sql (snapshot of current schema)

Rules:

- for normal evolution: add forward-only migration files
- if environments are intentionally reset: migration squashing is acceptable
- keep migration README in sync with chosen strategy

## URL and Indexing Semantics

Game selection conventions:

- URL query game is human-facing and 1-based
- internal game index is 0-based

Required behavior:

- validate and sanitize query values
- convert once at route/state boundary
- avoid mixed indexing in feature internals
- never derive stats/counts from game index arithmetic (`game_index + 1` is display-only)
- treat archive row counts as canonical for played/won totals

## UI/UX Stability Expectations

- feature modals should avoid hydration mismatch and remount flicker
- game history interactions should preserve selected page/index intent
- status display should be deterministic and consistent across local/remote sources

## v2.0.0 Migration Notes (Runtime Catalog Loading)

**Major change**: Game catalogs transitioned from static JSON files to dynamic Supabase RPC queries.

**Impact on routes**:

- src/routes/actors.tsx, src/routes/directors.tsx, src/routes/movies.tsx now fetch game data asynchronously
- each route validates index against dynamically loaded catalog length before rendering gameplay
- routes use new `loadPublicGameCatalog()` function (src/lib/gameCatalog.ts) to fetch mode-specific games
- routes normalize out-of-range indices by redirecting to valid bounds (highest available game or today's index)

**Impact on feature layer**:

- useGame hook continues to work with selected catalog entry after async load completes
- gameplay component receives games array at render time (no longer static JSON)
- loading/error states now required in route components

**Backward compatibility**:

- no change to game rules, scoring, leaderboard, or persistence logic
- auth flows and user profiles unaffected
- local draft state continues to work when Supabase is unavailable

## Development Modes

### Frontend-only mode

Use when Supabase variables are absent or placeholders.

Expected behavior:

- app shell and static pages run
- gameplay routes show catalog-unavailable state (runtime catalog now comes from DB)
- auth/remote sync gracefully degrade

### Supabase-enabled mode

Use for auth, profile, and persistence work.

Required setup:

- environment variables from .env.example
- schema and migration application in Supabase

### Dataset-generation mode

Use get_games tooling when refreshing game content.

Requirements:

- Python dependencies in get_games
- TMDB_API_TOKEN
- SUPABASE_URL (or VITE_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY when appending to DB

Workflow expectation:

- run `fetch_games.py` with `--mode <actors|movies|directors> --write-db` to append new entries
- or run `get_games/append_catalog.sh` for batch execution (supports dry-run, mode filtering, and buffer-check)
- use `get_games/append_catalog.sh --status-only` for observability-only buffer reporting
- preserve existing game indexes/history; append from current max index in each mode table
- avoid rewriting historical rows unless an intentional backfill/migration is planned
- when game payload schema changes, version adapters in `fetch_games.py` (`--catalog-schema-version`)
- pair schema changes with SQL/RPC migrations for any JSON path reads from `game_data`

### Buffer-based catalog automation (v2.0.0+)

Catalog generation now integrates a buffer-based scheduling system:

- script mode: `get_games/append_catalog.sh` is the canonical entrypoint for all catalog operations
- buffer thresholds: actors/movies (14 days), directors (8 weeks)
- exit codes: script returns non-zero code 2 when low buffer detected with `--fail-on-low-buffer` flag
- production automation: `.github/workflows/game-catalog-buffer.yml` runs daily (3:10 AM UTC) + can be manually dispatched
- automation design: status job checks buffer and reports findings; refill job appends new games regardless of status outcome (via `if: always()`)
- access model: game catalog tables (`actor_games`, `movie_games`, `director_games`) use Supabase service role with GRANT permissions; RLS disabled since access is backend-only

For observability and alerting:

- status job exits non-zero if any mode is below buffer threshold, triggering alerts
- refill job always executes and resolves low-buffer conditions by appending new content
- status CSV output available in job logs for dashboard integration

For new deployments or manual refill:

- dispatch ` Game Catalog Buffer` workflow from GitHub Actions → Run workflow button
- or invoke locally: `get_games/append_catalog.sh --buffer-check` to test and append new games

## Testing, Formatting, and Validation Gate

Before merging any changes to `main`:

- run `npm run format` to auto-fix code style (Prettier)
- run `npm run lint` for code quality checks
- run `npm run test` for unit tests
- run `npm run build` (includes prerender)
- verify primary routes render correctly
- verify auth and persistence paths when enabled

Format step is mandatory before pushing to `main` — all PRs and commits must have Prettier formatting applied.

## Coding Guidelines

When proposing or applying changes:

- prefer minimal deltas with clear ownership by layer
- avoid introducing feature logic into shared modules unless broadly reusable
- keep import paths aligned with feature boundaries
- preserve existing public contracts unless migration is explicit
- update README or this spec when architecture decisions change

## Common Safe Extension Patterns

- Add new game-specific UI under src/features/gameplay/components
- Add new game mechanics under src/features/gameplay/hooks
- Add history-related enhancements under src/features/game-history
- Add integration or persistence helpers under src/lib
- Keep routes as composition/validation entry points

## Anti-Patterns to Avoid

- coupling route files directly to low-level persistence operations
- duplicating mode conversion and storage key logic across files
- mixing local-draft and remote-canonical responsibilities without explicit merge rules
- adding schema changes without migration + schema snapshot updates
- shipping runtime gameplay that imports full future game catalogs into client bundles

## Decision Log Snapshot

Current architectural decisions:

1. Feature-first organization for game domains
2. Shared layer reserved for cross-feature primitives
3. Supabase optional at runtime; app remains usable without cloud configuration
4. Public schema secured by RLS and auth-scoped policies
5. Baseline migration currently squashed for release-era simplicity

## Maintenance

Update this file when any of the following change:

- directory strategy and module ownership
- auth providers or persistence model
- migration policy
- indexing conventions
- required release validation gates
