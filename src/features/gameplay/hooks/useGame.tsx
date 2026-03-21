import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ExpandableModal from '../../../components/ExpandableModal';
import Countdown from '../components/Countdown';
import RouteLinks from '../../../components/RouteLinks';
import DisplayStats from '../components/DisplayStats';
import ShareButton from '../components/ShareButton';
import GuessBox from '../components/GuessBox';
import LoadingImage from '../components/LoadingImage';
import GameLeaderboard from '../components/GameLeaderboard';

import type { GameStats } from '../components/DisplayStats';
import type { Route } from '../../../routes';
import useAuth from '../../../hooks/useAuth';
import {
  loadPlayedGameForIndex,
  loadGameState,
  loadGameStats,
  recordPlayedGame,
  saveGameState,
  saveGameStats,
  validateGameStatsIntegrity,
} from '../../../lib/gamePersistence';
import { toGameMode } from '../../../lib/gameMode';
import {
  clearStoredGameState,
  readStoredGameState,
  writeStoredGameState,
  type StoredGameState,
} from '../../../lib/gameStateStorage';

interface Game {
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

function areStatsEqual(a: GameStats, b: GameStats) {
  return (
    a.gamesPlayed === b.gamesPlayed &&
    a.gamesWon === b.gamesWon &&
    a.streak === b.streak &&
    a.maxStreak === b.maxStreak
  );
}

function stateSignature(input: {
  gameIndex: number;
  guess: string;
  guesses: string[];
  gameOver: 0 | 1 | 2;
}) {
  return JSON.stringify([
    input.gameIndex,
    input.gameOver,
    input.guess,
    input.guesses.length,
    input.guesses,
  ]);
}

function normalizeWinningGuessesForDisplay(params: {
  guesses: string[];
  didWin: boolean;
  answerTitle: string;
}) {
  const { guesses, didWin, answerTitle } = params;
  const nextGuesses = Array.isArray(guesses) ? [...guesses] : [];

  if (!didWin) return nextGuesses;

  const hasCorrectGuess = nextGuesses.some(
    (entry) => entry?.toLowerCase() === answerTitle.toLowerCase(),
  );
  if (hasCorrectGuess) return nextGuesses;

  const patchIndex = Math.max(0, Math.min(5, nextGuesses.length - 1));
  if (nextGuesses.length === 0) {
    nextGuesses.push(answerTitle);
    return nextGuesses;
  }

  nextGuesses[patchIndex] = answerTitle;
  return nextGuesses;
}

export default function useGame(
  route: Route,
  games: Game[],
  gameIndex: number,
  onOpenLeaderboard?: () => void,
) {
  const { user, isConfigured } = useAuth();
  const gameMode = toGameMode(route.title);
  const currentStatsBootstrapKey =
    isConfigured && user && gameMode ? `${user.id}:${gameMode}` : null;
  const currentCompletionBootstrapKey =
    isConfigured && user && gameMode ? `${user.id}:${gameMode}:${gameIndex}` : null;

  /**
   * Local cache snapshot for the selected game index.
   *
   * Contract:
   * - This cache is a draft buffer, not the canonical persisted record.
   * - If the stored index does not match the currently selected index, it is discarded.
   */
  const savedStateSnapshot: StoredGameState = useMemo(() => {
    const canUseStorage = typeof window !== 'undefined';
    const defaultState: StoredGameState = {
      guess: '',
      guesses: [],
      gameOver: 0,
      gameIndex: gameIndex,
      updatedAt: 0,
      syncPending: false,
    };

    if (!canUseStorage) return defaultState;

    const parsed = readStoredGameState(route.title);
    if (!parsed) return defaultState;

    if (parsed.gameIndex !== gameIndex) {
      clearStoredGameState(route.title);
      return defaultState;
    }

    return {
      guess: parsed.guess,
      guesses: parsed.guesses,
      gameOver: parsed.gameOver,
      gameIndex: parsed.gameIndex,
      updatedAt: parsed.updatedAt,
      syncPending: parsed.syncPending,
    };
  }, [route, gameIndex]);

  const savedStats: GameStats = useMemo(() => {
    const canUseStorage = typeof window !== 'undefined';
    const defaultStats: GameStats = {
      gamesPlayed: 0,
      gamesWon: 0,
      streak: 0,
      maxStreak: 0,
    };

    if (!canUseStorage) return defaultStats;

    const key = `${route.title}_stats`;
    const raw = localStorage.getItem(key);
    if (!raw) return defaultStats;

    try {
      const parsed = JSON.parse(raw);
      return {
        gamesPlayed: Number.isFinite(parsed?.gamesPlayed) ? parsed.gamesPlayed : 0,
        gamesWon: Number.isFinite(parsed?.gamesWon) ? parsed.gamesWon : 0,
        streak: Number.isFinite(parsed?.streak) ? parsed.streak : 0,
        maxStreak: Number.isFinite(parsed?.maxStreak) ? parsed.maxStreak : 0,
      };
    } catch {
      localStorage.removeItem(key);
      return defaultStats;
    }
  }, [route]);

  const [guess, setGuess] = useState<string>(savedStateSnapshot.guess);
  const [guesses, setGuesses] = useState<string[]>(savedStateSnapshot.guesses);
  const [gameOver, setGameOver] = useState<0 | 1 | 2>(savedStateSnapshot.gameOver);
  const [stats, setStats] = useState<GameStats>(savedStats);
  const [isSyncPending, setIsSyncPending] = useState<boolean>(savedStateSnapshot.syncPending);
  const [statsBootstrapReadyKey, setStatsBootstrapReadyKey] = useState<string | null>(null);
  const [completionBootstrapReadyKey, setCompletionBootstrapReadyKey] = useState<string | null>(
    null,
  );
  const completionAlreadyAccountedRef = useRef<boolean>(savedStateSnapshot.gameOver > 0);
  const initialRemoteStatsRef = useRef<GameStats | null>(null);
  const remoteStateRef =
    useRef<ReturnType<typeof loadGameState> extends Promise<infer T> ? T : null>(null);
  const lastPersistedStateSignatureRef = useRef<string | null>(null);
  const inFlightStateSignatureRef = useRef<string | null>(null);
  const saveDebounceTimerRef = useRef<number | null>(null);
  const statsIntegrityCheckedKeyRef = useRef<string | null>(null);
  const localUpdatedAtRef = useRef<number>(savedStateSnapshot.updatedAt);
  const localSyncPendingRef = useRef<boolean>(savedStateSnapshot.syncPending);
  const guessOptions = useMemo(
    () =>
      games
        .map((entry) => entry?.answer?.title)
        .filter((title): title is string => Boolean(title))
        .sort(),
    [games],
  );

  const game: Game = games[gameIndex % games.length];
  const isCompletionHydrated =
    !currentCompletionBootstrapKey || completionBootstrapReadyKey === currentCompletionBootstrapKey;

  /**
   * Bootstrap local state from remote storage and apply deterministic conflict resolution.
   *
   * Priority rules:
   * 1) Remote completed state wins over local in-progress state.
   * 2) Otherwise, remote state hydrates when local data is not marked sync-pending and remote
   *    has at least as much guess progress.
   *
   * This keeps DB as canonical while preserving local responsiveness/offline edits.
   */
  useEffect(() => {
    let mounted = true;

    if (!isConfigured || !user || !gameMode) {
      return () => {
        mounted = false;
      };
    }

    loadGameState(user.id, gameMode)
      .then((remoteState) => {
        if (!mounted) return;

        remoteStateRef.current = remoteState;

        if (remoteState?.game_index === gameIndex) {
          const localGuessCount = savedStateSnapshot.guesses.length;
          const remoteGuesses = Array.isArray(remoteState.guesses) ? remoteState.guesses : [];
          const remoteGuessCount = remoteGuesses.length;
          const localCompleted = savedStateSnapshot.gameOver > 0;
          const remoteCompleted = (remoteState.game_over ?? 0) > 0;

          const shouldUseRemote =
            (remoteCompleted && !localCompleted) ||
            (!localSyncPendingRef.current && remoteGuessCount >= localGuessCount);

          if (shouldUseRemote) {
            setGuess(remoteState.guess ?? '');
            setGuesses(remoteGuesses);
            setGameOver(remoteState.game_over ?? 0);
            if ((remoteState.game_over ?? 0) > 0) {
              completionAlreadyAccountedRef.current = true;
            }

            localSyncPendingRef.current = false;
            setIsSyncPending(false);
            localUpdatedAtRef.current = Date.now();
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load remote game state', error);
      });

    loadPlayedGameForIndex({ userId: user.id, gameMode, gameIndex })
      .then((playedRecord) => {
        if (!mounted || !playedRecord) return;

        // Archive completion is canonical for resolved games.
        const normalizedGuesses = normalizeWinningGuessesForDisplay({
          guesses: Array.isArray(playedRecord.guesses) ? playedRecord.guesses : [],
          didWin: playedRecord.did_win,
          answerTitle: game.answer.title,
        });

        setGuess('');
        setGuesses(normalizedGuesses);
        setGameOver(playedRecord.did_win ? 2 : 1);
        completionAlreadyAccountedRef.current = true;
        localSyncPendingRef.current = false;
        setIsSyncPending(false);
        localUpdatedAtRef.current = Date.now();
      })
      .catch((error) => {
        console.error('Failed to load played game archive state', error);
      })
      .finally(() => {
        if (!mounted) return;
        setCompletionBootstrapReadyKey(`${user.id}:${gameMode}:${gameIndex}`);
      });

    loadGameStats(user.id, gameMode)
      .then((remoteStats) => {
        if (!mounted || !remoteStats) return;
        initialRemoteStatsRef.current = {
          gamesPlayed: remoteStats.gamesPlayed,
          gamesWon: remoteStats.gamesWon,
          streak: remoteStats.streak,
          maxStreak: remoteStats.maxStreak,
        };
        setStats({
          gamesPlayed: remoteStats.gamesPlayed,
          gamesWon: remoteStats.gamesWon,
          streak: remoteStats.streak,
          maxStreak: remoteStats.maxStreak,
        });
      })
      .catch((error) => {
        console.error('Failed to load remote stats', error);
      })
      .finally(() => {
        if (!mounted) return;
        setStatsBootstrapReadyKey(`${user.id}:${gameMode}`);
      });

    return () => {
      mounted = false;
    };
  }, [
    gameIndex,
    gameMode,
    isConfigured,
    savedStateSnapshot.gameOver,
    savedStateSnapshot.guesses,
    user,
    game.answer.title,
  ]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!isConfigured || !user || !gameMode) return;

    const key = `${user.id}:all-modes`;
    if (statsIntegrityCheckedKeyRef.current === key) return;
    statsIntegrityCheckedKeyRef.current = key;

    validateGameStatsIntegrity(user.id)
      .then((report) => {
        const mismatches = report.entries.filter((entry) => !entry.matches);
        if (mismatches.length === 0) return;
        console.warn('Game stats integrity mismatch detected', mismatches);
      })
      .catch((error) => {
        console.warn('Failed to run stats integrity validation', error);
      });
  }, [gameMode, isConfigured, user]);

  // Save stats to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${route.title}_stats`, JSON.stringify(stats));
  }, [stats, route]);

  useEffect(() => {
    if (!isConfigured || !user || !gameMode) return;
    if (!currentStatsBootstrapKey || statsBootstrapReadyKey !== currentStatsBootstrapKey) return;

    const initialRemoteStats = initialRemoteStatsRef.current;
    if (initialRemoteStats && areStatsEqual(initialRemoteStats, stats)) {
      initialRemoteStatsRef.current = null;
      return;
    }

    saveGameStats(user.id, gameMode, stats).catch((error) => {
      console.error('Failed to save remote stats', error);
    });
  }, [currentStatsBootstrapKey, gameMode, isConfigured, stats, statsBootstrapReadyKey, user]);

  const updateStats = useCallback((gameStatus: number) => {
    setStats((currentStats) => {
      const newGamesPlayed = currentStats.gamesPlayed + 1;
      const newGamesWon = gameStatus === 2 ? currentStats.gamesWon + 1 : currentStats.gamesWon;
      const newStreak = gameStatus === 2 ? currentStats.streak + 1 : 0;
      const newMaxStreak = newStreak > currentStats.maxStreak ? newStreak : currentStats.maxStreak;

      return {
        gamesPlayed: newGamesPlayed,
        gamesWon: newGamesWon,
        streak: newStreak,
        maxStreak: newMaxStreak,
      };
    });
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    localUpdatedAtRef.current = now;
    localSyncPendingRef.current = true;

    const state: StoredGameState = {
      guess: guess,
      guesses: guesses,
      gameIndex: gameIndex,
      gameOver: gameOver,
      updatedAt: now,
      syncPending: true,
    };

    writeStoredGameState(route.title, state);
  }, [guess, guesses, gameOver, game, route, gameIndex]);

  useEffect(() => {
    if (!isConfigured || !user || !gameMode) return;

    /**
     * Guard against downgrading a remote completed record with a local in-progress snapshot.
     * This can happen after reconnect/reload when local draft lags behind server truth.
     */
    const knownRemote = remoteStateRef.current;
    const remoteIsCompletedSameGame = Boolean(
      knownRemote && knownRemote.game_index === gameIndex && (knownRemote.game_over ?? 0) > 0,
    );
    if (remoteIsCompletedSameGame && gameOver === 0) {
      return;
    }

    const nextSignature = stateSignature({ gameIndex, guess, guesses, gameOver });
    if (nextSignature === lastPersistedStateSignatureRef.current) {
      return;
    }
    if (nextSignature === inFlightStateSignatureRef.current) {
      return;
    }

    if (
      knownRemote &&
      knownRemote.game_index === gameIndex &&
      stateSignature({
        gameIndex,
        guess: knownRemote.guess ?? '',
        guesses: Array.isArray(knownRemote.guesses) ? knownRemote.guesses : [],
        gameOver: (knownRemote.game_over ?? 0) as 0 | 1 | 2,
      }) === nextSignature
    ) {
      lastPersistedStateSignatureRef.current = nextSignature;
      return;
    }

    const nextState = {
      user_id: user.id,
      game_mode: gameMode,
      game_index: gameIndex,
      guess,
      guesses,
      game_over: gameOver,
    } as const;

    if (typeof window !== 'undefined' && saveDebounceTimerRef.current !== null) {
      window.clearTimeout(saveDebounceTimerRef.current);
    }

    if (typeof window === 'undefined') return;

    saveDebounceTimerRef.current = window.setTimeout(() => {
      inFlightStateSignatureRef.current = nextSignature;

      saveGameState(nextState)
        .then(() => {
          remoteStateRef.current = nextState;
          lastPersistedStateSignatureRef.current = nextSignature;
          inFlightStateSignatureRef.current = null;
          localSyncPendingRef.current = false;
          setIsSyncPending(false);

          const parsed = readStoredGameState(route.title);
          if (!parsed) return;

          const sameState =
            parsed.gameIndex === gameIndex &&
            parsed.gameOver === gameOver &&
            parsed.guess === guess &&
            parsed.guesses.length === guesses.length &&
            parsed.guesses.every((entry: string, idx: number) => entry === guesses[idx]);

          if (!sameState) return;

          const synced: StoredGameState = {
            guess,
            guesses,
            gameIndex: gameIndex,
            gameOver,
            updatedAt: localUpdatedAtRef.current,
            syncPending: false,
          };

          writeStoredGameState(route.title, synced);
        })
        .catch((error) => {
          inFlightStateSignatureRef.current = null;
          console.error('Failed to save remote game state', error);
        });
    }, 250);

    return () => {
      if (saveDebounceTimerRef.current !== null) {
        window.clearTimeout(saveDebounceTimerRef.current);
      }
    };
  }, [gameMode, gameIndex, gameOver, guess, guesses, isConfigured, route.title, user]);

  useEffect(() => {
    if (!isConfigured || !user || !gameMode) return;
    if (gameOver === 0) return;

    recordPlayedGame({
      userId: user.id,
      gameMode,
      gameIndex,
      answerTitle: game.answer.title,
      didWin: gameOver === 2,
      guesses,
    }).catch((error) => {
      console.error('Failed to record played game', error);
    });
  }, [game.answer.title, gameIndex, gameMode, gameOver, guesses, isConfigured, user]);

  // Listen for guesses
  function onGuess(newGuess: string) {
    if (gameOver > 0) return;
    if (!isCompletionHydrated) return;

    setGuesses((g) => {
      const next = [...g, newGuess];

      if (newGuess.toLowerCase() === game.answer.title.toLowerCase()) {
        if (!completionAlreadyAccountedRef.current) {
          completionAlreadyAccountedRef.current = true;
          updateStats(2);
        }
        setIsSyncPending(true);
        setGameOver(2);
      } else if (next.length >= 6) {
        if (!completionAlreadyAccountedRef.current) {
          completionAlreadyAccountedRef.current = true;
          updateStats(1);
        }
        setIsSyncPending(true);
        setGameOver(1);
      }

      return next;
    });

    setGuess('');
  }

  function handleGiveUp() {
    if (gameOver > 0) return;
    if (!isCompletionHydrated) return;

    setGuesses((g) => [...g, ...Array.from({ length: Math.max(0, 6 - g.length) }, () => '')]);
    if (!completionAlreadyAccountedRef.current) {
      completionAlreadyAccountedRef.current = true;
      updateStats(1);
    }
    setIsSyncPending(true);
    setGameOver(1);
    setGuess('');
  }

  const gameBoard = (
    <section className="flex flex-col gap-2 text-sm my-2">
      {gameOver > 0 && (
        <>
          <div className="card card-side bg-base-200 shadow">
            <figure className="w-1/3">
              <ExpandableModal>
                <div>
                  <LoadingImage
                    key={game.answer.image}
                    src={game.answer.image}
                    alt={game.answer.title}
                    wrapperClassName="w-full"
                  />
                </div>
              </ExpandableModal>
            </figure>
            <div className="card-body text-center">
              <h2 className="font-display card-title justify-center">
                {gameOver == 1 ? '😔 You lost 😔' : '🎉 You won! 🎉'}
              </h2>
              <p>
                The answer was:{' '}
                <a
                  className="link link-primary"
                  href={game.answer.URL}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {game.answer.title}
                </a>
              </p>
              <p>Next game in:</p>
              <p>
                <Countdown frequency={route.frequency} />
              </p>
            </div>
          </div>

          <DisplayStats stats={stats} />

          <ShareButton
            guesses={guesses}
            day={gameIndex + 1}
            answer={game.answer.title}
            route={route}
          />

          {isConfigured && user && isSyncPending ? (
            <div className="alert alert-info py-2 text-sm">
              <span className="loading loading-spinner loading-xs" />
              <span>Syncing from cloud...</span>
            </div>
          ) : null}

          {gameMode ? (
            <GameLeaderboard
              enabled={isConfigured}
              gameMode={gameMode}
              gameIndex={gameIndex}
              userId={user?.id ?? null}
              pageSize={5}
              showCurrentUserPlacement
              title="Today's Top 5"
            />
          ) : null}

          {gameMode && onOpenLeaderboard ? (
            <button className="btn btn-outline w-full" onClick={onOpenLeaderboard} type="button">
              View Full Leaderboard
            </button>
          ) : null}

          <h2 className="text-xl font-medium text-center">More games:</h2>
          <RouteLinks />
        </>
      )}

      <h4>
        <b>Hints:</b>&nbsp;({guesses.length + 1 > 6 ? '6' : guesses.length + 1}/6)
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {game?.hints.map((hint, i) => (
          <ExpandableModal key={i} disabled={guesses.length < i && !gameOver}>
            <div
              className={[
                'card',
                guesses.length < i && !gameOver ? '**:opacity-0 select-none' : '',
              ].join('\x20')}
            >
              <figure className="w-full">
                <LoadingImage
                  key={hint.image}
                  src={hint.image}
                  alt={hint.title}
                  wrapperClassName="w-full"
                />
              </figure>
              <div className="card-body text-center p-1">
                {gameOver > 0 ? (
                  <a
                    className="text-wrap link"
                    href={hint.link}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {hint.title}
                    {hint.year ? `\x20(${hint.year})` : ''}
                  </a>
                ) : (
                  <span className="text-wrap">
                    {hint.title}
                    {hint.year ? `\x20(${hint.year})` : ''}
                  </span>
                )}
              </div>
            </div>
          </ExpandableModal>
        ))}
      </div>

      <h4>
        <b>Trivia:</b>&nbsp;({Math.ceil(guesses.length / 2)}/3)
      </h4>
      <ul className="flex flex-wrap gap-2 justify-center">
        {game.trivia?.map((t, i) => (
          <li
            key={i}
            className={[
              'badge shadow max-w-full h-fit text-center',
              Math.ceil(guesses.length / 2) <= i && !gameOver
                ? 'badge-soft **:opacity-0 select-none'
                : 'badge-info',
            ].join('\x20')}
          >
            <span>
              <b>{t.label}:</b>&nbsp;{t.value}
            </span>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGuess(guess.trim());
        }}
        className="w-full join"
      >
        <GuessBox
          options={guessOptions}
          disabled={guesses.length === 6 || gameOver > 0 || !isCompletionHydrated}
          state={guess}
          setState={setGuess}
        />

        <button
          className={['btn join-item', guess ? 'btn-primary' : 'btn-soft'].join('\x20')}
          disabled={guesses.length === 6 || gameOver > 0 || !isCompletionHydrated}
        >
          {guess ? 'Guess' : 'Skip'}
        </button>
      </form>

      {!isCompletionHydrated ? (
        <p className="text-xs text-base-content/70 text-center">
          Checking cloud completion state...
        </p>
      ) : null}

      <h4>
        <b>Guesses:</b>&nbsp;({guesses.length}/6)
      </h4>
      <ul className="flex flex-wrap gap-2 justify-center">
        {[...Array(6)].map((_, i) => {
          let style = 'badge-soft w-10';
          let text = '';

          if (guesses[i]?.toLowerCase() === game.answer.title.toLowerCase()) {
            style = 'badge-success';
            text = guesses[i];
          } else if (guesses[i] === '') {
            style = 'badge-warning';
            text = 'Skipped';
          } else if (typeof guesses[i] === 'string') {
            style = 'badge-error';
            text = guesses[i];
          }

          return (
            <li
              key={i}
              className={['badge shadow max-w-xs truncate justify-start', style].join('\x20')}
            >
              {text}
            </li>
          );
        })}
      </ul>

      <button
        className="btn btn-error mx-auto shadow"
        disabled={guesses.length === 6 || gameOver > 0 || !isCompletionHydrated}
        onClick={handleGiveUp}
      >
        Give up
      </button>
    </section>
  );

  return { stats, gameBoard, isSyncPending };
}
