import { createFileRoute } from '@tanstack/react-router';
import RouteLinks from '../components/RouteLinks';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <section id="homepage" className="p-3 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-display font-bold">Kino.wtf</h2>
        <p className="text-base text-base-content/80">
          Solve daily cinema puzzles across three challenging modes: Actors, Movies, and Directors.
          Guess from clues, track your streaks, and share your results.
        </p>
        <p className="text-sm text-base-content/60">
          New rounds drop daily for Actors &amp; Movies, with fresh Directors challenges each week.
        </p>
      </div>
      <hr className="border-base-300" />
      <RouteLinks />
      <p className="text-center text-base-content/50 mt-2">
        New games coming soon ⌛
      </p>
      <p className="text-xs text-center text-base-content/50 mt-2">
        Sign in to sync your progress and compete with friends.
      </p>
    </section>
  );
}
