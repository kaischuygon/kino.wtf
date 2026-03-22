import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import GameNavigation from '../features/gameplay/components/GameNavigation';
import GameHowToPlay from '../features/gameplay/components/GameHowToPlay';
import useGame from '../features/gameplay/hooks/useGame';
import useGameIndex from '../features/gameplay/hooks/useGameIndex';
import { getRoute } from '../routes';
import useModal from '../hooks/useModal';
import useAuth from '../hooks/useAuth';
import { toGameMode } from '../lib/gameMode';
import GameLeaderboard from '../features/gameplay/components/GameLeaderboard';
import { FaTrophy } from 'react-icons/fa';
import { loadPublicGameCatalog, type GameData } from '../lib/gameCatalog';

export const Route = createFileRoute('/directors')({
  validateSearch: (search: Record<string, unknown>) => ({
    game: (() => {
      const gameValue =
        typeof search.game === 'number'
          ? search.game
          : typeof search.game === 'string' && search.game.trim() !== ''
            ? Number(search.game)
            : undefined;

      if (typeof gameValue !== 'number' || !Number.isFinite(gameValue) || gameValue < 1) {
        return undefined;
      }

      return Math.floor(gameValue);
    })(),
  }),
  component: Directors,
});

function AboutContent() {
  return (
    <>
      <p>
        Guess the director based on their filmography. The hints are based on their top 6 directing
        credits (in reverse order) as well as other trivia.
      </p>
      <GameHowToPlay
        items={[
          'Use the hints provided to guess a director.',
          'If you guess incorrectly, another credit and/or another hint will be revealed.',
          'Leave the input blank to skip a guess and get the next hint.',
          'You have 6 guesses to guess the director.',
        ]}
      />
    </>
  );
}

function Directors() {
  const route = getRoute('directors');
  const { game } = Route.useSearch();
  const navigate = useNavigate({ from: '/directors' });
  const forcedGameIndex = typeof game === 'number' ? game - 1 : undefined;
  const gameIndex = useGameIndex(route, forcedGameIndex);

  useEffect(() => {
    if (typeof game !== 'number') return;
    const normalizedGame = gameIndex + 1;
    if (game === normalizedGame) return;

    navigate({
      to: '/directors',
      search: (prev) => ({
        ...prev,
        game: normalizedGame,
      }),
      replace: true,
    });
  }, [game, gameIndex, navigate]);

  return <DirectorsGame key={gameIndex} gameIndex={gameIndex} />;
}

function DirectorsGame({ gameIndex }: { gameIndex: number }) {
  const route = getRoute('directors');
  const { user, isConfigured } = useAuth();
  const gameMode = toGameMode(route.title);
  const [games, setGames] = useState<GameData[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!gameMode) {
      return () => {
        mounted = false;
      };
    }

    loadPublicGameCatalog({ gameMode })
      .then((data) => {
        if (!mounted) return;
        setCatalogError(null);
        setGames(data);
      })
      .catch(() => {
        if (!mounted) return;
        setCatalogError('Could not load game catalog right now.');
        setGames([]);
      });

    return () => {
      mounted = false;
    };
  }, [gameMode]);

  if (games === null) {
    return (
      <section id="directors" className="p-2">
        <div className="flex items-center justify-center py-8">
          <span className="loading loading-spinner loading-md" />
        </div>
      </section>
    );
  }

  if (catalogError || games.length === 0) {
    return (
      <section id="directors" className="p-2">
        <div className="alert alert-error text-sm">
          <span>{catalogError ?? 'No director games are currently available.'}</span>
        </div>
      </section>
    );
  }

  if (gameIndex < 0 || gameIndex >= games.length) {
    const latestGameNumber = games.length;
    return (
      <section id="directors" className="p-2">
        <div className="alert alert-warning text-sm">
          <span>
            Day #{gameIndex + 1} is not available yet. Latest available directors game is Day #
            {latestGameNumber}.
          </span>
        </div>
      </section>
    );
  }

  return (
    <LoadedDirectorsGame
      gameIndex={gameIndex}
      games={games}
      isConfigured={isConfigured}
      userId={user?.id ?? null}
      gameMode={gameMode}
    />
  );
}

function LoadedDirectorsGame({
  gameIndex,
  games,
  isConfigured,
  userId,
  gameMode,
}: {
  gameIndex: number;
  games: GameData[];
  isConfigured: boolean;
  userId: string | null;
  gameMode: ReturnType<typeof toGameMode>;
}) {
  const route = getRoute('directors');
  const { Modal: LeaderboardModal, open: openLeaderboardModal } = useModal();
  const { gameBoard, stats } = useGame(route, games, gameIndex, openLeaderboardModal);

  return (
    <section id="directors" className="p-2">
      <GameNavigation
        stats={stats}
        AboutContent={AboutContent}
        route={route}
        gameIndex={gameIndex}
        onOpenLeaderboard={openLeaderboardModal}
        showInlineLeaderboardModal={false}
      />
      {gameMode ? (
        <LeaderboardModal>
          <h2 className="font-bold text-xl mb-4 text-primary">
            <FaTrophy className="inline" />
            &nbsp;Leaderboard
          </h2>
          <GameLeaderboard
            enabled={isConfigured}
            gameMode={gameMode}
            gameIndex={gameIndex}
            userId={userId}
            pageSize={25}
            showPagination
            showTitle={false}
          />
        </LeaderboardModal>
      ) : null}
      {gameBoard}
    </section>
  );
}
