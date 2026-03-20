import { createFileRoute } from '@tanstack/react-router';
import actors from '../../get_games/actors.json';
import GameNavigation from '../components/GameNavigation';
import GameHowToPlay from '../components/GameHowToPlay';
import useGame from '../hooks/useGame';
import useGameIndex from '../hooks/useGameIndex';
import { getRoute } from '../routes';

export const Route = createFileRoute('/actors')({
  component: Actors,
});

function AboutContent() {
  return (
    <>
      <p>
        Guess the actor based on their filmography. The hints are based on their top 6 acting credits
        (in reverse order) as well as other trivia.
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
  const gameIndex = useGameIndex(route);
  const { GameBoard, stats } = useGame(route, actors, gameIndex);

  return (
    <section id="actors" className="p-2">
      <GameNavigation stats={stats} AboutContent={AboutContent} route={route} gameIndex={gameIndex} />
      <GameBoard />
    </section>
  );
}
