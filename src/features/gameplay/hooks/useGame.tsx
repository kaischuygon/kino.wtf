import { useEffect, useMemo, useRef, useState } from 'react';

import ExpandableModal from '../../../components/ExpandableModal';
import Countdown from '../components/Countdown';
import RouteLinks from '../../../components/RouteLinks';
import DisplayStats from '../components/DisplayStats';
import ShareButton from '../components/ShareButton';
import GuessBox from '../components/GuessBox';
import LoadingImage from '../components/LoadingImage';

import type { GameStats } from '../components/DisplayStats';
import type { Route } from '../../../routes';
import useAuth from '../../../hooks/useAuth';
import {
  loadGameState,
  loadGameStats,
  recordPlayedGame,
  saveGameState,
  saveGameStats,
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

export default function useGame(route: Route, games: Game[], gameIndex: number) {
  const { user, isConfigured } = useAuth();
  const gameMode = toGameMode(route.title);

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
  const remoteReadyRef = useRef<boolean>(!isConfigured || !user || !gameMode);
  const remoteStateRef =
    useRef<ReturnType<typeof loadGameState> extends Promise<infer T> ? T : null>(null);
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
      remoteReadyRef.current = true;
      return () => {
        mounted = false;
      };
    }

    remoteReadyRef.current = false;

    Promise.all([loadGameState(user.id, gameMode), loadGameStats(user.id, gameMode)])
      .then(([remoteState, remoteStats]) => {
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

            localSyncPendingRef.current = false;
            localUpdatedAtRef.current = Date.now();
          }
        }

        if (remoteStats) {
          setStats({
            gamesPlayed: remoteStats.gamesPlayed,
            gamesWon: remoteStats.gamesWon,
            streak: remoteStats.streak,
            maxStreak: remoteStats.maxStreak,
          });
        }

        remoteReadyRef.current = true;
      })
      .catch((error) => {
        console.error('Failed to load remote game state', error);
        if (!mounted) return;
        remoteReadyRef.current = true;
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
  ]);

  // Save stats to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${route.title}_stats`, JSON.stringify(stats));
  }, [stats, route]);

  useEffect(() => {
    if (!remoteReadyRef.current || !isConfigured || !user || !gameMode) return;

    saveGameStats(user.id, gameMode, stats).catch((error) => {
      console.error('Failed to save remote stats', error);
    });
  }, [gameMode, isConfigured, stats, user]);

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
    if (!remoteReadyRef.current || !isConfigured || !user || !gameMode) return;

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

    const nextState = {
      user_id: user.id,
      game_mode: gameMode,
      game_index: gameIndex,
      guess,
      guesses,
      game_over: gameOver,
    } as const;

    saveGameState(nextState)
      .then(() => {
        remoteStateRef.current = nextState;
        localSyncPendingRef.current = false;

        if (typeof window === 'undefined') return;

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
        console.error('Failed to save remote game state', error);
      });
  }, [gameMode, gameIndex, gameOver, guess, guesses, isConfigured, route.title, user]);

  useEffect(() => {
    if (!remoteReadyRef.current || !isConfigured || !user || !gameMode) return;
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

  // Update stats when the game is over
  function updateStats(gameStatus: number) {
    const newGamesPlayed = stats.gamesPlayed + 1;
    const newGamesWon = gameStatus === 2 ? stats.gamesWon + 1 : stats.gamesWon;
    const newStreak = gameStatus === 2 ? stats.streak + 1 : 0;
    const newMaxStreak = newStreak > stats.maxStreak ? newStreak : stats.maxStreak;

    setStats({
      gamesPlayed: newGamesPlayed,
      gamesWon: newGamesWon,
      streak: newStreak,
      maxStreak: newMaxStreak,
    });
  }

  // Listen for guesses
  function onGuess(newGuess: string) {
    setGuesses((g) => [...g, newGuess]);

    // check if game is over
    if (newGuess.toLowerCase() === game.answer.title.toLowerCase()) {
      setGameOver(2);
      updateStats(2);
    } else if (guesses.length === 5) {
      setGameOver(1);
      updateStats(1);
    }

    setGuess('');
  }

  function handleGiveUp() {
    setGuesses((g) => [...g, ...Array.from({ length: 6 - g.length }, () => '')]);
    setGameOver(1);
    updateStats(1);
    setGuess('');
  }

  const gameBoard = (
    <section className="flex flex-col gap-2 text-sm my-2">
      {gameOver > 0 && (
        <>
          <div className="card card-side bg-base-200 shadow">
            <figure className="w-1/3">
              <ExpandableModal>
                <LoadingImage
                  key={game.answer.image}
                  src={game.answer.image}
                  alt={game.answer.title}
                  wrapperClassName="w-full"
                />
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
          disabled={guesses.length === 6 || gameOver > 0}
          state={guess}
          setState={setGuess}
        />

        <button
          className={['btn join-item', guess ? 'btn-primary' : 'btn-soft'].join('\x20')}
          disabled={guesses.length === 6 || gameOver > 0}
        >
          {guess ? 'Guess' : 'Skip'}
        </button>
      </form>

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
        disabled={guesses.length === 6 || gameOver > 0}
        onClick={handleGiveUp}
      >
        Give up
      </button>
    </section>
  );

  return { stats, gameBoard };
}
