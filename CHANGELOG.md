# Changelog

## [2.1.0] - 2026-03-22

### Added

- **Database-backed game catalog** — Game data now served from Supabase tables instead of static JSON bundles, enabling dynamic content updates without frontend deployments
- **Public game catalog RPC** — New `get_public_game_catalog()` function provides authenticated/anon clients bounded access to available games with automatic date/week-based index calculation
- **Dynamic game fetching** — Frontend routes (actors, movies, directors) now load game catalogs on demand from the database with loading/error states
- **Automatic URL normalization** — Out-of-range day queries now auto-correct to the latest available game index instead of crashing
- **Buffer-based catalog generation** — Automated `append_catalog.sh` with configurable thresholds (days for actors/movies, weeks for directors) to maintain healthy game buffers
- **GitHub Actions scheduled workflow** — Daily buffer monitoring and auto-healing:
  - Status job alerts when any mode is below threshold (exit code 2)
  - Refill job auto-appends new games to restore buffer, even if status fails
- **Fail-fast policy** — Explicit exit codes and error modes for production observability
- **RLS policies** — Game catalog tables have permissive backend-only access via service_role

### Changed

- Migrated from static JSON imports to dynamic database queries for game data
- Refactored route components (actors, movies, directors) to support async data loading
- Updated deployment pipeline to support scheduled catalog maintenance

### Technical Notes

- Game catalog stored in `actor_games`, `movie_games`, `director_games` tables
- Date-based game indexing: epoch is 2025-12-31
- Buffer thresholds: 14 days (actors/movies), 8 weeks (directors), customizable via env vars
- Requires TMDB_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY for catalog generation
- All seeded test data cleared for production readiness
