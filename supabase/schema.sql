-- Supabase schema for kino.wtf auth + archive persistence
-- Run this in the Supabase SQL editor once after creating your project.

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text not null unique,
  preferred_theme text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_mode text not null check (game_mode in ('actors', 'movies', 'directors')),
  games_played integer not null default 0 check (games_played >= 0),
  games_won integer not null default 0 check (games_won >= 0),
  streak integer not null default 0 check (streak >= 0),
  max_streak integer not null default 0 check (max_streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_mode)
);

create table if not exists public.game_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_mode text not null check (game_mode in ('actors', 'movies', 'directors')),
  game_index integer not null check (game_index >= 0),
  guess text not null default '',
  guesses text[] not null default '{}',
  game_over smallint not null default 0 check (game_over in (0, 1, 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_mode)
);

create table if not exists public.played_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_mode text not null check (game_mode in ('actors', 'movies', 'directors')),
  game_index integer not null check (game_index >= 0),
  answer_title text not null,
  did_win boolean not null,
  guesses text[] not null default '{}',
  finished_at timestamptz not null default now(),
  unique (user_id, game_mode, game_index)
);

create index if not exists idx_played_games_user_finished_at
  on public.played_games (user_id, finished_at desc);

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_username text;
  desired_username text;
begin
  raw_username := coalesce(new.raw_user_meta_data ->> 'username', '');

  desired_username := regexp_replace(lower(trim(raw_username)), '[^a-z0-9_]', '', 'g');

  if desired_username = '' or char_length(desired_username) < 3 then
    desired_username := 'user_' || substring(new.id::text, 1, 8);
  elsif char_length(desired_username) > 32 then
    desired_username := substring(desired_username, 1, 32);
  end if;

  if exists (
    select 1
    from public.user_profiles
    where lower(username) = lower(desired_username)
  ) then
    desired_username := 'user_' || substring(new.id::text, 1, 8);
  end if;

  insert into public.user_profiles (id, username)
  values (new.id, desired_username)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_auth_user_created();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_game_stats_updated_at on public.game_stats;
create trigger trg_game_stats_updated_at
before update on public.game_stats
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_game_states_updated_at on public.game_states;
create trigger trg_game_states_updated_at
before update on public.game_states
for each row execute procedure public.set_updated_at();

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

alter table public.user_profiles enable row level security;
alter table public.game_stats enable row level security;
alter table public.game_states enable row level security;
alter table public.played_games enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on table public.played_games to authenticated;
grant select, insert, update on table public.game_states to authenticated;
grant select, insert, update on table public.game_stats to authenticated;
grant select, insert, update on table public.user_profiles to authenticated;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
  on public.user_profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
  on public.user_profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read own stats" on public.game_stats;
create policy "Users can read own stats"
  on public.game_stats
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can write own stats" on public.game_stats;
create policy "Users can write own stats"
  on public.game_stats
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own stats" on public.game_stats;
create policy "Users can update own stats"
  on public.game_stats
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own state" on public.game_states;
create policy "Users can read own state"
  on public.game_states
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can write own state" on public.game_states;
create policy "Users can write own state"
  on public.game_states
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own state" on public.game_states;
create policy "Users can update own state"
  on public.game_states
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own played games" on public.played_games;
create policy "Users can read own played games"
  on public.played_games
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own played games" on public.played_games;
create policy "Users can insert own played games"
  on public.played_games
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own played games" on public.played_games;
create policy "Users can update own played games"
  on public.played_games
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
