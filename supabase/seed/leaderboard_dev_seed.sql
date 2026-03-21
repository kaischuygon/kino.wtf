-- Dev seed for leaderboard testing.
-- Inserts mixed outcomes (wins + losses) for each existing auth user per game mode
-- across a rolling window:
-- - Daily modes (actors/movies): current index and previous 13 indexes (14 total)
-- - Weekly mode (directors): current index and previous 5 indexes (6 total)

with seed_users as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as user_rank
  from auth.users
  order by created_at asc, id asc
  limit 50
),
indexes as (
  select
    greatest((current_date - date '2025-12-31')::int, 0) as daily_index,
    greatest(
      (
        (
          current_date - ((extract(dow from current_date)::int + 6) % 7)
        ) - (
          date '2025-12-31' - ((extract(dow from date '2025-12-31')::int + 6) % 7)
        )
      ) / 7,
      0
    )::int as weekly_index
),
target_indexes as (
  select
    greatest(idx.daily_index + offs.offset_days, 0) as daily_index
  from indexes idx
  cross join generate_series(-13, 0) as offs(offset_days)
),
weekly_target_indexes as (
  select
    greatest(idx.weekly_index + offs.offset_weeks, 0) as weekly_index
  from indexes idx
  cross join generate_series(-5, 0) as offs(offset_weeks)
),
seed_rows as (
  select
    su.id as user_id,
    valueset.game_mode,
    idxsel.game_index,
    concat('Seeded ', valueset.mode_label, ' Answer #', su.user_rank) as answer_title,
    outcome.did_win,
    case
      when outcome.did_win then
        array(
          select case
            when gs = outcome.win_guess_count then
              concat('Seeded ', valueset.mode_label, ' Answer #', su.user_rank)
            else 'Skipped'
          end
          from generate_series(1, outcome.win_guess_count) as gs
        )::text[]
      when outcome.loss_pattern = 0 then
        -- Give-up style loss: all skips.
        array_fill(''::text, array[6])
      when outcome.loss_pattern = 1 then
        -- Near-miss style: five wrong guesses, then final skip.
        array(
          select case
            when gs = 6 then ''
            else concat('Seeded ', valueset.mode_label, ' Wrong #', (((mix.mix_seed + gs) % 200) + 1))
          end
          from generate_series(1, 6) as gs
        )::text[]
      else
        -- Mixed loss: alternating wrong guesses and skips.
        array(
          select case
            when gs % 2 = 0 then ''
            else concat('Seeded ', valueset.mode_label, ' Wrong #', (((mix.mix_seed + gs) % 200) + 1))
          end
          from generate_series(1, 6) as gs
        )::text[]
    end as guesses,
    now()
      - make_interval(
          mins => (((mix.mix_seed % 180) + (su.user_rank * 2) + valueset.finish_offset_minutes)::int)
        ) as finished_at
  from seed_users su
  cross join (
    values
      ('actors'::text, 'Actor'::text, 0::int, 18::int),
      ('movies'::text, 'Movie'::text, 2::int, 11::int),
      ('directors'::text, 'Director'::text, 4::int, 24::int)
  ) as valueset(game_mode, mode_label, guess_seed, finish_offset_minutes)
  cross join lateral (
    select d.daily_index as game_index
    from target_indexes d
    where valueset.game_mode in ('actors', 'movies')
    union all
    select w.weekly_index as game_index
    from weekly_target_indexes w
    where valueset.game_mode = 'directors'
  ) idxsel
  cross join lateral (
    select
      (
        (
          (
            'x' || substr(
              md5(
                concat(
                  valueset.game_mode,
                  ':',
                  idxsel.game_index,
                  ':',
                  su.id::text
                )
              ),
              1,
              8
            )
          )::bit(32)::int
        ) & 2147483647
      ) as mix_seed
  ) mix
  cross join lateral (
    select
      (((mix.mix_seed + su.user_rank + idxsel.game_index + valueset.guess_seed) % 10) < 7) as did_win,
      (((mix.mix_seed + valueset.guess_seed) % 6) + 1) as win_guess_count,
      ((mix.mix_seed + su.user_rank + idxsel.game_index) % 4) as loss_pattern
  ) outcome
)
insert into public.played_games (
  user_id,
  game_mode,
  game_index,
  answer_title,
  did_win,
  guesses,
  finished_at
)
select
  sr.user_id,
  sr.game_mode,
  sr.game_index,
  sr.answer_title,
  sr.did_win,
  sr.guesses,
  sr.finished_at
from seed_rows sr
on conflict (user_id, game_mode, game_index)
do update set
  answer_title = excluded.answer_title,
  did_win = excluded.did_win,
  guesses = excluded.guesses,
  finished_at = excluded.finished_at;

-- Recompute mode-scoped game_stats for seeded users from their archive rows.
with seeded_users as (
  select id
  from auth.users
  where email like 'leaderboard_seed_%@kino.wtf'
),
ordered as (
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
  inner join seeded_users su on su.id = pg.user_id
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
