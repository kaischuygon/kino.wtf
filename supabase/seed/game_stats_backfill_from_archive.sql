-- Backfill game_stats from played_games archive for all users/modes.
-- Useful after synthetic seed operations or integrity drift.

with ordered as (
  select
    pg.user_id,
    pg.game_mode,
    pg.did_win,
    row_number() over (
      partition by pg.user_id, pg.game_mode
      order by pg.game_index asc, pg.finished_at asc
    ) as pos,
    count(*) over (partition by pg.user_id, pg.game_mode) as total_games
  from public.played_games pg
),
summary as (
  select
    o.user_id,
    o.game_mode,
    max(o.total_games)::int as games_played,
    count(*) filter (where o.did_win)::int as games_won,
    max(o.pos) filter (where o.did_win = false) as latest_loss_pos
  from ordered o
  group by o.user_id, o.game_mode
),
wins_only as (
  select
    o.user_id,
    o.game_mode,
    o.pos,
    o.pos
      - row_number() over (
          partition by o.user_id, o.game_mode
          order by o.pos
        ) as run_group
  from ordered o
  where o.did_win = true
),
run_lengths as (
  select
    w.user_id,
    w.game_mode,
    count(*)::int as run_length
  from wins_only w
  group by w.user_id, w.game_mode, w.run_group
),
agg as (
  select
    s.user_id,
    s.game_mode,
    s.games_played,
    s.games_won,
    case
      when s.games_played = 0 then 0
      when s.latest_loss_pos is null then s.games_played
      else s.games_played - s.latest_loss_pos
    end::int as streak,
    coalesce(max(rl.run_length), 0)::int as max_streak
  from summary s
  left join run_lengths rl
    on rl.user_id = s.user_id
   and rl.game_mode = s.game_mode
  group by s.user_id, s.game_mode, s.games_played, s.games_won, s.latest_loss_pos
)
insert into public.game_stats (
  user_id,
  game_mode,
  games_played,
  games_won,
  streak,
  max_streak
)
select
  a.user_id,
  a.game_mode,
  a.games_played,
  a.games_won,
  a.streak,
  a.max_streak
from agg a
on conflict (user_id, game_mode)
do update set
  games_played = excluded.games_played,
  games_won = excluded.games_won,
  streak = excluded.streak,
  max_streak = excluded.max_streak;
