import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Runs the index-based release migration against an in-memory Postgres
 * (PGlite) with production-shaped catalog tables. The pg_cron section is
 * skipped because PGlite has no pg_cron; tests call release_next_games()
 * directly instead.
 */
const migrationPath = fileURLToPath(
  new URL('../migrations/202611140100_index_based_game_releases.sql', import.meta.url),
);
const [migration] = readFileSync(migrationPath, 'utf8').split('-- 6) Schedule');

const PRE_OUTAGE = "timestamptz '2026-06-01'";

async function createDb(seed: { actors: number; movies: number; directors: number }) {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create table public.actor_games (game_index integer primary key, game_data jsonb not null, created_at timestamptz not null default now());
    create table public.movie_games (game_index integer primary key, game_data jsonb not null, created_at timestamptz not null default now());
    create table public.director_games (game_index integer primary key, game_data jsonb not null, created_at timestamptz not null default now());
    insert into public.actor_games select i, '{"answer":{"title":"a"}}', ${PRE_OUTAGE} from generate_series(0, ${seed.actors - 1}) i;
    insert into public.movie_games select i, '{"answer":{"title":"m"}}', ${PRE_OUTAGE} from generate_series(0, ${seed.movies - 1}) i;
    insert into public.director_games select i, '{"answer":{"title":"d"}}', ${PRE_OUTAGE} from generate_series(0, ${seed.directors - 1}) i;
  `);
  return db;
}

async function appendGames(db: PGlite, table: string, from: number, to: number) {
  await db.exec(
    `insert into public.${table} (game_index, game_data) select i, '{"answer":{"title":"x"}}' from generate_series(${from}, ${to}) i`,
  );
}

async function currentIndex(db: PGlite, mode: string) {
  const { rows } = await db.query<{ i: number }>('select public.get_current_game_index($1) as i', [
    mode,
  ]);
  return rows[0].i;
}

async function release(db: PGlite, at: string) {
  const { rows } = await db.query<{ released_mode: string; released_index: number }>(
    'select released_mode, released_index from public.release_next_games($1::timestamptz) order by 1',
    [at],
  );
  return rows;
}

// Catalog as it was during the 2026 outage: Day #232 was the last actor game.
const OUTAGE_SEED = { actors: 232, movies: 240, directors: 36 };

describe('index-based game releases', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createDb(OUTAGE_SEED);
    await db.exec(migration);
  });

  it('backfills history with the original calendar dates', async () => {
    expect(await currentIndex(db, 'actors')).toBe(231);
    expect(await currentIndex(db, 'directors')).toBe(35);

    const { rows } = await db.query<{ d: string }>(
      "select released_on::text as d from public.game_releases where game_mode = 'actors' and game_index = 231",
    );
    expect(rows[0].d).toBe('2026-08-19');
  });

  it('pauses instead of skipping numbers while the catalog is empty', async () => {
    expect(await release(db, '2026-11-14 12:00-07')).toEqual([]);
    expect(await currentIndex(db, 'actors')).toBe(231);
  });

  it('continues at Day #233 once the catalog is refilled', async () => {
    await appendGames(db, 'actor_games', 232, 281);

    expect(await release(db, '2026-11-14 12:00-07')).toEqual([
      { released_mode: 'actors', released_index: 232 },
    ]);
    expect(await currentIndex(db, 'actors')).toBe(232);
  });

  it('releases at most one game per mode per Denver day', async () => {
    await appendGames(db, 'actor_games', 232, 281);
    await release(db, '2026-11-14 12:00-07');

    expect(await release(db, '2026-11-14 23:59-07')).toEqual([]);
    // 06:59 UTC on Nov 15 is still Nov 14 in Denver.
    expect(await release(db, '2026-11-15 06:59+00')).toEqual([]);
    expect(await release(db, '2026-11-15 07:01+00')).toEqual([
      { released_mode: 'actors', released_index: 233 },
    ]);
    // A long pause never bulk-releases the buffer.
    expect(await release(db, '2026-12-25 12:00-07')).toEqual([
      { released_mode: 'actors', released_index: 234 },
    ]);
  });

  it('releases weekly games on the Monday boundary', async () => {
    await appendGames(db, 'director_games', 36, 40);

    expect(await release(db, '2026-11-16 09:00-07')).toEqual([
      { released_mode: 'directors', released_index: 36 },
    ]);
    expect(await release(db, '2026-11-22 23:00-07')).toEqual([]);
  });

  it('hides unreleased games from the public catalog', async () => {
    await appendGames(db, 'actor_games', 232, 281);
    await release(db, '2026-11-14 12:00-07');

    const { rows } = await db.query<{ max: number; count: number }>(
      "select max(game_index) as max, count(*)::int as count from public.get_public_game_catalog('actors', 9999)",
    );
    expect(rows[0]).toEqual({ max: 232, count: 233 });
  });

  it('keeps game_releases append-only', async () => {
    await expect(db.exec('delete from public.game_releases')).rejects.toThrow(/append-only/);
  });

  it('is safe to re-run after games have been appended', async () => {
    await appendGames(db, 'actor_games', 232, 281);
    await db.exec(migration);
    expect(await currentIndex(db, 'actors')).toBe(231);
  });

  it('still starts at Day #233 if the refill ran before the migration', async () => {
    const early = await createDb(OUTAGE_SEED);
    await appendGames(early, 'actor_games', 232, 281);
    await early.exec(migration);
    expect(await currentIndex(early, 'actors')).toBe(231);

    await release(early, '2026-11-14 12:00-07');
    expect(await currentIndex(early, 'actors')).toBe(232);
  });
});
