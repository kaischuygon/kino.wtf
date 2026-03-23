import { createFileRoute, Link } from '@tanstack/react-router';
import useAuth from '../hooks/useAuth';

export const Route = createFileRoute('/auth/confirmed')({
  component: AuthConfirmedPage,
});

function AuthConfirmedPage() {
  const { isConfigured, loading, user } = useAuth();

  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const authErrorRaw = params?.get('error_description') ?? params?.get('error') ?? null;

  if (!isConfigured) {
    return (
      <section className="p-3 flex flex-col gap-3">
        <h1 className="text-2xl font-display">Email Confirmation</h1>
        <div className="alert alert-warning">
          <span>
            Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_KEY to your
            environment.
          </span>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="p-3 flex flex-col gap-3">
        <h1 className="text-2xl font-display">Email Confirmation</h1>
        <div className="alert alert-info">
          <span className="loading loading-spinner loading-sm" />
          <span>Verifying your confirmation link...</span>
        </div>
      </section>
    );
  }

  if (authErrorRaw) {
    const authError = (() => {
      try {
        return decodeURIComponent(authErrorRaw);
      } catch {
        return authErrorRaw;
      }
    })();

    return (
      <section className="p-3 flex flex-col gap-3">
        <h1 className="text-2xl font-display">Email Confirmation</h1>
        <div className="alert alert-error">
          <span>{authError}</span>
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-primary" to="/auth">
            Back to Auth
          </Link>
          <Link className="btn btn-ghost" to="/">
            Go Home
          </Link>
        </div>
      </section>
    );
  }

  if (user) {
    return (
      <section className="p-3 flex flex-col gap-3">
        <h1 className="text-2xl font-display">Account Confirmed</h1>
        <div className="alert alert-success">
          <span>Your email is confirmed and your account is ready.</span>
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-primary" to="/">
            Start Playing
          </Link>
          <Link className="btn btn-ghost" to="/auth">
            Account Settings
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="p-3 flex flex-col gap-3">
      <h1 className="text-2xl font-display">Email Confirmed</h1>
      <div className="alert alert-info">
        <span>Your email was confirmed. Sign in to continue.</span>
      </div>
      <div className="flex gap-2">
        <Link className="btn btn-primary" to="/auth">
          Continue to Sign In
        </Link>
        <Link className="btn btn-ghost" to="/">
          Go Home
        </Link>
      </div>
    </section>
  );
}
