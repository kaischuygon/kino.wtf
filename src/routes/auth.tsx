import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { FaDiscord, FaGithub } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { deleteMyAccount, loadUserProfile, updateUserProfile } from '../lib/gamePersistence';

export const Route = createFileRoute('/auth')({
  component: AuthPage,
});

type AuthTab = 'signin' | 'signup';
type OAuthProvider = 'discord' | 'google' | 'github';

// Reusable form components
function EmailInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (email: string) => void;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        <span className="label-text">Email</span>
      </label>
      <input
        id={id}
        autoFocus
        type="email"
        className="input input-bordered validator w-full"
        placeholder="mail@site.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      <div className="validator-hint">Enter a valid email address</div>
    </div>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (pwd: string) => void;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        <span className="label-text">{label}</span>
      </label>
      <input
        id={id}
        type="password"
        className="input input-bordered w-full"
        placeholder="min. 8 characters"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={8}
        required
      />
      <div className="text-xs text-base-content/60 mt-1">Minimum 8 characters</div>
    </div>
  );
}

interface TabFormProps {
  id: AuthTab;
  label: string;
  active: boolean;
  onChange: (tab: AuthTab) => void;
  onSubmit: (e: React.SubmitEvent) => void;
  children: React.ReactNode;
}

function TabForm({ id, label, active, onChange, onSubmit, children }: TabFormProps) {
  return (
    <>
      <input
        type="radio"
        name="auth_tabs"
        className="tab checked:bg-base-200"
        aria-label={label}
        checked={active}
        onChange={() => onChange(id)}
      />
      <div className="tab-content bg-base-200 border-base-300 p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {children}
        </form>
      </div>
    </>
  );
}

function OAuthButtons({
  onOAuth,
  activeProvider,
  disabled,
}: {
  onOAuth: (provider: OAuthProvider) => void;
  activeProvider: OAuthProvider | null;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <button
        className="btn bg-[#5865f2] text-white hover:brightness-90 border-0"
        type="button"
        onClick={() => onOAuth('discord')}
        disabled={disabled}
      >
        {activeProvider === 'discord' ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <FaDiscord />
        )}{' '}
        Discord
      </button>
      <button
        className="btn bg-gray-50 text-gray-900 hover:brightness-90 border-0"
        type="button"
        disabled={disabled}
        onClick={() => onOAuth('google')}
      >
        {activeProvider === 'google' ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <FcGoogle />
        )}{' '}
        Google
      </button>
      <button
        className="btn bg-gray-950 text-white hover:brightness-125 border-0"
        type="button"
        disabled={disabled}
        onClick={() => onOAuth('github')}
      >
        {activeProvider === 'github' ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <FaGithub />
        )}{' '}
        GitHub
      </button>
    </div>
  );
}

function handleError(error: unknown): string {
  return error instanceof Error ? error.message : 'An error occurred.';
}

function getOAuthSetupHint(error: unknown, provider: OAuthProvider): string | null {
  if (!(error instanceof Error)) return null;

  const message = error.message.toLowerCase();
  const isLikelyOAuthSetupIssue = [
    'provider is not enabled',
    'unsupported provider',
    'oauth',
    'invalid client',
    'redirect uri',
    'redirect_url',
    'redirect_to',
    'invalid_request',
  ].some((token) => message.includes(token));

  if (!isLikelyOAuthSetupIssue) return null;

  if (provider === 'github') {
    return 'GitHub sign-in appears unconfigured. In Supabase Dashboard, enable GitHub under Authentication > Providers, then set GitHub Client ID/Secret and verify callback URL: https://<project-ref>.supabase.co/auth/v1/callback.';
  }

  if (provider === 'google') {
    return 'Google sign-in appears unconfigured. In Supabase Dashboard, enable Google under Authentication > Providers, then set Google Client ID/Secret and verify callback URL: https://<project-ref>.supabase.co/auth/v1/callback.';
  }

  return 'Discord sign-in appears unconfigured. In Supabase Dashboard, enable Discord under Authentication > Providers, then set Discord Client ID/Secret and verify callback URL: https://<project-ref>.supabase.co/auth/v1/callback.';
}

function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

function isValidUsername(input: string): boolean {
  return /^[a-z0-9_]{3,32}$/.test(input);
}

function hasEmailIdentity(user: NonNullable<ReturnType<typeof useAuth>['user']>): boolean {
  const appMeta = (user.app_metadata ?? {}) as { provider?: string; providers?: string[] };
  const providers = Array.isArray(appMeta.providers) ? appMeta.providers : [];

  if (providers.includes('email') || appMeta.provider === 'email') {
    return true;
  }

  const identities = Array.isArray(user.identities)
    ? user.identities
    : ((user as { identities?: Array<{ provider?: string }> }).identities ?? []);

  return identities.some((identity) => identity?.provider === 'email');
}

function AuthPage() {
  const {
    isConfigured,
    loading,
    user,
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    requestPasswordReset,
    updatePassword,
    signOut,
  } = useAuth();

  const [tab, setTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oauthSetupHint, setOauthSetupHint] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [displayUsername, setDisplayUsername] = useState('');
  const [displayTheme, setDisplayTheme] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<
    'discord' | 'google' | 'github' | null
  >(null);
  const [isSigningOutAccount, setIsSigningOutAccount] = useState(false);

  const resetState = () => {
    setError(null);
    setMessage(null);
    setOauthSetupHint(null);
  };

  useEffect(() => {
    if (user && isConfigured) {
      setIsLoadingProfile(true);
      loadUserProfile(user.id)
        .then((profile) => {
          setDisplayTheme(profile?.preferred_theme ?? null);

          if (profile?.username) {
            setDisplayUsername(profile.username);
            setEditUsername(profile.username);
          } else if (signupUsername && !profile?.username) {
            // Create profile with signupUsername if it's a new user
            return updateUserProfile(user.id, { username: signupUsername }).then(() => {
              setDisplayUsername(signupUsername);
              setEditUsername(signupUsername);
              setDisplayTheme(null);
              setSignupUsername('');
            });
          }
        })
        .catch(() => {
          // Silently fail on profile load, user can still use the app
        })
        .finally(() => {
          setIsLoadingProfile(false);
        });
    }
  }, [user, isConfigured, signupUsername]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    resetState();

    try {
      if (tab === 'signin') {
        setIsSigningIn(true);
        const { error: err } = await signInWithEmail(email, password);
        if (err) throw err;
        setMessage('Signed in successfully.');
        return;
      }

      if (tab === 'signup') {
        setIsSigningUp(true);

        const normalizedSignupUsername = normalizeUsername(signupUsername);
        if (!isValidUsername(normalizedSignupUsername)) {
          throw new Error(
            'Username must be 3-32 characters and use only lowercase letters, numbers, or underscores.',
          );
        }

        const { error: err } = await signUpWithEmail(email, password, normalizedSignupUsername);
        if (err) throw err;

        setSignupUsername(normalizedSignupUsername);
        setMessage('Account created. Check your email for verification.');
        // Keep signupUsername in state so we can create profile when user becomes available
        return;
      }
    } catch (err) {
      setError(handleError(err));
    } finally {
      setIsSigningIn(false);
      setIsSigningUp(false);
    }
  };

  const onOAuth = async (provider: OAuthProvider) => {
    resetState();
    setOauthLoadingProvider(provider);
    try {
      const { error: err } = await signInWithOAuth(provider);
      if (err) throw err;
    } catch (err) {
      setError(handleError(err));
      setOauthSetupHint(getOAuthSetupHint(err, provider));
    } finally {
      setOauthLoadingProvider(null);
    }
  };

  const onResetRequest = async () => {
    resetState();
    setIsSendingReset(true);
    try {
      const { error: err } = await requestPasswordReset(email);
      if (err) throw err;
      setMessage('Password reset email sent.');
    } catch (err) {
      setError(handleError(err));
    } finally {
      setIsSendingReset(false);
    }
  };

  if (!isConfigured) {
    return (
      <section className="p-3 flex flex-col gap-3">
        <h1 className="text-2xl font-display">Auth Setup</h1>
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
      <section className="p-3">
        <span className="loading loading-spinner" />
      </section>
    );
  }

  if (user) {
    const canManagePassword = hasEmailIdentity(user);

    const handlePasswordUpdate = async (event: React.FormEvent) => {
      event.preventDefault();
      resetState();
      setIsUpdatingPassword(true);

      try {
        if (!newPassword) throw new Error('Please enter a new password.');
        const { error: err } = await updatePassword(newPassword);
        if (err) throw err;
        setMessage('Password updated successfully.');
        setNewPassword('');
      } catch (err) {
        setError(handleError(err));
      } finally {
        setIsUpdatingPassword(false);
      }
    };

    const handleUsernameUpdate = async (event: React.FormEvent) => {
      event.preventDefault();
      resetState();
      setIsUpdatingUsername(true);

      try {
        const normalizedUsername = normalizeUsername(editUsername);
        if (!isValidUsername(normalizedUsername)) {
          throw new Error(
            'Username must be 3-32 characters and use only lowercase letters, numbers, or underscores.',
          );
        }

        await updateUserProfile(user.id, { username: normalizedUsername });
        setEditUsername(normalizedUsername);
        setDisplayUsername(normalizedUsername);
        setMessage('Username updated successfully.');
      } catch (err) {
        setError(handleError(err));
      } finally {
        setIsUpdatingUsername(false);
      }
    };

    const handleDeleteAccount = async () => {
      resetState();

      if (deleteConfirmation.trim().toUpperCase() !== 'DELETE') {
        setError('Type DELETE to confirm account deletion.');
        return;
      }

      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm(
              'Delete your account permanently? This cannot be undone and will remove your profile, stats, game states, and archive history.',
            )
          : false;

      if (!confirmed) return;

      setIsDeletingAccount(true);
      try {
        await deleteMyAccount();
        await signOut();
        setDeleteConfirmation('');
        setMessage('Account deleted successfully.');
      } catch (err) {
        setError(handleError(err));
      } finally {
        setIsDeletingAccount(false);
      }
    };

    return (
      <section className="p-3 flex flex-col gap-3">
        <h1 className="text-2xl font-display">Account</h1>

        <div className="card bg-base-200 border border-base-300">
          <div className="card-body">
            <h2 className="font-display text-lg mb-3">Account Details</h2>
            <div className="space-y-3">
              <div>
                <label className="label">
                  <span className="label-text text-base-content/70">Email</span>
                </label>
                <p className="font-mono text-sm">{user.email ?? 'Unknown email'}</p>
              </div>
              <div>
                <label className="label">
                  <span className="label-text text-base-content/70">Username</span>
                </label>
                <p className="font-mono text-sm">{displayUsername || '(not set)'}</p>
              </div>
              <div>
                <label className="label">
                  <span className="label-text text-base-content/70">Member Since</span>
                </label>
                <p className="font-mono text-sm">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <div>
                <label className="label">
                  <span className="label-text text-base-content/70">Preferred Theme</span>
                </label>
                <p className="font-mono text-sm">{displayTheme ?? '(not set)'}</p>
              </div>
            </div>
            <div className="divider my-2" />
            <div className="flex gap-2">
              <Link className="btn btn-primary" to="/archive">
                View Archive
              </Link>
              <button
                className="btn btn-soft"
                onClick={async () => {
                  setIsSigningOutAccount(true);
                  const { error: err } = await signOut();
                  if (err) setError(err.message);
                  setIsSigningOutAccount(false);
                }}
                disabled={isSigningOutAccount}
              >
                {isSigningOutAccount && <span className="loading loading-spinner loading-sm" />}
                {isSigningOutAccount ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-base-200 border border-base-300">
          <div className="card-body">
            <h2 className="font-display text-lg mb-3">Change Username</h2>
            <form onSubmit={handleUsernameUpdate} className="flex flex-col gap-4">
              <div>
                <label className="label" htmlFor="account-new-username">
                  <span className="label-text">New Username</span>
                </label>
                <input
                  id="account-new-username"
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Enter new username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  disabled={isLoadingProfile || isUpdatingUsername}
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={isUpdatingUsername || isLoadingProfile}
              >
                {isUpdatingUsername && <span className="loading loading-spinner loading-sm" />}
                {isUpdatingUsername ? 'Saving...' : 'Change Username'}
              </button>
            </form>
          </div>
        </div>

        {canManagePassword ? (
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body">
              <h2 className="font-display text-lg mb-3">Change Password</h2>
              <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-4">
                <PasswordInput
                  id="account-new-password"
                  label="New Password"
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <button className="btn btn-primary" type="submit" disabled={isUpdatingPassword}>
                  {isUpdatingPassword && <span className="loading loading-spinner loading-sm" />}
                  {isUpdatingPassword ? 'Saving...' : 'Save New Password'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="alert alert-info">
            <span>
              This account uses OAuth sign-in only. Password changes are managed by your provider.
            </span>
          </div>
        )}

        <div className="card bg-base-200 border border-error/40">
          <div className="card-body">
            <h2 className="font-display text-lg mb-2 text-error">Delete Account</h2>
            <p className="text-sm text-base-content/80 mb-2">
              Permanently deletes your account and all associated game data.
            </p>
            <label className="label" htmlFor="delete-account-confirmation">
              <span className="label-text text-base-content/70">Type DELETE to confirm</span>
            </label>
            <input
              id="delete-account-confirmation"
              type="text"
              className="input input-bordered max-w-sm"
              placeholder="DELETE"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              disabled={isDeletingAccount}
            />
            <button
              type="button"
              className="btn btn-error btn-outline w-fit"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount || deleteConfirmation.trim().toUpperCase() !== 'DELETE'}
            >
              {isDeletingAccount && <span className="loading loading-spinner loading-sm" />}
              {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>

        {message && (
          <div className="alert alert-success">
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="p-3 flex flex-col gap-3">
      <h1 className="text-2xl font-display">Sign in</h1>
      <div className="tabs tabs-lift">
        <TabForm
          id="signin"
          label="Existing account"
          active={tab === 'signin'}
          onChange={setTab}
          onSubmit={onSubmit}
        >
          <EmailInput id="signin-email" value={email} onChange={setEmail} />
          <PasswordInput
            id="signin-password"
            label="Password"
            value={password}
            onChange={setPassword}
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSigningIn || isSendingReset}
          >
            {isSigningIn && <span className="loading loading-spinner loading-sm" />}
            {isSigningIn ? 'Signing in...' : 'Sign In'}
          </button>
          {email.trim() ? (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={onResetRequest}
              disabled={isSigningIn || isSendingReset}
            >
              {isSendingReset && <span className="loading loading-spinner loading-sm" />}
              {isSendingReset ? 'Sending...' : 'Send Password Reset Email'}
            </button>
          ) : null}
          <p className="text-xs text-base-content/60">
            Password reset works for email/password accounts.
          </p>
        </TabForm>

        <TabForm
          id="signup"
          label="New Account"
          active={tab === 'signup'}
          onChange={setTab}
          onSubmit={onSubmit}
        >
          <EmailInput id="signup-email" value={email} onChange={setEmail} />
          <PasswordInput
            id="signup-password"
            label="Password"
            value={password}
            onChange={setPassword}
          />
          <div>
            <label className="label" htmlFor="signup-username">
              <span className="label-text">Username</span>
              <span className="label-text-alt text-error">*</span>
            </label>
            <input
              id="signup-username"
              type="text"
              className="input input-bordered w-full"
              placeholder="Choose a username"
              value={signupUsername}
              onChange={(e) => setSignupUsername(e.target.value)}
              disabled={isSigningUp}
              pattern="[a-z0-9_]{3,32}"
              minLength={3}
              maxLength={32}
              required
            />
            <div className="text-xs text-base-content/60 mt-1">
              3-32 chars, lowercase letters, numbers, underscores
            </div>
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSigningUp || isSendingReset || !signupUsername.trim()}
          >
            {isSigningUp && <span className="loading loading-spinner loading-sm" />}
            {isSigningUp ? 'Creating...' : 'Create Account'}
          </button>
        </TabForm>
      </div>

      {message && (
        <div className="alert alert-success">
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
      {oauthSetupHint && (
        <div className="alert alert-info">
          <span>{oauthSetupHint}</span>
        </div>
      )}

      <div className="divider">or sign in with:</div>
      <OAuthButtons
        onOAuth={onOAuth}
        activeProvider={oauthLoadingProvider}
        disabled={oauthLoadingProvider !== null}
      />
    </section>
  );
}
