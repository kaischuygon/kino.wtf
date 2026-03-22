-- DB-backed game catalog to prevent exposing future games in client bundles.

create table if not exists public.actor_games (
  game_index integer primary key check (game_index >= 0),
  game_data jsonb not null,
  answer_title text generated always as (game_data #>> '{answer,title}') stored,
  created_at timestamptz not null default now()
);

create table if not exists public.movie_games (
  game_index integer primary key check (game_index >= 0),
  game_data jsonb not null,
  answer_title text generated always as (game_data #>> '{answer,title}') stored,
  created_at timestamptz not null default now()
);

create table if not exists public.director_games (
  game_index integer primary key check (game_index >= 0),
  game_data jsonb not null,
  answer_title text generated always as (game_data #>> '{answer,title}') stored,
  created_at timestamptz not null default now()
);

create index if not exists idx_actor_games_created_at on public.actor_games (created_at desc);
create index if not exists idx_movie_games_created_at on public.movie_games (created_at desc);
create index if not exists idx_director_games_created_at on public.director_games (created_at desc);

alter table public.actor_games enable row level security;
alter table public.movie_games enable row level security;
alter table public.director_games enable row level security;

-- No anon/auth table policies: public reads are mediated through RPC to enforce index bounds.

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
  with mode_meta as (
    select
      case
        when p_game_mode in ('actors', 'movies')
          then greatest((current_date - date '2025-12-31')::int, 0)
        when p_game_mode = 'directors'
          then greatest(
            (
              (
                date_trunc('week', current_date::timestamp)::date
                - date_trunc('week', date '2025-12-31'::timestamp)::date
              ) / 7
            )::int,
            0
          )
        else 0
      end as current_index
  ),
  bounded as (
    select least(coalesce(p_max_index, mm.current_index), mm.current_index) as max_index
    from mode_meta mm
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
