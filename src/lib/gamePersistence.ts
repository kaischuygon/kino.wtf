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
