import { createFileRoute } from '@tanstack/react-router';
import directors from '../../get_games/directors.json';
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
  const forcedGameIndex = typeof game === 'number' ? game - 1 : undefined;
  const gameIndex = useGameIndex(route, forcedGameIndex);

  return <DirectorsGame key={gameIndex} gameIndex={gameIndex} />;
}

function DirectorsGame({ gameIndex }: { gameIndex: number }) {
  const route = getRoute('directors');
  const { user, isConfigured } = useAuth();
  const gameMode = toGameMode(route.title);
  const { Modal: LeaderboardModal, open: openLeaderboardModal } = useModal();
  const { gameBoard, stats } = useGame(route, directors, gameIndex, openLeaderboardModal);

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
            userId={user?.id ?? null}
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
