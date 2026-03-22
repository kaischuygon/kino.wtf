-- Grant explicit permissions to service_role user for game catalog tables.

-- For actor_games
grant select on public.actor_games to service_role;
grant insert on public.actor_games to service_role;
grant update on public.actor_games to service_role;

-- For movie_games  
grant select on public.movie_games to service_role;
grant insert on public.movie_games to service_role;
grant update on public.movie_games to service_role;

-- For director_games
grant select on public.director_games to service_role;
grant insert on public.director_games to service_role;
grant update on public.director_games to service_role;
