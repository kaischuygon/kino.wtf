import { useEffect, useMemo, useState } from 'react';
import type { GameMode, LeaderboardEntry } from '../../../lib/gamePersistence';
import {
  loadGameLeaderboardPage,
  loadGameLeaderboardPlacement,
} from '../../../lib/gamePersistence';

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

  const activePage = showPagination ? page : 1;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    setPage(1);
  }, [gameMode, gameIndex]);

  useEffect(() => {
    let mounted = true;

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
      } catch {
        if (!mounted) return;
        setEntries([]);
        setTotalCount(0);
        setMyPlacement(null);
        setError('Could not load leaderboard right now.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [activePage, enabled, gameIndex, gameMode, pageSize, showCurrentUserPlacement, userId]);

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
          <p className="text-sm text-base-content/70">Leaderboard is unavailable in local-only mode.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 shadow">
      <div className="card-body p-3 gap-3">
        {showTitle ? <h3 className="font-display text-lg">{title}</h3> : null}

        {loading ? <span className="loading loading-spinner loading-sm self-center" /> : null}

        {error ? <p className="text-sm text-error text-center">{error}</p> : null}

        {!loading && !error && entries.length === 0 ? (
          <p className="text-sm text-base-content/70 text-center">No winners have finished yet.</p>
        ) : null}

        {entries.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => {
              const isMe = Boolean(userId && entry.userId === userId);

              return (
                <li
                  key={`${entry.rank}-${entry.userId}`}
                  className={[
                    'flex items-center justify-between rounded-box border px-3 py-2 text-sm',
                    isMe ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-100',
                  ].join(' ')}
                >
                  <span className="font-mono w-12">#{entry.rank}</span>
                  <span className="flex-1 truncate px-2">{entry.username}</span>
                  <span className="badge badge-success">{entry.guessCount}/6</span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {shouldAppendMyPlacement && myPlacement ? (
          <>
            <div className="divider my-0">...</div>
            <div className="flex items-center justify-between rounded-box border border-primary bg-primary/10 px-3 py-2 text-sm">
              <span className="font-mono w-12">#{myPlacement.rank}</span>
              <span className="flex-1 truncate px-2">{myPlacement.username}</span>
              <span className="badge badge-success">{myPlacement.guessCount}/6</span>
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
