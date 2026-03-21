import type { GameStats } from '../features/gameplay/components/DisplayStats';
import { supabase } from './supabase';

export type GameMode = 'actors' | 'movies' | 'directors';

export interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  preferred_theme: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersistedGameState {
  user_id: string;
  game_mode: GameMode;
  game_index: number;
  guess: string;
  guesses: string[];
  game_over: 0 | 1 | 2;
}

export interface PlayedGameRecord {
  id: string;
  game_mode: GameMode;
  game_index: number;
  answer_title: string;
  did_win: boolean;
  guesses: string[];
  finished_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  guessCount: number;
  finishedAt: string;
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  totalCount: number;
}

export interface StatsIntegrityEntry {
  gameMode: GameMode;
  expected: GameStats;
  actual: GameStats;
  matches: boolean;
}

export interface StatsIntegrityReport {
  entries: StatsIntegrityEntry[];
  allMatch: boolean;
}

function isTransientDatabaseError(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const maybeError = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  const blob = [maybeError.code, maybeError.message, maybeError.details, maybeError.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!blob) return false;

  return [
    'failed to fetch',
    'network',
    'timeout',
    'timed out',
    'connection',
    'econnrefused',
    'service unavailable',
    '503',
    '502',
    '504',
  ].some((needle) => blob.includes(needle));
}

export async function loadGameState(userId: string, gameMode: GameMode) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_states')
    .select('user_id, game_mode, game_index, guess, guesses, game_over')
    .eq('user_id', userId)
    .eq('game_mode', gameMode)
    .maybeSingle();

  if (error) {
    if (isTransientDatabaseError(error)) return null;
    throw error;
  }

  return (data ?? null) as PersistedGameState | null;
}

export async function saveGameState(state: PersistedGameState) {
  if (!supabase) return;

  const { error } = await supabase.from('game_states').upsert(state, {
    onConflict: 'user_id,game_mode',
  });

  if (error) {
    if (isTransientDatabaseError(error)) return;
    throw error;
  }
}

export async function loadGameStats(userId: string, gameMode: GameMode) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_stats')
    .select('games_played, games_won, streak, max_streak')
    .eq('user_id', userId)
    .eq('game_mode', gameMode)
    .maybeSingle();

  if (error) {
    if (isTransientDatabaseError(error)) return null;
    throw error;
  }

  if (!data) return null;

  return {
    gamesPlayed: Number(data.games_played ?? 0),
    gamesWon: Number(data.games_won ?? 0),
    streak: Number(data.streak ?? 0),
    maxStreak: Number(data.max_streak ?? 0),
  } as GameStats;
}

export async function saveGameStats(userId: string, gameMode: GameMode, stats: GameStats) {
  if (!supabase) return;

  const { error } = await supabase.from('game_stats').upsert(
    {
      user_id: userId,
      game_mode: gameMode,
      games_played: stats.gamesPlayed,
      games_won: stats.gamesWon,
      streak: stats.streak,
      max_streak: stats.maxStreak,
    },
    {
      onConflict: 'user_id,game_mode',
    },
  );

  if (error) {
    if (isTransientDatabaseError(error)) return;
    throw error;
  }
}

export async function recordPlayedGame(input: {
  userId: string;
  gameMode: GameMode;
  gameIndex: number;
  answerTitle: string;
  didWin: boolean;
  guesses: string[];
}) {
  if (!supabase) return;

  const { error } = await supabase.from('played_games').upsert(
    {
      user_id: input.userId,
      game_mode: input.gameMode,
      game_index: input.gameIndex,
      answer_title: input.answerTitle,
      did_win: input.didWin,
      guesses: input.guesses,
      finished_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,game_mode,game_index',
    },
  );

  if (error) {
    if (isTransientDatabaseError(error)) return;
    throw error;
  }
}

export async function loadPlayedGames(userId: string, limit = 200) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('played_games')
    .select('id, game_mode, game_index, answer_title, did_win, guesses, finished_at')
    .eq('user_id', userId)
    .order('finished_at', { ascending: false })
    .limit(limit)
    .returns<PlayedGameRecord[]>();

  if (error) {
    if (isTransientDatabaseError(error)) return [];
    const detail = [error.code, error.message, error.details, error.hint]
      .filter(Boolean)
      .join(' | ');
    throw new Error(`Archive query failed: ${detail}`);
  }
  return data ?? [];
}

export async function loadPlayedGameForIndex(input: {
  userId: string;
  gameMode: GameMode;
  gameIndex: number;
}): Promise<PlayedGameRecord | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('played_games')
    .select('id, game_mode, game_index, answer_title, did_win, guesses, finished_at')
    .eq('user_id', input.userId)
    .eq('game_mode', input.gameMode)
    .eq('game_index', input.gameIndex)
    .maybeSingle<PlayedGameRecord>();

  if (error) {
    if (isTransientDatabaseError(error)) return null;
    throw error;
  }

  return data ?? null;
}

function buildStatsFromPlayedRecords(records: PlayedGameRecord[]): GameStats {
  if (!records.length) {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      streak: 0,
      maxStreak: 0,
    };
  }

  const ordered = [...records].sort((a, b) => {
    if (a.game_index !== b.game_index) return a.game_index - b.game_index;
    const left = new Date(a.finished_at).getTime();
    const right = new Date(b.finished_at).getTime();
    return left - right;
  });

  let gamesPlayed = 0;
  let gamesWon = 0;
  let streak = 0;
  let maxStreak = 0;

  for (const record of ordered) {
    gamesPlayed += 1;
    if (record.did_win) {
      gamesWon += 1;
      streak += 1;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 0;
    }
  }

  return {
    gamesPlayed,
    gamesWon,
    streak,
    maxStreak,
  };
}

export async function validateGameStatsIntegrity(userId: string): Promise<StatsIntegrityReport> {
  const modes: GameMode[] = ['actors', 'movies', 'directors'];

  const [played, statsByMode] = await Promise.all([
    loadPlayedGames(userId, 2000),
    Promise.all(
      modes.map(async (mode) => {
        const stats = await loadGameStats(userId, mode);
        return {
          mode,
          stats: stats ?? {
            gamesPlayed: 0,
            gamesWon: 0,
            streak: 0,
            maxStreak: 0,
          },
        };
      }),
    ),
  ]);

  const entries: StatsIntegrityEntry[] = modes.map((mode) => {
    const modePlayed = played.filter((entry) => entry.game_mode === mode);
    const expected = buildStatsFromPlayedRecords(modePlayed);
    const actual = statsByMode.find((item) => item.mode === mode)?.stats ?? {
      gamesPlayed: 0,
      gamesWon: 0,
      streak: 0,
      maxStreak: 0,
    };

    const matches =
      expected.gamesPlayed === actual.gamesPlayed &&
      expected.gamesWon === actual.gamesWon &&
      expected.streak === actual.streak &&
      expected.maxStreak === actual.maxStreak;

    return {
      gameMode: mode,
      expected,
      actual,
      matches,
    };
  });

  return {
    entries,
    allMatch: entries.every((entry) => entry.matches),
  };
}

export async function loadGameLeaderboardPage(input: {
  gameMode: GameMode;
  gameIndex: number;
  page: number;
  pageSize: number;
}): Promise<LeaderboardPage> {
  if (!supabase) {
    return {
      entries: [],
      totalCount: 0,
    };
  }

  const safePage = Math.max(1, Math.floor(input.page));
  const safePageSize = Math.max(1, Math.floor(input.pageSize));

  const { data, error } = await supabase.rpc('get_game_leaderboard_page', {
    p_game_mode: input.gameMode,
    p_game_index: input.gameIndex,
    p_page: safePage,
    p_page_size: safePageSize,
  });

  if (error) {
    if (isTransientDatabaseError(error)) {
      return {
        entries: [],
        totalCount: 0,
      };
    }
    throw error;
  }

  const rows = (data ?? []) as Array<{
    rank: number;
    user_id: string;
    username: string | null;
    guess_count: number;
    finished_at: string;
    total_count: number;
  }>;

  return {
    entries: rows.map((row) => ({
      rank: Number(row.rank ?? 0),
      userId: row.user_id,
      username: row.username ?? 'unknown',
      guessCount: Number(row.guess_count ?? 0),
      finishedAt: row.finished_at,
    })),
    totalCount: Number(rows[0]?.total_count ?? 0),
  };
}

export async function loadGameLeaderboardPlacement(input: {
  gameMode: GameMode;
  gameIndex: number;
  userId: string;
}): Promise<LeaderboardEntry | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('get_game_leaderboard_placement', {
    p_game_mode: input.gameMode,
    p_game_index: input.gameIndex,
    p_user_id: input.userId,
  });

  if (error) {
    if (isTransientDatabaseError(error)) return null;
    throw error;
  }

  const row = (data?.[0] ?? null) as {
    rank: number;
    user_id: string;
    username: string | null;
    guess_count: number;
    finished_at: string;
  } | null;

  if (!row) return null;

  return {
    rank: Number(row.rank ?? 0),
    userId: row.user_id,
    username: row.username ?? 'unknown',
    guessCount: Number(row.guess_count ?? 0),
    finishedAt: row.finished_at,
  };
}

export async function loadUserProfile(userId: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, display_name, username, preferred_theme, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (isTransientDatabaseError(error)) return null;
    throw error;
  }

  return (data ?? null) as UserProfile | null;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'username' | 'preferred_theme' | 'display_name'>>,
) {
  if (!supabase) return null;

  const { data: updatedProfile, error: updateError } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select('id, display_name, username, preferred_theme, created_at, updated_at')
    .maybeSingle();

  if (updateError) {
    if (isTransientDatabaseError(updateError)) {
      throw new Error('Database is temporarily unavailable. Please try again.');
    }
    throw updateError;
  }

  if (updatedProfile) {
    return updatedProfile as UserProfile;
  }

  const fallbackUsername = `user_${userId.replace(/-/g, '').slice(0, 8).toLowerCase()}`;

  const insertPayload: Partial<
    Pick<UserProfile, 'id' | 'username' | 'preferred_theme' | 'display_name'>
  > = {
    id: userId,
    ...updates,
    username: updates.username ?? fallbackUsername,
  };

  const { data: insertedProfile, error: insertError } = await supabase
    .from('user_profiles')
    .insert(insertPayload)
    .select('id, display_name, username, preferred_theme, created_at, updated_at')
    .maybeSingle();

  if (insertError) {
    if (isTransientDatabaseError(insertError)) {
      throw new Error('Database is temporarily unavailable. Please try again.');
    }
    throw insertError;
  }

  return (insertedProfile ?? null) as UserProfile | null;
}

export async function deleteMyAccount() {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    if (isTransientDatabaseError(error)) {
      throw new Error('Database is temporarily unavailable. Please try again.');
    }
    throw error;
  }
}
