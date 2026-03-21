import { createFileRoute } from '@tanstack/react-router';
import actors from '../../get_games/actors.json';
import GameNavigation from '../features/gameplay/components/GameNavigation';
import GameHowToPlay from '../features/gameplay/components/GameHowToPlay';
import useGame from '../features/gameplay/hooks/useGame';
import useGameIndex from '../features/gameplay/hooks/useGameIndex';
import { getRoute } from '../routes';

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
  const forcedGameIndex = typeof game === 'number' ? game - 1 : undefined;
  const gameIndex = useGameIndex(route, forcedGameIndex);

  return <ActorsGame key={gameIndex} gameIndex={gameIndex} />;
}

function ActorsGame({ gameIndex }: { gameIndex: number }) {
  const route = getRoute('actors');
  const { gameBoard, stats } = useGame(route, actors, gameIndex);

  return (
    <section id="actors" className="p-2">
      <GameNavigation
        stats={stats}
        AboutContent={AboutContent}
        route={route}
        gameIndex={gameIndex}
      />
      {gameBoard}
    </section>
  );
}
