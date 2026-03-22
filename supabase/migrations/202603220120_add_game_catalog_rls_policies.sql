-- Add RLS policies to allow service_role to access game catalog tables for admin operations.

create policy "Service role can read actor_games"
  on public.actor_games
  for select
  to service_role
  using (true);

create policy "Service role can insert actor_games"
  on public.actor_games
  for insert
  to service_role
  with check (true);

create policy "Service role can update actor_games"
  on public.actor_games
  for update
  to service_role
  using (true)
  with check (true);

create policy "Service role can read movie_games"
  on public.movie_games
  for select
  to service_role
  using (true);

create policy "Service role can insert movie_games"
  on public.movie_games
  for insert
  to service_role
  with check (true);

create policy "Service role can update movie_games"
  on public.movie_games
  for update
  to service_role
  using (true)
  with check (true);

create policy "Service role can read director_games"
  on public.director_games
  for select
  to service_role
  using (true);

create policy "Service role can insert director_games"
  on public.director_games
  for insert
  to service_role
  with check (true);

create policy "Service role can update director_games"
  on public.director_games
  for update
  to service_role
  using (true)
  with check (true);
