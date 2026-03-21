import { createFileRoute } from '@tanstack/react-router';
import movies from '../../get_games/movies.json';
import GameNavigation from '../features/gameplay/components/GameNavigation';
import GameHowToPlay from '../features/gameplay/components/GameHowToPlay';
import useGame from '../features/gameplay/hooks/useGame';
import useGameIndex from '../features/gameplay/hooks/useGameIndex';
import { getRoute } from '../routes';

export const Route = createFileRoute('/movies')({
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
  component: Movies,
});

function AboutContent() {
  return (
    <>
      <p>
        Guess the movie based on the castlist. The hints are based on the top 6 billed actors (in
        reverse order) as well as other trivia.
      </p>
      <GameHowToPlay
        items={[
          'Use the hints provided to guess a movie.',
          'If you guess incorrectly, another actor and/or another hint will be revealed.',
          'Leave the input blank to skip a guess and get the next hint.',
          'You have 6 guesses to guess the movie.',
        ]}
      />
    </>
  );
}

function Movies() {
  const route = getRoute('movies');
  const { game } = Route.useSearch();
  const forcedGameIndex = typeof game === 'number' ? game - 1 : undefined;
  const gameIndex = useGameIndex(route, forcedGameIndex);

  return <MoviesGame key={gameIndex} gameIndex={gameIndex} />;
}

function MoviesGame({ gameIndex }: { gameIndex: number }) {
  const route = getRoute('movies');
  const { gameBoard, stats } = useGame(route, movies, gameIndex);

  return (
    <section id="movies" className="p-2">
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
