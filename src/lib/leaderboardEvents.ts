import type { GameMode } from './gamePersistence';

export const LEADERBOARD_UPDATED_EVENT = 'kino:leaderboard-updated';

export interface LeaderboardUpdatedDetail {
  gameMode: GameMode;
  gameIndex: number;
}

export function emitLeaderboardUpdated(detail: LeaderboardUpdatedDetail) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<LeaderboardUpdatedDetail>(LEADERBOARD_UPDATED_EVENT, {
      detail,
    }),
  );
}
