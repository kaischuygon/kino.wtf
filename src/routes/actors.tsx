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

export const Route = createFileRoute('/actors')({
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
  component: Actors,
});

function AboutContent() {
  return (
    <>
      <p>
        Guess the actor based on their filmography. The hints are based on their top 6 acting
        credits (in reverse order) as well as other trivia.
      </p>
      <GameHowToPlay
        items={[
          'Use the hints provided to guess an actor.',
          'If you guess incorrectly, another credit and/or another hint will be revealed.',
          'Leave the input blank to skip a guess and get the next hint.',
          'You have 6 guesses to guess the actor.',
        ]}
      />
    </>
  );
}

function Actors() {
  const route = getRoute('actors');
  const { game } = Route.useSearch();
  const navigate = useNavigate({ from: '/actors' });
  const forcedGameIndex = typeof game === 'number' ? game - 1 : undefined;
  const gameIndex = useGameIndex(route, forcedGameIndex);

  useEffect(() => {
    if (typeof game !== 'number') return;
    const normalizedGame = gameIndex + 1;
    if (game === normalizedGame) return;

    navigate({
      to: '/actors',
      search: (prev) => ({
        ...prev,
        game: normalizedGame,
      }),
      replace: true,
    });
  }, [game, gameIndex, navigate]);

  return <ActorsGame key={gameIndex} gameIndex={gameIndex} />;
}

function ActorsGame({ gameIndex }: { gameIndex: number }) {
  const route = getRoute('actors');
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
      <section id="actors" className="p-2">
        <div className="flex items-center justify-center py-8">
          <span className="loading loading-spinner loading-md" />
        </div>
      </section>
    );
  }

  if (catalogError || games.length === 0) {
    return (
      <section id="actors" className="p-2">
        <div className="alert alert-error text-sm">
          <span>{catalogError ?? 'No actor games are currently available.'}</span>
        </div>
      </section>
    );
  }

  if (gameIndex < 0 || gameIndex >= games.length) {
    const latestGameNumber = games.length;
    return (
      <section id="actors" className="p-2">
        <div className="alert alert-warning text-sm">
          <span>
            Day #{gameIndex + 1} is not available yet. Latest available actors game is Day #{latestGameNumber}.
          </span>
        </div>
      </section>
    );
  }

  return (
    <LoadedActorsGame
      gameIndex={gameIndex}
      games={games}
      isConfigured={isConfigured}
      userId={user?.id ?? null}
      gameMode={gameMode}
    />
  );
}

function LoadedActorsGame({
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
  const route = getRoute('actors');
  const { Modal: LeaderboardModal, open: openLeaderboardModal } = useModal();
  const { gameBoard, stats } = useGame(route, games, gameIndex, openLeaderboardModal);

  return (
    <section id="actors" className="p-2">
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
