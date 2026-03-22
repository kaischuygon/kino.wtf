-- Clean up seeded/test game catalog data for production release.
-- Truncate all game catalog tables to start fresh for RC.

truncate table public.actor_games cascade;
truncate table public.movie_games cascade;
truncate table public.director_games cascade;

