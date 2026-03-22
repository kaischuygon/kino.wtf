import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import useModal from '../../../hooks/useModal';
import routes from '../../../routes';
import { getGameIndex } from '../../../helpers/gameHelpers';
import useAuth from '../../../hooks/useAuth';
import { toGameMode } from '../../../lib/gameMode';
import { readStoredGameState } from '../../../lib/gameStateStorage';
import GameHistoryPagination from './GameHistoryPagination';
import {
  loadGameState,
  loadPlayedGames,
  type PersistedGameState,
} from '../../../lib/gamePersistence';
import { FaArchive } from 'react-icons/fa';

type Status = 'win' | 'loss' | 'in-progress' | 'unplayed';

function toStatusClass(status: Status) {
  if (status === 'win') return 'btn-success';
  if (status === 'loss') return 'btn-error';
  if (status === 'in-progress') return 'btn-warning';
  return 'btn-ghost';
}

function toStatusLabel(status: Status) {
  if (status === 'win') return 'Win';
  if (status === 'loss') return 'Loss';
  if (status === 'in-progress') return 'In Progress';
  return 'Unplayed';
}

function toStatusSymbol(status: Status) {
  if (status === 'win') return '✓';
  if (status === 'loss') return '✕';
  if (status === 'in-progress') return '…';
  return '○';
}

export default function GameHistoryModal() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const selectedGameIndex = useRouterState({
    select: (state) => {
      const search = state.location.search as Record<string, unknown>;
      const raw = search?.game;
      const parsed =
        typeof raw === 'number'
          ? raw
          : typeof raw === 'string' && raw.trim() !== ''
            ? Number(raw)
            : undefined;

      if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed < 1) {
        return null;
      }

      return Math.floor(parsed) - 1;
    },
  });
  const { Modal, open, close } = useModal();
  const { user, isConfigured } = useAuth();
  const storageScopeKey = isConfigured ? (user?.id ?? 'signed_out') : 'local';
  const itemsPerPage = 24;

  const [playedLookupByMode, setPlayedLookupByMode] = useState<Record<
    string,
    Record<number, 'win' | 'loss'>
  > | null>(null);
  const [remoteStateByMode, setRemoteStateByMode] = useState<
    Record<string, PersistedGameState | null>
  >({});
  const [page, setPage] = useState(0);
  const [openTick, setOpenTick] = useState(0);
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const route = useMemo(() => routes.find((entry) => entry.link === pathname) ?? null, [pathname]);
  const canShow = Boolean(route && route.frequency !== null && route.title !== 'home');
  const gameMode = route ? toGameMode(route.title) : null;
  const currentIndex = useSyncExternalStore(
    () => () => undefined,
    () => (route ? getGameIndex(route) : 0),
    () => 0,
  );
  const localState = useMemo(() => {
    if (!isHydrated || !route) return null;
    void openTick;
    return readStoredGameState(route.title, storageScopeKey);
  }, [isHydrated, openTick, route, storageScopeKey]);

  useEffect(() => {
    let mounted = true;

    if (!isConfigured || !user) {
      return () => {
        mounted = false;
      };
    }

    Promise.all([
      loadPlayedGames(user.id, 500),
      gameMode ? loadGameState(user.id, gameMode) : Promise.resolve(null),
    ])
      .then(([records, remoteState]) => {
        if (!mounted) return;

        const nextLookupByMode: Record<string, Record<number, 'win' | 'loss'>> = {};
        for (const record of records) {
          const bucket = nextLookupByMode[record.game_mode] ?? {};
          bucket[record.game_index] = record.did_win ? 'win' : 'loss';
          nextLookupByMode[record.game_mode] = bucket;
        }
        setPlayedLookupByMode(nextLookupByMode);

        if (gameMode) {
          setRemoteStateByMode((current) => ({
            ...current,
            [gameMode]: remoteState,
          }));
        }
      })
      .catch(() => {
        if (!mounted) return;
        setPlayedLookupByMode({});

        if (gameMode) {
          setRemoteStateByMode((current) => ({
            ...current,
            [gameMode]: null,
          }));
        }
      });

    return () => {
      mounted = false;
    };
  }, [gameMode, isConfigured, user]);

  if (!canShow || !route) return null;

  const playedLookup = Object.entries(playedLookupByMode?.[route.title] ?? {}).reduce<
    Record<number, 'win' | 'loss'>
  >((acc, [rawIndex, status]) => {
    const parsedIndex = Number(rawIndex);
    if (!Number.isFinite(parsedIndex)) return acc;
    if (parsedIndex < 0 || parsedIndex > currentIndex) return acc;
    acc[parsedIndex] = status;
    return acc;
  }, {});
  const playedCount = Object.keys(playedLookup).length;
  const remoteState = gameMode ? (remoteStateByMode[gameMode] ?? null) : null;
  const isLoadingHistory = Boolean(isConfigured && user && playedLookupByMode === null);
  const allIndices = Array.from({ length: currentIndex + 1 }, (_value, idx) => currentIndex - idx);
  const pageCount = Math.max(1, Math.ceil(allIndices.length / itemsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * itemsPerPage;
  const indices = allIndices.slice(pageStart, pageStart + itemsPerPage);

  /**
   * Active-game targeting is URL-first so navigation intent always wins over persisted progress.
   * This keeps the history modal aligned with the currently selected game context.
   */
  const activeGameIndex =
    typeof selectedGameIndex === 'number'
      ? Math.max(0, Math.min(selectedGameIndex, currentIndex))
      : currentIndex;
  const activeGamePosition = Math.max(0, currentIndex - activeGameIndex);
  const activeGamePage = Math.min(pageCount - 1, Math.floor(activeGamePosition / itemsPerPage));

  const getStatus = (index: number): Status => {
    /**
     * Status precedence:
     * 1) `played_games` archive (completed source of truth)
     * 2) local draft for current mode/index
     * 3) remote `game_state` fallback
     */
    if (playedLookup[index]) {
      return playedLookup[index];
    }

    if (localState?.gameIndex === index) {
      if (localState.gameOver === 2) return 'win';
      if (localState.gameOver === 1) return 'loss';
      if ((localState.guesses?.length ?? 0) > 0) return 'in-progress';
    }

    if (remoteState?.game_index === index) {
      if (remoteState.game_over === 2) return 'win';
      if (remoteState.game_over === 1) return 'loss';
      if ((remoteState.guesses?.length ?? 0) > 0) return 'in-progress';
    }

    return 'unplayed';
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-square tooltip"
        data-tip="Archive"
        onClick={() => {
          setOpenTick((value) => value + 1);
          setPage(activeGamePage);
          open();
        }}
      >
        <FaArchive />
      </button>
      <Modal className="w-full max-w-xl">
        <h2 className="font-display text-xl mb-2">
          {route.emoji} {route.title} history
        </h2>
        <p className="text-sm mb-3">Jump to previous games. Symbols reflect your current state.</p>
        <p className="text-xs text-base-content/70 mb-3">
          Historical games can still be completed for your archive and stats, but only the live
          current game is eligible for leaderboard placement.
        </p>
        {isLoadingHistory ? (
          <div className="flex items-center gap-2 text-sm text-base-content/70 mb-3">
            <span className="loading loading-spinner loading-sm" />
            Loading history...
          </div>
        ) : null}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="badge badge-success">✓ Win</div>
          <div className="badge badge-error">✕ Loss</div>
          <div className="badge badge-warning">… In Progress</div>
          <div className="badge badge-ghost">○ Unplayed</div>
        </div>
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="text-xs text-base-content/70 flex flex-col">
            <p>
              Page {safePage + 1} of {pageCount}
            </p>
            <p>Played total: {playedCount}</p>
          </div>
          <GameHistoryPagination safePage={safePage} pageCount={pageCount} setPage={setPage} />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-96 overflow-auto p-1">
          {indices.map((index) => {
            const status = getStatus(index);
            return (
              <button
                type="button"
                key={index}
                className={[
                  'btn btn-md min-h-12 justify-between',
                  toStatusClass(status),
                  index === activeGameIndex ? 'ring-2 ring-base-content' : '',
                ].join(' ')}
                onClick={() => {
                  navigate({ to: route.link, search: { game: index + 1 } });
                  close();
                }}
              >
                <span>#{index + 1}</span>
                <span
                  className="text-sm opacity-90"
                  aria-label={toStatusLabel(status)}
                  title={toStatusLabel(status)}
                >
                  {toStatusSymbol(status)}
                </span>
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
