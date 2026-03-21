# Supabase Seed Scripts

This folder contains SQL scripts used for leaderboard development and visual testing.

## Files

- `leaderboard_auth_users_seed.sql`
  Creates synthetic email users in `auth.users` (pattern: `leaderboard_seed_###@kino.wtf`).

- `leaderboard_dev_seed.sql`
  Creates mixed outcomes in `public.played_games` across a rolling window of game indexes using existing auth users:
- daily modes (`actors`, `movies`): current + previous 13 indexes
- weekly mode (`directors`): current + previous 5 indexes
  This also avoids local timezone/DST off-by-one gaps during frontend testing.
  It now seeds additional edge cases, including:
- wins with variable guess counts (1..6)
- losses with all skipped guesses ("give up" style)
- losses with mixed wrong guesses and skips

- `leaderboard_seed_cleanup.sql`
  Removes seeded leaderboard rows and seeded synthetic users.

- `game_stats_backfill_from_archive.sql`
  Recomputes `public.game_stats` from `public.played_games` for all users and modes.
  Use this if stats/history ever drift (for example after manual SQL or older seed runs).

## When to use

Use these scripts when testing:

- endscreen top 5 leaderboard
- endscreen personal placement row after divider (`...`)
- full leaderboard modal pagination
- stats and history consistency for mixed win/loss archives
- loss rendering states in guess history

## Prerequisites

- Supabase project is linked in this repo.
- Leaderboard migration is applied.

```sh
npx supabase db push --yes
```

## Seed (Linked Project)

```sh
npx supabase db query --linked -f supabase/seed/leaderboard_auth_users_seed.sql
npx supabase db query --linked -f supabase/seed/leaderboard_dev_seed.sql
npx supabase db query --linked -f supabase/seed/game_stats_backfill_from_archive.sql
```

## Verify

```sh
npx supabase db query --linked "select count(*) as total_auth_users from auth.users;"

npx supabase db query --linked "
with idx as (
  select
    greatest((current_date - date '2025-12-31')::int, 0) as daily_index,
    greatest((((current_date - ((extract(dow from current_date)::int + 6) % 7)) - (date '2025-12-31' - ((extract(dow from date '2025-12-31')::int + 6) % 7))) / 7), 0)::int as weekly_index
)
select pg.game_mode, count(*) as winner_count
from public.played_games pg
cross join idx
where pg.did_win = true
  and (
    (pg.game_mode in ('actors','movies') and pg.game_index = idx.daily_index)
    or
    (pg.game_mode = 'directors' and pg.game_index = idx.weekly_index)
  )
group by pg.game_mode
order by pg.game_mode;
"
```

## Cleanup

```sh
npx supabase db query --linked -f supabase/seed/leaderboard_seed_cleanup.sql
```

## Notes

- Seed scripts are idempotent-safe for normal dev reuse.
- Seeded rows do not expire automatically; cleanup is manual.
