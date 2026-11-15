-- The catalog refill (get_games/append_catalog.sh) reads the latest released
-- index from public.game_releases over PostgREST with the service_role key.
-- 202611140100 created the table without a grant, so every read returned
-- 403 "permission denied for table game_releases" and the refill never ran.
-- Read-only: releases are written only by public.release_next_games().

grant select on public.game_releases to service_role;
