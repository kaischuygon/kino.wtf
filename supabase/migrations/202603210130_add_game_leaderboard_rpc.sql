-- Winners-only leaderboard RPCs for game end screens and full leaderboard modal.

create index if not exists idx_played_games_leaderboard_winners
  on public.played_games (
    game_mode,
    game_index,
    did_win,
    (coalesce(array_length(guesses, 1), 0)),
    finished_at,
    user_id
  )
  where did_win = true;

create or replace function public.get_game_leaderboard_page(
  p_game_mode text,
  p_game_index integer,
  p_page integer default 1,
  p_page_size integer default 25
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  guess_count integer,
  finished_at timestamptz,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with winners as (
    select
      pg.user_id,
      coalesce(up.username, 'user_' || substring(replace(pg.user_id::text, '-', ''), 1, 8)) as username,
      coalesce(array_length(pg.guesses, 1), 0) as guess_count,
      pg.finished_at,
      row_number() over (
        order by
          coalesce(array_length(pg.guesses, 1), 0) asc,
          pg.finished_at asc,
          pg.user_id asc
      ) as rank,
      count(*) over () as total_count
    from public.played_games pg
    left join public.user_profiles up on up.id = pg.user_id
    where pg.game_mode = p_game_mode
      and pg.game_index = p_game_index
      and pg.did_win = true
  )
  select
    w.rank,
    w.user_id,
    w.username,
    w.guess_count,
    w.finished_at,
    w.total_count
  from winners w
  where w.rank > ((greatest(p_page, 1) - 1) * greatest(p_page_size, 1))
    and w.rank <= (greatest(p_page, 1) * greatest(p_page_size, 1))
  order by w.rank asc;
$$;

create or replace function public.get_game_leaderboard_placement(
  p_game_mode text,
  p_game_index integer,
  p_user_id uuid
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  guess_count integer,
  finished_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with winners as (
    select
      pg.user_id,
      coalesce(up.username, 'user_' || substring(replace(pg.user_id::text, '-', ''), 1, 8)) as username,
      coalesce(array_length(pg.guesses, 1), 0) as guess_count,
      pg.finished_at,
      row_number() over (
        order by
          coalesce(array_length(pg.guesses, 1), 0) asc,
          pg.finished_at asc,
          pg.user_id asc
      ) as rank
    from public.played_games pg
    left join public.user_profiles up on up.id = pg.user_id
    where pg.game_mode = p_game_mode
      and pg.game_index = p_game_index
      and pg.did_win = true
  )
  select
    w.rank,
    w.user_id,
    w.username,
    w.guess_count,
    w.finished_at
  from winners w
  where w.user_id = p_user_id
  limit 1;
$$;

revoke all on function public.get_game_leaderboard_page(text, integer, integer, integer) from public;
grant execute on function public.get_game_leaderboard_page(text, integer, integer, integer) to anon;
grant execute on function public.get_game_leaderboard_page(text, integer, integer, integer) to authenticated;

revoke all on function public.get_game_leaderboard_placement(text, integer, uuid) from public;
grant execute on function public.get_game_leaderboard_placement(text, integer, uuid) to anon;
grant execute on function public.get_game_leaderboard_placement(text, integer, uuid) to authenticated;