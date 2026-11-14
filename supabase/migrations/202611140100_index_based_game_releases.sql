-- Index-based game releases.
--
-- Before: the current game for each mode was derived from the calendar
-- (days/weeks since 2025-12-31). If the catalog ran dry, the calendar kept
-- moving and the archive ended up with a gap of unplayable day numbers.
--
-- After: each mode releases its next game_index once per period (daily for
-- actors/movies, weekly for directors), and only if that game exists in the
-- catalog. Releases are recorded in public.game_releases, so a catalog outage
-- pauses the sequence instead of skipping numbers.
--
-- Release boundary: midnight in America/Denver (see release_period_for_mode).
-- Keep it in sync with GAME_RELEASE_TIME_ZONE in src/lib/gameRelease.ts.

-- 1) Release log --------------------------------------------------------------

create table if not exists public.game_releases (
  game_mode text not null check (game_mode in ('actors', 'movies', 'directors')),
  game_index integer not null check (game_index >= 0),
  released_on date not null,
  created_at timestamptz not null default now(),
  primary key (game_mode, game_index),
  unique (game_mode, released_on)
);

alter table public.game_releases enable row level security;
-- No anon/auth policies: reads go through the RPCs below.

-- Releases are append-only, like the catalog tables.
create or replace function public.game_releases_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'public.game_releases is append-only (% blocked)', tg_op;
end;
$$;

drop trigger if exists trg_game_releases_block_mutation on public.game_releases;
create trigger trg_game_releases_block_mutation
before update or delete on public.game_releases
for each row execute function public.game_releases_block_mutation();

-- 2) Release period -----------------------------------------------------------

create or replace function public.release_period_for_mode(
  p_game_mode text,
  p_at timestamptz default now()
)
returns date
language sql
stable
as $$
  select case
    when p_game_mode = 'directors'
      then date_trunc('week', (p_at at time zone 'America/Denver'))::date
    else (p_at at time zone 'America/Denver')::date
  end;
$$;

-- 3) Backfill history with the dates the old calendar formula produced ----------
-- Every game already published keeps its day number and date.
--
-- Guards:
--  * only games created before 2026-11-14 00:00 UTC (i.e. before the refill
--    resumed) are backfilled, so games appended after the outage are released
--    from index 232 onward instead of being stamped with old calendar dates;
--  * a mode is only backfilled while it has no releases, so re-running this
--    migration never adds releases.

insert into public.game_releases (game_mode, game_index, released_on)
select 'actors', ag.game_index, date '2025-12-31' + ag.game_index
from public.actor_games ag
where date '2025-12-31' + ag.game_index <= public.release_period_for_mode('actors')
  and ag.created_at < timestamptz '2026-11-14 00:00:00+00'
  and not exists (select 1 from public.game_releases gr where gr.game_mode = 'actors')
on conflict do nothing;

insert into public.game_releases (game_mode, game_index, released_on)
select 'movies', mg.game_index, date '2025-12-31' + mg.game_index
from public.movie_games mg
where date '2025-12-31' + mg.game_index <= public.release_period_for_mode('movies')
  and mg.created_at < timestamptz '2026-11-14 00:00:00+00'
  and not exists (select 1 from public.game_releases gr where gr.game_mode = 'movies')
on conflict do nothing;

-- Weekly mode: week 0 started Monday 2025-12-29 (the week containing 2025-12-31).
insert into public.game_releases (game_mode, game_index, released_on)
select 'directors', dg.game_index, date '2025-12-29' + 7 * dg.game_index
from public.director_games dg
where date '2025-12-29' + 7 * dg.game_index <= public.release_period_for_mode('directors')
  and dg.created_at < timestamptz '2026-11-14 00:00:00+00'
  and not exists (select 1 from public.game_releases gr where gr.game_mode = 'directors')
on conflict do nothing;

-- 4) Release logic ------------------------------------------------------------


-- Releases at most one new game per mode per period, and only if the next
-- game_index exists in the catalog. Safe to call any number of times.
create or replace function public.release_next_games(p_at timestamptz default now())
returns table (released_mode text, released_index integer, released_on date)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  m record;
  v_period date;
  v_last_index integer;
  v_last_date date;
  v_next_index integer;
  v_has_next boolean;
begin
  for m in
    select *
    from (values
      ('actors', 'actor_games'),
      ('movies', 'movie_games'),
      ('directors', 'director_games')
    ) as modes(game_mode, table_name)
  loop
    v_period := public.release_period_for_mode(m.game_mode, p_at);

    select gr.game_index, gr.released_on
      into v_last_index, v_last_date
    from public.game_releases gr
    where gr.game_mode = m.game_mode
    order by gr.game_index desc
    limit 1;

    if v_last_date is not null and v_last_date >= v_period then
      continue; -- already released this period
    end if;

    v_next_index := coalesce(v_last_index, -1) + 1;

    execute format('select exists (select 1 from public.%I where game_index = $1)', m.table_name)
      into v_has_next
      using v_next_index;

    if not v_has_next then
      continue; -- catalog is empty for this mode; pause instead of skipping
    end if;

    insert into public.game_releases (game_mode, game_index, released_on)
    values (m.game_mode, v_next_index, v_period)
    on conflict do nothing;

    if found then
      released_mode := m.game_mode;
      released_index := v_next_index;
      released_on := v_period;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.release_next_games(timestamptz) from public, anon, authenticated;

-- 5) Public read RPCs ---------------------------------------------------------

create or replace function public.get_current_game_index(p_game_mode text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(gr.game_index), -1)
  from public.game_releases gr
  where gr.game_mode = p_game_mode;
$$;

revoke all on function public.get_current_game_index(text) from public;
grant execute on function public.get_current_game_index(text) to anon;
grant execute on function public.get_current_game_index(text) to authenticated;

-- Same signature as before; the upper bound now comes from released games
-- instead of the calendar, so unreleased (buffered) games stay hidden.
create or replace function public.get_public_game_catalog(
  p_game_mode text,
  p_max_index integer default null
)
returns table (
  game_index integer,
  game_data jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with bounded as (
    select least(
      coalesce(p_max_index, public.get_current_game_index(p_game_mode)),
      public.get_current_game_index(p_game_mode)
    ) as max_index
  )
  select g.game_index, g.game_data
  from bounded b
  cross join lateral (
    select ag.game_index, ag.game_data
    from public.actor_games ag
    where p_game_mode = 'actors'
      and ag.game_index <= b.max_index

    union all

    select mg.game_index, mg.game_data
    from public.movie_games mg
    where p_game_mode = 'movies'
      and mg.game_index <= b.max_index

    union all

    select dg.game_index, dg.game_data
    from public.director_games dg
    where p_game_mode = 'directors'
      and dg.game_index <= b.max_index
  ) g
  order by g.game_index asc;
$$;

revoke all on function public.get_public_game_catalog(text, integer) from public;
grant execute on function public.get_public_game_catalog(text, integer) to anon;
grant execute on function public.get_public_game_catalog(text, integer) to authenticated;

-- 6) Schedule -----------------------------------------------------------------
-- Every 5 minutes: releases land shortly after the Denver midnight boundary,
-- and a game appended mid-period (e.g. after a refill) is released within
-- minutes instead of waiting a full day.

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'release-next-games',
  '*/5 * * * *',
  $$select public.release_next_games();$$
);

-- Release anything that is already due.
select * from public.release_next_games();
