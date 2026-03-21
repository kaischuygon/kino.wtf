import ThemeSwitcher from './ThemeSwitcher';
import Menu from './Menu';
import { getRoute } from '../routes';
import { Link } from '@tanstack/react-router';
import useAuth from '../hooks/useAuth';
import { useEffect, useState } from 'react';
import { loadUserProfile, updateUserProfile, type UserProfile } from '../lib/gamePersistence';
import { FaUser } from 'react-icons/fa';

export default function Navbar() {
  const { isConfigured, user, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (user && isConfigured) {
      loadUserProfile(user.id)
        .then((p) => {
          setProfile(p);

          if (typeof document !== 'undefined') {
            // Keep local preference stable across HMR/remounts; fall back to profile theme.
            const localTheme = localStorage.getItem('theme');
            const nextTheme = localTheme || p?.preferred_theme || null;

            if (nextTheme) {
              document.documentElement.setAttribute('data-theme', nextTheme);
              localStorage.setItem('theme', nextTheme);
            }
          }
        })
        .catch(() => {
          // Silently fail on profile load
        });
    } else {
      setProfile(null);
    }
  }, [user, isConfigured]);

  const handleThemeChange = async (theme: string) => {
    if (!user) return;
    setIsSavingTheme(true);
    try {
      const updatedProfile = await updateUserProfile(user.id, { preferred_theme: theme });
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    } catch {
      // Silently fail - theme is still applied locally via localStorage
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  // Use profile username if available, otherwise extract from email
  const userLabel = profile?.username || user?.email?.split('@')[0] || 'Profile';

  return (
    <nav className="navbar border rounded-box border-base-300 bg-base-200 w-full">
      <div className="navbar-start">
        <Menu />
      </div>
      <div className="navbar-center">
        <Link className="btn btn-ghost text-xl font-display" to="/">
          {getRoute('home').emoji}&nbsp;Kino.wtf
        </Link>
      </div>
      <div className="navbar-end">
        {isConfigured ? (
          loading ? (
            <span className="loading loading-spinner loading-sm mx-1" />
          ) : user ? (
            <div className="dropdown dropdown-end mr-1">
              <button tabIndex={0} className="btn btn-ghost btn-sm btn-circle">
                <div className="avatar avatar-placeholder">
                  <div className="bg-primary text-primary-content w-8 rounded-full">
                    <span className="text-xs">{userLabel.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
              </button>
              <ul
                tabIndex={-1}
                className="menu dropdown-content bg-base-100 border border-base-300 rounded-box mt-2 w-52 p-2 shadow"
              >
                <li className="menu-title pointer-events-none select-text">
                  <span>{userLabel}</span>
                </li>
                <li>
                  <Link to="/auth">Account</Link>
                </li>
                <li>
                  <Link to="/archive">Archive</Link>
                </li>
                <li>
                  <button onClick={handleSignOut} disabled={isSigningOut}>
                    {isSigningOut && <span className="loading loading-spinner loading-sm" />}
                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <div className="tooltip tooltip-bottom" data-tip="Sign in">
              <Link to="/auth" tabIndex={0} className="btn btn-ghost btn-sm btn-circle">
                <div className="avatar avatar-placeholder">
                  <div className="w-8 rounded-full">
                    <span className="text-xs">
                      <FaUser />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )
        ) : null}
        <ThemeSwitcher
          onThemeChange={handleThemeChange}
          activeTheme={profile?.preferred_theme ?? null}
          loading={isSavingTheme}
          disabled={isSavingTheme}
        />
      </div>
    </nav>
  );
}
