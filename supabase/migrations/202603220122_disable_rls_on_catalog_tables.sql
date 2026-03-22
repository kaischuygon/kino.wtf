-- Disable RLS on game catalog tables since they're backend-only (service_role only).
-- Direct GRANT permissions provide sufficient access control.

alter table public.actor_games disable row level security;
alter table public.movie_games disable row level security;
alter table public.director_games disable row level security;
