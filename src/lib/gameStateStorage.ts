export interface LocalGameStateSnapshot {
  guess: string;
  guesses: string[];
  gameOver: 0 | 1 | 2;
  gameIndex: number;
}

export interface StoredGameState extends LocalGameStateSnapshot {
  updatedAt: number;
  syncPending: boolean;
}

export function gameStateStorageKey(routeTitle: string) {
  return `${routeTitle}_game_state`;
}

export function clearStoredGameState(routeTitle: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(gameStateStorageKey(routeTitle));
}

export function readStoredGameState(routeTitle: string): StoredGameState | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(gameStateStorageKey(routeTitle));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    return {
      guess: typeof parsed?.guess === 'string' ? parsed.guess : '',
      guesses: Array.isArray(parsed?.guesses) ? parsed.guesses : [],
      gameOver: typeof parsed?.gameOver === 'number' ? parsed.gameOver : 0,
      gameIndex: typeof parsed?.gameIndex === 'number' ? parsed.gameIndex : -1,
      updatedAt: Number.isFinite(parsed?.updatedAt) ? parsed.updatedAt : 0,
      syncPending: parsed?.syncPending === true,
    };
  } catch {
    clearStoredGameState(routeTitle);
    return null;
  }
}

export function writeStoredGameState(routeTitle: string, state: StoredGameState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(gameStateStorageKey(routeTitle), JSON.stringify(state));
}
