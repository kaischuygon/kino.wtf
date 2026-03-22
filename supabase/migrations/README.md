# Supabase SQL Migrations

Use this folder to track database changes over time.

## Naming

Use UTC timestamp prefixes so migrations sort naturally:

- `YYYYMMDDHHMM_description.sql`

Example:

- `202604011200_add_user_preferences.sql`

## Workflow

1. Add a new migration file for every schema change.
2. Apply migrations in filename order in the Supabase SQL editor.
3. Keep `../schema.sql` as the latest full schema snapshot.
4. If environments are reset, it is acceptable to squash old migrations into a new baseline.

## Current baseline

- `202603200001_initial_auth_and_games.sql` (squashed baseline)

## Catalog Recovery Runbook

Catalog tables are append-only and protected by triggers.

Affected tables:

- `public.actor_games`
- `public.movie_games`
- `public.director_games`

Recovery/audit tables:

- `public.game_catalog_row_history`
- `public.game_catalog_table_snapshots`

### 1) Inspect current catalog state

```sql
select 'actors' as mode, min(game_index), max(game_index), count(*) from public.actor_games
union all
select 'movies' as mode, min(game_index), max(game_index), count(*) from public.movie_games
union all
select 'directors' as mode, min(game_index), max(game_index), count(*) from public.director_games;
```

### 2) Inspect history for a mode/index range

```sql
select
	table_name,
	game_index,
	op,
	changed_at,
	changed_by,
	txid
from public.game_catalog_row_history
where table_name = 'actor_games'
	and game_index between 0 and 120
order by changed_at asc;
```

### 3) Restore deleted rows from history (example)

This pattern restores rows where the latest operation was DELETE.

```sql
with latest_ops as (
	select distinct on (h.game_index)
		h.game_index,
		h.op,
		h.row_data,
		h.changed_at
	from public.game_catalog_row_history h
	where h.table_name = 'actor_games'
	order by h.game_index, h.changed_at desc, h.id desc
), deleted_rows as (
	select
		lo.game_index,
		(lo.row_data -> 'game_data') as game_data
	from latest_ops lo
	where lo.op = 'DELETE'
)
insert into public.actor_games (game_index, game_data)
select dr.game_index, dr.game_data
from deleted_rows dr
on conflict (game_index) do nothing;
```

### 4) Controlled mutation for emergency repair only

Normal update/delete/truncate is blocked. For explicit maintenance migrations only:

```sql
begin;
set local app.catalog_allow_mutation = 'on';

-- targeted repair here

commit;
```

### 5) Post-repair verification

```sql
select 'actors' as mode, max(game_index), count(*) from public.actor_games
union all
select 'movies' as mode, max(game_index), count(*) from public.movie_games
union all
select 'directors' as mode, max(game_index), count(*) from public.director_games;
```

Operational guidance:

- Prefer append-only writes from get_games tooling.
- Never use broad truncate/delete as a routine workflow.
- Always record pre/post verification query output in PR context for catalog repair migrations.
