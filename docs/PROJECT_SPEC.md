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

Static JSON datasets are generated in get_games and consumed by routes.

Contract:

- route decides game mode dataset
- gameplay hooks operate on selected dataset entry

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

## Development Modes

### Frontend-only mode

Use when Supabase variables are absent or placeholders.

Expected behavior:

- app runs
- gameplay persists locally
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

## Testing and Validation Gate

Before merging architecture-affecting changes:

- run lint
- run tests
- run build (includes prerender)
- verify primary routes render correctly
- verify auth and persistence paths when enabled

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
