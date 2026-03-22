import type { GameMode } from './gamePersistence';
import { supabase } from './supabase';

export interface GameData {
  answer: {
    id: number;
    title: string;
    image: string;
    URL: string;
  };
  hints: {
    title: string;
    image: string;
    link: string;
    year?: number;
  }[];
  trivia: {
    label: string;
    value: string;
  }[];
}

function isValidGameData(value: unknown): value is GameData {
  if (!value || typeof value !== 'object') return false;
  const game = value as GameData;
  return Boolean(game.answer?.title && Array.isArray(game.hints) && Array.isArray(game.trivia));
}

export async function loadPublicGameCatalog(input: { gameMode: GameMode; maxIndex?: number | null }) {
  if (!supabase) return [] as GameData[];

  const { data, error } = await supabase.rpc('get_public_game_catalog', {
    p_game_mode: input.gameMode,
    p_max_index:
      typeof input.maxIndex === 'number' && Number.isFinite(input.maxIndex)
        ? Math.max(0, Math.floor(input.maxIndex))
        : null,
  });

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    game_index: number;
    game_data: unknown;
  }>;

  return rows
    .sort((left, right) => Number(left.game_index ?? 0) - Number(right.game_index ?? 0))
    .map((row) => row.game_data)
    .filter(isValidGameData);
}
