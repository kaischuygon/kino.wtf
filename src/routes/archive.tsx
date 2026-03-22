import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import type { PlayedGameRecord } from '../lib/gamePersistence';
import { loadPlayedGames } from '../lib/gamePersistence';

export const Route = createFileRoute('/archive')({
  component: ArchivePage,
});

function ArchivePage() {
  const { isConfigured, loading, user } = useAuth();
  const [records, setRecords] = useState<PlayedGameRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured || !user) {
      Promise.resolve().then(() => {
        setRecords(null);
        setError(null);
      });
      return;
    }

    let mounted = true;
    Promise.resolve().then(() => {
      if (!mounted) return;
      setRecords(null);
      setError(null);
    });

    loadPlayedGames(user.id)
      .then((data) => {
        if (!mounted) return;
        setRecords(data);
        setError(null);
      })
      .catch((archiveError) => {
        if (!mounted) return;
        const message =
          archiveError instanceof Error ? archiveError.message : 'Could not load archive.';
        setError(message);
        setRecords([]);
      });

    return () => {
      mounted = false;
    };
  }, [isConfigured, user]);

  if (!isConfigured) {
    return (
      <section className="p-3">
        <div className="alert alert-warning">
          <span>
            Supabase is not configured yet. Archive requires a connected Supabase project.
          </span>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="p-3">
        <span className="loading loading-spinner" />
      </section>
    );
  }

  if (!user) {
    return (
      <section className="p-3 flex flex-col gap-3">
        <h1 className="text-2xl font-display">Game Archive</h1>
        <p className="text-sm">Sign in to save and view your full game history.</p>
        <Link className="btn btn-primary w-fit" to="/auth">
          Go to Auth
        </Link>
      </section>
    );
  }

  return (
    <section className="p-3 flex flex-col gap-3">
      <h1 className="text-2xl font-display">Game Archive</h1>
      <p className="text-sm">Your completed games across actors, movies, and directors.</p>

      {records === null ? (
        <div className="flex items-center gap-2 text-sm text-base-content/70">
          <span className="loading loading-spinner loading-sm" />
          Loading archive...
        </div>
      ) : null}

      {error ? (
        <div className="alert alert-error text-sm">
          <span>{error}</span>
        </div>
      ) : null}

      {records !== null && records.length === 0 ? (
        <div className="alert alert-info">
          <span>No completed games yet. Finish a game to start your archive.</span>
        </div>
      ) : null}

      {records !== null && records.length > 0 ? (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-200">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Mode</th>
                <th>Game #</th>
                <th>Answer</th>
                <th>Result</th>
                <th>Finished</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="capitalize">{record.game_mode}</td>
                  <td>{record.game_index + 1}</td>
                  <td>{record.answer_title}</td>
                  <td>
                    <span
                      className={['badge', record.did_win ? 'badge-success' : 'badge-error'].join(
                        ' ',
                      )}
                    >
                      {record.did_win ? 'Win' : 'Loss'}
                    </span>
                  </td>
                  <td>{new Date(record.finished_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
