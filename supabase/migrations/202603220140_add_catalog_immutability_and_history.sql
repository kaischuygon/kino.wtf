-- Enforce append-only catalog writes and keep database-native history.
-- This prevents accidental loss/reordering and enables recovery without JSON files.

begin;

create table if not exists public.game_catalog_row_history (
  id bigserial primary key,
  table_name text not null check (table_name in ('actor_games', 'movie_games', 'director_games')),
  game_index integer not null check (game_index >= 0),
  op text not null check (op in ('INSERT', 'UPDATE', 'DELETE')),
  row_data jsonb not null,
  changed_at timestamptz not null default now(),
  txid bigint not null default txid_current(),
  changed_by text not null default current_user
);

create table if not exists public.game_catalog_table_snapshots (
  id bigserial primary key,
  table_name text not null check (table_name in ('actor_games', 'movie_games', 'director_games')),
  reason text not null,
  snapshot_data jsonb not null,
  captured_at timestamptz not null default now(),
  txid bigint not null default txid_current(),
  changed_by text not null default current_user
);

create index if not exists idx_game_catalog_row_history_lookup
  on public.game_catalog_row_history (table_name, game_index, changed_at desc);

create index if not exists idx_game_catalog_table_snapshots_lookup
  on public.game_catalog_table_snapshots (table_name, captured_at desc);

create or replace function public.catalog_history_archive_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_payload jsonb;
begin
  if tg_op = 'INSERT' then
    row_payload := to_jsonb(new);
    insert into public.game_catalog_row_history (table_name, game_index, op, row_data)
    values (tg_table_name, new.game_index, tg_op, row_payload);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    row_payload := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
    insert into public.game_catalog_row_history (table_name, game_index, op, row_data)
    values (tg_table_name, new.game_index, tg_op, row_payload);
    return new;
  end if;

  row_payload := to_jsonb(old);
  insert into public.game_catalog_row_history (table_name, game_index, op, row_data)
  values (tg_table_name, old.game_index, tg_op, row_payload);
  return old;
end;
$$;

create or replace function public.catalog_guard_block_row_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('app.catalog_allow_mutation', true), 'off') = 'on' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  raise exception
    'catalog table %.% is append-only; % is blocked. Use explicit maintenance migration with SET LOCAL app.catalog_allow_mutation = on',
    tg_table_schema,
    tg_table_name,
    tg_op;
end;
$$;

create or replace function public.catalog_guard_block_truncate_and_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  snapshot_payload jsonb;
begin
  if coalesce(current_setting('app.catalog_allow_mutation', true), 'off') = 'on' then
    return null;
  end if;

  execute format(
    'select coalesce(jsonb_agg(to_jsonb(t) order by t.game_index), ''[]''::jsonb) from %I.%I t',
    tg_table_schema,
    tg_table_name
  ) into snapshot_payload;

  insert into public.game_catalog_table_snapshots (table_name, reason, snapshot_data)
  values (tg_table_name, 'TRUNCATE_BLOCKED', snapshot_payload);

  raise exception
    'catalog table %.% is append-only; TRUNCATE is blocked. A safety snapshot was recorded in public.game_catalog_table_snapshots',
    tg_table_schema,
    tg_table_name;
end;
$$;

drop trigger if exists trg_actor_games_archive_history on public.actor_games;
drop trigger if exists trg_movie_games_archive_history on public.movie_games;
drop trigger if exists trg_director_games_archive_history on public.director_games;

create trigger trg_actor_games_archive_history
after insert or update or delete on public.actor_games
for each row execute function public.catalog_history_archive_row();

create trigger trg_movie_games_archive_history
after insert or update or delete on public.movie_games
for each row execute function public.catalog_history_archive_row();

create trigger trg_director_games_archive_history
after insert or update or delete on public.director_games
for each row execute function public.catalog_history_archive_row();

drop trigger if exists trg_actor_games_block_mutation on public.actor_games;
drop trigger if exists trg_movie_games_block_mutation on public.movie_games;
drop trigger if exists trg_director_games_block_mutation on public.director_games;

create trigger trg_actor_games_block_mutation
before update or delete on public.actor_games
for each row execute function public.catalog_guard_block_row_mutation();

create trigger trg_movie_games_block_mutation
before update or delete on public.movie_games
for each row execute function public.catalog_guard_block_row_mutation();

create trigger trg_director_games_block_mutation
before update or delete on public.director_games
for each row execute function public.catalog_guard_block_row_mutation();

drop trigger if exists trg_actor_games_block_truncate on public.actor_games;
drop trigger if exists trg_movie_games_block_truncate on public.movie_games;
drop trigger if exists trg_director_games_block_truncate on public.director_games;

create trigger trg_actor_games_block_truncate
before truncate on public.actor_games
for each statement execute function public.catalog_guard_block_truncate_and_snapshot();

create trigger trg_movie_games_block_truncate
before truncate on public.movie_games
for each statement execute function public.catalog_guard_block_truncate_and_snapshot();

create trigger trg_director_games_block_truncate
before truncate on public.director_games
for each statement execute function public.catalog_guard_block_truncate_and_snapshot();

revoke update, delete on public.actor_games from service_role;
revoke update, delete on public.movie_games from service_role;
revoke update, delete on public.director_games from service_role;

grant select on public.game_catalog_row_history to service_role;
grant select on public.game_catalog_table_snapshots to service_role;

commit;
