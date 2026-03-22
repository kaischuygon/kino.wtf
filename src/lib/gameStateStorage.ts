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

function normalizeStorageScope(scopeKey?: string | null) {
  const trimmed = typeof scopeKey === 'string' ? scopeKey.trim() : '';
  if (!trimmed) return 'local';
  return trimmed;
}

export function gameStateStorageKey(routeTitle: string, scopeKey?: string | null) {
  const scope = normalizeStorageScope(scopeKey);
  return `game_state:${routeTitle}:${scope}`;
}

export function clearStoredGameState(routeTitle: string, scopeKey?: string | null) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(gameStateStorageKey(routeTitle, scopeKey));
}

export function readStoredGameState(routeTitle: string, scopeKey?: string | null): StoredGameState | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(gameStateStorageKey(routeTitle, scopeKey));
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
    clearStoredGameState(routeTitle, scopeKey);
    return null;
  }
}

export function writeStoredGameState(routeTitle: string, state: StoredGameState, scopeKey?: string | null) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(gameStateStorageKey(routeTitle, scopeKey), JSON.stringify(state));
}
