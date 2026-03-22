-- Clean up all seeded/test data from other tables for production release.

truncate table public.game_states cascade;
truncate table public.played_games cascade;
truncate table public.user_profiles cascade;
