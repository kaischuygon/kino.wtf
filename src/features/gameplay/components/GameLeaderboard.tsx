import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameMode, LeaderboardEntry } from '../../../lib/gamePersistence';
import {
  loadGameLeaderboardPage,
  loadGameLeaderboardPlacement,
} from '../../../lib/gamePersistence';
import {
  LEADERBOARD_UPDATED_EVENT,
  type LeaderboardUpdatedDetail,
} from '../../../lib/leaderboardEvents';

interface GameLeaderboardProps {
  gameMode: GameMode;
  gameIndex: number;
  userId?: string | null;
  enabled: boolean;
  pageSize?: number;
  showPagination?: boolean;
  showCurrentUserPlacement?: boolean;
  title?: string;
  showTitle?: boolean;
}

export default function GameLeaderboard({
  gameMode,
  gameIndex,
  userId,
  enabled,
  pageSize = 5,
  showPagination = false,
  showCurrentUserPlacement = false,
  title = 'Leaderboard',
  showTitle = true,
}: GameLeaderboardProps) {
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [myPlacement, setMyPlacement] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUpdatedState, setShowUpdatedState] = useState(false);
  const eventRefreshPendingRef = useRef(false);

  const activePage = showPagination ? page : 1;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    setPage(1);
  }, [gameMode, gameIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onLeaderboardUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<LeaderboardUpdatedDetail>;
      if (!customEvent.detail) return;
      if (customEvent.detail.gameMode !== gameMode) return;
      if (customEvent.detail.gameIndex !== gameIndex) return;

      eventRefreshPendingRef.current = true;
      setIsRefreshing(true);
      setRefreshNonce((value) => value + 1);
    };

    window.addEventListener(LEADERBOARD_UPDATED_EVENT, onLeaderboardUpdated as EventListener);

    return () => {
      window.removeEventListener(LEADERBOARD_UPDATED_EVENT, onLeaderboardUpdated as EventListener);
    };
  }, [gameIndex, gameMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!showUpdatedState) return;

    const timer = window.setTimeout(() => {
      setShowUpdatedState(false);
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [showUpdatedState]);

  useEffect(() => {
    let mounted = true;
    const wasEventRefresh = eventRefreshPendingRef.current;
    let refreshSucceeded = false;

    if (!enabled) {
      setEntries([]);
      setTotalCount(0);
      setMyPlacement(null);
      setError(null);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const [pageData, placementData] = await Promise.all([
          loadGameLeaderboardPage({
            gameMode,
            gameIndex,
            page: activePage,
            pageSize,
          }),
          showCurrentUserPlacement && userId
            ? loadGameLeaderboardPlacement({
                gameMode,
                gameIndex,
                userId,
              })
            : Promise.resolve(null),
        ]);

        if (!mounted) return;

        setEntries(pageData.entries);
        setTotalCount(pageData.totalCount);
        setMyPlacement(placementData);
        refreshSucceeded = true;
      } catch {
        if (!mounted) return;
        setEntries([]);
        setTotalCount(0);
        setMyPlacement(null);
        setError('Could not load leaderboard right now.');
      } finally {
        if (mounted) {
          setLoading(false);
          if (wasEventRefresh) {
            eventRefreshPendingRef.current = false;
            setIsRefreshing(false);
            setShowUpdatedState(refreshSucceeded);
          }
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [
    activePage,
    enabled,
    gameIndex,
    gameMode,
    pageSize,
    refreshNonce,
    showCurrentUserPlacement,
    userId,
  ]);

  const visibleUserIds = useMemo(() => new Set(entries.map((entry) => entry.userId)), [entries]);

  const shouldAppendMyPlacement = Boolean(
    showCurrentUserPlacement &&
    myPlacement &&
    myPlacement.rank > 5 &&
    (userId ? !visibleUserIds.has(userId) : true),
  );

  if (!enabled) {
    return (
      <div className="card bg-base-200 shadow">
        <div className="card-body p-3 text-center">
          <p className="text-sm text-base-content/70">
            Leaderboard is unavailable in local-only mode.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 shadow">
      <div className="card-body p-3 gap-3">
        {showTitle ? <h3 className="font-display text-lg">{title}</h3> : null}

        {isRefreshing || showUpdatedState ? (
          <p className="text-[11px] text-base-content/60 text-right" aria-live="polite">
            {isRefreshing ? 'Updating leaderboard...' : 'Leaderboard updated'}
          </p>
        ) : null}

        {loading ? <span className="loading loading-spinner loading-sm self-center" /> : null}

        {error ? <p className="text-sm text-error text-center">{error}</p> : null}

        {!loading && !error && entries.length === 0 ? (
          <p className="text-sm text-base-content/70 text-center">No leaderboard entries yet.</p>
        ) : null}

        {entries.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => {
              const isMe = Boolean(userId && entry.userId === userId);
              const isLoss = !entry.didWin;

              return (
                <li
                  key={`${entry.rank}-${entry.userId}`}
                  className={[
                    'flex items-center justify-between rounded-box border px-3 py-2 text-sm',
                    isLoss
                      ? 'border-error/40 bg-error/10'
                      : isMe
                        ? 'border-primary bg-primary/10'
                        : 'border-base-300 bg-base-100',
                    isMe ? 'ring-1 ring-primary/40' : '',
                  ].join(' ')}
                >
                  <span className="font-mono w-12">#{entry.rank}</span>
                  <span className="flex-1 truncate px-2">{entry.username}</span>
                  <span className={['badge', isLoss ? 'badge-error' : 'badge-success'].join(' ')}>
                    {isLoss ? 'X/6' : `${entry.guessCount ?? 0}/6`}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {shouldAppendMyPlacement && myPlacement ? (
          <>
            <div className="divider my-0">...</div>
            <div
              className={[
                'flex items-center justify-between rounded-box border px-3 py-2 text-sm ring-1 ring-primary/40',
                myPlacement.didWin ? 'border-primary bg-primary/10' : 'border-error/40 bg-error/10',
              ].join(' ')}
            >
              <span className="font-mono w-12">#{myPlacement.rank}</span>
              <span className="flex-1 truncate px-2">{myPlacement.username}</span>
              <span
                className={['badge', myPlacement.didWin ? 'badge-success' : 'badge-error'].join(
                  ' ',
                )}
              >
                {myPlacement.didWin ? `${myPlacement.guessCount ?? 0}/6` : 'X/6'}
              </span>
            </div>
          </>
        ) : null}

        {showPagination && totalCount > pageSize ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={activePage <= 1}
            >
              Prev
            </button>
            <span className="text-xs text-base-content/70">
              Page {activePage} / {pageCount}
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
              disabled={activePage >= pageCount}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
