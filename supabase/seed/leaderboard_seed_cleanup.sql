-- Cleanup for leaderboard development seeds.
-- Removes synthetic auth users and any related seeded rows.
-- Safe to re-run.

-- Remove any seeded winner rows that use the explicit seeded title prefix.
delete from public.played_games
where answer_title like 'Seeded % Winner #%'
	or answer_title like 'Seeded % Answer #%';

-- Remove synthetic auth users created by leaderboard_auth_users_seed.sql.
-- Cascades to related public.user_profiles / game_stats / game_states / played_games rows.
delete from auth.users
where email like 'leaderboard_seed_%@kino.wtf';
