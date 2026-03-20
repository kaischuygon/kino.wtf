import { createFileRoute } from '@tanstack/react-router';
import directors from '../../get_games/directors.json';
import GameNavigation from '../components/GameNavigation';
import GameHowToPlay from '../components/GameHowToPlay';
import useGame from '../hooks/useGame';
import useGameIndex from '../hooks/useGameIndex';
import { getRoute } from '../routes';

export const Route = createFileRoute('/directors')({
  component: Directors,
});

function AboutContent() {
  return (
    <>
      <p>
        Guess the director based on their filmography. The hints are based on their top 6 directing credits
        (in reverse order) as well as other trivia.
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
  const gameIndex = useGameIndex(route);
  const { GameBoard, stats } = useGame(route, directors, gameIndex);

  return (
    <section id="directors" className="p-2">
      <GameNavigation stats={stats} AboutContent={AboutContent} route={route} gameIndex={gameIndex} />
      <GameBoard />
    </section>
  );
}
