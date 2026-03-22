-- Make leaderboard ranks tie-aware while keeping deterministic pagination.
-- Rank ties are based on outcome bucket + score bucket:
-- - winners tie by guess_count
-- - losses tie together at the bottom

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
  did_win boolean,
  guess_count integer,
  finished_at timestamptz,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked_entries as (
    select
      pg.user_id,
      coalesce(up.username, 'user_' || substring(replace(pg.user_id::text, '-', ''), 1, 8)) as username,
      pg.did_win,
      case
        when pg.did_win then coalesce(array_length(pg.guesses, 1), 0)
        else null
      end as guess_count,
      pg.finished_at,
      rank() over (
        order by
          case when pg.did_win then 0 else 1 end asc,
          case
            when pg.did_win then coalesce(array_length(pg.guesses, 1), 0)
            else 7
          end asc
      ) as rank,
      row_number() over (
        order by
          case when pg.did_win then 0 else 1 end asc,
          case
            when pg.did_win then coalesce(array_length(pg.guesses, 1), 0)
            else 7
          end asc,
          pg.finished_at asc,
          pg.user_id asc
      ) as row_num,
      count(*) over () as total_count
    from public.played_games pg
    left join public.user_profiles up on up.id = pg.user_id
    where pg.game_mode = p_game_mode
      and pg.game_index = p_game_index
      and pg.leaderboard_eligible = true
  )
  select
    re.rank,
    re.user_id,
    re.username,
    re.did_win,
    re.guess_count,
    re.finished_at,
    re.total_count
  from ranked_entries re
  where re.row_num > ((greatest(p_page, 1) - 1) * greatest(p_page_size, 1))
    and re.row_num <= (greatest(p_page, 1) * greatest(p_page_size, 1))
  order by re.row_num asc;
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
  did_win boolean,
  guess_count integer,
  finished_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked_entries as (
    select
      pg.user_id,
      coalesce(up.username, 'user_' || substring(replace(pg.user_id::text, '-', ''), 1, 8)) as username,
      pg.did_win,
      case
        when pg.did_win then coalesce(array_length(pg.guesses, 1), 0)
        else null
      end as guess_count,
      pg.finished_at,
      rank() over (
        order by
          case when pg.did_win then 0 else 1 end asc,
          case
            when pg.did_win then coalesce(array_length(pg.guesses, 1), 0)
            else 7
          end asc
      ) as rank
    from public.played_games pg
    left join public.user_profiles up on up.id = pg.user_id
    where pg.game_mode = p_game_mode
      and pg.game_index = p_game_index
      and pg.leaderboard_eligible = true
  )
  select
    re.rank,
    re.user_id,
    re.username,
    re.did_win,
    re.guess_count,
    re.finished_at
  from ranked_entries re
  where re.user_id = p_user_id
  limit 1;
$$;
