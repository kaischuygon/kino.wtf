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
