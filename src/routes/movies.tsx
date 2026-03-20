import { createFileRoute } from '@tanstack/react-router';
import movies from '../../get_games/movies.json';
import GameNavigation from '../components/GameNavigation';
import GameHowToPlay from '../components/GameHowToPlay';
import useGame from '../hooks/useGame';
import useGameIndex from '../hooks/useGameIndex';
import { getRoute } from '../routes';

export const Route = createFileRoute('/movies')({
  component: Movies,
});

function AboutContent() {
  return (
    <>
      <p>
        Guess the movie based on the castlist. The hints are based on the top 6 billed actors
        (in reverse order) as well as other trivia.
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
  const gameIndex = useGameIndex(route);
  const { GameBoard, stats } = useGame(route, movies, gameIndex);

  return (
    <section id="movies" className="p-2">
      <GameNavigation stats={stats} AboutContent={AboutContent} route={route} gameIndex={gameIndex} />
      <GameBoard />
    </section>
  );
}
