-- Build an offline guessbox suggestion pool from the existing TMDb-backed catalog.
-- People-mode games use person names, movie-mode games use movie titles.

begin;

create table if not exists public.guessbox_options (
  entity_kind text not null check (entity_kind in ('person', 'movie')),
  title text not null,
  created_at timestamptz not null default now(),
  primary key (entity_kind, title)
);

alter table public.guessbox_options enable row level security;

create or replace function public.catalog_upsert_guessbox_options()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  answer_kind text;
begin
  if tg_table_name in ('actor_games', 'director_games') then
    answer_kind := 'person';
  else
    answer_kind := 'movie';
  end if;

  if new.answer_title is not null and new.answer_title <> '' then
    insert into public.guessbox_options (entity_kind, title)
    values (answer_kind, new.answer_title)
    on conflict do nothing;
  end if;

  insert into public.guessbox_options (entity_kind, title)
  select
    case when answer_kind = 'person' then 'movie' else 'person' end,
    hint_item->>'title'
  from jsonb_array_elements(coalesce(new.game_data->'hints', '[]'::jsonb)) as hint_item
  where hint_item->>'title' is not null
    and hint_item->>'title' <> ''
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_actor_games_guessbox_options on public.actor_games;
drop trigger if exists trg_movie_games_guessbox_options on public.movie_games;
drop trigger if exists trg_director_games_guessbox_options on public.director_games;

create trigger trg_actor_games_guessbox_options
after insert on public.actor_games
for each row execute function public.catalog_upsert_guessbox_options();

create trigger trg_movie_games_guessbox_options
after insert on public.movie_games
for each row execute function public.catalog_upsert_guessbox_options();

create trigger trg_director_games_guessbox_options
after insert on public.director_games
for each row execute function public.catalog_upsert_guessbox_options();

insert into public.guessbox_options (entity_kind, title)
select distinct entity_kind, title
from (
  select 'person'::text as entity_kind, ag.answer_title as title
  from public.actor_games ag
  union all
  select 'person'::text as entity_kind, dg.answer_title as title
  from public.director_games dg
  union all
  select 'person'::text as entity_kind, hint_item->>'title' as title
  from public.movie_games mg,
    jsonb_array_elements(coalesce(mg.game_data->'hints', '[]'::jsonb)) as hint_item
  union all
  select 'movie'::text as entity_kind, mg.answer_title as title
  from public.movie_games mg
  union all
  select 'movie'::text as entity_kind, hint_item->>'title' as title
  from public.actor_games ag,
    jsonb_array_elements(coalesce(ag.game_data->'hints', '[]'::jsonb)) as hint_item
  union all
  select 'movie'::text as entity_kind, hint_item->>'title' as title
  from public.director_games dg,
    jsonb_array_elements(coalesce(dg.game_data->'hints', '[]'::jsonb)) as hint_item
) pooled
where title is not null
  and title <> ''
on conflict (entity_kind, title) do nothing;

drop policy if exists "Anyone can read guessbox options" on public.guessbox_options;
create policy "Anyone can read guessbox options"
  on public.guessbox_options
  for select
  using (true);

create or replace function public.get_public_guessbox_options(
  p_entity_kind text,
  p_limit integer default null
)
returns table (title text)
language sql
stable
security definer
set search_path = public
as $$
  select go.title
  from public.guessbox_options go
  where go.entity_kind = p_entity_kind
  order by go.title asc
  limit case
    when p_limit is null then 2147483647
    else greatest(p_limit, 0)
  end;
$$;

revoke all on function public.get_public_guessbox_options(text, integer) from public;
grant execute on function public.get_public_guessbox_options(text, integer) to anon;
grant execute on function public.get_public_guessbox_options(text, integer) to authenticated;
grant select, insert, update on table public.guessbox_options to service_role;

commit;